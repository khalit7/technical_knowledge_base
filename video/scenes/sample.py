"""
The opening arc of the current episode: tension, question, contract, the task
horizon, the leverage numbers, and the pivot where the spine diagram appears.

Use it to check the visual system, to time a render, or to show somebody what
the format looks like without waiting for nine minutes of animation.

    manim -qh --media_dir out/media video/scenes/sample.py Sample
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from scenes.tech_news_2026_09_21 import TechNews20260921   # noqa: E402


class Sample(TechNews20260921):
    def construct(self):
        self.camera.background_color = "#0E1116"
        self.cold_open()
        self.the_question()
        self.the_contract()
        self.task_horizon()
        self.leverage()
        self.pivot()
