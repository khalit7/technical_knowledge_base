"""
Tech news, week ending 7 September 2026. The two minute edition.

Two diagrams carry it. The first is the same model scored twice, where the
higher bar is also the cheaper one, which is the whole story of story one. The
second is a stack of layers with its output split into what you can read and
what you cannot, which is the whole story of story two.

    manim -qh --media_dir out/media video/scenes/tech_news_2026_09_07_short.py Short
"""

import sys
from pathlib import Path

from manim import (
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    Arrow,
    Create,
    CurvedArrow,
    FadeIn,
    Rectangle,
    VGroup,
    Write,
)

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from common.news import NewsEdition                       # noqa: E402
from common.scene import Narration                        # noqa: E402
from common.style import (                                # noqa: E402
    ACCENT,
    BAD,
    COOL,
    DIM,
    FG,
    GOOD,
    SMALL,
    WARM,
    P,
    T,
    fit,
    labelled_bar,
    pill,
)
from scripts.tech_news_2026_09_07_short import SCRIPT     # noqa: E402

AUDIO = ROOT / "out" / "audio" / "tech_news_2026_09_07_short"
TIMING = ROOT / "out" / "timing_2026_09_07_short.json"


class Short(NewsEdition):
    narration = Narration(SCRIPT, AUDIO)
    timing_out = TIMING

    EDITION = "Tech news"
    DATE = "7 September 2026"
    WINDOW = "covering 31 August to 7 September"

    def construct(self):
        self.camera.background_color = "#0E1116"
        self.ident()
        self.story_one()
        self.two_harnesses()
        self.story_two()
        self.opaque()
        self.take("close",
                  ["a score is a fact about a harness,", "not only about a model"],
                  "when a number arrives, ask what ran it")

    # -- story one ---------------------------------------------------------

    def story_one(self):
        card = self.story_open(
            "story1_open", "STORY ONE",
            ["the same model, scored twice,", "thirty seven points apart"],
            sub="GPT-6 Astra on ARC-AGI-3, two harnesses",
        )
        # The opening line runs for half a minute, so the beat has to keep
        # giving the viewer something. Each of these lands as the narration
        # reaches it: the model, the two runs, and what a harness even is.
        self.play(card.animate.scale(0.78).to_edge(UP, buff=1.5), run_time=0.8)

        bits = VGroup(
            T("GPT-6 Astra · trained on more than 100,000 GPUs", size=SMALL, color=DIM),
            pill("run one: the standard harness", WARM, width=6.4),
            pill("run two: a harness built with the provider", GOOD, width=6.4),
            P(["a harness is the scaffolding around the model:",
               "how it is prompted, what it remembers, how the run is managed"],
              size=SMALL, color=DIM, align=ORIGIN),
        ).arrange(DOWN, buff=0.45)
        fit(bits, max_w=11.5, max_h=4.0)
        bits.next_to(card, DOWN, buff=0.5)

        self.spread(bits, run_time=0.5, reserve=1.4)
        self.retire(bits, run_time=0.5)
        self.to_banner(card, "STORY ONE · the score is the harness")

    def two_harnesses(self):
        self.say("story1_numbers")

        scale = 6.8 / 100.0
        standard = labelled_bar("standard harness", "62.7%", 62.7 * scale, color=WARM)
        adapter = labelled_bar("provider adapter", "99.9%", 99.9 * scale, color=GOOD)
        bars = VGroup(standard, adapter).arrange(DOWN, buff=1.5, aligned_edge=LEFT)
        fit(bars, max_w=11.5)
        bars.move_to(UP * 0.1)

        self.play(FadeIn(standard[0]), Create(standard[1]), FadeIn(standard[2]),
                  run_time=0.8)
        self.play(FadeIn(adapter[0]), Create(adapter[1]), FadeIn(adapter[2]),
                  run_time=0.8)

        # The cost sits under each bar, because the point is that the better
        # score is also the cheaper run.
        costs = VGroup(
            T("$26,098 to run", size=SMALL, color=BAD),
            T("$18,817 to run", size=SMALL, color=GOOD),
        )
        costs[0].next_to(standard, DOWN, buff=0.28).align_to(standard[1], LEFT)
        costs[1].next_to(adapter, DOWN, buff=0.28).align_to(adapter[1], LEFT)
        self.play(FadeIn(costs[0], shift=UP * 0.1), run_time=0.5)
        self.play(FadeIn(costs[1], shift=UP * 0.1), run_time=0.5)

        note = P(["the new harness keeps reasoning state between requests.",
                  "the old one makes the model write its thinking out as text."],
                 size=SMALL, color=DIM, align=ORIGIN)
        fit(note, max_w=11.0)
        note.to_edge(DOWN, buff=0.7)
        self.play(Write(note), run_time=1.4)
        self.hold()
        self.retire(bars, costs, note, run_time=0.6)

    # -- story two ---------------------------------------------------------

    def story_two(self):
        card = self.story_open(
            "story2_open", "STORY TWO",
            ["part of the thinking", "never becomes text"],
            sub="recurrent depth: the model loops activations through its own layers",
            banner="STORY TWO · reasoning you cannot read",
        )

        # The model, what it writes down, and what it keeps to itself.
        stack = VGroup(*[
            Rectangle(width=2.0, height=0.26, stroke_width=0,
                      fill_color=COOL, fill_opacity=0.8)
            for _ in range(8)
        ]).arrange(DOWN, buff=0.1)
        stack_label = T("the model", size=SMALL, color=COOL).next_to(stack, DOWN, buff=0.3)
        model = VGroup(stack, stack_label).move_to(LEFT * 0.6 + DOWN * 0.4)

        tokens = VGroup(*[
            Rectangle(width=0.9, height=0.3, stroke_width=2, stroke_color=GOOD,
                      fill_color=GOOD, fill_opacity=0.15)
            for _ in range(4)
        ]).arrange(DOWN, buff=0.25)
        tokens_label = P(["written out as tokens", "you can read this"],
                         size=SMALL, color=GOOD, align=ORIGIN)
        tokens_label.next_to(tokens, DOWN, buff=0.3)
        visible = VGroup(tokens, tokens_label).next_to(model, LEFT, buff=1.6)
        arrow_out = Arrow(stack.get_left(), tokens.get_right(), buff=0.2,
                          stroke_width=3, color=GOOD,
                          max_tip_length_to_length_ratio=0.15)

        loop = CurvedArrow(stack.get_right() + UP * 0.9, stack.get_right() + DOWN * 0.9,
                           angle=-2.6, color=BAD, stroke_width=4)
        loop_label = P(["looped back through itself", "you cannot read this"],
                       size=SMALL, color=BAD, align=ORIGIN)
        # To the right of the loop, not under it: under it is where the model's
        # own label lives.
        loop_label.next_to(loop, RIGHT, buff=0.3)
        hidden = VGroup(loop, loop_label)

        diagram = VGroup(visible, arrow_out, model, hidden)
        fit(diagram, max_w=11.5, max_h=4.2)
        diagram.move_to(LEFT * 0.4 + DOWN * 0.5)

        self.morph(card, model, run_time=1.0)
        self.play(Create(arrow_out), FadeIn(tokens, lag_ratio=0.15), run_time=0.9)
        self.play(Write(tokens_label), run_time=0.7)
        self.play(Create(loop), run_time=0.8)
        self.play(Write(loop_label), run_time=0.8)
        self.hold()
        self.diagram = diagram
        self.hidden = hidden

    def opaque(self):
        self.say("story2_why")
        self.play(self.diagram.animate.scale(0.62).to_edge(LEFT, buff=0.5).set_y(-0.5),
                  run_time=0.9)

        quote = P(['"could totally destroy', 'chain-of-thought monitorability"'],
                  size=SMALL, color=BAD, align=ORIGIN)
        who = T("Buck Shlegeris, safety researcher", size=SMALL, color=DIM)
        reply = P(["OpenAI: our use of it is limited,",
                   "and visible reasoning is preserved"],
                  size=SMALL, color=ACCENT, align=ORIGIN)
        column = VGroup(quote, who, reply).arrange(DOWN, buff=0.55)
        fit(column, max_w=4.4)
        column.to_edge(RIGHT, buff=0.5).set_y(0.9)
        self.spread([quote, who, reply], run_time=0.6, reserve=6.0)

        consequence = P(["thinking done inside the loop is thinking",
                         "your evaluation cannot observe"],
                        size=SMALL, color=FG, align=ORIGIN)
        fit(consequence, max_w=11.0)
        consequence.to_edge(DOWN, buff=0.7)
        self.play(Write(consequence), run_time=1.4)
        self.hold()
        self.retire(column, consequence, run_time=0.6)
        self.play(self.diagram.animate.set_x(0).set_y(-0.7), run_time=0.8)
