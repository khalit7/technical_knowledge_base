# Brief template: rules shared by every agent on one topic

Purpose: the fill-in template for `{{PREFIX}}_common.md`, the one file every agent of a topic (setup, labs, map, Reading, children, fix and wiring passes) reads in full before working.

## How to fill it
- Placeholders are ALL-CAPS in double braces: `{{TOPIC_TITLE}}` (exact Notion title, for example "Topic: generative-and-multimodal"), `{{ROOT_FOLDER}}` (repo-relative, `technical_knowledge_base/<section>/<topic>/`), `{{ROOT_ID}}` (32 hex, no dashes), `{{PREFIX}}` (two or three letters for the topic, for example `gm`), `{{SCRATCH}}` (the session scratchpad; the topic works in `{{SCRATCH}}/{{PREFIX}}`), `{{TOOLS}}` (the scratchpad's shared tools dir holding `guard.sh`, `lock.sh` and `locks/`, copied from this skill's `scripts/` at topic start), `{{CHILDREN}}` (slug list), `{{NEIGHBOURS}}` (live pages that own nearby subjects, with ids), `{{TABS}}` (tab keys, part numbers and names), `{{READER_GOALS}}`, `{{BEFORE_AFTER_EXAMPLES}}` (three or four same-input animations this topic needs), `{{RUNNING_EXAMPLE}}`, `{{PINNED_SOURCES}}` (libraries and versions to quote), `{{ROOT_SCOPE}}`, `{{OLD_CONTENT}}`, `{{REFERENCE_BUILDS}}` (one or two recent root folders to copy look and checks from, for example `technical_knowledge_base/models_and_training/topic_generative_and_multimodal/src`), `{{MACHINE_MODE}}`, `{{DISK_GB}}`, `{{LAB_DATA_KB}}`, `{{DATE}}`.
- `{{text|n:<id>}}` and `{{text|#t-tab}}` (lower case, with a pipe) are the page link syntax: keep them literally.
- Pick ONE machine-mode block below (GPU topic, CPU only, or containers) and delete the others. Delete any section that does not apply rather than leaving it vague.
- The filled file contains the scratch path: it lives in the scratchpad plus a durable copy outside the repo, never in the repo.
- Keep it to what agents need. The skill files hold the method; this brief holds the topic's facts and the rules that must not be missed.

---

## Template

Repo: the technical_knowledge_base repository (your working directory's repo root). Topic: {{TOPIC_TITLE}}. Date: {{DATE}}.

READ FIRST: CLAUDE.md (no em-dashes anywhere: prose, HTML, captions, comments shown on the page); the explainer-page skill at `.claude/skills/explainer-page/`: SKILL.md, `teaching/page-quality.md`, `teaching/writing-style.md`, `evidence/sourcing.md` (every number sourced and dated; vendor claims and independent measurements kept apart), `evidence/local-runs.md`, `evidence/resource-safety.md`, `teaching/teaching-contract.md`, `visuals/choosing.md`, `visuals/animation-types.md`, `visuals/three-d.md`, `visuals/mechanics.md`, `build/scaffold.md`, `build/checks.md`, and the page-kind file for your page (`page-kinds/topic-root.md` for root tabs, `page-kinds/topic-child.md` for a child). The page-kind shapes are suggestions: depart where the content needs it and say why in `src/README.md`.

WORK IN SMALL STEPS, WAITING AND RESOURCE SAFETY (overrides everything): follow `evidence/resource-safety.md` in full: the guard (`sh {{TOOLS}}/guard.sh`) before every heavy step, capped threads at `nice -n 15`, one heavy process of yours at a time, the bench lock for any GPU work, the 600 s watchdog (small writes and reads), no sleep loops (hand back with a finishing list instead), kill only your own PIDs. Also:
- Never `uv run` inside the repo without `--no-project`. Never create temporary files inside `html_utils/`.
- Never write outside the scratchpad and the repo. Your scratch: `{{SCRATCH}}/{{PREFIX}}/<your key>/`.
- Run npm with `NPM_CONFIG_USERCONFIG` pointing at an empty file (the user's `~/.npmrc` holds a token).
- Depth is not capped (Khalid: "i need the info to be as complete as possible"); waste is. Before a run over about an hour, ask what the reader learns that the published number or a cheap toy does not (`evidence/local-runs.md`).

{{MACHINE_MODE}}: keep one of these three blocks.

(a) GPU TOPIC: GPU work only under the bench lock, gated on a successful acquire, one run at a time, as `evidence/resource-safety.md` says; pick a GPU nobody else is using (`nvidia-smi`, `CUDA_VISIBLE_DEVICES`).

(b) CPU ONLY (another topic owns the GPU): never take the bench lock or use a GPU. GPU-only steps are scripted as pending (`src/scripts/run_pending.sh`) and the page says what is pending (`evidence/local-runs.md`).

(c) CONTAINERS (Docker approved by Khalid for this topic): the container and cluster rules in `evidence/resource-safety.md` (prefix names, memory and CPU caps, cluster locks, never touch what you did not create).

DISK: the topic may use up to about {{DISK_GB}} GB in `{{SCRATCH}}/{{PREFIX}}`; downloads under the download lock, recorded in SETUP.md (URL, version or revision, sha256).

THE READER (most important; see `understand/reader.md`): Khalid is an ML/AI/research engineer interested in training models who wants to be really good at his job. For this topic he asked to be TAUGHT FROM ZERO. Goals: {{READER_GOALS}} (fill the four goals concretely for this topic: (1) build with it: ...; (2) understand the internals: ... read the source at pinned versions, quoted with file and line; (3) judge and debug: ... the real failure modes; (4) interviews and design: ... trade-offs he can explain). "Don't trust the current content": the old Notion pages are unverified notes. The goal is the deepest understanding in the least time: follow `teaching/teaching-contract.md` and `teaching/page-quality.md`. Before/after animations this topic needs: {{BEFORE_AFTER_EXAMPLES}}.

RUNNING EXAMPLE AND EVIDENCE (local only: no paid APIs, no API keys; public data and open models):
- Shared env `{{SCRATCH}}/{{PREFIX}}/venv` (Python 3.12 via uv; `UV_CACHE_DIR={{TOOLS}}/uvcache`), built by the setup agent; `{{SCRATCH}}/{{PREFIX}}/SETUP.md` ends with READY when usable.
- The running example, defined by the setup agent in the root's `src/data/README.md` (read it before writing): {{RUNNING_EXAMPLE}}. Every tab and child uses it, so comparisons share one input.
- Source read at pinned versions ({{PINNED_SOURCES}}), quoted with file and line located by pattern in a script. Shallow clones in `{{SCRATCH}}/{{PREFIX}}/src` under the download lock.
- Every number labelled as `evidence/sourcing.md` and `evidence/local-runs.md` say (published, derived, measured with the machine and what transfers, not run here).
- Code shown on the page is real code that ran (keep the script in `src/<key>/`), with its output pasted from the run.

PRIVACY: `build/checks.md`, Privacy (never the scratchpad path in the repo; grep before reporting).

THE ROOT: {{TOPIC_TITLE}} (Notion {{ROOT_ID}}; folder `{{ROOT_FOLDER}}`). It owns {{ROOT_SCOPE}} at overview depth. Root pages are comparisons plus definitions; depth lives on the approved child pages (folders exist with READMEs; ids in `technical_knowledge_base/pages.json` or pending): {{CHILDREN}}.
Live pages that OWN neighbouring subjects (link by id, never repeat them): {{NEIGHBOURS}}. Search `pages.json` for any others before writing.
Existing pages this topic replaces or folds: {{OLD_CONTENT}} (paths; their ledger units must survive, `page-kinds/migrate-or-fold.md`).

SHARED FACTS: `{{SCRATCH}}/{{PREFIX}}/FACTS.md`. Whoever first verifies a version, licence, default, API status, published number or date appends it with source URL and date under their key; everyone reads it before quoting and never contradicts it. Also copy your verified facts into your own `src/` notes (scratch is not durable).

SCAFFOLD AND FILE OWNERSHIP: the scaffold exists in the root's `src/`: `build.sh`, `parts/01_head.html` (shared CSS), `10_header.html` (tab bar), `21_js_rd_common.js` (Reading helpers; it registers redraws on t-read only, other tabs register their own `window.TAB_RENDER` hooks), placeholder tab parts {{TABS}}, `20_read_a.html`, `20_read_z.html`, `39_tab_more.html`; storage key `{{PREFIX}}-tab`. Reference builds for look and structure (read in ranges): {{REFERENCE_BUILDS}}. Link syntax: `{{text|n:<notion id>}}` and `{{text|#t-tab}}`. The page is one self-contained file with no network: everything inline except images, which are small WebP files in the page's `img/` folder (see `visuals/mechanics.md`). Prefix ids, classes and data attributes with your own prefix.
- Touch only your own files. Reading and Further reading: `parts/20_read*.html`, `2x_js_*.js` (not `21_js_rd_common.js`), `39_tab_more.html`; notes `src/read/`. Each lab: `parts/3N_*` and `src/<key>/`. `src/data/` is written by the setup agent and read-only for everyone else. Suggest changes to other files in your report.
- Replace your placeholder part (delete it) when you add your own parts; close every div you open; part names as `build/scaffold.md` says.
- Keep each tab's wrapper div; CSS scoped under the tab id; render on `window.TAB_RENDER['<tab id>']`; size charts from measured width; no clipping at 390 px; motion as `visuals/mechanics.md` says. At least one before/after animation on the same input per tab where it fits.
- Size: the whole root under about 1.5 MB, images included (lab data budget {{LAB_DATA_KB}} KB each if the lead sets one); no file over about 1 MB in the repo.

CHECKS BEFORE REPORTING: everything in `build/checks.md` (`bash src/build.sh`, then `checkpage.sh {{ROOT_FOLDER}}` from the repo root; failures in other agents' unfinished tabs may be reported as theirs). Record visuals built and rejected in `src/<key>/viz_ideas.md`.

REPORT (your final message; once, not repeated while you wait): what you built (tabs, labs, animations), runs made and where their recordings are, sources, check results, reading time, what is pending and how to run it, and suggestions for other tabs, `src/data/`, the Reading tab and FACTS.md. Do not commit, do not write to Notion, do not touch `pages.json`.

---
