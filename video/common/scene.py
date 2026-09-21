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

    # -- narration ---------------------------------------------------------

    def say(self, key: str):
        """Start the narration line for this beat and remember its length."""
        clip = self.narration.clip(key)
        if clip:
            self.add_sound(str(clip))
        self._beat_start = self.renderer.time
        self._beat_len = self.narration.seconds(key)
        self._log.append({"key": key, "start": round(self._beat_start, 2),
                          "dur": round(self._beat_len, 2)})
        if self.timing_out:
            self.timing_out.write_text(json.dumps(self._log, indent=1))

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
