import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";
import { setupAuth } from "./auth";

const MemoryStore = createMemoryStore(session);

// Middleware: require authenticated user
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
}

// Middleware: require admin role
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === "admin") return next();
  res.status(403).json({ message: "Admin access required" });
}

export async function registerRoutes(server: Server, app: Express) {
  // ============================================================
  // SESSION + AUTH SETUP
  // ============================================================
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "toolsyourway-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  setupAuth(app);

  // Seed admin account
  await storage.seedAdmin();

  // ============================================================
  // AUTH ROUTES
  // ============================================================

  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, name, password } = parsed.data;

      const existing = storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = storage.createUser({
        email,
        name,
        password: hashedPassword,
        authProvider: "email",
        role: "user",
        plan: "none",
      });

      const { password: _, authProviderId, ...safeUser } = user;

      req.login(safeUser as Express.User, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        return res.status(201).json(safeUser);
      });
    } catch (err) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(user);
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  // Current user
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });

  // Check which OAuth providers are configured
  app.get("/api/auth/providers", (_req: Request, res: Response) => {
    res.json({
      google: !!process.env.GOOGLE_CLIENT_ID,
      microsoft: !!process.env.MICROSOFT_CLIENT_ID,
    });
  });

  // ============================================================
  // USER ROUTES
  // ============================================================

  // Dashboard data
  app.get("/api/user/dashboard", requireAuth, (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscription = storage.getActiveSubscription(userId);
    const bots = storage.getBotConfigs(userId);

    // If user has a plan but no bots yet, seed default bot configs
    if (bots.length === 0 && req.user!.plan && req.user!.plan !== "none") {
      const defaultBots = ["marketing", "data", "email", "sales", "hr"];
      const maxBots = req.user!.plan === "ultra" ? 3 : 5;
      defaultBots.slice(0, maxBots).forEach((botType) => {
        storage.upsertBotConfig({
          userId,
          botType,
          status: "inactive",
          config: JSON.stringify({}),
          metrics: JSON.stringify({ tasks: 0, successRate: 0 }),
        });
      });
    }

    const freshBots = storage.getBotConfigs(userId);
    res.json({
      user: req.user,
      subscription,
      bots: freshBots,
    });
  });

  // Toggle bot status
  app.post("/api/user/bots/:botType/toggle", requireAuth, (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { botType } = req.params;
    const bots = storage.getBotConfigs(userId);
    const bot = bots.find((b) => b.botType === botType);
    if (!bot) return res.status(404).json({ message: "Bot not found" });

    const newStatus = bot.status === "active" ? "inactive" : "active";
    const updated = storage.upsertBotConfig({
      userId,
      botType,
      status: newStatus,
      lastRunAt: newStatus === "active" ? new Date().toISOString() : bot.lastRunAt,
      config: bot.config,
      metrics: bot.metrics,
    });
    res.json(updated);
  });

  // ============================================================
  // ADMIN ROUTES
  // ============================================================
  app.get("/api/admin/stats", requireAdmin, (_req: Request, res: Response) => {
    const userCount = storage.getUserCount();
    const { totalRevenue, activeCount, planBreakdown } = storage.getRevenueStats();
    res.json({ userCount, totalRevenue, activeSubscriptions: activeCount, planBreakdown });
  });

  app.get("/api/admin/users", requireAdmin, (_req: Request, res: Response) => {
    const allUsers = storage.getAllUsers().map(({ password, authProviderId, ...u }) => u);
    res.json(allUsers);
  });

  app.get("/api/admin/subscriptions", requireAdmin, (_req: Request, res: Response) => {
    res.json(storage.getAllSubscriptions());
  });
}
