"""
The furniture a deep dive shares.

A deep dive explains one mechanism, so its structure is the opposite of an
overview's: not a map that gets toured, but a single construction that grows.
The base class gives it the two things every deep dive needs and an overview
does not: somewhere to keep that construction while the argument moves around
it, and a closing card that hands the viewer the page's own best resources,
because a video is an entry point to a subject rather than a replacement for
reading about it.
"""

from __future__ import annotations

from manim import DOWN, LEFT, ORIGIN, RIGHT, UP, FadeIn, VGroup, Write

from .overview import PageVideo
from .style import ACCENT, DIM, FG, SMALL, WARM, P, T, fit


class DeepDive(PageVideo):
    """Base scene for a deep dive: one mechanism, one growing diagram."""

    def set_home(self, mob, width=6.0, corner=LEFT, buff=0.45, y=0.0,
                 opacity=0.5, run_time=0.9):
        """Park the construction the whole video is about.

        It stays on screen because every later beat is a change to it, and a
        viewer who looks up should see the argument so far rather than a blank
        frame with a sentence on it."""
        self.play(mob.animate.set(width=width).to_edge(corner, buff=buff).set_y(y),
                  run_time=run_time)
        self.fade_to(mob, opacity, run_time=0.35)
        self.home = mob
        return mob

    def derive(self, steps, colour=WARM, width=6.6, y=0.8, run_time=0.9):
        """Show the arithmetic happening, one line at a time.

        A deep dive earns its length by deriving rather than asserting: if a
        figure follows from two other figures, the division belongs on screen.
        """
        lines = VGroup(*[T(step, size=SMALL, color=colour) for step in steps])
        lines.arrange(DOWN, buff=0.35, aligned_edge=LEFT)
        fit(lines, max_w=width)
        lines.to_edge(RIGHT, buff=0.5).set_y(y)
        for line in lines:
            self.play(FadeIn(line, shift=UP * 0.12), run_time=run_time)
        return lines

    def resources(self, key, items, heading="where to go properly"):
        """The last frame: the page's own best resources, named."""
        self.say(key)
        head = T(heading, size=SMALL, color=DIM)
        rows = VGroup(*[P(item, size=SMALL, color=FG, align=ORIGIN) for item in items])
        rows.arrange(DOWN, buff=0.45)
        block = VGroup(head, rows).arrange(DOWN, buff=0.55)
        fit(block, max_w=10.0, max_h=4.2)
        block.move_to(ORIGIN)
        self.play(FadeIn(head), run_time=0.5)
        self.spread(list(rows), run_time=0.6, reserve=1.5)

        end = T(f"{self.TOPIC} · {self.UPDATED}", size=SMALL, color=DIM)
        end.to_edge(DOWN, buff=0.7)
        self.play(FadeIn(end), run_time=0.5)
        self.hold()
        self.wait(0.8)
