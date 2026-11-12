"""chart-story: one chart unfolds chapter by chapter; each chapter stops at a point and names what happened."""
import frames as F
import scenes as S
from core import THEME as T
from render import Scene

KIND = "video"
DEFAULTS = {"max_seconds": 60}


def chapter(model, idx, prev_at, item, n_total):
    """Reveal the chart from prev_at to item['at'] while the chapter label sits at the top."""
    box = (S.X0, 430, S.X1, 1290)
    steps = 40
    S._MODELS[id(model)] = model

    def draw(img, t, p):
        upto = prev_at + (item["at"] - prev_at) * F.ease_in_out(F.seg(p, 0, 0.8))
        step = max(1, int(round(upto * steps)))
        im = S._chart_cached(id(model), step, steps, box[2] - box[0], box[3] - box[1], None)
        F.paste(img, im, (box[0], box[1]))
        F.chip(img, (S.X0, 330), f"Chương {idx}/{n_total}", T["raised"], 24)
        F.text_box(img, item["label"], (S.X0 + 230, 322, S.X1, 410), "sans-black", 54, T["accent"], "left", "middle",
                   min_size=32, label=f"chapter{idx}-label")

    return Scene(f"chapter{idx}", item["say"], draw, 3.5, texts=[item["label"], f"Chương {idx}/{n_total}"])


def build(ep, model, ctx):
    story = ep["story"]
    out = [S.hook(ep["hook"], kicker=ep.get("kicker"))]
    prev = 0.0
    for i, item in enumerate(story, 1):
        out.append(chapter(model, i, prev, item, len(story)))
        prev = item["at"]
    out.append(S.surface(model, ep["beats"][3], min_dur=5.0))
    out.append(S.statement(ep["takeaway"], name="takeaway", size=64, label_chip="Mang về"))
    out.append(S.end(ep["cta"], ctx["disclaimer"], ctx["tag"]))
    return out
