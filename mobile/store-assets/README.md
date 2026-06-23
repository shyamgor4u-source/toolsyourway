# ToolsYourWay — Play Store launch assets

Everything needed to create the Google Play listing for **ToolsYourWay**
(`com.toolsyourway.app`). All graphics are generated from code so the brand is
reproducible and uses no external proprietary images.

## Contents

| Path | What it is |
| --- | --- |
| `listing.md` | Title, short + full description, release notes, ASO keywords, category |
| `data-safety.md` | Draft answers for the Play *Data safety* form |
| `content-rating.md` | Notes for the IARC content-rating questionnaire |
| `icon-512.png` | 512×512 hi-res icon for the Play Console |
| `feature-graphic.png` | 1024×500 feature graphic |
| `screenshots/` | 1080×2160 phone screenshot mockups + capture guide |
| `source/brandkit.py` | Generator for ALL assets (app icons, splash, store art) |

The in-app assets it also (re)generates live in `../assets/`:
`icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`.

## Brand

Royal / deep indigo + warm gold + teal on warm white.

| Token | Hex |
| --- | --- |
| Indigo (brand) | `#1E1650` |
| Indigo deep (bg) | `#0E0A24` |
| Gold | `#F4C24A` |
| Gold deep | `#D9A227` |
| Teal | `#2DD4BF` |
| Warm white | `#F5F3FF` |

Mark: a confident gold **T** (Tools · Your · Way) whose stem terminates in a live
teal "command node" with a forward chevron — an AI command center pointing the
way forward. Matches the in-app theme in `../src/theme.ts`.

## Regenerate everything

```bash
cd mobile
python3 store-assets/source/brandkit.py
```

Requires Python 3 with Pillow (`pip install pillow`). The script is deterministic.

## Submission essentials (see `../README.md` for the full checklist)

- Privacy Policy URL: `https://www.toolsyourway.com/#/privacy`
- Support email: `admin@toolsyourway.com`
- Category: Business (primary)
- No in-app billing in v1.0.0 — upgrades happen on the web.
