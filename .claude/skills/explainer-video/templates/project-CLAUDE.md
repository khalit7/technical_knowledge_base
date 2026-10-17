# HyperFrames project for a knowledge base page video

This folder is the video of the page one level up. Follow the `explainer-video` skill (`.claude/skills/explainer-video/SKILL.md` and `workflow.md`) from the repo root; it decides the steps, the narration (Chatterbox Turbo, `narration/narrate.py`) and the checks.

## HyperFrames reference (vendored, read by path)
The HyperFrames skills this workflow uses are vendored in `.claude/skills/explainer-video/vendor/` and are not slash commands:
- `hyperframes/SKILL.md`: entry point and routing; `references/brief-format.md` for `BRIEF.md`.
- `faceless-explainer/SKILL.md` and `scripts/`: the workflow followed for a page video. Run scripts by their real path: `node <repo>/.claude/skills/explainer-video/vendor/faceless-explainer/scripts/<name>.mjs`.
- `hyperframes-core` (composition contract), `hyperframes-animation` (blueprints, easing), `hyperframes-creative` (frame presets, design), `hyperframes-cli` (CLI commands), `media-use` (sound effects only).
Other HyperFrames skills were removed as unused; see `.claude/skills/explainer-video/hyperframes.md` to install one when a video needs it.

## Commands (run in this folder)
```bash
npx hyperframes preview --background   # agent-safe preview; --status to verify, --stop when done
npm run check                          # lint + runtime + layout + motion + contrast
npm run render                         # render to MP4 (never commit the MP4)
npx hyperframes docs <topic>           # data-attributes, gsap, compositions, rendering, examples, troubleshooting
```
The scripts pin an exact `hyperframes@X.Y.Z`; bump only when rebuilding (`npx hyperframes@latest upgrade --project . --check`).

## Key rules
1. Every timed element has `data-start` and a duration; give timed visuals `class="clip"`.
2. Register one paused root timeline per composition on `window.__timelines["<id>"]`; scene timelines added to it are not paused.
3. Videos are `muted` with a separate `<audio>` element.
4. Sub-compositions use `data-composition-src="compositions/<file>.html"`.
5. Deterministic only: no `Date.now()`, no `Math.random()`, no network.
6. Run `npm run check` after every change; fix errors before rendering.
7. Repo rules: no em-dashes anywhere on screen or in captions; every number and claim matches the page's `index.html`.
