#!/usr/bin/env python3
"""
Review a batch of finished episodes, and say which ones need a person.

    uv run python video/tools/review.py --all
    uv run python video/tools/review.py topic_rl_overview topic_math_overview
    uv run python video/tools/review.py --all --frames      # also pull frames

One episode gets watched. Forty do not, and pretending otherwise is how a
batch ships with a defect in it that every individual check would have caught.
So this runs the mechanical checks across the batch and ranks the results, and
the job of a person is then to watch the ones it flags and to spot-check the
ones it does not.

What it gathers per episode, all of it already produced by the render:

  structure   the beats the format requires, and the panel declarations
  layout      text off the frame, or two pieces of text on top of each other
  timing      two voices at once, a silent gap, or a still frame held too long
  voice       every take transcribed and scored against the line it was given
  delivery    whether the file exists and fits inside Notion's 5 MiB cap

`--frames` pulls one frame per beat into `out/frames/<episode>/`, named by beat,
for the part no check can do: deciding whether it reads.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent
sys.path.insert(0, str(ROOT))

UV = "uv"
GROUPS = ["--group", "tts", "--group", "video"]
NOTION_CAP_MIB = 5.0


def run(cmd: list, **kw) -> tuple[int, str]:
    done = subprocess.run([str(c) for c in cmd], cwd=ROOT, capture_output=True,
                          text=True, **kw)
    return done.returncode, (done.stdout or "") + (done.stderr or "")


def episodes_with_audio() -> list[str]:
    out = []
    for d in sorted((ROOT / "out" / "audio").glob("*")):
        if d.is_dir() and (ROOT / "scripts" / f"{d.name}.py").exists():
            out.append(d.name)
    return out


def review(episode: str, frames: bool) -> dict:
    report = {"episode": episode, "problems": [], "notes": []}

    code, text = run([UV, "run", "--project", REPO, *GROUPS, "python",
                      "tools/check_structure.py", "--script", episode])
    if code != 0:
        for line in text.splitlines():
            line = line.strip()
            # The tail line just counts what the lines above already said.
            if (line and not line.startswith(episode) and line != "ok"
                    and not line.endswith("problem(s)")):
                report["problems"].append(f"structure: {line}")
    head = next((l for l in text.splitlines() if l.startswith(episode)), "")
    report["notes"].append(head.replace(episode + ":", "").strip())

    layout = ROOT / "out" / f"layout_{episode}.json"
    if layout.exists():
        issues = json.loads(layout.read_text())
        for issue in issues[:6]:
            report["problems"].append(
                f"layout: {issue['kind']} in '{issue['beat']}': "
                f"{issue.get('text', '')[:70]}")
        if len(issues) > 6:
            report["problems"].append(f"layout: and {len(issues) - 6} more")
    else:
        report["problems"].append("layout: no audit written, was it rendered?")

    code, text = run([UV, "run", "--project", REPO, *GROUPS, "python",
                      "tools/check_timing.py", "--script", episode])
    if code != 0:
        for line in text.splitlines():
            line = line.strip()
            if line.startswith(("overlap", "gap", "still", "FAIL", "-")):
                report["problems"].append(f"timing: {line}")

    code, text = run([UV, "run", "--project", REPO, "--group", "tts", "python",
                      "tts/verify.py", "--script", episode, "--device", "cuda"])
    bad = [l.strip() for l in text.splitlines()
           if l.strip().startswith(("FAIL", "BAD", "!"))]
    for line in bad[:6]:
        report["problems"].append(f"voice: {line}")

    delivered = ROOT / "out" / f"{episode}.mp4"
    if not delivered.exists():
        report["problems"].append("delivery: no mp4")
    else:
        mib = delivered.stat().st_size / (1024 * 1024)
        report["notes"].append(f"{mib:.2f} MiB")
        if mib > NOTION_CAP_MIB:
            report["problems"].append(
                f"delivery: {mib:.2f} MiB is over the {NOTION_CAP_MIB} cap")

    if frames and delivered.exists():
        timing = ROOT / "out" / f"timing_{episode}.json"
        if timing.exists():
            out = ROOT / "out" / "frames" / episode
            out.mkdir(parents=True, exist_ok=True)
            for beat in json.loads(timing.read_text()):
                at = beat["start"] + beat["dur"] * 0.75
                subprocess.run(
                    ["ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                     "-ss", f"{at:.2f}", "-i", str(delivered), "-frames:v", "1",
                     str(out / f"{beat['key']}.png")], check=False)
            report["notes"].append(f"frames in {out.relative_to(ROOT)}")

    return report


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episodes", nargs="*")
    ap.add_argument("--all", action="store_true",
                    help="every episode that has rendered audio")
    ap.add_argument("--frames", action="store_true",
                    help="pull one frame per beat, for the part no check does")
    args = ap.parse_args()

    names = args.episodes or (episodes_with_audio() if args.all else [])
    if not names:
        ap.error("name some episodes, or pass --all")

    reports = [review(name, args.frames) for name in names]
    reports.sort(key=lambda r: -len(r["problems"]))

    clean = [r for r in reports if not r["problems"]]
    for r in reports:
        if not r["problems"]:
            continue
        print(f"\n{r['episode']}  ({', '.join(n for n in r['notes'] if n)})")
        for p in r["problems"]:
            print(f"    {p}")

    print(f"\n{len(clean)} of {len(reports)} clean:")
    for r in clean:
        print(f"    {r['episode']:44s} {', '.join(n for n in r['notes'] if n)}")
    print("\nClean means nothing measurable is wrong. Watch them anyway: pace, "
          "whether a story lands and whether the take is worth hearing are not "
          "things any of this can see.")
    return 1 if len(clean) != len(reports) else 0


if __name__ == "__main__":
    raise SystemExit(main())
