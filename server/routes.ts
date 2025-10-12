import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getDiscordAuthUrl, exchangeCodeForToken, getDiscordUserInfo } from "./discord";
import { sendOrderConfirmationEmail } from "./email";
import { insertRedemptionCodeToFiveM } from "./fivem-db";
import { createBill, getPaymentUrl, getBillTransactions } from "./toyyibpay";
import { createBill as createBillplzBill, getBill, verifyBillPayment, verifyBillplzSignature } from "./billplz";
import "./types";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware to check if user is admin
async function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auto-initialize admin from environment variables (for production)
  app.post("/api/init-admin", async (req, res) => {
    try {
      const adminUsername = process.env.ADMIN_USERNAME;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminUsername || !adminPassword) {
        return res.status(500).json({ message: "Admin credentials not configured in environment variables" });
      }

      // Check if admin already exists
      const existingAdmins = await db.select().from(users).where(eq(users.isAdmin, true));
      
      if (existingAdmins.length > 0) {
        return res.status(200).json({ message: "Admin already initialized" });
      }

      // Hash password with bcrypt (cost factor 12)
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      // Create admin user with environment credentials
      const admin = await storage.createAdminUser(
        adminUsername, 
        `${adminUsername}@admin.local`, 
        passwordHash
      );

      res.json({ 
        message: "Admin user initialized successfully",
        admin: {
          id: admin.id,
          username: admin.username,
          isAdmin: admin.isAdmin,
        }
      });
    } catch (error: any) {
      console.error("Admin initialization error:", error);
      res.status(500).json({ message: "Failed to initialize admin user", error: error.message });
    }
  });

  // One-time admin user creation endpoint (for initial setup)
  app.post("/api/seed-admin", async (req, res) => {
    try {
      const { username, email, password, setupToken } = req.body;

      // Check if setup token matches (or allow if no admin exists yet)
      const existingAdmins = await db.select().from(users).where(eq(users.isAdmin, true));
      
      if (existingAdmins.length > 0) {
        return res.status(403).json({ message: "Admin already exists. Cannot create another via seed." });
      }

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Hash password with bcrypt (cost factor 12)
      const passwordHash = await bcrypt.hash(password, 12);

      // Create admin user
      const admin = await storage.createAdminUser(username, email, passwordHash);

      res.json({ 
        message: "Admin user created successfully",
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          isAdmin: admin.isAdmin,
        }
      });
    } catch (error: any) {
      console.error("Seed admin error:", error);
      res.status(500).json({ message: "Failed to create admin user", error: error.message });
    }
  });

  // Discord OAuth flow - Step 1: Redirect to Discord
  app.get("/api/auth/discord", (req, res) => {
    // Generate and store state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    
    // Save session before redirect to ensure state is persisted
    req.session.save((err) => {
      if (err) {
        console.error("Session save error during OAuth initiation:", err);
        return res.status(500).send("Authentication failed");
      }
      
      const authUrl = getDiscordAuthUrl(state);
      res.redirect(authUrl);
    });
  });

  // Discord OAuth flow - Step 2: Handle callback
  app.get("/api/auth/discord/callback", async (req, res) => {
    const { code, state } = req.query;

    // Verify state for CSRF protection
    if (!state || state !== req.session.oauthState) {
      return res.status(403).send("Invalid state parameter");
    }

    // Clear state after use
    delete req.session.oauthState;

    if (!code || typeof code !== 'string') {
      return res.status(400).send("No code provided");
    }

    try {
      // Exchange code for access token
      const tokenData = await exchangeCodeForToken(code);
      
      // Get user info from Discord
      const discordUser = await getDiscordUserInfo(tokenData.access_token);
      
      // Check if user exists
      let user = await storage.getUserByDiscordId(discordUser.discordId);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          discordId: discordUser.discordId,
          username: discordUser.username,
          email: discordUser.email || "",
          avatar: discordUser.avatar,
        });
      }
      
      // Regenerate session to prevent session fixation attacks
      const oldSession = req.session;
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).send("Authentication failed");
        }
        
        // Set user ID in new session
        req.session.userId = user.id;
        
        // Save session and redirect
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).send("Authentication failed");
          }
          res.redirect('/');
        });
      });
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ user });
  });

  // Admin login with username/password
  const adminLoginSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.isAdmin || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        req.session.userId = user.id;
        req.session.loginMethod = "admin";

        res.json({ 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            avatar: user.avatar,
          }
        });
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });


  // Package routes
  app.get("/api/packages", async (_req, res) => {
    const packages = await storage.getAllPackages();
    res.json(packages);
  });

  app.get("/api/packages/:id", async (req, res) => {
    const pkg = await storage.getPackage(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }
    res.json(pkg);
  });

  // Player rankings routes
  app.get("/api/rankings", async (_req, res) => {
    const rankings = await storage.getAllPlayerRankings();
    res.json(rankings);
  });

  app.get("/api/rankings/top/:limit?", async (req, res) => {
    const limit = parseInt(req.params.limit || "100");
    const rankings = await storage.getTopPlayers(limit);
    res.json(rankings);
  });

  // Cart routes (require authentication)
  app.get("/api/cart", requireAuth, async (req, res) => {
    const items = await storage.getCartItems(req.session.userId!);
    
    // Join package data for each cart item
    const itemsWithPackages = await Promise.all(
      items.map(async (item) => {
        const pkg = await storage.getPackage(item.packageId);
        return {
          ...item,
          package: pkg,
        };
      })
    );
    
    res.json(itemsWithPackages);
  });

  app.post("/api/cart", requireAuth, async (req, res) => {
    const { packageId, quantity } = req.body;
    
    const item = await storage.addToCart({
      userId: req.session.userId!,
      packageId,
      quantity: quantity || 1,
    });
    
    res.json(item);
  });

  app.patch("/api/cart/:id", requireAuth, async (req, res) => {
    const { quantity } = req.body;
    const item = await storage.updateCartItemQuantity(req.params.id, quantity);
    
    if (!item) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    
    res.json(item);
  });

  app.delete("/api/cart/:id", requireAuth, async (req, res) => {
    const success = await storage.removeFromCart(req.params.id);
    
    if (!success) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    
    res.json({ message: "Item removed from cart" });
  });

  app.delete("/api/cart", requireAuth, async (req, res) => {
    await storage.clearCart(req.session.userId!);
    res.json({ message: "Cart cleared" });
  });

  // Order routes (require authentication)
  app.get("/api/orders", requireAuth, async (req, res) => {
    const orders = await storage.getUserOrders(req.session.userId!);
    res.json(orders);
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    
    if (!order || order.userId !== req.session.userId) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json(order);
  });

  // Get redemption codes for an order
  app.get("/api/orders/:id/codes", requireAuth, async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    
    if (!order || order.userId !== req.session.userId) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const codes = await storage.getOrderRedemptionCodes(req.params.id);
    res.json(codes);
  });

  // Coupon routes
  app.get("/api/coupons/:code", async (req, res) => {
    const coupon = await storage.getCoupon(req.params.code.toUpperCase());
    const subtotal = req.query.subtotal ? parseFloat(req.query.subtotal as string) : 0;
    
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    
    // Validate coupon
    if (!coupon.isActive) {
      return res.status(400).json({ message: "Coupon is no longer active" });
    }
    
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ message: "Coupon has expired" });
    }
    
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }
    
    // Validate minimum purchase requirement
    if (coupon.minPurchase && parseFloat(coupon.minPurchase) > subtotal) {
      return res.status(400).json({ 
        message: `Minimum purchase of RM${coupon.minPurchase} required` 
      });
    }
    
    res.json(coupon);
  });

  // Helper function to generate unique AECOIN redemption codes
  // Format: AE{VALUE}-XXXX-XXXX-XXXX (e.g., AE1000-ABCD-EFGH-JKLM)
  function generateRedemptionCode(aecoinAmount: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Only letters, no numbers
    const segments = 3; // Three segments of random letters
    const segmentLength = 4;
    const code = [`AE${aecoinAmount}`]; // Start with AE{VALUE}
    
    for (let i = 0; i < segments; i++) {
      let segment = '';
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code.push(segment);
    }
    
    return code.join('-'); // Format: AE{VALUE}-XXXX-XXXX-XXXX
  }



  // ToyyibPay payment intent endpoint - With PendingPayment security
  app.post("/api/create-toyyibpay-bill", requireAuth, async (req, res) => {
    try {
      const { couponCode, billingInfo } = req.body;
      const userId = req.session.userId!;

      // Validate billing information
      if (!billingInfo || !billingInfo.fullName || !billingInfo.fullName.trim()) {
        return res.status(400).json({ message: "Full name is required" });
      }
      
      if (!billingInfo.email || !billingInfo.email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Get cart items and calculate total SERVER-SIDE (security: never trust client amounts)
      const cartItems = await storage.getCartItems(userId);
      
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Calculate subtotal from server-side cart data
      let subtotal = 0;
      for (const item of cartItems) {
        const pkg = await storage.getPackage(item.packageId);
        if (pkg) {
          subtotal += parseFloat(pkg.price) * item.quantity;
        }
      }

      // Validate coupon if provided
      let discount = 0;
      let validatedCoupon = null;
      if (couponCode) {
        const coupon = await storage.getCoupon(couponCode.toUpperCase());
        
        if (coupon && coupon.isActive) {
          const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
          const isOverUsed = coupon.maxUses && coupon.currentUses >= coupon.maxUses;
          const belowMinPurchase = coupon.minPurchase && parseFloat(coupon.minPurchase) > subtotal;

          if (!isExpired && !isOverUsed && !belowMinPurchase) {
            validatedCoupon = coupon;
            if (coupon.discountType === 'percentage') {
              discount = (subtotal * parseFloat(coupon.discountValue)) / 100;
            } else {
              discount = parseFloat(coupon.discountValue);
            }
          }
        }
      }

      const total = Math.max(0, subtotal - discount);

      if (total <= 0) {
        return res.status(400).json({ message: "Invalid order total" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Construct base URL from request or environment
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;

      // Generate unique external reference ID for ToyyibPay
      const externalReferenceNo = crypto.randomUUID();

      // Create ToyyibPay bill (billing info is already validated above)
      const billCode = await createBill({
        billName: `AECOIN Order #${externalReferenceNo.substring(0, 8)}`,
        billDescription: `AECOIN Package Purchase`,
        billAmount: total,
        billTo: billingInfo.fullName.trim(),
        billEmail: billingInfo.email.trim(),
        billPhone: billingInfo.phoneNumber && billingInfo.phoneNumber.trim() ? billingInfo.phoneNumber.trim() : '0000000000',
        billExternalReferenceNo: externalReferenceNo,
        billReturnUrl: `${baseUrl}/api/toyyibpay/return`,
        billCallbackUrl: `${baseUrl}/api/toyyibpay/callback`,
      });

      // Create cart snapshot for security verification
      const cartSnapshot = await Promise.all(
        cartItems.map(async (item) => {
          const pkg = await storage.getPackage(item.packageId);
          return {
            packageId: item.packageId,
            packageName: pkg?.name || '',
            quantity: item.quantity,
            price: pkg?.price || '0',
            aecoinAmount: pkg?.aecoinAmount || 0,
          };
        })
      );

      // Create PendingPayment record for security and tracking (CRITICAL SECURITY)
      await storage.createPendingPayment({
        userId,
        provider: 'toyyibpay',
        externalId: billCode,
        amount: total.toFixed(2),
        currency: 'MYR',
        status: 'created',
        cartSnapshot: JSON.stringify(cartSnapshot),
        couponCode: validatedCoupon?.code || null,
        metadata: JSON.stringify({
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          externalReferenceNo,
        }),
      });

      const paymentUrl = getPaymentUrl(billCode);

      res.json({
        billCode,
        paymentUrl,
        amount: total,
        metadata: {
          couponCode: validatedCoupon?.code || "",
          subtotal: Math.round(subtotal),
          discount: Math.round(discount),
          total: Math.round(total),
        }
      });
    } catch (error: any) {
      console.error("ToyyibPay bill creation error:", error);
      res.status(500).json({ 
        message: "Error creating ToyyibPay bill: " + error.message 
      });
    }
  });

  // ToyyibPay callback handler (called by ToyyibPay when payment completes)
  app.get("/api/toyyibpay/callback", async (req, res) => {
    try {
      const { status_id, billcode } = req.query;

      console.log("ToyyibPay callback received:", { status_id, billcode });

      if (!billcode) {
        return res.status(200).send('OK');
      }

      // Check if payment already processed (idempotency)
      const existingOrder = await storage.getOrderByPaymentId(billcode as string);
      if (existingOrder) {
        console.log(`Order already exists for ToyyibPay bill ${billcode}`);
        return res.status(200).send('OK');
      }

      // Verify payment succeeded
      if (status_id === '1') {
        // Server-side verification: Query ToyyibPay to confirm payment
        const transactions = await getBillTransactions(billcode as string);
        
        if (transactions && transactions.length > 0 && transactions[0].billpaymentStatus === '1') {
          console.log("✓ ToyyibPay payment verified:", billcode);
          // Actual order fulfillment happens in return handler with session context
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error("ToyyibPay callback error:", error);
      res.status(200).send('OK');
    }
  });

  // ToyyibPay return handler (user redirected here after payment) - SECURE VERSION
  app.get("/api/toyyibpay/return", async (req, res) => {
    try {
      const { status_id, billcode } = req.query;

      console.log("ToyyibPay return:", { status_id, billcode });

      if (!billcode || status_id !== '1') {
        return res.redirect(`/payment/failed?reason=invalid_status`);
      }

      // Check if order already exists (idempotency)
      const existingOrder = await storage.getOrderByPaymentId(billcode as string);
      if (existingOrder) {
        console.log(`Order already fulfilled for ToyyibPay bill ${billcode}`);
        return res.redirect(`/orders?payment=success&provider=toyyibpay`);
      }

      // Get PendingPayment record - CRITICAL SECURITY CHECK
      const pendingPayment = await storage.getPendingPaymentByExternalId(billcode as string);
      if (!pendingPayment) {
        console.error(`No pending payment found for ToyyibPay bill ${billcode}`);
        return res.redirect(`/payment/failed?reason=pending_not_found`);
      }

      // Server-side transaction verification - NEVER trust URL params
      const transactions = await getBillTransactions(billcode as string);
      
      if (!transactions || transactions.length === 0 || transactions[0].billpaymentStatus !== '1') {
        console.error(`ToyyibPay transaction verification failed for ${billcode}`);
        await storage.updatePendingPaymentStatus(billcode as string, 'failed');
        return res.redirect(`/payment/failed?reason=verification_failed`);
      }

      const transaction = transactions[0];

      // Verify amount matches (ToyyibPay returns cents)
      const paidAmountMYR = parseFloat(transaction.billpaymentAmount) / 100;
      const expectedAmountMYR = parseFloat(pendingPayment.amount);
      
      if (Math.abs(paidAmountMYR - expectedAmountMYR) > 0.01) {
        console.error(`ToyyibPay amount mismatch: paid RM${paidAmountMYR}, expected RM${expectedAmountMYR}`);
        await storage.updatePendingPaymentStatus(billcode as string, 'failed');
        return res.redirect(`/payment/failed?reason=amount_mismatch`);
      }

      // Reconstruct order from cart snapshot (prevents cart tampering)
      const cartSnapshot = JSON.parse(pendingPayment.cartSnapshot);
      const metadata = pendingPayment.metadata ? JSON.parse(pendingPayment.metadata) : {};

      // Create order with verified data
      const order = await storage.createOrder({
        userId: pendingPayment.userId,
        totalAmount: metadata.subtotal || pendingPayment.amount,
        discountAmount: metadata.discount || '0',
        finalAmount: pendingPayment.amount,
        status: "paid",
        paymentMethod: "toyyibpay",
        paymentId: billcode as string,
        couponCode: pendingPayment.couponCode,
      });

      // Generate redemption codes from snapshot
      for (const item of cartSnapshot) {
        await storage.createOrderItem({
          orderId: order.id,
          packageId: item.packageId,
          quantity: item.quantity,
          priceAtPurchase: item.price,
        });

        for (let i = 0; i < item.quantity; i++) {
          const code = generateRedemptionCode(item.aecoinAmount);
          await storage.createRedemptionCode({
            code,
            packageId: item.packageId,
            orderId: order.id,
            aecoinAmount: item.aecoinAmount,
            status: "active",
          });

          try {
            await insertRedemptionCodeToFiveM(code, item.aecoinAmount);
          } catch (fivemError) {
            console.error(`Failed to insert code ${code} into FiveM:`, fivemError);
          }
        }
      }

      // Update order status to fulfilled
      await storage.updateOrderStatus(order.id, 'fulfilled');

      // Increment coupon usage if applied
      if (pendingPayment.couponCode) {
        const coupon = await storage.getCoupon(pendingPayment.couponCode);
        if (coupon) {
          await storage.incrementCouponUse(coupon.id);
        }
      }

      // Clear cart and mark payment succeeded
      await storage.clearCart(pendingPayment.userId);
      await storage.updatePendingPaymentStatus(billcode as string, 'succeeded');

      // Send email confirmation (soft fail)
      try {
        const user = await storage.getUser(pendingPayment.userId);
        if (user?.email) {
          const redemptionCodes = await storage.getOrderRedemptionCodes(order.id);
          const codesWithPackageNames = redemptionCodes.map((code, idx) => ({
            code: code.code,
            packageName: cartSnapshot[idx]?.packageName || 'AECOIN Package'
          }));
          
          await sendOrderConfirmationEmail(
            user.email,
            order.id,
            order.finalAmount,
            codesWithPackageNames
          );
        }
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
      }

      console.log(`✓ Order ${order.id} fulfilled via ToyyibPay`);
      res.redirect(`/orders?payment=success&provider=toyyibpay`);
    } catch (error) {
      console.error("ToyyibPay return error:", error);
      res.redirect(`/payment/failed?reason=server_error`);
    }
  });

  // Billplz payment intent endpoint - With PendingPayment security
  app.post("/api/create-billplz-bill", requireAuth, async (req, res) => {
    try {
      const { couponCode, billingInfo } = req.body;
      const userId = req.session.userId!;
      
      console.log("Billplz bill creation - billing info received:", billingInfo);

      // Validate billing information
      if (!billingInfo || !billingInfo.fullName || !billingInfo.fullName.trim()) {
        return res.status(400).json({ message: "Full name is required" });
      }
      
      if (!billingInfo.email || !billingInfo.email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Get cart items and calculate total SERVER-SIDE (security: never trust client amounts)
      const cartItems = await storage.getCartItems(userId);
      
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Calculate subtotal from server-side cart data
      let subtotal = 0;
      for (const item of cartItems) {
        const pkg = await storage.getPackage(item.packageId);
        if (pkg) {
          subtotal += parseFloat(pkg.price) * item.quantity;
        }
      }

      // Validate coupon if provided
      let discount = 0;
      let validatedCoupon = null;
      if (couponCode) {
        const coupon = await storage.getCoupon(couponCode.toUpperCase());
        
        if (coupon && coupon.isActive) {
          const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
          const isOverUsed = coupon.maxUses && coupon.currentUses >= coupon.maxUses;
          const belowMinPurchase = coupon.minPurchase && parseFloat(coupon.minPurchase) > subtotal;

          if (!isExpired && !isOverUsed && !belowMinPurchase) {
            validatedCoupon = coupon;
            if (coupon.discountType === 'percentage') {
              discount = (subtotal * parseFloat(coupon.discountValue)) / 100;
            } else {
              discount = parseFloat(coupon.discountValue);
            }
          }
        }
      }

      const total = Math.max(0, subtotal - discount);

      if (total <= 0) {
        return res.status(400).json({ message: "Invalid order total" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Construct base URL from request or environment
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;

      // Generate unique external reference ID for Billplz
      const externalReferenceNo = crypto.randomUUID();

      // Create Billplz bill (billing info is already validated above)
      const billResponse = await createBillplzBill({
        description: `AECOIN Order #${externalReferenceNo.substring(0, 8)}`,
        amount: total,
        name: billingInfo.fullName.trim(),
        email: billingInfo.email.trim(),
        mobile: billingInfo.phoneNumber && billingInfo.phoneNumber.trim() ? billingInfo.phoneNumber.trim() : undefined,
        callbackUrl: `${baseUrl}/api/billplz/callback`,
        redirectUrl: `${baseUrl}/api/billplz/return`,
        reference1Label: 'Order ID',
        reference1: externalReferenceNo,
      });

      // Create cart snapshot for security verification
      const cartSnapshot = await Promise.all(
        cartItems.map(async (item) => {
          const pkg = await storage.getPackage(item.packageId);
          return {
            packageId: item.packageId,
            packageName: pkg?.name || '',
            quantity: item.quantity,
            price: pkg?.price || '0',
            aecoinAmount: pkg?.aecoinAmount || 0,
          };
        })
      );

      // Create PendingPayment record for security and tracking (CRITICAL SECURITY)
      await storage.createPendingPayment({
        userId,
        provider: 'billplz',
        externalId: billResponse.id,
        amount: total.toFixed(2),
        currency: 'MYR',
        status: 'created',
        cartSnapshot: JSON.stringify(cartSnapshot),
        couponCode: validatedCoupon?.code || null,
        metadata: JSON.stringify({
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          externalReferenceNo,
        }),
      });

      res.json({
        billId: billResponse.id,
        paymentUrl: billResponse.url,
        amount: total,
        metadata: {
          couponCode: validatedCoupon?.code || "",
          subtotal: Math.round(subtotal),
          discount: Math.round(discount),
          total: Math.round(total),
        }
      });
    } catch (error: any) {
      console.error("Billplz bill creation error:", error);
      res.status(500).json({ 
        message: "Error creating Billplz bill: " + error.message 
      });
    }
  });

  // Billplz callback handler (called by Billplz when payment completes)
  app.post("/api/billplz/callback", async (req, res) => {
    try {
      // req.body is raw text string due to express.text() middleware
      const rawBody = typeof req.body === 'string' ? req.body : '';
      const signature = req.headers['x-signature'] as string;

      // SECURITY: Verify X-Signature to ensure callback is from Billplz (uses raw body)
      const isValidSignature = verifyBillplzSignature(rawBody, signature || '');
      
      if (!isValidSignature) {
        console.error('Invalid Billplz callback signature - possible fraud attempt');
        return res.status(200).send('OK'); // Return 200 to prevent retries
      }

      // Parse the URL-encoded body manually
      const params = new URLSearchParams(rawBody);
      const id = params.get('id');
      const paid = params.get('paid');

      console.log("Billplz callback received:", { id, paid, hasSignature: !!signature });

      if (!id) {
        return res.status(200).send('OK');
      }

      // Check if payment already processed (idempotency)
      const existingOrder = await storage.getOrderByPaymentId(id);
      if (existingOrder) {
        console.log(`Order already exists for Billplz bill ${id}`);
        return res.status(200).send('OK');
      }

      // Verify PendingPayment exists - SECURITY CHECK
      const pendingPayment = await storage.getPendingPaymentByExternalId(id);
      if (!pendingPayment) {
        console.error(`No pending payment found for Billplz bill ${id}`);
        return res.status(200).send('OK');
      }

      // Verify payment succeeded
      if (paid === 'true' || paid === '1') {
        // Server-side verification: Query Billplz to confirm payment
        const billStatus = await verifyBillPayment(id);
        
        if (billStatus) {
          console.log("✓ Billplz payment verified:", id);
          // Actual order fulfillment happens in return handler with session context
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error("Billplz callback error:", error);
      res.status(200).send('OK');
    }
  });

  // Billplz return handler (user redirected here after payment) - SECURE VERSION
  app.get("/api/billplz/return", async (req, res) => {
    try {
      const { billplz } = req.query;

      console.log("Billplz return:", { billplz });

      if (!billplz) {
        return res.redirect(`/payment/failed?reason=invalid_request`);
      }

      // Parse the billplz data (it comes as a JSON object)
      let billData: any;
      try {
        billData = typeof billplz === 'string' ? JSON.parse(billplz) : billplz;
      } catch (parseError) {
        console.error("Failed to parse Billplz data:", parseError);
        return res.redirect(`/payment/failed?reason=invalid_data`);
      }

      const billId = billData.id;
      
      if (!billId || billData.paid !== true) {
        return res.redirect(`/payment/failed?reason=payment_not_completed`);
      }

      // Check if order already exists (idempotency)
      const existingOrder = await storage.getOrderByPaymentId(billId);
      if (existingOrder) {
        console.log(`Order already fulfilled for Billplz bill ${billId}`);
        return res.redirect(`/orders?payment=success&provider=billplz`);
      }

      // Get PendingPayment record - CRITICAL SECURITY CHECK
      const pendingPayment = await storage.getPendingPaymentByExternalId(billId);
      if (!pendingPayment) {
        console.error(`No pending payment found for Billplz bill ${billId}`);
        return res.redirect(`/payment/failed?reason=pending_not_found`);
      }

      // Server-side transaction verification - NEVER trust URL params
      const bill = await getBill(billId);
      
      if (!bill.paid || bill.state !== 'paid') {
        console.error(`Billplz transaction verification failed for ${billId}`);
        await storage.updatePendingPaymentStatus(billId, 'failed');
        return res.redirect(`/payment/failed?reason=verification_failed`);
      }

      // Verify amount matches (Billplz returns cents)
      const paidAmountMYR = bill.amount / 100;
      const expectedAmountMYR = parseFloat(pendingPayment.amount);
      
      if (Math.abs(paidAmountMYR - expectedAmountMYR) > 0.01) {
        console.error(`Billplz amount mismatch: paid RM${paidAmountMYR}, expected RM${expectedAmountMYR}`);
        await storage.updatePendingPaymentStatus(billId, 'failed');
        return res.redirect(`/payment/failed?reason=amount_mismatch`);
      }

      // Reconstruct order from cart snapshot (prevents cart tampering)
      const cartSnapshot = JSON.parse(pendingPayment.cartSnapshot);
      const metadata = pendingPayment.metadata ? JSON.parse(pendingPayment.metadata) : {};

      // Create order with verified data
      const order = await storage.createOrder({
        userId: pendingPayment.userId,
        totalAmount: metadata.subtotal || pendingPayment.amount,
        discountAmount: metadata.discount || '0',
        finalAmount: pendingPayment.amount,
        status: "paid",
        paymentMethod: "billplz",
        paymentId: billId,
        couponCode: pendingPayment.couponCode,
      });

      // Generate redemption codes from snapshot
      for (const item of cartSnapshot) {
        await storage.createOrderItem({
          orderId: order.id,
          packageId: item.packageId,
          quantity: item.quantity,
          priceAtPurchase: item.price,
        });

        for (let i = 0; i < item.quantity; i++) {
          const code = generateRedemptionCode(item.aecoinAmount);
          await storage.createRedemptionCode({
            code,
            packageId: item.packageId,
            orderId: order.id,
            aecoinAmount: item.aecoinAmount,
            status: "active",
          });

          try {
            await insertRedemptionCodeToFiveM(code, item.aecoinAmount);
          } catch (fivemError) {
            console.error(`Failed to insert code ${code} into FiveM:`, fivemError);
          }
        }
      }

      // Update order status to fulfilled
      await storage.updateOrderStatus(order.id, 'fulfilled');

      // Increment coupon usage if applied
      if (pendingPayment.couponCode) {
        const coupon = await storage.getCoupon(pendingPayment.couponCode);
        if (coupon) {
          await storage.incrementCouponUse(coupon.id);
        }
      }

      // Clear cart and mark payment succeeded
      await storage.clearCart(pendingPayment.userId);
      await storage.updatePendingPaymentStatus(billId, 'succeeded');

      // Send email confirmation (soft fail)
      try {
        const user = await storage.getUser(pendingPayment.userId);
        if (user?.email) {
          const redemptionCodes = await storage.getOrderRedemptionCodes(order.id);
          const codesWithPackageNames = redemptionCodes.map((code, idx) => ({
            code: code.code,
            packageName: cartSnapshot[idx]?.packageName || 'AECOIN Package'
          }));
          
          await sendOrderConfirmationEmail(
            user.email,
            order.id,
            order.finalAmount,
            codesWithPackageNames
          );
        }
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
      }

      console.log(`✓ Order ${order.id} fulfilled via Billplz`);
      res.redirect(`/orders?payment=success&provider=billplz`);
    } catch (error) {
      console.error("Billplz return error:", error);
      res.redirect(`/payment/failed?reason=server_error`);
    }
  });

  // ============================================
  // ADMIN ROUTES - Protected by requireAdmin middleware
  // ============================================

  // Admin: Get all orders with filters
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      
      // Enrich orders with user information
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const user = await storage.getUser(order.userId);
          const orderItems = await storage.getOrderItems(order.id);
          const redemptionCodes = await storage.getOrderRedemptionCodes(order.id);
          
          // Fetch package names for each order item
          const enrichedOrderItems = await Promise.all(
            orderItems.map(async (item) => {
              const pkg = await storage.getPackage(item.packageId);
              return {
                packageName: pkg?.name || "Unknown Package",
                quantity: item.quantity,
                price: item.priceAtPurchase
              };
            })
          );
          
          return {
            ...order,
            userName: user?.username || "Unknown User",
            userEmail: user?.email || "no-email@example.com",
            orderItems: enrichedOrderItems,
            redemptionCodes: redemptionCodes.map(code => ({
              code: code.code
            }))
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error: any) {
      console.error("Admin orders fetch error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Admin: Update order status
  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      console.error("Admin order update error:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Admin: Create package
  app.post("/api/admin/packages", requireAdmin, async (req, res) => {
    try {
      const pkg = await storage.createPackage(req.body);
      res.json(pkg);
    } catch (error: any) {
      console.error("Admin package creation error:", error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  // Admin: Update package
  app.patch("/api/admin/packages/:id", requireAdmin, async (req, res) => {
    try {
      const pkg = await storage.updatePackage(req.params.id, req.body);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(pkg);
    } catch (error: any) {
      console.error("Admin package update error:", error);
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  // Admin: Delete package
  app.delete("/api/admin/packages/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deletePackage(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json({ message: "Package deleted successfully" });
    } catch (error: any) {
      console.error("Admin package deletion error:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Admin: Get all coupons
  app.get("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error: any) {
      console.error("Admin coupons fetch error:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  // Admin: Create coupon
  app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.createCoupon(req.body);
      res.json(coupon);
    } catch (error: any) {
      console.error("Admin coupon creation error:", error);
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  // Admin: Update coupon
  app.patch("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.updateCoupon(req.params.id, req.body);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error: any) {
      console.error("Admin coupon update error:", error);
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  // Admin: Delete coupon
  app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteCoupon(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json({ message: "Coupon deleted successfully" });
    } catch (error: any) {
      console.error("Admin coupon deletion error:", error);
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // Admin: Get payment settings
  app.get("/api/admin/payment-settings", requireAdmin, async (req, res) => {
    try {
      let settings = await storage.getAllPaymentSettings();
      
      // Initialize settings if not exist
      if (settings.length === 0) {
        await storage.createPaymentSetting({
          gateway: 'billplz',
          enabled: true,
          displayName: 'Billplz (FPX, Cards, E-Wallets)',
          displayOrder: 1,
        });
        await storage.createPaymentSetting({
          gateway: 'toyyibpay',
          enabled: false,
          displayName: 'ToyyibPay (FPX, Online Banking)',
          displayOrder: 2,
        });
        settings = await storage.getAllPaymentSettings();
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error("Payment settings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch payment settings" });
    }
  });

  // Admin: Update payment setting
  app.patch("/api/admin/payment-settings/:gateway", requireAdmin, async (req, res) => {
    try {
      const { enabled } = req.body;
      const setting = await storage.updatePaymentSetting(req.params.gateway, enabled);
      if (!setting) {
        return res.status(404).json({ message: "Payment setting not found" });
      }
      res.json(setting);
    } catch (error: any) {
      console.error("Payment setting update error:", error);
      res.status(500).json({ message: "Failed to update payment setting" });
    }
  });

  // Public: Get enabled payment gateways (for checkout page)
  app.get("/api/payment-gateways", async (req, res) => {
    try {
      const allSettings = await storage.getAllPaymentSettings();
      
      // Initialize if empty
      if (allSettings.length === 0) {
        await storage.createPaymentSetting({
          gateway: 'billplz',
          enabled: true,
          displayName: 'Billplz (FPX, Cards, E-Wallets)',
          displayOrder: 1,
        });
        await storage.createPaymentSetting({
          gateway: 'toyyibpay',
          enabled: false,
          displayName: 'ToyyibPay (FPX, Online Banking)',
          displayOrder: 2,
        });
        const settings = await storage.getAllPaymentSettings();
        const enabled = settings.filter(s => s.enabled);
        return res.json(enabled);
      }
      
      const enabledGateways = allSettings.filter(s => s.enabled);
      res.json(enabledGateways);
    } catch (error: any) {
      console.error("Payment gateways fetch error:", error);
      res.status(500).json({ message: "Failed to fetch payment gateways" });
    }
  });

  // Admin: Create or update ranking
  app.post("/api/admin/rankings", requireAdmin, async (req, res) => {
    try {
      const count = await storage.getAllPlayerRankings();
      if (count.length >= 10 && !req.body.userId) {
        return res.status(400).json({ message: "Maximum 10 players allowed" });
      }
      const ranking = await storage.createOrUpdatePlayerRanking(req.body);
      res.json(ranking);
    } catch (error: any) {
      console.error("Admin ranking creation error:", error);
      res.status(500).json({ message: "Failed to create ranking" });
    }
  });

  // Admin: Update ranking
  app.patch("/api/admin/rankings/:userId", requireAdmin, async (req, res) => {
    try {
      const ranking = await storage.createOrUpdatePlayerRanking({
        userId: req.params.userId,
        ...req.body
      });
      res.json(ranking);
    } catch (error: any) {
      console.error("Admin ranking update error:", error);
      res.status(500).json({ message: "Failed to update ranking" });
    }
  });

  // Admin: Update ranking image and crown
  app.patch("/api/admin/rankings/:userId/image", requireAdmin, async (req, res) => {
    try {
      const { imageUrl, crownType } = req.body;
      const ranking = await storage.updateRankingImage(req.params.userId, imageUrl, crownType);
      if (!ranking) {
        return res.status(404).json({ message: "Ranking not found" });
      }
      res.json(ranking);
    } catch (error: any) {
      console.error("Admin ranking image update error:", error);
      res.status(500).json({ message: "Failed to update ranking image" });
    }
  });

  // Admin: Delete ranking
  app.delete("/api/admin/rankings/:userId", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deletePlayerRanking(req.params.userId);
      if (!success) {
        return res.status(404).json({ message: "Ranking not found" });
      }
      res.json({ message: "Ranking deleted successfully" });
    } catch (error: any) {
      console.error("Admin ranking deletion error:", error);
      res.status(500).json({ message: "Failed to delete ranking" });
    }
  });

  // Public: Get all active gallery images
  app.get("/api/gallery", async (req, res) => {
    try {
      const images = await storage.getActiveGalleryImages();
      res.json(images);
    } catch (error: any) {
      console.error("Gallery fetch error:", error);
      res.status(500).json({ message: "Failed to fetch gallery images" });
    }
  });

  // Admin: Get all gallery images (including inactive)
  app.get("/api/admin/gallery", requireAdmin, async (req, res) => {
    try {
      const images = await storage.getAllGalleryImages();
      res.json(images);
    } catch (error: any) {
      console.error("Admin gallery fetch error:", error);
      res.status(500).json({ message: "Failed to fetch gallery images" });
    }
  });

  // Admin: Create gallery image
  app.post("/api/admin/gallery", requireAdmin, async (req, res) => {
    try {
      console.log("Creating gallery image with data:", req.body);
      const image = await storage.createGalleryImage(req.body);
      console.log("Gallery image created successfully:", image);
      res.json(image);
    } catch (error: any) {
      console.error("Admin gallery creation error:", error);
      console.error("Error details:", error.message, error.stack);
      res.status(500).json({ message: error.message || "Failed to create gallery image" });
    }
  });

  // Admin: Update gallery image
  app.patch("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const image = await storage.updateGalleryImage(req.params.id, req.body);
      if (!image) {
        return res.status(404).json({ message: "Gallery image not found" });
      }
      res.json(image);
    } catch (error: any) {
      console.error("Admin gallery update error:", error);
      res.status(500).json({ message: "Failed to update gallery image" });
    }
  });

  // Admin: Delete gallery image
  app.delete("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteGalleryImage(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Gallery image not found" });
      }
      res.json({ message: "Gallery image deleted successfully" });
    } catch (error: any) {
      console.error("Admin gallery deletion error:", error);
      res.status(500).json({ message: "Failed to delete gallery image" });
    }
  });

  // Public: Get active hero setting
  app.get("/api/hero", async (req, res) => {
    try {
      const setting = await storage.getActiveHeroSetting();
      res.json(setting);
    } catch (error: any) {
      console.error("Hero setting fetch error:", error);
      res.status(500).json({ message: "Failed to fetch hero setting" });
    }
  });

  // Admin: Get all hero settings
  app.get("/api/admin/hero", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllHeroSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Admin hero settings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch hero settings" });
    }
  });

  // Admin: Create hero setting
  app.post("/api/admin/hero", requireAdmin, async (req, res) => {
    try {
      const setting = await storage.createHeroSetting(req.body);
      res.json(setting);
    } catch (error: any) {
      console.error("Admin hero setting creation error:", error);
      res.status(500).json({ message: "Failed to create hero setting" });
    }
  });

  // Admin: Update hero setting
  app.patch("/api/admin/hero/:id", requireAdmin, async (req, res) => {
    try {
      const setting = await storage.updateHeroSetting(req.params.id, req.body);
      if (!setting) {
        return res.status(404).json({ message: "Hero setting not found" });
      }
      res.json(setting);
    } catch (error: any) {
      console.error("Admin hero setting update error:", error);
      res.status(500).json({ message: "Failed to update hero setting" });
    }
  });

  // Admin: Delete hero setting
  app.delete("/api/admin/hero/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteHeroSetting(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Hero setting not found" });
      }
      res.json({ message: "Hero setting deleted successfully" });
    } catch (error: any) {
      console.error("Admin hero setting deletion error:", error);
      res.status(500).json({ message: "Failed to delete hero setting" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
