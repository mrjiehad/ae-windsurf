import { 
  type User, type InsertUser,
  type Package, type InsertPackage,
  type CartItem, type InsertCartItem,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type RedemptionCode, type InsertRedemptionCode,
  type Coupon, type InsertCoupon,
  type PendingPayment, type InsertPendingPayment,
  type PlayerRanking, type InsertPlayerRanking,
  type PaymentSetting, type InsertPaymentSetting,
  type GalleryImage, type InsertGalleryImage,
  type HeroSetting, type InsertHeroSetting,
  users, packages, cartItems, orders, orderItems, redemptionCodes, coupons, pendingPayments, playerRankings, paymentSettings, galleryImages, heroSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAdminUser(username: string, email: string, passwordHash: string): Promise<User>;
  
  // Package operations
  getAllPackages(): Promise<Package[]>;
  getPackage(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<boolean>;
  
  // Cart operations
  getCartItems(userId: string): Promise<CartItem[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;
  
  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByPaymentId(paymentId: string): Promise<Order | undefined>;
  getUserOrders(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, paymentId?: string): Promise<Order | undefined>;
  
  // Order items operations
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  
  // Redemption code operations
  createRedemptionCode(code: InsertRedemptionCode): Promise<RedemptionCode>;
  getOrderRedemptionCodes(orderId: string): Promise<RedemptionCode[]>;
  redeemCode(code: string): Promise<RedemptionCode | undefined>;
  
  // Coupon operations
  getCoupon(code: string): Promise<Coupon | undefined>;
  getAllCoupons(): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<boolean>;
  incrementCouponUse(id: string): Promise<boolean>;
  
  // Pending payment operations
  createPendingPayment(payment: InsertPendingPayment): Promise<PendingPayment>;
  getPendingPaymentByExternalId(externalId: string): Promise<PendingPayment | undefined>;
  updatePendingPaymentStatus(externalId: string, status: string): Promise<PendingPayment | undefined>;
  
  // Player rankings operations
  getAllPlayerRankings(): Promise<PlayerRanking[]>;
  getPlayerRanking(userId: string): Promise<PlayerRanking | undefined>;
  createOrUpdatePlayerRanking(ranking: InsertPlayerRanking): Promise<PlayerRanking>;
  updateRankingImage(userId: string, imageUrl: string, crownType?: string): Promise<PlayerRanking | undefined>;
  deletePlayerRanking(userId: string): Promise<boolean>;
  getTopPlayers(limit: number): Promise<PlayerRanking[]>;
  
  // Payment settings operations
  getAllPaymentSettings(): Promise<PaymentSetting[]>;
  getPaymentSetting(gateway: string): Promise<PaymentSetting | undefined>;
  updatePaymentSetting(gateway: string, enabled: boolean): Promise<PaymentSetting | undefined>;
  createPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting>;
  
  // Gallery operations
  getActiveGalleryImages(): Promise<GalleryImage[]>;
  getAllGalleryImages(): Promise<GalleryImage[]>;
  getGalleryImage(id: string): Promise<GalleryImage | undefined>;
  createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage>;
  updateGalleryImage(id: string, image: Partial<InsertGalleryImage>): Promise<GalleryImage | undefined>;
  deleteGalleryImage(id: string): Promise<boolean>;
  
  // Hero settings operations
  getActiveHeroSetting(): Promise<HeroSetting | undefined>;
  getAllHeroSettings(): Promise<HeroSetting[]>;
  createHeroSetting(setting: InsertHeroSetting): Promise<HeroSetting>;
  updateHeroSetting(id: string, setting: Partial<InsertHeroSetting>): Promise<HeroSetting | undefined>;
  deleteHeroSetting(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async createAdminUser(username: string, email: string, passwordHash: string): Promise<User> {
    const result = await db.insert(users).values({
      username,
      email,
      passwordHash,
      isAdmin: true,
      discordId: null,
      avatar: null,
    }).returning();
    return result[0];
  }

  // Package operations
  async getAllPackages(): Promise<Package[]> {
    return await db.select().from(packages).orderBy(asc(packages.price));
  }

  async getPackage(id: string): Promise<Package | undefined> {
    const result = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
    return result[0];
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const result = await db.insert(packages).values(pkg).returning();
    return result[0];
  }

  async updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package | undefined> {
    const result = await db.update(packages).set(pkg).where(eq(packages.id, id)).returning();
    return result[0];
  }

  async deletePackage(id: string): Promise<boolean> {
    const result = await db.delete(packages).where(eq(packages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return await db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existing = await db.select().from(cartItems)
      .where(and(
        eq(cartItems.userId, item.userId),
        eq(cartItems.packageId, item.packageId)
      ))
      .limit(1);

    if (existing[0]) {
      // Update quantity
      const updated = await db.update(cartItems)
        .set({ quantity: existing[0].quantity + item.quantity })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated[0];
    } else {
      // Insert new
      const result = await db.insert(cartItems).values(item).returning();
      return result[0];
    }
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const result = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return result[0];
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async getOrderByPaymentId(paymentId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.paymentId, paymentId)).limit(1);
    return result[0];
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(sql`${orders.createdAt} DESC`);
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(sql`${orders.createdAt} DESC`);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async updateOrderStatus(id: string, status: string, paymentId?: string): Promise<Order | undefined> {
    const updateData: any = { status };
    if (paymentId) {
      updateData.paymentId = paymentId;
    }
    if (status === 'fulfilled' || status === 'completed') {
      updateData.completedAt = new Date();
    }
    const result = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return result[0];
  }

  // Order items operations
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const result = await db.insert(orderItems).values(orderItem).returning();
    return result[0];
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  // Redemption code operations
  async createRedemptionCode(code: InsertRedemptionCode): Promise<RedemptionCode> {
    const result = await db.insert(redemptionCodes).values(code).returning();
    return result[0];
  }

  async getOrderRedemptionCodes(orderId: string): Promise<RedemptionCode[]> {
    return await db.select().from(redemptionCodes).where(eq(redemptionCodes.orderId, orderId));
  }

  async redeemCode(code: string): Promise<RedemptionCode | undefined> {
    const result = await db.update(redemptionCodes)
      .set({ status: 'redeemed', redeemedAt: new Date() })
      .where(and(
        eq(redemptionCodes.code, code),
        eq(redemptionCodes.status, 'active')
      ))
      .returning();
    return result[0];
  }

  // Coupon operations
  async getCoupon(code: string): Promise<Coupon | undefined> {
    const result = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    return result[0];
  }

  async getAllCoupons(): Promise<Coupon[]> {
    return await db.select().from(coupons).orderBy(sql`${coupons.createdAt} DESC`);
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const result = await db.insert(coupons).values(coupon).returning();
    return result[0];
  }

  async updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined> {
    const result = await db.update(coupons).set(coupon).where(eq(coupons.id, id)).returning();
    return result[0];
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await db.delete(coupons).where(eq(coupons.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async incrementCouponUse(id: string): Promise<boolean> {
    const result = await db.update(coupons)
      .set({ currentUses: sql`${coupons.currentUses} + 1` })
      .where(eq(coupons.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Pending payment operations
  async createPendingPayment(payment: InsertPendingPayment): Promise<PendingPayment> {
    const result = await db.insert(pendingPayments).values(payment).returning();
    return result[0];
  }

  async getPendingPaymentByExternalId(externalId: string): Promise<PendingPayment | undefined> {
    const result = await db.select().from(pendingPayments).where(eq(pendingPayments.externalId, externalId)).limit(1);
    return result[0];
  }

  async updatePendingPaymentStatus(externalId: string, status: string): Promise<PendingPayment | undefined> {
    const result = await db.update(pendingPayments)
      .set({ status, updatedAt: new Date() })
      .where(eq(pendingPayments.externalId, externalId))
      .returning();
    return result[0];
  }

  // Player rankings operations
  async getAllPlayerRankings(): Promise<PlayerRanking[]> {
    return await db.select().from(playerRankings).orderBy(sql`${playerRankings.rank} ASC`);
  }

  async getPlayerRanking(userId: string): Promise<PlayerRanking | undefined> {
    const result = await db.select().from(playerRankings).where(eq(playerRankings.userId, userId)).limit(1);
    return result[0];
  }

  async createOrUpdatePlayerRanking(ranking: InsertPlayerRanking): Promise<PlayerRanking> {
    const existing = await this.getPlayerRanking(ranking.userId);
    
    if (existing) {
      const result = await db.update(playerRankings)
        .set({ ...ranking, updatedAt: new Date() })
        .where(eq(playerRankings.userId, ranking.userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(playerRankings).values(ranking).returning();
      return result[0];
    }
  }

  async updateRankingImage(userId: string, imageUrl: string, crownType?: string): Promise<PlayerRanking | undefined> {
    const updateData: any = { imageUrl, updatedAt: new Date() };
    if (crownType !== undefined) {
      updateData.crownType = crownType;
    }
    
    const result = await db.update(playerRankings)
      .set(updateData)
      .where(eq(playerRankings.userId, userId))
      .returning();
    return result[0];
  }

  async deletePlayerRanking(userId: string): Promise<boolean> {
    const result = await db.delete(playerRankings).where(eq(playerRankings.userId, userId)).returning();
    return result.length > 0;
  }

  async getTopPlayers(limit: number = 100): Promise<PlayerRanking[]> {
    return await db.select()
      .from(playerRankings)
      .orderBy(sql`${playerRankings.rank} ASC`)
      .limit(limit);
  }

  // Payment settings operations
  async getAllPaymentSettings(): Promise<PaymentSetting[]> {
    return await db.select().from(paymentSettings).orderBy(sql`${paymentSettings.displayOrder} ASC`);
  }

  async getPaymentSetting(gateway: string): Promise<PaymentSetting | undefined> {
    const result = await db.select().from(paymentSettings).where(eq(paymentSettings.gateway, gateway)).limit(1);
    return result[0];
  }

  async updatePaymentSetting(gateway: string, enabled: boolean): Promise<PaymentSetting | undefined> {
    const result = await db.update(paymentSettings)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(paymentSettings.gateway, gateway))
      .returning();
    return result[0];
  }

  async createPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting> {
    const result = await db.insert(paymentSettings).values(setting).returning();
    return result[0];
  }

  // Gallery operations
  async getActiveGalleryImages(): Promise<GalleryImage[]> {
    return await db.select()
      .from(galleryImages)
      .where(eq(galleryImages.isActive, true))
      .orderBy(sql`${galleryImages.displayOrder} ASC, ${galleryImages.createdAt} DESC`);
  }

  async getAllGalleryImages(): Promise<GalleryImage[]> {
    return await db.select()
      .from(galleryImages)
      .orderBy(sql`${galleryImages.displayOrder} ASC, ${galleryImages.createdAt} DESC`);
  }

  async getGalleryImage(id: string): Promise<GalleryImage | undefined> {
    const result = await db.select().from(galleryImages).where(eq(galleryImages.id, id)).limit(1);
    return result[0];
  }

  async createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage> {
    const result = await db.insert(galleryImages).values(image).returning();
    return result[0];
  }

  async updateGalleryImage(id: string, image: Partial<InsertGalleryImage>): Promise<GalleryImage | undefined> {
    const result = await db.update(galleryImages)
      .set({ ...image, updatedAt: new Date() })
      .where(eq(galleryImages.id, id))
      .returning();
    return result[0];
  }

  async deleteGalleryImage(id: string): Promise<boolean> {
    const result = await db.delete(galleryImages).where(eq(galleryImages.id, id)).returning();
    return result.length > 0;
  }

  // Hero settings operations
  async getActiveHeroSetting(): Promise<HeroSetting | undefined> {
    const result = await db.select()
      .from(heroSettings)
      .where(eq(heroSettings.isActive, true))
      .orderBy(sql`${heroSettings.updatedAt} DESC`)
      .limit(1);
    return result[0];
  }

  async getAllHeroSettings(): Promise<HeroSetting[]> {
    return await db.select()
      .from(heroSettings)
      .orderBy(sql`${heroSettings.updatedAt} DESC`);
  }

  async createHeroSetting(setting: InsertHeroSetting): Promise<HeroSetting> {
    const result = await db.insert(heroSettings).values(setting).returning();
    return result[0];
  }

  async updateHeroSetting(id: string, setting: Partial<InsertHeroSetting>): Promise<HeroSetting | undefined> {
    const result = await db.update(heroSettings)
      .set({ ...setting, updatedAt: new Date() })
      .where(eq(heroSettings.id, id))
      .returning();
    return result[0];
  }

  async deleteHeroSetting(id: string): Promise<boolean> {
    const result = await db.delete(heroSettings).where(eq(heroSettings.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
