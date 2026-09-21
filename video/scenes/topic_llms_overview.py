"""
Topic overview: the large language model landscape.

The map is built in three groups, parked on the left, and then lit up provider
by provider as each lab's bet is explained. The last third leaves the map for
the two things a list cannot show: what everyone is doing the same way, and how
sparse these models have become.

    manim -qh --media_dir out/media video/scenes/topic_llms_overview.py Overview
"""

import sys
from pathlib import Path

from manim import DOWN, LEFT, ORIGIN, RIGHT, UP, Create, FadeIn, VGroup, Write

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from common.overview import TopicOverview                 # noqa: E402
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
    hbar,
    labelled_bar,
    pill,
)
from scripts.topic_llms_overview import SCRIPT            # noqa: E402

AUDIO = ROOT / "out" / "audio" / "topic_llms_overview"
TIMING = ROOT / "out" / "timing_topic_llms_overview.json"

CLOSED = [
    ("OpenAI", "GPT-5.6 Sol/Terra/Luna · GPT-6 Astra"),
    ("Anthropic", "Claude Haiku 4.5, Sonnet 5, Opus 5, Fable"),
    ("Google DeepMind", "Gemini 3.8 · Gemma 4 (open)"),
    ("SpaceXAI", "Grok 4.6, 1.5T"),
    ("Meta MSL", "Muse Spark 1.3 · Llama legacy"),
]

OPEN_FRONTIER = [
    ("DeepSeek", "V4 Pro 1.6T/49B · V4.1-Flash 552B"),
    ("Alibaba Qwen", "Qwen3.8 2.4T-A95B · sub-1B to 2.4T"),
    ("Moonshot", "Kimi K3 2.8T/104B"),
    ("Z.ai (Zhipu)", "GLM-5.3 · GLM-5.3-Flash, MIT"),
    ("MiniMax", "M3 428B/22B"),
    ("Mistral", "Large 3, Apache 2.0"),
    ("Tencent", "Hunyuan Hy4 770B/49B"),
    ("StepFun", "Step 5 Preview 600B/27B"),
]

FULLY_OPEN = [
    ("Ai2", "OLMo 3.1 · data, code, checkpoints, logs"),
    ("IFM (Abu Dhabi)", "K2, 0.9B to 375B, Apache 2.0"),
    ("small open", "Gemma 4 · gpt-oss 120B/20B"),
]


class Overview(TopicOverview):
    narration = Narration(SCRIPT, AUDIO)
    timing_out = TIMING

    TOPIC = "Topic: llms"
    SUBTITLE = "who builds what, and what each of them is betting on"
    UPDATED = "21 September 2026"

    def construct(self):
        self.camera.background_color = "#0E1116"
        self.title_card()
        self.build_map()
        self.the_question()
        self.openai_anthropic()
        self.google_meta()
        self.deepseek_qwen()
        self.moonshot_others()
        self.convergence()
        self.numbers()
        self.take("close",
                  ["the map is not for picking a model.", "it is for predicting a lab."],
                  "what would redraw it is somebody breaking the convergence")

    # -- the inventory -----------------------------------------------------

    def build_map(self):
        self.say("map_closed")
        closed = self.column("US FRONTIER · CLOSED WEIGHTS", CLOSED, ACCENT)
        openf = self.column("OPEN-WEIGHT FRONTIER", OPEN_FRONTIER, GOOD)
        research = self.column("FULLY OPEN / SMALL OPEN", FULLY_OPEN, COOL)

        the_map = VGroup(closed, openf, research).arrange(RIGHT, buff=0.7,
                                                          aligned_edge=UP)
        fit(the_map, max_w=12.4, max_h=4.9)
        the_map.move_to(DOWN * 0.55)

        self.reveal_column(closed, reserve=0.6)
        self.hold()

        self.say("map_open")
        self.reveal_column(openf, reserve=0.6)
        self.hold()

        self.say("map_research")
        self.reveal_column(research, reserve=2.0)
        count = T("20 model families on one screen", size=SMALL, color=WARM)
        count.to_edge(DOWN, buff=0.5)
        self.play(FadeIn(count, shift=UP * 0.15), run_time=0.6)
        self.hold()
        self.retire(count, run_time=0.4)
        self.the_map = the_map

    def the_question(self):
        self.say("question")
        self.park_map(self.the_map)

        question = P(["they are converging on architecture.",
                      "what differs is the bet."],
                     size=SMALL, color=FG, align=LEFT)
        fit(question, max_w=6.6)
        question.to_edge(RIGHT, buff=0.5).set_y(1.4)
        self.play(Write(question), run_time=1.4)

        shared = VGroup(
            pill("sparse mixture of experts", DIM, width=6.4),
            pill("a reasoning mode", DIM, width=6.4),
            pill("trainable sparse attention", DIM, width=6.4),
        ).arrange(DOWN, buff=0.3)
        fit(shared, max_w=6.6)
        shared.next_to(question, DOWN, buff=0.6).align_to(question, LEFT)
        self.spread(shared, run_time=0.4)
        self.hold()
        self.retire(question, shared, run_time=0.5)

    # -- the philosophies --------------------------------------------------

    def lab_panel(self, key, providers, lines, colour=FG):
        """One beat: light up the labs on the map, put their bet beside it."""
        self.say(key)
        self.focus(*providers)
        block = self.panel(lines, colour=colour)
        self.spread(list(block), run_time=0.45, reserve=0.8)
        self.hold()
        self.retire(block, run_time=0.5)

    def openai_anthropic(self):
        self.say("openai_anthropic")
        self.focus("OpenAI", "Anthropic")

        head = T("who decides how long the model thinks?", size=SMALL, color=WARM)
        left = P(["OpenAI: a router decides.",
                  "hidden, per request.",
                  "Sol / Terra / Luna are cost bands.",
                  "same prompt, different compute."],
                 size=SMALL, color=ACCENT, align=LEFT)
        right = P(["Anthropic: the caller decides.",
                   "extended thinking is a token budget.",
                   "predictable cost.",
                   "leads harness benchmarks."],
                  size=SMALL, color=GOOD, align=LEFT)
        pair = VGroup(left, right).arrange(RIGHT, buff=0.8, aligned_edge=UP)
        block = VGroup(head, pair).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
        fit(block, max_w=6.9)
        block.to_edge(RIGHT, buff=0.45).set_y(0.3)

        self.play(FadeIn(head), run_time=0.5)
        self.spread([left, right], run_time=0.6, reserve=1.0)
        self.hold()
        self.retire(block, run_time=0.5)

    def google_meta(self):
        self.lab_panel(
            "google_meta", ["Google DeepMind", "Meta MSL"],
            ["Google: the only frontier lab off NVIDIA.",
             "TPUs, JAX, Pathways. a hedge on supply.",
             "long-context pioneer; Gemma is the distillate.",
             "",
             "Meta: was the open-weights standard.",
             "Llama 4 collapsed, the lab was reorganised,",
             "and the frontier line went closed."],
        )

    def deepseek_qwen(self):
        self.lab_panel(
            "deepseek_qwen", ["DeepSeek", "Alibaba Qwen"],
            ["DeepSeek: make a frontier model cheap to serve.",
             "latent attention cuts the KV cache ~10x.",
             "aux-loss-free balancing stops the loss",
             "fighting the real objective.",
             "",
             "Qwen: breadth, not one flagship.",
             "sub-1B to 2.4T, nearly all Apache 2.0.",
             "the most fine-tuned base models there are."],
        )

    def moonshot_others(self):
        self.lab_panel(
            "moonshot_others", ["Moonshot", "Z.ai (Zhipu)", "MiniMax", "Mistral", "Ai2"],
            ["Moonshot: systems research. Muon optimiser,",
             "Kimi Delta Attention, hybridised for recall.",
             "Z.ai: MIT licence, price, agentic coding.",
             "MiniMax: went linear, then partly reversed,",
             "because reasoning needs exact recall.",
             "Mistral: the European Apache 2.0 counterweight.",
             "Ai2: publishes everything, and pays for it",
             "in capability."],
        )

    # -- what they agree on ------------------------------------------------

    def convergence(self):
        self.say("convergence")
        self.focus(colour=DIM)
        self.dim(self.map, opacity=0.18)

        head = T("what all of them now do the same way", size=SMALL, color=WARM)
        rows = VGroup(
            pill("sparse MoE · dense survives only at small scale", GOOD, width=9.4),
            pill("a reasoning mode with an adjustable budget", GOOD, width=9.4),
            pill("trainable sparse or linear attention, everywhere", GOOD, width=9.4),
        ).arrange(DOWN, buff=0.4)
        block = VGroup(head, rows).arrange(DOWN, buff=0.5)
        fit(block, max_w=7.6, max_h=3.8)
        block.to_edge(RIGHT, buff=0.6).set_y(0.9)

        self.play(FadeIn(head), run_time=0.5)
        self.spread(rows, run_time=0.5, reserve=6.5)

        why = P(["because 1M-token context is table stakes,",
                 "and quadratic attention over 1M tokens",
                 "is not affordable at any parameter count."],
                size=SMALL, color=FG, align=ORIGIN)
        fit(why, max_w=7.6)
        why.to_edge(DOWN, buff=0.6).set_x(2.9)
        self.play(Write(why), run_time=1.5)
        self.hold()
        self.retire(block, why, run_time=0.6)

    # -- the numbers -------------------------------------------------------

    def numbers(self):
        self.say("numbers")
        head = T("total parameters, and how few of them run per token",
                 size=SMALL, color=DIM)

        scale = 3.4 / 2800.0
        rows = [
            ("Kimi K3", "2.8T total · 104B active", 2800, 104),
            ("DeepSeek V4 Pro", "1.6T total · 49B active", 1600, 49),
            ("Step 5 Preview", "600B total · 27B active", 600, 27),
        ]
        chart = VGroup()
        for name, caption, total, active in rows:
            row = labelled_bar(name, caption, total * scale, color=DIM,
                               label_width=3.4)
            # The active slice is drawn over the left end of the total bar, so
            # the picture is "how much of this actually runs", not two bars.
            active_bar = hbar(max(active * scale, 0.05), height=0.5, color=WARM,
                              opacity=0.95)
            active_bar.align_to(row[1], LEFT).set_y(row[1].get_y())
            chart.add(VGroup(row, active_bar))
        chart.arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        block = VGroup(head, chart).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
        fit(block, max_w=7.6, max_h=3.4)
        block.to_edge(RIGHT, buff=0.6).set_y(1.0)

        self.play(FadeIn(head), run_time=0.5)
        for row in chart:
            self.play(FadeIn(row, shift=UP * 0.1), run_time=0.55)

        price = P(["Step 5: $2.70 per million output tokens.",
                   "about 18% of what Kimi K3 charges."],
                  size=SMALL, color=GOOD, align=ORIGIN)
        caveat = T("most of these are vendor-reported: a claim, not a measurement",
                   size=SMALL, color=BAD)
        tail = VGroup(price, caveat).arrange(DOWN, buff=0.4)
        fit(tail, max_w=7.6)
        tail.to_edge(DOWN, buff=0.55).set_x(2.9)
        self.play(FadeIn(price, shift=UP * 0.15), run_time=0.7)
        self.play(Write(caveat), run_time=1.2)
        self.hold()
        self.retire(block, tail, run_time=0.6)
        self.lift(self.map, opacity=0.75)
