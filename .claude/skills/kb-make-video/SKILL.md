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

The Notion skill holds the method and the reasoning. This is the repo-side
procedure and the commands.

1. **Read the canonical page** in Notion. A number you cannot trace does not go in.
2. **Outline against the spine, then revise it.** For a news edition: ident,
   then one story at a time opened headline first, then the take.
3. **Write the script** into `video/scripts/<episode>.py`: beats mapping to
   `(speaker, line)` turns. Short sentences. Numbers spelled the way they are
   said. Pace is a writing problem; nothing downstream will fix it.
4. **Critique it, fix it, then add the humanity.** Record what the critique
   changed in the module docstring, so the next episode inherits the lesson.
5. **Storyboard into `video/scenes/<episode>.py`** using the same beat keys.
   Inherit the shared furniture from `common/news.py`; write only this week's
   diagrams. Beats must not depend on objects another beat created.
6. **Preview silently**, then pull frames and look at them:
   `uv run video/build.py <episode> --skip-tts --quality l`
7. **Render the voice and the animation**: `uv run video/build.py <episode>`.
   The voice stage verifies every take and reseeds on failure.
8. **Run the checks and fix what they find:**
   - `uv run python video/tools/check_structure.py --script <episode>` first,
     before rendering: it is the only check that reads the script rather than
     the finished video, so it catches a missing beat while it is still cheap.
   - the layout audit runs inside the render: read
     `video/out/layout_<episode>.json` for text off the frame or overlapping.
   - `uv run python video/tools/check_timing.py --script <episode>` for two
     voices at once, silent gaps and still frames.
   - `uv run --group tts --group video python video/tools/check_references.py
     --script <episode> --scene <Class>` for lines that point at the screen,
     then look at every frame it extracts.
   - `uv run --group tts python video/tts/verify.py --script <episode>` for
     what each take actually said.
9. **Watch it.** With the sound off, with your eyes closed, then properly. The
   checks are geometry and transcription; whether it reads is not.
10. **After any refactor, build one episode end to end** before calling it done.
    A moved path or a renamed tool does not surface until something uses it.
11. **Attach it to the canonical Notion page** under a `Video` heading, and add
    a dated line to the Notion Updates changelog.

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
