"""Scan narration, on-screen text and captions for phrases banned in brand/compliance.md.

Usage: python check_banned.py <video_out_dir>    or    python check_banned.py --text "câu cần kiểm tra"
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
from core import disclaimer, load_banned  # noqa: E402


def norm(s):
    return unicodedata.normalize("NFC", s or "").lower()


def check(texts):
    banned = load_banned()
    disc = norm(disclaimer())
    hits = []
    for text in texts:
        # the mandatory disclaimer itself says "không phải khuyến nghị mua bán" — do not flag it
        t = " ".join(norm(text).split()).replace(disc, " ")
        for phrase in banned:
            if re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", t):
                hits.append({"phrase": phrase, "in": text[:100]})
    return {"fail": bool(hits), "checked_phrases": len(banned), "hits": hits}


if __name__ == "__main__":
    if sys.argv[1] == "--text":
        res = check([" ".join(sys.argv[2:])])
    else:
        d = Path(sys.argv[1])
        nar = json.loads((d / "narration.json").read_text(encoding="utf-8"))
        texts = [s["say"] for s in nar["scenes"]] + [t for s in nar["scenes"] for t in s["texts"]] + nar.get("extra", [])
        cap = d / "captions.md"
        if cap.exists():
            texts.append(cap.read_text(encoding="utf-8"))
        res = check(texts)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(1 if res["fail"] else 0)
