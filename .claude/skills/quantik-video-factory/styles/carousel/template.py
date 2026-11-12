"""carousel: 7 swipeable slides — 1080x1920 (TikTok photo mode) and 1080x1350 (Facebook / Instagram feed).

The 1350 version is a crop of the 9:16 slide from y=150 to y=1500, which is exactly the safe zone, so one
layout serves both.
"""
import frames as F
import scenes as S
from core import THEME as T
from render import Scene, still

KIND = "carousel"
VOICE = False


def _swipe(img, p):
    F.text_box(img, "Lướt để xem →", (S.X0, 1240, S.X1, 1300), "sans-bold", 34, T["accent"], "right",
               label="swipe")


def build(ep, model, ctx):
    def cover(img, t, p):
        S.hook(ep["hook"], kicker=ep.get("kicker")).draw(img, 99, 1.0)
        _swipe(img, p)

    def myth_fact(img, t, p):
        F.chip(img, (S.X0, 330), "BẠN NGHĨ", T["negative"], 28)
        F.text_box(img, ep["myth"], (S.X0, 400, S.X1, 760), "sans-bold", 52, T["text"], label="myth",
                   hl_numbers=True)
        F.chip(img, (S.X0, 800), "THỰC RA", T["positive"], 28)
        F.text_box(img, ep["fact"], (S.X0, 870, S.X1, 1300), "sans-bold", 52, T["text"], label="fact",
                   hl_numbers=True)

    slides = [
        Scene("01-cover", "", cover, 1, texts=[ep["hook"], ep.get("kicker", "")]),
        S.formula(ep["formula"], "", name="02-formula", caption=ep["symbols"][0]["say"], wipe=False),
        S.chart(model, "", name="03-chart", reveal=False, notes=[(0, ep["beats"][2])]),
        S.surface(model, "", caption=ep["beats"][3], name="04-surface3d", sweep=(-55, -55), elev=(26, 26)),
        Scene("05-myth-fact", "", myth_fact, 1, texts=[ep["myth"], ep["fact"]]),
        S.statement(ep["takeaway"], "", name="06-takeaway", size=64, label_chip="Mang về"),
        S.end(ep["cta"], ctx["disclaimer"], ctx["tag"], say=""),
    ]
    slides[-1].name = "07-cta"
    return slides


def export(scenes, ep, model, ctx):
    out = ctx["out"]
    d19, d13 = out / "slides/1080x1920", out / "slides/1080x1350"
    d19.mkdir(parents=True, exist_ok=True); d13.mkdir(parents=True, exist_ok=True)
    files = []
    F.LAYOUT.__init__()
    for s in scenes:
        s.duration = 1.0
        img = still(s, 1.0, ctx["tag"], ctx["note"], d19 / f"{s.name}.png")
        img.crop((0, 150, 1080, 1500)).save(d13 / f"{s.name}.png")
        files += [d19 / f"{s.name}.png", d13 / f"{s.name}.png"]
    from core import save_json
    save_json(out / "layout.json", F.LAYOUT.report())
    return files
