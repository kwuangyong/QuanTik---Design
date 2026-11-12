"""Drawing primitives shared by every style template (PIL + matplotlib, 1080x1920)."""
from __future__ import annotations

import io
import math
import re
from functools import lru_cache

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import matplotlib.ticker  # noqa: E402,F401
from matplotlib import font_manager  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402

from core import BRAND, H, SAFE, THEME, W, font, font_path, hex_  # noqa: E402

for _k in ("sans", "sans-bold"):
    try:
        font_manager.fontManager.addfont(font_path(_k))
    except Exception:
        pass
_SANS_NAME = font_manager.FontProperties(fname=font_path("sans")).get_name()
plt.rcParams.update({
    "font.family": [_SANS_NAME, "DejaVu Sans"],
    "mathtext.fontset": "dejavusans",
    "axes.facecolor": hex_(THEME["surface"]),
    "figure.facecolor": hex_(THEME["surface"]),
    "axes.edgecolor": hex_(THEME["border"]),
    "axes.labelcolor": hex_(THEME["muted"]),
    "text.color": hex_(THEME["text"]),
    "xtick.color": hex_(THEME["muted"]),
    "ytick.color": hex_(THEME["muted"]),
    "axes.grid": True,
    "grid.color": hex_(THEME["border"]),
    "grid.alpha": 0.5,
    "grid.linewidth": 0.6,
})

T = THEME


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x)
    return 3 * x * x - 2 * x * x * x


def seg(p, a, b):
    """Progress of p inside [a, b] mapped to 0..1."""
    return clamp((p - a) / max(1e-6, b - a))


# ---------------------------------------------------------------- layout log (read by qa/check_format.py)
class Layout:
    def __init__(self):
        self.items = {}
        self.scene = "?"

    def log(self, label, box, overflow, size, min_size):
        key = (self.scene, label)
        prev = self.items.get(key)
        rec = {"scene": self.scene, "label": label, "box": [int(v) for v in box], "overflow": bool(overflow),
               "font_size": int(size), "shrunk_to_min": size <= min_size,
               "outside_safe": not _inside_safe(box)}
        if prev is None or rec["overflow"] or rec["outside_safe"]:
            self.items[key] = rec

    def report(self):
        return list(self.items.values())


def _inside_safe(box):
    x0, y0, x1, y1 = box
    return x0 >= SAFE["left"] - 1 and y0 >= SAFE["top"] - 1 and x1 <= SAFE["right"] + 1 and y1 <= SAFE["bottom"] + 1


LAYOUT = Layout()


# ---------------------------------------------------------------- base frame
@lru_cache(maxsize=4)
def _background(variant=0):
    img = Image.new("RGB", (W, H), T["bg"])
    d = ImageDraw.Draw(img)
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(14, 22, 18), width=1)
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(14, 22, 18), width=1)
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([-300, -400, 900, 700], fill=40)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img.paste(Image.new("RGB", (W, H), T["accent"]), (0, 0), glow.point(lambda v: v // 3))
    return img


def base():
    return _background().copy()


@lru_cache(maxsize=4)
def logo(size=68):
    im = Image.open(BRAND / "assets/logo.jpg").convert("RGB").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=255)
    out = Image.new("RGBA", (size, size))
    out.paste(im, (0, 0), mask)
    return out


def header(img, tag: str, note: str):
    d = ImageDraw.Draw(img)
    x, y = SAFE["left"], SAFE["top"] + 4
    img.paste(logo(64), (x, y), logo(64))
    d.text((x + 80, y + 8), "QuanTik", font=font("sans-bold", 34), fill=T["text"])
    d.text((x + 80, y + 46), "quant cho cổ phiếu Việt Nam", font=font("sans", 17), fill=T["muted"])
    f = font("mono-bold", 24)
    tw = d.textlength(tag, font=f)
    bx1 = SAFE["right"]; bx0 = bx1 - tw - 36
    d.rounded_rectangle([bx0, y + 12, bx1, y + 56], radius=22, outline=T["accent"], width=2, fill=(30, 22, 16))
    d.text((bx0 + 18, y + 20), tag, font=f, fill=T["accent"])
    d.text((x, y + 82), note, font=font("sans", 20), fill=T["muted"])


def progress(img, p):
    d = ImageDraw.Draw(img)
    y = SAFE["bottom"] - 6
    d.rounded_rectangle([SAFE["left"], y, SAFE["right"], y + 5], radius=3, fill=T["raised"])
    d.rounded_rectangle([SAFE["left"], y, SAFE["left"] + (SAFE["right"] - SAFE["left"]) * clamp(p), y + 5], radius=3, fill=T["accent"])


# ---------------------------------------------------------------- text
_NUM = re.compile(r"[−\-+]?\d[\d.,]*%?x?")


def wrap(text, f, width, draw):
    lines = []
    for para in text.split("\n"):
        words, cur = para.split(), ""
        for w_ in words:
            trial = (cur + " " + w_).strip()
            if draw.textlength(trial, font=f) <= width or not cur:
                cur = trial
            else:
                lines.append(cur); cur = w_
        lines.append(cur)
    return lines


def text_box(img, text, box, kind="sans-bold", size=64, color=None, align="left", valign="top",
             min_size=26, label="text", spacing=1.18, hl_numbers=False, hl_color=None, alpha=1.0, max_lines=None):
    """Wrap text into box, shrinking the font until it fits. Logs overflow for QA. Returns used bbox."""
    color = color or T["text"]
    hl_color = hl_color or T["accent"]
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0)) if alpha < 1 else None
    d = ImageDraw.Draw(layer or img)
    s = size
    while True:
        f = font(kind, s)
        lines = wrap(text, f, x1 - x0, d)
        lh = int(s * spacing)
        th = lh * len(lines)
        too_many = max_lines is not None and len(lines) > max_lines
        widest = max((d.textlength(l, font=f) for l in lines), default=0)
        if (th <= y1 - y0 and widest <= x1 - x0 and not too_many) or s <= min_size:
            break
        s = max(min_size, int(s * 0.92))
    overflow = th > y1 - y0 or widest > x1 - x0 or too_many
    y = y0 if valign == "top" else (y0 + (y1 - y0 - th) // 2 if valign == "middle" else y1 - th)
    used = [x1, y, x0, y + th]
    for ln in lines:
        lw = d.textlength(ln, font=f)
        x = x0 if align == "left" else (x0 + (x1 - x0 - lw) / 2 if align == "center" else x1 - lw)
        used[0] = min(used[0], x); used[2] = max(used[2], x + lw)
        if hl_numbers:
            cx = x
            for tok in re.split(r"(\s+)", ln):
                c = hl_color if _NUM.fullmatch(tok.strip(".,:;!?()")) else color
                d.text((cx, y), tok, font=f, fill=c)
                cx += d.textlength(tok, font=f)
        else:
            d.text((x, y), ln, font=f, fill=color)
        y += lh
    if layer is not None:
        a = layer.getchannel("A").point(lambda v: int(v * alpha))
        layer.putalpha(a)
        img.paste(layer, (0, 0), layer)
    LAYOUT.log(label, used if lines else box, overflow, s, min_size)
    return used


def subtitle(img, text):
    if not text:
        return
    x0, x1 = SAFE["left"] + 10, SAFE["right"] - 10
    box = (x0 + 24, 1338, x1 - 24, 1478)
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([x0, 1326, x1, 1488], radius=24, fill=(0, 0, 0, 165))
    text_box(img, text, box, "sans-bold", 42, T["text"], "center", "middle", min_size=30, label="subtitle",
             max_lines=2, hl_numbers=True, hl_color=T["neutral"])


def chip(img, xy, text, color=None, size=26):
    d = ImageDraw.Draw(img)
    color = color or T["accent"]
    f = font("sans-bold", size)
    tw = d.textlength(text, font=f)
    x, y = xy
    lum = 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]
    d.rounded_rectangle([x, y, x + tw + 32, y + size + 22], radius=(size + 22) // 2, fill=color,
                        outline=None if lum > 90 else T["border"], width=2)
    d.text((x + 16, y + 9), text, font=f, fill=T["bg"] if lum > 90 else T["text"])
    return x + tw + 32


# ---------------------------------------------------------------- panels / images
def panel(img, box, fill=None, outline=None, radius=28):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=radius, fill=fill or T["surface"], outline=outline or T["border"], width=2)


def paste(img, im, xy, alpha=1.0, anchor="nw"):
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    x, y = xy
    if anchor == "center":
        x, y = int(x - im.width / 2), int(y - im.height / 2)
    elif anchor == "n":
        x = int(x - im.width / 2)
    if alpha < 1:
        im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    img.paste(im, (int(x), int(y)), im)


def fig_to_img(fig, transparent=False):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=100, transparent=transparent)
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("RGBA")


def chart_img(model, w=880, h=760, upto=1.0, title=None):
    fig = plt.figure(figsize=(w / 100, h / 100))
    garch = (getattr(model, "family", None) or model.topic) == "garch"
    ax = fig.add_axes([0.15, 0.11, 0.70 if garch else 0.80, 0.78 if title else 0.85])
    model.plot2d(ax, upto)
    if title:
        fig.text(0.04, 0.965, title, fontsize=24, color=hex_(T["text"]), weight="bold", va="top")
    return fig_to_img(fig)


def surface_img(model, azim=-60, elev=28, w=880, h=820, surf=None):
    surf = surf or model.surface()
    fig = plt.figure(figsize=(w / 100, h / 100))
    ax = fig.add_axes([0.0, 0.02, 1.0, 0.96], projection="3d")
    ax.set_facecolor(hex_(T["surface"]))
    for a in (ax.xaxis, ax.yaxis, ax.zaxis):
        a.set_pane_color((0.05, 0.1, 0.075, 1.0))
        a._axinfo["grid"]["color"] = (0.16, 0.26, 0.21, 1)
    if "lines" in surf:
        for x, y, z, c in surf["lines"]:
            ax.plot(x, y, z, color=c, lw=2.2)
            ax.add_collection3d(_ribbon(x, y, z, c))
    elif "line" in surf:
        x, y, z = surf["line"]
        n = len(x)
        cols = plt.cm.YlOrRd(0.25 + 0.75 * (np_arange(n) / n))
        ax.scatter(x, y, z, c=cols, s=9, depthshade=False)
        ax.plot(x, y, z, color=hex_(T["accent"]), lw=0.6, alpha=0.6)
        ax.plot([1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 1, 0], color=hex_(T["muted"]), lw=1)
    else:
        ax.plot_surface(surf["X"], surf["Y"], surf["Z"], cmap="YlOrRd", linewidth=0, antialiased=True,
                        rcount=60, ccount=60, alpha=0.95)
    ax.set_xlabel(surf["xl"], fontsize=19, labelpad=14)
    ax.set_ylabel(surf["yl"], fontsize=19, labelpad=14)
    ax.set_zlabel(surf["zl"], fontsize=19, labelpad=10)
    ax.tick_params(labelsize=14, colors=hex_(T["muted"]))
    for a in (ax.xaxis, ax.yaxis, ax.zaxis):
        a.set_major_locator(matplotlib.ticker.MaxNLocator(4))
    if surf.get("yticks"):
        ax.set_yticks(range(len(surf["yticks"])))
        ax.set_yticklabels(surf["yticks"], fontsize=15)
    ax.view_init(elev=elev, azim=azim)
    return fig_to_img(fig)


def _ribbon(x, y, z, c):
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection

    zmin = min(z)
    verts = [list(zip(x, y, z)) + list(zip(x[::-1], y[::-1], [zmin] * len(x)))]
    return Poly3DCollection(verts, facecolors=c, alpha=0.18, edgecolors="none")


def np_arange(n):
    import numpy as np

    return np.arange(n)


@lru_cache(maxsize=64)
def math_img(latex, size=64, color=None):
    color = color or hex_(T["text"])
    fig = plt.figure(figsize=(0.01, 0.01))
    try:
        fig.text(0, 0, f"${latex}$", fontsize=size, color=color)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=100, transparent=True, bbox_inches="tight", pad_inches=0.08)
    finally:
        plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("RGBA")


def fit_width(im, max_w, max_h=None):
    s = min(1.0, max_w / im.width, (max_h or 10**6) / im.height)
    return im if s >= 1 else im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)


# ---------------------------------------------------------------- code panel
_KW = {"def", "return", "for", "in", "range", "if", "else", "import", "as", "lambda", "while", "not", "and", "or"}
_TOK = re.compile(r"(#.*$)|(\"[^\"]*\"|'[^']*')|(\b\d[\d_]*\.?\d*(?:e-?\d+)?\b)|(\b[A-Za-z_]\w*\b)|(\s+)|(.)", re.M)


def code_panel(code, width=880, chars=None, hl_line=None, title="model.py"):
    lines = code.splitlines()
    longest = max(len(l) for l in lines)
    size = 30
    while size > 18 and font("mono", size).getlength("M" * (longest + 4)) > width - 60:
        size -= 1
    f = font("mono", size)
    lh = int(size * 1.45)
    h = 70 + lh * len(lines) + 30
    im = Image.new("RGBA", (width, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, width - 1, h - 1], radius=24, fill=(10, 18, 14), outline=T["border"], width=2)
    for i, c in enumerate([(240, 128, 136), (227, 193, 108), (103, 214, 165)]):
        d.ellipse([24 + i * 30, 24, 42 + i * 30, 42], fill=c)
    d.text((130, 20), title, font=font("mono", 22), fill=T["muted"])
    remaining = chars if chars is not None else 10**9
    y = 70
    cw = f.getlength("M")
    for i, ln in enumerate(lines):
        if hl_line is not None and i == hl_line:
            d.rectangle([2, y - 4, width - 3, y + lh - 6], fill=(40, 30, 20))
        d.text((18, y), f"{i + 1:>2}", font=f, fill=(70, 95, 82))
        x = 18 + cw * 3.4
        for m in _TOK.finditer(ln):
            if remaining <= 0:
                break
            tok = m.group(0)[:remaining]
            remaining -= len(tok)
            if m.group(1):
                c = (110, 140, 125)
            elif m.group(2):
                c = T["positive"]
            elif m.group(3):
                c = T["neutral"]
            elif m.group(4) and m.group(4) in _KW:
                c = T["accent"]
            elif m.group(4) and m.group(4) in ("np", "rng"):
                c = (130, 190, 240)
            else:
                c = T["text"]
            d.text((x, y), tok, font=f, fill=c)
            x += f.getlength(tok)
        if remaining <= 0 and chars is not None:
            if int(chars * 2) % 2 == 0:
                d.rectangle([x + 2, y, x + cw * 0.6, y + size + 4], fill=T["accent"])
            break
        remaining -= 1  # newline
        y += lh
    return im


def terminal_panel(lines_shown, width=880, title="kết quả"):
    size = 30
    while size > 20 and any(font("mono", size).getlength(a) + font("mono-bold", size).getlength(b) > width - 70
                            for a, b in lines_shown):
        size -= 1
    f = font("mono", size)
    lh = int(size * 1.5)
    h = 70 + lh * max(1, len(lines_shown)) + 24
    im = Image.new("RGBA", (width, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, width - 1, h - 1], radius=24, fill=(6, 10, 8), outline=T["border"], width=2)
    d.text((24, 20), "$ " + title, font=font("mono", 22), fill=T["muted"])
    y = 70
    for label, val in lines_shown:
        d.text((24, y), label, font=f, fill=T["muted"])
        d.text((width - 24 - f.getlength(val), y), val, font=font("mono-bold", size), fill=T["neutral"])
        y += lh
    return im


# ---------------------------------------------------------------- end card
def end_card(img, p, cta, disclaimer, tag):
    a = ease_out(seg(p, 0, 0.25))
    lg = logo(200)
    paste(img, lg, (W // 2, 520 - 30 * (1 - a)), alpha=a, anchor="n")
    text_box(img, "QuanTik", (SAFE["left"], 750, SAFE["right"], 840), "sans-black", 76, T["text"], "center",
             label="end-brand", alpha=a)
    text_box(img, cta, (SAFE["left"] + 20, 860, SAFE["right"] - 20, 1060), "sans-bold", 46, T["accent"], "center",
             label="end-cta", alpha=ease_out(seg(p, 0.15, 0.4)))
    text_box(img, disclaimer, (SAFE["left"] + 20, 1110, SAFE["right"] - 20, 1300), "sans", 26, T["muted"], "center",
             min_size=20, label="end-disclaimer", alpha=ease_out(seg(p, 0.25, 0.5)))
