"""ToolsYourWay brand asset generator.

Generates all Android / Expo app assets and Play Store launch art from code so
the brand is reproducible and no external proprietary images are required.

Run from the `mobile/` directory:

    python3 store-assets/source/brandkit.py

Outputs:
  - assets/icon.png            (1024x1024 app icon)
  - assets/adaptive-icon.png   (1024x1024 Android adaptive foreground, safe-zone aware)
  - assets/splash.png          (1284x2778 splash, centered mark on indigo)
  - assets/favicon.png         (48x48 web favicon)
  - store-assets/icon-512.png  (512x512 Play Console hi-res icon)
  - store-assets/feature-graphic.png (1024x500 Play feature graphic)
  - store-assets/screenshots/*.png   (1080x2160 phone screenshot mockups)

Brand palette (royal indigo + warm gold + teal, warm white):
  indigo  #1E1650   indigoDeep #0E0A24   indigoLight #2E2470
  gold    #F4C24A   goldDeep   #D9A227
  teal    #2DD4BF   warmWhite  #F5F3FF
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---------------------------------------------------------------- paths -----
HERE = os.path.dirname(os.path.abspath(__file__))
MOBILE = os.path.abspath(os.path.join(HERE, "..", ".."))
ASSETS = os.path.join(MOBILE, "assets")
STORE = os.path.join(MOBILE, "store-assets")
SHOTS = os.path.join(STORE, "screenshots")
for d in (ASSETS, STORE, SHOTS):
    os.makedirs(d, exist_ok=True)

# --------------------------------------------------------------- palette ----
INDIGO = (30, 22, 80)
INDIGO_DEEP = (14, 10, 36)
INDIGO_LIGHT = (46, 36, 112)
SURFACE = (24, 18, 51)
SURFACE_ALT = (34, 26, 69)
GOLD = (244, 194, 74)
GOLD_DEEP = (217, 162, 39)
TEAL = (45, 212, 191)
WARM_WHITE = (245, 243, 255)
TEXT_MUTED = (183, 176, 216)
BORDER = (46, 38, 88)

# ---------------------------------------------------------------- fonts -----
FONT_CANDIDATES = [
    "/usr/local/lib/python3.13/site-packages/cv2/qt/fonts/DejaVuSans-Bold.ttf",
    "/usr/local/lib/python3.13/site-packages/cv2/qt/fonts/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/lib/R/library/grDevices/fonts/Roboto/Roboto-Medium.ttf",
]
_BOLD = next((p for p in FONT_CANDIDATES if "Bold" in p and os.path.exists(p)), None)
_REG = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)


def font(size, bold=True):
    path = _BOLD if (bold and _BOLD) else _REG
    return ImageFont.truetype(path, size)


# ------------------------------------------------------------- helpers ------
def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def vgrad(size, top, bottom):
    """Vertical gradient image."""
    w, h = size
    img = Image.new("RGB", size, top)
    px = img.load()
    for y in range(h):
        c = lerp(top, bottom, y / max(1, h - 1))
        for x in range(w):
            px[x, y] = c
    return img


def radial_glow(size, center, radius, color, max_alpha=140):
    """A soft radial glow as an RGBA layer."""
    w, h = size
    layer = Image.new("L", size, 0)
    px = layer.load()
    cx, cy = center
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy)
            if d < radius:
                px[x, y] = int(max_alpha * (1 - d / radius) ** 2)
    glow = Image.new("RGBA", size, color + (0,))
    glow.putalpha(layer)
    return glow.filter(ImageFilter.GaussianBlur(radius * 0.12))


def rounded(draw, box, r, **kw):
    draw.rounded_rectangle(box, radius=r, **kw)


# ---------------------------------------------------- the brand mark --------
def draw_mark(size, scale=1.0, with_glow=True):
    """The ToolsYourWay mark on a deep-indigo rounded field.

    Motif: a stylized 'T' (Tools / Your / Way) whose stem rises into an upward
    'way' path, capped by a teal command node — an AI command center that points
    forward and up. Gold bar = the steady hand on top; teal node = the live AI.
    Returns an RGBA image of (size,size).
    """
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # Background field with subtle vertical gradient.
    bg = vgrad((S, S), INDIGO_LIGHT, INDIGO_DEEP).convert("RGBA")
    img.alpha_composite(bg)

    if with_glow:
        img.alpha_composite(radial_glow((S, S), (S * 0.5, S * 0.42), S * 0.62, GOLD, 70))
        img.alpha_composite(radial_glow((S, S), (S * 0.66, S * 0.7), S * 0.45, TEAL, 55))

    d = ImageDraw.Draw(img)
    cx = S * 0.5
    # Geometry tuned so the mark sits in the central ~62% (adaptive safe zone friendly).
    bar_w = S * 0.46 * scale
    bar_h = S * 0.115 * scale
    bar_top = S * 0.30
    stem_w = S * 0.135 * scale
    stem_top = bar_top + bar_h - bar_w * 0.02
    stem_bottom = S * 0.74

    # Gold crossbar of the T (the "steady hand on top").
    rounded(
        d,
        [cx - bar_w / 2, bar_top, cx + bar_w / 2, bar_top + bar_h],
        r=bar_h / 2,
        fill=GOLD,
    )
    # Subtle deeper-gold underline for depth.
    rounded(
        d,
        [cx - bar_w / 2, bar_top + bar_h * 0.62, cx + bar_w / 2, bar_top + bar_h],
        r=bar_h / 2,
        fill=GOLD_DEEP,
    )

    # Stem of the T — vertical with a gentle downward taper for a confident,
    # balanced silhouette that still reads as forward motion ("the way").
    taper = S * 0.022 * scale
    stem_poly = [
        (cx - stem_w / 2, stem_top),
        (cx + stem_w / 2, stem_top),
        (cx + stem_w / 2 - taper, stem_bottom),
        (cx - stem_w / 2 + taper, stem_bottom),
    ]
    d.polygon(stem_poly, fill=GOLD)

    # Teal "command node": a live AI pulse anchored at the base of the stem.
    node_r = S * 0.072 * scale
    node_c = (cx, stem_bottom + node_r * 0.15)
    d.ellipse(
        [node_c[0] - node_r, node_c[1] - node_r, node_c[0] + node_r, node_c[1] + node_r],
        fill=TEAL,
    )
    # Inner highlight on the node.
    ir = node_r * 0.42
    d.ellipse(
        [node_c[0] - ir, node_c[1] - ir, node_c[0] + ir, node_c[1] + ir],
        fill=WARM_WHITE,
    )

    # Forward "way" chevron in teal, to the upper-right of the node (progress).
    ch_w = max(2, int(S * 0.022 * scale))
    ox = node_c[0] + S * 0.115 * scale
    oy = node_c[1] - S * 0.085 * scale
    a = S * 0.052 * scale
    d.line([(ox - a, oy - a), (ox, oy), (ox - a, oy + a)], fill=TEAL,
           width=ch_w, joint="curve")
    return img


# --------------------------------------------------- icon (squircle) --------
def squircle_mask(size, radius_ratio=0.225):
    S = size
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=255)
    return mask


def make_icon(out, S=1024):
    mark = draw_mark(S, scale=1.0)
    mask = squircle_mask(S)
    out_img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out_img.paste(mark, (0, 0), mask)
    out_img.convert("RGB").save(out)
    print("icon ->", out)


def make_adaptive(out, S=1024):
    """Adaptive foreground: full-bleed indigo field is set in app.json
    (backgroundColor #1E1650); here we render the mark inside the 66% safe
    zone on a transparent field so launchers can mask/crop freely."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    inner = draw_mark(int(S * 0.66), scale=1.0, with_glow=True)
    # Round the inner field a touch so partial-mask launchers still look clean.
    m = squircle_mask(inner.size[0], radius_ratio=0.28)
    off = (S - inner.size[0]) // 2
    img.paste(inner, (off, off), m)
    img.save(out)
    print("adaptive ->", out)


def make_favicon(out, S=48):
    mark = draw_mark(256, scale=1.05)
    mask = squircle_mask(256, radius_ratio=0.24)
    base = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    base.paste(mark, (0, 0), mask)
    base.resize((S, S), Image.LANCZOS).convert("RGB").save(out)
    print("favicon ->", out)


def make_store_icon(out, S=512):
    mark = draw_mark(S, scale=1.0)
    mask = squircle_mask(S)
    base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    base.paste(mark, (0, 0), mask)
    base.convert("RGB").save(out)
    print("store icon ->", out)


# ------------------------------------------------------------- splash -------
def make_splash(out, W=1284, H=2778):
    img = vgrad((W, H), INDIGO_LIGHT, INDIGO_DEEP).convert("RGBA")
    img.alpha_composite(radial_glow((W, H), (W * 0.5, H * 0.4), W * 0.85, GOLD, 60))
    img.alpha_composite(radial_glow((W, H), (W * 0.5, H * 0.62), W * 0.6, TEAL, 45))
    # Centered mark.
    m = int(W * 0.42)
    mark = draw_mark(m, scale=1.0, with_glow=False)
    img.alpha_composite(mark, (int((W - m) / 2), int(H * 0.30)))
    # Wordmark.
    d = ImageDraw.Draw(img)
    title = "ToolsYourWay"
    f = font(int(W * 0.072))
    tw = d.textlength(title, font=f)
    ty = int(H * 0.30) + m + int(H * 0.02)
    d.text(((W - tw) / 2, ty), title, font=f, fill=WARM_WHITE)
    # Tagline.
    sub = "Your autonomous AI company"
    fs = font(int(W * 0.032), bold=False)
    sw = d.textlength(sub, font=fs)
    d.text(((W - sw) / 2, ty + int(W * 0.085)), sub, font=fs, fill=TEXT_MUTED)
    img.convert("RGB").save(out)
    print("splash ->", out)


# ------------------------------------------------- feature graphic ----------
def make_feature(out, W=1024, H=500):
    img = vgrad((W, H), INDIGO_LIGHT, INDIGO_DEEP).convert("RGBA")
    img.alpha_composite(radial_glow((W, H), (W * 0.22, H * 0.5), W * 0.5, GOLD, 70))
    img.alpha_composite(radial_glow((W, H), (W * 0.85, H * 0.7), W * 0.45, TEAL, 55))
    # Left: mark.
    m = int(H * 0.62)
    mark = draw_mark(m, scale=1.0, with_glow=False)
    mask = squircle_mask(m, 0.24)
    fld = Image.new("RGBA", (m, m), (0, 0, 0, 0))
    fld.paste(mark, (0, 0), mask)
    img.alpha_composite(fld, (int(W * 0.07), int((H - m) / 2)))
    # Right: wordmark + tagline.
    d = ImageDraw.Draw(img)
    x = int(W * 0.07) + m + int(W * 0.04)
    d.text((x, int(H * 0.30)), "ToolsYourWay", font=font(int(H * 0.135)), fill=WARM_WHITE)
    d.text((x, int(H * 0.30) + int(H * 0.155)), "Run your autonomous",
           font=font(int(H * 0.066), bold=False), fill=GOLD)
    d.text((x, int(H * 0.30) + int(H * 0.155) + int(H * 0.082)), "AI company from your phone",
           font=font(int(H * 0.066), bold=False), fill=GOLD)
    img.convert("RGB").save(out)
    print("feature ->", out)


# --------------------------------------------- screenshot mockups -----------
def phone_base(W=1080, H=2160):
    img = vgrad((W, H), INDIGO, INDIGO_DEEP).convert("RGBA")
    img.alpha_composite(radial_glow((W, H), (W * 0.5, H * 0.12), W * 0.9, GOLD, 35))
    return img


def status_bar(d, W, label):
    f = font(34, bold=False)
    d.text((48, 40), "9:41", font=font(34), fill=WARM_WHITE)
    tw = d.textlength("LTE  100%", font=f)
    d.text((W - 48 - tw, 40), "LTE  100%", font=f, fill=TEXT_MUTED)


def mini_mark(img, x, y, s=64):
    m = draw_mark(s, scale=1.0, with_glow=False)
    mask = squircle_mask(s, 0.24)
    fld = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    fld.paste(m, (0, 0), mask)
    img.alpha_composite(fld, (x, y))


def header(img, d, W, title, sub=None):
    mini_mark(img, 48, 110, 72)
    d.text((140, 116), "ToolsYourWay", font=font(40), fill=WARM_WHITE)
    d.text((48, 230), title, font=font(64), fill=WARM_WHITE)
    if sub:
        d.text((48, 312), sub, font=font(34, bold=False), fill=TEXT_MUTED)


def card(d, box, r=28, fill=SURFACE, border=BORDER):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=border, width=2)


def pill(d, x, y, text, fg, bg, pad=22):
    f = font(28)
    tw = d.textlength(text, font=f)
    d.rounded_rectangle([x, y, x + tw + pad * 2, y + 52], radius=26, fill=bg)
    d.text((x + pad, y + 10), text, font=f, fill=fg)
    return x + tw + pad * 2


def tab_bar(img, d, W, H, active):
    bh = 150
    d.rectangle([0, H - bh, W, H], fill=SURFACE_ALT)
    d.line([0, H - bh, W, H - bh], fill=BORDER, width=2)
    tabs = ["Home", "Bots", "Manager", "Approvals", "Account"]
    n = len(tabs)
    f = font(26, bold=False)
    for i, t in enumerate(tabs):
        cx = W * (i + 0.5) / n
        on = t == active
        col = GOLD if on else TEXT_MUTED
        dot_y = H - bh + 44
        d.ellipse([cx - 9, dot_y - 9, cx + 9, dot_y + 9],
                  fill=col if on else SURFACE,
                  outline=col, width=3)
        tw = d.textlength(t, font=f)
        d.text((cx - tw / 2, dot_y + 22), t, font=f, fill=col)


def shot_login(out):
    W, H = 1080, 2160
    img = phone_base(W, H)
    img.alpha_composite(radial_glow((W, H), (W * 0.5, H * 0.42), W * 1.0, TEAL, 30))
    d = ImageDraw.Draw(img)
    status_bar(d, W, "")
    mini_mark(img, (W - 150) // 2, 360, 150)
    d.text(((W - d.textlength("ToolsYourWay", font=font(72))) / 2, 540),
           "ToolsYourWay", font=font(72), fill=WARM_WHITE)
    sub = "Your autonomous AI company"
    d.text(((W - d.textlength(sub, font=font(36, bold=False))) / 2, 632),
           sub, font=font(36, bold=False), fill=GOLD)
    # Form card.
    card(d, [80, 780, W - 80, 1480], r=36)
    d.text((130, 840), "Sign in", font=font(52), fill=WARM_WHITE)
    for i, (lbl, val) in enumerate([("Email", "founder@toolsyourway.com"),
                                    ("Password", "••••••••••••")]):
        y = 960 + i * 200
        d.text((130, y), lbl, font=font(32, bold=False), fill=TEXT_MUTED)
        d.rounded_rectangle([130, y + 48, W - 130, y + 140], radius=22,
                            fill=SURFACE_ALT, outline=BORDER, width=2)
        d.text((160, y + 78), val, font=font(34, bold=False), fill=WARM_WHITE)
    d.rounded_rectangle([130, 1370, W - 130, 1470], radius=24, fill=GOLD)
    btn = "Continue"
    d.text(((W - d.textlength(btn, font=font(40))) / 2, 1398), btn, font=font(40), fill=INDIGO_DEEP)
    d.text(((W - d.textlength("New here? Create an account", font=font(32, bold=False))) / 2, 1540),
           "New here? Create an account", font=font(32, bold=False), fill=TEAL)
    img.convert("RGB").save(out)
    print("shot ->", out)


def shot_dashboard(out):
    W, H = 1080, 2160
    img = phone_base(W, H)
    d = ImageDraw.Draw(img)
    status_bar(d, W, "")
    header(img, d, W, "Command center", "Welcome back, Founder")
    # KPI cards.
    kpis = [("Active bots", "12", TEAL), ("Tasks today", "318", GOLD),
            ("Pending approvals", "4", GOLD), ("Reach (7d)", "1.2M", TEAL)]
    cw = (W - 48 * 2 - 32) // 2
    for i, (lbl, val, col) in enumerate(kpis):
        cx = 48 + (i % 2) * (cw + 32)
        cy = 400 + (i // 2) * 230
        card(d, [cx, cy, cx + cw, cy + 200])
        d.text((cx + 32, cy + 34), lbl, font=font(30, bold=False), fill=TEXT_MUTED)
        d.text((cx + 32, cy + 84), val, font=font(76), fill=col)
    # Activity list.
    d.text((48, 900), "Live activity", font=font(44), fill=WARM_WHITE)
    rows = [("Content bot published 3 reels", "2m", TEAL),
            ("Manager drafted weekly plan", "14m", GOLD),
            ("Ads bot paused low-ROAS set", "1h", TEAL),
            ("Outreach bot booked 2 calls", "3h", GOLD)]
    for i, (t, when, col) in enumerate(rows):
        y = 980 + i * 150
        card(d, [48, y, W - 48, y + 128])
        d.ellipse([84, y + 50, 112, y + 78], fill=col)
        d.text((150, y + 30), t, font=font(34), fill=WARM_WHITE)
        d.text((150, y + 76), "Automated · just now", font=font(26, bold=False), fill=TEXT_MUTED)
        d.text((W - 48 - 30 - d.textlength(when, font=font(30, bold=False)), y + 48),
               when, font=font(30, bold=False), fill=TEXT_MUTED)
    tab_bar(img, d, W, H, "Home")
    img.convert("RGB").save(out)
    print("shot ->", out)


def shot_bots(out):
    W, H = 1080, 2160
    img = phone_base(W, H)
    d = ImageDraw.Draw(img)
    status_bar(d, W, "")
    header(img, d, W, "Bots", "Your AI workforce, always on")
    bots = [("Content Studio", "Reels, posts & captions", "Active", TEAL),
            ("Growth Manager", "Strategy & weekly plans", "Active", TEAL),
            ("Ads Optimizer", "Budgets & A/B testing", "Active", TEAL),
            ("Outreach Agent", "DMs, email & booking", "Paused", GOLD),
            ("Insights Analyst", "KPIs & reporting", "Active", TEAL)]
    for i, (name, desc, state, col) in enumerate(bots):
        y = 410 + i * 230
        card(d, [48, y, W - 48, y + 200])
        d.rounded_rectangle([84, y + 40, 84 + 120, y + 160], radius=26, fill=SURFACE_ALT)
        mini_mark(img, 84 + 12, y + 52, 96)
        d.text((240, y + 46), name, font=font(40), fill=WARM_WHITE)
        d.text((240, y + 104), desc, font=font(30, bold=False), fill=TEXT_MUTED)
        pill(d, 240, y + 150, state, INDIGO_DEEP if state == "Active" else WARM_WHITE,
             col if state == "Active" else GOLD_DEEP)
        # toggle
        tx = W - 48 - 130
        on = state == "Active"
        d.rounded_rectangle([tx, y + 80, tx + 100, y + 136], radius=28,
                            fill=TEAL if on else BORDER)
        kx = tx + (66 if on else 6)
        d.ellipse([kx, y + 84, kx + 48, y + 132], fill=WARM_WHITE)
    tab_bar(img, d, W, H, "Bots")
    img.convert("RGB").save(out)
    print("shot ->", out)


def shot_manager(out):
    W, H = 1080, 2160
    img = phone_base(W, H)
    img.alpha_composite(radial_glow((W, H), (W * 0.5, H * 0.5), W * 0.9, TEAL, 28))
    d = ImageDraw.Draw(img)
    status_bar(d, W, "")
    header(img, d, W, "AI Manager", "Brief it once. It runs the company.")
    # Chat bubbles.
    bubbles = [
        ("you", "Grow my creator brand on Instagram & YouTube this week."),
        ("ai", "On it. I'll publish 5 reels, 3 shorts, run a ₹2k ad test, and "
               "reply to DMs. Draft plan ready for your approval."),
        ("you", "Approve, but keep brand voice premium."),
        ("ai", "Locked premium tone. Scheduling now and routing 4 items to "
               "Approvals before anything goes live."),
    ]
    y = 410
    for who, txt in bubbles:
        you = who == "you"
        f = font(34, bold=False)
        # wrap
        words, lines, cur = txt.split(), [], ""
        maxw = W * 0.62
        for w in words:
            t = (cur + " " + w).strip()
            if d.textlength(t, font=f) > maxw:
                lines.append(cur)
                cur = w
            else:
                cur = t
        lines.append(cur)
        bh = 48 + len(lines) * 46
        bw = maxw + 64
        bx = W - 48 - bw if you else 48
        col = GOLD if you else SURFACE
        fg = INDIGO_DEEP if you else WARM_WHITE
        d.rounded_rectangle([bx, y, bx + bw, y + bh], radius=30, fill=col,
                            outline=None if you else BORDER, width=0 if you else 2)
        for li, ln in enumerate(lines):
            d.text((bx + 32, y + 26 + li * 46), ln, font=f, fill=fg)
        y += bh + 36
    # Input box.
    d.rounded_rectangle([48, H - 150 - 130, W - 48, H - 150 - 20], radius=30,
                        fill=SURFACE_ALT, outline=BORDER, width=2)
    d.text((84, H - 150 - 100), "Tell your manager what to do…",
           font=font(32, bold=False), fill=TEXT_MUTED)
    d.ellipse([W - 48 - 92, H - 150 - 112, W - 48 - 20, H - 150 - 40], fill=GOLD)
    tab_bar(img, d, W, H, "Manager")
    img.convert("RGB").save(out)
    print("shot ->", out)


def shot_account(out):
    W, H = 1080, 2160
    img = phone_base(W, H)
    d = ImageDraw.Draw(img)
    status_bar(d, W, "")
    header(img, d, W, "Account", "Plan, integrations & security")
    # Profile.
    card(d, [48, 400, W - 48, 600])
    d.ellipse([88, 440, 208, 560], fill=INDIGO_LIGHT, outline=GOLD, width=4)
    d.text((118, 470), "F", font=font(80), fill=GOLD)
    d.text((250, 446), "Founder", font=font(44), fill=WARM_WHITE)
    d.text((250, 510), "founder@toolsyourway.com", font=font(30, bold=False), fill=TEXT_MUTED)
    # Plan card.
    card(d, [48, 640, W - 48, 860], fill=SURFACE_ALT)
    d.text((84, 678), "Plan", font=font(32, bold=False), fill=TEXT_MUTED)
    d.text((84, 724), "Pro · Autonomous", font=font(48), fill=GOLD)
    d.rounded_rectangle([W - 48 - 290, 730, W - 84, 822], radius=24, fill=GOLD)
    d.text((W - 48 - 290 + 40, 754), "Manage", font=font(34), fill=INDIGO_DEEP)
    # Integrations.
    d.text((48, 920), "Integrations", font=font(44), fill=WARM_WHITE)
    ints = [("YouTube", "Connected", TEAL), ("Instagram", "Connected", TEAL),
            ("X (Twitter)", "Connected", TEAL), ("Facebook", "Connect", GOLD)]
    for i, (name, st, col) in enumerate(ints):
        y = 1000 + i * 150
        card(d, [48, y, W - 48, y + 128])
        d.ellipse([84, y + 38, 84 + 52, y + 90], fill=SURFACE_ALT, outline=col, width=3)
        d.text((170, y + 42), name, font=font(38), fill=WARM_WHITE)
        lbl = st
        f = font(30, bold=False)
        d.text((W - 48 - 40 - d.textlength(lbl, font=f), y + 48), lbl, font=f, fill=col)
    # Legal links.
    d.text((48, 1640), "Privacy Policy · Terms · Support",
           font=font(30, bold=False), fill=TEXT_MUTED)
    tab_bar(img, d, W, H, "Account")
    img.convert("RGB").save(out)
    print("shot ->", out)


def main():
    make_icon(os.path.join(ASSETS, "icon.png"))
    make_adaptive(os.path.join(ASSETS, "adaptive-icon.png"))
    make_splash(os.path.join(ASSETS, "splash.png"))
    make_favicon(os.path.join(ASSETS, "favicon.png"))
    make_store_icon(os.path.join(STORE, "icon-512.png"))
    make_feature(os.path.join(STORE, "feature-graphic.png"))
    shot_login(os.path.join(SHOTS, "01-login.png"))
    shot_dashboard(os.path.join(SHOTS, "02-dashboard.png"))
    shot_bots(os.path.join(SHOTS, "03-bots.png"))
    shot_manager(os.path.join(SHOTS, "04-manager.png"))
    shot_account(os.path.join(SHOTS, "05-account.png"))


if __name__ == "__main__":
    main()
