"""
Tech news, week ending 14 September 2026. The two minute edition.

Built on the shared news furniture in common/news.py, so what is written here
is only this week's argument and this week's diagrams: an encoder-decoder split
against the usual single stack, the key-value cache it saves, and the gap
between a public benchmark and private code.

    manim -qh --media_dir out/media video/scenes/tech_news_2026_09_14_short.py Short
"""

import sys
from pathlib import Path

from manim import (
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    Create,
    FadeIn,
    Line,
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
    stat,
)
from scenes.tech_news_2026_09_21 import hbar, labelled_bar  # noqa: E402
from scripts.tech_news_2026_09_14_short import SCRIPT     # noqa: E402

AUDIO = ROOT / "out" / "audio" / "tech_news_2026_09_14_short"
TIMING = ROOT / "out" / "timing_2026_09_14_short.json"

BODY_TOP = 2.0          # clears the ident strip and the story banner


def layer_stack(n, colour, width=1.4, total_height=3.1):
    """A transformer as a pile of layers, sized to a target height.

    Forty layers at a readable thickness is taller than the frame, so the
    thickness follows from how much room there is rather than the other way
    round. Both stacks in a comparison must be built the same way or the
    picture says the layers are different sizes.
    """
    pitch = total_height / n
    layers = VGroup(*[
        Rectangle(width=width, height=pitch * 0.62, stroke_width=0,
                  fill_color=colour, fill_opacity=0.8)
        for _ in range(n)
    ]).arrange(DOWN, buff=pitch * 0.38)
    return layers


class Short(NewsEdition):
    narration = Narration(SCRIPT, AUDIO)
    timing_out = TIMING

    EDITION = "Tech news"
    DATE = "14 September 2026"
    WINDOW = "covering 7 to 14 September"

    def construct(self):
        self.camera.background_color = "#0E1116"
        self.ident()
        self.story_one()
        self.kv_cache()
        self.story_two()
        self.the_gap()
        self.take("close",
                  ["the leaderboard and the production system",
                   "have come apart"],
                  "not what it scores: what it costs, and what it does on code nobody has seen")

    # -- story one ---------------------------------------------------------

    def story_one(self):
        card = self.story_open(
            "story1_open", "STORY ONE",
            ["an encoder and a decoder,", "not one stack"],
            sub="DeepSeek V4.1-Flash, 552B parameters, open weights",
        )
        self.to_banner(card, "STORY ONE · the shape of the model")

        # What everyone else ships: one stack.
        usual = layer_stack(40, DIM)
        usual.move_to(LEFT * 3.6 + DOWN * 0.35)
        usual_label = P(["every other frontier model", "one stack, 40 layers"],
                        size=SMALL, color=DIM, align=ORIGIN)
        usual_label.next_to(usual, DOWN, buff=0.35)
        theirs = VGroup(usual, usual_label)
        self.play(FadeIn(usual, lag_ratio=0.02), run_time=1.0)
        self.play(Write(usual_label), run_time=0.7)

        # What this one is: the same forty layers, cut in half.
        enc = layer_stack(20, ACCENT)
        dec = layer_stack(20, COOL)
        split = VGroup(enc, dec).arrange(RIGHT, buff=0.9, aligned_edge=UP)
        split.align_to(usual, UP).set_x(3.2)
        enc_label = T("encoder · 20", size=SMALL, color=ACCENT).next_to(enc, DOWN, buff=0.3)
        dec_label = T("decoder · 20", size=SMALL, color=COOL).next_to(dec, DOWN, buff=0.3)
        group = VGroup(split, enc_label, dec_label)

        self.play(FadeIn(split, lag_ratio=0.02), run_time=1.0)
        self.play(Write(enc_label), Write(dec_label), run_time=0.7)
        self.hold()
        self.usual, self.split = theirs, group

    def kv_cache(self):
        self.say("story1_why")
        self.retire(self.usual, run_time=0.5)
        self.play(self.split.animate.set(width=3.0).to_edge(LEFT, buff=0.8).set_y(-0.6),
                  run_time=0.9)

        head = T("key-value cache, per conversation", size=SMALL, color=DIM)
        bars = VGroup(
            labelled_bar("V4-Flash", "the memory it used to need", 7.2, color=BAD),
            labelled_bar("V4.1-Flash", "about a quarter of it", 1.8, color=GOOD),
        ).arrange(DOWN, buff=0.7, aligned_edge=LEFT)
        block = VGroup(head, bars).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
        fit(block, max_w=8.6, max_h=3.0)
        block.next_to(self.split, RIGHT, buff=0.7).set_y(0.6)

        self.play(FadeIn(head), run_time=0.4)
        for row in bars:
            self.play(FadeIn(row[0]), Create(row[1]), FadeIn(row[2]), run_time=0.6)

        cards = VGroup(
            stat("552B", "parameters in total", color=WARM),
            stat("8B", "active while reading", color=ACCENT),
            stat("16B", "active while writing", color=COOL),
        ).arrange(RIGHT, buff=1.1)
        fit(cards, max_w=11.0, max_h=2.0)
        cards.to_edge(DOWN, buff=0.7)
        self.spread(cards, run_time=0.5)
        self.hold()
        self.retire(self.split, block, cards, run_time=0.6)

    # -- story two ---------------------------------------------------------

    def story_two(self):
        card = self.story_open(
            "story2_open", "STORY TWO",
            ["the best agent solved", "38.8% of real tasks"],
            sub="Real-SWE: ten licensed tasks from real companies, private code",
            banner="STORY TWO · agents on private code",
        )

        rows = [
            ("Fable 5.1", "38.8%", 38.8), ("GPT-6 Astra", "33.8%", 33.8),
            ("Gemini 3.8 Flash", "31.2%", 31.2), ("GLM-5.3", "28.8%", 28.8),
            ("Grok 4.6", "23.8%", 23.8), ("Muse Spark 1.3", "23.8%", 23.8),
            ("Kimi K3", "18.8%", 18.8), ("GPT-5.6 Sol", "16.2%", 16.2),
        ]
        scale = 6.4 / 60.0
        chart = VGroup(*[labelled_bar(n, v, s * scale, color=WARM) for n, v, s in rows])
        chart.arrange(DOWN, buff=0.22, aligned_edge=LEFT)
        fit(chart, max_h=4.6)
        chart.move_to(DOWN * 0.7)

        self.morph(card, chart, run_time=1.1)
        self.hold()
        self.chart = chart

    def the_gap(self):
        self.say("story2_detail")
        self.play(self.chart.animate.scale(0.82).to_edge(LEFT, buff=0.9).set_y(-0.5),
                  run_time=0.9)

        scale = 6.4 / 60.0 * 0.82
        public = VGroup(
            labelled_bar("Terminal-Bench", "55.8%", 55.8 * scale, color=GOOD),
            labelled_bar("the same models", "57.9%", 57.9 * scale, color=GOOD),
        ).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
        head = T("one week earlier, in public", size=SMALL, color=DIM)
        block = VGroup(head, public).arrange(DOWN, buff=0.45, aligned_edge=LEFT)
        fit(block, max_w=6.0)
        block.next_to(self.chart, RIGHT, buff=0.8).set_y(1.4)
        self.play(FadeIn(head), run_time=0.4)
        for row in public:
            self.play(FadeIn(row[0]), Create(row[1]), FadeIn(row[2]), run_time=0.6)

        gap = T("about 20 points", size=SMALL, color=BAD)
        gap.next_to(block, DOWN, buff=0.5).align_to(block, LEFT)
        rule = Line(gap.get_left() + LEFT * 0.1, gap.get_right() + RIGHT * 0.1,
                    color=BAD, stroke_width=3).next_to(gap, UP, buff=0.15)
        self.play(Create(rule), FadeIn(gap), run_time=0.7)

        facts = VGroup(
            T("$2.50 to $6.96 per attempt, unrelated to success", size=SMALL, color=BAD),
            T("71% of runs that finished inside ten minutes failed", size=SMALL, color=BAD),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        fit(facts, max_w=6.2)
        facts.next_to(gap, DOWN, buff=0.6).align_to(block, LEFT)
        self.spread(facts, run_time=0.5)
        self.hold()
        self.retire(block, gap, rule, facts, run_time=0.6)
        self.play(self.chart.animate.set_x(0).set_y(-0.6), run_time=0.8)
