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
NOTION_CAP_MIB = 4.7   # the real cap is 5.0; this is the margin
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
    # Two more rungs, because a nine minute episode came out at exactly 5.00
    # MiB against a 5.0 cap, which is not a margin. Past here the picture is
    # visibly soft and the right answer is a shorter episode, but a rung that
    # uploads beats a rung that does not.
    (720, 42, "24k"),
    (540, 40, "24k"),
)

# Bespoke scenes, which a script may still have when its argument needs its
# own picture. Discovery handles everything else, and an entry whose file has
# gone falls through rather than failing.
SCENES = {
    # The two minute cut is its own edition with its own script; it reuses two
    # detail beats from the full episode by copying their rendered audio in.
    "tech_news_2026_09_21_short": ("scenes/tech_news_2026_09_21_short.py", "Short"),
    "tech_news_2026_09_14_short": ("scenes/tech_news_2026_09_14_short.py", "Short"),
    "tech_news_2026_09_07_short": ("scenes/tech_news_2026_09_07_short.py", "Short"),
    "deep_gpu_memory": ("scenes/deep_gpu_memory.py", "DeepDiveScene"),
}


def discover(episode: str) -> tuple[str, str]:
    """Where an episode's scene lives, and what its class is called.

    The table above is the original hand-kept register. It stopped being a
    good idea at the point where one run produces forty episodes: a register
    you have to remember to add to is a register somebody forgets, and the
    failure arrives as "unknown episode" after the voice has already been
    rendered. So an episode whose scene file is `scenes/<episode>.py` needs no
    entry at all. The class is read out of the file rather than guessed,
    because these files name their scene for what it is (Overview, Short,
    DeepDiveScene) and no convention covers all of them."""
    if episode in SCENES and (ROOT / SCENES[episode][0]).exists():
        return SCENES[episode]
    # A register entry whose file is gone falls through rather than failing.
    # An episode gets re-authored declaratively and its bespoke scene deleted,
    # and the register is the thing nobody remembers to update: the failure
    # then arrives as "file not found" after the voice has already rendered.
    path = ROOT / "scenes" / f"{episode}.py"
    if not path.exists():
        # A script that declares VISUALS describes its own pictures, so it
        # renders through the one generic scene and needs no file here. That
        # is the normal case now; a bespoke scene is the exception.
        script = ROOT / "scripts" / f"{episode}.py"
        if script.exists() and "VISUALS" in script.read_text(encoding="utf-8"):
            return "scenes/_generic.py", "Episode"
        raise SystemExit(f"no scene for '{episode}': expected {path}, or a "
                         f"VISUALS declaration in {script}")
    import ast
    tree = ast.parse(path.read_text(encoding="utf-8"))
    classes = [n.name for n in tree.body if isinstance(n, ast.ClassDef)]
    if not classes:
        raise SystemExit(f"{path} defines no scene class")
    # Manim renders one scene per file here, and when a file holds a helper
    # base plus the scene, the scene is the last one defined.
    return f"scenes/{episode}.py", classes[-1]


def run(cmd: list, **kw) -> None:
    print("+", " ".join(str(c) for c in cmd), file=sys.stderr)
    subprocess.run([str(c) for c in cmd], check=True, cwd=ROOT, **kw)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("episode")
    ap.add_argument("--skip-tts", action="store_true")
    ap.add_argument("--skip-render", action="store_true")
    ap.add_argument("--quality", default="h", choices=list("lmhpk"),
                    help="manim quality: l 480p15, m 720p30, h 1080p60")
    ap.add_argument("--device", default="auto", help="GPU for the voice render")
    args = ap.parse_args()

    scene_file, scene_class = discover(args.episode)

    if not args.skip_tts:
        run([UV, "run", "--project", REPO, *GROUPS,
             "python", "tts/render.py", "--script", args.episode,
             "--device", args.device])

    # One media directory per episode, not one shared by all of them.
    # Manim writes every piece of text through a temporary SVG under
    # <media_dir>/texts, named by a hash of the text and the font, and unlinks
    # it once it has been converted. Two episodes rendering at the same time
    # share plenty of text (a title style, a word), so they collide on that
    # hash and one deletes the file the other is still using. It surfaces as
    # FileNotFoundError on a .svg nobody asked about, and only ever under
    # concurrency, which makes it the kind of bug a single-episode test can
    # never find.
    media = Path("out") / "media" / args.episode
    if not args.skip_render:
        run([UV, "run", "--project", REPO, *GROUPS,
             "python", "-m", "manim", f"-q{args.quality}", "--disable_caching",
             "--media_dir", str(media), scene_file, scene_class],
            env=dict(os.environ, KB_EPISODE=args.episode))

    # Scoped to this scene's own directory, not the whole media tree. Manim
    # names the directory after the scene FILE and the mp4 after the scene
    # CLASS, and nearly every topic overview calls its class Overview. A
    # tree-wide search picked whichever Overview.mp4 was newest, which is
    # correct exactly until two episodes render at once, and then it silently
    # delivers another episode's animation with this episode's audio.
    scene_dir = ROOT / media / "videos" / Path(scene_file).stem
    rendered = sorted(scene_dir.rglob(f"{scene_class}.mp4"),
                      key=lambda p: p.stat().st_mtime)
    if not rendered:
        raise SystemExit(f"no rendered file found under {scene_dir}")
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
