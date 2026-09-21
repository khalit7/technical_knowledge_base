"""
The scene every declarative episode renders through.

A script that declares VISUALS needs no scene file of its own, so there is one
of these rather than forty stubs. `build.py` points manim here and names the
episode in KB_EPISODE.
"""

import importlib
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from common.episode import Episode as _Episode      # noqa: E402
from common.scene import Narration                  # noqa: E402

NAME = os.environ["KB_EPISODE"]
module = importlib.import_module(f"scripts.{NAME}")


class Episode(_Episode):
    narration = Narration(module.SCRIPT, ROOT / "out" / "audio" / NAME)
    timing_out = ROOT / "out" / f"timing_{NAME}.json"

    VISUALS = getattr(module, "VISUALS", {})
    TOPIC = getattr(module, "TITLE", NAME)
    SUBTITLE = getattr(module, "SUBTITLE", "")
    UPDATED = getattr(module, "UPDATED", "")
