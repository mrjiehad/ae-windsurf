import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Discord OAuth for regular users, username/password for admins
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discordId: varchar("discord_id").unique(), // nullable for admin users
  email: text("email").notNull(),
  username: text("username").notNull().unique(), // unique for admin login
  avatar: text("avatar"),
  passwordHash: text("password_hash"), // for admin users only
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Packages table - AECOIN packages for sale
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // Original price before discount
  aecoinAmount: integer("aecoin_amount").notNull(), // Amount of AECOIN
  codesPerPackage: integer("codes_per_package").notNull().default(1), // How many codes to generate
  featured: boolean("featured").default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
});
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packageId: varchar("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Pending payments table - Tracks payment intent/bill creation before completion
export const pendingPayments = pgTable("pending_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // toyyibpay, billplz
  externalId: text("external_id").notNull().unique(), // paymentIntentId or billCode
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("MYR"),
  status: text("status").notNull().default("created"), // created, processing, succeeded, failed, cancelled, expired
  cartSnapshot: text("cart_snapshot").notNull(), // JSON string of cart items
  couponCode: text("coupon_code"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPendingPaymentSchema = createInsertSchema(pendingPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPendingPayment = z.infer<typeof insertPendingPaymentSchema>;
export type PendingPayment = typeof pendingPayments.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, fulfilled, failed, cancelled
  paymentMethod: text("payment_method").notNull(), // toyyibpay, billplz
  paymentId: text("payment_id").unique(), // External payment ID from ToyyibPay/Billplz - must be unique for idempotency
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  packageId: varchar("package_id").notNull().references(() => packages.id),
  quantity: integer("quantity").notNull(),
  priceAtPurchase: decimal("price_at_purchase", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Redemption codes table - Auto-generated AECOIN codes
export const redemptionCodes = pgTable("redemption_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // The actual redemption code
  packageId: varchar("package_id").notNull().references(() => packages.id),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  aecoinAmount: integer("aecoin_amount").notNull(), // AECOIN value for this code
  status: text("status").notNull().default("active"), // active, redeemed, expired
  redeemedAt: timestamp("redeemed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiry
});

export const insertRedemptionCodeSchema = createInsertSchema(redemptionCodes).omit({
  id: true,
  createdAt: true,
});
export type InsertRedemptionCode = z.infer<typeof insertRedemptionCodeSchema>;
export type RedemptionCode = typeof redemptionCodes.$inferSelect;

// Coupons table - Discount codes
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // percentage, fixed
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minPurchase: decimal("min_purchase", { precision: 10, scale: 2 }).default("0"),
  maxUses: integer("max_uses"), // null = unlimited
  currentUses: integer("current_uses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  currentUses: true,
  createdAt: true,
});
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

// Player rankings table - Leaderboard data
export const playerRankings = pgTable("player_rankings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // Player ID (doesn't need to be a registered user)
  playerName: text("player_name").notNull(), // In-game name
  stars: integer("stars").notNull().default(0), // Achievement/score system
  rank: integer("rank").notNull(), // Position in leaderboard
  imageUrl: text("image_url"), // Profile picture for top players
  crownType: text("crown_type"), // gold, silver, bronze for top 3
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlayerRankingSchema = createInsertSchema(playerRankings).omit({
  id: true,
  updatedAt: true,
});
export type InsertPlayerRanking = z.infer<typeof insertPlayerRankingSchema>;
export type PlayerRanking = typeof playerRankings.$inferSelect;

// Payment settings table - Configure payment gateway visibility
export const paymentSettings = pgTable("payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gateway: text("gateway").notNull().unique(), // toyyibpay, billplz
  enabled: boolean("enabled").notNull().default(true),
  displayName: text("display_name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentSettingSchema = createInsertSchema(paymentSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertPaymentSetting = z.infer<typeof insertPaymentSettingSchema>;
export type PaymentSetting = typeof paymentSettings.$inferSelect;

// Gallery images table - Manage gallery pictures with categories
export const galleryImages = pgTable("gallery_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(), // Image URL or base64
  category: text("category").notNull(), // Vehicles, Properties, Weapons, etc.
  title: text("title").notNull(), // Display title
  description: text("description"), // Optional description
  displayOrder: integer("display_order").notNull().default(0), // For sorting
  isActive: boolean("is_active").notNull().default(true), // Show/hide
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGalleryImageSchema = createInsertSchema(galleryImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGalleryImage = z.infer<typeof insertGalleryImageSchema>;
export type GalleryImage = typeof galleryImages.$inferSelect;

// Hero settings table - Manage hero section images
export const heroSettings = pgTable("hero_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  backgroundImage: text("background_image").notNull(), // Main hero background
  videoThumbnail: text("video_thumbnail"), // Optional video thumbnail
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHeroSettingSchema = createInsertSchema(heroSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertHeroSetting = z.infer<typeof insertHeroSettingSchema>;
export type HeroSetting = typeof heroSettings.$inferSelect;
