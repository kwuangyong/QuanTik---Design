"""meme-quant: short two-beat joke (setup → punch), then one honest line of real math. 12–20 s.

Formats (ep.meme.format):
  expectation-reality — top panel "Kỳ vọng" with a naive smooth line, bottom panel "Thực tế" with the model chart
  nobody-quant        — big text setup, punchline card, no stock meme images (we draw everything ourselves)
"""
import numpy as np

import frames as F
import scenes as S
from core import THEME as T
from render import Scene

KIND = "video"
DEFAULTS = {"max_seconds": 30}


def _naive_line(w, h):
    fig = F.plt.figure(figsize=(w / 100, h / 100))
    ax = fig.add_axes([0.06, 0.12, 0.9, 0.8])
    x = np.linspace(0, 1, 100)
    ax.plot(x, 100 + 30 * x, color=F.hex_(T["positive"]), lw=5)
    ax.set_xticks([]); ax.set_yticks([])
    return F.fig_to_img(fig)


def build(ep, model, ctx):
    m = ep["meme"]
    fmt = m.get("format", "nobody-quant")
    out = []
    if fmt == "expectation-reality":
        naive = _naive_line(S.CW, 300)
        real = F.chart_img(model, S.CW, 330)

        def d_setup(img, t, p):
            F.chip(img, (S.X0, 310), "KỲ VỌNG", T["positive"], 30)
            F.text_box(img, m["setup"], (S.X0, 380, S.X1, 490), "sans-black", 50, T["text"], label="setup")
            F.paste(img, naive, (S.X0, 500), alpha=F.ease_out(F.seg(p, 0, 0.3)))

        def d_punch(img, t, p):
            d_setup(img, 99, 1.0)
            a = F.ease_out(F.seg(p, 0, 0.12))
            F.chip(img, (S.X0, 830), "THỰC TẾ", T["negative"], 30)
            F.text_box(img, m["punch"], (S.X0, 900, S.X1, 970), "sans-black", 46, T["accent"], label="punch",
                       alpha=a)
            F.paste(img, real, (S.X0, 978), alpha=a)

        out += [Scene("setup", m["setup"], d_setup, 2.5, texts=[m["setup"], "KỲ VỌNG"]),
                Scene("punch", m["punch"], d_punch, 3.0, texts=[m["punch"], "THỰC TẾ"])]
    else:
        def d_setup(img, t, p):
            F.text_box(img, m["setup"], (S.X0, 400, S.X1, 700), "sans-black", 72, T["muted"], "left", "middle",
                       label="setup")

        def d_punch(img, t, p):
            d_setup(img, 99, 1.0)
            a = F.ease_out(F.seg(p, 0, 0.12))
            sc = 0.9 + 0.1 * a
            F.panel(img, (S.X0, int(760 + 40 * (1 - sc)), S.X1, 1260), fill=(30, 22, 16), outline=T["accent"])
            F.text_box(img, m["punch"], (S.X0 + 40, 790, S.X1 - 40, 1230), "sans-black", 64, T["text"], "left",
                       "middle", min_size=36, label="punch", hl_numbers=True, alpha=a)

        out += [Scene("setup", m["setup"], d_setup, 2.2, texts=[m["setup"]]),
                Scene("punch", m["punch"], d_punch, 3.0, texts=[m["punch"]])]

    out.append(S.statement(m["truth"], name="truth", size=58, label_chip="Nhưng đúng toán"))
    out.append(S.end(ep["cta"], ctx["disclaimer"], ctx["tag"], min_dur=3.0))
    return out
