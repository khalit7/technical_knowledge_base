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
WINDOW = 14              # words a paraphrase may spread a label over
SECONDS_PER_WORD = 0.40  # the series aggregate, tails and gaps included
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
        # A stat's number and caption are one mobject, so they are one reveal
        # between them; the note is the second. Same shape as claim.
        first = [str(spec.get("big") or spec.get("text") or ""),
                 str(spec.get("caption") or "")]
        return [[f for f in first if f]] + (
            [[str(spec["note"])]] if spec.get("note") else [])
    return []


def said_at(words: list[str], labels: list[str]) -> int | None:
    """Word index where the narration first names any of these labels.

    Two routes, both deliberately strict, because a reveal has to be located
    at a MOMENT and a loose match invents one. Matching on a single shared
    word was tried and backed out: a common word turns up earlier in a beat
    for other reasons, and it timed a genuinely clean episode as eighteen
    leads, which would have sent its author rewriting good beats.
    """
    squashed_words = [squashed(w) for w in words]
    joined, starts = "", []
    for sw in squashed_words:
        starts.append(len(joined))
        joined += sw

    # 1. The whole label as a contiguous squashed run. This is how a product
    #    name on a card is said, and how the orphan check matches.
    best = None
    for label in labels:
        target = squashed(label)
        if len(target) < 4:
            continue
        at = joined.find(target)
        if at < 0:
            continue
        idx = max(i for i, st in enumerate(starts) if st <= at)
        best = idx if best is None else min(best, idx)
    if best is not None:
        return best

    # 2. For a multi-word item the narration paraphrases rather than quotes,
    #    as a `points` list usually is: two or more of the label's significant
    #    words, in order, inside a short window. "Chunking moves quality most"
    #    is then found in "chunking is still what moves quality most". Two
    #    words in fourteen is specific enough to mean the item is being named;
    #    one word anywhere is not.
    for label in labels:
        sig = [w for w in (squashed(x) for x in str(label).split()) if len(w) >= 4]
        if len(sig) < 2:
            continue
        for i in range(len(squashed_words)):
            hits, j, k = [], i, 0
            while j < min(i + WINDOW, len(squashed_words)) and k < len(sig):
                # Exact, not substring: "gain" sits inside "against" and a
                # substring test found a label four seconds into a beat that
                # names it forty seconds later.
                if squashed_words[j] == sig[k]:
                    hits.append(j)
                    k += 1
                j += 1
            if len(hits) >= 2:
                best = hits[0] if best is None else min(best, hits[0])
                break
    return best


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--script", required=True)
    ap.add_argument("--tolerance", type=float, default=LEAD_TOLERANCE)
    ap.add_argument("--estimate", action="store_true",
                    help="work from word counts, before any voice exists")
    args = ap.parse_args()

    mod = importlib.import_module(f"scripts.{args.script}")
    script, visuals = mod.SCRIPT, getattr(mod, "VISUALS", {})
    measured = ROOT / "out" / "audio" / args.script / "durations.json"
    if args.estimate or not measured.exists():
        # Between the outline and the GPU there was nothing, so every author
        # rebuilt the same scratch estimator and iterated against it by hand.
        # 0.40 seconds a word is the measured aggregate across the series and
        # holds to about 3%, which is far inside the tolerance this check
        # cares about. Good enough to fix the writing before paying for voice.
        durations = {k: round(sum(len(t.split()) for _s, t in turns) * SECONDS_PER_WORD, 2)
                     for k, turns in script.items()}
        print(f"estimating from word counts at {SECONDS_PER_WORD} s/word; "
              f"re-run after the voice for the real thing\n")
    else:
        durations = json.loads(measured.read_text())

    print(f"{'beat':16s} {'reveal':28s} {'drawn':>7s} {'said':>7s} {'lead':>7s}")
    problems, unchecked = [], []
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
                # Not checkable, and silence here reads exactly like a pass.
                # The orphan check has a second route, a shared significant
                # word, that this one does not: a label the narration never
                # says as a contiguous run simply cannot be located in time.
                # Report it rather than skipping, or the clean-looking table
                # is hiding however many reveals nobody timed.
                label = (labels[0] or "?")[:26]
                print(f"{key:16s} {label:28s} {'':>7s} {'':>7s} {'':>7s}"
                      f"  NOT SAID VERBATIM, so not timed")
                unchecked.append((key, labels[0]))
                continue
            said = at / max(len(words), 1) * D
            lead = drawn - said
            flag = ""
            if lead > args.tolerance:
                flag = "  NAMED BEFORE IT IS DRAWN"
                problems.append((key, labels[0], lead))
            label = (labels[0] or "?")[:26]
            print(f"{key:16s} {label:28s} {drawn:7.1f} {said:7.1f} {lead:7.1f}{flag}")

    if unchecked:
        print(f"\n{len(unchecked)} reveal(s) could not be timed, because the "
              f"narration never says the label as a contiguous run. Those are "
              f"UNCHECKED, not passed. Matching on a shared word instead was "
              f"tried and abandoned: it timed one clean episode as eighteen "
              f"leads, because a common word turns up earlier in the beat for "
              f"some other reason. Say the item verbatim, or time it by hand.")
    if problems:
        print(f"\n{len(problems)} reveal(s) named more than {args.tolerance:.0f}s "
              f"before they are drawn. The narrator is pointing at an empty "
              f"frame. Reorder the turns so the sentence arrives where the "
              f"drawing already is, or, on a panel whose reveal count is fixed "
              f"by the data, raise the reserve.")
        return 1
    print(f"\nevery timed reveal is named at or after the moment it is drawn"
          + (f", but {len(unchecked)} could not be timed at all" if unchecked else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
