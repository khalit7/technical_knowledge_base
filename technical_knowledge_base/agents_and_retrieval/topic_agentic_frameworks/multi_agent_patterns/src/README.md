# src: Multi-agent patterns

Builds `../index.html` (one self-contained page). Child of Topic: agentic-frameworks (`../../src/` is the parent's source; its Reading section 5 and Orchestration lab part "One agent or several" are this page's starting point and are linked, not repeated).

## Tabs
- **Reading** (`parts/20_read_*.html`, JS `21_*` to `34_*`, scenes `40_*` to `43_*`): the idea in one screen (core sentence, Fig. 1 with its step list, you need), section 1 (terms), sections 2 to 11, then closed depth. Every number in prose is a `<span class="fm-v" data-v="key">` filled from the data by `22_js_fm_common.js` (and a few keys by the section scripts), so the text cannot drift from the recordings.
- **Audit lab** (`33_tab_audit.html`, `33_js_audit.js`): every audit run (a run explorer used by sections 3, 4, 5 and 9, so it stays a tab).
- **Further reading** (`39_tab_more.html`).

## The 2026-11-06 pass: split layout, four 3D stages (renderer v2), explained and autoplaying animations
- **Split layout** (`parts/02_split.html`, template, after `01_head.html` in `build.sh`; `build.sh` now also closes the `.w` wrapper). Split: the idea (Fig. 1 beside the core sentence and its step list), 3 (Fig. 2), 3 again (the lanes widget beside its paragraph), 5 (check-round bars), 6 (Fig. 3 with the request viewer under its step lists), 7 (the two halves viewer), 8 (Fig. 4) and 8 again (the accuracy against tokens scatter beside "How to read it"), 9 (cost bars), 10 (MAST bars), and the Audit lab (notes and how the runs were made left, run picker, stats, lanes and per-run detail right; the found/missed matrix full width under both). Full width: 1 (terms and the two families), 2 (a table), 4 (text; its visual is Fig. 2 step 5), 11, Depth, the wide results tables, Further reading unchanged.
- **Four 3D stages** (`25_js_s3.js` v2, unchanged; scenes `40` to `43`), all on the page's own data:
  - Fig. 1 (`40_js_sc_map.js`, replaces the 2D hero `30_js_hero.js` and the pattern picker `23_js_patterns.js`, both deleted): the hero's two questions became the floor (columns: your code, a model, nobody decides; rows: each loop sees only its slice, or a shared history or store) and each of the nine patterns stands in its cell as a small machine (blue model loops, gold code slabs, a green store, glass contexts). Ten steps: the map, then the camera moves in on each pattern with flows for what goes out (briefs, slices, transfers) and what comes back (reports, results), then the map coloured by each pattern's measured result (computed as the old hero did, now `map.*` prose values). The picker's per-pattern text (who decides, who sees, cost shape, examples, measured here) is now the step list.
  - Fig. 2 (`41_js_sc_aud.js`): the audit on one token scale (1 unit = 100,000): the module text (measured from the fan-out prompts) as a pile of 48 equal slabs against Haiku 4.5's 200,000-token window, then each loop's largest context in run 1 of one agent (with the 24 partly read modules pale), Sonnet 5.5, lead + 6, fan-out and blackboard (with the modules each agent claimed, from `claims`).
  - Fig. 3 (`42_js_sc_ho.js`, now drives section 6): run 1 of handoff, mesh and agents as tools, one step per recorded request (3, 3, 6): a slab per message on the agent it was sent to, the history flowing with a handoff, the ignored second transfer, generated inputs and results with agents as tools, tool calls lit, the refund never called. `26_js_handoff.js` keeps the summary table and becomes the request viewer (`FMHO.show`), called on every step; its caption logic moved into the three step lists.
  - Fig. 4 (`43_js_sc_deb.js`): the 30 puzzles as a field, one column per puzzle and one row per call or method (tall green right, flat red wrong): five samples, the votes of 3 and 5, the three solvers after the debate round (the 23 answers that changed, all wrong to right, lit, with flows from the solutions each solver read), the debate majority, the judge. The section's "What happened" paragraph became its five steps.
- **Long replay turned widget**: the section 3 lanes replay (48 frames) no longer animates by itself (`auto:false`); it opens on the finished run and moves only when the reader moves it. Fig. 2 carries the same runs as six explained steps.
- **Kept 2D**: the lanes (a timeline), the check-round bars, cost bars and MAST bars (numbers on an axis), the accuracy against tokens scatter, the two halves viewer and the request viewer (text and code), the Audit lab (a dataset view).
- **Motion**: `21_js_rd_common.js` and `99_js_tabs.js` are the templates (key `fmulti-tab`); stages play once at least half in view, pause off screen, stop on any control or at the last step, never move under reduced motion.
- **Checks**: new `check_stages.mjs` (every stage plays in view at 1400, 920 and 390 px, steps to its end in every mode with one list item per step, flows stop off screen, nothing moves under reduced motion, the lanes widget never plays by itself, the splits are two columns at 1400, no unfilled prose value); `check_controls.mjs` never-autoplay assertion inverted (stages play, the lanes widget stays on its last frame) and the remembered tab cleared between widths; `check.py` unchanged (33 values, 0 problems; the dump now has 96 `.fm-v` spans, the new ones being step-list numbers filled by the scenes).
- **Ledger**: units 16, 32, 56, 133, 360, 361 and 363 re-keyed to the new wording (the picker legend became the Fig. 1 legend; the picker content became the step list); counts unchanged.
- **Length**: Reading core 27.2 min before, 32.5 after (6,245 to 7,465 words); closed details 14.4, unchanged; Audit lab 4.1 to 4.3; Further reading 3.6, unchanged. Most of the growth is text that was drawn by script before and so invisible to the word count (the picker's per-pattern panels, the handoff stepper's captions), now the step lists of Figs. 1 and 3; the rest is the step lists of Figs. 2 and 4, which carry the numbers each step draws. The section 8 "What happened" paragraph was cut against Fig. 4's list, and the step lists were written short. Header now says 32 min.
- **Real images**: none. The page is about software patterns; its real artefacts are the recordings, which the stages and viewers draw.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only; no new runs.
- **Top**: the core idea in one sentence; a new hero (`30_js_hero.js`, static annotated diagram) placing every pattern by who decides and what each loop sees, coloured by what it did here, with results computed from the recordings; "You need"; a new-terms list (the definitions that section 1 used to carry in prose). The old "In one screen" table is a closed block under the hero, which now carries the same map.
- **Visuals inline**: unchanged ones stay beside their claims (pattern picker, lanes replay, check-round bars, handoff stepper, two-halves viewer, debate scatter, accounting bars). New: the MAST failure modes drawn to scale in section 10 (`30_js_mast.js`; shares from arXiv 2503.13657 v3 Figure 1, checked 2026-10-24). The Debate lab tab explained one mechanism, so it is now a closed block under the section 8 chart (`34_js_debate.js` unchanged, CSS rescoped to `#fmd-lab`).
- **Concrete first in section 9**: the measured bill comes before the formula; prices are a closed block.
- **Closed depth**: the predict-then-reveal drills (now real `<details>`), the turn-cap note, the cache explanation of fan-out costs, blackboard history, why the board drifted, the SDK docstring quotes, what sibling pages measured about handoffs, the full evidence table and the dropped swarm claim, the framework mapping, three mistakes, four interview questions, the old-page claim table.
- **Deleted as fat**: six mistakes and four interview answers that restated a section, wind-ups, nav and tab-bar strings.
- **No autoplay** (superseded on 2026-11-06, see above): `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `fmulti-tab`); the lanes replay opens on its last frame as a still and moves only on input. The Audit lab registers its own render hook, since the template's `RD.anim` and `RD.onRender` serve the Reading tab only.
- **Links**: "Agent memory layers" (id `3f15c17b...8170`) is now an alias of Context engineering; the card points at that page's section 8.
- `check_controls.mjs` (new) clicks every control in both themes and widths and fails if anything plays before input.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 34 min | 26 min |
| Reading, closed details | 3 min | 14 min |
| Other tabs, core | Audit lab 4 + Debate lab 4 + Further reading 3.4 = 12 min | Audit lab 4 + Further reading 3.5 = 8 min |
| SVG visuals drawn in Reading (`audit_pages.mjs`) | 3 | 5 (plus four HTML visuals the audit does not count: check-round bars, handoff stepper, two-halves viewer, accounting bars) |

Why 26 minutes is right: the core carries eight measured experiments, each a claim, its picture and its numbers, plus the published evidence that frames them; every core unit in the ledger is needed to judge when several agents help. About a fifth of the core words are the captions, tables and code panes of the visuals. What made the old page long (restated mistakes and interview answers, provenance tables, the per-puzzle lab, quotes and history) is now closed or cut.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
365 units: core 248, depth 69, fat 48. 350 were drafted by `ledger.py init`; 15 were added by hand for evidence-table rows the draft merged, script-rendered visuals and the MAST figure. Fat units carry a `note` saying why.

## Pipeline
1. Experiments ran in the scratchpad with the scripts in `code/` (kept as run; their paths assume the scratchpad layout `scratchpad/agents/fmulti/`, `scratchpad/agents/task_repo`, and the frameworks venv `scratchpad/agents/afsame/fwenv`):
   - `gen_audit.py` (corpus, seed 20261006, 48 modules, 1,440 public functions, 16 planted violations; answer key in `inputs/audit_truth.json`, never in the agent's folder), `run_audit.py` (designs: single, multi, fanout, board, boardv, boardb, checkblind, checkshown, boardsharp).
   - `run_write.py` (pinned spec) and `run_write_open.py` (open spec): single, parallel, contract.
   - `gen_puzzles.py` (seed 9, nine people, unique solutions by brute force; `inputs/puzzles9.json`) and `run_debate.py` (phases r1, r2, judge on the first 30 puzzles).
   - `handoffs.py`: openai-agents 0.23.1 against the shared local mlx_lm.server (Qwen3-4B-Instruct-2507 4-bit) through `scratchpad/agents/mlx_call.py proxy` (locked, logged).
   - `cc.py`: the one `claude -p` wrapper every Claude run used (stream-json, `--no-session-persistence --setting-sources project --strict-mcp-config`, an appended "Never use the em-dash character.").
2. `python3 code/redact.py <scratchpad>/agents/fmulti <this folder>/recordings` writes `recordings/` as gzipped JSONL (`*.jsonl.gz`, read with `gzip.open`; whitelisted init records, short labels for ids, no signatures or rate-limit events, paths to `/work`, git identity and e-mail addresses removed, em-dashes replaced by ", "; module text the model read or was pasted is replaced by a size placeholder because `gen_audit.py` regenerates it exactly) and fails on any leak. Calibration runs (`calib*`) are not copied.
3. `python3 build_data.py` writes `parts/20_js_data.js` from `recordings/` (and the parent's `../../src/orch/recordings/{agent,multi}/summary.json`) only.
4. `sh build.sh`; `node src/check_controls.mjs index.html` and `node src/check_stages.mjs` from the repository root; then dump the rendered page's prose values (`.fm-v` spans) to a JSON list of [key, text] and run `python3 check.py <that file>`: it recomputes 33 quoted values from the recordings independently of `build_data.py` and the page's JavaScript, checks the static summary rows, and checks that every recording folder is embedded and nothing else.

## Departures and caveats
- One model (Claude Haiku 4.5) for every Claude comparison, plus one Sonnet 5.5 single-agent run; small numbers of runs (2 to 3 per design), every run listed.
- Several experiments ran at once on one subscription while other agents used it: wall times include queueing.
- The audit generator adds "Raises ValueError on malformed input." to some docstrings without code that raises, and some functions promise a fraction in [0, 1] from `hits / total` with no check. Some runs reported these. The page reports recall against the 16 planted violations and classifies other reports by reason (keyword rules in `build_data.py`, spot-checked by reading the reasons), rather than calling them false.
- The first hidden check of the open-spec write task rejected a card that printed the top word in quotes; all nine runs were re-checked with the corrected check (the original verdicts are kept in each `summary.json` as `check_original`).
- Handoff runs use a local 4B model, never compared with Claude.
- Prompt caching crosses runs: fan-out runs 2 and 3 re-sent run 1's prompts within the hour and paid cache-read prices; the page says so and quotes run 1 alone.
- Page size about 430 KB (data about 280 KB): accepted, as the methods allow, because the labs show every recorded run.

## Update pass 2026-10-26 (update-kb)
Core 26.1 to 26.9 min (header 27). Anthropic's "when to fold subagents into your main agent loop" (22 Oct 2026, quotes checked against the article on 26 Oct) added to section 10 as the owner of that guidance (Context engineering links here), with a matching clause in section 11's first question. `check.py` needs the `.fm-v` values dumped from the rendered page as `[key, text]` pairs; 33 values, 0 problems after the edit.

2026-10-26 (final follow-up sweep): the MAST paragraph names reasoning-action mismatch (13.2%, the largest inter-agent mode) in prose, since Emergence World cites this page for the term; it was only a chart label.
