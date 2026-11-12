"""Turn any catalog topic (glossary term, report module field, engine) into a model + episode the styles can render.

What a catalog topic video shows, and why it stays honest:
  * definition, variables, reading thresholds, example, limitations — verbatim-derived from QuanTik's own
    approved definitions (catalog.json), so every number in them is a sourced fact;
  * the engine code that computes it, excerpted read-only from QuanTik-website's quant.py and labelled as such
    (it is not run in the video, so no number is attributed to it);
  * a chart/3D: if the topic belongs to one of the 8 runnable demo families (GARCH, HMM, …) the demo model runs
    and is labelled "minh hoạ bằng mô phỏng"; otherwise a threshold gauge drawn from the definition itself.
"""
from __future__ import annotations

import re

import numpy as np

import catalog as C
from core import THEME, hex_
from models import Model, _style

ACC, POS, NEG, NEU, MUT, TXT = (hex_(THEME[k]) for k in ("accent", "positive", "negative", "neutral", "muted", "text"))

FAMILY_NAME = {"garch": "GARCH", "hmm": "HMM", "hurst": "Hurst", "monte_carlo": "Monte Carlo", "var_cvar": "VaR/CVaR",
               "sharpe": "Sharpe", "kelly": "Kelly", "ou": "Ornstein–Uhlenbeck"}
GREEK = {"α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "σ": r"\sigma", "ε": r"\epsilon", "μ": r"\mu", "ω": r"\omega",
         "θ": r"\theta", "ρ": r"\rho", "τ": r"\tau", "λ": r"\lambda", "Σ": r"\Sigma", "Δ": r"\Delta", "π": r"\pi"}


# ---------------------------------------------------------------- text helpers
def sentences(text, max_chars=170, n=2):
    """First n sentences of text, cut to max_chars at a word boundary."""
    if not text:
        return ""
    text = " ".join(str(text).replace("..", ".").split())
    parts = re.split(r"(?<=[.!?])\s+", text)
    out = ""
    for p in parts[:n]:
        if len(out) + len(p) + 1 > max_chars and out:
            break
        out = (out + " " + p).strip()
    if len(out) > max_chars:
        out = out[:max_chars].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return out


def tex_safe(tex):
    """Map KaTeX-isms to matplotlib mathtext."""
    if not tex:
        return ""
    t = tex
    t = re.sub(r"\\underbrace\{((?:[^{}]|\{[^{}]*\})*)\}_\{(?:[^{}]|\{[^{}]*\})*\}", r"\1", t)
    t = re.sub(r"\\(?:text|textrm|operatorname)\{([^}]*)\}", lambda m: r"\mathrm{" + m.group(1).replace(" ", r"\ ") + "}", t)
    t = t.replace(r"\lvert", "|").replace(r"\rvert", "|").replace(r"\lVert", r"\Vert").replace(r"\rVert", r"\Vert")
    t = t.replace(r"\;", r"\ ").replace(r"\,", r"\,").replace(r"\!", "").replace(r"\dfrac", r"\frac")
    t = t.replace(r"\longleftrightarrow", r"\leftrightarrow").replace(r"\le ", r"\leq ").replace(r"\ge ", r"\geq ")
    t = re.sub(r"\\begin\{[a-z*]+\}|\\end\{[a-z*]+\}|\\\\|&", " ", t)
    return t


def renders(tex):
    import frames as F

    try:
        F.math_img(tex, 40)
        return True
    except Exception:
        return False


_NUM = r"[−\-]?\d+(?:[.,]\d+)?"


def parse_bands(text):
    """'< 0: Tệ …\\n0 – 1: Bình thường\\n> 2: Rất tốt' → [(lo, hi, label, raw_condition)]."""
    bands = []
    for ln in (text or "").splitlines():
        m = re.match(r"\s*(?:[^:<>\d−\-]*?)\s*(<|>|≤|≥)?\s*(" + _NUM + r")\s*%?\s*(?:[–\-—]|đến)?\s*(" + _NUM + r")?\s*%?[^:]*:\s*([^(\n]+)", ln)
        if not m:
            continue
        op, a, b, label = m.group(1), m.group(2), m.group(3), m.group(4).strip().rstrip(".")
        f = lambda s: float(s.replace("−", "-").replace(",", "."))
        if b:
            lo, hi = f(a), f(b)
        elif op in ("<", "≤"):
            lo, hi = None, f(a)
        elif op in (">", "≥"):
            lo, hi = f(a), None
        else:
            continue
        bands.append((lo, hi, label.split(" ")[0] if len(label) > 18 else label, ln.split(":")[0].strip()))
    return bands


def speak_band(cond, label):
    c = cond.replace("<", "dưới").replace(">", "trên").replace("–", "đến").replace("≤", "tối đa").replace("≥", "từ")
    return f"{c} là {label.lower()}"


# ---------------------------------------------------------------- model
class TermModel:
    """Same interface as models.Model, built from a catalog topic."""

    def __init__(self, entry, seed=None, returns=None):
        self.entry = entry
        self.topic = entry["id"]
        self.family = entry.get("family")
        self.demo = Model(self.family, seed, returns) if self.family else None
        self.seed = self.demo.seed if self.demo else 0
        self.real_data = bool(self.demo and self.demo.real_data)
        self.bands = parse_bands(entry.get("interpretation", ""))
        self.values = dict(self.demo.values) if self.demo else {}
        self.formats = dict(self.demo.formats) if self.demo else {}
        self.series = self.demo.series if self.demo else {}
        self.code = entry.get("code_excerpt") or ""
        self.code_title = f"{entry['engine']} · quant.py (trích, chỉ đọc)" if entry.get("engine") else ""
        self.run_title = "cách đọc · theo định nghĩa QuanTik"
        self.has_chart = bool(self.demo) or len(self.bands) >= 2
        self.has_formula = bool(tex_safe(entry.get("formulaLatex", ""))) and renders(tex_safe(entry.get("formulaLatex", "")))
        self.has_surface = bool(self.demo)
        # every number in the approved definition is a sourced fact
        self.fact_text = " ".join(str(entry.get(k, "")) for k in C.FIELDS)

    def plot2d(self, ax, upto=1.0):
        if self.demo:
            self.demo.plot2d(ax, upto)
            return
        _gauge(ax, self.bands, upto)
        _style(ax)

    def surface(self):
        return self.demo.surface() if self.demo else None


def _gauge(ax, bands, upto=1.0):
    finite = [v for lo, hi, *_ in bands for v in (lo, hi) if v is not None]
    span = (max(finite) - min(finite)) or 1.0
    xmin, xmax = min(finite) - 0.35 * span, max(finite) + 0.35 * span
    k = max(1, int(round(len(bands) * upto + 0.49)))
    cols = [NEG, NEU, POS, ACC, POS]
    for i, (lo, hi, label, cond) in enumerate(bands[:k]):
        a, b = (xmin if lo is None else lo), (xmax if hi is None else hi)
        ax.barh(0, b - a, left=a, height=0.55, color=cols[i % len(cols)], alpha=0.85)
        ax.text((a + b) / 2, 0.52, label, ha="center", va="bottom", fontsize=20, color=TXT, weight="bold")
        ax.text((a + b) / 2, -0.52, cond, ha="center", va="top", fontsize=16, color=MUT)
    ax.set_xlim(xmin, xmax); ax.set_ylim(-1.3, 1.3); ax.set_yticks([]); ax.grid(False)


# ---------------------------------------------------------------- episode
def episode(entry, model):
    e = entry
    en, vi = e.get("en") or e["id"], e.get("vi") or e.get("en") or e["id"]
    name = vi if e["kind"] == "engine" else en
    formula = tex_safe(e.get("formulaLatex") or "")
    formula_real = bool(formula) and renders(formula)
    if not formula_real:
        formula = r"\mathrm{" + re.sub(r"[^\w]+", r"\\ ", en)[:40] + "}"
    bands = model.bands
    reading = "; ".join(speak_band(cond, label) for _, _, label, cond in bands[:4]) if bands else ""
    variables = ("Trong công thức, " + sentences(e.get("variables"), 150, 1)) if e.get("variables") else ""
    # order matches the scenes: definition → reading card (terminal) → chart → example / 3D
    beats = [
        sentences(e.get("short") or e.get("usage"), 170),
        (f"Cách đọc theo QuanTik: {reading}." if reading else (variables or sentences(e.get("usage"), 160))),
        (variables if reading else sentences(e.get("usage") or e.get("conditions"), 160)) or beats_fallback(e),
        sentences(e.get("example") or e.get("usage"), 170),
    ]
    if model.demo:  # chart/3D come from the runnable demo family
        beats[2] = (beats[2] + " " if beats[2] else "") + f"Biểu đồ minh hoạ bằng mô hình {FAMILY_NAME[model.family]} chạy trên dữ liệu mô phỏng."
        beats[3] = beats[3] if e.get("example") else f"Hình 3D là mô hình {FAMILY_NAME[model.family]} mô phỏng, xoay để thấy cả phân phối."
    if e["kind"] == "engine":
        beats, extra_rows = _engine_beats(e, model)
    else:
        extra_rows = None
    limits = sentences(e.get("limitations") or e.get("conditions"), 170)
    if e["kind"] == "engine":
        limits = ("Mỗi engine chỉ là một mắt xích. Kết luận cuối cùng còn phải qua cổng dữ liệu, thanh khoản và rủi ro "
                  "của báo cáo.")
    outputs = [{"label": cond, "key": f"band{i}"} for i, (_, _, label, cond) in enumerate(bands[:6])]
    for i, (_, _, label, _) in enumerate(bands[:6]):
        model.values[f"band{i}"] = label
    if not outputs:
        rows = extra_rows or [("Nguồn", e.get("engine") or "báo cáo Quant"), ("Nhóm", e.get("group") or "—")]
        for i, (k, v) in enumerate(rows):
            model.values[f"row{i}"] = str(v)[:28]
            outputs.append({"label": k, "key": f"row{i}"})
    outputs[0]["highlight"] = True
    symbols = []
    for part in re.split(r";\s*", e.get("variables") or ""):
        if ":" in part:
            sym, say = part.split(":", 1)
            sym = sym.strip()
            if 0 < len(sym) <= 8:
                tex = "".join(GREEK.get(ch, ch) for ch in sym).replace(" ", r"\ ")
                if renders(tex):
                    symbols.append({"sym": tex, "say": sentences(say, 110, 1)})
    if not symbols:
        symbols = [{"sym": formula, "say": beats[0]}]
    is_engine = e["kind"] == "engine"
    return {
        "tag": (e.get("engine") if is_engine else en.split("·")[0].split("(")[0].strip())[:22],
        "title": (f"Bên trong QuanTik: {vi}" if is_engine else f"{en} — {vi}: đọc đúng trong báo cáo Quant")[:95],
        "hook": (f"Bên trong QuanTik có một engine tên {e['engine']}. Nó làm gì?" if is_engine
                 else f"Bạn thấy {en} trong báo cáo Quant. Nó đo gì, và không nói điều gì?"),
        "kicker": (e.get("group") or "Báo cáo Quant")[:30],
        "beats": beats,
        "outputs": outputs,
        "takeaway": limits or "Đọc chỉ số cùng điều kiện và giới hạn của mô hình, không đọc riêng lẻ.",
        "cta": "Xem chỉ số này trong phân tích Quant tại quantik.io.vn",
        "myth": f"Chỉ cần nhìn {en} là đủ để kết luận về một mã.",
        "fact": limits or "Mỗi chỉ số chỉ là một góc nhìn, phải đọc cùng điều kiện và giới hạn.",
        "meme": {"format": "nobody-quant", "setup": f"Bạn: “{en} đẹp thế này là ổn rồi!”",
                 "punch": "Dân quant: “Đọc điều kiện đi kèm đã.”",
                 "truth": sentences(e.get("conditions") or e.get("limitations"), 140, 1) or limits},
        "story": [{"at": round((i + 1) / len(bands[:4]), 2), "label": label[:20], "say": f"Vùng {speak_band(cond, label)}."}
                  for i, (_, _, label, cond) in enumerate(bands[:4])] or
                 [{"at": 1.0, "label": en[:20], "say": beats[2]}],
        "formula": formula,
        "formula_parts": [formula],
        "formula_numeric": formula,
        "symbols": symbols[:3],
        "caption": f"{vi} ({en}): {sentences(e.get('short'), 160, 1)} Định nghĩa theo báo cáo Quant của QuanTik.",
        "hashtags": ["quant", "chungkhoan", "dautu", "QuanTik", re.sub(r"[^A-Za-z0-9]", "", en)[:20] or "phantich"],
        "allowed_literals": [],
        "facts": {"catalog": {"value": model.fact_text, "source": f"{(e.get('sources') or ['catalog'])[0]} · id {e['id']}"}},
        "code_title": model.code_title,
        "catalog_topic": True,
        "formula_real": formula_real,
    }


def _engine_beats(e, model):
    cls = e["engine"]
    linked = [t for t in C.load()["topics"] if t.get("engine") == cls and t["kind"] != "engine"]
    methods = [m for m in e.get("methods", []) if not m.startswith("_")]
    model.values.update({"n_methods": len(methods), "n_terms": len(linked), "n_lines": e.get("n_lines", 0)})
    model.formats.update({"n_methods": "int", "n_terms": "int", "n_lines": "int"})
    names = ", ".join(sorted({(t.get("vi") or t.get("en") or "").split("·")[0].strip() for t in linked})[:3])
    model.run_title = f"{cls} · hàm công khai"
    beats = [
        f"{e['vi']}: {e.get('usage', '')} Đây là code trích từ engine QuanTik, chỉ để đọc.",
        f"Engine dài {{n_lines}} dòng code, có {{n_methods}} hàm công khai: {', '.join(methods[:4])}.",
        (f"Biểu đồ minh hoạ ý tưởng bằng mô hình {FAMILY_NAME[model.family]} chạy trên dữ liệu mô phỏng."
         if model.demo else f"Tóm tắt {e['vi']}: mục đích và các hàm chính."),
        (f"Kết quả của engine này đi vào {{n_terms}} chỉ số trong báo cáo, ví dụ {names}." if linked
         else "Kết quả của engine này được các module khác dùng làm đầu vào."),
    ]
    rows = [(f"def {m}()", "") for m in methods[:6]] or [("Nguồn", cls)]
    for i, (k, _) in enumerate(rows):
        model.values[f"row{i}"] = ""
    return beats, rows


def beats_fallback(e):
    return sentences(e.get("conditions") or e.get("limitations") or e.get("short"), 160)


def supports(model, style):
    if style == "chart-story" and not model.has_chart:
        return "chủ đề này không có chart (không thuộc họ mô hình demo và không có ngưỡng đọc) — dùng style khác"
    if style == "code-reel" and not model.code:
        return "chủ đề này không có code engine để trích — dùng kinetic-text, whiteboard-math hoặc carousel"
    return None
