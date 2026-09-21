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

Environments are separate on purpose: manim comes from conda-forge (it needs
cairo and pango, which have no Linux wheels) and the text-to-speech stack is a
CUDA 12.8 virtualenv. `env.sh` holds both paths.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

MANIM_PY = Path(os.environ.get("KB_MANIM_PYTHON",
                               Path.home() / "manim-tech-news" / "menv" / "bin" / "python"))
TTS_PY = Path(os.environ.get("KB_TTS_PYTHON",
                             Path.home() / "manim-tech-news" / ".tts" / "bin" / "python"))
FFMPEG = Path(os.environ.get("KB_FFMPEG",
                             Path.home() / "manim-tech-news" / "menv" / "bin" / "ffmpeg"))

# The profile that fits a Notion upload. Do not raise these without checking the
# resulting file size: the workspace cap is 5 MiB.
NOTION_CRF = "28"
NOTION_FPS = "30"
NOTION_AUDIO_KBPS = "48k"

SCENES = {
    "tech_news_2026_09_21": ("scenes/tech_news_2026_09_21.py", "TechNews20260921"),
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
        if not TTS_PY.exists():
            raise SystemExit(f"no text-to-speech interpreter at {TTS_PY}; see video/README.md")
        run([TTS_PY, "tts/render.py", "--script", args.episode, "--device", args.device])

    if not args.skip_render:
        if not MANIM_PY.exists():
            raise SystemExit(f"no manim interpreter at {MANIM_PY}; see video/README.md")
        run([MANIM_PY, "-m", "manim", f"-q{args.quality}", "--disable_caching",
             "--media_dir", "out/media", scene_file, scene_class])

    rendered = sorted((ROOT / "out" / "media" / "videos").rglob(f"{scene_class}.mp4"),
                      key=lambda p: p.stat().st_mtime)
    if not rendered:
        raise SystemExit("no rendered file found under out/media/videos")
    source = rendered[-1]

    delivery = ROOT / "out" / f"{args.episode}.mp4"
    run([FFMPEG, "-y", "-i", source,
         "-r", NOTION_FPS,
         "-c:v", "libx264", "-crf", NOTION_CRF, "-preset", "slow", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", NOTION_AUDIO_KBPS, "-ac", "1",
         "-movflags", "+faststart", delivery])

    size = delivery.stat().st_size / (1024 * 1024)
    print(f"\n{delivery} is {size:.2f} MiB")
    if size > 5.0:
        print("TOO BIG for a Notion upload (5 MiB cap). Raise the constant rate "
              "factor or shorten the episode.", file=sys.stderr)
        return 1
    print("Notion will accept this. Upload it with the content type "
          "application/mp4, which is what the .mp4 extension implies; video/mp4 "
          "is rejected. Write the block as <video src=\"file-upload://ID\">Caption</video>.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
