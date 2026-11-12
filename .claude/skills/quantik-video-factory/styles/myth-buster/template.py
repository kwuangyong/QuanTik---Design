"""myth-buster: "Bạn nghĩ X" (top, red) → "Thực ra Y" (bottom, green) with the chart as evidence."""
import frames as F
import scenes as S
from core import THEME as T
from render import Scene

KIND = "video"
DEFAULTS = {"max_seconds": 60}

TOP_BOX = (S.X0, 330, S.X1, 790)
BOT_BOX = (S.X0, 830, S.X1, 1300)


def _card(img, box, label, text, color, a, strike=0.0, name="card"):
    x0, y0, x1, y1 = box
    off = int(60 * (1 - a))
    F.panel(img, (x0, y0 + off, x1, y1 + off), fill=(int(color[0] * .14), int(color[1] * .14), int(color[2] * .14)),
            outline=color)
    F.chip(img, (x0 + 30, y0 + 30 + off), label, color, 28)
    F.text_box(img, text, (x0 + 34, y0 + 110 + off, x1 - 34, y1 - 30 + off), "sans-bold", 56, T["text"], "left",
               "top", min_size=32, label=name, hl_numbers=True, alpha=a)
    if strike > 0:
        d = F.ImageDraw.Draw(img)
        d.line([(x0 + 20, y1 - 20), (x0 + 20 + (x1 - x0 - 40) * strike, y0 + 20)], fill=color, width=10)


def build(ep, model, ctx):
    myth, fact = ep["myth"], ep["fact"]

    def d_myth(img, t, p):
        _card(img, TOP_BOX, "BẠN NGHĨ", myth, T["negative"], F.ease_out(F.seg(p, 0, 0.2)), name="myth")

    def d_fact(img, t, p):
        _card(img, TOP_BOX, "BẠN NGHĨ", myth, T["negative"], 1.0, strike=F.ease_out(F.seg(p, 0, 0.15)), name="myth")
        _card(img, BOT_BOX, "THỰC RA", fact, T["positive"], F.ease_out(F.seg(p, 0.1, 0.3)), name="fact")

    return [
        S.hook(ep["hook"], kicker="Hiểu lầm phổ biến"),
        Scene("myth", myth, d_myth, 3.5, texts=[myth, "BẠN NGHĨ"]),
        Scene("fact", fact, d_fact, 4.5, texts=[fact, "THỰC RA"]),
        S.chart(model, ep["beats"][2], title=ep.get("chart_title"), name="evidence", min_dur=5.0,
                notes=[(0.0, "Bằng chứng từ code chạy thật")]),
        S.surface(model, ep["beats"][3], min_dur=4.5),
        S.statement(ep["takeaway"], name="takeaway", size=64, label_chip="Mang về"),
        S.end(ep["cta"], ctx["disclaimer"], ctx["tag"]),
    ]
