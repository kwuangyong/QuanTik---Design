"""Build knowledge/catalog.json: every QuanTik term, module field and engine as a video topic.

Sources (both repos are read, nothing in them is changed):
  QuanTik---Design  frontend/src/content: legacy/glossary.json, quant-module-terms.ts, quant-action-terms.ts,
                    screening-sheet.ts, home-models.ts
  QuanTik-website   src/content: glossary.js (+ metrics.json, term-education.js), home-models.js
                    backend/quant_engine/quant.py, crawl_data.py — engine classes (real code excerpts)

Usage:
  python catalog.py --design /path/QuanTik---Design --website /path/QuanTik-website
  python catalog.py --list            # print topics from the saved catalog
  python catalog.py --show module_garch_alpha

Re-run whenever the frontends or the engine change; the catalog is committed so the skill works without
the source repos being present.
"""
from __future__ import annotations

import argparse
import ast
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from core import KNOWLEDGE, REPO  # noqa: E402

CATALOG = KNOWLEDGE / "catalog.json"

# priority when the same id appears in several sources (first wins, later ones only fill gaps)
PRIORITY = ["legacy/glossary.json", "quant-module-terms.ts", "quant-action-terms.ts", "screening-sheet.ts",
            "QuanTik---Design/frontend/src/content/home-models.ts", "glossary.js", "home-models.js"]
FIELDS = ["en", "vi", "group", "short", "formulaLatex", "formulaText", "variables", "parameters", "interpretation",
          "usage", "limitations", "example", "conditions", "input", "output", "engineSource", "visual"]

ENGINE_VI = {
    "VNMarketRules": ("Quy tắc thị trường Việt Nam", "Biên độ giá, bước giá và T+2 theo sàn."),
    "CostEngine": ("Chi phí giao dịch", "Phí, thuế và trượt giá ước tính cho một vòng mua bán."),
    "DataQualityEngine": ("Kiểm tra chất lượng dữ liệu", "Chấm điểm dữ liệu giá trước khi cho mô hình chạy."),
    "LiquidityEngine": ("Bộ lọc thanh khoản", "Kiểm tra giá trị giao dịch và sức chứa vị thế."),
    "ActionEngine": ("Bộ quyết định hành động", "Tách điểm xếp hạng khỏi hành động; điều kiện chặn luôn thắng điểm."),
    "SectorEngine": ("Xu hướng ngành", "Gom mã theo ngành, đo xu hướng và lợi suất ngành."),
    "CrossCorrelationEngine": ("Tương quan trễ giữa các mã", "Ma trận tương quan, tương quan trễ và mô hình VAR trong ngành."),
    "DistributionAnalyzer": ("Kiểm định phân phối lợi suất", "Độ lệch, độ nhọn và kiểm định phân phối chuẩn."),
    "StatEngine": ("Thống kê lợi suất", "Lợi suất, chế độ biến động và tự tương quan."),
    "ARIMAEngine": ("ARIMA", "Mô hình tự hồi quy trung bình trượt cho chuỗi lợi suất, chọn bậc theo AIC/BIC."),
    "GARCHEngine": ("GARCH(1,1)-t / EGARCH", "Biến động có điều kiện, phân phối Student-t, hiệu ứng bất đối xứng."),
    "HMMEngine": ("HMM trạng thái thị trường", "Ba trạng thái ẩn từ lợi suất, biến động và thanh khoản."),
    "AlphaEngine": ("Trích xuất alpha", "Gom tín hiệu alpha từ các module."),
    "StructureEngine": ("Cấu trúc giá", "Hỗ trợ/kháng cự, xu hướng và dòng tiền."),
    "MomentumAlphaEngine": ("Momentum đa khung", "Một phiếu momentum gộp nhiều khung, tránh đếm trùng."),
    "HurstRegimeEngine": ("Hurst regime", "Ước lượng tính bền của lợi suất để điều phối trọng số, không bỏ phiếu hướng."),
    "ConditionalResidualReversionEngine": ("Đảo chiều phần dư có điều kiện", "Đảo chiều sau khi trung hoà nhân tố, chỉ bật khi thị trường đi ngang/hồi quy."),
    "CrossSectionalLightGBMEngine": ("LightGBM cắt ngang", "Mô hình LightGBM gộp, point-in-time, dự báo lợi suất 10 phiên tuyệt đối và tương đối."),
    "AgreementEngine": ("Đồng thuận alpha", "Chỉ gộp alpha có hướng; mô hình rủi ro/trạng thái không bỏ phiếu."),
    "FcastEngine": ("Ensemble dự báo", "Gộp các dự báo thành dự báo ròng."),
    "RiskEng": ("Động cơ rủi ro", "ATR, điểm dừng, quy mô vị thế, mô phỏng TP/SL."),
    "AdaptiveScorer": ("Chấm điểm thích ứng", "Robust z-score các nhân tố, điều chỉnh theo trạng thái VN-INDEX."),
    "MetaLabelEngine": ("Meta-label", "Cổng logistic có điều chuẩn, học từ kết quả giao dịch đã quan sát."),
    "FeatureEngine": ("Đặc trưng kỹ thuật", "Tính đặc trưng kỹ thuật cho bộ quét."),
    "ScreeningEngine": ("Quét toàn sàn", "Lọc và xếp hạng mã theo bộ chỉ tiêu."),
    "AnalysisEngine": ("Phân tích kỹ thuật", "Phân tích tổng hợp cho từng mã."),
    "MarketAnalyzer": ("Phân tích thị trường", "Trạng thái và độ rộng thị trường."),
}
SKIP_CLASSES = {"QuantConfig", "DashboardArchitecture", "ScreenerBridge", "QuantPipeline", "SingleSymbolQuantPipeline",
                "ForecastLogger", "DataProvider", "NewsIntegration", "GoogleSheetsExporter", "StockScreener"}

# term id → engine class (first match wins); unmatched terms fall back to a keyword search in the engine code
ENGINE_RULES = [
    (r"egarch|garch|annual_vol|mc_volatility|volatility_regime", "GARCHEngine"),
    (r"hurst", "HurstRegimeEngine"),
    (r"hmm|regime", "HMMEngine"),
    (r"momentum", "MomentumAlphaEngine"),
    (r"lightgbm", "CrossSectionalLightGBMEngine"),
    (r"residual", "ConditionalResidualReversionEngine"),
    (r"arima|aic|bic|adf|stationary", "ARIMAEngine"),
    (r"gaussian|skew|kurtosis", "DistributionAnalyzer"),
    (r"sector_corr|corr", "CrossCorrelationEngine"),
    (r"sector", "SectorEngine"),
    (r"liquid|adv20|capacity", "LiquidityEngine"),
    (r"quality|observations|data_", "DataQualityEngine"),
    (r"meta", "MetaLabelEngine"),
    (r"agreement|directional_support|active_model|model_coverage", "AgreementEngine"),
    (r"net_forecast|ensemble|confidence|forecast", "FcastEngine"),
    (r"cost|fee|commission|slippage", "CostEngine"),
    (r"monte_carlo|mc_|(^|_)var$|cvar|probability_loss|lock|kelly|risk_reward|(^|_)rr($|_)|stop|take_profit|(^|_)tp\d?($|_)"
     r"|entry|(^|_)atr($|_)|position|risk_pct|sizing|gap|(^|_)sl($|_)|quantity", "RiskEng"),
    (r"gate|decision|executable|action", "ActionEngine"),
    (r"cmf|_er$|^er$|module_er|r2|slope|rs20|flow|support|resistance", "StructureEngine"),
    (r"quant_score|quant_factor|score", "AdaptiveScorer"),
    (r"ref|ceil|floor|tick|band", "VNMarketRules"),
]

# terms whose idea matches one of the 8 runnable demo models → reuse its chart / 3D / code-run scenes
FAMILY_RULES = [
    (r"egarch|garch|annual_vol|volatility", "garch"),
    (r"hurst", "hurst"),
    (r"hmm|regime", "hmm"),
    (r"monte_carlo|mc_|probability_loss|lock_drawdown|home_monte", "monte_carlo"),
    (r"cvar|var$|^var|kurtosis|skew|gaussian", "var_cvar"),
    (r"sharpe|sortino|calmar|psr|dsr|annual_return|max_drawdown|win_rate", "sharpe"),
    (r"kelly|risk_reward", "kelly"),
    (r"residual|stationary|adf|reversion", "ou"),
]


def _match(rules, tid):
    for pat, val in rules:
        if re.search(pat, tid):
            return val
    return None


def run_dump(design, website):
    cmd = ["node", "--experimental-strip-types", str(HERE / "catalog_dump.mjs"), str(design)] + ([str(website)] if website else [])
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-2000:])
    return json.loads(r.stdout)


def _rank(src):
    for i, key in enumerate(PRIORITY):
        if key in src:
            return i
    return len(PRIORITY)


def merge_terms(raw):
    terms = {}
    for e in sorted(raw, key=lambda e: _rank(e["_source"])):
        t = terms.setdefault(e["id"], {"id": e["id"], "sources": []})
        t["sources"].append(e["_source"])
        for f in FIELDS:
            v = e.get(f)
            if v not in (None, "", []) and not t.get(f):
                t[f] = v.strip() if isinstance(v, str) else v
    return terms


def engines(website):
    out = {}
    if not website:
        return out
    for rel in ("backend/quant_engine/quant.py", "backend/quant_engine/crawl_data.py"):
        p = Path(website) / rel
        if not p.exists():
            continue
        src = p.read_text(encoding="utf-8")
        lines = src.splitlines()
        for n in ast.parse(src).body:
            if not isinstance(n, ast.ClassDef) or n.name in SKIP_CLASSES or n.name not in ENGINE_VI:
                continue
            body = lines[n.lineno - 1:n.end_lineno]
            methods = [m.name for m in n.body if isinstance(m, ast.FunctionDef)]
            out[n.name] = {"file": f"QuanTik-website/{rel}", "line": n.lineno, "end": n.end_lineno, "methods": methods,
                           "doc": (ast.get_docstring(n) or "").strip(), "source": "\n".join(body)}
    return out


def excerpt(cls_src, keywords, max_lines=13, width=60):
    """A short, readable window of real engine code around the first keyword hit (else the first method)."""
    lines = cls_src.splitlines()
    start = None
    for kw in keywords:
        for i, ln in enumerate(lines):
            if kw and kw.lower() in ln.lower() and not ln.strip().startswith(("#", '"', "'")):
                start = max(0, i - 2)
                break
        if start is not None:
            break
    if start is None:
        start = next((i for i, ln in enumerate(lines) if ln.strip().startswith("def ") and "__init__" not in ln), 0)
    win = [ln for ln in lines[start:start + max_lines * 2] if ln.strip()][:max_lines]
    indent = min((len(ln) - len(ln.lstrip()) for ln in win), default=0)
    win = [ln[indent:] for ln in win]
    return "\n".join(ln if len(ln) <= width else ln[: width - 1] + "…" for ln in win)


MAIN_METHODS = ["fit_predict", "fit", "analyze", "combine", "ensemble", "decide", "apply", "audit", "full_test",
                "score_batch", "extract", "sizing", "stops", "sector_trend", "lagged_ccf", "vol_regime", "price_band"]


def _main_methods(methods):
    ranked = [m for m in MAIN_METHODS if m in methods] + [m for m in methods if not m.startswith("_")]
    return [f"def {m}(" for m in ranked] or [""]


def _keywords(tid):
    base = re.sub(r"^(module_|action_|sheet-|home_)", "", tid)
    toks = [base] + [t for t in re.split(r"[_\-]", base) if len(t) > 2]
    return toks


def is_metric(t):
    f = t.get("formulaLatex") or t.get("formulaText") or ""
    plain = re.sub(r"\\text\{[^}]*\}|\\longleftrightarrow|\\rightarrow|[\s{}]", "", f)
    return len(plain) >= 3 and bool(re.search(r"[=+\-*/^_\\]|frac|sum|sqrt", f))


def build(design, website):
    raw = run_dump(design, website)
    terms = merge_terms(raw)
    eng = engines(website)
    topics = []
    for tid, t in sorted(terms.items()):
        t["kind"] = "metric" if is_metric(t) else "field"
        base = re.sub(r"^(module_|action_|sheet-|home_)", "", tid).replace("-", "_")
        cls = _match(ENGINE_RULES, base) or ("ActionEngine" if tid.startswith("action_") else None)
        if not cls or cls not in eng:  # fallback: engine whose code mentions the term most
            kws = _keywords(tid)
            hits = {c: sum(e["source"].lower().count(k.lower()) for k in kws[:1]) for c, e in eng.items()}
            best = max(hits, key=hits.get) if hits else None
            cls = best if best and hits[best] >= 2 else None
        if cls and cls in eng:
            t["engine"] = cls
            t["engine_ref"] = f"{eng[cls]['file']}:{eng[cls]['line']}"
            t["code_excerpt"] = excerpt(eng[cls]["source"], _keywords(tid))
        t["family"] = _match(FAMILY_RULES, base)
        topics.append(t)
    for cls, e in sorted(eng.items()):
        vi, short = ENGINE_VI[cls]
        snake = re.sub(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])", "_", cls).lower()
        tid = "engine_" + re.sub(r"_(engine|eng)$", "", snake)
        topics.append({"id": tid, "en": cls, "vi": vi, "short": e["doc"].split("\n")[0] or short,
                       "usage": short, "kind": "engine", "engine": cls, "engine_ref": f"{e['file']}:{e['line']}",
                       "n_lines": e["end"] - e["line"] + 1,
                       "methods": e["methods"], "code_excerpt": excerpt(e["source"], _main_methods(e["methods"])),
                       "family": _match(FAMILY_RULES, cls.lower()), "sources": [e["file"]],
                       "group": "Engine"})
    commit = lambda p: subprocess.run(["git", "-C", str(p), "rev-parse", "--short", "HEAD"], capture_output=True,
                                      text=True).stdout.strip() if p else ""
    return {"built": dt.date.today().isoformat(),
            "sources": {"QuanTik---Design": commit(design), "QuanTik-website": commit(website)},
            "counts": {k: sum(1 for t in topics if t["kind"] == k) for k in ("metric", "field", "engine")},
            "topics": topics}


def write_md(cat):
    rows = ["# Catalog chủ đề QuanTik", "",
            f"Sinh bởi `pipeline/catalog.py` ngày {cat['built']} từ QuanTik---Design `{cat['sources']['QuanTik---Design']}` "
            f"và QuanTik-website `{cat['sources']['QuanTik-website']}`. Đừng sửa tay — chạy lại script.", "",
            f"**{len(cat['topics'])} chủ đề**: {cat['counts']['metric']} chỉ số có công thức, "
            f"{cat['counts']['engine']} engine, {cat['counts']['field']} trường mô tả (ít hợp làm video riêng).", "",
            "Mọi id dưới đây dùng được làm `--topics`. Cột *Mô hình demo* là mô hình chạy code thật dùng cho chart/3D; "
            "trống nghĩa là video dùng công thức, ngưỡng đọc và code trích từ engine.", "",
            "| id | Tên | Nhóm | Loại | Engine | Mô hình demo |", "| --- | --- | --- | --- | --- | --- |"]
    for t in sorted(cat["topics"], key=lambda t: ({"engine": 0, "metric": 1, "field": 2}[t["kind"]], t["id"])):
        name = (t.get("vi") or "") + (f" ({t['en']})" if t.get("en") and t.get("en") != t.get("vi") else "")
        rows.append(f"| `{t['id']}` | {name.replace('|', '/')} | {(t.get('group') or '').replace('|', '/')} | {t['kind']} | "
                    f"{t.get('engine', '')} | {t.get('family') or ''} |")
    (KNOWLEDGE / "CATALOG.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


def load():
    return json.loads(CATALOG.read_text(encoding="utf-8")) if CATALOG.exists() else {"topics": []}


def get(tid):
    for t in load()["topics"]:
        if t["id"] == tid:
            return t
    return None


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--design", default=str(REPO))
    ap.add_argument("--website")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--show")
    a = ap.parse_args()
    if a.list:
        for t in load()["topics"]:
            print(f"{t['id']:<34} {t['kind']:<7} {t.get('vi', '')[:50]}")
    elif a.show:
        print(json.dumps(get(a.show), ensure_ascii=False, indent=2))
    else:
        cat = build(Path(a.design), Path(a.website) if a.website else None)
        CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=1), encoding="utf-8")
        write_md(cat)
        print(f"wrote {CATALOG} — {len(cat['topics'])} topics {cat['counts']}")
