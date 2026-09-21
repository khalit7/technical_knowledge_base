"""
The furniture every topic overview shares.

An overview names the whole landscape before it explains any of it, so the map
is the object the video is built around: it is assembled on screen group by
group, parked at the side, and then lit up piece by piece as each part is
discussed. A viewer should always be able to see where the thing being
explained sits in the whole.

Every root topic page gets one of these, so none of it belongs in a single
episode.
"""

from __future__ import annotations

from manim import DOWN, LEFT, ORIGIN, RIGHT, UL, UP, Create, FadeIn, VGroup, Write

from .scene import TechScene
from .style import (
    ACCENT,
    BODY,
    DIM,
    FG,
    H1,
    H2,
    RULE,
    SMALL,
    WARM,
    P,
    T,
    fit,
    hairline,
)


class PageVideo(TechScene):
    """What every video derived from a page shares: it says which page and when,
    keeps that on screen, and ends on a claim and a question."""

    TOPIC = ""            # "Topic: llms"
    SUBTITLE = ""         # "who builds what, and what each of them is betting on"
    UPDATED = ""          # "21 September 2026"

    # -- what this is ------------------------------------------------------

    def title_card(self, key: str = "ident"):
        self.say(key)
        title = T(self.TOPIC, size=H1, color=FG, weight="BOLD")
        sub = T(self.SUBTITLE, size=BODY, color=ACCENT)
        date = T(f"as of {self.UPDATED}", size=SMALL, color=DIM)
        card = VGroup(title, sub, date).arrange(DOWN, buff=0.35)
        fit(card, max_w=12.0)
        card.move_to(ORIGIN)

        self.play(Write(title), run_time=1.0)
        self.spread([sub, date], run_time=0.55, reserve=2.4)
        self.hold(tail=0.1)

        strip = T(f"{self.TOPIC} · {self.UPDATED}", size=SMALL, color=DIM)
        strip.to_corner(UL, buff=0.4)
        self.morph(card, strip, run_time=1.0)
        rule = hairline().next_to(strip, DOWN, buff=0.15).align_to(strip, LEFT)
        self.play(Create(rule), run_time=0.5)
        self.strip = VGroup(strip, rule)
        return self.strip

    # -- the take ----------------------------------------------------------

    def take(self, key, lines, ask):
        self.say(key)
        line = P(lines, size=H2, color=FG, align=ORIGIN)
        line.to_edge(UP, buff=1.7).set_x(0)
        fit(line, max_w=11.0)
        self.play(Write(line), run_time=1.3)

        question = T(ask, size=SMALL, color=ACCENT)
        question.to_edge(DOWN, buff=0.8)
        fit(question, max_w=12.0)
        self.play(FadeIn(question, shift=UP * 0.2), run_time=0.8)
        self.hold()

        end = T(f"{self.TOPIC} · {self.UPDATED} · the page has all of it",
                size=SMALL, color=DIM)
        end.to_edge(DOWN, buff=0.8)
        fit(end, max_w=12.0)
        self.morph(question, end, run_time=0.8)
        self.wait(1.0)

    # -- a panel of prose beside whatever is parked -----------------------

    def panel(self, lines, colour=FG, size=BODY, width=6.8, y=0.3):
        """The block of text that sits next to the map while a lab is discussed."""
        block = P(lines, size=size, color=colour, align=LEFT)
        fit(block, max_w=width)
        block.to_edge(RIGHT, buff=0.7).set_y(y)
        return block


class TopicOverview(PageVideo):
    """A topic overview: the map, then the tour."""

    # -- the map -----------------------------------------------------------

    def column(self, heading, entries, colour, width=3.9):
        """One group of the map: a heading, then provider and models per row."""
        head = T(heading, size=SMALL, color=colour)
        rows = VGroup()
        self.entry = getattr(self, "entry", {})
        for provider, models in entries:
            name = T(provider, size=SMALL, color=FG)
            detail = P(models if isinstance(models, list) else [models],
                       size=SMALL, color=DIM, align=LEFT, spacing=1.0)
            detail.scale(0.78)
            row = VGroup(name, detail).arrange(DOWN, buff=0.1, aligned_edge=LEFT)
            self.entry[provider] = row
            rows.add(row)
        rows.arrange(DOWN, buff=0.34, aligned_edge=LEFT)
        col = VGroup(head, rows).arrange(DOWN, buff=0.45, aligned_edge=LEFT)
        fit(col, max_w=width)
        return col

    def reveal_column(self, col, reserve=0.0):
        """Heading first, then the rows in step with the narration naming them."""
        self.play(FadeIn(col[0], shift=UP * 0.15), run_time=0.5)
        self.spread(list(col[1]), run_time=0.4, reserve=reserve)

    def park_map(self, the_map, width=5.4, run_time=0.9):
        """The map moves aside and stays there for the rest of the video.

        Kept as large as the panel beside it allows: the map is the thing this
        format exists to show, and at a smaller size the model names under each
        provider stop being readable once the file is compressed."""
        self.play(the_map.animate.set(width=width).to_edge(LEFT, buff=0.35).set_y(0.0),
                  run_time=run_time)
        self.fade_to(the_map, 0.45, run_time=0.4)
        self.map = the_map
        return the_map

    def focus(self, *providers, colour=WARM, run_time=0.6):
        """Light up the part of the map being discussed, and dim the last one."""
        previous = getattr(self, "_lit", [])
        anims = []
        for row in previous:
            anims.append(row.animate.set_color(DIM).set_opacity(0.45))
        lit = [self.entry[p] for p in providers if p in self.entry]
        for row in lit:
            anims.append(row.animate.set_color(colour).set_opacity(1.0))
        if anims:
            self.play(*anims, run_time=run_time)
        self._lit = lit
