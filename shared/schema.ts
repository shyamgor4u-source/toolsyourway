import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// USERS
// ============================================================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password"), // null for OAuth-only users
  authProvider: text("auth_provider").notNull().default("email"), // email | google | microsoft
  authProviderId: text("auth_provider_id"), // OAuth subject ID
  role: text("role").notNull().default("user"), // user | admin
  plan: text("plan").default("none"), // none | ultra | pro | premium
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Registration form schema
export const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Login form schema (allows admin@tw format for owner login)
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================
// SUBSCRIPTIONS
// ============================================================
export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  plan: text("plan").notNull(), // ultra | pro | premium
  status: text("status").notNull().default("active"), // active | cancelled | expired
  paymentGateway: text("payment_gateway"), // razorpay | stripe
  paymentId: text("payment_id"),
  amount: integer("amount"), // in cents (USD)
  startDate: text("start_date").notNull().$defaultFn(() => new Date().toISOString()),
  endDate: text("end_date"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  startDate: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// ============================================================
// BOT CONFIGS (per user)
// ============================================================
export const botConfigs = sqliteTable("bot_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  botType: text("bot_type").notNull(), // marketing | data | email | sales | hr
  status: text("status").notNull().default("inactive"), // active | inactive | paused
  config: text("config"), // JSON config
  lastRunAt: text("last_run_at"),
  metrics: text("metrics"), // JSON metrics
});

export const insertBotConfigSchema = createInsertSchema(botConfigs).omit({ id: true });
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfigs.$inferSelect;

// ============================================================
// GENERATED MEDIA
// ============================================================
export const generatedMedia = sqliteTable("generated_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // image | video-storyboard
  prompt: text("prompt").notNull(),
  url: text("url").notNull(), // image URL or JSON array of frame URLs
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type GeneratedMedia = typeof generatedMedia.$inferSelect;

// ============================================================
// SCHEDULED POSTS (Marketing Bot)
// ============================================================
export const scheduledPosts = sqliteTable("scheduled_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled | published | failed
  scheduledFor: text("scheduled_for"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({ id: true, createdAt: true });
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;

// ============================================================
// INVOICES (Finance Bot)
// ============================================================
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  items: text("items").notNull(), // JSON
  subtotal: integer("subtotal").notNull(), // in paise
  gst: integer("gst").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | paid
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
