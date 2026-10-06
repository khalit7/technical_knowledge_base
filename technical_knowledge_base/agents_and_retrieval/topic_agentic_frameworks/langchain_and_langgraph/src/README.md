# Source for the LangChain and LangGraph page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, then every `*.js` part in its own script, `99_js_tabs.js` last).

## Parts
- `01_head.html` shared CSS (from the context_engineering sibling), `10_header.html` title and tab bar, `05z_errbox.js.html` error box.
- Reading: `20_read_a.html` (wrapper, CSS, nav, s0, s1), `20_read_b.html` (s2, s3), `20_read_c.html` (s4, s5), `20_read_d.html` (s6 to s8), `20_read_e.html` (s9), `20_read_f.html` (s10 to s12), `20_read_g.html` (mistakes, interview, footer; closes the tab).
- JS: `21_js_rd_common.js` (RD helpers and the step-animation controller), `22_js_data.js` (generated: window.FLG), `23_js_flg_graph.js` (graph drawer and the super-step player), `24_js_flg_lanes.js` (process lanes, storage chart), `25_js_flg_read.js` and `26_js_flg_agent.js` (Reading), `31_*` Super-step lab, `32_*` Crash lab, `39_tab_more.html` Further reading, `99_js_tabs.js`.

## Data pipeline
1. Experiments (scripts as run in `code/`; they ran from a scratchpad folder with their own uv venv: langgraph 1.2.14, langchain 1.4.3, langchain-core 1.6.7, langgraph-checkpoint 4.2.0, langgraph-checkpoint-sqlite 3.1.1, langgraph-checkpoint-postgres 3.1.2, langchain-openai 1.6.7, psycopg 3.3.6, Python 3.12):
   - `e1_supersteps.py` seven graphs with no model (stream_mode tasks + raw checkpoints); `e1b_checks.py` repair of the stuck thread and compile checks.
   - `e2_crash.py` SIGKILL mid parallel step under sync, async and exit, an exception instead of a kill, and per-step overhead of each durability mode.
   - `e3_storage.py` stored bytes per super-step over 40 agent-shaped steps, add_messages against DeltaChannel, SQLite and Postgres 16 (Docker container `flg-pg`, `--rm`, stopped after the run).
   - `e4_interrupts.py` nine interrupt cases; `e5_more.py` streaming modes, subgraphs, Command.PARENT handoff, the store, the functional API.
   - `e6_real.py` the running example with Claude Haiku 4.5 through `claude -p` (Claude Code 2.1.291, tools off, `--setting-sources project --strict-mcp-config --no-session-persistence`), killed and resumed: scenario A sync, B exit. 9 model calls.
   - `e7_agent.py` create_agent with HumanInTheLoopMiddleware and ModelCallLimitMiddleware on the local Qwen3-4B-Instruct-2507 4-bit (mlx-lm 0.32.0, shared server on 127.0.0.1:8090, every request under the shared `mlx_request.lock`), reviewer approve_all and check_path. 14 model requests.
2. `python3 redact.py <scratchpad>/agents` copies results into `data/` and recordings into `recordings/e6/` (whitelisted init record, labelled message ids, signatures, uuids, session ids and rate-limit events dropped, paths to /work, e-mail addresses and the login name scrubbed, em-dashes to ", " (none occurred)); it fails on any leak.
3. `python3 extract.py` writes `parts/22_js_data.js` from `data/` and `recordings/` only.
4. `sh build.sh`, then `python3 check_page.py`: data part regenerates identically and is embedded; every recording's result text, tokens and cost appear once; each cost reproduces as input x $1 + output x $5 per MTok (Haiku 4.5 list price, no cache use); prose numbers match data; no em-dash or private string anywhere in the folder.

## Inputs
- `live.md` the old Notion page (fetched read-only 2026-10-06; same as the parent's saved copy). `coverage.json` maps every old claim.
- `inputs/research.md` primary-source checks of the old page and history (by a research helper, 2026-10-06).
- `inputs/version_diffs.json` default recursion limit and feature presence in the 0.6.11, 1.0.0, 1.1.0 and 1.2.0 wheels.

## Departures from the method
- The child-page method suggests real model data where possible: here most mechanism experiments deliberately use no model, because exact, repeatable traces of the runtime teach the mechanism better than a model's variance; real model calls are used where cost and loss matter (Crash lab) and for create_agent (local model).
- No `recompute.py`: the page shows no fitted or derived defaults; `check_page.py` does the recomputation that exists (cost from tokens and list prices, prose against data).
