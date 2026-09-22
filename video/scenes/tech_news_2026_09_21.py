"""
Tech news, week to 21 September 2026.

The visual argument, beat for beat, keyed to scripts/tech_news_2026_09_21.py.

The spine is one diagram: a model, the work it does, and the feedback that comes
back. It is established at the pivot, lives in the corner for the rest of the
episode, and every later beat is a change to it. Nothing here is decoration: if
a picture is on screen, the sentence being spoken is about that picture.

Render:
    manim -qh video/scenes/tech_news_2026_09_21.py TechNews20260921
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
    UR,
    Arrow,
    Create,
    Dot,
    FadeIn,
    GrowFromEdge,
    Line,
    Rectangle,
    RoundedRectangle,
    SurroundingRectangle,
    VGroup,
    Write,
)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))

from common.scene import Narration, TechScene          # noqa: E402
from common.style import (                             # noqa: E402
    ACCENT,
    BAD,
    BODY,
    COOL,
    DIM,
    FG,
    GOOD,
    H2,
    RULE,
    SMALL,
    WARM,
    P,
    T,
    fit,
    hairline,
    hbar,
    labelled_bar,
    pill,
    stat,
)
from scripts.tech_news_2026_09_21 import SCRIPT        # noqa: E402

# The spine is sized absolutely at every beat. Relative scaling compounds:
# 0.82 then 0.62 then 0.34 leaves you with a diagram nobody can read.
LOOP_FULL = 8.8
LOOP_MID = 6.4
LOOP_CORNER = 3.0
TOP_BUFF = 1.8           # clears the parked cost comparison along the top edge

AUDIO = ROOT / "out" / "audio" / "tech_news_2026_09_21"
TIMING = ROOT / "out" / "timing_tech_news_2026_09_21.json"


# -- reusable pieces -------------------------------------------------------


def loop_diagram():
    """The spine: model -> work -> feedback -> model."""
    def node(txt, color):
        box = RoundedRectangle(corner_radius=0.16, width=2.5, height=1.0,
                               stroke_color=color, stroke_width=2.5,
                               fill_color=color, fill_opacity=0.08)
        label = T(txt, size=SMALL, color=FG)
        label.move_to(box.get_center())
        return VGroup(box, label)

    model = node("model", ACCENT)
    work = node("work", COOL)
    feedback = node("feedback", GOOD)

    model.move_to(LEFT * 3.4)
    work.move_to(RIGHT * 3.4)
    feedback.move_to(DOWN * 2.0)

    a1 = Arrow(model.get_right(), work.get_left(), buff=0.15,
               stroke_width=3, color=DIM, max_tip_length_to_length_ratio=0.12)
    a2 = Arrow(work.get_bottom(), feedback.get_right(), buff=0.15,
               stroke_width=3, color=DIM, max_tip_length_to_length_ratio=0.12)
    a3 = Arrow(feedback.get_left(), model.get_bottom(), buff=0.15,
               stroke_width=3, color=DIM, max_tip_length_to_length_ratio=0.12)

    group = VGroup(model, work, feedback, a1, a2, a3)
    group.nodes = {"model": model, "work": work, "feedback": feedback}
    group.edges = {"do": a1, "observe": a2, "learn": a3}
    return group


class TechNews20260921(TechScene):
    narration = Narration(SCRIPT, AUDIO)
    timing_out = TIMING

    def construct(self):
        self.camera.background_color = "#0E1116"
        self.cold_open()
        self.the_question()
        self.the_contract()
        self.task_horizon()
        self.leverage()
        self.pivot()
        self.glm()
        self.feedback_kinds()
        self.the_bugs()
        self.back_to_proofs()
        self.the_loop_papers()
        self.counterweight()
        self.nous()
        self.objection()
        self.take()
        self.coda()

    # -- 1. tension --------------------------------------------------------

    def cold_open(self):
        self.say("cold_open")

        line1 = T("two proofs, checked by machine", size=H2, color=FG)
        line1.move_to(UP * 2.6)
        self.play(Write(line1), run_time=1.2)

        # The bars share one scale, because that is the whole point.
        scale = 6.2 / 300.0                      # screen units per billion tokens
        anthropic = labelled_bar("Anthropic, Fermat", "6 billion tokens",
                                 6 * scale, color=GOOD)
        openai = labelled_bar("OpenAI, Navier-Stokes", "300 billion tokens",
                              300 * scale, color=BAD)
        bars = VGroup(anthropic, openai).arrange(DOWN, buff=0.9, aligned_edge=LEFT)
        fit(bars)
        bars.move_to(DOWN * 0.3)

        self.play(FadeIn(anthropic[0]), GrowFromEdge(anthropic[1], LEFT),
                  FadeIn(anthropic[2]), run_time=1.0)
        self.play(FadeIn(openai[0]), GrowFromEdge(openai[1], LEFT),
                  FadeIn(openai[2]), run_time=1.4)

        gap = T("fifty times the bill, same class of result", size=SMALL, color=WARM)
        gap.next_to(bars, DOWN, buff=0.7)
        self.play(FadeIn(gap, shift=UP * 0.2), run_time=0.7)
        self.hold()

        self.cost_bars = VGroup(bars, gap)
        self.title_line = line1

    # -- 2. the sharp question --------------------------------------------

    def the_question(self):
        self.say("question")
        self.park(VGroup(self.title_line, self.cost_bars), corner=UP, scale=0.22, buff=0.15)

        question = P(["when the machines do the work,",
                      "what is actually limiting them?"],
                     size=H2, color=FG, align=ORIGIN)
        question.move_to(LEFT * 1.2)
        self.play(Write(question), run_time=1.6)
        self.hold()
        self.question_text = question
        self.stage = question          # whatever the next beat has to clear

    # -- 3. the contract ---------------------------------------------------

    def the_contract(self):
        self.say("contract")
        route = VGroup(
            pill("the numbers everyone quoted", ACCENT, width=6.4),
            pill("one layer underneath them", COOL, width=6.4),
        ).arrange(DOWN, buff=0.5)
        route.move_to(LEFT * 1.2)
        self.morph(self.question_text, route, run_time=1.0)
        self.hold()
        self.route = route
        self.stage = route

    # -- 4. common ground: the task horizon --------------------------------

    def task_horizon(self):
        self.say("horizon")
        # Whatever the previous beat left in the middle of the frame. Naming
        # the thing rather than the beat that made it is what lets the two
        # minute cut drop the contract beat and still run.
        if getattr(self, "stage", None) is not None:
            self.retire(self.stage, run_time=0.5)
            self.stage = None

        head = T("task horizon: how long a job it can finish alone", size=SMALL, color=DIM)
        head.to_edge(UP, buff=TOP_BUFF)
        rule = hairline().next_to(head, DOWN, buff=0.16)
        self.play(FadeIn(head), Create(rule), run_time=0.6)

        # Log scale: equal steps on screen, wildly unequal in minutes.
        rows = [
            ("Opus 3, Mar 2024", "4 minutes", 1.6),
            ("Sonnet 3.7, Mar 2025", "90 minutes", 3.6),
            ("Opus 4.6, Mar 2026", "12 hours", 5.8),
            ("projected, 2027", "weeks", 8.2),
        ]
        bars = VGroup(*[labelled_bar(n, v, w, color=ACCENT if i < 3 else DIM)
                        for i, (n, v, w) in enumerate(rows)])
        bars.arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        fit(bars, max_h=4.6)
        bars.move_to(DOWN * 0.4)

        for row in bars:
            self.play(FadeIn(row[0]), GrowFromEdge(row[1], LEFT), FadeIn(row[2]),
                      run_time=0.55)
        self.hold()
        self.horizon_head = VGroup(head, rule)
        self.horizon_bars = bars

    def task_horizon_caveat(self):
        self.say("horizon_caveat")
        axis = T("logarithmic", size=SMALL, color=BAD)
        axis.next_to(self.horizon_bars, DOWN, buff=0.45).align_to(self.horizon_bars, LEFT)
        self.play(Write(axis), run_time=0.6)

        # What the log axis is hiding: the same data, linear.
        linear = VGroup(*[
            labelled_bar(n, v, w, color=WARM)
            for n, v, w in [
                ("Opus 3, Mar 2024", "4 minutes", 0.05),
                ("Sonnet 3.7, Mar 2025", "90 minutes", 1.1),
                ("Opus 4.6, Mar 2026", "12 hours", 8.8),
            ]
        ]).arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        fit(linear, max_h=4.0)
        linear.move_to(DOWN * 0.4)

        self.morph(self.horizon_bars, linear, run_time=1.2)
        note = T("Anthropic measured Anthropic", size=SMALL, color=BAD)
        note.next_to(linear, DOWN, buff=0.45).align_to(linear, LEFT)
        self.play(Write(note), run_time=0.7)
        self.hold()
        self.retire(axis, note, linear, self.horizon_head, run_time=0.6)

    # -- 5. leverage is real ----------------------------------------------

    def leverage(self):
        self.task_horizon_caveat()
        self.say("leverage")

        cards = VGroup(
            stat("80%+", "of merged production code\nwritten by Claude, May 2026"),
            stat("26%", "of Anthropic's own AI\nresearch work, led by Claude"),
            stat("30,000+", "internal agents running\nat any one time"),
        ).arrange(RIGHT, buff=1.0)
        fit(cards, max_h=2.6)
        cards.move_to(UP * 1.4)

        self.spread(cards, run_time=0.5, reserve=3.4)

        bill = VGroup(
            labelled_bar("continuous integration", "25x in six months", 7.4, color=BAD),
            labelled_bar("the test suite", "10x, to keep up", 3.0, color=BAD),
        ).arrange(DOWN, buff=0.45, aligned_edge=LEFT)
        fit(bill, max_h=2.0)
        bill.next_to(cards, DOWN, buff=0.9)

        for row in bill:
            self.play(FadeIn(row[0]), GrowFromEdge(row[1], LEFT), FadeIn(row[2]),
                      run_time=0.5)
        box = SurroundingRectangle(bill, color=BAD, buff=0.3, stroke_width=2,
                                   corner_radius=0.12)
        self.play(Create(box), run_time=0.6)
        self.hold()
        self.leverage_group = VGroup(cards, bill, box)

    # -- 6. the pivot: the spine appears ----------------------------------

    def pivot(self):
        self.say("pivot")
        loop = loop_diagram()
        self.morph(self.leverage_group, loop, run_time=1.4)

        caption = T("the expensive part is the checking", size=SMALL, color=DIM)
        caption.next_to(loop, UP, buff=0.6)
        self.play(FadeIn(caption, shift=UP * 0.15), run_time=0.6)
        self.hold()
        self.retire(caption, run_time=0.4)
        self.loop = loop

    # -- 7. the GLM serving story -----------------------------------------

    def glm(self):
        self.say("glm")
        self.play(self.loop.animate.set(width=LOOP_MID).move_to(RIGHT * 3.0 + DOWN * 0.3),
                  run_time=0.9)

        head = P(["GLM-5.3 built the stack", "that now serves it"], size=BODY,
                 color=FG, align=LEFT)
        head.move_to(LEFT * 3.6 + UP * 1.6)
        figures = VGroup(
            T("13 days to production", size=SMALL, color=WARM),
            T("3.22x throughput", size=SMALL, color=WARM),
            T("100,000+ accelerators", size=SMALL, color=WARM),
            T("not recursive self-improvement, they say", size=SMALL, color=DIM),
        ).arrange(DOWN, buff=0.35, aligned_edge=LEFT)
        figures.next_to(head, DOWN, buff=0.6).align_to(head, LEFT)
        fit(VGroup(head, figures), max_w=6.4)

        self.play(Write(head), run_time=1.0)
        self.spread(figures, run_time=0.45)
        self.hold()
        self.glm_text = VGroup(head, figures)

    def feedback_kinds(self):
        self.say("feedback")
        self.retire(self.glm_text, run_time=0.5)
        self.play(self.loop.animate.set(width=LOOP_MID).move_to(UP * 1.35), run_time=0.8)

        node = self.loop.nodes["feedback"]
        self.highlight_home(node)

        kinds = VGroup(
            pill("correctness: compare execution paths", GOOD, width=7.2),
            pill("behaviour: timelines, not totals", GOOD, width=7.2),
            pill("performance: which constraint binds", GOOD, width=7.2),
        ).arrange(DOWN, buff=0.4)
        fit(kinds, max_h=3.0)
        kinds.next_to(self.loop, DOWN, buff=0.5)

        sparse = T('one sparse signal: "the test failed"', size=SMALL, color=BAD)
        sparse.next_to(self.loop, UP, buff=0.35)
        self.play(FadeIn(sparse), run_time=0.5)
        self.play(sparse.animate.set_opacity(0.25), run_time=0.4)
        self.spread(kinds, run_time=0.5)
        self.hold()
        self.retire(sparse, run_time=0.4)
        self.feedback_pills = kinds

    def the_bugs(self):
        self.say("bugs")
        bugs = VGroup(
            P(["TF32 precision bug,", "visible under one", "parallelism strategy"],
              size=SMALL, color=BAD),
            P(["20% slowdown: the GIL", "blocking KV-cache", "transfer overlap"],
              size=SMALL, color=BAD),
        )
        self.play(
            self.feedback_pills.animate.scale(0.62).to_edge(LEFT, buff=0.6),
            run_time=0.8,
        )
        self.fade_to(self.feedback_pills, 0.55, run_time=0.3)

        bugs.arrange(DOWN, buff=0.6, aligned_edge=LEFT)
        fit(bugs, max_h=3.4)
        bugs.next_to(self.feedback_pills, RIGHT, buff=0.9).shift(UP * 0.35)
        self.play(FadeIn(bugs[0], shift=LEFT * 0.15), run_time=0.7)
        self.play(FadeIn(bugs[1], shift=LEFT * 0.15), run_time=0.7)

        note = T("neither is visible in an end-to-end metric", size=SMALL, color=DIM)
        note.to_edge(DOWN, buff=0.45)
        self.play(Write(note), run_time=0.9)
        self.hold()
        self.retire(bugs, note, self.feedback_pills, run_time=0.6)
        self.cool_home(self.loop.nodes["feedback"], color=GOOD)

    # -- 8. back to the two proofs ----------------------------------------

    def back_to_proofs(self):
        self.say("proofs")
        self.park(self.loop, corner=UL, width=LOOP_CORNER, buff=0.35)

        bars = VGroup(
            labelled_bar("11 days, alone", "6 billion tokens", 0.5, color=GOOD),
            labelled_bar("10,000 agents", "300 billion tokens", 8.6, color=BAD),
        ).arrange(DOWN, buff=1.1, aligned_edge=LEFT)
        fit(bars, max_h=3.4)
        bars.move_to(DOWN * 0.2)

        self.play(FadeIn(bars, shift=UP * 0.2), run_time=0.8)

        notes = VGroup(
            T("started on Kevin Buzzard's verified formalisation", size=SMALL, color=GOOD),
            T("4.9 million messages, $2m to $22.5m estimated", size=SMALL, color=BAD),
        )
        notes[0].next_to(bars[0], DOWN, buff=0.28).align_to(bars, LEFT)
        notes[1].next_to(bars[1], DOWN, buff=0.28).align_to(bars, LEFT)
        self.play(FadeIn(notes[0]), run_time=0.6)
        self.play(FadeIn(notes[1]), run_time=0.6)

        verdict = T("the difference is how much verification was already built",
                    size=SMALL, color=FG)
        verdict.to_edge(DOWN, buff=0.7)
        self.play(Write(verdict), run_time=1.2)
        self.hold()
        self.retire(bars, notes, verdict, run_time=0.6)

    # -- 9. the field went after the loop ---------------------------------

    def the_loop_papers(self):
        self.say("loop")

        total = VGroup(
            hbar(4.3, height=0.7, color=COOL),
            hbar(4.3, height=0.7, color=BAD),
        ).arrange(RIGHT, buff=0.0)
        fit(total)
        total.move_to(UP * 1.9)
        labels = VGroup(
            T("thinking", size=SMALL, color=COOL).next_to(total[0], UP, buff=0.25),
            T("harness overhead", size=SMALL, color=BAD).next_to(total[1], UP, buff=0.25),
        )
        self.play(GrowFromEdge(total, LEFT), FadeIn(labels), run_time=0.9)

        cut = T("SoL-Pi: ~45% of the tokens removed, same success rate",
                size=SMALL, color=FG)
        cut.next_to(total, DOWN, buff=0.55)
        shrunk = total[1].copy().stretch_to_fit_width(0.5)
        shrunk.next_to(total[0], RIGHT, buff=0.0)
        self.play(
            total[1].animate.become(shrunk),
            labels[1].animate.next_to(shrunk, UP, buff=0.25),
            FadeIn(cut),
            run_time=1.0,
        )

        # Agora: a commit graph instead of a planner.
        dots = VGroup(*[Dot(radius=0.055, color=GOOD) for _ in range(28)])
        for i, d in enumerate(dots):
            d.move_to(LEFT * 4.6 + RIGHT * (i % 14) * 0.7 + DOWN * (1.2 + (i // 14) * 0.6))
        links = VGroup(*[Line(dots[i].get_center(), dots[i + 1].get_center(),
                              stroke_width=1.2, color=RULE)
                         for i in range(27) if (i + 1) % 14 != 0])
        agora = T("Agora: no planner, Git as shared memory, 165 reproductions, zero failures",
                  size=SMALL, color=GOOD)
        agora.next_to(dots, DOWN, buff=0.5)

        self.play(Create(links), FadeIn(dots), run_time=1.0)
        self.play(Write(agora), run_time=1.2)
        self.hold()
        self.retire(total, labels, cut, dots, links, agora, run_time=0.6)

    # -- 10. the counterweight --------------------------------------------

    def counterweight(self):
        self.say("counterweight")
        self.play(self.loop.animate.set(width=LOOP_FULL).move_to(DOWN * 0.2), run_time=1.0)
        self.fade_to(self.loop, 1.0, run_time=0.4)

        scale_note = T("8 worlds, 850,000 model calls, 50 billion tokens, under attack",
                       size=SMALL, color=DIM)
        scale_note.to_edge(UP, buff=TOP_BUFF)
        self.play(FadeIn(scale_note), run_time=0.6)

        detected = T("detected", size=SMALL, color=GOOD)
        detected.next_to(self.loop.nodes["feedback"], DOWN, buff=0.45)
        self.play(FadeIn(detected, shift=UP * 0.15), run_time=0.6)

        # The edge that should carry the detection into action, missing.
        missing = Line(
            self.loop.nodes["feedback"].get_left() + LEFT * 0.2,
            self.loop.nodes["model"].get_bottom() + DOWN * 0.2,
            color=BAD, stroke_width=4,
        ).set_opacity(0.0)
        cross = VGroup(
            Line(LEFT * 0.25, RIGHT * 0.25, color=BAD, stroke_width=5),
            Line(UP * 0.25, DOWN * 0.25, color=BAD, stroke_width=5),
        ).rotate(0.785).move_to(self.loop.edges["learn"].get_center())
        self.play(self.loop.edges["learn"].animate.set_color(BAD), Create(cross),
                  run_time=0.8)

        clock = T("and kept interacting with it for another 46 hours",
                  size=SMALL, color=BAD)
        clock.to_edge(DOWN, buff=0.9)
        self.play(Write(clock), run_time=1.2)
        self.hold()
        self.retire(scale_note, detected, cross, clock, missing, run_time=0.6)
        self.play(self.loop.edges["learn"].animate.set_color(DIM), run_time=0.4)

    def nous(self):
        self.say("nous")
        self.park(self.loop, corner=UL, width=LOOP_CORNER, buff=0.35)

        grid = VGroup(*[Dot(radius=0.045, color=COOL) for _ in range(180)])
        for i, d in enumerate(grid):
            d.move_to(LEFT * 4.4 + RIGHT * (i % 30) * 0.3 + DOWN * (i // 30) * 0.3)
        grid.move_to(DOWN * 0.3)
        caption = T("1,393 subagents, 19 hours, a third of the source gone, $19,300",
                    size=SMALL, color=FG)
        caption.next_to(grid, UP, buff=0.6)
        self.play(FadeIn(grid, lag_ratio=0.01), Write(caption), run_time=1.6)

        passed = T("every test passed", size=SMALL, color=GOOD)
        caught = P(["humans then found removed public interfaces",
                    "and changed exception handling"], size=SMALL, color=BAD, align=ORIGIN)
        passed.next_to(grid, DOWN, buff=0.6)
        caught.next_to(passed, DOWN, buff=0.35)
        self.play(FadeIn(passed), run_time=0.5)
        self.play(FadeIn(caught, shift=UP * 0.15), run_time=0.8)
        self.hold()
        self.retire(grid, caption, passed, caught, run_time=0.6)

    # -- 11. the objection -------------------------------------------------

    def objection(self):
        self.say("objection")
        claim = T("almost every number here comes from whoever benefits",
                  size=BODY, color=BAD)
        claim.move_to(UP * 1.8)
        self.play(Write(claim), run_time=1.4)

        rows = VGroup(
            pill("mechanism attached: the GLM bugs, the Nous review", GOOD, width=8.4),
            pill("vendor-reported only: the leverage percentages", BAD, width=8.4),
        ).arrange(DOWN, buff=0.45)
        fit(rows)
        rows.move_to(DOWN * 0.1)
        self.spread(rows, run_time=0.5, reserve=4.0)

        regrade = P(["experts re-graded six physics benchmarks:",
                     "most reported failures were the test's fault"],
                    size=SMALL, color=WARM, align=ORIGIN)
        regrade.next_to(rows, DOWN, buff=0.8)
        self.play(FadeIn(regrade, shift=UP * 0.15), run_time=1.0)
        self.hold()
        self.retire(claim, rows, regrade, run_time=0.6)

    # -- 12. the take ------------------------------------------------------

    def take(self):
        self.say("take")
        self.play(self.loop.animate.set(width=LOOP_FULL).move_to(DOWN * 0.3), run_time=1.0)
        self.fade_to(self.loop, 1.0, run_time=0.4)

        thick = self.loop.edges["observe"].copy().set_color(GOOD).set_stroke(width=9)
        thick2 = self.loop.edges["learn"].copy().set_color(GOOD).set_stroke(width=9)
        self.play(Create(thick), Create(thick2), run_time=0.9)

        line = P(["the constraint moved:", "capability, then verification"],
                 size=H2, color=FG, align=ORIGIN)
        line.to_edge(UP, buff=TOP_BUFF)
        self.play(Write(line), run_time=1.4)

        ask = T("what does your system find out when it is wrong, and how soon?",
                size=SMALL, color=ACCENT)
        ask.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(ask, shift=UP * 0.2), run_time=0.9)
        self.hold()
        self.retire(line, ask, thick, thick2, run_time=0.6)

    # -- 13. coda ----------------------------------------------------------

    def coda(self):
        self.say("coda")
        self.park(self.loop, corner=UL, width=LOOP_CORNER, buff=0.35)

        items = VGroup(
            pill("Vera Rubin NVL72: up to 7x tokens per megawatt", WARM, width=9.0),
            pill("CUDA in Rust, two tracks, one already in production", COOL, width=9.0),
            pill("Bonsai 2 27B: 1.76 bits per weight, 5.9 GB", GOOD, width=9.0),
            pill("Claude Code reads AGENTS.md", ACCENT, width=9.0),
        ).arrange(DOWN, buff=0.45)
        fit(items, max_h=4.4)
        items.move_to(DOWN * 0.2)
        self.spread(items, run_time=0.5)
        self.hold()

        self.say("outro")
        end = T("2026-09-21 · the written issue has all of it", size=SMALL, color=DIM)
        end.to_edge(DOWN, buff=0.9)
        self.play(FadeIn(end), run_time=0.6)
        self.fade_to(self.loop, 0.3, run_time=0.4)
        self.hold()
