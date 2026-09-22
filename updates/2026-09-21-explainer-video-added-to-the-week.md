# 2026-09-21: explainer video added to the week's tech news

A small addition, recorded separately from the research pass and the cleanup pass of the same date.

**[new] A Manim explainer video is attached to **[2026-09-21: tech news](../news/2026-09-21.md)**.** Four minutes forty three seconds, 1080p30, narrated. It covers the four top stories of the issue plus a round-up of the week's releases: the Anthropic task-horizon series animated as a log-scaled chart, the two Lean-verified proofs compared by token spend, the Z.ai finding that the bottleneck was the feedback environment rather than the model, and the Emergence World result that detection did not ensure containment.

**[update] That page gained a Video section**, placed above Top stories. Per [Produce technical explainer video](../.claude/skills/kb-make-video/SKILL.md) the video is a derived representation and the written issue stays canonical, so the section says so explicitly and no empty Video sections were created anywhere else in the tree. Every figure in the animation is taken from the issue text; nothing was introduced that the page does not already state.

### Production notes, for whoever runs this next

The skill names Manim Community Edition as the default and that is what was used, but this machine needed setting up and the obvious route does not work. There is no system Python package for it: `pip install manim` fails because manimpango and pycairo publish no Linux wheels and both need cairo and pango development headers, and installing those needs root, which is not available here. The working route is micromamba as a static binary plus the conda-forge build of manim, which ships cairo, pango and ffmpeg prebuilt. There is still no LaTeX on the machine, so scenes must use Pango text and avoid `Tex` and `MathTex` entirely.

**Narration is local.** Piper with the `en_GB-cori-high` voice, run inside the same environment, so the script never leaves the machine and no speech API is involved. The pipeline is worth copying rather than reinventing: `narration.py` holds the script keyed by scene segment, `build_audio.py` renders each segment to a WAV and writes a durations file, and the scene reads those durations so every visual beat is paced to the line spoken over it. Three helpers do the work, one to start a clip and record its length, one to spread a sequence of reveals evenly across that length, and one to wait out whatever is left. A dry run dumps the resulting timing so overlaps can be checked before rendering; this cut came out with every line clear of the next by between 0.14 and 1.18 seconds.

Write numbers phonetically in the script. A text-to-speech model reads "3.22x" and "Z.ai" badly, so the script spells them as spoken words while the on-screen text keeps the real figures.

Two further constraints worth knowing. This workspace rejects uploads above 5 MiB. A direct 1080p60 render of the narrated cut came to 16 MiB, and the combination that fits is constant rate factor 28 at 30 frames per second with mono audio at 48 kbps, giving 4.52 MiB with text still crisp at full resolution; 30 frames is enough because the animation is fades and writes rather than motion. And the Notion upload must be sent with the content type the upload was created with, which is inferred as `application/mp4` from the extension, not `video/mp4`; sending the latter is rejected. The block still renders as a playable video.

The scene source, the narration script and the audio build step live outside Notion, in the local working copy, alongside the rendered file.
