"""Render a list of Scenes to a silent 1080x1920 H.264 file (frames piped straight into ffmpeg).

Also writes subtitles.srt and layout.json (every text box, overflow and safe-zone flags) for QA.
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from typing import Callable

from core import FPS, H, W, save_json
import frames as F


@dataclass
class Scene:
    name: str
    say: str = ""                      # narration for this scene (already filled with computed numbers)
    draw: Callable = None              # draw(img, t_seconds, progress_0_1)
    min_dur: float = 2.5
    texts: list = field(default_factory=list)   # on-screen words (QA scans them for numbers / banned phrases)
    header: bool = True
    subtitles: bool = True
    duration: float = 0.0
    audio: str | None = None


def chunk_text(text, max_chars=66):
    """Split narration into subtitle chunks of at most ~2 lines."""
    parts = [p.strip() for p in re.split(r"(?<=[.!?…;])\s+", text.strip()) if p.strip()]
    chunks = []
    for p in parts:
        while len(p) > max_chars:
            cut = p.rfind(", ", 0, max_chars)
            if cut < max_chars * 0.4:
                cut = p.rfind(" ", 0, max_chars)
            chunks.append(p[: cut + (1 if p[cut] == "," else 0)].strip())
            p = p[cut + 1:].strip()
        if p:
            chunks.append(p)
    return chunks


def timed_chunks(text, start, dur, lead=0.15):
    chunks = chunk_text(text)
    total = sum(len(c) for c in chunks) or 1
    t, out = start + lead, []
    usable = max(0.5, dur - lead - 0.2)
    for c in chunks:
        d = usable * len(c) / total
        out.append((t, t + d, c))
        t += d
    return out


def srt_time(s):
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


def render(scenes, out_path, tag, note, fps=FPS, layout_path=None, srt_path=None, scale=1.0, log=print):
    ow, oh = int(W * scale) // 2 * 2, int(H * scale) // 2 * 2
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(fps), "-i", "-"]
    if scale != 1.0:
        cmd += ["-vf", f"scale={ow}:{oh}:flags=lanczos"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20" if scale == 1.0 else "26",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = sum(s.duration for s in scenes)
    srt, t0, idx = [], 0.0, 1
    F.LAYOUT.__init__()
    for s in scenes:
        F.LAYOUT.scene = s.name
        chunks = timed_chunks(s.say, t0, s.duration) if (s.say and s.subtitles) else []
        for c0, c1, c in chunks:
            srt.append(f"{idx}\n{srt_time(c0)} --> {srt_time(c1)}\n{c}\n"); idx += 1
        n = max(1, int(round(s.duration * fps)))
        log(f"  render {s.name:<14} {s.duration:5.1f}s {n} frames")
        for i in range(n):
            t = i / fps
            img = F.base()
            if s.header:
                F.header(img, tag, note)
            s.draw(img, t, t / s.duration)
            gt = t0 + t
            cur = next((c for c0, c1, c in chunks if c0 <= gt < c1), "")
            if s.subtitles:
                F.subtitle(img, cur)
            F.progress(img, gt / total)
            proc.stdin.write(img.tobytes())
        t0 += s.duration
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError("ffmpeg failed while encoding frames")
    if layout_path:
        save_json(layout_path, F.LAYOUT.report())
    if srt_path:
        open(srt_path, "w", encoding="utf-8").write("\n".join(srt))
    return total


def still(scene, t, tag, note, path, size=None):
    """Render one frame of a scene to PNG (thumbnails, carousel slides)."""
    F.LAYOUT.scene = scene.name
    img = F.base()
    if scene.header:
        F.header(img, tag, note)
    scene.draw(img, t, min(1.0, t / max(scene.duration, 1e-6)))
    if size:
        img = img.resize(size, F.Image.LANCZOS)
    img.save(path)
    return img
