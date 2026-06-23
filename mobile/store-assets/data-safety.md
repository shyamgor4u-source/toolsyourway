# Data Safety — Google Play declaration draft

This is a **draft** to fill the Play Console *Data safety* form. Confirm every line
against the actual app + backend behavior before you submit — you are legally
attesting to its accuracy. Current scope: account sign-in, a SaaS dashboard,
social-account integrations (OAuth), and AI-generated content. **No in-app
payments** ship in v1.0.0 (billing/upgrades are handled on the web).

---

## Summary answers

| Question | Answer | Notes |
| --- | --- | --- |
| Does your app collect or share any required user data? | **Yes** | Account + app activity. |
| Is all collected data encrypted in transit? | **Yes** | App talks to the backend over HTTPS/TLS. |
| Do you provide a way to request data deletion? | **Yes** | Via account deletion / `admin@toolsyourway.com`. See note below. |
| Is data collection optional for some types? | **Yes** | Connecting a social account is optional. |

---

## Data types collected

### Personal info
| Type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Email address | Yes | No | Account management, sign-in | Required to use the app |
| Name / username | Yes | No | Account management, personalization | Required |
| User IDs | Yes | No | Account management | Required |

### App activity
| Type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| App interactions (bots run, approvals, briefs) | Yes | No | App functionality, analytics | Required for core features |
| In-app content you create (AI prompts/briefs, generated drafts) | Yes | No | App functionality (running your bots) | Required for that feature |

### Authentication / connected accounts
| Type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| OAuth tokens for YouTube / Instagram / X / Facebook | Yes (server-side) | No | Publish/manage content you authorize | **Optional** — only if you connect |

> Connected-account tokens are held by the ToolsYourWay backend, not stored as
> secrets in the app. The app authenticates with the backend via session; tokens
> for third-party platforms live server-side. Declare them as **collected** because
> the service stores them on your behalf.

### Data types NOT collected in v1.0.0
- **Financial info / payment info** — no in-app billing; upgrades happen on the web.
- **Location** (precise or approximate).
- **Contacts**, **Calendar**, **SMS/Call logs**.
- **Photos/Videos from device** — content is generated/managed server-side, not
  read from the device gallery in v1.0.0. (Revisit if a media picker is added.)
- **Device identifiers / advertising ID** — no ad SDKs bundled.

> If you add crash reporting or analytics SDKs (e.g. Sentry, Firebase) before
> launch, you MUST add **Crash logs** and/or **Diagnostics** here and re-confirm
> the "shared with third parties" answers for that SDK.

---

## Security practices
- **Encryption in transit:** Yes — all backend requests use HTTPS/TLS.
- **Data deletion:** Users can request account + data deletion by emailing
  `admin@toolsyourway.com`, and/or via the web account settings. Provide an
  in-app or web "Delete account" path and a public deletion-instructions URL
  (Play now asks for one) before submitting.
- **Committed to Play Families policy:** N/A (not targeting children).

---

## Action items before you submit
1. Confirm whether any analytics/crash SDK is bundled in the production build; if
   so, add the matching data types + "shared" answers.
2. Publish a reachable **account-deletion instructions URL** and add it to the form.
3. Verify the Privacy Policy at `https://www.toolsyourway.com/#/privacy` (or a
   non-hash `/privacy`) is live and describes each data type above.
