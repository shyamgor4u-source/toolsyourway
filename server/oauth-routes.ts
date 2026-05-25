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
