# ToolsYourWay — Google Play Store Listing

All copy below is ready to paste into the Play Console. Character limits are noted
inline. Do **not** include emojis in the title/short description (Play policy).

---

## App identity

| Field | Value |
| --- | --- |
| App name (≤ 30 chars) | `ToolsYourWay` (12) |
| Package / applicationId | `com.toolsyourway.app` |
| Default language | English (United States) — `en-US` |
| Category | **Business** (primary) · Productivity (secondary) |
| Tags | Business, Productivity, Marketing, Automation, AI |
| Contact email | `admin@toolsyourway.com` |
| Website | `https://www.toolsyourway.com` |
| Privacy Policy URL | `https://www.toolsyourway.com/#/privacy` |
| Terms URL | `https://www.toolsyourway.com/#/terms` |

> If the dedicated privacy route is not yet live, publish a standalone policy at
> `https://www.toolsyourway.com/privacy` before submission — Play **requires** a
> reachable Privacy Policy URL.

---

## Short description (≤ 80 chars)

> Run your autonomous AI company — bots, content & growth from one command center.

(78 chars)

Alternates:
- `Your autonomous AI company in your pocket. AI bots run content, ads & growth.` (77)
- `Command your AI workforce: content, social, ads & growth on autopilot.` (70)

---

## Full description (≤ 4000 chars)

> ToolsYourWay puts your autonomous AI company in your pocket. It is a premium
> command center for founders, creators, influencers, agencies, and operators who
> want AI bots to run the day-to-day — content, social media, ads, outreach, and
> reporting — while you stay in control from your phone.
>
> WHY TOOLSYOURWAY
> Most tools give you one more dashboard to manage. ToolsYourWay gives you a
> workforce. Brief your AI Manager once, approve the plan, and a team of
> specialized bots executes across your channels — drafting, scheduling,
> publishing, optimizing, and reporting back. You move from doing the work to
> directing it.
>
> YOUR AI WORKFORCE
> • Content Studio — generates reels, posts, captions, and shorts in your brand voice
> • Growth Manager — turns your goals into a weekly plan and coordinates the bots
> • Ads Optimizer — manages budgets, runs A/B tests, and pauses low-ROAS spend
> • Outreach Agent — handles DMs, email, and booking
> • Insights Analyst — tracks KPIs and surfaces what is working
>
> A COMMAND CENTER, NOT A CHORE
> • Live dashboard: active bots, tasks completed, reach, and pending approvals
> • Approvals queue: nothing goes live without your sign-off when you want control
> • One-tap toggles to pause or resume any bot
> • Connect YouTube, Instagram, X (Twitter), and Facebook
>
> BUILT FOR
> • Founders running lean and wearing every hat
> • Creators and influencers who want to post consistently without burning out
> • Agencies managing many brands and channels
> • Operators who want measurable output, not more busywork
>
> SECURE BY DESIGN
> Sign in with your ToolsYourWay account. The app talks to your existing
> ToolsYourWay workspace over an encrypted connection. You decide which social
> accounts to connect and can disconnect any of them at any time.
>
> Download ToolsYourWay and run your company the way you want — on autopilot, on
> your terms.
>
> Questions or feedback? Email admin@toolsyourway.com.

---

## Release notes (What's new) — v1.0.0 (≤ 500 chars)

> Welcome to ToolsYourWay for Android — your autonomous AI company in your pocket.
> • Secure sign in to your ToolsYourWay workspace
> • Command-center dashboard: active bots, tasks, reach & approvals
> • Manage your AI bots and review the approvals queue
> • Connect YouTube, Instagram, X (Twitter) & Facebook
> • Brief your AI Manager in plain language
> This is our first release — tell us what to build next at admin@toolsyourway.com.

---

## Keyword positioning (ASO)

Primary intent: **autonomous AI company / AI workforce / AI marketing automation.**

Priority terms to weave naturally into title, short, and full description:
- ai company, autonomous ai, ai workforce, ai agents, ai bots
- social media automation, content automation, ai content
- marketing automation, ads optimizer, growth
- creator tools, influencer tools, agency tools
- command center, dashboard, productivity, business

India + global note: keep English the default locale; the value prop ("run your
company on autopilot") and channel coverage (YouTube/Instagram/X/Facebook) travel
globally. Consider a `hi-IN` (Hindi) localized short description in a later release
to lift India installs. Pricing copy in-app stays on the web (`/#/pricing`).

---

## Store graphics checklist (files in this folder)

| Asset | Spec | File |
| --- | --- | --- |
| Hi-res icon | 512×512 PNG, 32-bit | `icon-512.png` |
| Feature graphic | 1024×500 PNG/JPG | `feature-graphic.png` |
| Phone screenshots | 1080×2160 PNG (min 2, up to 8) | `screenshots/01-05*.png` |
| App icon (in-app) | 1024×1024 | `../assets/icon.png` |
| Adaptive icon fg | 1024×1024 transparent | `../assets/adaptive-icon.png` |

All graphics are generated from code via `source/brandkit.py` — re-run it to
regenerate after any brand tweak. See `screenshots/README.md` for how to swap in
real device captures (recommended before final publish).
