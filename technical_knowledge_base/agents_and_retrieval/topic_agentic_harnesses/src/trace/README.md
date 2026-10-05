# Trace and context lab (tab t-trace): notes

Owner files: `parts/32_tab_trace.html`, `parts/32_js_trc_a_data.js` (generated), `parts/32_js_trc_b_core.js`, `parts/32_js_trc_c_view.js`, `parts/32_js_trc_d_lab.js`, and this folder.

## Recordings
22 real Claude Code sessions, Claude Code 2.1.289, recorded 2026-10-05 on a Claude subscription (no API key) with
`claude -p "<task>" --output-format stream-json --verbose --include-partial-messages --no-session-persistence --setting-sources project --strict-mcp-config --model <haiku|sonnet> --permission-mode <acceptEdits|plan> --tools "Read,Edit,Write,Bash,Grep,Glob" --allowedTools "Bash(python3:*)" "Bash(python:*)" "Bash(ls:*)" "Bash(cat:*)" --append-system-prompt "Never use the em-dash character."`,
each in a fresh copy of the shared task repository (`textstats`, two planted bugs). Runs (see `runs.json`):
- standard task: Haiku x3, Sonnet x3; with a 4-line CLAUDE.md stating the test command: Haiku x3; plan mode: Haiku x1;
- harder task (add a CLI): Sonnet x1; standard task plus a 491 KB `ci.log` in the way: Haiku x1, Sonnet x1;
- asked to use a subagent (Agent tool added): Haiku x1; `DISABLE_PROMPT_CACHING=1`: Haiku x1; `CLAUDE_CODE_PROMPT_CACHE_TTL=5m`: Haiku x1;
- startup measurements, prompt "Reply with the single word OK.", `--max-turns 1`, Haiku: no tools, Read, the six tools, six with `--disable-slash-commands`, six plus Agent, `--tools default`.
24 claude invocations in all: one first attempt failed before reaching the API (empty prompt), and the first Haiku run was recorded again with `--include-partial-messages` to get per-call output counts. Raw files stay in the session scratchpad; the repo holds the redacted copies in `recordings/` (`<label>.jsonl` plus `<label>.meta.json`: post-run test output and diff).

## Pipeline
1. `redact.py RAW_DIR RUNS_DIR recordings`: task dir to `/work`, other scratch paths to `/scratch` or `/tmp/claude-task-output`, init record reduced to a whitelist, session ids, uuids, signatures and agent ids removed or relabelled, rate-limit events reduced to their status, stream content deltas dropped (message_start and message_delta usage kept), em-dashes (all from Claude Code's own tool messages, never from the model's text here) replaced by commas. Fails if a home path, the user name or a token prefix remains.
2. `extract.py` writes `parts/32_js_trc_a_data.js` (per run: init facts, result totals from `modelUsage`, per-call usage and answering model, events with long tool results cut for the page).
3. `check_prose.py` regenerates the data and proves it identical, checks every hand-written number in the tab against the data, and scans all tab files for private strings and em-dashes.

## Findings worth carrying to the Reading tab or siblings
- `total_cost_usd` reproduces exactly from per-call usage and the list prices (1-hour writes at 2x) in 21 of 22 runs. The exception is the subagent run: `result.usage` and the stream omit the subagent's calls; `result.modelUsage` includes them.
- Plan mode with `--model haiku` was answered entirely by `claude-sonnet-5-5` (observed; not documented in the pages read).
- `DISABLE_PROMPT_CACHING=1` did not disable caching on 2.1.289 (writes became 5-minute); `CLAUDE_CODE_PROMPT_CACHE_TTL=5m` works as documented.
- The startup context is 13,242 tokens for Haiku with six tools against 7,233 for Sonnet 5.5 with the same tools; the stream cannot show why.
- Permission layer in acceptEdits: refuses `sed -i` ("potentially dangerous"), several `cd` in one command, and subshell wrappers, even when the command starts with an allowed prefix.

## Departures from the brief
- Compaction was not triggered in any recording (windows of 200K and 1M were never approached; `--autocompact` has a 100K minimum, so a forced compaction would need a session of 100K+ tokens). The compaction animation uses real per-call growth with an illustrative toy window and summary size, labelled as such.
- The "without caching" side of the caching animation is derived (same tokens, all billed as fresh input), because no switch disabled caching.
