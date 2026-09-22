#!/usr/bin/env python3
"""
Which rendered episodes no longer match their scripts.

    uv run python video/tools/stale.py
    uv run python video/tools/stale.py --names        # just the names, for --from

A script gets edited after its audio was rendered: a line is tightened, a beat
is cut, a fact is corrected. The renderer already refuses to reuse a take whose
words changed, but only when it is next asked to render that episode, and
nothing tells you which episodes those are. Across forty episodes written by
different people over a day, the answer is not obvious and guessing wrong
means either an hour of needless rendering or an episode that says something
its script does not.

So compare each episode's recorded take fingerprints against the words in its
script now, and report the difference.
"""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from tts.render import beat_stamp                      # noqa: E402


def check(episode: str) -> tuple[list[str], list[str], list[str]]:
    """Beats whose words changed, beats never rendered, beats now orphaned."""
    module = importlib.import_module(f"scripts.{episode}")
    script = module.SCRIPT
    out = ROOT / "out" / "audio" / episode
    stamps_path = out / "takes.json"
    stamps = json.loads(stamps_path.read_text()) if stamps_path.exists() else {}

    changed, missing = [], []
    for key, turns in script.items():
        if not (out / f"{key}.wav").exists():
            missing.append(key)
        elif key in stamps and stamps[key] != beat_stamp(turns):
            changed.append(key)
    orphan = [k for k in stamps if k not in script]
    return changed, missing, orphan


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--names", action="store_true",
                    help="print only the episode names, one per line")
    args = ap.parse_args()

    stale = []
    for path in sorted((ROOT / "scripts").glob("*.py")):
        episode = path.stem
        if episode.startswith("_") or episode == "__init__":
            continue
        if not (ROOT / "out" / "audio" / episode).exists():
            continue
        try:
            changed, missing, orphan = check(episode)
        except Exception as exc:
            print(f"{episode}: could not read ({exc})", file=sys.stderr)
            continue
        if changed or missing:
            stale.append(episode)
            if not args.names:
                bits = []
                if changed:
                    bits.append(f"{len(changed)} beat(s) rewritten: {', '.join(changed)}")
                if missing:
                    bits.append(f"{len(missing)} never rendered: {', '.join(missing)}")
                if orphan:
                    bits.append(f"{len(orphan)} orphaned take(s): {', '.join(orphan)}")
                print(f"{episode}\n    " + "\n    ".join(bits))

    if args.names:
        print("\n".join(stale))
    elif stale:
        print(f"\n{len(stale)} episode(s) need re-rendering. Their unchanged "
              f"beats are reused, so this is cheaper than it looks.")
    else:
        print("every rendered episode matches its script")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
