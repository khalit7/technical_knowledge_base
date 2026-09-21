"""
The furniture every weekly news edition shares.

An edition is not a one-off animation. It has an ident that says which week it
is, stories that open with their headline and then leave a banner naming where
you are, and a take at the end. Those are the same every week, so they live
here and an episode supplies only its own content and its own diagrams.

If writing a new edition means reimplementing any of this, the abstraction is
wrong and belongs here instead.
"""

from __future__ import annotations

from manim import DOWN, LEFT, ORIGIN, UL, UP, Create, FadeIn, VGroup, Write

from .scene import TechScene
from .style import ACCENT, BODY, DIM, FG, H1, H2, SMALL, WARM, P, T, fit, hairline


class NewsEdition(TechScene):
    """Base scene for a weekly tech news edition."""

    EDITION = "Tech news"
    DATE = ""        # "21 September 2026"
    WINDOW = ""      # "covering 14 to 21 September"

    # -- what this is ------------------------------------------------------

    def ident(self, key: str = "ident"):
        """Say which week this is, then keep saying it quietly.

        The card becomes the strip rather than being replaced by one, and the
        strip stays for the whole edition so somebody looking up mid-video
        knows what they are watching and how current it is."""
        self.say(key)
        title = T(self.EDITION, size=H1, color=FG, weight="BOLD")
        date = T(self.DATE, size=BODY, color=ACCENT)
        window = T(self.WINDOW, size=SMALL, color=DIM)
        card = VGroup(title, date, window).arrange(DOWN, buff=0.35).move_to(ORIGIN)

        self.play(Write(title), run_time=0.9)
        self.spread([date, window], run_time=0.55, reserve=2.4)
        self.hold(tail=0.1)

        strip = T(f"{self.EDITION} · {self.DATE}", size=SMALL, color=DIM)
        strip.to_corner(UL, buff=0.4)
        self.morph(card, strip, run_time=1.0)
        rule = hairline().next_to(strip, DOWN, buff=0.15).align_to(strip, LEFT)
        self.play(Create(rule), run_time=0.5)
        self.ident_strip = VGroup(strip, rule)
        return self.ident_strip

    # -- stories -----------------------------------------------------------

    def story_open(self, key, number, headline, sub=None, banner=None):
        """Headline first, on screen and in the ear.

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
        fit(card, max_w=11.5)
        card.move_to(UP * 0.3)

        self.play(FadeIn(label, shift=UP * 0.2), run_time=0.5)
        self.play(Write(head), run_time=1.3)
        if sub:
            self.play(FadeIn(card[-1], shift=UP * 0.15), run_time=0.5)
        return card

    def to_banner(self, card, text):
        """The headline shrinks into the strip that names the story you are in."""
        banner = T(text, size=SMALL, color=WARM)
        banner.next_to(self.ident_strip, DOWN, buff=0.35).align_to(self.ident_strip, LEFT)
        self.morph(card, banner, run_time=0.9)
        self.banner = banner
        self.stage = None
        return banner

    # -- the take ----------------------------------------------------------

    def take(self, key, lines, ask, centre=None):
        """The closing claim, the question it leaves the viewer with, and the
        date again, because the last frame is the one people screenshot."""
        self.say(key)
        line = P(lines, size=H2, color=FG, align=ORIGIN)
        line.next_to(self.banner, DOWN, buff=0.45).set_x(0)
        fit(line, max_w=11.0)
        self.play(Write(line), run_time=1.3)

        if centre is not None:
            self.play(FadeIn(centre, shift=UP * 0.2), run_time=0.8)

        question = T(ask, size=SMALL, color=ACCENT)
        question.to_edge(DOWN, buff=0.8)
        fit(question, max_w=12.0)
        self.play(FadeIn(question, shift=UP * 0.2), run_time=0.8)
        self.hold()

        end = T(f"{self.EDITION} · {self.DATE} · the written issue has all of it",
                size=SMALL, color=DIM)
        end.to_edge(DOWN, buff=0.8)
        fit(end, max_w=12.0)
        self.morph(question, end, run_time=0.8)
        self.wait(1.0)
