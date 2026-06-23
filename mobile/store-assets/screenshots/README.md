# Phone screenshots

These `1080×2160` PNGs are **brand-accurate static mockups** rendered from code
(`../source/brandkit.py`). They mirror the real app's screens, navigation, and
ToolsYourWay palette (royal indigo + warm gold + teal) so the listing can go up
before an emulator run. They are good enough for an internal/closed track.

| File | Screen |
| --- | --- |
| `01-login.png` | Sign in / sign up |
| `02-dashboard.png` | Command-center dashboard (KPIs + live activity) |
| `03-bots.png` | AI bots / workforce list with status toggles |
| `04-manager.png` | AI Manager brief-and-approve chat |
| `05-account.png` | Account: plan, integrations, legal links |

Play requires **at least 2** phone screenshots; up to 8 are allowed. Use these as
1–5.

## Recommended before public production launch: real captures

Static mockups are fine to start, but real device captures convert better and are
expected for a polished production listing. To capture real screenshots:

```bash
cd mobile
npm install
npm run android          # launch on an emulator or device

# With the app running, capture from an Android emulator:
adb exec-out screencap -p > screenshots/real-01-login.png
# (navigate the app, repeat for each screen)
```

Tips:
- Use a clean test account with realistic-but-fake data (no real PII).
- Capture at a tall phone resolution (e.g. Pixel 7: 1080×2400) — Play accepts
  16:9 to 2:1 aspect ratios, 320–3840 px per side.
- Keep the same 5 screens and order so the story reads: sign in → command center
  → your bots → brief the manager → account/integrations.
- Optionally frame them with a device bezel + caption, but raw captures are
  allowed.

After capturing, either replace the `01-05*.png` files or add `real-*.png` and
upload those instead.

## Regenerating the mockups

```bash
cd mobile
python3 store-assets/source/brandkit.py   # rewrites icons, splash, feature graphic, and these mockups
```
