# HyperFrames: what this workflow uses

HyperFrames renders video from HTML: each frame is an HTML composition with a seekable GSAP timeline registered in `window.__timelines`, and the CLI (`npx hyperframes@<pinned version>`, run through the project's `package.json` scripts) previews, checks, snapshots and renders it with its own headless Chrome. Its skills are third-party, vendored as real folders under `.claude/skills/` and recorded in `skills-lock.json` at the repo root. Do not edit them; refresh them as below.

## Skills used, and how
| Skill | Role here |
|---|---|
| `hyperframes` | The entry point. Load it first; with a `BRIEF.md` present it reads `workflow` and goes straight there without the intent interview. Its `references/` hold the contracts the workflow cites: `brief-format.md` and `brief-contract.md` (writing `BRIEF.md`), `storyboard-format.md` and `script-format.md` (step 3), `frame-worker-core.md` and `subagent-dispatch.md` (step 7), `routes/faceless-explainer.md` (the 30 to 90 s sweet spot, about 3 minutes cap). |
| `faceless-explainer` | The workflow followed for a page video: text in, invented visuals out, no capture. We follow its Steps 0 to 6 with two substitutions: its Step 3.1 TTS (`audio.mjs --script`) is replaced by our local narration (workflow steps 4 to 6), and its review pauses are skipped unless Khalid asked to see the plan. |
| `general-video` | Used instead of faceless-explainer when the content needs more than about three minutes (`workflow: general-video` in `BRIEF.md`). Narration, checks and publishing stay as in this skill. |
| `hyperframes-creative` | Step 3: `frame-presets/` (pick the design preset), `references/design-spec.md`, `references/story-spine.md`. |
| `hyperframes-animation` | Steps 3 and 7: `blueprints-index.md` and `blueprints/` (shot shapes per beat), `rules-index.md` and `rules/` (named motions the storyboard cites; do not invent motion names). |
| `hyperframes-core` | The composition contract (`data-*` timing, `class="clip"`, tracks, `window.__timelines`); read before hand-editing any frame HTML, including the voice warp. |
| `hyperframes-cli` | `init`, `catalog`, `transcribe` (used by `check_takes.py`), `lint`, `check`, `snapshot`, `preview`, `render`, `upgrade`. |
| `media-use` | Only for sound effects (`audio.mjs fetch-sfx` resolves them) and, if ever needed, an image the page itself contains. Not for voices (ours is local), not for music (none), not for logos (names are typeset). |

The other vendored skills (`product-launch-video`, `pr-to-video`, `motion-graphics`, `music-to-video`, `slideshow`, `embedded-captions`, `talking-head-recut`, `remotion-to-hyperframes`, `figma`, `hyperframes-studio`, `hyperframes-audio`, `hyperframes-keyframes`, `hyperframes-registry`, and the registry blocks such as `canopy-part-title` or `orbit-card`) exist because the HyperFrames installer brings them, but they are not part of this workflow. A frame may still install a registry block when a catalog search finds one that fits.

## Scripts used (in `.claude/skills/faceless-explainer/scripts/`)
| Script | Step | Use |
|---|---|---|
| `build-frame.mjs --preset <name> --hyperframes .` | 3 | Copies the preset into `frame.md` and the caption skin into `.hyperframes/`. |
| `audio.mjs fetch-sfx --storyboard ./STORYBOARD.md --hyperframes .` | 6 | Fetches the storyboard's sound effects into `assets/sfx/` and `audio_meta.json`. |
| `audio.mjs sync-durations --audio-meta ./audio_meta.json --storyboard ./STORYBOARD.md` | 7 | Sets each frame's duration to its narration's length. |
| `frame-packets.mjs --project <dir> --storyboard <dir>/STORYBOARD.md` | 7 | One packet per frame plus `_role.md` for the frame-worker subagents. |
| `captions.mjs build ... --out ./caption_groups.json` | 7, 9 | Burned-in captions from the `words` in `audio_meta.json`. |
| `assemble-index.mjs --storyboard ./STORYBOARD.md --hyperframes .` | 7 | Builds `index.html` from the frames, voices, sfx and captions. |
| `transitions.mjs inject` and `transitions.mjs verify` | 7 | Adds and checks the `transition_in` of each frame. |

Not used: `audio.mjs --script ...` (TTS with HeyGen or Kokoro; replaced by `narration/narrate.py`). The `*.test.mjs` files are upstream tests.

**Real-path rule:** run every script as `node <repo>/.claude/skills/faceless-explainer/scripts/<name>.mjs`, never through a symlinked path; a script started through a symlink can exit silently.

**Known check false positives:** caption-word `text_box_overflow` of 1 to 4 px, and overlap flags on tightly stacked display lines when the snapshot shows no contact (details in `workflow.md`, step 8).

## Refreshing the vendored skills
1. From the repo root: `npx hyperframes skills update faceless-explainer` (or another skill name; a bare `npx hyperframes skills update` refreshes the core set plus everything installed). The CLI installs into `.agents/skills/` and symlinks them from `.claude/skills/`.
2. Then `sh .claude/skills/explainer-video/scripts/vendor_skills.sh`: it replaces each symlink with a real copy in `.claude/skills/<name>` and removes `.agents/` (symlinks break on Windows checkouts and through some script launchers). `.agents/` is gitignored in any case.
3. Review the diff (`git diff --stat .claude/skills skills-lock.json`), skim the faceless-explainer SKILL for changed steps or script flags, and update `workflow.md` here if they moved.
4. Existing projects keep their pinned CLI version in `package.json`; bump it only when you rebuild that video (`npx hyperframes@latest upgrade --project . --check`).

## Sources distilled
The vendored `.claude/skills/hyperframes/SKILL.md` (routing, CLI pin) and `references/routes/faceless-explainer.md`; `faceless-explainer/SKILL.md` and its `scripts/` listing; `general-video/SKILL.md`; `.claude/skills/create-explainer-video/SKILL.md`; `video_utils/vendor_skills.sh` and `README.md`; `skills-lock.json`; the worked example's `hyperframes.json` and `package.json`.
