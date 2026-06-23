# App assets

Branded ToolsYourWay artwork, generated from code (no external images). The
generator is `../store-assets/source/brandkit.py` — re-run it to regenerate after
any brand tweak.

- `icon.png` — 1024×1024 app icon (gold "T" + teal AI command node on indigo)
- `adaptive-icon.png` — 1024×1024 Android adaptive foreground (mark sits inside the
  66% safe zone; `app.json` sets the `#1E1650` background behind it)
- `splash.png` — 1284×2778 splash: centered mark + wordmark on indigo
- `favicon.png` — 48×48 web favicon

Brand palette: royal indigo `#1E1650` · warm gold `#F4C24A` · teal `#2DD4BF` ·
warm white `#F5F3FF`. See `../store-assets/` for Play Store launch materials.

To regenerate:

```bash
cd mobile
python3 store-assets/source/brandkit.py
```
