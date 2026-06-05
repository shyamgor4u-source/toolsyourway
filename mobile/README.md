# ToolsYourWay — Mobile (Android-first)

A React Native + Expo (TypeScript) app that puts the ToolsYourWay "AI company
command center" on Android. It talks to the existing backend at
`https://www.toolsyourway.com`.

This project is **isolated** from the root web app: it has its own
`package.json`, `tsconfig.json`, and `node_modules`. The root Render build
(`npm install && npm run build`) does not touch `mobile/`.

- **App name:** ToolsYourWay
- **Android package / applicationId:** `com.toolsyourway.app`
- **Deep link scheme:** `toolsyourway://`

## Prerequisites

- Node.js 18+ and npm
- A device or emulator:
  - **Expo Go** app on a physical Android phone (fastest), or
  - **Android Studio** with an Android Virtual Device (AVD) emulator
- For native builds: an [Expo account](https://expo.dev) + the EAS CLI
  (`npm i -g eas-cli`). No local Android SDK is required when using EAS cloud builds.

## Run on Android locally

```bash
cd mobile
npm install
npm run android      # opens the Android emulator/device via Expo
# or:
npm start            # then press "a" for Android, or scan the QR with Expo Go
```

### Backend URL config

The app resolves the backend base URL in this order:

1. `EXPO_PUBLIC_API_BASE_URL` env var (dev override)
2. `expo.extra.apiBaseUrl` in `app.json` (defaults to `https://www.toolsyourway.com`)
3. Hardcoded production default

For local backend development, copy `.env.example` to `.env` and set:

```bash
# Android emulator reaches your host machine's localhost at 10.0.2.2
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5000
```

No secrets are stored in the app — auth uses the backend's session cookies.

## Build an Android APK / AAB (EAS)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure        # first time only; sets the EAS project id

# Internal test APK (installable on a device):
eas build -p android --profile preview

# Play Store bundle (.aab) for release:
eas build -p android --profile production
```

Build profiles live in `eas.json`. The `preview` profile outputs an APK; the
`production` profile outputs an AAB for the Play Store.

To submit to the Play Store after a production build:

```bash
eas submit -p android --latest
```

## Billing note (important)

Do **not** implement Razorpay (or any) checkout inside the mobile app yet.
Google Play requires Play Billing for digital goods, and the store payment
strategy is not finalized. For now, the Account screen links out to the web app
(`/#/pricing`) for plan upgrades and billing management. Revisit once the
Play Billing vs. external-payment strategy is decided.

## Deep links & OAuth (future)

The Android manifest registers an intent filter for the `toolsyourway://` scheme
(see `app.json` → `android.intentFilters`). In-app routes are mapped in
`src/navigation/RootNavigator.tsx` (e.g. `toolsyourway://approvals`).

**OAuth redirect strategy (not yet wired):** the existing web OAuth callbacks
(`/api/auth/google/callback`, `/api/social/*/callback`, etc.) redirect to web
hash routes and must remain unchanged. When mobile OAuth is added, use a
dedicated mobile redirect (e.g. `toolsyourway://oauth/callback` via
`expo-auth-session` / `expo-web-browser`) and register that redirect URI in each
provider console — without removing the existing web URIs.

## Play Store assets & submission checklist

Branded launch assets are generated from code (no external images) and live in
[`store-assets/`](store-assets/README.md). Regenerate them any time with:

```bash
cd mobile
python3 store-assets/source/brandkit.py   # needs Python 3 + Pillow
```

**Assets — done (branded, in repo):**
- [x] App icon `1024×1024` (`assets/icon.png`)
- [x] Adaptive icon foreground `1024×1024` (`assets/adaptive-icon.png`)
- [x] Splash image (`assets/splash.png`)
- [x] Web favicon (`assets/favicon.png`)
- [x] Hi-res Play icon `512×512` (`store-assets/icon-512.png`)
- [x] Feature graphic `1024×500` (`store-assets/feature-graphic.png`)
- [x] Phone screenshots `1080×2160` ×5 (`store-assets/screenshots/`) — brand mockups
- [x] Short + full description, release notes (`store-assets/listing.md`)
- [x] Data safety draft (`store-assets/data-safety.md`)
- [x] Content rating notes (`store-assets/content-rating.md`)

**Still required in the Play Console before release:**
- [ ] Create the app in Play Console (package `com.toolsyourway.app`)
- [ ] Confirm the Privacy Policy URL is live → `https://www.toolsyourway.com/#/privacy`
- [ ] Complete the Data safety form (use `store-assets/data-safety.md`; verify SDKs)
- [ ] Complete the Content rating questionnaire (`store-assets/content-rating.md`)
- [ ] Publish an account-deletion instructions URL and add it to Data safety
- [ ] Set a real `expo.extra.eas.projectId` (`eas build:configure`) — placeholder now
- [ ] (Recommended) Replace screenshot mockups with real device captures
- [ ] Build a signed AAB (`eas build -p android --profile production`)
- [ ] Upload to a Play track (internal → closed → production) and submit

## Project layout

```
mobile/
  App.tsx                  # root: providers + navigator
  app.json                 # Expo app identity, Android package, deep link intent
  eas.json                 # EAS build profiles (preview APK, production AAB)
  src/
    api/client.ts          # base-URL resolution + fetch wrapper (cookie auth)
    api/auth.ts            # login/register/logout/me/dashboard calls
    context/AuthContext.tsx
    navigation/RootNavigator.tsx   # bottom tabs + deep link config
    components/            # Screen, Card, Button, Field, Pill
    screens/               # Auth, Home, Bots, Manager, Approvals, Account
    data/bots.ts           # bot/suite catalog
    theme.ts               # brand colors / spacing / typography
```

## What works now vs. placeholders

**Works (wired to backend):**
- Login / register / logout via `/api/auth/*` (session-cookie auth)
- Home dashboard + Bots active-status pulled from `/api/user/dashboard`
- Account screen with live user info, backend URL, legal deep links

**Placeholders (UI ready, backend wiring pending):**
- Manager prompt box — echoes the brief; needs the AI-manager endpoint
- Approvals queue — sample items; needs a real approvals feed
- Bots enable/disable — read-only status; toggling happens on web for now
