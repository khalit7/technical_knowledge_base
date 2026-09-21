---
name: kb-make-video
description: Produce a narrated explainer video from a knowledge base page (a topic, a deep dive, or the week's tech news issue) and attach it to that page in Notion. Use when Khalid asks for a video, an explainer, or a narrated version of something in the KB.
---

# Make an explainer video

Read the Notion skill **Produce technical explainer video** before writing
anything. It is canonical and it holds the whole method: the spine, the
transitions, the script, the voice, the weekly news format, and where the
finished video lives. This file is only the repo-side procedure, and
`video/README.md` is the mechanics. The canonical page being explained is the
source of every fact; the video may not out-claim it.

## The shape of the work

1. **Read the canonical page** in Notion and resolve every factual gap before
   scripting. A number you cannot trace does not go in.
2. **Outline, then revise the outline.** The spine is: tension, the sharp
   question, the contract, common ground, a causal walk, the objection, the
   take, a coda. Pick one story and follow it down; a roundup of eight items is
   not an episode.
3. **Write the script sterile**, into `video/scripts/<episode>.py`, as a dict
   of beat key to `(speaker, line)` turns. Speaker A narrates; speaker B is the
   listener who asks the viewer's question, three to five times in eight
   minutes.
4. **Critique it and fix what the critique finds.** Record what changed in the
   module docstring, which is where the previous episode's critique lives too.
5. **Only then add the humanity**: the breaths, the one false start, the
   "yeah, and". Roughly one per one hundred and fifty spoken words.
6. **Storyboard into `video/scenes/<episode>.py`**, using the same beat keys.
   Every beat is a change to the episode's one persistent diagram. Never a
   hard cut: morph, park at the edge, or dim.
7. **Preview silently** while the script settles:
   `python3 video/build.py <episode> --skip-tts --quality l`. Pull a dozen
   frames out with ffmpeg and look at them. Text running off the frame is the
   commonest defect, and `fit()` in `common/style.py` is the fix.
8. **Render the voice**, then the real animation:
   `python3 video/build.py <episode>`. The voice stage is the only part that
   needs a GPU. If the GPUs are busy with Khalid's own work, ask before taking
   them.
9. **Check it against the quality bar** in the Notion skill. The two that catch
   most problems: with the sound off the animation should still tell the story,
   and with eyes closed the audio should still tell the story.
10. **Attach it to the canonical Notion page** under a `Video` heading, and add
    a dated line to the Notion Updates changelog. Add the video section only
    where a video actually exists.

## Registering a new episode

`video/build.py` maps an episode name to its scene file and class in `SCENES`.
Add the entry when you add the episode.

## What not to do

- Do not read the page aloud. The page is written for the eye, in a different
  order, and a narrated article is the failure mode everything here is built to
  avoid.
- Do not add chapter cards, numbered sections or "first, second, finally". The
  connective tissue is spoken.
- Do not invent a figure for narrative shape, and do not quote an extreme
  operating point the source itself flags as unrepresentative.
- Do not clone a real person's voice without Khalid's explicit say-so.
