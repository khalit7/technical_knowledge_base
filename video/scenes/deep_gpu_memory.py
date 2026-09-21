"""
Deep dive: the GPU memory hierarchy.

One construction, grown: the roofline. It is drawn once, kernels are placed on
it, the matmul point is dragged down the slope by a naive implementation and
walked back up by tiling. Everything else on screen is annotation around it.

    manim -qh --media_dir out/media video/scenes/deep_gpu_memory.py DeepDiveScene
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
    Dot,
    FadeIn,
    Line,
    Rectangle,
    VGroup,
    Write,
)

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from common.deepdive import DeepDive                      # noqa: E402
from common.scene import Narration                        # noqa: E402
from common.style import (                                # noqa: E402
    ACCENT,
    BAD,
    COOL,
    DIM,
    FG,
    GOOD,
    RULE,
    SMALL,
    WARM,
    P,
    T,
    fit,
    pill,
)
from scripts.deep_gpu_memory import SCRIPT                # noqa: E402

AUDIO = ROOT / "out" / "audio" / "deep_gpu_memory"
TIMING = ROOT / "out" / "timing_deep_gpu_memory.json"

# The roofline, in scene units. x is arithmetic intensity, y is attainable
# speed; both are drawn schematically rather than to scale, which the frame
# says out loud.
X0, Y0, XW, YH = -3.2, -1.7, 6.4, 3.0
RIDGE_X = 0.42          # where the slope meets the flat roof, as a fraction


class DeepDiveScene(DeepDive):
    narration = Narration(SCRIPT, AUDIO)
    timing_out = TIMING

    TOPIC = "GPU memory hierarchy"
    SUBTITLE = "why nearly every kernel is starving, not thinking"
    UPDATED = "21 September 2026"

    def construct(self):
        self.camera.background_color = "#0E1116"
        self.two_numbers()
        self.the_question()
        self.definition()
        self.build_roofline()
        self.the_matmul()
        self.naive()
        self.tiling()
        self.coalescing()
        self.objection()
        self.take("close",
                  ["work out the intensity before you optimise anything."],
                  "under the crossover, every clever thing you do to the arithmetic "
                  "is wasted")
        self.resources("resources", [
            ["Horace He, Making Deep Learning Go Brrrr From First Principles",
             "the canonical explanation of the three regimes (25 min)"],
            ["Simon Boehm's matmul worklog",
             "coalescing, shared memory and tiling, measured at every step (1h 30m)"],
            ["PMPP 5th edition, chapters 5 and 6",
             "the tiled matmul derivation everyone learns from (1h 30m)"],
        ])

    # -- tension: two numbers and a division -------------------------------

    def two_numbers(self):
        self.say("open")
        flops = T("105 TFLOP/s", size=48, color=ACCENT)
        flops_note = T("arithmetic", size=SMALL, color=DIM).next_to(flops, DOWN, buff=0.25)
        band = T("1.79 TB/s", size=48, color=WARM)
        band_note = T("memory", size=SMALL, color=DIM).next_to(band, DOWN, buff=0.25)
        pair = VGroup(VGroup(flops, flops_note), VGroup(band, band_note))
        pair.arrange(RIGHT, buff=2.2).move_to(UP * 0.6)
        card = T("RTX 5090, single precision", size=SMALL, color=DIM)
        card.next_to(pair, UP, buff=0.7)

        self.play(FadeIn(card), run_time=0.5)
        self.play(Write(pair[0]), run_time=1.0)
        self.play(Write(pair[1]), run_time=1.0)

        rule = Line(LEFT * 3.0, RIGHT * 3.0, color=RULE, stroke_width=2)
        rule.next_to(pair, DOWN, buff=0.7)
        self.play(Create(rule), run_time=0.6)
        self.hold()

        self.say("ridge")
        answer = T("≈ 59 operations per byte", size=40, color=GOOD)
        answer.next_to(rule, DOWN, buff=0.6)
        self.play(Write(answer), run_time=1.2)

        under = P(["below 59, the arithmetic units wait.",
                   "adding two tensors: 1 operation per 12 bytes."],
                  size=SMALL, color=BAD, align=ORIGIN)
        fit(under, max_w=10.0)
        under.next_to(answer, DOWN, buff=0.6)
        self.spread(list(under), run_time=0.6)
        self.hold()
        self.retire(card, pair, rule, under, run_time=0.6)
        self.answer = answer

    def the_question(self):
        self.say("question")
        question = P(["is this kernel slow because of the maths,",
                      "or slow because of the memory?"],
                     size=36, color=FG, align=ORIGIN)
        fit(question, max_w=11.0)
        question.move_to(UP * 0.4)
        self.morph(self.answer, question, run_time=1.0)

        note = T("one number answers it, before you profile anything",
                 size=SMALL, color=ACCENT)
        note.next_to(question, DOWN, buff=0.7)
        self.play(FadeIn(note, shift=UP * 0.15), run_time=0.8)
        self.hold()
        self.retire(note, run_time=0.4)
        self.question_text = question

    def definition(self):
        self.say("intensity")
        title = T("arithmetic intensity", size=40, color=GOOD)
        formula = T("operations performed  ÷  bytes moved", size=SMALL, color=FG)
        crossover = T("this card, single precision:  59", size=SMALL, color=WARM)
        block = VGroup(title, formula, crossover).arrange(DOWN, buff=0.45)
        fit(block, max_w=10.0)
        block.move_to(UP * 0.3)
        self.morph(self.question_text, block, run_time=1.0)

        sides = VGroup(
            pill("below it: memory bound", BAD, width=5.6),
            pill("above it: compute bound", GOOD, width=5.6),
        ).arrange(RIGHT, buff=0.8)
        fit(sides, max_w=11.0)
        sides.next_to(block, DOWN, buff=0.8)
        self.spread(sides, run_time=0.5)
        self.hold()
        self.retire(block, sides, run_time=0.5)

    # -- the construction ---------------------------------------------------

    def build_roofline(self):
        self.say("roofline")
        ridge = X0 + XW * RIDGE_X

        axes = VGroup(
            Line([X0, Y0, 0], [X0 + XW, Y0, 0], color=RULE, stroke_width=2),
            Line([X0, Y0, 0], [X0, Y0 + YH, 0], color=RULE, stroke_width=2),
        )
        x_label = T("arithmetic intensity (operations per byte) · schematic",
                    size=SMALL, color=DIM)
        x_label.scale(0.82).next_to(axes[0], DOWN, buff=0.75)
        y_label = P(["attainable", "speed"], size=SMALL, color=DIM, align=ORIGIN)
        y_label.scale(0.82).next_to(axes[1], LEFT, buff=0.3)

        self.play(Create(axes), FadeIn(x_label), FadeIn(y_label), run_time=0.9)

        slope = Line([X0, Y0, 0], [ridge, Y0 + YH * 0.78, 0], color=WARM, stroke_width=4)
        flat = Line([ridge, Y0 + YH * 0.78, 0], [X0 + XW, Y0 + YH * 0.78, 0],
                    color=GOOD, stroke_width=4)
        # Labels go where the plot is empty: above the slope on the left, above
        # the flat roof on the right. Anywhere else and they land on the points.
        slope_label = T("limited by bandwidth", size=SMALL, color=WARM)
        slope_label.scale(0.82).move_to([X0 + XW * 0.10, Y0 + YH * 0.92, 0])
        slope_label.align_to([X0 + 0.15, 0, 0], LEFT)
        flat_label = T("limited by the arithmetic units", size=SMALL, color=GOOD)
        flat_label.scale(0.82).move_to([X0 + XW * 0.74, Y0 + YH * 0.92, 0])

        self.play(Create(slope), run_time=0.9)
        self.play(FadeIn(slope_label), run_time=0.4)
        self.play(Create(flat), run_time=0.9)
        self.play(FadeIn(flat_label), run_time=0.4)

        ridge_mark = VGroup(
            Line([ridge, Y0, 0], [ridge, Y0 + YH * 0.78, 0],
                 color=DIM, stroke_width=1.5),
            T("59", size=SMALL, color=ACCENT).scale(0.9)
             .move_to([ridge + 0.28, Y0 + 0.22, 0]),
        )
        self.play(Create(ridge_mark[0]), FadeIn(ridge_mark[1]), run_time=0.6)

        # Three real kernels, placed as the narration names them.
        self.kernels = {}
        for name, frac, colour, side, nudge in [
                ("add, GELU", 0.06, BAD, RIGHT, DOWN * 0.1),
                ("softmax, layernorm", 0.20, BAD, RIGHT, UP * 0.55),
                ("large matmul", 0.72, GOOD, DOWN, DOWN * 0.05)]:
            x = X0 + XW * frac
            y = Y0 + YH * 0.78 * min(frac / RIDGE_X, 1.0)
            dot = Dot([x, y, 0], radius=0.09, color=colour)
            label = T(name, size=SMALL, color=colour).scale(0.82)
            label.next_to(dot, side, buff=0.28).shift(nudge)
            self.kernels[name] = VGroup(dot, label)

        self.spread(list(self.kernels.values()), run_time=0.5)
        self.hold()

        self.roofline = VGroup(axes, x_label, y_label, slope, flat, slope_label,
                               flat_label, ridge_mark,
                               *self.kernels.values())
        self.slope_line, self.ridge_x = slope, ridge

    # -- the worked example -------------------------------------------------

    def the_matmul(self):
        self.say("matmul")
        self.set_home(self.roofline, width=6.4, y=0.2, opacity=0.55)

        steps = self.derive([
            "N x N matmul",
            "work:  2N³ operations",
            "data:  3N² numbers",
            "intensity = 2N³ / 3N²  =  ⅔N",
            "it grows with the matrix",
        ], colour=WARM, width=6.4, y=0.9, run_time=0.7)

        house = P(["so: keep the matmuls big,", "and fuse everything around them."],
                  size=SMALL, color=ACCENT, align=ORIGIN)
        fit(house, max_w=6.4)
        house.next_to(steps, DOWN, buff=0.6).set_x(steps.get_x())
        self.play(Write(house), run_time=1.2)
        self.hold()
        self.retire(steps, house, run_time=0.5)

    def naive(self):
        self.say("naive")
        lines = P(["the obvious kernel: one thread per output element.",
                   "each thread reads a whole row of A and column of B.",
                   "every element is fetched N times."],
                  size=SMALL, color=FG, align=LEFT)
        fit(lines, max_w=6.6)
        lines.to_edge(RIGHT, buff=0.5).set_y(1.2)
        self.spread(list(lines), run_time=0.6, reserve=8.0)

        # The matmul point slides back down the bandwidth roof.
        matmul = self.kernels["large matmul"]
        self.lift(self.roofline, opacity=1.0)
        target_x = self.ridge_x - 1.9
        target_y = Y0 + YH * 0.78 * ((target_x - X0) / (self.ridge_x - X0))
        scale = self.roofline.get_width() / 6.4
        self.play(matmul.animate.move_to(
            self.roofline.get_center()
            + (RIGHT * (target_x) + UP * (target_y)) * scale * 0.0
            + RIGHT * (-1.6) + DOWN * (0.75)), run_time=1.2)

        verdict = T("compute-bound work, running at the speed of memory",
                    size=SMALL, color=BAD)
        fit(verdict, max_w=6.6)
        verdict.next_to(lines, DOWN, buff=0.8).align_to(lines, LEFT)
        self.play(Write(verdict), run_time=1.2)
        self.hold()
        self.retire(lines, verdict, run_time=0.5)
        self.fade_to(self.roofline, 0.55, run_time=0.3)

    # -- the fix ------------------------------------------------------------

    def tiling(self):
        self.say("tiling")
        levels = VGroup(
            pill("HBM · the slow, enormous one", BAD, width=6.4),
            pill("shared memory · one tile, loaded once", GOOD, width=6.4),
            pill("registers · a patch of the output", ACCENT, width=6.4),
        ).arrange(DOWN, buff=0.35)
        fit(levels, max_w=6.6)
        levels.to_edge(RIGHT, buff=0.5).set_y(1.1)
        self.spread(levels, run_time=0.6, reserve=18.0)

        gain = T("32-wide tile → 32x fewer reads from main memory",
                 size=SMALL, color=WARM)
        fit(gain, max_w=6.6)
        gain.next_to(levels, DOWN, buff=0.6).align_to(levels, LEFT)
        self.play(FadeIn(gain, shift=UP * 0.12), run_time=0.7)

        mirror = P(["the code mirrors the hierarchy:",
                    "HBM → shared → registers → accumulators."],
                   size=SMALL, color=FG, align=LEFT)
        fit(mirror, max_w=6.6)
        mirror.next_to(gain, DOWN, buff=0.5).align_to(levels, LEFT)
        self.play(Write(mirror), run_time=1.3)

        # And the point climbs back to the roof.
        matmul = self.kernels["large matmul"]
        self.lift(self.roofline, opacity=1.0)
        self.play(matmul.animate.shift(RIGHT * 1.6 + UP * 0.75), run_time=1.2)
        self.hold()
        self.retire(levels, gain, mirror, run_time=0.5)
        self.fade_to(self.roofline, 0.55, run_time=0.3)

    def coalescing(self):
        self.say("coalescing")
        head = T("32 threads issue their reads together", size=SMALL, color=DIM)

        def lane(offsets, colour, label):
            boxes = VGroup(*[
                Rectangle(width=0.34, height=0.34, stroke_width=1.5,
                          stroke_color=colour, fill_color=colour, fill_opacity=0.25)
                for _ in offsets
            ])
            for box, off in zip(boxes, offsets):
                box.move_to([off * 0.42, 0, 0])
            text = T(label, size=SMALL, color=colour).scale(0.9)
            text.next_to(boxes, DOWN, buff=0.3)
            return VGroup(boxes, text)

        good = lane(range(8), GOOD, "contiguous: one transaction")
        bad = lane([0, 3, 6, 9, 12, 15, 18, 21], BAD, "scattered: many, and 10-30x slower")
        block = VGroup(head, good, bad).arrange(DOWN, buff=0.55)
        fit(block, max_w=6.8, max_h=3.4)
        block.to_edge(RIGHT, buff=0.5).set_y(1.0)

        self.play(FadeIn(head), run_time=0.4)
        self.play(FadeIn(good, shift=UP * 0.12), run_time=0.7)
        self.play(FadeIn(bad, shift=UP * 0.12), run_time=0.7)

        worklog = P(["swapping which index maps to the fastest thread:",
                     "300 GFLOP/s → 2000 GFLOP/s. one line."],
                    size=SMALL, color=WARM, align=LEFT)
        fit(worklog, max_w=6.8)
        worklog.next_to(block, DOWN, buff=0.6).align_to(block, LEFT)
        self.spread(list(worklog), run_time=0.6)
        self.hold()
        self.retire(block, worklog, run_time=0.5)

    def objection(self):
        self.say("objection")
        q = T("is this not what torch.compile does for me?", size=SMALL, color=ACCENT)
        answer = P(["fusion is exactly this argument, so: half of it.",
                    "but a compiler can only fuse what you gave it.",
                    "it cannot change an algorithm that moves too much,",
                    "and it will not tell you which roof you are under."],
                   size=SMALL, color=FG, align=LEFT)
        flash = P(["FlashAttention is the proof:",
                   "not a faster formula, the same formula",
                   "that never writes the big matrix to memory."],
                  size=SMALL, color=GOOD, align=LEFT)
        block = VGroup(q, answer, flash).arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        fit(block, max_w=6.8, max_h=4.2)
        block.to_edge(RIGHT, buff=0.5).set_y(0.4)

        self.play(FadeIn(q), run_time=0.5)
        self.spread(list(answer), run_time=0.5, reserve=9.0)
        self.play(FadeIn(flash, shift=UP * 0.12), run_time=1.0)
        self.hold()
        self.retire(block, run_time=0.5)
        self.lift(self.roofline, opacity=0.9)
