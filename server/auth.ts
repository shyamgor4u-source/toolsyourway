import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      role: string;
      plan: string | null;
      avatarUrl: string | null;
      authProvider: string;
      createdAt: string;
    }
  }
}

export function setupAuth(app: any) {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      const { password, authProviderId, ...safeUser } = user;
      done(null, safeUser as Express.User);
    } catch (err) {
      done(err);
    }
  });

  // LOCAL STRATEGY
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) return done(null, false, { message: "No account found with that email" });
          if (!user.password) return done(null, false, { message: "This account uses social login. Try Google or Outlook." });
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return done(null, false, { message: "Incorrect password" });
          const { password: _, authProviderId, ...safeUser } = user;
          return done(null, safeUser as Express.User);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // GOOGLE OAUTH
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByProvider("google", profile.id);
            if (!user) {
              const email = profile.emails?.[0]?.value ?? "";
              const existingByEmail = await storage.getUserByEmail(email);
              if (existingByEmail) {
                await storage.updateUser(existingByEmail.id, {
                  authProvider: "google",
                  authProviderId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                });
                user = await storage.getUser(existingByEmail.id);
              } else {
                user = await storage.createUser({
                  email,
                  name: profile.displayName || email.split("@")[0],
                  authProvider: "google",
                  authProviderId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                  role: "user",
                  plan: "none",
                });
              }
            }
            if (!user) return done(null, false);
            const { password, authProviderId, ...safeUser } = user;
            return done(null, safeUser as Express.User);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get("/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/#/auth?error=google_failed" }),
      (_req: any, res: any) => res.redirect("/#/dashboard")
    );
  }

  // MICROSOFT / OUTLOOK OAUTH
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    const msClientId = process.env.MICROSOFT_CLIENT_ID;
    const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const msRedirectUri = process.env.MICROSOFT_REDIRECT_URI || "/api/auth/microsoft/callback";
    const msTenant = "common";

    app.get("/api/auth/microsoft", (_req: any, res: any) => {
      const authUrl = `https://login.microsoftonline.com/${msTenant}/oauth2/v2.0/authorize?`
        + `client_id=${msClientId}&response_type=code&redirect_uri=${encodeURIComponent(msRedirectUri)}`
        + `&scope=${encodeURIComponent("openid profile email User.Read")}&response_mode=query`;
      res.redirect(authUrl);
    });

    app.get("/api/auth/microsoft/callback", async (req: any, res: any) => {
      try {
        const code = req.query.code;
        if (!code) return res.redirect("/#/auth?error=microsoft_failed");

        const tokenRes = await fetch(`https://login.microsoftonline.com/${msTenant}/oauth2/v2.0/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: msClientId,
            client_secret: msClientSecret,
            code: code as string,
            redirect_uri: msRedirectUri,
            grant_type: "authorization_code",
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) return res.redirect("/#/auth?error=microsoft_failed");

        const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();
        const email = profile.mail || profile.userPrincipalName || "";
        const msId = profile.id;
        const name = profile.displayName || email.split("@")[0];

        let user = await storage.getUserByProvider("microsoft", msId);
        if (!user) {
          const existingByEmail = await storage.getUserByEmail(email);
          if (existingByEmail) {
            await storage.updateUser(existingByEmail.id, { authProvider: "microsoft", authProviderId: msId });
            user = await storage.getUser(existingByEmail.id);
          } else {
            user = await storage.createUser({
              email, name, authProvider: "microsoft", authProviderId: msId,
              role: "user", plan: "none",
            });
          }
        }
        if (!user) return res.redirect("/#/auth?error=microsoft_failed");

        req.login(user, (err: any) => {
          if (err) return res.redirect("/#/auth?error=microsoft_failed");
          res.redirect("/#/dashboard");
        });
      } catch (err) {
        console.error("Microsoft OAuth error:", err);
        res.redirect("/#/auth?error=microsoft_failed");
      }
    });
  }

  app.use(passport.initialize());
  app.use(passport.session());
}
