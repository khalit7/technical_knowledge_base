"""
The base scene every episode subclasses.

Two jobs.

1. **Pace the animation from the narration.** Each visual beat is keyed to a
   spoken line. `say()` starts the line, `spread()` distributes reveals across
   whatever time that line has left, and `hold()` waits out the remainder. If
   the audio has not been rendered yet, durations are estimated from the word
   count so the animation can be previewed silently.

2. **Make the cheap transition impossible.** There is no `wipe()` here, by
   design. Beats change by morphing one object into the next, by parking the
   old object at the edge of the frame, or by dimming it in place. Those are
   the only three moves, and they are the difference between a video that reads
   as one argument and a slideshow with narration over it.
"""

from __future__ import annotations

import json
from pathlib import Path

from manim import (
    DOWN,
    FadeIn,
    FadeOut,
    LEFT,
    MovingCameraScene,
    ReplacementTransform,
    RIGHT,
    UL,
    UP,
    VGroup,
    config,
)

from manim import Paragraph, Text

from .style import ACCENT, DIM, apply_theme

WORDS_PER_SECOND = 2.4          # 145 words per minute, the technical register
TAIL = 0.35                     # breath after a line before the next one starts


class Narration:
    """Durations for each spoken line, real if rendered, estimated if not."""

    def __init__(self, script: dict[str, list[tuple[str, str]]], audio_dir: Path):
        self.script = script
        self.audio_dir = audio_dir
        path = audio_dir / "durations.json"
        self.real: dict[str, float] = json.loads(path.read_text()) if path.exists() else {}
        self.have_audio = bool(self.real)

    def seconds(self, key: str) -> float:
        if key in self.real:
            return self.real[key]
        words = sum(len(line.split()) for _, line in self.script.get(key, []))
        return max(1.2, words / WORDS_PER_SECOND)

    def clip(self, key: str) -> Path | None:
        path = self.audio_dir / f"{key}.wav"
        return path if path.exists() else None


# What the viewer's file is, rather than what the renderer produced. build.py
# steps down to 720p for anything that will not otherwise fit the upload cap.
DELIVERY_HEIGHT = 720
MIN_LEGIBLE_PX = 13


class TechScene(MovingCameraScene):
    narration: "Narration | None" = None   # set by the episode module
    timing_out: "Path | None" = None       # where to write the beat log

    def setup(self):
        super().setup()
        apply_theme()
        self._beat_start = 0.0
        self._beat_len = 0.0
        self._log: list[dict] = []
        self._parked: list[VGroup] = []
        self.layout_issues: list[dict] = []

    # -- narration ---------------------------------------------------------

    def say(self, key: str):
        """Start the narration line for this beat and remember its length.

        A beat whose animation is shorter than its line would otherwise let the
        next beat's audio start over the top of it, and two voices talking at
        once is not a thing anyone notices while writing the scene: the visuals
        look right, every clip verifies, and the video is unlistenable. So the
        previous line is waited out here rather than trusting each beat to call
        `hold()`. An explicit `hold()` is still good practice, because it is
        what paces the reveals, but forgetting one can no longer break the audio.
        """
        if self._beat_len:
            self.audit_layout()
            left = self.remaining() + TAIL
            if left > 0:
                # How long the frame sat still while this line finished. A few
                # seconds is a breath; twenty is a beat that ran out of things
                # to show and left a title card on screen.
                self._log[-1]["still"] = round(left, 2)
                self.wait(left)

        clip = self.narration.clip(key)
        if clip:
            self.add_sound(str(clip))
        self._beat_start = self.renderer.time
        self._beat_len = self.narration.seconds(key)
        self._log.append({"key": key, "start": round(self._beat_start, 2),
                          "dur": round(self._beat_len, 2)})
        if self.timing_out:
            self.timing_out.write_text(json.dumps(self._log, indent=1))
            issues = self.timing_out.with_name(
                self.timing_out.name.replace("timing_", "layout_"))
            issues.write_text(json.dumps(self.layout_issues, indent=1))

    # -- layout audit ------------------------------------------------------

    def audit_layout(self):
        """Look at the frame the way a viewer would, before moving on.

        Two defects account for most of the rework on these videos and neither
        is visible in the code that causes them: text that runs off the frame,
        and two pieces of text sitting on top of each other. They happen
        because a label inherits the alignment of whatever it was placed next
        to, or because a block was sized for an empty frame and something else
        is already there. Checking the actual bounding boxes at the end of each
        beat catches both without anyone having to squint at a frame."""
        key = self._log[-1]["key"] if self._log else "?"
        half_w = config.frame_width / 2
        half_h = config.frame_height / 2

        texts = []
        for mob in self.mobjects:
            for part in mob.get_family():
                # A Text holds no points itself: its glyphs do. Asking the
                # container whether it has points skips every piece of text on
                # screen, which is how this check first shipped doing nothing.
                if not isinstance(part, (Text, Paragraph)):
                    continue
                if not part.family_members_with_points():
                    continue
                if max(part.get_fill_opacity(), part.get_stroke_opacity()) < 0.25:
                    continue            # faded out, not on screen in practice
                texts.append(part)

        for part in texts:
            left, right = part.get_left()[0], part.get_right()[0]
            bottom, top = part.get_bottom()[1], part.get_top()[1]
            if left < -half_w - 0.02 or right > half_w + 0.02 \
                    or bottom < -half_h - 0.02 or top > half_h + 0.02:
                self.layout_issues.append(
                    {"beat": key, "kind": "off frame",
                     "text": self._describe(part)[:60]})

        for i, a in enumerate(texts):
            for b in texts[i + 1:]:
                overlap = self._box_overlap(a, b)
                if overlap > 0.25:
                    self.layout_issues.append(
                        {"beat": key, "kind": "overlapping text",
                         "text": (self._describe(a)[:40] + " | "
                                  + self._describe(b)[:40]),
                         "fraction": round(overlap, 2)})

        # Legible at the size it is DELIVERED, not at the size it is rendered.
        # An episode over about six minutes does not fit Notion's cap at 1080p
        # and is encoded down to 720p, and anything parked at the corner has
        # already been shrunk to under half size before that. The two multiply:
        # a chart that reads perfectly in the render is a grey smudge in the
        # file anybody actually watches. This is invisible at render time and
        # obvious in the delivered frame, which makes it exactly the kind of
        # thing to measure rather than to notice later.
        for part in texts:
            lines = max(1, len(getattr(part, "text", "a").splitlines()))
            pixels = part.height / config.frame_height * DELIVERY_HEIGHT / lines
            if pixels < MIN_LEGIBLE_PX:
                self.layout_issues.append(
                    {"beat": key, "kind": "too small to read",
                     "text": self._describe(part)[:50],
                     "pixels": round(pixels, 1)})

    @staticmethod
    def _describe(mob) -> str:
        """Whatever text this is, for a report a human has to read."""
        text = getattr(mob, "text", None)
        if text:
            return text
        parts = [getattr(sub, "text", "") for sub in mob.submobjects]
        joined = " ".join(p for p in parts if p)
        return joined or type(mob).__name__

    @staticmethod
    def _box_overlap(a, b) -> float:
        """Intersection as a fraction of the smaller bounding box."""
        ax0, ax1 = a.get_left()[0], a.get_right()[0]
        ay0, ay1 = a.get_bottom()[1], a.get_top()[1]
        bx0, bx1 = b.get_left()[0], b.get_right()[0]
        by0, by1 = b.get_bottom()[1], b.get_top()[1]
        dx = min(ax1, bx1) - max(ax0, bx0)
        dy = min(ay1, by1) - max(ay0, by0)
        if dx <= 0 or dy <= 0:
            return 0.0
        smaller = min((ax1 - ax0) * (ay1 - ay0), (bx1 - bx0) * (by1 - by0))
        return (dx * dy) / smaller if smaller > 0 else 0.0

    def elapsed(self) -> float:
        return self.renderer.time - self._beat_start

    def remaining(self) -> float:
        return self._beat_len - self.elapsed()

    def hold(self, tail: float = TAIL):
        left = self.remaining() + tail
        if left > 0:
            self.wait(left)

    def spread(self, items, run_time=0.45, reserve=0.0, shift=UP * 0.18):
        """Reveal a sequence evenly across what is left of the spoken line."""
        items = list(items)
        if not items:
            return
        budget = max(0.0, self.remaining() - reserve)
        gap = max(0.0, (budget - len(items) * run_time) / len(items))
        for m in items:
            self.play(FadeIn(m, shift=shift), run_time=run_time)
            if gap > 0.05:
                self.wait(gap)

    # -- the only three transitions ---------------------------------------

    def morph(self, old, new, run_time=0.9, **kw):
        """One object becomes another. Use whenever the new thing IS the old
        thing seen differently: a picture becoming a formula, a bar chart
        becoming a curve, a diagram gaining a layer."""
        self.play(ReplacementTransform(old, new, **kw), run_time=run_time)
        return new

    def park(self, mob, corner=UL, scale=0.42, buff=0.5, run_time=0.8, width=None):
        """Shrink something still relevant to the edge of the frame instead of
        removing it. It stays available to point at later. Pass `width` to size
        it absolutely, which is what you want for anything you will bring back:
        repeated relative scaling compounds and the object shrinks away."""
        target = (mob.animate.set(width=width) if width
                  else mob.animate.scale(scale)).to_corner(corner, buff=buff)
        self.play(target, run_time=run_time)
        self.fade_to(mob, 0.55, run_time=0.3)
        self._parked.append(mob)
        return mob

    def fade_to(self, mob, opacity, run_time=0.5):
        """Change how present something is without destroying it.

        `set_opacity` would flatten fill and stroke together, which turns a
        panel with a label inside it into a solid block. This scales each
        piece's own opacity instead, so a diagram keeps its labels at every
        level of emphasis."""
        anims = []
        for part in mob.family_members_with_points():
            if not hasattr(part, "_base_fill"):
                part._base_fill = part.get_fill_opacity()
                part._base_stroke = part.get_stroke_opacity()
            anims.append(
                part.animate.set_fill(opacity=part._base_fill * opacity)
                            .set_stroke(opacity=part._base_stroke * opacity)
            )
        if anims:
            self.play(*anims, run_time=run_time)
        return mob

    def dim(self, *mobs, opacity=0.25, run_time=0.5):
        """Fade the irrelevant without clearing the stage."""
        for m in mobs:
            self.fade_to(m, opacity, run_time=run_time)

    def lift(self, *mobs, opacity=1.0, run_time=0.5):
        for m in mobs:
            self.fade_to(m, opacity, run_time=run_time)

    def retire(self, *mobs, run_time=0.6):
        """The one case where something leaves: it is finished with, and nothing
        later refers back to it."""
        self.play(*[FadeOut(m) for m in mobs], run_time=run_time)

    # -- camera ------------------------------------------------------------

    def look_at(self, mob, zoom=1.0, run_time=1.0, buff=1.2):
        frame = self.camera.frame
        target = frame.copy().move_to(mob.get_center())
        if zoom != 1.0:
            target.set(width=max(mob.width + buff, config.frame_width * zoom))
        self.play(frame.animate.become(target), run_time=run_time)

    def reset_camera(self, run_time=1.0):
        frame = self.camera.frame
        self.play(
            frame.animate.set(width=config.frame_width).move_to([0, 0, 0]),
            run_time=run_time,
        )

    # -- the persistent home frame ----------------------------------------

    def set_home(self, mob, corner=UL, scale=0.45, buff=0.45):
        """The spine of the episode: the one diagram that stays on screen the
        whole way through, so every beat has something to be part of."""
        self.home_frame = mob
        mob.scale(scale).to_corner(corner, buff=buff).set_opacity(0.6)
        self.add(mob)
        return mob

    def highlight_home(self, part, color=ACCENT, run_time=0.6):
        """Point at one piece of the home frame without redrawing it. Stroke and
        label only: filling the shape would swallow its own label."""
        box, label = part[0], part[1]
        self.play(
            box.animate.set_stroke(color, width=5).set_fill(color, opacity=0.16),
            label.animate.set_color(color),
            run_time=run_time,
        )

    def cool_home(self, part, color=None, run_time=0.5):
        box, label = part[0], part[1]
        color = color or box.get_stroke_color()
        self.play(
            box.animate.set_stroke(color, width=2.5).set_fill(color, opacity=0.08),
            label.animate.set_color(color),
            run_time=run_time,
        )
