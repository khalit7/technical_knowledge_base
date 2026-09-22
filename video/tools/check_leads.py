#!/usr/bin/env python3
"""Check that the narration names a thing at the moment the picture draws it.

The skill states the rule and then says, accurately, that no check sees it
broken. This is that check. The arithmetic is fully determined, so there was
never a reason to leave it to the reader:

  * `spread` places n reveals evenly, so reveal k lands at
    `(k-1)/(n-1) x (beat_length - reserve)`.
  * The narration is spoken at a roughly even rate, so a word at index i of
    w lands at about `i/w x beat_length`.

Subtract, and you have how long the narrator stands pointing at a panel that
is not there yet. Nothing else catches this: the layout is clean, the timing
is clean, every still frame is under the limit, every take verifies, and the
video has somebody naming a column six seconds before it appears.

    uv run --group tts --group video python video/tools/check_leads.py \\
        --script topic_hardware_overview

Reported leads are approximate by construction, because speech is not
perfectly even. Treat a two second lead as noise and a six second lead as a
beat to rewrite.
"""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tools"))

from check_structure import PANEL_FIELDS  # noqa: E402  (path set above)

LEAD_TOLERANCE = 3.0     # seconds of pointing at nothing before it is a defect
RUN_TIME = 0.45          # one FadeIn, from scene.spread


def squashed(text: str) -> str:
    """Letters and digits only, lowercased, spaces gone. As check_structure."""
    import re
    out = []
    for token in re.findall(r"[A-Za-z]+|\d+", str(text)):
        if token.isdigit():
            try:
                from num2words import num2words
                out.append(num2words(int(token)).replace(" ", "").replace("-", ""))
                continue
            except Exception:
                pass
        out.append(token.lower())
    return "".join(out)


def reveals(spec: dict) -> list[list[str]]:
    """The labels of each reveal, in the order `spread` draws them.

    One entry per reveal, holding every string that reveal puts on screen, so
    naming any of them counts as having named it. Mirrors the reveal lists the
    panel builders return in `common/episode.py`; a kind that is not listed
    here is skipped rather than guessed at.
    """
    kind = spec.get("kind")
    head = [str(spec["head"])] if spec.get("head") else []
    if kind == "columns":
        return [[str(c.get("head", ""))] + [str(i) for i in c.get("items", [])]
                for c in spec.get("columns", [])]
    if kind == "compare":
        return [[str(c.get("head", ""))] + [str(i) for i in c.get("items", [])]
                for c in spec.get("sides", [])]
    if kind == "points":
        return [head] * bool(head) + [[str(i)] for i in spec.get("items", [])]
    if kind == "flow":
        return [head] * bool(head) + [[str(s)] for s in spec.get("steps", [])]
    if kind == "stack":
        return [[str(x) for x in (l if isinstance(l, (list, tuple)) else [l])]
                for l in spec.get("layers", [])]
    if kind == "bars":
        rows = [[str(b.get("label", "")), str(b.get("text", ""))]
                if isinstance(b, dict) else [str(b)] for b in spec.get("bars", [])]
        return [head] * bool(head) + rows
    if kind == "table":
        # The head row is drawn as a reveal of its own, unlike `columns`,
        # where the heading is part of its column. Getting this wrong
        # under-counts n and shifts every landing on the beat.
        head_row = [[str(h) for h in spec.get("head", [])]] if spec.get("head") else []
        return head_row + [[str(c) for c in row] for row in spec.get("rows", [])]
    if kind in ("stat", "claim"):
        first = [str(spec.get("big") or spec.get("text") or "")]
        return [first] + ([[str(spec["note"])]] if spec.get("note") else [])
    return []


def said_at(words: list[str], labels: list[str]) -> int | None:
    """Word index where the narration first names any of these labels.

    Matched the way the orphan check matches, because that is the rule the
    scripts are already written to: a squashed label appearing as a
    contiguous run inside the squashed narration.
    """
    squashed_words = [squashed(w) for w in words]
    joined, starts = "", []
    for sw in squashed_words:
        starts.append(len(joined))
        joined += sw
    best = None
    for label in labels:
        target = squashed(label)
        if len(target) < 4:
            continue
        at = joined.find(target)
        if at < 0:
            continue
        idx = max(i for i, s in enumerate(starts) if s <= at)
        best = idx if best is None else min(best, idx)
    return best


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--script", required=True)
    ap.add_argument("--tolerance", type=float, default=LEAD_TOLERANCE)
    args = ap.parse_args()

    mod = importlib.import_module(f"scripts.{args.script}")
    script, visuals = mod.SCRIPT, getattr(mod, "VISUALS", {})
    durations = json.loads(
        (ROOT / "out" / "audio" / args.script / "durations.json").read_text())

    print(f"{'beat':16s} {'reveal':28s} {'drawn':>7s} {'said':>7s} {'lead':>7s}")
    problems = []
    for key in script:
        spec = visuals.get(key) or {}
        groups = reveals(spec)
        n, D = len(groups), durations.get(key)
        if n < 1 or not D:
            continue
        reserve = float(spec.get("reserve", 0.0) or 0.0)
        words = " ".join(text for _speaker, text in script[key]).split()
        budget = max(0.0, D - reserve)
        for k, labels in enumerate(groups, start=1):
            drawn = RUN_TIME if n == 1 else (k - 1) / (n - 1) * budget
            at = said_at(words, labels)
            if at is None:
                continue
            said = at / max(len(words), 1) * D
            lead = drawn - said
            flag = ""
            if lead > args.tolerance:
                flag = "  NAMED BEFORE IT IS DRAWN"
                problems.append((key, labels[0], lead))
            label = (labels[0] or "?")[:26]
            print(f"{key:16s} {label:28s} {drawn:7.1f} {said:7.1f} {lead:7.1f}{flag}")

    if problems:
        print(f"\n{len(problems)} reveal(s) named more than {args.tolerance:.0f}s "
              f"before they are drawn. The narrator is pointing at an empty "
              f"frame. Reorder the turns so the sentence arrives where the "
              f"drawing already is, or, on a panel whose reveal count is fixed "
              f"by the data, raise the reserve.")
        return 1
    print("\nevery reveal is named at or after the moment it is drawn")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
