"""Vietnamese voice-over. Tries engines in order and reports which one was used.

  edge    — Microsoft Edge neural voices (vi-VN-HoaiMyNeural / vi-VN-NamMinhNeural). Best quality, needs Internet.
  gtts    — Google Translate TTS. Needs Internet.
  espeak  — espeak-ng offline, robotic; last resort before silence.
  silent  — no voice; scene length estimated from text so subtitles carry the message.

Usage: python voiceover.py "Xin chào" out.wav [--engine edge]
"""
from __future__ import annotations

import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from core import BRAND

VOICES = {"female": "vi-VN-HoaiMyNeural", "male": "vi-VN-NamMinhNeural"}
ENGINES = ["edge", "gtts", "espeak", "silent"]


def lexicon():
    p = BRAND / "pronunciation.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def speakable(text: str) -> str:
    """Rewrite symbols/acronyms so Vietnamese TTS reads them naturally (brand/pronunciation.json)."""
    out = text
    for k, v in sorted(lexicon().items(), key=lambda kv: -len(kv[0])):
        out = re.sub(r"(?<!\w)" + re.escape(k) + r"(?!\w)", v, out)
    out = out.replace("−", "âm ").replace("%", " phần trăm").replace(" + ", " cộng ").replace(" = ", " bằng ")
    return out


def duration_of(path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def estimate_seconds(text: str) -> float:
    # Vietnamese narration ≈ 3,6 syllables/second at a calm explainer pace.
    return 0.6 + len(text.split()) / 3.6


def _to_wav(src, dst):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", "44100", str(dst)], check=True)


def _edge(text, dst, voice, rate):
    import edge_tts

    tmp = Path(dst).with_suffix(".mp3")

    async def go():
        await edge_tts.Communicate(text, voice, rate=rate).save(str(tmp))

    asyncio.run(asyncio.wait_for(go(), timeout=40))
    _to_wav(tmp, dst); tmp.unlink(missing_ok=True)


def _gtts(text, dst, *_):
    from gtts import gTTS

    tmp = Path(dst).with_suffix(".mp3")
    gTTS(text, lang="vi", timeout=20).save(str(tmp))
    _to_wav(tmp, dst); tmp.unlink(missing_ok=True)


def _espeak(text, dst, *_):
    exe = shutil.which("espeak-ng") or shutil.which("espeak")
    if not exe:
        raise RuntimeError("espeak-ng not installed")
    subprocess.run([exe, "-v", "vi", "-s", "150", "-w", str(dst), text], check=True, capture_output=True)


def synth(text, dst, engine="auto", voice="female", rate="+0%"):
    """Write dst (wav). Returns (engine_used, seconds). engine_used == 'silent' means no file was written."""
    order = ENGINES if engine == "auto" else [engine]
    errors = []
    say = speakable(text)
    for e in order:
        if e == "silent":
            return "silent", estimate_seconds(text), errors
        try:
            {"edge": _edge, "gtts": _gtts, "espeak": _espeak}[e](say, dst, VOICES.get(voice, voice), rate)
            return e, duration_of(dst), errors
        except Exception as ex:  # network blocked, package missing...
            errors.append(f"{e}: {type(ex).__name__}: {str(ex)[:120]}")
    return "silent", estimate_seconds(text), errors


def probe_engine(engine="auto", voice="female"):
    """Pick the first engine that works once, so a whole video uses one consistent voice."""
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        used, _, errors = synth("Xin chào.", Path(d) / "probe.wav", engine, voice)
    return used, errors


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("text"); ap.add_argument("out")
    ap.add_argument("--engine", default="auto", choices=["auto"] + ENGINES)
    ap.add_argument("--voice", default="female")
    a = ap.parse_args()
    used, sec, errs = synth(a.text, a.out, a.engine, a.voice)
    print(json.dumps({"engine": used, "seconds": round(sec, 2), "errors": errs}, ensure_ascii=False))
    sys.exit(0)
