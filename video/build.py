#!/usr/bin/env python3
"""
Build one episode end to end: voice, animation, then a file Notion will accept.

    python3 video/build.py tech_news_2026_09_21              # everything
    python3 video/build.py tech_news_2026_09_21 --skip-tts   # animation only
    python3 video/build.py tech_news_2026_09_21 --quality l  # fast preview

Stages:

1. **Voice.** `tts/render.py` writes one WAV per beat plus `durations.json`.
   Skipped with `--skip-tts`, in which case the scene falls back to estimating
   each beat from its word count, which is close enough to preview layout but
   not close enough to publish.
2. **Animation.** Manim renders the scene, reading those durations so every
   visual beat lasts exactly as long as the line spoken over it.
3. **Delivery.** ffmpeg re-encodes to the Notion profile: 30 fps, constant rate
   factor 28, mono audio at 48 kbit/s. That lands a nine minute episode near
   the workspace's 5 MiB upload cap with the text still crisp. Thirty frames is
   enough because the animation is fades, writes and camera moves rather than
   motion.

Everything is uv-managed: `tts` for the voice, `video` for manim, both pinned
by `uv.lock`. The system packages they build against (cairo, pango, ffmpeg)
are listed in `pyproject.toml`.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

REPO = ROOT.parent
UV = os.environ.get("KB_UV", "uv")
FFMPEG = os.environ.get("KB_FFMPEG", "ffmpeg")

# Both halves are uv dependency groups. They are requested together on every
# call because `uv run --group x` syncs the environment to exactly that group,
# so asking for one at a time would uninstall and reinstall three gigabytes of
# CUDA wheels between the voice stage and the animation stage.
GROUPS = ["--group", "tts", "--group", "video"]

# The profile that fits a Notion upload. The workspace cap is 5 MiB, and a
# four and a half minute episode lands at 4.52 MiB at crf 28, so anything
# longer needs a coarser encode. Try each in turn and stop at the first that
# fits, rather than encoding once and failing at the upload.
NOTION_CAP_MIB = 5.0
NOTION_FPS = "30"

# Height, constant rate factor, audio bitrate. Tried in order until one fits.
# A three minute episode lands on the first rung. An eight minute topic
# overview does not: at that length the audio alone is nearly three megabytes
# at 48 kbit/s, and pushing the video quality down far enough to compensate
# turns the text to mush. Dropping to 720p keeps text sharper than staying at
# 1080p with a brutal rate factor, because these frames are large flat colour
# and text rather than detail.
PROFILES = (
    (1080, 28, "48k"),
    (1080, 31, "48k"),
    (1080, 34, "40k"),
    (720, 30, "40k"),
    (720, 34, "32k"),
    (720, 38, "32k"),
)

SCENES = {
    "tech_news_2026_09_21": ("scenes/tech_news_2026_09_21.py", "TechNews20260921"),
    # The two minute cut is its own edition with its own script; it reuses two
    # detail beats from the full episode by copying their rendered audio in.
    "tech_news_2026_09_21_short": ("scenes/tech_news_2026_09_21_short.py", "Short"),
    "tech_news_2026_09_14_short": ("scenes/tech_news_2026_09_14_short.py", "Short"),
    "tech_news_2026_09_07_short": ("scenes/tech_news_2026_09_07_short.py", "Short"),
    "topic_llms_overview": ("scenes/topic_llms_overview.py", "Overview"),
}


def run(cmd: list, **kw) -> None:
    print("+", " ".join(str(c) for c in cmd), file=sys.stderr)
    subprocess.run([str(c) for c in cmd], check=True, cwd=ROOT, **kw)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("episode", choices=sorted(SCENES))
    ap.add_argument("--skip-tts", action="store_true")
    ap.add_argument("--skip-render", action="store_true")
    ap.add_argument("--quality", default="h", choices=list("lmhpk"),
                    help="manim quality: l 480p15, m 720p30, h 1080p60")
    ap.add_argument("--device", default="auto", help="GPU for the voice render")
    args = ap.parse_args()

    scene_file, scene_class = SCENES[args.episode]

    if not args.skip_tts:
        run([UV, "run", "--project", REPO, *GROUPS,
             "python", "tts/render.py", "--script", args.episode,
             "--device", args.device])

    if not args.skip_render:
        run([UV, "run", "--project", REPO, *GROUPS,
             "python", "-m", "manim", f"-q{args.quality}", "--disable_caching",
             "--media_dir", "out/media", scene_file, scene_class])

    rendered = sorted((ROOT / "out" / "media" / "videos").rglob(f"{scene_class}.mp4"),
                      key=lambda p: p.stat().st_mtime)
    if not rendered:
        raise SystemExit("no rendered file found under out/media/videos")
    source = rendered[-1]

    delivery = ROOT / "out" / f"{args.episode}.mp4"
    size = 0.0
    for height, crf, audio in PROFILES:
        run([FFMPEG, "-y", "-i", source,
             "-r", NOTION_FPS,
             "-vf", f"scale=-2:{height}",
             "-c:v", "libx264", "-crf", str(crf), "-preset", "slow", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", audio, "-ac", "1",
             "-movflags", "+faststart", delivery])
        size = delivery.stat().st_size / (1024 * 1024)
        print(f"  {height}p crf {crf} audio {audio}: {size:.2f} MiB", file=sys.stderr)
        if size <= NOTION_CAP_MIB:
            break

    print(f"\n{delivery} is {size:.2f} MiB")
    if size > NOTION_CAP_MIB:
        print(f"Still over the {NOTION_CAP_MIB} MiB Notion cap at the lowest "
              "profile. The episode is too long to upload whole: shorten it, "
              "or publish it elsewhere and link it from the page.",
              file=sys.stderr)
        return 1
    print("Notion will accept this. Upload it with the content type "
          "application/mp4, which is what the .mp4 extension implies; video/mp4 "
          "is rejected. Write the block as <video src=\"file-upload://ID\">Caption</video>.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
