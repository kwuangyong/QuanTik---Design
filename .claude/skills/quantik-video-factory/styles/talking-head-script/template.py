"""talking-head-script: script.md (lines, timing, shot list, B-roll) + teleprompter.mp4 for filming yourself.

No synthetic voice and no music: you read the script on camera. The teleprompter scrolls at a calm pace
(≈3,6 syllables/second, same estimate as the voice-over); B-roll stills of the chart and 3D view are
exported to broll/ so the editor can cut them in.
"""
import frames as F
import scenes as S
from core import THEME as T, W
from render import Scene, still

KIND = "video"
VOICE = False
MUSIC = False
DEFAULTS = {"max_seconds": 90}

CUES = {
    "hook": "Nhìn thẳng camera, nói nhanh, không chào hỏi.",
    "beat1": "Cắt sang B-roll: công thức / code (broll/formula.png).",
    "beat2": "Nửa khung là mặt, nửa khung là số liệu (broll/chart.png).",
    "beat3": "B-roll: chart (broll/chart.png), chỉ tay theo đường cam.",
    "beat4": "B-roll: 3D xoay (broll/surface3d.png) hoặc ghép từ bản code-reel.",
    "takeaway": "Quay lại mặt, chậm lại, nhấn câu cuối.",
    "cta": "Chỉ xuống caption / link. Câu miễn trừ đã có trong caption.",
}


def prompter(name, text, cue):
    def draw(img, t, p):
        F.chip(img, (S.X0, 300), name.upper(), T["raised"], 24)
        F.text_box(img, cue, (S.X0 + 200, 296, S.X1, 360), "sans", 24, T["muted"], label=f"{name}-cue")
        # whole paragraph, current reading position highlighted by a moving band
        F.panel(img, (S.X0, 380, S.X1, 1300), fill=(10, 18, 14))
        used = F.text_box(img, text, (S.X0 + 30, 400, S.X1 - 30, 1280), "sans-bold", 64, T["text"], "left", "top",
                          min_size=36, label=name, spacing=1.3, hl_numbers=True)
        # reading guide: an accent bar in the margin that moves down through the paragraph
        top, bottom = used[1], max(used[1] + 60, used[3])
        y = int(top + (bottom - top - 60) * F.clamp(p))
        F.ImageDraw.Draw(img).rounded_rectangle([S.X0 + 8, y, S.X0 + 18, y + 60], radius=5, fill=T["accent"])

    return Scene(name, text, draw, 3.0, texts=[text], subtitles=False)


def build(ep, model, ctx):
    lines = [("hook", ep["hook"])] + [(f"beat{i + 1}", b) for i, b in enumerate(ep["beats"])] + \
            [("takeaway", ep["takeaway"]), ("cta", ep["cta"])]
    ctx["_lines"] = lines
    return [prompter(n, t, CUES.get(n, "")) for n, t in lines]


def export(scenes, ep, model, ctx):
    out = ctx["out"]
    br = out / "broll"
    br.mkdir(exist_ok=True)
    F.math_img(ep["formula"], 90).save(br / "formula.png")
    F.chart_img(model, 1080, 900).save(br / "chart.png")
    F.surface_img(model, -50, 25, 1080, 1000).save(br / "surface3d.png")
    t, rows = 0.0, []
    for s, (name, text) in zip(scenes, ctx["_lines"]):
        rows.append(f"| {t:4.0f}–{t + s.duration:.0f}s | **{name}** | {text} | {CUES.get(name, '')} |")
        t += s.duration
    md = f"""# Kịch bản quay — {ep['id']}

**Chủ đề:** {ep['tag']} · **Thời lượng dự kiến:** {t:.0f}s · **Khung:** dọc 9:16, mặt ở 1/3 trên, chữ không che mặt

| Thời điểm | Đoạn | Lời thoại | Hình / ghi chú quay |
| --- | --- | --- | --- |
{chr(10).join(rows)}

## Chuẩn bị

- Mở `teleprompter.mp4` trên máy tính bảng / điện thoại đặt sát ống kính.
- B-roll trong `broll/`: công thức, chart, 3D — đều tính từ cùng code với số trong lời thoại.
- Đọc đúng số trên kịch bản; đổi số nghĩa là phải chạy lại pipeline (qa/check_numbers.py).
- Thẻ cuối: logo QuanTik + câu miễn trừ (có thể lấy `thumbnail.jpg` của bản code-reel cùng chủ đề).

## Câu miễn trừ (đọc hoặc để chữ ở thẻ cuối)

{ctx['disclaimer']}
"""
    (out / "script.md").write_text(md, encoding="utf-8")
    (out / "final.mp4").rename(out / "teleprompter.mp4") if (out / "final.mp4").exists() else None
    return [out / "script.md"]
