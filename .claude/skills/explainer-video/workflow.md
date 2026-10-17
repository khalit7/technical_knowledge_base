# Workflow: from a page to a rendered video

Conventions used below:
- `<page>` is the page folder (for example `technical_knowledge_base/models_and_training/topic_llms`); the project is `<page>/video/`.
- `R` is the repo root: `R="$(git rev-parse --show-toplevel)"`.
- `N="$R/.claude/skills/explainer-video/narration"` (narration scripts and voice projects).
- `FX="$R/.claude/skills/explainer-video/vendor/faceless-explainer"` (the vendored faceless-explainer skill; its scripts are in `$FX/scripts/`).
- `VOICE` is `voice_mac` on an Apple Silicon Mac, `voice_cuda` on the NVIDIA machine.
- Unless a step says otherwise, commands run from `<page>/video/`.

Setup must be done once per machine first: `narration/install.md`.

## 1. Absorb the page
Read `<page>/index.html` in full (every tab: Reading, each lab, Further reading), its `src/` (README, `parts/`, data scripts and their outputs) and the child pages it leans on, until you could teach the topic out loud without notes. Note the page's own thesis (often stated in a "how to read this page" passage) and its qualifiers on every number. Keep a short fact list (claim, value, qualifier, where on the page) in your notes; every later check runs against it.

If the video needs something the page does not say, stop and add it to the page first with the `explainer-page` skill (and rebuild and check the page). The video never leads the page.

## 2. Brief
1. Read `$R/.claude/skills/explainer-video/vendor/hyperframes/SKILL.md` (the vendored HyperFrames skills are not separate slash commands here; they live in `vendor/` and are read by path; it routes a text-to-video request to `vendor/faceless-explainer/SKILL.md`, which you then follow; see `hyperframes.md`). Keep the CLI current with `npx hyperframes@latest upgrade --project . --check` when resuming an old project.
2. Create the project from the repo root, only if `<page>/video/` does not exist yet (init refuses a non-empty folder):
   `npx hyperframes init <page>/video --non-interactive --example=blank --skill=faceless-explainer`
   This writes `hyperframes.json`, `package.json` (which pins `hyperframes@<version>` in its scripts), `meta.json`, `AGENTS.md`, `CLAUDE.md`. Keep them.
3. Write `BRIEF.md` straight after init, in the shape of `$R/.claude/skills/explainer-video/vendor/hyperframes/references/brief-format.md`. Defaults for this knowledge base (the worked example's frontmatter is the model):
   - `workflow: faceless-explainer`, `flow: automation`, `storyboard: no`, `destination: desktop`, `aspect: 1920x1080`, `language: en`, `audience: "An MSc-level AI engineer (Khalid)"`, `angle:` concept, how-to, listicle or narrative, whichever the page's own shape suggests.
   - `message:` the one sentence the viewer should leave with.
   - `length:` **yours to decide from the content**: as long as the page needs and no longer. The faceless route's sweet spot is 30 to 90 s with a cap near 3 minutes; beyond about three minutes HyperFrames routes to `general-video`, which is not vendored (never used so far): install it first as in `hyperframes.md` "Refreshing", then set `workflow: general-video` and follow it, keeping every other step here.
   - Notes: the source is the page text only; every fact must appear on the page; no em-dashes; the intent interview was done by the caller, ask Khalid nothing; narrated, no background music.
4. Fill the synthetic capture by hand: `capture/extracted/visible-text.txt` (the page's visible text, verbatim, from `index.html`) and `capture/extracted/tokens.json` (`title`, `description`; empty `colors` and `fonts`). No `npx hyperframes capture`.
5. `npx hyperframes auth status` only tells which engines HyperFrames would use; this workflow voices locally, so signed out is fine.

## 3. Design, script, storyboard
Follow faceless-explainer Steps 2 to 4 (read the references they name):
- **Design (`frame.md`).** Pick one preset from `$R/.claude/skills/explainer-video/vendor/hyperframes-creative/frame-presets/` that fits the topic, then `node "$FX/scripts/build-frame.mjs" --preset <name> --hyperframes .`. Proceed when it exits 0. The worked example used Broadside (ink-black and fire-orange registers, heavy lowercase display type, mono chrome).
- **Script (`SCRIPT.md`).** One line per frame. Write for the ear: short sentences, one idea per sentence, numbers spoken as words a listener parses ("six hundred billion total, twenty-seven billion active"), acronyms the voice can say. Voice header: `**Voice:** Chatterbox Turbo default voice (local)`, plus a one-line voice direction (the example: "Calm, precise, peer to peer. An engineer briefing another engineer; no hype.").
- **Storyboard (`STORYBOARD.md`).** Frontmatter `duration:` from the brief and `music: none`. For every frame: `scene`, `voiceover` (identical to the script line), `duration` (estimate for now), `transition_in`, `src`, `type`, `beat`, `blueprint` if one fits, `focal`, `roles`, `sfx`, `narrativeRole`, `keyMessage`, then a time-coded shot sequence (Scene 1, 2, ...) whose every reveal is tied to the words that say it ("on 'sixty-two point seven percent in the standard harness' bar one grows to 62.7%"). Add the `## Video direction` block. Search the catalog before inventing a named look: `npx hyperframes catalog --query "<look>" --json`.
- **Teach.** Sequence by narrative, not page order: hook, the frame or mechanism, the evidence, the payoff, and a closing line the viewer can reuse. Prefer before and after of one input, a quantity that visibly changes, a callback to an earlier frame.
- **Re-check every fact against the page now**, line by line against your fact list: names, numbers, dates, qualifiers. Fix the script before any audio exists; audio is the expensive part to redo.

Autonomous mode: post the frame-by-frame plan to Khalid as a heads-up only if he asked to see it; otherwise proceed.

## 4. Narration (replaces faceless-explainer Step 3.1)
Do **not** run `audio.mjs --script ...`: it would voice the script with HeyGen or Kokoro. Instead:
1. Write `narration_lines.tsv`: one row per frame, `N<TAB>text`, text identical to the frame's voiceover.
2. Voice it:
   `uv run --project "$N/$VOICE" python "$N/narrate.py" narration_lines.tsv assets/voice`
   It writes `assets/voice/NN-cb.wav` per line. `--only 3,5` regenerates single lines. On CUDA it warns and runs on CPU (slowly) if no GPU is visible; on a shared GPU machine only one GPU-bound agent runs at a time.

## 5. Check every take
`python3 "$N/check_takes.py" narration_lines.tsv assets/voice`
It transcribes each file with `npx hyperframes transcribe --model small.en`, compares heard and scripted words and prints a similarity per line; under 0.9 is `REDO` (missing, repeated or garbled words). Regenerate those with `--only` and check again. A line that keeps failing usually needs rewording for the voice (split a long sentence, spell out a symbol), not more retries; if you reword, update `SCRIPT.md` and `STORYBOARD.md` too. Listen to the takes for mispronounced names: a correct transcript can still hide a wrong stress.

## 6. Write `audio_meta.json`
`python3 "$N/check_takes.py" narration_lines.tsv assets/voice --write --fix "KV cash=KV cache" [--fix ...]`
It writes one `voices` entry per frame (`frame`, `path`, `duration_s` from ffprobe, `words` with `start` and `end`) and keeps existing `sfx` and `bgm` entries. `--fix "heard=meant"` corrects the caption spelling of mishearings (multi-word fixes keep the original timings); run it from `video/` because it writes `audio_meta.json` in the current folder. When re-voicing, copy the old file first (step 9).

Then fetch the sound effects named in the storyboard: `node "$FX/scripts/audio.mjs" fetch-sfx --storyboard ./STORYBOARD.md --hyperframes .`. Keep `music: none` in the storyboard (narration plus no BGM). Keep sfx quiet under the voice (the example uses volume 0.35).

## 7. Build to the real voice
In faceless-explainer's order, every script run from its real path `"$FX/scripts/..."`:
1. `node "$FX/scripts/audio.mjs" sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md`: every frame takes its narration's length. Never hand-edit synced durations.
2. Update the storyboard's scene times to the real word starts from `audio_meta.json`, so each reveal is cued to the word that says it.
3. `node "$FX/scripts/frame-packets.mjs" --project "$PWD" --storyboard "$PWD/STORYBOARD.md"`, then build each `compositions/frames/NN-*.html` with one frame-worker subagent per frame (role file plus that frame's packet, as faceless-explainer Step 5 says). At most four subagents at a time, in waves. Mark each frame `animated` as it returns.
4. `node "$FX/scripts/captions.mjs" build --storyboard ./STORYBOARD.md --audio-meta ./audio_meta.json --hyperframes . --out ./caption_groups.json`
5. `node "$FX/scripts/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes .`
6. `node "$FX/scripts/transitions.mjs" inject --storyboard ./STORYBOARD.md --hyperframes .` and `node "$FX/scripts/transitions.mjs" verify --storyboard ./STORYBOARD.md --index ./index.html`

**Real-path rule.** Always start these scripts as `node <repo>/.claude/skills/explainer-video/vendor/faceless-explainer/scripts/<name>.mjs`, the real folder. Never through a symlink (for example an `.agents/skills/...` path or a linked skills folder): a script started through a symlinked path can exit silently without doing its work. If `.agents/` appears after a skills update, run `scripts/vendor_skills.sh` (see `hyperframes.md`).

## 8. Check and render
1. `npx hyperframes lint` and `npx hyperframes check`: no errors. Known false positives, do not chase them:
   - `text_box_overflow` of about 1 to 4 px on caption words (`#caption-word-*`, `.caption-line`): the caption pill's snug line-height lets heavy glyphs spill into its own padding. Act only when it names a frame element (`#el-NN-*`).
   - an overlap flag on tightly stacked display lines, when the snapshot shows nothing actually touching.
2. Snapshot several moments per frame (`npx hyperframes snapshot --at <times>`), open the contact sheet and the images, and confirm that what is on screen at each moment is what the voice is saying then, that every number carries its qualifier, that nothing is cut off, and that no em-dash slipped in.
3. Render: `npm run render` (uses the pinned CLI; or `npx hyperframes render --quality high --output renders/video.mp4`). Renders land in `renders/`, which is gitignored.
4. Confirm the MP4: `ffprobe` shows a video and an audio stream and the expected duration; play it through once (or spot-check the start, a middle frame and the end) for sync.

## 9. Re-voicing an existing video
Use when the frames are right but the narration changes (new backend, fixed lines). Do not rebuild frames; warp their timelines.
1. Copy the current `audio_meta.json` to `audio_meta.old.json` (the old word times are the warp's input).
2. Regenerate and check the lines (steps 4 to 6).
3. For each frame, align old and new words (normalise text, match with `difflib.SequenceMatcher` on the word lists) and collect pairs `[old_start, new_start]` for matched words, starting with `[0, 0]` and ending with `[old_frame_duration, new_frame_duration]`. Keep pairs strictly increasing in both columns.
4. Append a warp script to the frame's template, after the script that registers its timeline. The worked example's block (tagged `data-voice-warp`):
   ```html
   <script data-voice-warp>
   (function () {
     var inner = window.__timelines["05-serving-bill"];
     var A = [[0.0, 0.0], [0.72, 0.96], /* ... */ [20.22, 19.697]];
     var m = gsap.timeline({ paused: true });
     for (var i = 1; i < A.length; i++) {
       m.fromTo(inner, { time: A[i - 1][0] }, { time: A[i][0], duration: A[i][1] - A[i - 1][1], ease: "none", immediateRender: false }, A[i - 1][1]);
     }
     window.__timelines["05-serving-bill"] = m;
   })();
   </script>
   ```
   It wraps the original timeline in a new paused timeline that tweens the old timeline's `time` piecewise-linearly between matching word starts, and registers it under the same id, so every reveal lands on its word in the new voice. The original timeline must still span its old full duration (a held tail such as `tl.to({}, { duration: 0.01 }, <old end>)`).
5. Set each frame's duration and its clip durations in `index.html` (and `STORYBOARD.md`) to the new lengths; `audio.mjs sync-durations` handles the storyboard.
6. Rebuild captions (`captions.mjs build`), re-run assemble and transitions if durations moved, then step 8 in full.

## Lessons from the worked example (`topic_llms/video/`)
- One concept angle beats coverage: the page maps 20 labs, the video teaches the frame the page uses to read them (shared skeleton, then two bets) and lands a benchmark caveat as the payoff of that same frame.
- Eight frames of 5 to 20 s each made about 90 s; each frame has one focal element and a time-coded scene list tied to words.
- Qualifiers are part of the visual: two bars labelled by harness, a bracket naming the gap, a small mono footnote for the secondary numbers.
- The closing frame calls back to the opening structure (two bands become two questions) and ends on a real exit (a slow fade), with a small source line naming the page.
- The video was first voiced with Kokoro through `audio.mjs`, then re-voiced with Chatterbox by warping each frame's timeline (step 9); no frame was rebuilt.
- What is committed: `BRIEF.md`, `SCRIPT.md`, `STORYBOARD.md`, `frame.md`, `narration_lines.tsv`, `compositions/`, `index.html`, `assets/` (fonts, sfx, `voice/NN-cb.wav`, a few MB), `audio_meta.json`, `caption_groups.json`, `capture/extracted/`, `.media/`, `hyperframes.json`, `package.json`, `meta.json`, `AGENTS.md`, `CLAUDE.md`. Not committed: `renders/`, `snapshots/`, `.hyperframes/`, any MP4.

## Sources distilled
`.claude/skills/create-explainer-video/SKILL.md` (steps 1 to 9); `video_utils/README.md`, `narrate.py`, `check_takes.py`; the vendored `faceless-explainer/SKILL.md` (steps, scripts, known false positive), `hyperframes/SKILL.md` and its faceless route; the worked example `topic_llms/video/` (`BRIEF.md`, `SCRIPT.md`, `STORYBOARD.md`, `narration_lines.tsv`, `audio_meta.json`, `compositions/frames/*.html` voice warp blocks, `package.json`); `CLAUDE.md` (subagent limits, writing rules); memory note on one GPU-bound agent at a time.
