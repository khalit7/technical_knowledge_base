---
name: create-explainer-video
description: Make a narrated explainer video of a Technical knowledge base page, with visuals built with HyperFrames, narration voiced locally with Chatterbox Turbo and burned-in captions, length decided by the content, attached to the Notion page under its interactive HTML. Use when Khalid asks for a video of a page, or for a video to be remade or re-voiced.
---

# create-explainer-video

Turn one knowledge base page into a narrated explainer video: visuals with HyperFrames, narration with Chatterbox Turbo (default voice), burned-in captions. The project lives in the page's folder at `<page>/video/`; the rendered MP4 goes to Notion only and is never committed. Worked example: `technical_knowledge_base/models_and_training/topic_llms/video/` ("Topic: llms: the two bets that separate the labs").

## Principle
The video is a derived snapshot of the page. It may explain more slowly, but never claims more than the page's `index.html` says; a fact the video needs goes into the page first. Every number, name and claim in the script is checked against the page before audio is generated.

## Setup (once per machine; see `video_utils/README.md`)
- Node 22+, `ffmpeg` and `ffprobe` on PATH.
- HyperFrames skills are committed in `.claude/skills/` (`hyperframes`, `faceless-explainer`, `hyperframes-core`, ...). To refresh them: `npx hyperframes skills update faceless-explainer`, then `sh video_utils/vendor_skills.sh`.
- Voice: `uv sync --project video_utils/voice_cuda` on the NVIDIA machine, or `uv sync --project video_utils/voice_mac --managed-python` on an Apple Silicon Mac. The first run downloads the Turbo model (a few GB) from Hugging Face. Do not substitute another voice without asking Khalid.

## How
1. **Absorb the page.** Read `<page>/index.html` (all tabs) and its `src/`, with the child pages it leans on, until you could teach it.
2. **Brief.** Create `<page>/video/` and load `/hyperframes`; it routes a page-to-video request to `/faceless-explainer`. Write the HyperFrames `BRIEF.md`: 16:9 at 1920x1080 unless Khalid asks otherwise, one finished piece, narrated, no background music. **The length is yours to decide from the content**: as long as the page needs and no longer. Beyond about three minutes HyperFrames routes to `/general-video`; follow that.
3. **Design, script, storyboard** as the workflow says (`frame.md`, `SCRIPT.md`, `STORYBOARD.md`). Write for the ear: short sentences, one idea per line, numbers spoken plainly. Voice line in `SCRIPT.md`: Chatterbox Turbo. Re-check every fact against the page now.
4. **Narration, in place of the workflow's TTS step.** Put one line per frame in `video/narration_lines.tsv` (`N<TAB>text`), then from the repo root:
   `uv run --project video_utils/voice_cuda python video_utils/narrate.py <page>/video/narration_lines.tsv <page>/video/assets/voice`
   (`voice_mac` on the Mac). It writes `NN-cb.wav` per line; `--only 3,5` regenerates single lines.
5. **Check every take** from `<page>/video/`: `python3 <repo>/video_utils/check_takes.py narration_lines.tsv assets/voice`. It transcribes each file with `npx hyperframes transcribe --model small.en` and flags `REDO` lines (missing, repeated or garbled words): regenerate those and check again.
6. **Write `audio_meta.json`:** the same command with `--write` and spelling fixes for the captions, e.g. `--fix "KV cash=KV cache"`. It writes one `voices` entry per frame (`frame`, `path`, `duration_s` from ffprobe, `words` with `start`/`end`) and keeps the sfx entries. Then fetch the sound effects with the workflow's `audio.mjs fetch-sfx`, and set `music: none`.
7. **Build to the real voice:** `audio.mjs sync-durations` so every frame takes its narration's length, then build the frames so each reveal is cued to the word that says it; then `captions.mjs build`, `assemble-index.mjs`, `transitions.mjs inject` and `verify`, in the workflow's order. Run these scripts from the skill's real directory under `.claude/skills/faceless-explainer/scripts/`, never through a symlinked path (a script started through a symlink can exit silently).
8. **Check and render.** `npx hyperframes check` must show no errors (a few pixels of caption overflow is a known false positive; so is an overlap flag on tightly stacked display lines when the snapshot shows nothing touching). Snapshot several moments and confirm the screen matches what is said. `npm run render`; confirm the MP4 has an audio stream and plays.
9. **Re-voicing** an existing video: regenerate and check lines (steps 4 to 6), then map each frame's old cue times onto the new narration rather than rebuilding frames: wrap each frame's registered GSAP timeline in a new paused timeline that tweens the old timeline's `time` piecewise-linearly between matching word starts, register it under the same id, set frame and clip durations to the new lengths, rebuild captions and redo step 8.

## Putting it in Notion
- Upload the MP4 with `create-file-upload` with `content_type` `video/mp4` (the inferred `application/mp4` is rejected on POST), then a multipart POST with the same type.
- Place `<video src="file-upload://...">Video: PAGE TITLE</video>` directly below the page's HTML embed (which stays first). If the page has a video already, replace that tag, matched by its stable `file://` form (see `sync-KB-github`). Use small `update_content` edits; never `replace_content` on a page with child pages or databases. Fetch afterwards and confirm.
- Set `"has_video": true` and a `video` entry (title, filename, `"source": "video/"`) on the page in `technical_knowledge_base/pages.json`, commit the project (renders are gitignored) and push.

## Constraints
- No em-dashes on screen or in captions. Lab names are typeset text, never logos.
- A score or number on screen carries the qualifier the page gives it (harness, version, what it measures).
- Report the final length, the voice and backend used, lines regenerated, and anything the checks flagged.
