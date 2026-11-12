"""code-reel: real code types out → it runs → chart → rotating 3D → takeaway → end card."""
import scenes as S

KIND = "video"
DEFAULTS = {"max_seconds": 60}


def build(ep, model, ctx):
    b = ep["beats"]
    return [
        S.hook(ep["hook"], kicker=ep.get("kicker")),
        S.code_typing(model, b[0], min_dur=6.0, latex=ep.get("formula") if ep.get("formula_real", True) else None),
        S.terminal(model, ep["outputs"], b[1], min_dur=5.0),
        S.chart(model, b[2], title=ep.get("chart_title"), min_dur=5.0),
        S.surface(model, b[3], min_dur=5.5),
        S.statement(ep["takeaway"], name="takeaway", size=64, label_chip="Mang về"),
        S.end(ep["cta"], ctx["disclaimer"], ctx["tag"]),
    ]
