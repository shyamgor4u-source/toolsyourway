import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, count, sql } from "drizzle-orm";
import {
  users, subscriptions, botConfigs,
  type User, type InsertUser,
  type Subscription, type InsertSubscription,
  type BotConfig, type InsertBotConfig,
} from "@shared/schema";
import bcrypt from "bcryptjs";

const sqlite = new Database("toolsyourway.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// ============================================================
// STORAGE INTERFACE
// ============================================================
export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByEmail(email: string): User | undefined;
  getUserByProvider(provider: string, providerId: string): User | undefined;
  createUser(data: InsertUser): User;
  updateUser(id: number, data: Partial<InsertUser>): User | undefined;
  getAllUsers(): User[];
  getUserCount(): number;

  // Subscriptions
  getSubscription(id: number): Subscription | undefined;
  getActiveSubscription(userId: number): Subscription | undefined;
  createSubscription(data: InsertSubscription): Subscription;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Subscription | undefined;
  getAllSubscriptions(): Subscription[];
  getRevenueStats(): { totalRevenue: number; activeCount: number; planBreakdown: Record<string, number> };

  // Bot configs
  getBotConfigs(userId: number): BotConfig[];
  upsertBotConfig(data: InsertBotConfig): BotConfig;

  // Seed admin
  seedAdmin(): void;
}

export class DatabaseStorage implements IStorage {
  // ---- USERS ----
  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  }

  getUserByProvider(provider: string, providerId: string): User | undefined {
    return db
      .select().from(users)
      .where(sql`${users.authProvider} = ${provider} AND ${users.authProviderId} = ${providerId}`)
      .get();
  }

  createUser(data: InsertUser): User {
    return db.insert(users).values({
      ...data,
      email: data.email.toLowerCase(),
    }).returning().get();
  }

  updateUser(id: number, data: Partial<InsertUser>): User | undefined {
    return db.update(users).set(data).where(eq(users.id, id)).returning().get();
  }

  getAllUsers(): User[] {
    return db.select().from(users).orderBy(desc(users.id)).all();
  }

  getUserCount(): number {
    const result = db.select({ count: count() }).from(users).get();
    return result?.count ?? 0;
  }

  // ---- SUBSCRIPTIONS ----
  getSubscription(id: number): Subscription | undefined {
    return db.select().from(subscriptions).where(eq(subscriptions.id, id)).get();
  }

  getActiveSubscription(userId: number): Subscription | undefined {
    return db
      .select().from(subscriptions)
      .where(sql`${subscriptions.userId} = ${userId} AND ${subscriptions.status} = 'active'`)
      .get();
  }

  createSubscription(data: InsertSubscription): Subscription {
    // Also update user plan
    db.update(users).set({ plan: data.plan }).where(eq(users.id, data.userId)).run();
    return db.insert(subscriptions).values(data).returning().get();
  }

  updateSubscription(id: number, data: Partial<InsertSubscription>): Subscription | undefined {
    return db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning().get();
  }

  getAllSubscriptions(): Subscription[] {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.id)).all();
  }

  getRevenueStats() {
    const allSubs = db.select().from(subscriptions).where(eq(subscriptions.status, "active")).all();
    let totalRevenue = 0;
    const planBreakdown: Record<string, number> = {};
    for (const sub of allSubs) {
      totalRevenue += sub.amount ?? 0;
      planBreakdown[sub.plan] = (planBreakdown[sub.plan] ?? 0) + 1;
    }
    return { totalRevenue, activeCount: allSubs.length, planBreakdown };
  }

  // ---- BOT CONFIGS ----
  getBotConfigs(userId: number): BotConfig[] {
    return db.select().from(botConfigs).where(eq(botConfigs.userId, userId)).all();
  }

  upsertBotConfig(data: InsertBotConfig): BotConfig {
    const existing = db.select().from(botConfigs)
      .where(sql`${botConfigs.userId} = ${data.userId} AND ${botConfigs.botType} = ${data.botType}`)
      .get();
    if (existing) {
      return db.update(botConfigs).set(data).where(eq(botConfigs.id, existing.id)).returning().get();
    }
    return db.insert(botConfigs).values(data).returning().get();
  }

  // ---- SEED ADMIN ----
  async seedAdmin() {
    const existing = this.getUserByEmail("admin@tw");
    if (!existing) {
      const hashedPassword = await bcrypt.hash("admin@1234", 10);
      this.createUser({
        email: "admin@tw",
        name: "Admin (Owner)",
        password: hashedPassword,
        authProvider: "email",
        role: "admin",
        plan: "premium",
      });
      console.log("✅ Admin user seeded: admin@tw");
    }
  }
}

export const storage = new DatabaseStorage();
