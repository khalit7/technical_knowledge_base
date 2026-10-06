# src: Multi-agent patterns

Builds `../index.html` (one self-contained page). Child of Topic: agentic-frameworks (`../../src/` is the parent's source; its Reading section 5 and Orchestration lab part "One agent or several" are this page's starting point and are linked, not repeated).

## Tabs
- **Reading** (`parts/20_read_*.html`, JS `22_*` to `29_*`): sections 0 to 12. Every number in prose is a `<span class="fm-v" data-v="key">` filled from the data by `22_js_fm_common.js` (and a few keys by the section scripts), so the text cannot drift from the recordings.
- **Audit lab** (`33_tab_audit.html`, `33_js_audit.js`): every audit run.
- **Debate lab** (`34_tab_debate.html`, `34_js_debate.js`, methods in `28_js_debate_core.js`).
- **Further reading** (`39_tab_more.html`).

## Pipeline
1. Experiments ran in the scratchpad with the scripts in `code/` (kept as run; their paths assume the scratchpad layout `scratchpad/agents/fmulti/`, `scratchpad/agents/task_repo`, and the frameworks venv `scratchpad/agents/afsame/fwenv`):
   - `gen_audit.py` (corpus, seed 20261006, 48 modules, 1,440 public functions, 16 planted violations; answer key in `inputs/audit_truth.json`, never in the agent's folder), `run_audit.py` (designs: single, multi, fanout, board, boardv, boardb, checkblind, checkshown, boardsharp).
   - `run_write.py` (pinned spec) and `run_write_open.py` (open spec): single, parallel, contract.
   - `gen_puzzles.py` (seed 9, nine people, unique solutions by brute force; `inputs/puzzles9.json`) and `run_debate.py` (phases r1, r2, judge on the first 30 puzzles).
   - `handoffs.py`: openai-agents 0.23.1 against the shared local mlx_lm.server (Qwen3-4B-Instruct-2507 4-bit) through `scratchpad/agents/mlx_call.py proxy` (locked, logged).
   - `cc.py`: the one `claude -p` wrapper every Claude run used (stream-json, `--no-session-persistence --setting-sources project --strict-mcp-config`, an appended "Never use the em-dash character.").
2. `python3 code/redact.py <scratchpad>/agents/fmulti <this folder>/recordings` writes `recordings/` as gzipped JSONL (`*.jsonl.gz`, read with `gzip.open`; whitelisted init records, short labels for ids, no signatures or rate-limit events, paths to `/work`, git identity and e-mail addresses removed, em-dashes replaced by ", "; module text the model read or was pasted is replaced by a size placeholder because `gen_audit.py` regenerates it exactly) and fails on any leak. Calibration runs (`calib*`) are not copied.
3. `python3 build_data.py` writes `parts/20_js_data.js` from `recordings/` (and the parent's `../../src/orch/recordings/{agent,multi}/summary.json`) only.
4. `sh build.sh`; then dump the rendered page's prose values (`.fm-v` spans) to a JSON list of [key, text] and run `python3 check.py <that file>`: it recomputes 33 quoted values from the recordings independently of `build_data.py` and the page's JavaScript, checks the static summary rows, and checks that every recording folder is embedded and nothing else.

## Departures and caveats
- One model (Claude Haiku 4.5) for every Claude comparison, plus one Sonnet 5.5 single-agent run; small numbers of runs (2 to 3 per design), every run listed.
- Several experiments ran at once on one subscription while other agents used it: wall times include queueing.
- The audit generator adds "Raises ValueError on malformed input." to some docstrings without code that raises, and some functions promise a fraction in [0, 1] from `hits / total` with no check. Some runs reported these. The page reports recall against the 16 planted violations and classifies other reports by reason (keyword rules in `build_data.py`, spot-checked by reading the reasons), rather than calling them false.
- The first hidden check of the open-spec write task rejected a card that printed the top word in quotes; all nine runs were re-checked with the corrected check (the original verdicts are kept in each `summary.json` as `check_original`).
- Handoff runs use a local 4B model, never compared with Claude.
- Prompt caching crosses runs: fan-out runs 2 and 3 re-sent run 1's prompts within the hour and paid cache-read prices; the page says so and quotes run 1 alone.
- Page size about 430 KB (data about 280 KB): accepted, as the methods allow, because the labs show every recorded run.
