"""Make one or many QuanTik videos: topic × style → final.mp4 + captions + QA report.

Examples
  python batch.py --topics garch --styles code-reel
  python batch.py --topics garch,hurst,kelly --styles kinetic-text,myth-buster --scale 0.5
  python batch.py --episode ../episodes/garch-myth.json
  python batch.py --topics var_cvar --styles code-reel --prices ~/data/FPT.csv   # real prices (column 'close')

Each episode = knowledge/models/<topic>.md video_defaults, overridden by styles/<style>/template.py DEFAULTS,
overridden by an episode JSON if given. Numbers in text use {key} / {key:fmt} placeholders filled from the
model run, so what is said always matches what the code computed.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import importlib.util
import json
import shutil
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "qa"))

from core import DEFAULT_OUT, KNOWLEDGE, STYLES, disclaimer, fill_tree, load_json, load_model_kb, save_json  # noqa: E402
from models import TOPICS, Model, load_returns  # noqa: E402
import catalog as C  # noqa: E402
import term_topic as TT  # noqa: E402
import render as R  # noqa: E402
import voiceover as V  # noqa: E402
from assemble import assemble  # noqa: E402
import check_banned, check_format, check_numbers, report  # noqa: E402

STYLE_NAMES = sorted(p.name for p in STYLES.iterdir() if (p / "template.py").exists())


def load_style(style):
    path = STYLES / style / "template.py"
    if not path.exists():
        raise SystemExit(f"unknown style {style!r}; styles: {STYLE_NAMES}")
    spec = importlib.util.spec_from_file_location(f"style_{style.replace('-', '_')}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def merge(*dicts):
    out = {}
    for d in dicts:
        for k, v in (d or {}).items():
            if isinstance(v, dict) and isinstance(out.get(k), dict):
                out[k] = merge(out[k], v)
            else:
                out[k] = v
    return out


def build_episode(topic, style, override=None):
    kb = load_model_kb(topic)
    mod = load_style(style)
    # lowest → highest priority: style defaults, topic defaults, topic×style overrides, episode JSON
    ep = merge(getattr(mod, "DEFAULTS", {}), {k: v for k, v in kb.items() if not k.startswith("_")},
               (kb.get("styles") or {}).get(style, {}), override or {})
    ep.pop("styles", None)
    ep["topic"], ep["style"] = topic, style
    ep.setdefault("id", f"{topic}-{style}")
    return ep, mod


def captions(ep, disc):
    tags = " ".join("#" + h.lstrip("#") for h in ep.get("hashtags", []))
    title = ep.get("title", ep["hook"])
    cap = ep.get("caption", ep["hook"])
    yt_title = (title[:90] + " #Shorts") if len(title) <= 90 else title[:88] + "… #Shorts"
    return f"""# Caption — {ep['id']}

## TikTok
{cap}

{tags}

{disc}

## Facebook / Reels
{title}

{cap}

👉 {ep.get('cta', '')}

{tags}

{disc}

## YouTube Shorts
**Tiêu đề:** {yt_title}

**Mô tả:**
{cap}

{ep.get('cta', '')}

{disc}

{tags} #Shorts
"""


def log_episode(ep, out_dir, status, duration):
    path = KNOWLEDGE / "episodes.csv"
    new = not path.exists()
    with open(path, "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(["id", "date", "topic", "style", "title", "hook", "duration_s", "status", "file",
                        "views_tiktok", "views_reels", "views_youtube", "notes"])
        w.writerow([ep["id"], dt.date.today().isoformat(), ep["topic"], ep["style"], ep.get("title", ""), ep["hook"],
                    f"{duration:.0f}", status, str(out_dir), "", "", "", ""])


def prepare(topic, style, override=None, returns=None):
    """(episode, style module, model) for a hand-written topic or any catalog topic."""
    if topic in TOPICS:
        ep, mod = build_episode(topic, style, override)
        return ep, mod, Model(topic, ep.get("seed"), returns)
    entry = C.get(topic)
    if entry is None:
        raise SystemExit(f"unknown topic {topic!r}. Hand-written: {TOPICS}. Catalog: python catalog.py --list")
    mod = load_style(style)
    model = TT.TermModel(entry, (override or {}).get("seed"), returns)
    why = TT.supports(model, style)
    if why:
        raise SystemExit(f"{topic} × {style}: {why}")
    ep = merge(getattr(mod, "DEFAULTS", {}), TT.episode(entry, model), override or {})
    ep["topic"], ep["style"] = topic, style
    ep.setdefault("id", f"{topic}-{style}")
    return ep, mod, model


def make(topic, style, override=None, out_root=DEFAULT_OUT, engine="auto", voice="female", music=None,
         scale=1.0, fps=30, returns=None, data_label=None, force=False, log=True):
    t_start = time.time()
    ep, mod, model = prepare(topic, style, override, returns)
    out = Path(out_root) / ep["id"]
    work = out / "_work"
    work.mkdir(parents=True, exist_ok=True)
    print(f"\n=== {ep['id']}  ({topic} × {style}) → {out}")

    save_json(out / "values.json", {"topic": topic, "seed": model.seed, "real_data": model.real_data,
                                    "values": model.values, "formats": model.formats, "code": model.code})
    rendered = set()
    filled = fill_tree(ep, model.values, model.formats, rendered)
    disc = disclaimer()
    note = data_label or ("Dữ liệu thật: " + filled.get("data_source", "CSV người dùng") if model.real_data
                          else "Dữ liệu mô phỏng · giáo dục, không phải khuyến nghị")
    ctx = {"tag": filled.get("tag", topic.upper()), "note": note, "disclaimer": disc, "out": out}
    save_json(out / "episode.filled.json", filled)

    result = mod.build(filled, model, ctx)
    kind = getattr(mod, "KIND", "video")

    # ---- pre-render QA on every word that will be heard or seen
    texts = result.get("texts", []) if isinstance(result, dict) else []
    scenes = result["scenes"] if isinstance(result, dict) else result
    corpus = [s.say for s in scenes] + [x for s in scenes for x in s.texts] + texts
    corpus += [filled.get("caption", ""), filled.get("title", "")]
    save_json(out / "narration.json", {"scenes": [{"name": s.name, "say": s.say, "texts": s.texts} for s in scenes],
                                       "extra": texts})
    nums = check_numbers.check(corpus, model.values, model.formats, rendered, filled.get("allowed_literals", []),
                               filled.get("facts", {}))
    banned = check_banned.check(corpus)
    if (nums["fail"] or banned["fail"]) and not force:
        report.write(out, ep, nums, banned, None, status="CHẶN TRƯỚC KHI RENDER")
        print(report.summary(nums, banned, None))
        print(f"  ✗ blocked — fix the episode text (see {out/'qa_report.md'}) or pass --force")
        return {"id": ep["id"], "ok": False, "out": str(out)}

    # ---- voice
    used = "silent"; errors = []
    if kind == "video" and getattr(mod, "VOICE", True):
        used, errors = V.probe_engine(engine, voice)
        print(f"  voice engine: {used}" + (f"  (fallback; {errors[0]})" if errors and used != engine else ""))
    for i, s in enumerate(scenes):
        sec = V.estimate_seconds(s.say) if s.say else 0
        if used != "silent" and s.say:
            wav = work / f"{i:02d}-{s.name}.wav"
            u, sec, _ = V.synth(s.say, wav, used, voice)
            s.audio = str(wav) if u != "silent" else None
        s.duration = max(s.min_dur, sec + 0.45)
    if hasattr(mod, "after_timing"):
        mod.after_timing(scenes, filled, model, ctx)

    fmt = None
    if kind == "carousel":
        files = mod.export(scenes, filled, model, ctx)
        fmt = check_format.check_images(files, out / "layout.json")
        duration = 0
    else:
        silent = work / "video_silent.mp4"
        duration = R.render(scenes, silent, ctx["tag"], note, fps=fps, layout_path=out / "layout.json",
                            srt_path=out / "subtitles.srt", scale=scale)
        final = out / "final.mp4"
        assemble(silent, scenes, final, work, music=("none" if getattr(mod, "MUSIC", True) is False else music))
        R.still(scenes[0], scenes[0].duration * 0.9, ctx["tag"], note, out / "thumbnail.jpg")
        fmt = check_format.check_video(final, out / "layout.json", platform_max=filled.get("max_seconds", 60),
                                       expect_audio=True)
        if hasattr(mod, "export"):
            mod.export(scenes, filled, model, ctx)
    (out / "captions.md").write_text(captions(filled, disc), encoding="utf-8")
    status = "ĐẠT" if not (nums["fail"] or banned["fail"] or fmt["fail"]) else "KHÔNG ĐẠT"
    report.write(out, ep, nums, banned, fmt, status=status, extra={"Giọng đọc": used + (" — " + "; ".join(errors) if errors else ""),
                                                                   "Thời lượng": f"{duration:.1f}s",
                                                                   "Thời gian dựng": f"{time.time() - t_start:.0f}s"})
    print(report.summary(nums, banned, fmt))
    if log:
        log_episode(filled, out, status, duration)
    shutil.rmtree(work, ignore_errors=True)
    return {"id": ep["id"], "ok": status == "ĐẠT", "out": str(out), "voice": used, "duration": duration}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--topics", default="")
    ap.add_argument("--styles", default="")
    ap.add_argument("--episode", action="append", default=[], help="episode JSON (needs topic + style)")
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--voice-engine", default="auto", choices=["auto"] + V.ENGINES)
    ap.add_argument("--voice", default="female", help="female | male | any edge-tts voice id")
    ap.add_argument("--music", default=None, help="path to a licensed track, or 'none'")
    ap.add_argument("--scale", type=float, default=1.0, help="0.5 = fast 540x960 preview")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--prices", help="CSV with a close column → real data instead of simulation")
    ap.add_argument("--data-source", help="label shown on screen for real data, e.g. 'FPT, HOSE, 2023–2025'")
    ap.add_argument("--force", action="store_true", help="render even if pre-render QA fails (never publish that)")
    ap.add_argument("--no-log", action="store_true", help="do not append to knowledge/episodes.csv")
    a = ap.parse_args()

    returns = load_returns(a.prices) if a.prices else None
    jobs = []
    for p in a.episode:
        e = load_json(p)
        jobs.append((e["topic"], e["style"], e))
    topics = [t.strip() for t in a.topics.split(",") if t.strip()]
    if a.topics.strip() in ("all", "catalog"):
        topics = [t["id"] for t in C.load()["topics"] if t["kind"] != "field"]
    for t in topics:
        for s in filter(None, a.styles.split(",")):
            jobs.append((t.strip(), s.strip(), None))
    if not jobs:
        ap.error("give --topics and --styles, or --episode")
    results = []
    for topic, style, override in jobs:
        if a.data_source and override is not None:
            override.setdefault("data_source", a.data_source)
        try:
            results.append(make(topic, style, override, a.out, a.voice_engine, a.voice, a.music, a.scale, a.fps,
                                returns, ("Dữ liệu thật: " + a.data_source) if a.data_source else None, a.force,
                                not a.no_log))
        except SystemExit as ex:  # unsupported topic × style: report and keep going with the batch
            print(f"  ✗ {ex}")
            results.append({"id": f"{topic}-{style}", "ok": False, "error": str(ex)})
    print("\n" + json.dumps(results, ensure_ascii=False, indent=2))
    sys.exit(0 if all(r["ok"] for r in results) else 1)


if __name__ == "__main__":
    main()
