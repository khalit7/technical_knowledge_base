"""
Topic overview: CUDA and GPU programming.

The map is a stack, so it is built as three columns of layers and then parked,
exactly as the llms map is. The two custom visuals are the memory pyramid,
which is the argument of the whole topic, and the authoring ladder, which is
the choice the viewer actually has to make.

    manim -qh --media_dir out/media video/scenes/topic_cuda_overview.py Overview
"""

import sys
from pathlib import Path

from manim import DOWN, LEFT, ORIGIN, RIGHT, UP, FadeIn, Polygon, VGroup, Write

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
    labelled_bar,
    pill,
)
from scripts.topic_cuda_overview import SCRIPT            # noqa: E402

AUDIO = ROOT / "out" / "audio" / "topic_cuda_overview"
TIMING = ROOT / "out" / "timing_topic_cuda_overview.json"

MACHINE = [
    ("execution model", "threads · warps · blocks · grid"),
    ("memory", "registers · shared · L2 · HBM"),
    ("tensor cores", "wgmma · TMA · tcgen05 · TMEM"),
]

WRITE = [
    ("CUDA C++", "threads. the bottom."),
    ("CUTLASS / CuTe", "templates, now a Python DSL"),
    ("Triton (+ Gluon)", "a block at a time, in Python"),
    ("torch.compile", "emits Triton for you"),
    ("CUDA Rust", "cuda-oxide · cutile-rs"),
]

CALL = [
    ("cuBLAS / cuBLASLt", "what torch.matmul calls"),
    ("cuDNN", "what attention dispatches to"),
    ("Nsight Systems", "the whole-program timeline"),
    ("Nsight Compute", "one kernel, hardware counters"),
    ("ROCm 10.0", "the other vendor's stack"),
]


class Overview(TopicOverview):
    narration = Narration(SCRIPT, AUDIO)
    timing_out = TIMING

    TOPIC = "Topic: cuda-and-gpu-programming"
    SUBTITLE = "what the machine is, where you write, and what to call instead"
    UPDATED = "21 September 2026"

    def construct(self):
        self.camera.background_color = "#0E1116"
        self.title_card()
        self.build_map()
        self.the_question()
        self.memory()
        self.where_to_write()
        self.tensor_cores()
        self.rust_tracks()
        self.other_direction()
        self.profiling()
        self.take("close",
                  ["it is a ladder, and you start at the top."],
                  "most people skip to the bottom and optimise arithmetic on a machine "
                  "that was waiting for memory")

    # -- the inventory -----------------------------------------------------

    def build_map(self):
        self.say("map_machine")
        machine = self.column("THE MACHINE", MACHINE, ACCENT)
        write = self.column("WHERE YOU WRITE", WRITE, GOOD)
        call = self.column("WHAT YOU CALL, AND HOW YOU LOOK", CALL, COOL)

        the_map = VGroup(machine, write, call).arrange(RIGHT, buff=0.7,
                                                       aligned_edge=UP)
        fit(the_map, max_w=12.4, max_h=4.9)
        the_map.move_to(DOWN * 0.55)

        self.reveal_column(machine, reserve=0.6)
        self.hold()

        self.say("map_write")
        self.reveal_column(write, reserve=0.6)
        self.hold()

        self.say("map_call")
        self.reveal_column(call, reserve=0.6)
        self.hold()
        self.the_map = the_map

    def the_question(self):
        self.say("question")
        self.park_map(self.the_map)

        claim = P(["nearly all kernel optimisation", "is memory optimisation."],
                  size=self.claim_size(), color=WARM, align=LEFT)
        fit(claim, max_w=6.6)
        claim.to_edge(RIGHT, buff=0.5).set_y(1.3)
        self.play(Write(claim), run_time=1.6)

        why = P(["the card can do far more maths per second",
                 "than it can fetch numbers to do maths on.",
                 "so the question is never how many operations.",
                 "it is how many bytes you moved."],
                size=SMALL, color=FG, align=LEFT)
        fit(why, max_w=6.6)
        why.next_to(claim, DOWN, buff=0.6).align_to(claim, LEFT)
        self.spread(list(why), run_time=0.5)
        self.hold()
        self.retire(claim, why, run_time=0.5)

    @staticmethod
    def claim_size():
        from common.style import H2
        return H2

    # -- the memory pyramid ------------------------------------------------

    def memory(self):
        self.say("memory")
        self.focus("memory")

        # Widening tiers: fast and tiny at the top, vast and slow at the bottom.
        tiers = [
            ("registers", "fastest, tiny", 1.6, GOOD),
            ("shared memory", "per block, fast", 2.8, GOOD),
            ("L2 cache", "shared by the whole chip", 4.2, WARM),
            ("HBM", "enormous, slow", 6.0, BAD),
        ]
        pyramid = VGroup()
        for name, note, width, colour in tiers:
            band = Polygon([-width / 2, 0.28, 0], [width / 2, 0.28, 0],
                           [width / 2, -0.28, 0], [-width / 2, -0.28, 0],
                           stroke_width=0, fill_color=colour, fill_opacity=0.22)
            label = T(name, size=SMALL, color=colour).move_to(band.get_center())
            note_text = T(note, size=SMALL, color=DIM)
            note_text.scale(0.85).next_to(band, RIGHT, buff=0.35)
            pyramid.add(VGroup(band, label, note_text))
        pyramid.arrange(DOWN, buff=0.16)
        fit(pyramid, max_w=7.0, max_h=3.4)
        pyramid.to_edge(RIGHT, buff=0.5).set_y(0.7)

        # The line says "look at the hierarchy", so the hierarchy has to exist
        # when it is said. Reveal the whole pyramid at once, dimmed, then
        # brighten each tier as the narration names it: that satisfies both the
        # rule about pointing at the screen and the rule about revealing in
        # step with the sentence, which otherwise pull against each other.
        for tier in pyramid:
            tier.set_opacity(0.3)
        self.play(FadeIn(pyramid, lag_ratio=0.18), run_time=1.1)
        for tier in pyramid:
            self.play(tier.animate.set_opacity(1.0), run_time=0.45)

        rule = P(["move the data up once,",
                  "and do as much work as possible while it is up there."],
                 size=SMALL, color=FG, align=ORIGIN)
        fit(rule, max_w=7.6)
        rule.to_edge(DOWN, buff=0.6).set_x(2.9)
        self.play(Write(rule), run_time=1.3)

        examples = T("tiling · coalescing · fusion · FlashAttention", size=SMALL,
                     color=ACCENT)
        examples.next_to(rule, UP, buff=0.4).set_x(2.9)
        self.play(FadeIn(examples, shift=UP * 0.12), run_time=0.6)
        self.hold()
        self.retire(pyramid, rule, examples, run_time=0.6)

    # -- the authoring ladder ----------------------------------------------

    def where_to_write(self):
        self.say("where_to_write")
        self.focus("CUDA C++", "Triton (+ Gluon)", "torch.compile")

        head = T("a Triton kernel against the CUDA equivalent", size=SMALL, color=DIM)
        bars = VGroup(
            labelled_bar("lines of code", "about a tenth", 0.9, color=GOOD,
                         label_width=3.0),
            labelled_bar("performance", "within 0 to 20%", 5.6, color=GOOD,
                         label_width=3.0),
        ).arrange(DOWN, buff=0.6, aligned_edge=LEFT)
        block = VGroup(head, bars).arrange(DOWN, buff=0.45, aligned_edge=LEFT)
        fit(block, max_w=7.2)
        block.to_edge(RIGHT, buff=0.5).set_y(1.2)
        self.play(FadeIn(head), run_time=0.4)
        for row in bars:
            self.play(FadeIn(row, shift=UP * 0.1), run_time=0.6)

        ladder = VGroup(
            pill("torch.compile · emits Triton", COOL, width=6.6),
            pill("Triton · a block at a time", GOOD, width=6.6),
            pill("Gluon · hands the hidden parts back", WARM, width=6.6),
            pill("CUDA C++ · threads, and the last 20%", ACCENT, width=6.6),
        ).arrange(DOWN, buff=0.25)
        fit(ladder, max_w=7.2, max_h=2.6)
        ladder.next_to(block, DOWN, buff=0.5).align_to(block, LEFT)
        self.spread(ladder, run_time=0.45)
        self.hold()
        self.retire(block, ladder, run_time=0.6)

    # -- tensor cores ------------------------------------------------------

    def tensor_cores(self):
        self.say("tensor_cores")
        self.focus("tensor cores")

        rows = VGroup(
            P(["wgmma — Hopper. asynchronous matrix multiply,",
               "four cooperating warps, operands from shared memory."],
              size=SMALL, color=ACCENT, align=LEFT),
            P(["TMA — a copy engine. tiles between global and shared,",
               "from a descriptor, swizzling done in hardware."],
              size=SMALL, color=GOOD, align=LEFT),
            P(["tcgen05 — datacentre Blackwell. a per-SM async unit,",
               "issued by one thread, accumulators in its own TMEM."],
              size=SMALL, color=COOL, align=LEFT),
        ).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
        fit(rows, max_w=7.2, max_h=3.2)
        rows.to_edge(RIGHT, buff=0.5).set_y(1.1)
        self.spread(list(rows), run_time=0.6, reserve=14.0)

        catch = P(["an RTX 5090 (sm_120) has TMA and clusters.",
                   "it has none of wgmma, tcgen05 or TMEM.",
                   "Hopper tutorials do not literally run on it."],
                  size=SMALL, color=BAD, align=LEFT)
        fit(catch, max_w=7.2)
        catch.next_to(rows, DOWN, buff=0.6).align_to(rows, LEFT)
        self.spread(list(catch), run_time=0.5)
        self.hold()
        self.retire(rows, catch, run_time=0.6)

    # -- the two Rust tracks -----------------------------------------------

    def rust_tracks(self):
        self.say("rust_tracks")
        self.focus("CUDA Rust")

        left = P(["cuda-oxide", "the thread track.",
                  "aliasing becomes a compile error,",
                  "not a race you find in a profiler.",
                  "early alpha."],
                 size=SMALL, color=ACCENT, align=LEFT)
        right = P(["cutile-rs", "the tile track.",
                   "you write tiles, the compiler maps them.",
                   "in production: Hugging Face Grout,",
                   "mistral.rs."],
                  size=SMALL, color=GOOD, align=LEFT)
        pair = VGroup(left, right).arrange(RIGHT, buff=0.7, aligned_edge=UP)
        fit(pair, max_w=7.2, max_h=3.0)
        pair.to_edge(RIGHT, buff=0.5).set_y(0.9)
        self.spread([left, right], run_time=0.7, reserve=6.0)

        note = P(["same example, same result,", "two different safety arguments."],
                 size=SMALL, color=FG, align=ORIGIN)
        fit(note, max_w=7.2)
        note.next_to(pair, DOWN, buff=0.6).set_x(2.9)
        self.play(Write(note), run_time=1.2)
        self.hold()
        self.retire(pair, note, run_time=0.6)

    def other_direction(self):
        self.say("other_direction")
        self.focus("ROCm 10.0")

        mega = P(["a megakernel fuses a whole decode step",
                  "into one kernel launch."],
                 size=SMALL, color=FG, align=LEFT)
        figures = VGroup(
            T("292 tokens/sec at batch size 1", size=SMALL, color=WARM),
            T("1.58x faster than vLLM, through 256K context", size=SMALL, color=WARM),
            T("this is launch overhead, not bytes moved", size=SMALL, color=ACCENT),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        rocm = P(["ROCm 10.0 shipped in August.",
                  "Triton's ROCm backend is how most PyTorch",
                  "kernels reach AMD at all."],
                 size=SMALL, color=COOL, align=LEFT)
        block = VGroup(mega, figures, rocm).arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        fit(block, max_w=7.2, max_h=4.0)
        block.to_edge(RIGHT, buff=0.5).set_y(0.5)

        self.play(FadeIn(mega, shift=UP * 0.1), run_time=0.6)
        self.spread(list(figures), run_time=0.5, reserve=7.0)
        self.play(FadeIn(rocm, shift=UP * 0.1), run_time=0.8)
        self.hold()
        self.retire(block, run_time=0.6)

    # -- profiling ---------------------------------------------------------

    def profiling(self):
        self.say("profiling")
        self.focus("Nsight Systems", "Nsight Compute")

        order = VGroup(
            pill("1 · Nsight Systems: where did the time go?", GOOD, width=7.0),
            pill("2 · Nsight Compute: why is this kernel slow?", ACCENT, width=7.0),
        ).arrange(DOWN, buff=0.45)
        fit(order, max_w=7.2)
        order.to_edge(RIGHT, buff=0.5).set_y(1.1)
        self.spread(order, run_time=0.6, reserve=6.0)

        warning = P(["timeline first. otherwise you spend a week",
                     "making a kernel faster that was never",
                     "the reason you were waiting."],
                    size=SMALL, color=BAD, align=LEFT)
        fit(warning, max_w=7.2)
        warning.next_to(order, DOWN, buff=0.6).align_to(order, LEFT)
        self.play(Write(warning), run_time=1.5)
        self.hold()
        self.retire(order, warning, run_time=0.6)
        self.lift(self.map, opacity=0.8)
