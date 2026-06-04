# Instagram (Meta Graph API) Setup Guide

This guide walks through connecting Instagram so ToolsYourWay users can publish
approved content directly to their Instagram feed.

Instagram publishing goes through the **Meta Graph API**, not a standalone
"Instagram API". This means:

- The user's Instagram account **must be a Business or Creator account**.
- That Instagram account **must be linked to a Facebook Page**.
- Your app uses the same Meta app credentials as Facebook publishing.

## Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click **Create App** → choose the **Business** type
3. Name it `ToolsYourWay` and create the app
4. From the dashboard, add these **Products**:
   - **Facebook Login**
   - **Instagram Graph API**

## Step 2: Configure OAuth Redirect URIs

Under **Facebook Login → Settings → Valid OAuth Redirect URIs**, add:

- **Instagram (production):** `https://www.toolsyourway.com/api/social/instagram/oauth/callback`
- **Instagram (local dev):** `http://localhost:5000/api/social/instagram/oauth/callback`
- **Facebook (production):** `https://www.toolsyourway.com/api/social/facebook/callback`
- **Facebook (local dev):** `http://localhost:5000/api/social/facebook/callback`

Save the changes.

## Step 3: Request Permissions (App Review)

In **App Review → Permissions and Features**, request:

| Permission | Why |
| --- | --- |
| `instagram_basic` | Read the linked IG account profile |
| `instagram_content_publish` | Create and publish media containers |
| `pages_show_list` | Enumerate the user's Facebook Pages |
| `pages_read_engagement` | Read Page → linked IG account metadata |
| `business_management` | Resolve Business-owned Pages/IG accounts |

While the app is in **Development mode**, only users with a role on the app
(admins/developers/testers) can connect — that is enough for testing.
Production use for arbitrary users requires Meta App Review and **Advanced
Access** for the permissions above.

## Step 4: Set Environment Variables

Set these on Render (or in your local `.env`):

```
FACEBOOK_APP_ID=<your Meta app id>
FACEBOOK_APP_SECRET=<your Meta app secret>
BASE_URL=https://www.toolsyourway.com   # canonical origin (no trailing slash)
```

`META_APP_ID` / `META_APP_SECRET` are accepted as aliases if you prefer that
naming. `BASE_URL` is what the callback URL is built from — never let it fall
back to localhost in production.

## Step 5: Connect from the App

1. Open a Marketing Bot → **Channels / Integrations**
2. Click **Connect** on the Instagram card
3. A popup opens the Meta login dialog; approve the requested permissions
4. The callback enumerates every Facebook Page → linked IG account and stores
   each one. If you manage multiple IG accounts, the first becomes active and
   you can switch with the account-selection endpoint.

## API Reference

### OAuth

- `POST /api/social/instagram/oauth-start` → `{ authUrl, configured }`
  Returns the Meta login URL (with a signed `state`).
- `GET /api/social/instagram/oauth/callback`
  Exchanges the code for a token, upgrades it to a long-lived token, fetches
  Pages + linked IG accounts, and stores them. Renders a popup result page that
  `postMessage`s `{ type: "oauth-complete", platform: "instagram", success }`
  to the opener.
- `POST /api/social/instagram/select-account` `{ accountId }`
  Switches the active Instagram account when multiple are linked.

### Publishing — `POST /api/publish/instagram-post`

The asset URL(s) must be **publicly reachable HTTPS URLs**, because Meta fetches
the media server-side. Private/internal/localhost URLs are rejected with an
actionable error.

| Body | Result |
| --- | --- |
| `{ imageUrl, caption }` | Single image feed post |
| `{ imageUrls: [url, url, …], caption }` | Carousel (2–10 images) |
| `{ videoUrl, caption }` | Reel (`media_type=REELS`), with status polling |

Response: `{ success, mediaId, type, message }`.

## Limitations

- Only **Business/Creator** IG accounts linked to a Facebook Page can publish.
- Media must be hosted at a **public HTTPS URL** Meta can fetch. If your app
  serves generated media from private/internal storage, expose it publicly
  first (or via a signed public CDN URL) before publishing.
- Reels/video processing is asynchronous; the endpoint polls the container
  until `FINISHED` (up to ~90s) before publishing. Very large/slow assets may
  time out and return a clear error.
- Instagram Stories are **not** supported by this endpoint.
- Meta enforces a publishing rate limit (25 posts per IG account per 24h).
