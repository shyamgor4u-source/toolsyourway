# LinkedIn OAuth Setup Guide

This guide walks through setting up LinkedIn OAuth so users of ToolsYourWay can connect their LinkedIn account and post to their feed.

## Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps/new)
2. Click **Create app**
3. Fill in:
   - **App name:** `ToolsYourWay`
   - **LinkedIn Page:** select your company's LinkedIn Page (or create one)
   - **App logo:** upload `tw-logo-profile.png` (saved in project root)
   - **Legal agreement:** check the box
4. Click **Create app**

## Step 2: Configure OAuth 2.0

1. Open your new app's dashboard
2. Go to the **Auth** tab
3. Under **OAuth 2.0 settings → Authorized redirect URLs**, add:
   - `https://toolsyourway.com/api/social/linkedin/callback` (production)
   - `http://localhost:5000/api/social/linkedin/callback` (local development)
4. Save the changes

## Step 3: Request Required Products

On the **Products** tab, request access to:

1. **Sign In with LinkedIn using OpenID Connect** — grants `openid`, `profile`, `email` scopes
   - Usually auto-approved
   - Gives us: user's name, profile picture, LinkedIn URN
2. **Share on LinkedIn** — grants `w_member_social` scope
   - Auto-approved for most apps
   - Gives us: permission to publish posts on behalf of the user

> **If you also want to post to Company Pages**, request **Marketing Developer Platform** (manual review, ~2 weeks).

## Step 4: Copy Credentials to .env

On the **Auth** tab, copy:
- **Client ID**
- **Primary Client Secret**

Add them to your Render environment variables (or local `.env`):

```
LINKEDIN_CLIENT_ID=86abc...
LINKEDIN_CLIENT_SECRET=WPL_AP...
BASE_URL=https://toolsyourway.com
```

> **Important:** `BASE_URL` must match exactly what you registered as the redirect URL (minus the `/api/...` path).

## Step 5: Restart the Server

After updating env vars:
- **Render:** auto-redeploys within ~2 minutes of saving env vars
- **Local:** stop and restart `npm run dev`

## Step 6: Test the Connection

1. Log in to ToolsYourWay as any user (or the admin account)
2. Go to any bot detail page → **Settings** → **Connect LinkedIn**
3. A popup opens to LinkedIn's consent screen
4. Approve the permissions
5. Popup auto-closes, and the connection card shows your real LinkedIn profile picture + display name
6. Go to `/outreach` — you'll see a **Post** button on the LinkedIn card in "Your connected accounts"
7. Click **Post** → write something → click **Post to LinkedIn** → your real LinkedIn feed gets the post

## Scopes Granted

| Scope | Purpose |
|---|---|
| `openid` | Required for OIDC sign-in flow |
| `profile` | User's name + profile picture |
| `email` | User's email address |
| `w_member_social` | Post to user's feed on their behalf |

## Troubleshooting

**"Token exchange failed"** — Your `LINKEDIN_CLIENT_SECRET` is wrong or the redirect URL doesn't exactly match what's in the LinkedIn app config.

**"Profile fetch failed"** — You didn't request the "Sign In with LinkedIn using OpenID Connect" product.

**Post returns 403** — You didn't request the "Share on LinkedIn" product OR the token doesn't include `w_member_social` scope. Disconnect and reconnect to re-grant.

**Popup doesn't close** — Your browser blocked `window.opener.postMessage`. Popup still succeeds — just refresh the parent page manually.

## API Quotas

- **Free tier:** 500 API calls per day per user, 100K per app per day
- **More than enough for normal usage**

## Token Lifetime

- **Access token:** 60 days
- **Refresh token:** 1 year
- ToolsYourWay stores `expiresAt` and will prompt users to reconnect when the token is within 7 days of expiry

## What ToolsYourWay does with LinkedIn data

- Fetches profile picture + display name on connect (stored in `social_connections.profile_picture_url`, `display_name`)
- Stores access token encrypted (production) in `social_connections.access_token`
- Uses token only to fetch user info and publish posts the user explicitly drafts and approves
- Never scrapes connections, never auto-follows, never sends DMs without user approval
