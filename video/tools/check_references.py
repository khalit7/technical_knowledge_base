#!/usr/bin/env python3
"""
Check that every line pointing at the screen is telling the truth.

The skill requires the narration to refer to the visuals: "the number on the
screen", "look at the loop", "the three kinds of feedback coming up underneath
it now". That is what makes the two halves feel like one thing, and it is also
a new way to be wrong: if the line arrives before the thing it names, or the
thing never appears, the viewer is told to look at something that is not there.
Nothing else in the pipeline catches that. The animation renders fine, the
audio verifies fine, and the video is still wrong.

This finds every deictic phrase in the narration, works out the exact moment it
is spoken in the finished video, and pulls the frame from that moment so it can
be looked at.

    uv run --group tts python video/tools/check_references.py \\
        --script tech_news_2026_09_21_short --scene Short

Frames land in video/out/checks/<episode>/, one per reference, named for the
phrase and its timestamp.
"""

from __future__ import annotations

import argparse
import importlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Phrases that promise the viewer something is visible right now.
DEIXIS = [
    r"\bon the screen\b", r"\bon screen\b", r"\blook at\b", r"\bwatch\b",
    r"\bthis (?:chart|graph|diagram|loop|number|table)\b",
    r"\bthe (?:chart|graph|diagram|axis|bars?|loop)\b",
    r"\b(?:coming up|appearing|underneath|above|below|here)\b",
    r"\bthese\b", r"\bthat (?:chart|graph|diagram|loop|number|bar)\b",
]
DEIXIS_RE = re.compile("|".join(DEIXIS), re.I)


def word_times(path: Path, device: str) -> list[tuple[str, float, float]]:
    from tts.verify import asr
    segments, _ = asr(device).transcribe(str(path), word_timestamps=True, beam_size=5)
    out = []
    for seg in segments:
        for w in (seg.words or []):
            out.append((w.word.strip(), w.start, w.end))
    return out


def find_references(words: list[tuple[str, float, float]]) -> list[tuple[str, float]]:
    """Every deictic phrase, with the moment its first word is spoken."""
    text = " ".join(w for w, _, _ in words)
    hits = []
    for m in DEIXIS_RE.finditer(text):
        # Which word index does this character offset fall in?
        upto = text[: m.start()].count(" ")
        if upto < len(words):
            hits.append((m.group(0), words[upto][1]))
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--script", required=True)
    ap.add_argument("--scene", required=True, help="the manim scene class name")
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--quality", default="1080p60")
    args = ap.parse_args()

    script = importlib.import_module(f"scripts.{args.script}").SCRIPT
    audio_dir = ROOT / "out" / "audio" / args.script
    timing_path = ROOT / "out" / f"timing_{args.script.replace('tech_news_', '')}.json"
    if not timing_path.exists():
        timing_path = next(ROOT.glob("out/timing_*.json"))
    timing = {t["key"]: t["start"] for t in json.loads(timing_path.read_text())}

    videos = sorted(ROOT.glob(f"out/media/videos/**/{args.quality}/*.mp4"),
                    key=lambda p: p.stat().st_mtime)
    if not videos:
        raise SystemExit("no rendered video found; render the scene first")
    video = videos[-1]

    out = ROOT / "out" / "checks" / args.script
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.png"):
        old.unlink()

    ffmpeg = Path(ROOT / "env" / "manim" / "bin" / "ffmpeg")
    rows = []
    for key in script:
        clip = audio_dir / f"{key}.wav"
        if not clip.exists() or key not in timing:
            continue
        words = word_times(clip, args.device)
        for phrase, offset in find_references(words):
            # The clip starts a fifth of a second into the beat: render.py pads
            # every take with silence so two speakers never butt together.
            at = timing[key] + offset - 0.2
            name = re.sub(r"[^a-z0-9]+", "-", phrase.lower()).strip("-")
            frame = out / f"{at:07.2f}_{key}_{name}.png"
            subprocess.run([str(ffmpeg), "-v", "error", "-ss", f"{at:.2f}",
                            "-i", str(video), "-frames:v", "1", "-y", str(frame)],
                           check=False)
            rows.append((at, key, phrase))

    print(f"{len(rows)} screen references, frames in {out}")
    for at, key, phrase in sorted(rows):
        print(f"  {at:7.2f}s  {key:16s} \"{phrase}\"")
    print("\nLook at each frame: the thing the line names has to be visible in it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
