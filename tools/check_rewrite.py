#!/usr/bin/env python3
"""
Compare the mirror against an earlier commit and report what pages LOST.

    uv run tools/check_rewrite.py                 # against the last sync commit
    uv run tools/check_rewrite.py --since HEAD~3
    uv run tools/check_rewrite.py --since HEAD~3 --detail topics/llms/summary.md

A compression pass over a hundred and fifty pages cannot be reviewed by
reading them. It can be reviewed by asking a narrower question that a machine
can answer: *did anything disappear that was supposed to survive?*

The rule the pass was given is that prose may be cut and facts may not, so the
things that must come out the other side are countable:

  links       every external URL, because a resource is content
  mentions    every internal page reference, because they are the navigation
  figures     every number with a unit or magnitude attached, because those
              are the measurements the pages exist to carry
  headings    the structure, unless two sections were deliberately merged

Word count is reported but is not a defect on its own: losing words is the
point. Losing a number is not.

This flags candidates, not verdicts. A figure can legitimately disappear when
a whole passage moved to the page that owns it, and the report cannot know
that. It can only make sure somebody looked.
"""

from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

URL = re.compile(r"https?://[^\s)<>\]\"']+")
MENTION = re.compile(r"\]\((?!https?:)([^)]+)\)")
# A number that is carrying a measurement: a magnitude, a unit, a percentage,
# a price, a multiplier, a version. A bare "3" in prose is not interesting and
# would drown the signal.
FIGURE = re.compile(
    r"(?<![\w.])"
    r"(?:[$£€]\s?\d[\d,.]*"
    r"|\d[\d,.]*\s?(?:%|[KMBT]\b|x\b|GB|MB|TB|GiB|MiB|KiB"
    r"|ms\b|s\b|ns\b|us\b|GHz|MHz|W\b|kW\b|MW\b"
    r"|bpw|bit|bits|byte|bytes|token|tokens|GPUs?|params?)"
    r"|\d+\.\d+)"
)
HEADING = re.compile(r"^#{1,6}\s+(.*)$", re.M)


def at(ref: str, path: str) -> str | None:
    done = subprocess.run(["git", "show", f"{ref}:{path}"], cwd=REPO,
                          capture_output=True, text=True)
    return done.stdout if done.returncode == 0 else None


def last_sync() -> str:
    done = subprocess.run(
        ["git", "log", "--format=%H %s", "-n", "200"], cwd=REPO,
        capture_output=True, text=True, check=True)
    for line in done.stdout.splitlines():
        sha, _, subject = line.partition(" ")
        if subject.startswith("sync from notion"):
            return sha
    raise SystemExit("no 'sync from notion' commit found; pass --since")


def items(text: str) -> dict[str, set]:
    return {
        "links": set(URL.findall(text)),
        "mentions": set(MENTION.findall(text)),
        "figures": set(FIGURE.findall(text)),
        "headings": set(h.strip() for h in HEADING.findall(text)),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--since", default=None,
                    help="git ref to compare against (default: the last sync)")
    ap.add_argument("--detail", default=None,
                    help="print every lost item for one path")
    ap.add_argument("--glob", default="topics/**/*.md")
    args = ap.parse_args()

    ref = args.since or last_sync()
    print(f"comparing the working tree against {ref[:12]}\n")

    rows = []
    for path in sorted(REPO.glob(args.glob)):
        rel = str(path.relative_to(REPO))
        before = at(ref, rel)
        if before is None:
            continue
        after = path.read_text(encoding="utf-8")
        a, b = items(before), items(after)
        lost = {k: a[k] - b[k] for k in a}
        words = (len(before.split()), len(after.split()))
        if any(lost.values()):
            rows.append((rel, lost, words))
        if args.detail and rel == args.detail:
            for kind, gone in lost.items():
                for item in sorted(gone):
                    print(f"  lost {kind[:-1]}: {item}")
            return 0

    gone_files = []
    for path in subprocess.run(["git", "diff", "--name-status", ref], cwd=REPO,
                               capture_output=True, text=True).stdout.splitlines():
        status, _, name = path.partition("\t")
        if status.startswith("D") and name.startswith("topics/"):
            gone_files.append(name)

    rows.sort(key=lambda r: -(len(r[1]["links"]) * 10 + len(r[1]["figures"])))
    for rel, lost, words in rows:
        bits = ", ".join(f"{len(v)} {k}" for k, v in lost.items() if v)
        cut = 100 * (1 - words[1] / max(words[0], 1))
        print(f"{rel}")
        print(f"    {words[0]} -> {words[1]} words ({cut:.0f}% cut), lost {bits}")
        for url in sorted(lost["links"])[:4]:
            print(f"      link: {url[:100]}")
        for m in sorted(lost["mentions"])[:3]:
            print(f"      mention: {m[:90]}")

    print(f"\n{len(rows)} pages lost something countable.")
    if gone_files:
        print(f"\n{len(gone_files)} PAGES NO LONGER EXIST:")
        for name in gone_files:
            print(f"    {name}")
        print("A compression pass was not supposed to delete a page. Check "
              "each one is a rename rather than a loss.")
    print("\nA lost figure can be legitimate when a passage moved to the page "
          "that owns it. A lost link almost never is: resources were supposed "
          "to survive intact. Use --detail <path> to see one page's full list.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
