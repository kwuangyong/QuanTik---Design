"""whiteboard-math: the formula is written piece by piece, each symbol explained, then real numbers plugged in."""
import frames as F
import scenes as S
from core import THEME as T
from render import Scene

KIND = "video"
DEFAULTS = {"max_seconds": 75}

BOARD = (S.X0, 330, S.X1, 860)


def _board(img):
    F.panel(img, BOARD, fill=(16, 26, 21), outline=T["border"])


def _put(img, latex, k=1.0, size=78, color=None, y=None):
    im = F.fit_width(F.math_img(latex, size, color), BOARD[2] - BOARD[0] - 60, BOARD[3] - BOARD[1] - 60)
    if k < 1:
        im = im.crop((0, 0, max(1, int(im.width * k)), im.height))
        # pen tip
    x = BOARD[0] + 30
    yy = y if y is not None else (BOARD[1] + BOARD[3]) // 2 - im.height // 2
    F.paste(img, im, (x, yy))
    if k < 1:
        F.ImageDraw.Draw(img).ellipse([x + im.width - 8, yy + im.height // 2 - 8, x + im.width + 8,
                                       yy + im.height // 2 + 8], fill=T["accent"])


def build(ep, model, ctx):
    from core import fmt_vi

    hi = next((o for o in ep["outputs"] if o.get("highlight")), ep["outputs"][0])
    hi_val = fmt_vi(model.values[hi["key"]], hi.get("fmt") or model.formats.get(hi["key"], "num2"))
    parts = ep["formula_parts"]
    full = parts[-1]
    out = [S.hook(ep["hook"], kicker=ep.get("kicker"))]

    def d_write(img, t, p):
        _board(img)
        n = len(parts)
        i = min(n - 1, int(p * n * 1.15))
        k = F.seg(p * n * 1.15 - i, 0, 1)
        _put(img, parts[i], F.ease_in_out(k) if i == n - 1 or k < 1 else 1.0)

    out.append(Scene("write", ep["beats"][0], d_write, 6.0))

    for j, sym in enumerate(ep["symbols"]):
        def d_sym(img, t, p, sym=sym):
            _board(img)
            _put(img, full, 1.0, color=F.hex_(T["muted"]))
            a = F.ease_out(F.seg(p, 0, 0.2))
            F.panel(img, (S.X0, 900, S.X1, 1300), fill=(30, 22, 16), outline=T["accent"])
            sm = F.fit_width(F.math_img(sym["sym"], 80, F.hex_(T["accent"])), 380, 300)
            F.paste(img, sm, (S.X0 + 30, 1100 - sm.height // 2), alpha=a)
            F.text_box(img, sym["say"], (S.X0 + 60 + sm.width, 930, S.X1 - 30, 1270), "sans-bold", 44, T["text"],
                       "left", "middle", min_size=28, label=f"sym{j}", alpha=a)

        out.append(Scene(f"symbol{j + 1}", sym["say"], d_sym, 3.0, texts=[sym["say"]]))

    def d_numbers(img, t, p):
        _board(img)
        _put(img, full, 1.0, size=64, color=F.hex_(T["muted"]), y=BOARD[1] + 60)
        _put(img, ep["formula_numeric"], F.ease_in_out(F.seg(p, 0.05, 0.5)), size=70, color=F.hex_(T["neutral"]),
             y=BOARD[1] + 290)
        a = F.ease_out(F.seg(p, 0.5, 0.65))
        if a > 0:
            F.panel(img, (S.X0, 900, S.X1, 1300), fill=(30, 22, 16), outline=T["accent"])
            F.text_box(img, hi["label"], (S.X0 + 40, 930, S.X1 - 40, 990), "sans-bold", 36, T["muted"], "center",
                       label="numbers-hl-label", alpha=a)
            F.text_box(img, hi_val, (S.X0 + 40, 1000, S.X1 - 40, 1270), "mono-bold", 150, T["accent"], "center",
                       "middle", min_size=60, label="numbers-hl-value", alpha=a)

    out.append(Scene("numbers", ep["beats"][1], d_numbers, 5.0, texts=[hi["label"], hi_val]))
    out.append(S.chart(model, ep["beats"][2], title=ep.get("chart_title"), min_dur=4.5))
    out.append(S.statement(ep["takeaway"], name="takeaway", size=64, label_chip="Mang về"))
    out.append(S.end(ep["cta"], ctx["disclaimer"], ctx["tag"]))
    return out
