# Source for the LangChain and LangGraph page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, then every `*.js` part in its own script, `99_js_tabs.js` last).

## Parts
- `01_head.html` shared CSS (from the context_engineering sibling), `10_header.html` title and tab bar, `05z_errbox.js.html` error box.
- Reading: `20_read_a.html` (CSS, nav, the core idea, hero, new terms, findings; s1 LangChain), `20_read_b.html` (s2, s3 with the super-step player), `20_read_c.html` (s4, s5 with the crash replay), `20_read_d.html` (s6 to s8), `20_read_e.html` (s9), `20_read_f.html` (s10 to s12), `20_read_g.html` (closed depth: dated table, mistakes, interview; footer; closes the tab).
- JS: `21_js_rd_common.js` and `99_js_tabs.js` (the explainer-page templates, storage key `flg-tab`; nothing plays before the reader acts), `22_js_data.js` (generated: window.FLG), `23_js_flg_graph.js` (graph drawer and the super-step player), `24_js_flg_lanes.js` (process lanes, storage chart), `25_js_flg_read.js` and `26_js_flg_agent.js` (Reading), `27_js_flg_lc.js` (hero figure, section 1), `28_js_flg_steps.js` (section 3 player, formerly the Super-step lab), `29_js_flg_crash.js` (section 5 replay, formerly the Crash lab), `39_tab_more.html` Further reading.

## Data pipeline
1. Experiments (scripts as run in `code/`; they ran from a scratchpad folder with their own uv venv: langgraph 1.2.14, langchain 1.4.3, langchain-core 1.6.7, langgraph-checkpoint 4.2.0, langgraph-checkpoint-sqlite 3.1.1, langgraph-checkpoint-postgres 3.1.2, langchain-openai 1.6.7, psycopg 3.3.6, Python 3.12):
   - `e1_supersteps.py` seven graphs with no model (stream_mode tasks + raw checkpoints); `e1b_checks.py` repair of the stuck thread and compile checks.
   - `e2_crash.py` SIGKILL mid parallel step under sync, async and exit, an exception instead of a kill, and per-step overhead of each durability mode.
   - `e3_storage.py` stored bytes per super-step over 40 agent-shaped steps, add_messages against DeltaChannel, SQLite and Postgres 16 (Docker container `flg-pg`, `--rm`, stopped after the run).
   - `e4_interrupts.py` nine interrupt cases; `e5_more.py` streaming modes, subgraphs, Command.PARENT handoff, the store, the functional API.
   - `e6_real.py` the running example with Claude Haiku 4.5 through `claude -p` (Claude Code 2.1.291, tools off, `--setting-sources project --strict-mcp-config --no-session-persistence`), killed and resumed: scenario A sync, B exit. 9 model calls.
   - `e8_lcel.py` (added 2026-10-24, no model, seconds): LangChain's Runnables, one `prompt | model | parser` call with a fake model, the `@tool` schema, a retriever over fake embeddings, stack frames and microseconds per call against plain functions, which legacy imports moved. Run in a scratch uv venv: langchain-core 1.6.7, langchain 1.4.3, langchain-classic 1.0.8, numpy; output copied to `data/e8_lcel.json`.
   - `e7_agent.py` create_agent with HumanInTheLoopMiddleware and ModelCallLimitMiddleware on the local Qwen3-4B-Instruct-2507 4-bit (mlx-lm 0.32.0, shared server on 127.0.0.1:8090, every request under the shared `mlx_request.lock`), reviewer approve_all and check_path. 14 model requests.
2. `python3 redact.py <scratchpad>/agents` copies results into `data/` and recordings into `recordings/e6/` (whitelisted init record, labelled message ids, signatures, uuids, session ids and rate-limit events dropped, paths to /work, e-mail addresses and the login name scrubbed, em-dashes to ", " (none occurred)); it fails on any leak.
3. `python3 extract.py` writes `parts/22_js_data.js` from `data/` and `recordings/` only.
4. `sh build.sh`, then `python3 check_page.py` and, from the repository root, `node <page>/src/check_controls.mjs <page>/index.html` (every control at 390 dark and 920 light, no autoplay, card screenshots into `.shots/`). `check_page.py`: data part regenerates identically and is embedded; every recording's result text, tokens and cost appear once; each cost reproduces as input x $1 + output x $5 per MTok (Haiku 4.5 list price, no cache use); prose numbers match data; no em-dash or private string anywhere in the folder.

## Inputs
- `live.md` the old Notion page (fetched read-only 2026-10-06; same as the parent's saved copy). `coverage.json` maps every old claim.
- `inputs/research.md` primary-source checks of the old page and history (by a research helper, 2026-10-06).
- `inputs/version_diffs.json` default recursion limit and feature presence in the 0.6.11, 1.0.0, 1.1.0 and 1.2.0 wheels.

## Departures from the method
- The child-page method suggests real model data where possible: here most mechanism experiments deliberately use no model, because exact, repeatable traces of the runtime teach the mechanism better than a model's variance; real model calls are used where cost and loss matter (Crash lab) and for create_agent (local model).
- No `recompute.py`: the page shows no fitted or derived defaults; `check_page.py` does the recomputation that exists (cost from tokens and list prices, prose against data).

## Rebuild to the teaching contract (2026-10-24)
What changed and why:
- **Top**: the core idea in one sentence and a hero figure (`#flg-hero`, static SVG at the measured width: LangChain over StateGraph over the plan/execute/update loop, pending writes and checkpoints into the checkpointer, resume back to plan); "You need"; the old "in one screen" table became the new-terms table (term, what it is and why, section).
- **Section 1 rewritten** around what the page owns but barely taught: LangChain's Runnable interface, LCEL, the model, tool and retriever abstractions, and what they cost, measured (`e8_lcel.py`): one `prompt | model | parser` call drawn stage by stage with the real values, the `@tool` schema, a retriever, 0.2 ms and 6 against 2 stack frames per call. The release chronicle, funding, downloads, adoption and pricing moved to one closed dated table (volatile).
- **Lab tabs moved inline**: the Super-step lab's seven-graph player replaced the two-graph reducer card in section 3 (versions_seen and the per-graph table in closed blocks); the Crash lab's replay replaced the static two-run lanes in section 5 (every call, the database at the kill and the recording notes in closed blocks). Each explained one mechanism, so it belongs beside the claim. Tabs now: Reading, Further reading.
- **Predictions before widgets** (fan-out order, the join count, calls started with exit, e-mails sent); the crash answer is stated under the card.
- **Section 12** now opens with a comparison table (need, what a plain loop makes you build, what LangGraph gives), the "when a graph beats a plain loop" judgement this page owns; criticisms follow, with the measured cost of what is left of the abstraction tax.
- Mistakes became a closed one-line checklist (each is taught in a section); interview questions stay closed.
- Agent memory layers: the old page merged into Context engineering (same id now resolves there); section 10 and Further reading name Context engineering, section 8, and the Mem0 ADD-only finding is left to it (ledger `owned:`).
- Templates: `21_js_rd_common.js` and `99_js_tabs.js` replaced by the skill's (the old controller autoplayed once in view). SVG labels raised to 10.5 px or more.

Length: Reading core 32 min before (plus 6 closed, plus 7 in two lab tabs) and 32 min after (plus 10 closed, no lab tabs). The core absorbed the two labs' explanations and a new LangChain section the page owned but lacked, while the chronicle, adoption, built-in middleware list, schemas, mistakes and calls tables moved to closed blocks. Every remaining core paragraph carries a mechanism or a measured result that the sections after it depend on; the ledger has 224 core units and only 33 fat, so this is a dense page rather than a padded one, and the right length.

Ledger (`src/ledger.json`, `python3 html_utils/ledger.py check` problems 0): 329 units: core 224, depth 49, volatile 22 (all in the dated table on this page), owned 1 (Context engineering), fat 33; units 322 to 329 were added by hand for script-rendered tables.
