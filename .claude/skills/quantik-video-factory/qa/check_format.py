"""Format checks: 9:16, length, audio, and that no text overflowed its box or left the platform safe zone.

Usage: python check_format.py <video_out_dir>   (checks final.mp4 + layout.json, or slides/*.png for carousels)
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

MIN_S, DEFAULT_MAX_S = 12, 60


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", str(path)],
                       capture_output=True, text=True)
    return json.loads(r.stdout or "{}")


def _layout_issues(layout_path):
    issues = []
    if layout_path and Path(layout_path).exists():
        for it in json.loads(Path(layout_path).read_text(encoding="utf-8")):
            if it["overflow"]:
                issues.append(f"chữ tràn khung: cảnh '{it['scene']}' / {it['label']} (cỡ {it['font_size']})")
            if it["outside_safe"]:
                issues.append(f"chữ ra ngoài vùng an toàn: cảnh '{it['scene']}' / {it['label']} {it['box']}")
    return issues


def check_video(path, layout_path=None, platform_max=DEFAULT_MAX_S, expect_audio=True):
    info = probe(path)
    v = next((s for s in info.get("streams", []) if s["codec_type"] == "video"), None)
    a = next((s for s in info.get("streams", []) if s["codec_type"] == "audio"), None)
    dur = float(info.get("format", {}).get("duration", 0))
    issues, facts = [], {}
    if not v:
        issues.append("không có luồng video")
    else:
        w, h = v["width"], v["height"]
        facts["kích thước"] = f"{w}x{h}"
        if abs(w / h - 9 / 16) > 0.01:
            issues.append(f"không phải 9:16 ({w}x{h})")
        if h < 1280:
            facts["ghi chú"] = "bản xem nhanh độ phân giải thấp — dựng lại --scale 1 trước khi đăng"
    facts["thời lượng"] = f"{dur:.1f}s"
    if dur < MIN_S:
        issues.append(f"quá ngắn ({dur:.1f}s < {MIN_S}s)")
    if dur > platform_max:
        issues.append(f"quá dài ({dur:.1f}s > {platform_max}s)")
    if expect_audio and not a:
        issues.append("không có âm thanh")
    issues += _layout_issues(layout_path)
    return {"fail": bool(issues), "issues": issues, "facts": facts}


def check_images(files, layout_path=None):
    from PIL import Image

    issues, facts = [], {"số slide": len(files)}
    for f in files:
        w, h = Image.open(f).size
        if (w, h) not in ((1080, 1350), (1080, 1920)):
            issues.append(f"{Path(f).name}: kích thước {w}x{h} không chuẩn")
    if not 3 <= len([f for f in files if "1350" in Path(f).parent.name]) <= 10:
        issues.append("carousel nên có 3–10 slide")
    issues += _layout_issues(layout_path)
    return {"fail": bool(issues), "issues": issues, "facts": facts}


if __name__ == "__main__":
    d = Path(sys.argv[1])
    if (d / "final.mp4").exists():
        res = check_video(d / "final.mp4", d / "layout.json")
    else:
        res = check_images(sorted((d / "slides").rglob("*.png")), d / "layout.json")
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(1 if res["fail"] else 0)
