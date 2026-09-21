#!/usr/bin/env python3
"""
Check that no two lines of narration are speaking at once, and that the video
never goes quiet for long.

The scene starts a beat's audio when that beat's animation begins. If the
animation is shorter than the line, the next beat starts its own clip while the
previous one is still playing, and the result is two voices over each other.
Nothing else catches this: every clip is correct, every clip verifies, the
animation is right, and the video is unlistenable.

    uv run --group tts --group video python video/tools/check_timing.py \\
        --script tech_news_2026_09_07_short

Reads the beat log the scene writes and the durations the renderer wrote, and
compares them. Exits non-zero if anything overlaps.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

OVERLAP_TOLERANCE = 0.05     # rounding, not a second voice
SILENCE_LIMIT = 4.0          # longer than this and the video has stalled
STILL_LIMIT = 6.0            # a frame held this long has run out of things to say


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--script", required=True)
    ap.add_argument("--timing", default=None)
    args = ap.parse_args()

    durations = json.loads(
        (ROOT / "out" / "audio" / args.script / "durations.json").read_text())
    timing_path = Path(args.timing) if args.timing else \
        ROOT / "out" / f"timing_{args.script.replace('tech_news_', '')}.json"
    beats = json.loads(timing_path.read_text())

    print(f"{'beat':18s} {'starts':>8s} {'speaks':>7s} {'ends':>8s}   note")
    problems, previous_end, previous_key = [], 0.0, None
    for beat in beats:
        key, start = beat["key"], beat["start"]
        length = durations.get(key, beat.get("dur", 0.0))
        end = start + length
        note = ""
        overlap = previous_end - start
        if overlap > OVERLAP_TOLERANCE:
            note = f"TWO VOICES for {overlap:.1f}s, over {previous_key}"
            problems.append((key, note))
        elif previous_key and -overlap > SILENCE_LIMIT:
            note = f"silent for {-overlap:.1f}s"
            problems.append((key, note))
        still = beat.get("still", 0.0)
        if still > STILL_LIMIT:
            note = (note + "  " if note else "") + f"still for {still:.0f}s"
            problems.append((key, f"nothing moves for {still:.0f}s"))
        print(f"{key:18s} {start:8.2f} {length:7.2f} {end:8.2f}   {note}")
        previous_end, previous_key = end, key

    if problems:
        print(f"\n{len(problems)} problem(s). Both failures have the same cause: "
              f"a beat whose animation is shorter than its line. Give the beat "
              f"more to show, or split the line across the beats that follow it.")
        return 1
    print(f"\n{len(beats)} beats, none overlapping, no silence over "
          f"{SILENCE_LIMIT:.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
