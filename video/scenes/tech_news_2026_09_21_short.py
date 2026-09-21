"""
The two minute edition, animated.

The news shape, not the explainer shape: an ident that says what this is and
when, then one story at a time, each opened with its headline on screen before
any mechanism, then the take. The ident strip and the story banner stay on
screen throughout, so a viewer who looks up mid-video always knows which
edition and which story they are in.

Detail beats are inherited from the full episode, so there is one
implementation of each visual.

    manim -qh --media_dir out/media video/scenes/tech_news_2026_09_21_short.py Short
"""

import sys
from pathlib import Path

from manim import (
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UL,
    UP,
    Create,
    FadeIn,
    VGroup,
    Write,
)

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from common.scene import Narration                                   # noqa: E402
from common.style import (                                           # noqa: E402
    ACCENT,
    BAD,
    BODY,
    DIM,
    FG,
    GOOD,
    H1,
    H2,
    SMALL,
    WARM,
    P,
    T,
    fit,
    hairline,
    pill,
)
from scenes.tech_news_2026_09_21 import (                            # noqa: E402
    LOOP_FULL,
    LOOP_MID,
    TechNews20260921,
    loop_diagram,
)
from scripts.tech_news_2026_09_21_short import SCRIPT                # noqa: E402

AUDIO = ROOT / "out" / "audio" / "tech_news_2026_09_21_short"
TIMING = ROOT / "out" / "timing_2026_09_21_short.json"

# Everything below the two persistent strips at the top of the frame.
BODY_TOP = 2.15


class Short(TechNews20260921):
    narration = Narration(SCRIPT, AUDIO)
    timing_out = TIMING

    def construct(self):
        self.camera.background_color = "#0E1116"
        self.ident()
        self.story_one()
        self.task_horizon()
        self.task_horizon_caveat()
        self.story_two()
        self.feedback_detail()
        self.close()

    # -- what this is ------------------------------------------------------

    def ident(self):
        self.say("ident")
        title = T("Tech news", size=H1, color=FG, weight="BOLD")
        date = T("week ending 21 September 2026", size=BODY, color=ACCENT)
        window = T("covering 14 to 21 September", size=SMALL, color=DIM)
        card = VGroup(title, date, window).arrange(DOWN, buff=0.35).move_to(ORIGIN)

        self.play(Write(title), run_time=0.9)
        self.spread([date, window], run_time=0.6, reserve=1.8)
        self.hold(tail=0.1)

        # It becomes the strip it stays as, rather than being replaced by one.
        strip = T("Tech news · 21 September 2026", size=SMALL, color=DIM)
        strip.to_corner(UL, buff=0.4)
        self.morph(card, strip, run_time=1.0)
        rule = hairline().next_to(strip, DOWN, buff=0.15).align_to(strip, LEFT)
        self.play(Create(rule), run_time=0.5)
        self.ident_strip = VGroup(strip, rule)

    # -- story openings ----------------------------------------------------

    def story_open(self, key, number, headline, sub=None, banner=None):
        """Headline first, on screen and in the ear, then it becomes the banner
        that says which story you are in for as long as the story runs.

        `banner` flips the strip before the new headline is drawn. Doing it
        afterwards leaves the previous story's name sitting over this story's
        visuals, which is worse than having no banner at all."""
        self.say(key)
        if banner and getattr(self, "banner", None) is not None:
            new = T(banner, size=SMALL, color=WARM).move_to(self.banner)
            new.align_to(self.banner, LEFT)
            self.morph(self.banner, new, run_time=0.6)
            self.banner = new
        label = T(number, size=SMALL, color=WARM)
        head = P(headline, size=H2, color=FG, align=ORIGIN)
        card = VGroup(label, head).arrange(DOWN, buff=0.4)
        if sub:
            card.add(T(sub, size=SMALL, color=DIM))
            card.arrange(DOWN, buff=0.4)
        fit(card, max_w=11.0)
        card.move_to(UP * 0.3)

        self.play(FadeIn(label, shift=UP * 0.2), run_time=0.5)
        self.play(Write(head), run_time=1.3)
        if sub:
            self.play(FadeIn(card[-1], shift=UP * 0.15), run_time=0.5)
        return card

    def to_banner(self, card, text):
        banner = T(text, size=SMALL, color=WARM)
        banner.next_to(self.ident_strip, DOWN, buff=0.35).align_to(self.ident_strip, LEFT)
        self.morph(card, banner, run_time=0.9)
        self.banner = banner
        return banner

    def story_one(self):
        card = self.story_open(
            "story1_open", "STORY ONE",
            ["4 minutes  \u2192  12 hours", "in two years"],
            sub="how long a task Anthropic's models finish on their own",
        )
        self.hold()
        self.to_banner(card, "STORY ONE · the task horizon")
        self.stage = None            # nothing left in the middle of the frame

    def story_two(self):
        card = self.story_open(
            "story2_open", "STORY TWO",
            ["the bottleneck was feedback,", "not the model"],
            sub="Z.ai (formerly Zhipu), how GLM-5.3 built its own serving stack",
            banner="STORY TWO · the feedback loop",
        )
        figures = VGroup(
            T("13 days to production", size=SMALL, color=WARM),
            T("3.22x throughput", size=SMALL, color=WARM),
        ).arrange(RIGHT, buff=1.0)
        figures.next_to(card, DOWN, buff=0.6)
        self.play(FadeIn(figures, shift=UP * 0.15), run_time=0.6)

        loop = loop_diagram()
        loop.set(width=LOOP_MID).move_to(DOWN * 1.1)
        self.retire(figures, run_time=0.4)
        self.morph(card, loop, run_time=1.1)
        self.loop = loop
        self.highlight_home(loop.nodes["feedback"], color=GOOD)
        self.hold()

    # -- story two's detail ------------------------------------------------

    def feedback_detail(self):
        self.say("feedback")
        self.play(self.loop.animate.set(width=LOOP_MID * 0.8).move_to(UP * 0.9),
                  run_time=0.8)

        sparse = T('one sparse signal: "the test failed"', size=SMALL, color=BAD)
        sparse.next_to(self.loop, UP, buff=0.3)
        self.play(FadeIn(sparse), run_time=0.5)
        self.play(sparse.animate.set_opacity(0.25), run_time=0.4)

        kinds = VGroup(
            pill("correctness: compare execution paths", GOOD, width=7.0),
            pill("behaviour: timelines, not totals", GOOD, width=7.0),
            pill("performance: which constraint binds", GOOD, width=7.0),
        ).arrange(DOWN, buff=0.3)
        fit(kinds, max_h=2.6)
        kinds.next_to(self.loop, DOWN, buff=0.45)
        self.spread(kinds, run_time=0.45, reserve=9.0)

        bugs = VGroup(
            T("TF32 precision bug, one parallelism strategy", size=SMALL, color=BAD),
            T("20% slowdown: the Python GIL", size=SMALL, color=BAD),
        ).arrange(DOWN, buff=0.35)
        bugs.next_to(kinds, DOWN, buff=0.45)
        self.play(kinds.animate.set_opacity(0.45), run_time=0.4)
        self.spread(bugs, run_time=0.5)
        self.hold()
        self.retire(sparse, kinds, bugs, run_time=0.6)

    # -- the take ----------------------------------------------------------

    def close(self):
        self.say("close")
        self.play(self.loop.animate.set(width=LOOP_FULL * 0.92).move_to(DOWN * 0.85),
                  run_time=1.0)
        self.fade_to(self.loop, 1.0, run_time=0.4)

        thick = self.loop.edges["observe"].copy().set_color(GOOD).set_stroke(width=9)
        thick2 = self.loop.edges["learn"].copy().set_color(GOOD).set_stroke(width=9)
        self.play(Create(thick), Create(thick2), run_time=0.9)

        line = P(["the constraint moved:", "capability, then verification"],
                 size=H2, color=FG, align=ORIGIN)
        # next_to inherits the banner's left alignment, and the banner sits at
        # the left edge: without set_x this runs off the frame.
        line.next_to(self.banner, DOWN, buff=0.45).set_x(0)
        fit(line, max_w=11.0)
        self.play(Write(line), run_time=1.3)

        ask = T("what does your system find out when it is wrong, and how soon?",
                size=SMALL, color=ACCENT)
        ask.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(ask, shift=UP * 0.2), run_time=0.8)
        self.hold()

        # The date goes on the last frame too: that is the one people screenshot.
        end = T("Tech news · week ending 21 September 2026 · the written issue has all of it",
                size=SMALL, color=DIM)
        end.to_edge(DOWN, buff=0.8)
        fit(end, max_w=12.0)
        self.morph(ask, end, run_time=0.8)
        self.wait(1.0)
