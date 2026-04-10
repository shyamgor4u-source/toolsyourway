import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Extend express types
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
  // Session serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: number, done) => {
    const user = storage.getUser(id);
    if (!user) return done(null, false);
    // Strip password before passing to request
    const { password, authProviderId, ...safeUser } = user;
    done(null, safeUser as Express.User);
  });

  // ============================
  // LOCAL STRATEGY (email + password)
  // ============================
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = storage.getUserByEmail(email);
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

  // ============================
  // GOOGLE OAUTH STRATEGY
  // ============================
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
            let user = storage.getUserByProvider("google", profile.id);
            if (!user) {
              // Check if email already exists
              const email = profile.emails?.[0]?.value ?? "";
              const existingByEmail = storage.getUserByEmail(email);
              if (existingByEmail) {
                // Link Google to existing account
                storage.updateUser(existingByEmail.id, {
                  authProvider: "google",
                  authProviderId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                });
                user = storage.getUser(existingByEmail.id);
              } else {
                user = storage.createUser({
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

    // Google OAuth routes
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/#/auth?error=google_failed" }),
      (_req: any, res: any) => res.redirect("/#/dashboard")
    );
  }

  // ============================
  // MICROSOFT / OUTLOOK OAUTH
  // (Using manual OAuth2 flow — no extra passport strategy needed)
  // ============================
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    const msClientId = process.env.MICROSOFT_CLIENT_ID;
    const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const msRedirectUri = process.env.MICROSOFT_REDIRECT_URI || "/api/auth/microsoft/callback";
    const msTenant = "common"; // supports personal + work accounts

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

        // Exchange code for token
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

        // Get user profile
        const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();
        const email = profile.mail || profile.userPrincipalName || "";
        const msId = profile.id;
        const name = profile.displayName || email.split("@")[0];

        let user = storage.getUserByProvider("microsoft", msId);
        if (!user) {
          const existingByEmail = storage.getUserByEmail(email);
          if (existingByEmail) {
            storage.updateUser(existingByEmail.id, {
              authProvider: "microsoft",
              authProviderId: msId,
            });
            user = storage.getUser(existingByEmail.id);
          } else {
            user = storage.createUser({
              email,
              name,
              authProvider: "microsoft",
              authProviderId: msId,
              role: "user",
              plan: "none",
            });
          }
        }
        if (!user) return res.redirect("/#/auth?error=microsoft_failed");

        // Log in
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
