# OAuth Setup — All 4 Platforms

Complete walkthrough to connect LinkedIn, YouTube, Instagram (via Facebook), and X (Twitter).

After setup, your users can connect their social accounts via OAuth and ToolsYourWay can post on their behalf using your authenticated session — fully ToS-compliant.

---

## Prerequisites

You need:
- Production domain set up: `https://toolsyourway.com`
- Render env vars dashboard access
- Privacy Policy URL: `https://toolsyourway.com/#/privacy` (already live)
- Terms of Use URL: `https://toolsyourway.com/#/terms` (already live)

---

## 1. LinkedIn (~10 min) ⭐ Easiest

### Create app
1. [LinkedIn Developer Portal → Create app](https://www.linkedin.com/developers/apps/new)
2. Fill in:
   - **App name:** `ToolsYourWay`
   - **LinkedIn Page:** your company page (or create one — even personal-style works)
   - **Privacy policy URL:** `https://toolsyourway.com/#/privacy`
   - **App logo:** upload `tw-logo-profile.png`
3. Check legal agreement → **Create app**

### Configure OAuth
1. Open app dashboard → **Auth** tab
2. Under **OAuth 2.0 settings → Authorized redirect URLs**, add:
   - `https://toolsyourway.com/api/social/linkedin/callback` (production)
   - `http://localhost:5000/api/social/linkedin/callback` (local dev)
3. Save

### Request products
On the **Products** tab, request:
- **Sign In with LinkedIn using OpenID Connect** (auto-approved)
- **Share on LinkedIn** (auto-approved)

### Add to Render env vars
```
LINKEDIN_CLIENT_ID=86abc...
LINKEDIN_CLIENT_SECRET=WPL_AP...
BASE_URL=https://toolsyourway.com
```

---

## 2. YouTube / Google (~10 min)

### Create app
1. [Google Cloud Console](https://console.cloud.google.com/projectcreate)
2. Create a new project: `ToolsYourWay`
3. After creation, go to **APIs & Services → Library**
4. Search and enable: **YouTube Data API v3**

### Configure OAuth consent screen
1. **APIs & Services → OAuth consent screen**
2. User Type: **External** → Create
3. Fill:
   - **App name:** ToolsYourWay
   - **User support email:** your email
   - **App logo:** upload (optional but recommended)
   - **App domain → Application home page:** `https://toolsyourway.com`
   - **App domain → Application privacy policy link:** `https://toolsyourway.com/#/privacy`
   - **App domain → Application terms of service link:** `https://toolsyourway.com/#/terms`
   - **Authorized domains:** `toolsyourway.com`
   - **Developer contact:** your email
4. **Scopes:** click "Add or Remove Scopes" and select:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/youtube` (manage YouTube account)
   - `.../auth/youtube.upload` (upload videos)
5. **Test users:** add your email + any teammate emails
6. Save and continue

### Create OAuth credentials
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. **Name:** `ToolsYourWay Web Client`
4. **Authorized JavaScript origins:**
   - `https://toolsyourway.com`
   - `http://localhost:5000`
5. **Authorized redirect URIs:**
   - `https://toolsyourway.com/api/social/youtube/callback`
   - `http://localhost:5000/api/social/youtube/callback`
6. Create → Copy **Client ID** and **Client secret**

### Add to Render env vars
```
GOOGLE_CLIENT_ID=12345-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...
```

> The Google OAuth flow is in **testing mode** until you submit for verification. In testing mode it works for up to 100 users you've added to the test users list. Submit for verification when you're ready for public users (~1-3 weeks review).

---

## 3. Instagram + Facebook (~15 min)

> Connecting Facebook automatically detects + connects any linked Instagram Business accounts.

### Create app
1. [Meta for Developers → My Apps → Create App](https://developers.facebook.com/apps/create/)
2. Use case: **Other** → Continue
3. App type: **Business**
4. App name: `ToolsYourWay`
5. Contact email: your email
6. Business portfolio: select or create
7. **Create app**

### Add Facebook Login product
1. App dashboard → **Add product**
2. Find **Facebook Login** → **Set up**
3. Choose **Web**
4. Site URL: `https://toolsyourway.com` → continue through wizard

### Configure OAuth redirect URIs
1. App dashboard → **Facebook Login → Settings**
2. **Valid OAuth Redirect URIs:**
   - `https://toolsyourway.com/api/social/facebook/callback`
   - `http://localhost:5000/api/social/facebook/callback`
3. Save changes

### Add Instagram Graph API
1. **Add product** → **Instagram → Set up**

### App Review (required for production)
- For **development** mode: works for app admins, developers, testers (up to 25 people)
- For **public** users: submit for App Review → request these permissions:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
  - `instagram_basic`
  - `instagram_content_publish`
  - `business_management`

> App Review typically takes 5-10 business days. Submit a video showing the connection + post flow.

### Add to Render env vars
1. App dashboard → **Settings → Basic**
2. Copy **App ID** and **App Secret** (click Show)

```
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123...
```

> Important: both your Facebook and Instagram (Business) accounts must be linked. Steps: Instagram app → Settings → Account → Switch to Professional Account → Business → Connect Facebook Page.

---

## 4. X (Twitter) (~15 min) — costs $200/mo

> Twitter API requires a paid plan ($200/mo Basic) to post tweets via API. The free tier only allows reading. Skip this if not budgeted.

### Create app
1. [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your X account
3. **Subscribe to Basic plan** ($200/mo) — required for `tweet.write` scope
4. Click **+ Add App** → Name: `ToolsYourWay`

### Configure OAuth 2.0
1. App settings → **User authentication settings → Set up**
2. **App permissions:** **Read and write** (and Direct Message if you want DM later)
3. **Type of app:** **Web App**
4. **Callback URI / Redirect URL:**
   - `https://toolsyourway.com/api/social/twitter/callback`
   - `http://localhost:5000/api/social/twitter/callback`
5. **Website URL:** `https://toolsyourway.com`
6. Save

### Get credentials
1. **Keys and tokens** tab
2. Under **OAuth 2.0 Client ID and Client Secret**, click **Generate**
3. Copy **Client ID** and **Client Secret**

### Add to Render env vars
```
TWITTER_CLIENT_ID=Z3...
TWITTER_CLIENT_SECRET=abc123...
```

---

## After all keys are set

1. Render auto-redeploys within ~2 minutes
2. Log in to ToolsYourWay → go to any bot → **Settings** → click **Connect** for any platform
3. Popup opens → user approves → connection card shows real profile picture + display name
4. On `/outreach`, the connected accounts strip shows live status with avatars

## Test publish (after connecting)

| Platform | Test endpoint | Result |
|---|---|---|
| **LinkedIn** | "Post" button on LinkedIn card → drafts text → **Post to LinkedIn** | Post appears on user's feed |
| **X / Twitter** | (TBD — UI button coming) | Tweet appears on user's profile |
| **Instagram** | Coming — requires public image URL | Post appears on user's IG feed |
| **YouTube** | Connection test only — video upload coming | Channel info populated |

## Troubleshooting

**"Token exchange failed"** → Client secret wrong, or redirect URL doesn't exactly match what's in the platform's app config.

**Popup doesn't close** → Browser blocked `window.opener.postMessage`. Connection still succeeds — refresh the parent page manually.

**"Profile fetch failed"** → Required scope/product not approved (e.g., LinkedIn's "Sign In with LinkedIn using OpenID Connect" not granted yet).

**"PKCE verifier expired"** (Twitter) → User waited too long (>15 min) on the Twitter consent screen. Just retry.

## Privacy & data handling

ToolsYourWay's data practices for OAuth tokens:
- Stored in `social_connections` table, plain text in dev / encrypted in production
- Only used to fetch user info on connect + publish content the user explicitly drafts
- Never used for scraping, auto-following, or unsolicited DMs
- Tokens with refresh capability auto-refresh; tokens without are reconnected at expiry
- User can disconnect any platform from Settings → revokes ToolsYourWay's access
