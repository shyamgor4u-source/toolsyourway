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
  password: text("password"),
  authProvider: text("auth_provider").notNull().default("email"),
  authProviderId: text("auth_provider_id"),
  role: text("role").notNull().default("user"), // user | admin
  plan: text("plan").default("none"), // none | individual | bundle | custom
  userType: text("user_type").default("business"), // business | influencer
  selectedBots: text("selected_bots"), // JSON array of bot keys user purchased
  hasAiManager: integer("has_ai_manager").default(0), // 0 or 1
  avatarUrl: text("avatar_url"),
  // Free Trial fields
  trialStartedAt: text("trial_started_at"), // ISO timestamp
  trialEndsAt: text("trial_ends_at"), // ISO timestamp — null = no trial (e.g. admin)
  trialStatus: text("trial_status").default("active"), // active | expired | converted | none
  hasUsedResumeTrial: integer("has_used_resume_trial").default(0), // 0 or 1 — one-time resume allowed
  // PAYG credits (for overages beyond plan caps)
  paygCredits: integer("payg_credits").default(0), // credits available
  videoUsageCount: integer("video_usage_count").default(0), // monthly video generation count
  imageUsageCount: integer("image_usage_count").default(0), // monthly image generation count
  usageResetAt: text("usage_reset_at"), // ISO timestamp — next monthly reset
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
// SOCIAL CONNECTIONS (Marketing Bot integrations)
// ============================================================
export const socialConnections = sqliteTable("social_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // linkedin | instagram | tiktok | facebook | twitter
  accountName: text("account_name"), // display name or handle
  accountId: text("account_id"), // platform user ID
  accountType: text("account_type").default("profile"), // profile | page | group
  pageId: text("page_id"), // selected page/company ID (for LinkedIn/Facebook)
  pageName: text("page_name"), // selected page name
  pages: text("pages"), // JSON array of available pages [{id, name, type}]
  profilePictureUrl: text("profile_picture_url"), // URL to avatar/profile image
  displayName: text("display_name"), // Human-readable name (e.g. "Shyam Gor" vs handle)
  profileUrl: text("profile_url"), // Public URL to profile
  followerCount: integer("follower_count"), // Latest known follower count
  accessToken: text("access_token"), // encrypted in production
  refreshToken: text("refresh_token"),
  status: text("status").notNull().default("connected"), // connected | expired | disconnected
  connectedAt: text("connected_at").notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text("expires_at"),
});

export type SocialConnection = typeof socialConnections.$inferSelect;

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

// ============================================================
// PAYG CREDIT PURCHASES
// ============================================================
export const creditPurchases = sqliteTable("credit_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  pack: text("pack").notNull(), // small | medium | large
  credits: integer("credits").notNull(),
  amount: integer("amount").notNull(), // cents
  paymentGateway: text("payment_gateway"),
  paymentId: text("payment_id"),
  status: text("status").notNull().default("pending"), // pending | completed | failed
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type CreditPurchase = typeof creditPurchases.$inferSelect;

// ============================================================
// OUTREACH: PROSPECTS + CAMPAIGNS
// ============================================================
export const prospects = sqliteTable("prospects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  source: text("source").default("manual"), // manual | csv | apollo | linkedin
  // Identity
  name: text("name"),
  email: text("email"),
  company: text("company"),
  title: text("title"),
  location: text("location"),
  // Platform handles
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  instagramHandle: text("instagram_handle"),
  tiktokHandle: text("tiktok_handle"),
  youtubeChannel: text("youtube_channel"),
  // Enrichment
  profilePictureUrl: text("profile_picture_url"),
  bio: text("bio"),
  followerCount: integer("follower_count"),
  engagementRate: text("engagement_rate"), // stored as string "4.2%"
  tags: text("tags"), // JSON array ["warm", "VC", "fintech"]
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertProspectSchema = createInsertSchema(prospects).omit({ id: true, createdAt: true });
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospects.$inferSelect;

export const outreachCampaigns = sqliteTable("outreach_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // linkedin | twitter | instagram | email | tiktok
  goal: text("goal"), // intro | partnership | sponsorship | investment | sales
  tone: text("tone").default("professional"), // professional | casual | enthusiastic
  status: text("status").notNull().default("draft"), // draft | ready | running | completed | paused
  messageTemplate: text("message_template"), // with {{name}}, {{company}}, {{hook}} placeholders
  prospectIds: text("prospect_ids"), // JSON array of prospect IDs
  sentCount: integer("sent_count").default(0),
  repliedCount: integer("replied_count").default(0),
  scheduledFor: text("scheduled_for"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertCampaignSchema = createInsertSchema(outreachCampaigns).omit({ id: true, createdAt: true, sentCount: true, repliedCount: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof outreachCampaigns.$inferSelect;

export const outreachMessages = sqliteTable("outreach_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  campaignId: integer("campaign_id").references(() => outreachCampaigns.id),
  prospectId: integer("prospect_id").references(() => prospects.id),
  platform: text("platform").notNull(),
  draftMessage: text("draft_message"), // AI-drafted text
  finalMessage: text("final_message"), // after user edit
  status: text("status").notNull().default("draft"), // draft | approved | sent | failed | replied
  sentAt: text("sent_at"),
  repliedAt: text("replied_at"),
  reply: text("reply"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type OutreachMessage = typeof outreachMessages.$inferSelect;
