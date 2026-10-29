---
name: explainer-video
description: Make a narrated explainer video of a Technical knowledge base page (make a video of a page, explainer video, remake or re-voice a video), with visuals built in HyperFrames, narration voiced locally with Chatterbox Turbo, burned-in captions, length decided by the content, and the MP4 attached to the page's Notion page directly under its link line. Use when Khalid asks for a video of a page, an explainer video, or for an existing video to be remade or re-voiced.
---

# explainer-video

Turn one knowledge base page into a narrated explainer video: visuals with HyperFrames, narration with Chatterbox Turbo (its default voice), burned-in captions. The project lives in the page's folder at `<page>/video/` and is committed; the rendered MP4 goes to Notion only and is never committed.

Worked example: `technical_knowledge_base/models_and_training/topic_llm_landscape/video/` ("Topic: llms: the two bets that separate the labs", 8 frames, about 90 s, first voiced with Kokoro and later re-voiced with Chatterbox by timeline warp).

## Principle
**The video is a derived snapshot of the page.** It may explain more slowly than the page, but it never claims more than the page's `index.html` says. A fact the video needs and the page lacks goes into the page first (through the `explainer-page` skill), then into the video. Every number, name and claim in the script is checked against `index.html` before any audio is generated, and again on the snapshots before rendering.

**The video must teach, not list.** The same teaching standard as the page applies: one angle the viewer can carry away (the topic_llm_landscape video teaches a reading habit, "two bets", rather than a tour of twenty labs), one idea per frame, a running example where the page has one, and animations that show the mechanism, preferably a before and after of the same input. A frame that only puts bullet points on screen while the voice reads them is a failure; so is a frame whose reveal arrives before or after the word that names it.

## When to use
- Khalid asks for a video of a page, an explainer video, or a short video version of a topic.
- An existing video must be remade because the page changed (rebuild from step 1 or from the changed frames).
- An existing video must be re-voiced (new voice backend, fixed pronunciations, changed lines): step 9 of the workflow.

Not for: building or changing the page itself (`explainer-page`), publishing pages (`sync-kb-github`).

## Steps (full detail in `workflow.md`)
1. Absorb the page until you could teach it.
2. Brief: create `<page>/video/` with `npx hyperframes init`, write `BRIEF.md` (16:9, 1920x1080, narrated, no music, length from the content).
3. Design, script, storyboard: `frame.md`, `SCRIPT.md`, `STORYBOARD.md`; re-check every fact against the page.
4. Narration in place of the HyperFrames TTS step: `narration_lines.tsv`, then `narration/narrate.py`.
5. Check every take with `narration/check_takes.py`; regenerate REDO lines.
6. Write `audio_meta.json` with `check_takes.py --write` and caption spelling fixes; fetch sound effects; no music.
7. Build to the real voice: sync durations, build frames cued to words, captions, assemble, transitions; faceless-explainer scripts run from their real path.
8. Check and render: `npx hyperframes check` (known false positives listed), snapshots against the script, render, confirm audio.
9. Re-voicing: new takes, then warp each frame's old timeline onto the new word times instead of rebuilding frames.

Then publish to Notion as `notion.md` says.

## Files in this skill
| File | What it holds |
|---|---|
| `workflow.md` | Steps 1 to 9 with commands, the real-path rule, known check false positives, re-voicing by timeline warp, lessons from the worked example. |
| `hyperframes.md` | Which vendored HyperFrames skills and scripts this workflow uses and how; refreshing them with `scripts/vendor_skills.sh`. |
| `notion.md` | Uploading the MP4, placing the `<video>` under the page's Notion link line, `pages.json`. |
| `narration/install.md` | One-time setup: uv, Node, ffmpeg, the voice environment (`voice_mac` or `voice_cuda`), smoke test. |
| `narration/narrate.py` | Voices each line of `narration_lines.tsv` into `NN-cb.wav`; picks the installed backend. |
| `narration/check_takes.py` | Transcribes each take, flags REDO lines, writes the `voices` of `audio_meta.json`. |
| `narration/voice_mac/`, `narration/voice_cuda/` | uv projects (pyproject and lock) for the two backends; their `.venv` is never committed. |
| `scripts/vendor_skills.sh` | Copies refreshed HyperFrames skills into `vendor/` as real folders and cleans up the CLI's symlinks. |
| `templates/project-CLAUDE.md` | Replaces the `AGENTS.md` and `CLAUDE.md` that `hyperframes init` writes into a page's `video/`. |
| `vendor/` | The seven third-party HyperFrames skills this workflow uses (hyperframes, faceless-explainer, hyperframes-core, -cli, -animation, -creative, media-use), read by path. Do not edit. |

## Constraints
- **No em-dashes** on screen, in captions, in the script or in any project file. Commas, colons, semicolons, parentheses; `--` for ranges.
- **Lab and product names are typeset text, never logos.** No logo fetching, even though the HyperFrames media skill offers it.
- **Numbers carry the page's qualifier.** A score on screen says what the page says it is: harness, version, setting, what it measures (the worked example shows "standard harness 62.7%" and "provider adapter 99.9%" on the same weights, never a bare "99.9%").
- **Never commit MP4s** (or MOV, WebM, renders, snapshots); `.gitignore` blocks them. The MP4 lives in Notion only.
- **Ask before changing the voice.** The voice is Chatterbox Turbo's default voice on either backend. Do not substitute HeyGen, Kokoro, another Chatterbox voice or a cloned voice without Khalid's explicit yes.
- Do not ask Khalid the HyperFrames intent questions: the brief is settled by this skill (write it into `BRIEF.md` notes). Ask him only what is his to decide (a different length, aspect or voice than the defaults, or a page fact that seems wrong).
- On a CUDA machine, narration is GPU work: one GPU-bound agent at a time.

## Final report
Report to Khalid:
- the page, the video title, the final length and the number of frames;
- the voice and backend used (`voice_mac` MLX or `voice_cuda` PyTorch, and CPU fallback if it happened);
- the lines regenerated after take checks, and the caption spelling fixes applied;
- anything `check` flagged and why it was accepted (known false positives) or fixed;
- every fact you added to the page first, and any fact you dropped because the page did not support it;
- where the video sits in Notion (fetched and confirmed under the link line), the `pages.json` change, and the commit.
