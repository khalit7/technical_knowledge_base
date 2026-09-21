#!/usr/bin/env python3
"""
Check a script has the shape its format requires, before anything is rendered.

Every other check in this pipeline looks at the finished video: the layout, the
timing, what the narration actually said. None of them notices a missing beat,
because a video with no contract and no objection renders perfectly and sounds
fine. It is just worse, in a way only somebody who knows the format can see.

Both times a beat went missing it was the same beat kind and the same cause:
writing a new episode from a blank file and forgetting a step that had no
visual consequence. So the format's required beats are declared here and
checked mechanically.

    uv run python video/tools/check_structure.py --script deep_gpu_memory

A script declares its format with FORMAT, and may map roles onto its own beat
names with ROLES when the conventional names do not fit.
"""

from __future__ import annotations

import argparse
import importlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# role -> the beat keys that conventionally carry it
CONVENTION = {
    "opening": ("ident", "open", "cold_open", "title"),
    "contract": ("contract", "route"),
    "question": ("question",),
    "objection": ("objection", "caveat"),
    "take": ("close", "take"),
    "resources": ("resources",),
}

REQUIRED = {
    # a two minute news cut may drop the contract: the viewer can hold the
    # whole thing in their head. Nothing longer may.
    "news": ["opening", "take"],
    "overview": ["opening", "question", "take"],
    "deep dive": ["opening", "contract", "question", "objection", "take", "resources"],
}

SHORT_BEAT_WORDS = 25       # below this, the voice model is least stable
WPM = 148                   # the measured delivery rate
CONTRACT_MINUTES = 3.0      # above this, a contract beat stops being optional

# An overview does not need a separate contract beat, because building the
# whole map on screen before explaining any of it IS the contract, and a
# stronger one than a list of steps: the viewer can see the entire scope.
# Its question beat still has to say where the tour goes.
CONTRACT_EXEMPT = {"overview"}

# News runs a coda of smaller items after the take, deliberately, so the take
# is near the end rather than at it.
TAIL_ROOM = {"news": 3, "overview": 2, "deep dive": 2}


def roles_of(key: str, roles: dict) -> list[str]:
    """Every role this beat carries.

    A beat can carry two: the 21 September cut states its contract inside its
    opening rather than in a beat of its own, which is legitimate at that
    length. Returning one role meant declaring the second silently dropped the
    first."""
    found = [role for role, mapped in roles.items() if mapped == key]
    found += [role for role, names in CONVENTION.items()
              if key in names and role not in found]
    return found


# What each panel kind needs to draw anything at all. A beat that declares a
# kind and forgets its content renders as an empty frame with narration over
# it, which no other check notices: the audio verifies, the layout audit finds
# nothing to collide with, and the timing is correct. It is simply blank.
PANEL_FIELDS = {
    "title": (),
    "points": ("items",),
    "columns": ("columns",),
    "stack": ("layers",),
    "flow": ("steps",),
    "bars": ("bars",),
    "stat": ("big",),
    "compare": ("sides",),
    "table": ("rows",),
    "claim": ("text",),
    "resources": ("items",),
}


def check_visuals(script: dict, visuals: dict) -> list[str]:
    """A declarative episode's pictures, checked before the GPU is booked."""
    problems = []
    if not visuals:
        return problems

    for key in script:
        if key not in visuals:
            problems.append(f"beat '{key}' has narration and no visual: it "
                            f"renders as a blank frame")
    for key in visuals:
        if key not in script:
            problems.append(f"visual '{key}' matches no beat in SCRIPT "
                            f"(a typo here is silent)")

    for key, spec in visuals.items():
        kind = spec.get("kind", "points")
        if kind not in PANEL_FIELDS:
            problems.append(f"beat '{key}': unknown panel kind '{kind}'")
            continue
        for field in PANEL_FIELDS[kind]:
            if not spec.get(field):
                problems.append(f"beat '{key}': a '{kind}' panel needs "
                                f"'{field}' and it is empty")
        if kind == "bars":
            for bar in spec.get("bars", []):
                if not isinstance(bar, dict) or "value" not in bar:
                    problems.append(f"beat '{key}': every bar needs a numeric "
                                    f"'value'. Widths are computed, never given")

    parked = [k for k, v in visuals.items() if v.get("park")]
    if len(parked) > 1:
        problems.append(f"{len(parked)} beats park a panel ({', '.join(parked)}): "
                        f"the second one replaces the first as the map, and the "
                        f"first is left on screen forever")
    focused = [f for v in visuals.values() if (f := v.get("focus"))]
    if focused and not parked:
        problems.append(f"'focus' is used with nothing parked to focus on")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--script", required=True)
    args = ap.parse_args()

    module = importlib.import_module(f"scripts.{args.script}")
    script = module.SCRIPT
    fmt = getattr(module, "FORMAT", None)
    roles = getattr(module, "ROLES", {})
    visuals = getattr(module, "VISUALS", {})

    problems = check_visuals(script, visuals)
    if fmt not in REQUIRED:
        print(f"{args.script}: no FORMAT declared (one of {sorted(REQUIRED)})")
        return 1

    found = {}
    for key in script:
        for role in roles_of(key, roles):
            found.setdefault(role, key)

    for role in REQUIRED[fmt]:
        if role not in found:
            problems.append(f"missing a beat for '{role}'")

    words = sum(len(line.split()) for turns in script.values() for _, line in turns)
    # Prefer the real thing: once the narration exists, its length is a fact
    # rather than an estimate, and the contract rule turns on a few seconds.
    durations = ROOT / "out" / "audio" / args.script / "durations.json"
    if durations.exists():
        import json
        minutes = sum(json.loads(durations.read_text()).values()) / 60
    else:
        minutes = words / WPM
    if (minutes > CONTRACT_MINUTES and "contract" not in found
            and fmt not in CONTRACT_EXEMPT):
        problems.append(f"{minutes:.1f} minutes long with no contract beat: "
                        f"only a cut under {CONTRACT_MINUTES:.0f} minutes may skip it, "
                        f"because past that nobody can hold the whole thing in "
                        f"their head")

    keys = list(script)
    if found.get("opening") and keys[0] != found["opening"]:
        problems.append(f"'{found['opening']}' should be the first beat, "
                        f"'{keys[0]}' is")
    room = TAIL_ROOM.get(fmt, 2)
    if found.get("take") and found["take"] not in keys[-room:]:
        problems.append(f"'{found['take']}' should be in the last {room} beats")

    short = [k for k, turns in script.items()
             if sum(len(line.split()) for _, line in turns) < SHORT_BEAT_WORDS]
    for key in short:
        problems.append(f"'{key}' is under {SHORT_BEAT_WORDS} words: short beats "
                        f"are the least stable input the voice model gets")

    print(f"{args.script}: {fmt}, {len(script)} beats, ~{minutes:.1f} min, "
          f"{len(visuals) or 'bespoke scene'} visuals, "
          f"roles found: {', '.join(sorted(found))}")
    for p in problems:
        print(f"  {p}")
    print("  ok" if not problems else f"  {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
