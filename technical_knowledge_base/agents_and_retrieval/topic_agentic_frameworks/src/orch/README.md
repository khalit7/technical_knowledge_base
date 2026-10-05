# Orchestration lab (tab t-orch)

Parts: `parts/32_tab_orch.html` (HTML and scoped CSS), `parts/32_js_a_data.js` (generated data), `parts/32_js_b_lab.js` (helpers `window.OU`, pattern replay, results), `parts/32_js_c_dur.js` (durable execution), `parts/32_js_d_multi.js` (single agent against lead and subagents). Ids and classes are prefixed `orch-`; renders register in `window.TAB_RENDER['t-orch']`.

## What was run (5 October 2026, Claude Code 2.1.289, claude-haiku-4-5-20251001)
- `code/patterns.py`: Anthropic's five workflow patterns (chain, route, parallel, orch, evalopt) with the model called through `claude -p --tools ""` (text only) and all I/O done by the script, plus the free agent (`agent`) and the multi-agent run (`multi`). `code/lib.py` holds the model call, test runner, six hidden checks and the function merge.
- `code/lg_durable.py` and `code/lg_drive.py`: the chain as a LangGraph StateGraph with a SQLite checkpointer (langgraph 1.2.13, langgraph-checkpoint 4.2.0, langgraph-checkpoint-sqlite 3.1.1, langchain-core 1.6.6, Python 3.12, uv venv in the scratchpad), SIGKILL mid-node, resume, interrupt and approve, time-travel fork with an edited diagnosis, approve.
- The scripts are kept as run; their paths assume the scratchpad layout (`scratchpad/agents/task_repo`, `scratchpad/agents/recordings/aforch`), not this folder.
- 27 model invocations (one probe, 26 recorded). Six earlier attempts never reached the model: a prompt starting with `---` is parsed by the CLI as an option (fixed in `lib.py`).

## Pipeline
1. `python3 redact.py <scratchpad>/agents/recordings/aforch <scratchpad>/agents/aforch/work` writes `recordings/` (redacted: whitelisted init, labelled ids, no signatures or rate-limit events, paths to /work, account name to `user`, em-dashes to ", "; 23 replaced) and fails on any leak.
2. `python3 build_data.py` writes `parts/32_js_a_data.js` from `recordings/` only.
3. `sh build.sh`, then `python3 check_numbers.py <t-orch innerText dump>`: recomputes every total from the redacted result records, checks every recording is embedded and the prose quotes the same numbers (86 checks).

## Runs kept as lessons
- `agent_denied`: allow-list `Bash(python3:*)` only; haiku typed `python` three times, was denied, and finished without running the tests.
- `multi_ignored`: a softer delegation instruction; the model solved it alone, no subagents.

## Departures from the brief
- Quality is measured by six hidden checks derived from the docstrings (`recordings/baseline.json` has them and the unfixed result, 3 of 6), because every design passes the three visible tests.
- Temporal was not run; it is described from its docs and contrasted with the checkpointer.
