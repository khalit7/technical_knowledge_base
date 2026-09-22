"""
An episode described as data, rendered by one scene.

Every episode so far has been a hand-written manim file: three hundred lines of
positioning per video. That is the right way to build the first few, because it
is how the visual grammar got worked out at all, and it is the wrong way to
build forty, for two reasons that have nothing to do with effort. Hand-written
scenes drift apart, so the series stops looking like a series. And the bugs
they carry are positioning bugs, which are invisible in the code and only show
up in the rendered frame.

So a script now declares what each beat should SHOW, from a fixed vocabulary of
panels, and this module draws it. The vocabulary is exactly the furniture the
hand-written episodes converged on:

    title      the page, what it covers, when it was current
    points     a short list revealed one line at a time
    columns    a map: named groups of things, built group by group
    stack      layers, top to bottom, where the order is the argument
    flow       a left-to-right pipeline with arrows
    bars       a comparison where the length is the point
    stat       one number, big, with its caption
    compare    two positions side by side
    table      rows and columns, when the grid IS the content
    claim      one sentence, alone on screen, for the take
    resources  where to go next

A beat may also park its panel at the corner and keep it there (`park`), bring
attention back to one part of it later (`focus`), or leave the previous panel
up (`keep`).

Writing a bespoke scene is still allowed and sometimes right: the memory
pyramid and the roofline in the GPU deep dive are arguments that needed their
own picture. The rule is that a bespoke scene has to earn itself. If the panel
vocabulary can carry the beat, use it, because a consistent series is worth
more than a clever frame.
"""

from __future__ import annotations

import json

from manim import (
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    Arrow,
    VGroup,
    config,
)

from .overview import PageVideo
from .style import (
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
    labelled_bar,
    pill,
)

# Colour by role, never by episode. `style.SEMANTIC` is the contract; this maps
# the words a script is allowed to use onto it.
TONE = {
    "subject": ACCENT,
    "number": WARM,
    "verified": GOOD,
    "cost": BAD,
    "machinery": COOL,
    "context": DIM,
}


# How wide the parked map is, and how far down it sits so it clears the page
# name and date the title card leaves in the top left corner.
HOME_WIDTH = 4.2
STRIP_CLEARANCE = 1.15


def tone(name: str | None, fallback=ACCENT):
    return TONE.get(name or "", fallback)


class Episode(PageVideo):
    """Renders a script's beats in order, drawing whatever each one declares.

    A subclass supplies `narration`, `VISUALS`, and the page identity that
    `PageVideo` puts on the title card. Nothing else is required.
    """

    VISUALS: dict = {}

    # -- construction ------------------------------------------------------

    def construct(self):
        self.home = None            # the parked map, if any
        self.handles = {}           # label -> mobject, for focus
        self.current = None         # what is on screen for this beat

        for key in self.narration.script:
            spec = dict(self.VISUALS.get(key) or {})
            self.beat(key, spec)

        self.hold()
        self.audit_layout()
        if self.timing_out:
            issues = self.timing_out.with_name(
                self.timing_out.name.replace("timing_", "layout_"))
            issues.write_text(json.dumps(self.layout_issues, indent=1))

    def beat(self, key: str, spec: dict):
        kind = spec.get("kind", "points")

        # Clear the previous panel unless this beat builds on it. Done before
        # say() so the frame is never mid-dissolve while a new line starts.
        if self.current is not None and not spec.get("keep"):
            self.retire(self.current)
            self.current = None

        if kind == "title":
            self.title_card(key)
            return

        self.say(key)

        if spec.get("focus") and self.home is not None:
            self.focus_on(spec["focus"])

        build = getattr(self, f"panel_{kind}", None)
        if build is None:
            raise ValueError(f"beat '{key}': no panel kind '{kind}'")
        group, reveal = build(spec)

        if group is not None:
            # With a map parked down the left, the rest of the frame is what
            # is left, not the whole frame. Fitting to the whole frame and
            # centring puts a wide panel straight through the map.
            if self.home is not None:
                # Centre the panel in the space to the RIGHT of the parked
                # map, not in the whole frame. The free region runs from the
                # map's right edge to the frame edge, so its centre sits at
                # half the width the map and its gutter take up.
                # The margin matters. Fitting exactly to the free width puts
                # the panel's right edge on the frame edge, which the layout
                # audit accepts (it is inside, by two hundredths of a unit)
                # and the delivery encode clips. Leave a real gutter on both
                # sides and the question does not arise.
                gutter, margin = 1.4, 0.8
                free = config.frame_width - HOME_WIDTH - gutter - margin
                fit(group, max_w=free)
                group.move_to(ORIGIN).shift(RIGHT * (HOME_WIDTH + gutter - margin) / 2)
            else:
                fit(group)
                group.move_to(ORIGIN)
            self.spread(reveal or [group], reserve=spec.get("reserve", 0.0))
            self.current = group

        if spec.get("park") and group is not None:
            # What gets parked is a compact stand-in, not the panel shrunk.
            #
            # A map of five columns of five items, scaled to fit a corner and
            # then delivered at 720p, renders its labels at about seven
            # pixels. That is not a map the viewer can read, it is coloured
            # blocks, and it fails the one job parking has: letting somebody
            # see where the thing being explained sits in the whole. So the
            # panel morphs into its own headings, which stay legible, and the
            # detail comes back when a later beat focuses on it.
            small = self.compact(spec, group)
            self.morph(group, small, run_time=0.7)
            # Never scale the stand-in UP. `park(width=...)` sets the width
            # absolutely, so handing it a fixed number enlarges anything
            # narrower than that, and three short headings came out bigger
            # than the panel they replaced.
            self.park(small, width=min(HOME_WIDTH, small.width),
                      buff=STRIP_CLEARANCE)
            self.home = small
            self.current = None
        self.hold()

    def compact(self, spec: dict, group):
        """The parked form of a panel: its headings, large enough to read."""
        kind = spec.get("kind")
        rows, self.handles = [], {}
        if kind == "columns":
            for col in spec.get("columns", []):
                row = T(str(col["head"]), size=BODY, color=tone(col.get("tone")))
                rows.append(row)
                for entry in col.get("items", []):
                    self.handles[str(entry)] = row
                self.handles[str(col["head"])] = row
        elif kind == "stack":
            for layer in spec.get("layers", []):
                name = layer[0] if isinstance(layer, (list, tuple)) else layer
                row = T(str(name), size=BODY, color=tone(spec.get("tone")))
                rows.append(row)
                self.handles[str(name)] = row
        else:
            rows = [T(str(spec.get("head", "")), size=BODY, color=ACCENT)]
        small = VGroup(*rows).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        small.move_to(group.get_center())
        return small

    # -- attention ---------------------------------------------------------

    def focus_on(self, label: str):
        """Light up one part of the parked map and cool the rest."""
        target = self.handles.get(label)
        if target is None:
            return
        for name, mob in self.handles.items():
            self.fade_to(mob, 1.0 if name == label else 0.35, run_time=0.25)

    # -- panels ------------------------------------------------------------

    def panel_points(self, spec):
        items = [T(str(x), size=BODY, color=tone(spec.get("tone"), FG))
                 for x in spec.get("items", [])]
        head = spec.get("head")
        rows = list(items)
        if head:
            rows.insert(0, T(head, size=H2, color=ACCENT, weight="BOLD"))
        group = VGroup(*rows).arrange(DOWN, buff=0.34, aligned_edge=LEFT)
        return group, rows

    def panel_columns(self, spec):
        """The map: named groups, each a heading over a list of pills."""
        columns = []
        reveal = []
        for col in spec.get("columns", []):
            heading, entries = col["head"], col.get("items", [])
            title = T(heading, size=SMALL, color=tone(col.get("tone")),
                      weight="BOLD")
            cells = []
            for entry in entries:
                cell = pill(str(entry), color=tone(col.get("tone")), width=4.2)
                cells.append(cell)
                self.handles[str(entry)] = cell
            body = VGroup(*cells).arrange(DOWN, buff=0.16)
            column = VGroup(title, body).arrange(DOWN, buff=0.28)
            columns.append(column)
            reveal.append(column)
        group = VGroup(*columns).arrange(RIGHT, buff=0.7, aligned_edge=UP)
        return group, reveal

    def panel_stack(self, spec):
        """Layers where the vertical order carries the argument."""
        rows = []
        for layer in spec.get("layers", []):
            name, gloss = (layer if isinstance(layer, (list, tuple))
                           else (layer, ""))
            box = pill(str(name), color=tone(spec.get("tone")), width=5.0)
            text = T(str(gloss), size=SMALL, color=DIM)
            row = VGroup(box, text).arrange(RIGHT, buff=0.45)
            self.handles[str(name)] = row
            rows.append(row)
        group = VGroup(*rows).arrange(DOWN, buff=0.22, aligned_edge=LEFT)
        return group, rows

    def panel_flow(self, spec):
        """A pipeline. Arrows are drawn with the boxes, not after them."""
        parts = []
        reveal = []
        steps = spec.get("steps", [])
        for i, step in enumerate(steps):
            box = pill(str(step), color=tone(spec.get("tone")), width=3.4)
            self.handles[str(step)] = box
            parts.append(box)
            reveal.append(box)
            if i < len(steps) - 1:
                parts.append(Arrow(LEFT, RIGHT, color=RULE, buff=0,
                                   stroke_width=3, max_tip_length_to_length_ratio=0.2
                                   ).scale(0.5))
        group = VGroup(*parts).arrange(RIGHT, buff=0.26)
        return group, reveal

    def panel_bars(self, spec):
        """A comparison. Widths are normalised here, so a script gives values,
        never pixel widths: a chart whose bars were sized by hand is a chart
        that can lie by arithmetic."""
        entries = spec.get("bars", [])
        values = [float(e.get("value", 0)) for e in entries]
        top = max(values + [1e-6])
        span = spec.get("span", 6.4)
        rows = []
        for entry, value in zip(entries, values):
            rows.append(labelled_bar(
                str(entry["label"]), str(entry.get("text", "")),
                width=span * (value / top),
                color=tone(entry.get("tone"), WARM)))
        group = VGroup(*rows).arrange(DOWN, buff=0.26, aligned_edge=LEFT)
        if spec.get("head"):
            head = T(spec["head"], size=H2, color=FG, weight="BOLD")
            group = VGroup(head, group).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
            rows = [head] + rows
        return group, rows

    def panel_stat(self, spec):
        from .style import stat
        big = stat(str(spec.get("big", "")), str(spec.get("caption", "")),
                   color=tone(spec.get("tone"), WARM))
        parts = [big]
        if spec.get("note"):
            parts.append(T(str(spec["note"]), size=SMALL, color=DIM))
        group = VGroup(*parts).arrange(DOWN, buff=0.45)
        return group, parts

    def panel_compare(self, spec):
        """Two positions, side by side, so the difference is spatial."""
        sides = []
        for side, default in zip(spec.get("sides", []), (ACCENT, WARM)):
            head = T(str(side.get("head", "")), size=H2,
                     color=tone(side.get("tone"), default), weight="BOLD")
            lines = [T(str(x), size=SMALL, color=FG)
                     for x in side.get("items", [])]
            sides.append(VGroup(head, *lines).arrange(DOWN, buff=0.28,
                                                      aligned_edge=LEFT))
        # No divider between the sides. A stretched hairline renders as
        # nothing here, and an invisible mobject is worse than no mobject: it
        # still takes part in the layout audit. The gutter does the work.
        group = VGroup(*sides).arrange(RIGHT, buff=1.4, aligned_edge=UP)
        return group, sides

    def panel_table(self, spec):
        """A real grid: every cell in a column starts at the same x.

        The first version arranged each row and let manim space it, which put
        the cells hard against each other ("Kimi K32.8T104B"). Nothing
        overlapped, so the layout audit passed it: the audit sees collisions,
        not the absence of a gutter. Columns are therefore measured and placed
        here rather than arranged.
        """
        head = [str(h) for h in spec.get("head", [])]
        rows = [[str(c) for c in row] for row in spec.get("rows", [])]
        n = max([len(head)] + [len(r) for r in rows])

        cells = []
        if head:
            cells.append([T(h, size=SMALL, color=ACCENT, weight="BOLD")
                          for h in head])
        for row in rows:
            cells.append([T(c, size=SMALL, color=FG) for c in row])

        gutter = 0.7
        widths = [max((line[i].width for line in cells if i < len(line)),
                      default=0.0) for i in range(n)]
        x = [sum(widths[:i]) + gutter * i for i in range(n)]

        lines = []
        for line in cells:
            for i, cell in enumerate(line):
                cell.move_to(ORIGIN)
                # Left edge of the column, not the centre: a number column
                # centred on ragged text stops lining up.
                cell.shift(RIGHT * (x[i] + cell.width / 2))
            lines.append(VGroup(*line))

        grid = VGroup(*lines).arrange(DOWN, buff=0.34, aligned_edge=LEFT)
        if head:
            rule = hairline(width=grid.width + 0.3)
            rule.next_to(lines[0], DOWN, buff=0.16).align_to(grid, LEFT)
            grid.add(rule)
        return grid, lines

    def panel_claim(self, spec):
        text = P(spec.get("text", ""), size=H2, color=FG, align=ORIGIN)
        parts = [text]
        if spec.get("note"):
            parts.append(T(str(spec["note"]), size=SMALL, color=DIM))
        group = VGroup(*parts).arrange(DOWN, buff=0.5)
        return group, parts

    def panel_resources(self, spec):
        rows = []
        for item in spec.get("items", []):
            name = T(str(item.get("name", item)), size=BODY, color=FG)
            gloss = T(str(item.get("gloss", "")), size=SMALL, color=DIM)
            rows.append(VGroup(name, gloss).arrange(DOWN, buff=0.12,
                                                    aligned_edge=LEFT))
        head = T(spec.get("head", "where to go next"), size=H2,
                 color=ACCENT, weight="BOLD")
        group = VGroup(head, *rows).arrange(DOWN, buff=0.38, aligned_edge=LEFT)
        return group, [head] + rows
