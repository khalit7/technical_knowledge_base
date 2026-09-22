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
        --script tech_news_2026_09_21

Frames land in video/out/checks/<episode>/, one per reference, named for the
phrase and its timestamp.
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
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
    ap.add_argument("--scene", default="Episode",
                    help="the manim scene class. A declarative episode always "
                         "renders as Episode, which is the default; pass this "
                         "only for an episode with a bespoke scene file")
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--quality", default="1080p60")
    args = ap.parse_args()

    script = importlib.import_module(f"scripts.{args.script}").SCRIPT
    audio_dir = ROOT / "out" / "audio" / args.script
    # Named after the episode, full stop. This used to strip a "tech_news_"
    # prefix, which matched a filename no scene has ever written, and then
    # fell through to `next(glob("out/timing_*.json"))`: the first arbitrary
    # match, which silently hands you a DIFFERENT episode's beat times as
    # soon as two episodes exist. Every frame it then pulled would be from
    # the wrong moment and the check would still report confidently.
    timing_path = ROOT / "out" / f"timing_{args.script}.json"
    if not timing_path.exists():
        raise SystemExit(f"no beat times for '{args.script}': expected "
                         f"{timing_path}. Render it first.")
    timing = {t["key"]: t["start"] for t in json.loads(timing_path.read_text())}

    # Each episode renders into its own media directory, which is what makes
    # concurrent renders safe. The old whole-tree glob predates that and
    # matches nothing, so the documented command died on every episode.
    videos = sorted(ROOT.glob(f"out/media/{args.script}/videos/**/{args.quality}/*.mp4"),
                    key=lambda p: p.stat().st_mtime)
    if not videos:
        raise SystemExit("no rendered video found; render the scene first")
    video = videos[-1]

    out = ROOT / "out" / "checks" / args.script
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.png"):
        old.unlink()

    ffmpeg = os.environ.get("KB_FFMPEG", "ffmpeg")
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
            subprocess.run([ffmpeg, "-v", "error", "-ss", f"{at:.2f}",
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
