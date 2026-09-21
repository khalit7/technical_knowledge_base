"""
The visual system for knowledge base explainers.

One palette, one font scale, one set of shapes, reused across every episode so
that a returning viewer already knows what a colour means. Colour semantics are
fixed here and must not be redefined per episode: if an episode needs a meaning
that is not in SEMANTIC, add it here and keep it.

Borrowed from the method of 3Blue1Brown and Caleb Writes Code, not from their
visual identity: this is an original palette and an original layout grammar.
"""

from manim import (
    BOLD,
    DOWN,
    LEFT,
    NORMAL,
    ORIGIN,
    RIGHT,
    UP,
    Line,
    Paragraph,
    RoundedRectangle,
    Text,
    VGroup,
    config,
)

# -- palette ---------------------------------------------------------------

BG = "#0E1116"        # background
FG = "#C5CEE8"        # body text
DIM = "#4A5270"       # de-emphasised, still on screen
RULE = "#2A3145"      # hairlines and frames

ACCENT = "#6FA8FF"    # the thing we are currently talking about
WARM = "#E4B168"      # a measured number
GOOD = "#8FD37A"      # a result that held up
BAD = "#F0768E"       # a failure, a cost, a caveat
COOL = "#9C8CF0"      # machinery: harness, loop, infrastructure

# What each colour is allowed to mean. Keep this honest: reusing a colour for a
# second meaning is the fastest way to make a series unreadable.
SEMANTIC = {
    "subject": ACCENT,      # whatever the current sentence is about
    "number": WARM,         # a figure that came from the canonical page
    "verified": GOOD,       # something that was checked
    "cost": BAD,            # money, tokens, failure, risk
    "machinery": COOL,      # loops, harnesses, infrastructure
    "context": DIM,         # on screen, not being discussed right now
}

FONT = "sans-serif"
MONO = "monospace"

# Type scale. Four sizes, not fifteen.
H1, H2, BODY, SMALL = 46, 32, 26, 20


def T(txt, size=BODY, color=FG, weight=NORMAL, font=FONT):
    return Text(txt, font=font, font_size=size, color=color, weight=weight)


def P(lines, size=BODY, color=FG, align=LEFT, spacing=1.15):
    if isinstance(lines, str):
        lines = lines.split("\n")
    return Paragraph(
        *lines,
        font=FONT,
        font_size=size,
        color=color,
        alignment="left" if align is LEFT else "center",
        line_spacing=spacing,
    )


def pill(txt, color=ACCENT, width=3.6, size=SMALL):
    label = T(txt, size=size, color=color)
    box = RoundedRectangle(
        corner_radius=0.16,
        width=max(width, label.width + 0.6),
        height=0.9,
        stroke_color=color,
        stroke_width=2,
        fill_color=color,
        fill_opacity=0.10,
    )
    label.move_to(box.get_center())
    return VGroup(box, label)


def stat(big, caption, color=WARM):
    """A number with its unit underneath. The number is the point, so it is big."""
    head = T(big, size=H1, color=color, weight=BOLD)
    sub = P(caption, size=SMALL, color=DIM, align=ORIGIN)
    return VGroup(head, sub).arrange(DOWN, buff=0.22)


def fit(mob, max_w=None, max_h=None, margin=0.9):
    """Scale a group down until it sits inside the frame. Nothing is allowed to
    run off the edge: a cropped label is a wrong label."""
    max_w = max_w or (config.frame_width - 2 * margin)
    max_h = max_h or (config.frame_height - 2 * margin)
    factor = min(1.0, max_w / max(mob.width, 1e-6), max_h / max(mob.height, 1e-6))
    if factor < 1.0:
        mob.scale(factor)
    return mob


def hairline(width=None, color=RULE):
    line = Line(LEFT, RIGHT, color=color, stroke_width=1.5)
    line.set_width(width or (config.frame_width - 0.9))
    return line


def apply_theme():
    config.background_color = BG
