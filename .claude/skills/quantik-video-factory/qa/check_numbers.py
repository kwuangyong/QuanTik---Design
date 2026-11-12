"""Every number heard or shown must come from the model run (values.json), a declared fact, or an allowed literal.

Why: the fastest way to lose trust in finance content is a voice-over that says 35% while the chart shows 18%.
Placeholders ({key}) guarantee agreement; this check catches numbers typed by hand into an episode.

Usage: python check_numbers.py <video_out_dir>     (reads narration.json, values.json, episode.filled.json)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
from core import fmt_vi  # noqa: E402

NUM = re.compile(r"(?<![\w])[−\-]?\d+(?:[.,]\d+)*%?x?")
ALL_FORMATS = [f"{k}{d}" for k in ("pct", "num") for d in range(4)] + ["int", "vnd", "x1", "x2"]
# Small integers used as plain words ("3 trạng thái", "1 cổ phiếu") are allowed; anything bigger needs a source.
FREE_INTS = {str(i) for i in range(0, 11)}


def tokens(text):
    return [m.group(0).rstrip(".,") for m in NUM.finditer(text or "")]


def check(texts, values, formats, rendered, allowed_literals=(), facts=None):
    ok_tokens = set(rendered) | FREE_INTS
    for lit in allowed_literals:
        ok_tokens |= set(tokens(lit)) | {lit}
    for f in (facts or {}).values():
        v = f["value"] if isinstance(f, dict) else f
        ok_tokens |= set(tokens(str(v))) | {str(v)}
    for k, v in values.items():
        if isinstance(v, (int, float)):
            for spec in ALL_FORMATS:
                try:
                    ok_tokens.add(fmt_vi(v, spec))
                except Exception:
                    pass
    bad, seen = [], 0
    for text in texts:
        for tok in tokens(text):
            seen += 1
            norm = tok.replace("-", "−")
            if tok in ok_tokens or norm in ok_tokens or tok.rstrip("%x") in FREE_INTS:
                continue
            bad.append({"number": tok, "in": text[:90]})
    return {"fail": bool(bad), "checked": seen, "unsourced": bad}


if __name__ == "__main__":
    d = Path(sys.argv[1])
    nar = json.loads((d / "narration.json").read_text(encoding="utf-8"))
    val = json.loads((d / "values.json").read_text(encoding="utf-8"))
    ep = json.loads((d / "episode.filled.json").read_text(encoding="utf-8"))
    texts = [s["say"] for s in nar["scenes"]] + [t for s in nar["scenes"] for t in s["texts"]] + nar.get("extra", [])
    res = check(texts, val["values"], val["formats"], set(), ep.get("allowed_literals", []), ep.get("facts", {}))
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(1 if res["fail"] else 0)
