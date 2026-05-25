// OAuth flows for YouTube (Google), Twitter (X), Facebook/Instagram
// All follow the same pattern as LinkedIn: state-encoded userId, popup callback,
// token exchange, profile fetch, postMessage to parent window.

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { getBaseUrl } from "./config";

// In-memory PKCE verifier store (key = state, value = code_verifier)
// For production, move to Redis or DB. Acceptable for MVP.
const pkceVerifiers = new Map<string, string>();
// Cleanup verifiers older than 15 min
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  pkceVerifiers.forEach((_v, k) => {
    const ts = parseInt(k.split(":")[1] || "0", 10);
    if (ts < cutoff) pkceVerifiers.delete(k);
  });
}, 5 * 60 * 1000);

// ============================================================
// SHARED HELPERS
// ============================================================
function encodeState(userId: number, extra?: string): string {
  return Buffer.from(`${userId}:${Date.now()}:${extra || Math.random().toString(36).slice(2)}`).toString("base64url");
}
function decodeState(state: string): { userId: number; ts: number } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    const [uid, ts] = decoded.split(":");
    return { userId: parseInt(uid, 10), ts: parseInt(ts, 10) };
  } catch { return null; }
}

function popupResultHtml(success: boolean, msg: string, platform: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${platform}</title>
<style>body{font-family:-apple-system,Inter,sans-serif;background:#FDFCF8;color:#1E1650;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px}
.card{max-width:400px;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.icon{width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px}
.ok{background:#D1FAE5;color:#065F46}
.err{background:#FEE2E2;color:#991B1B}
h1{font-size:18px;margin:0 0 8px}
p{color:#666;font-size:14px;margin:0}
</style></head><body><div class="card">
<div class="icon ${success ? "ok" : "err"}">${success ? "\u2713" : "\u2717"}</div>
<h1>${success ? `${platform} Connected` : "Connection Failed"}</h1><p>${msg}</p><p style="margin-top:16px;font-size:12px">You can close this window.</p>
</div><script>setTimeout(() => { if (window.opener) { window.opener.postMessage({ type:"oauth-complete", platform:"${platform.toLowerCase()}", success:${success} }, "*"); } window.close(); }, 1500);</script></body></html>`;
}

// PKCE helpers (Twitter/X)
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ============================================================
// OAuth 1.0a helpers (X/Twitter) — used for media upload on v1.1
// ============================================================
// In-memory request-token store. Acceptable for a single-instance Render
// deploy (process-local); for multi-instance, move to Redis or DB.
const oauth1RequestTokens = new Map<string, { secret: string; userId: number; ts: number }>();
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  oauth1RequestTokens.forEach((v, k) => {
    if (v.ts < cutoff) oauth1RequestTokens.delete(k);
  });
}, 5 * 60 * 1000);

// Resolve OAuth 1.0a credentials with a backwards-compatible fallback.
// Prefer explicit TWITTER_API_KEY / TWITTER_API_SECRET (the standard X
// developer-portal terminology for OAuth 1.0a), but if those are not set
// and the deployer has only supplied TWITTER_CLIENT_ID / _SECRET (the
// existing env names this repo used for OAuth 2.0 PKCE), reuse them —
// for many X apps the same credentials work for both flows.
function twitterOauth1Creds(): { key?: string; secret?: string } {
  return {
    key: process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID,
    secret: process.env.TWITTER_API_SECRET || process.env.TWITTER_CLIENT_SECRET,
  };
}

// RFC 3986 percent-encoding (note: encodeURIComponent skips !*'() — must encode).
function rfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!*'()]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

// Build OAuth 1.0a Authorization header for a given request.
// `params` are extra OAuth params (oauth_callback, oauth_token, oauth_verifier).
// `bodyParams` are application/x-www-form-urlencoded body params that must be
// folded into the signature base string (per RFC 5849 §3.4.1.3).
function buildOauth1Header(opts: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  extraOauth?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyParams?: Record<string, string>;
}): string {
  const { method, url, consumerKey, consumerSecret, token, tokenSecret, extraOauth, queryParams, bodyParams } = opts;
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...(token ? { oauth_token: token } : {}),
    ...(extraOauth || {}),
  };

  // Signature base
  const allParams: Record<string, string> = { ...oauthParams, ...(queryParams || {}), ...(bodyParams || {}) };
  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${rfc3986(k)}=${rfc3986(allParams[k])}`)
    .join("&");

  const baseString = [method.toUpperCase(), rfc3986(url), rfc3986(paramString)].join("&");
  const signingKey = `${rfc3986(consumerSecret)}&${rfc3986(tokenSecret || "")}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const headerStr = Object.keys(headerParams)
    .sort()
    .map(k => `${rfc3986(k)}="${rfc3986(headerParams[k])}"`)
    .join(", ");
  return `OAuth ${headerStr}`;
}

// ============================================================
// REGISTER ALL OAUTH ROUTES
// ============================================================
export function registerOAuthRoutes(app: Express, requireAuth: any) {
  // Use the shared helper so we honor BASE_URL in prod and gracefully
  // fall back to the request origin / localhost in dev.
  const baseUrl = (req?: Request) => getBaseUrl(req);

  // ===================================================================
  // GOOGLE / YOUTUBE
  // ===================================================================
  app.post("/api/social/youtube/oauth-start", requireAuth, (req: Request, res: Response) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ message: "GOOGLE_CLIENT_ID not configured", configured: false });
    }
    const state = encodeState(req.user!.id);
    const redirectUri = `${baseUrl(req)}/api/social/youtube/callback`;
    const scope = "openid email profile https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;
    res.json({ authUrl, configured: true });
  });

  app.get("/api/social/youtube/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query as any;
      if (error) return res.type("html").send(popupResultHtml(false, error_description || error, "YouTube"));
      if (!code) return res.type("html").send(popupResultHtml(false, "No authorization code", "YouTube"));

      const decoded = decodeState(String(state));
      const userId = decoded?.userId || (req.isAuthenticated() ? req.user!.id : undefined);
      if (!userId) return res.type("html").send(popupResultHtml(false, "Session expired", "YouTube"));

      // Token exchange
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${baseUrl(req)}/api/social/youtube/callback`,
          grant_type: "authorization_code",
        }).toString(),
      });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Google token exchange failed:", errText);
        return res.type("html").send(popupResultHtml(false, "Token exchange failed", "YouTube"));
      }
      const tokenData: any = await tokenRes.json();
      const accessToken: string = tokenData.access_token;
      const refreshToken: string | undefined = tokenData.refresh_token;
      const expiresIn: number = tokenData.expires_in || 3600;

      // Fetch YouTube channel info
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!channelRes.ok) {
        return res.type("html").send(popupResultHtml(false, "YouTube channel fetch failed", "YouTube"));
      }
      const channelData: any = await channelRes.json();
      const channel = channelData.items?.[0];
      if (!channel) {
        return res.type("html").send(popupResultHtml(false, "No YouTube channel found on this Google account", "YouTube"));
      }

      await storage.connectSocial({
        userId,
        platform: "youtube",
        accountId: channel.id,
        accountName: channel.snippet.title,
        displayName: channel.snippet.title,
        profilePictureUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || null,
        profileUrl: `https://youtube.com/channel/${channel.id}`,
        accountType: "channel",
        followerCount: parseInt(channel.statistics?.subscriberCount || "0", 10),
        accessToken,
        refreshToken: refreshToken || null,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      res.type("html").send(popupResultHtml(true, `Connected: ${channel.snippet.title}`, "YouTube"));
    } catch (e: any) {
      console.error("YouTube callback error:", e);
      res.type("html").send(popupResultHtml(false, e.message || "Unknown error", "YouTube"));
    }
  });

  // ===================================================================
  // TWITTER / X (OAuth 2.0 with PKCE)
  // ===================================================================
  app.post("/api/social/twitter/oauth-start", requireAuth, (req: Request, res: Response) => {
    if (!process.env.TWITTER_CLIENT_ID) {
      return res.status(400).json({ message: "TWITTER_CLIENT_ID not configured", configured: false });
    }
    const userId = req.user!.id;
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const stateNonce = crypto.randomBytes(16).toString("base64url");
    const state = `${userId}:${Date.now()}:${stateNonce}`;
    pkceVerifiers.set(state, codeVerifier);

    const redirectUri = `${baseUrl(req)}/api/social/twitter/callback`;
    const scope = "tweet.read tweet.write users.read offline.access";
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    res.json({ authUrl, configured: true });
  });

  app.get("/api/social/twitter/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query as any;
      if (error) return res.type("html").send(popupResultHtml(false, error_description || error, "X"));
      if (!code) return res.type("html").send(popupResultHtml(false, "No authorization code", "X"));

      const stateStr = String(state);
      const userId = parseInt(stateStr.split(":")[0], 10);
      if (!userId) return res.type("html").send(popupResultHtml(false, "Invalid state", "X"));

      const codeVerifier = pkceVerifiers.get(stateStr);
      if (!codeVerifier) return res.type("html").send(popupResultHtml(false, "PKCE verifier expired \u2014 retry", "X"));
      pkceVerifiers.delete(stateStr);

      // Token exchange (Basic auth: client_id:client_secret base64)
      const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64");
      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          code: String(code),
          grant_type: "authorization_code",
          client_id: process.env.TWITTER_CLIENT_ID!,
          redirect_uri: `${baseUrl(req)}/api/social/twitter/callback`,
          code_verifier: codeVerifier,
        }).toString(),
      });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Twitter token exchange failed:", errText);
        return res.type("html").send(popupResultHtml(false, "Token exchange failed", "X"));
      }
      const tokenData: any = await tokenRes.json();
      const accessToken: string = tokenData.access_token;
      const refreshToken: string | undefined = tokenData.refresh_token;
      const expiresIn: number = tokenData.expires_in || 7200;

      // Fetch user profile
      const profileRes = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,username,name",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!profileRes.ok) {
        return res.type("html").send(popupResultHtml(false, "Profile fetch failed", "X"));
      }
      const { data }: any = await profileRes.json();

      await storage.connectSocial({
        userId,
        platform: "twitter",
        accountId: data.id,
        accountName: `@${data.username}`,
        displayName: data.name,
        profilePictureUrl: data.profile_image_url?.replace("_normal", "_400x400") || null,
        profileUrl: `https://twitter.com/${data.username}`,
        accountType: "profile",
        followerCount: data.public_metrics?.followers_count,
        accessToken,
        refreshToken: refreshToken || null,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      res.type("html").send(popupResultHtml(true, `Connected: @${data.username}`, "X"));
    } catch (e: any) {
      console.error("Twitter callback error:", e);
      res.type("html").send(popupResultHtml(false, e.message || "Unknown error", "X"));
    }
  });

  // ===================================================================
  // TWITTER / X (OAuth 1.0a three-legged) — required for media upload
  // (image/video) since the v2 PKCE token alone cannot sign v1.1 media
  // endpoints.
  // ===================================================================
  app.post("/api/social/twitter/oauth1-start", requireAuth, async (req: Request, res: Response) => {
    try {
      const { key, secret } = twitterOauth1Creds();
      if (!key || !secret) {
        return res.status(400).json({
          message: "TWITTER_API_KEY / TWITTER_API_SECRET not configured (OAuth 1.0a). You can also reuse TWITTER_CLIENT_ID / _SECRET if they are valid for OAuth 1.0a.",
          configured: false,
        });
      }
      const callbackUrl = `${baseUrl(req)}/api/social/twitter/oauth1/callback`;
      const requestTokenUrl = "https://api.x.com/oauth/request_token";
      const authHeader = buildOauth1Header({
        method: "POST",
        url: requestTokenUrl,
        consumerKey: key,
        consumerSecret: secret,
        extraOauth: { oauth_callback: callbackUrl },
      });
      const r = await fetch(requestTokenUrl, { method: "POST", headers: { Authorization: authHeader } });
      const body = await r.text();
      if (!r.ok) {
        console.error("Twitter OAuth1 request_token failed:", body);
        return res.status(400).json({ message: `Twitter request_token failed: ${body.slice(0, 200)}` });
      }
      const parsed = new URLSearchParams(body);
      const oauthToken = parsed.get("oauth_token");
      const oauthTokenSecret = parsed.get("oauth_token_secret");
      const callbackConfirmed = parsed.get("oauth_callback_confirmed");
      if (!oauthToken || !oauthTokenSecret || callbackConfirmed !== "true") {
        return res.status(400).json({ message: "Twitter request_token returned unexpected payload — check callback URL whitelist in X portal." });
      }
      oauth1RequestTokens.set(oauthToken, { secret: oauthTokenSecret, userId: req.user!.id, ts: Date.now() });
      const authUrl = `https://api.x.com/oauth/authorize?oauth_token=${encodeURIComponent(oauthToken)}`;
      res.json({ authUrl, configured: true });
    } catch (e: any) {
      console.error("Twitter OAuth1 start error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/social/twitter/oauth1/callback", async (req: Request, res: Response) => {
    try {
      const { oauth_token, oauth_verifier, denied } = req.query as any;
      if (denied) return res.type("html").send(popupResultHtml(false, "User denied X authorization", "X"));
      if (!oauth_token || !oauth_verifier) {
        return res.type("html").send(popupResultHtml(false, "Missing oauth_token / oauth_verifier", "X"));
      }
      const pending = oauth1RequestTokens.get(String(oauth_token));
      if (!pending) {
        return res.type("html").send(popupResultHtml(false, "Request token expired — please retry", "X"));
      }
      oauth1RequestTokens.delete(String(oauth_token));
      const { key, secret } = twitterOauth1Creds();
      if (!key || !secret) {
        return res.type("html").send(popupResultHtml(false, "Twitter OAuth 1.0a not configured", "X"));
      }
      // Exchange for access token
      const accessTokenUrl = "https://api.x.com/oauth/access_token";
      const authHeader = buildOauth1Header({
        method: "POST",
        url: accessTokenUrl,
        consumerKey: key,
        consumerSecret: secret,
        token: String(oauth_token),
        tokenSecret: pending.secret,
        extraOauth: { oauth_verifier: String(oauth_verifier) },
      });
      const r = await fetch(accessTokenUrl, { method: "POST", headers: { Authorization: authHeader } });
      const body = await r.text();
      if (!r.ok) {
        console.error("Twitter OAuth1 access_token failed:", body);
        return res.type("html").send(popupResultHtml(false, "Access token exchange failed", "X"));
      }
      const parsed = new URLSearchParams(body);
      const accessToken = parsed.get("oauth_token");
      const accessTokenSecret = parsed.get("oauth_token_secret");
      const screenName = parsed.get("screen_name") || undefined;
      const userIdStr = parsed.get("user_id") || undefined;
      if (!accessToken || !accessTokenSecret) {
        return res.type("html").send(popupResultHtml(false, "Twitter returned no access token", "X"));
      }
      // Merge into existing twitter connection (preserves OAuth 2.0 PKCE
      // fields like accessToken/refreshToken if already present).
      await storage.connectSocial({
        userId: pending.userId,
        platform: "twitter",
        accountId: userIdStr,
        accountName: screenName ? `@${screenName}` : undefined,
        displayName: screenName,
        profileUrl: screenName ? `https://twitter.com/${screenName}` : undefined,
        oauth1Token: accessToken,
        oauth1TokenSecret: accessTokenSecret,
        authVersion: "oauth1",
      });
      res.type("html").send(popupResultHtml(true, `OAuth 1.0a (media) linked${screenName ? `: @${screenName}` : ""}`, "X"));
    } catch (e: any) {
      console.error("Twitter OAuth1 callback error:", e);
      res.type("html").send(popupResultHtml(false, e.message || "Unknown error", "X"));
    }
  });

  // ===================================================================
  // FACEBOOK / INSTAGRAM (unified Graph API flow)
  // Connecting Facebook also fetches Instagram Business accounts linked to it.
  // ===================================================================
  app.post("/api/social/facebook/oauth-start", requireAuth, (req: Request, res: Response) => {
    if (!process.env.FACEBOOK_APP_ID) {
      return res.status(400).json({ message: "FACEBOOK_APP_ID not configured", configured: false });
    }
    const state = encodeState(req.user!.id);
    const redirectUri = `${baseUrl(req)}/api/social/facebook/callback`;
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management,public_profile,email";
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&response_type=code`;
    res.json({ authUrl, configured: true });
  });

  app.get("/api/social/facebook/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query as any;
      if (error) return res.type("html").send(popupResultHtml(false, error_description || error, "Facebook"));
      if (!code) return res.type("html").send(popupResultHtml(false, "No authorization code", "Facebook"));

      const decoded = decodeState(String(state));
      const userId = decoded?.userId || (req.isAuthenticated() ? req.user!.id : undefined);
      if (!userId) return res.type("html").send(popupResultHtml(false, "Session expired", "Facebook"));

      // Token exchange
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(`${baseUrl(req)}/api/social/facebook/callback`)}&code=${encodeURIComponent(String(code))}`;
      const tokenRes = await fetch(tokenUrl);
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Facebook token exchange failed:", errText);
        return res.type("html").send(popupResultHtml(false, "Token exchange failed", "Facebook"));
      }
      const tokenData: any = await tokenRes.json();
      const userToken: string = tokenData.access_token;
      const expiresIn: number = tokenData.expires_in || 5184000;

      // Get user profile
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture.width(400).height(400),email&access_token=${userToken}`);
      const me: any = await meRes.json();

      // Fetch user's Pages (each page has its own page-scoped token + linked IG account)
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture.width(200).height(200),instagram_business_account{id,username,profile_picture_url,followers_count,name}&access_token=${userToken}`);
      const pagesData: any = await pagesRes.json();
      const pages = pagesData.data || [];

      // Save Facebook connection (with user-scoped token to enumerate pages)
      await storage.connectSocial({
        userId,
        platform: "facebook",
        accountId: me.id,
        accountName: me.name,
        displayName: me.name,
        profilePictureUrl: me.picture?.data?.url || null,
        profileUrl: `https://facebook.com/${me.id}`,
        accountType: pages.length > 0 ? "pending" : "profile",
        accessToken: userToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        pages: JSON.stringify(pages.map((p: any) => ({
          id: p.id, name: p.name, type: "page",
          pictureUrl: p.picture?.data?.url,
          accessToken: p.access_token,
        }))),
      });

      // If any pages have linked Instagram accounts, save the first one as a separate connection
      const pagesWithIG = pages.filter((p: any) => p.instagram_business_account);
      if (pagesWithIG.length > 0) {
        const firstIG = pagesWithIG[0];
        const ig = firstIG.instagram_business_account;
        await storage.connectSocial({
          userId,
          platform: "instagram",
          accountId: ig.id,
          accountName: `@${ig.username}`,
          displayName: ig.name || ig.username,
          profilePictureUrl: ig.profile_picture_url || null,
          profileUrl: `https://instagram.com/${ig.username}`,
          accountType: "business",
          followerCount: ig.followers_count,
          accessToken: firstIG.access_token, // page token used to publish
          pageId: firstIG.id, // Facebook Page ID needed for IG publish
          pageName: firstIG.name,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        });
      }

      const igCount = pagesWithIG.length;
      const successMsg = `Connected as ${me.name}. Found ${pages.length} Page${pages.length !== 1 ? "s" : ""}${igCount > 0 ? ` + ${igCount} linked Instagram account${igCount !== 1 ? "s" : ""}` : ""}.`;
      res.type("html").send(popupResultHtml(true, successMsg, "Facebook"));
    } catch (e: any) {
      console.error("Facebook callback error:", e);
      res.type("html").send(popupResultHtml(false, e.message || "Unknown error", "Facebook"));
    }
  });

  // ===================================================================
  // PUBLISHING ENDPOINTS \u2014 the actual sends
  // ===================================================================

  // YouTube: Community Post (text only, requires monetized + 1k+ subs in some regions)
  // For most users, video upload is the primary action \u2014 we'll wire that separately when needed.
  app.post("/api/publish/youtube-community", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text } = req.body as any;
      if (!text) return res.status(400).json({ message: "text required" });
      const conns = await storage.getSocialConnections(req.user!.id);
      const yt = conns.find((c: any) => c.platform === "youtube" && c.status === "connected" && c.accessToken);
      if (!yt?.accessToken) return res.status(400).json({ message: "Connect YouTube first", needsConnect: true });

      // YouTube Community Posts API requires special access \u2014 returning informative message for now
      return res.status(501).json({
        message: "YouTube Community posting is not publicly available via API yet. Connection works \u2014 video upload coming next.",
        connected: true,
        channelName: yt.displayName,
        followerCount: yt.followerCount,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Instagram: post a single image to feed (Instagram Graph API)
  app.post("/api/publish/instagram-post", requireAuth, async (req: Request, res: Response) => {
    try {
      const { imageUrl, caption } = req.body as any;
      if (!imageUrl) return res.status(400).json({ message: "imageUrl required (must be public HTTPS URL)" });

      const conns = await storage.getSocialConnections(req.user!.id);
      const ig = conns.find((c: any) => c.platform === "instagram" && c.status === "connected" && c.accessToken && c.accountId);
      if (!ig?.accessToken) return res.status(400).json({ message: "Connect Instagram first (via Facebook)", needsConnect: true });

      // Step 1: Create media container
      const containerRes = await fetch(`https://graph.facebook.com/v19.0/${ig.accountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image_url: imageUrl,
          caption: caption || "",
          access_token: ig.accessToken,
        }).toString(),
      });
      if (!containerRes.ok) {
        const errText = await containerRes.text();
        return res.status(400).json({ message: `IG container failed: ${errText.slice(0, 200)}` });
      }
      const container: any = await containerRes.json();

      // Step 2: Publish container
      const publishRes = await fetch(`https://graph.facebook.com/v19.0/${ig.accountId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: container.id,
          access_token: ig.accessToken,
        }).toString(),
      });
      if (!publishRes.ok) {
        const errText = await publishRes.text();
        return res.status(400).json({ message: `IG publish failed: ${errText.slice(0, 200)}` });
      }
      const published: any = await publishRes.json();
      res.json({ success: true, mediaId: published.id, message: "Posted to Instagram" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===================================================================
  // TWITTER / X — media upload + publish (with OAuth 1.0a for media)
  // ===================================================================
  // Hard limits per X v1.1 media upload docs.
  const X_MEDIA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;       // 5 MB (photo)
  const X_MEDIA_MAX_GIF_BYTES = 15 * 1024 * 1024;        // 15 MB (gif)
  const X_MEDIA_MAX_VIDEO_BYTES = 512 * 1024 * 1024;     // 512 MB (video)
  const X_MEDIA_DOWNLOAD_TIMEOUT_MS = 60_000;
  const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const ALLOWED_GIF_MIMES = ["image/gif"];
  const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/quicktime"];

  // Basic SSRF guard: only http(s), reject obvious private/local hosts.
  function isUnsafeUrl(url: string): string | null {
    let u: URL;
    try { u = new URL(url); } catch { return "Invalid URL"; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return "Only http/https URLs are allowed";
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host === "::1") return "Local hosts are not allowed";
    // Reject obvious IPv4 private ranges (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16)
    const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (m) {
      const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
      if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) {
        return "Private IP addresses are not allowed";
      }
    }
    return null;
  }

  async function downloadMedia(url: string, maxBytes: number): Promise<{ buffer: Buffer; contentType: string }> {
    const unsafe = isUnsafeUrl(url);
    if (unsafe) throw new Error(unsafe);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), X_MEDIA_DOWNLOAD_TIMEOUT_MS);
    try {
      const r = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
      if (!r.ok) throw new Error(`Media fetch failed: HTTP ${r.status}`);
      const lenHeader = r.headers.get("content-length");
      if (lenHeader && parseInt(lenHeader, 10) > maxBytes) {
        throw new Error(`Media too large: ${lenHeader} bytes > ${maxBytes}`);
      }
      const contentType = (r.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
      const ab = await r.arrayBuffer();
      const buffer = Buffer.from(ab);
      if (buffer.length > maxBytes) throw new Error(`Media too large: ${buffer.length} bytes > ${maxBytes}`);
      return { buffer, contentType };
    } finally {
      clearTimeout(t);
    }
  }

  // Multipart/form-data builder for X v1.1 media/upload.json (INIT/APPEND/FINALIZE/STATUS).
  function buildMultipart(fields: Record<string, string | { value: Buffer; filename: string; contentType: string }>): { body: Buffer; contentType: string } {
    const boundary = "----twboundary" + crypto.randomBytes(12).toString("hex");
    const chunks: Buffer[] = [];
    for (const [name, val] of Object.entries(fields)) {
      chunks.push(Buffer.from(`--${boundary}\r\n`));
      if (typeof val === "string") {
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`));
      } else {
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"; filename="${val.filename}"\r\nContent-Type: ${val.contentType}\r\n\r\n`));
        chunks.push(val.value);
        chunks.push(Buffer.from("\r\n"));
      }
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
  }

  // Upload media to X via the legacy v1.1 chunked upload (INIT/APPEND/FINALIZE).
  // The v1.1 endpoint remains the most reliable cross-account path and accepts
  // images, GIFs and videos. Requires OAuth 1.0a user-context auth — that is
  // why this whole feature exists.
  async function xUploadMedia(opts: {
    consumerKey: string;
    consumerSecret: string;
    oauth1Token: string;
    oauth1TokenSecret: string;
    buffer: Buffer;
    contentType: string;
    mediaCategory: "tweet_image" | "tweet_gif" | "tweet_video";
  }): Promise<string> {
    const { consumerKey, consumerSecret, oauth1Token, oauth1TokenSecret, buffer, contentType, mediaCategory } = opts;
    const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";

    const signedHeader = (bodyParams: Record<string, string>) => buildOauth1Header({
      method: "POST",
      url: uploadUrl,
      consumerKey, consumerSecret,
      token: oauth1Token, tokenSecret: oauth1TokenSecret,
      bodyParams,
    });

    // INIT
    const initBody = new URLSearchParams({
      command: "INIT",
      total_bytes: String(buffer.length),
      media_type: contentType,
      media_category: mediaCategory,
    });
    const initRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: signedHeader(Object.fromEntries(initBody.entries())),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: initBody.toString(),
    });
    if (!initRes.ok) throw new Error(`X media INIT failed: ${(await initRes.text()).slice(0, 200)}`);
    const init = await initRes.json() as any;
    const mediaId: string = init.media_id_string;
    if (!mediaId) throw new Error("X media INIT returned no media_id_string");

    // APPEND — 4MB chunks
    const chunkSize = 4 * 1024 * 1024;
    let segment = 0;
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
      // For multipart APPEND, the body params are excluded from the signature
      // (RFC 5849 only folds in application/x-www-form-urlencoded bodies).
      const { body, contentType: mpType } = buildMultipart({
        command: "APPEND",
        media_id: mediaId,
        segment_index: String(segment),
        media: { value: chunk, filename: "chunk.bin", contentType: "application/octet-stream" },
      });
      const appendHeader = buildOauth1Header({
        method: "POST",
        url: uploadUrl,
        consumerKey, consumerSecret,
        token: oauth1Token, tokenSecret: oauth1TokenSecret,
      });
      const appendRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: appendHeader, "Content-Type": mpType },
        body,
      });
      if (!appendRes.ok && appendRes.status !== 204) {
        throw new Error(`X media APPEND seg ${segment} failed: ${(await appendRes.text()).slice(0, 200)}`);
      }
      segment++;
    }

    // FINALIZE
    const finBody = new URLSearchParams({ command: "FINALIZE", media_id: mediaId });
    const finRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: signedHeader(Object.fromEntries(finBody.entries())),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: finBody.toString(),
    });
    if (!finRes.ok) throw new Error(`X media FINALIZE failed: ${(await finRes.text()).slice(0, 200)}`);
    const fin: any = await finRes.json();

    // STATUS polling if async processing required (mostly for video)
    if (fin.processing_info) {
      let info = fin.processing_info;
      while (info && (info.state === "pending" || info.state === "in_progress")) {
        await new Promise(r => setTimeout(r, Math.max(1000, (info.check_after_secs || 1) * 1000)));
        const statusHeader = buildOauth1Header({
          method: "GET",
          url: uploadUrl,
          consumerKey, consumerSecret,
          token: oauth1Token, tokenSecret: oauth1TokenSecret,
          queryParams: { command: "STATUS", media_id: mediaId },
        });
        const statusRes = await fetch(`${uploadUrl}?command=STATUS&media_id=${mediaId}`, {
          headers: { Authorization: statusHeader },
        });
        if (!statusRes.ok) throw new Error(`X media STATUS failed: ${(await statusRes.text()).slice(0, 200)}`);
        const sj: any = await statusRes.json();
        info = sj.processing_info;
        if (info?.state === "failed") {
          throw new Error(`X video processing failed: ${info.error?.message || "unknown"}`);
        }
      }
    }
    return mediaId;
  }

  // Publish a tweet with optional media (images and/or video) by URL.
  // Media is uploaded via OAuth 1.0a v1.1, then the resulting media_id is
  // attached to a POST /2/tweets call signed with the OAuth 2.0 bearer.
  app.post("/api/publish/twitter-with-media", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, imageUrls, videoUrl, mediaIds: providedMediaIds } = req.body as {
        text?: string;
        imageUrls?: string[];
        videoUrl?: string;
        mediaIds?: string[];
      };

      if (!text && !imageUrls?.length && !videoUrl && !providedMediaIds?.length) {
        return res.status(400).json({ message: "Provide text and/or imageUrls/videoUrl/mediaIds" });
      }

      const conns = await storage.getSocialConnections(req.user!.id);
      const tw: any = conns.find((c: any) => c.platform === "twitter" && c.status === "connected");
      if (!tw) return res.status(400).json({ message: "Connect X first", needsConnect: true });
      if (!tw.accessToken) {
        return res.status(400).json({ message: "OAuth 2.0 X token missing — reconnect X (PKCE) to publish tweets.", needsConnect: true, authVersion: "oauth2_pkce" });
      }

      let mediaIds: string[] = providedMediaIds ? [...providedMediaIds] : [];
      const wantsUpload = (imageUrls && imageUrls.length > 0) || !!videoUrl;
      if (wantsUpload) {
        const { key, secret } = twitterOauth1Creds();
        if (!key || !secret) {
          return res.status(400).json({
            message: "Media upload needs OAuth 1.0a credentials. Set TWITTER_API_KEY and TWITTER_API_SECRET.",
            needsConfig: true,
          });
        }
        if (!tw.oauth1Token || !tw.oauth1TokenSecret) {
          return res.status(400).json({
            message: "Media upload needs OAuth 1.0a connection. Call /api/social/twitter/oauth1-start to link X for media.",
            needsConnect: true,
            authVersion: "oauth1",
          });
        }

        // Upload images
        for (const url of (imageUrls || []).slice(0, 4)) {  // tweet allows up to 4 images
          const { buffer, contentType } = await downloadMedia(url, X_MEDIA_MAX_IMAGE_BYTES);
          let category: "tweet_image" | "tweet_gif" = "tweet_image";
          let maxBytes = X_MEDIA_MAX_IMAGE_BYTES;
          if (ALLOWED_GIF_MIMES.includes(contentType)) { category = "tweet_gif"; maxBytes = X_MEDIA_MAX_GIF_BYTES; }
          else if (!ALLOWED_IMAGE_MIMES.includes(contentType)) {
            return res.status(400).json({ message: `Unsupported image type: ${contentType}` });
          }
          if (buffer.length > maxBytes) return res.status(400).json({ message: `Image too large (${buffer.length} bytes)` });
          const mediaId = await xUploadMedia({
            consumerKey: key, consumerSecret: secret,
            oauth1Token: tw.oauth1Token, oauth1TokenSecret: tw.oauth1TokenSecret,
            buffer, contentType, mediaCategory: category,
          });
          mediaIds.push(mediaId);
        }
        // Upload video (one only; X does not mix video + images in same tweet)
        if (videoUrl) {
          const { buffer, contentType } = await downloadMedia(videoUrl, X_MEDIA_MAX_VIDEO_BYTES);
          if (!ALLOWED_VIDEO_MIMES.includes(contentType)) {
            return res.status(400).json({ message: `Unsupported video type: ${contentType}` });
          }
          const mediaId = await xUploadMedia({
            consumerKey: key, consumerSecret: secret,
            oauth1Token: tw.oauth1Token, oauth1TokenSecret: tw.oauth1TokenSecret,
            buffer, contentType, mediaCategory: "tweet_video",
          });
          mediaIds = [mediaId]; // video must be solo
        }
      }

      // Compose the tweet via OAuth 2.0 bearer (works fine with media_ids attached).
      const body: any = { text: text || "" };
      if (mediaIds.length > 0) body.media = { media_ids: mediaIds };
      const r = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tw.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(r.status).json({ message: `Tweet publish failed: ${errText.slice(0, 300)}`, mediaIds });
      }
      const data: any = await r.json();
      res.json({ success: true, tweetId: data.data?.id, mediaIds, url: `https://twitter.com/i/web/status/${data.data?.id}` });
    } catch (e: any) {
      console.error("twitter-with-media error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Facebook Page post
  app.post("/api/publish/facebook-page", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, link, pageId } = req.body as any;
      if (!text) return res.status(400).json({ message: "text required" });

      const conns = await storage.getSocialConnections(req.user!.id);
      const fb = conns.find((c: any) => c.platform === "facebook" && c.status === "connected");
      if (!fb) return res.status(400).json({ message: "Connect Facebook first", needsConnect: true });

      const pages = fb.pages ? JSON.parse(fb.pages) : [];
      const targetPage = pageId ? pages.find((p: any) => p.id === pageId) : pages[0];
      if (!targetPage?.accessToken) return res.status(400).json({ message: "No Facebook Page found on this account" });

      const body: any = { message: text, access_token: targetPage.accessToken };
      if (link) body.link = link;

      const postRes = await fetch(`https://graph.facebook.com/v19.0/${targetPage.id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });
      if (!postRes.ok) {
        const errText = await postRes.text();
        return res.status(400).json({ message: `FB post failed: ${errText.slice(0, 200)}` });
      }
      const posted: any = await postRes.json();
      res.json({ success: true, postId: posted.id, url: `https://facebook.com/${posted.id}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}
