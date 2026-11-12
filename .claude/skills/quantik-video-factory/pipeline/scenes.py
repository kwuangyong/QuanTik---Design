"""Reusable scene builders. Style templates (styles/<name>/template.py) compose these.

Main content area: x 60..940, y 300..1310 (the subtitle bar sits at 1326..1488, inside the safe zone).
"""
from __future__ import annotations

import re
from functools import lru_cache

import frames as F
from core import SAFE, THEME as T
from render import Scene

X0, X1 = SAFE["left"], SAFE["right"]
TOP, BOT = 300, 1310
CW = X1 - X0


def hook(text, say=None, kicker=None, min_dur=2.6):
    """Big hook text that pops in word by word (first 1-2 s decide whether people keep watching)."""
    words = text.split()

    def draw(img, t, p):
        k = max(1, int(len(words) * F.ease_out(F.seg(p, 0, 0.45)) + 0.999))
        if kicker:
            F.chip(img, (X0, 420), kicker, T["accent"], 28)
        F.text_box(img, " ".join(words[:k]), (X0, 520, X1, 1200), "sans-black", 92, T["text"], "left", "middle",
                   min_size=48, label="hook", spacing=1.12, hl_numbers=True)
        w = int(CW * 0.35 * F.ease_out(F.seg(p, 0.1, 0.5)))
        F.ImageDraw.Draw(img).rounded_rectangle([X0, 1230, X0 + w, 1242], radius=6, fill=T["accent"])

    return Scene("hook", say if say is not None else text, draw, min_dur, texts=[text, kicker or ""])


def statement(text, say=None, name="statement", color=None, size=72, min_dur=2.5, label_chip=None):
    def draw(img, t, p):
        a = F.ease_out(F.seg(p, 0, 0.2))
        if label_chip:
            F.chip(img, (X0, 440), label_chip, T["accent"], 26)
        F.text_box(img, text, (X0, 540 + 30 * (1 - a), X1, 1250), "sans-black", size, color or T["text"], "left",
                   "middle", min_size=40, label=name, hl_numbers=True, alpha=a)

    return Scene(name, say if say is not None else text, draw, min_dur, texts=[text, label_chip or ""])


@lru_cache(maxsize=256)
def _chart_cached(model_id, step, steps, w, h, title):
    return F.chart_img(_MODELS[model_id], w, h, upto=max(0.02, step / steps), title=title)


_MODELS = {}


def chart(model, say, title=None, name="chart", reveal=True, notes=None, min_dur=3.5, box=None):
    """2D model chart revealed left to right; optional notes = [(progress, text)] shown below."""
    _MODELS[id(model)] = model
    box = box or ((X0, 340, X1, 1120) if notes else (X0, 340, X1, 1300))
    w, h = box[2] - box[0], box[3] - box[1]
    steps = 24

    def draw(img, t, p):
        step = steps if not reveal else max(1, int(steps * F.ease_in_out(F.seg(p, 0, 0.75)) + 0.5))
        im = _chart_cached(id(model), step, steps, w, h, title)
        F.paste(img, im, (box[0], box[1]))
        if notes:
            shown = [n for at, n in notes if p >= at]
            if shown:
                F.text_box(img, shown[-1], (X0, box[3] + 30, X1, BOT), "sans-bold", 40, T["neutral"], "left", "top",
                           min_size=28, label=f"{name}-note", hl_numbers=True)

    return Scene(name, say, draw, min_dur, texts=[title or ""] + [n for _, n in (notes or [])])


@lru_cache(maxsize=512)
def _surface_cached(model_id, azim, elev, w, h):
    return F.surface_img(_MODELS[model_id], azim, elev, w, h)


def surface(model, say, caption=None, name="surface3d", min_dur=4.0, sweep=(-75, 15), elev=(32, 22)):
    """Rotating 3D view of the model (density surface / regime trajectory)."""
    _MODELS[id(model)] = model
    w, h = CW, 860

    def draw(img, t, p):
        e = F.ease_in_out(p)
        az = int(sweep[0] + (sweep[1] - sweep[0]) * e)
        el = int(elev[0] + (elev[1] - elev[0]) * e)
        F.paste(img, _surface_cached(id(model), az, el, w, h), (X0, 330))
        if caption:
            F.text_box(img, caption, (X0, 1200, X1, BOT), "sans-bold", 36, T["muted"], "left", "top", min_size=26,
                       label=f"{name}-caption", hl_numbers=True)

    return Scene(name, say, draw, min_dur, texts=[caption or ""])


def formula(latex, say, name="formula", caption=None, min_dur=3.0, size=72, wipe=True):
    def draw(img, t, p):
        im = F.fit_width(F.math_img(latex, size), CW - 40, 520)
        if wipe:
            k = F.ease_in_out(F.seg(p, 0, 0.6))
            im = im.crop((0, 0, max(1, int(im.width * k)), im.height))
        F.panel(img, (X0, 470, X1, 1070), fill=T["surface"])
        F.paste(img, im, (X0 + 20, 770 - im.height // 2))
        if caption:
            F.text_box(img, caption, (X0, 1110, X1, BOT), "sans-bold", 40, T["muted"], "left", "top", min_size=28,
                       label=f"{name}-caption", hl_numbers=True)

    return Scene(name, say, draw, min_dur, texts=[caption or ""])


def code_typing(model, say, name="code", min_dur=5.0, title=None, latex=None):
    """Type out the exact source that produced the numbers; the formula it implements fades in below."""
    code = model.code
    total = len(code)

    def draw(img, t, p):
        n = int(total * F.ease_in_out(F.seg(p, 0, 0.85)))
        im = F.fit_width(F.code_panel(code, CW, chars=n if n < total else None, title=title or f"{model.topic}.py"),
                         CW, 760)
        F.paste(img, im, (X0, 330))
        if latex:
            y = 330 + im.height + 40
            fm = F.fit_width(F.math_img(latex, 54, F.hex_(T["accent"])), CW, BOT - y)
            F.paste(img, fm, (X0 + CW // 2, y + (BOT - y - fm.height) // 2), alpha=F.ease_out(F.seg(p, 0.2, 0.5)),
                    anchor="n")

    return Scene(name, say, draw, min_dur)


def terminal(model, outputs, say, name="run", min_dur=4.0):
    """outputs: [{"label": "α + β", "key": "persistence", "fmt": optional}] — values from the model run."""
    from core import fmt_vi

    rows = [(o["label"], fmt_vi(model.values[o["key"]], o.get("fmt") or model.formats.get(o["key"], "num2")))
            for o in outputs]

    hi = next((r for o, r in zip(outputs, rows) if o.get("highlight")), rows[min(2, len(rows) - 1)])

    def draw(img, t, p):
        k = min(len(rows), int(len(rows) * F.seg(p, 0.05, 0.7)) + 1)
        im = F.terminal_panel(rows[:k], CW, title=f"{model.topic}.py")
        F.paste(img, im, (X0, 340))
        a = F.ease_out(F.seg(p, 0.7, 0.85))
        if a > 0:
            y = 340 + F.terminal_panel(rows, CW).height + 50
            F.panel(img, (X0, y, X1, BOT), fill=(30, 22, 16), outline=T["accent"])
            F.text_box(img, hi[0], (X0 + 40, y + 30, X1 - 40, y + 90), "sans-bold", 36, T["muted"], "center",
                       label=f"{name}-hl-label", alpha=a)
            F.text_box(img, hi[1], (X0 + 40, y + 100, X1 - 40, BOT - 30), "mono-bold", 150, T["accent"], "center",
                       "middle", min_size=60, label=f"{name}-hl-value", alpha=a)

    return Scene(name, say, draw, min_dur, texts=[f"{a} {b}" for a, b in rows])


def end(cta, disclaimer, tag, min_dur=3.5, say=None):
    def draw(img, t, p):
        F.end_card(img, p, cta, disclaimer, tag)

    return Scene("end", say if say is not None else cta, draw, min_dur, texts=[cta, disclaimer], header=False)


def first_number(text):
    m = re.search(r"[−\-]?\d[\d.]*(?:,\d+)?%?x?", text)
    return m.group(0) if m else None
