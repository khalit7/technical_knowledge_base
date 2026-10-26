# Source of "Python: typing, uv, packaging and the toolchain"

Child page 4 of Python: the essentials (page prefix `tk`, storage key `pytk-tab`). Built 2026-10-26 by splitting the Python language page (plan: section 1, child 4). Editing only: no new runs; every command, output and timing was recorded on 2026-10-05 (Apple M1 Pro, macOS 27) by the language page's Part 1 and Part 2 agents.

## Build
`sh build.sh` writes `../index.html` from `parts/` (the skill template, unchanged). Two parts are generated, never edited by hand:
- `parts/20_read_b.html` (section 1, typing) by `python3 pa/gen.py` from `pa/tpl/20_read_b.html`, inlining `pa/code/t1_types.py` and `pa/outputs/t1_*.txt`;
- `parts/22_js_rd_0data.js` (`window.PB`) by `python3 pb/build_data.py` from `pb/out/`.
Order: `python3 pa/gen.py && python3 pb/build_data.py && sh build.sh`.

## Provenance (copied with `cp`, never moved, from `../src/` of the language page, which other agents also read)
| Here | From | Trimmed |
|---|---|---|
| `pa/code/t1_types.py`, `pa/outputs/t1_*.txt`, `pa/versions.txt` | `src/pa/` | only the typing file and its three outputs |
| `pa/gen.py`, `pa/run_all.sh` | `src/pa/` | dataset parsers removed; run script reduced to t1 |
| `pb/uvwalk`, `pb/ruff`, `pb/pytest`, `pb/types`, `pb/pack/{wheels.py,install_speed.sh}`, `pb/env.sh`, `pb/versions.txt` | `src/pb/` | unchanged |
| `pb/out/{uv,ruff,pytest}.txt`, `types.json`, `typespeed.json`, `install_speed.json`, `wheels.json` | `src/pb/out/` | only this page's outputs |
| `pb/build_data.py`, `pb/check_embed.py`, `pb/run_all.sh` | `src/pb/` | reduced to the toolchain keys; data now goes to `parts/22_js_rd_0data.js` |
| `parts/22_js_rd_1util.js`, `23_js_rd_tools.js`, `24_js_rd_wheels.js` | `parts/41_js_pb_util.js`, `42_js_pb_read_a.js`, `42_js_pb_read_b.js` | tab id `t-read`; runtime summary cells and the two script-written speed notes removed (now static text) |
No path in the copied scripts climbs above `src/` (they use `env.sh` and `$WORK`), so none needed a depth fix. `pb/run_all.sh` reruns everything in about 5 minutes with the scratch toolchain named in `env.sh` and network access.

## Shape and departures
- Top: the core sentence, a static hero (who reads the hints; the four layers with uv's column and the three files), "You need", new terms; the old "In one screen" toolchain table is a closed reference block.
- Visuals inline beside their claims: the five-mistakes grid with a prediction first (section 1, new, static, from the three recorded outputs); the eight-case checker picker and grid plus the speed bars (2); the uv three-files stepper (4, never autoplays: `RD.anim` from the template); install bars (4); ruff and pytest predictions with real terminals (5, 6); the wheel-name decoder and a three-step trusted-publishing flow (7, the flow is new).
- No lab tabs: the plan listed none for this child.
- Closed: glossary and older tools, uv's one-line feature table with every transcript, ruff fixes and config, the pytest file and runs, mistakes lists, abi3t tool support, what `uv build` makes, corrections and old claims.
- Sent to owners with one line and a link: what to test and CI (Testing and quality); library design, `py.typed` (PEP 561), pydantic `model_construct`, pre-commit (Code design, decision 18 of 2026-10-26); free-threading and the GIL in extensions (the concurrency sibling); 3.12 to 3.15 changes (the internals sibling).

## Length judgement
Before (inside the language page): Part 1 section 6 plus Part 2 sections 0 to 6, about 26 min of Reading, all open. After: 18.9 min core, 14.8 min in closed details (`node html_utils/audit_pages.mjs`, 230 words a minute); the core counts the real terminal outputs the visuals show. Longer than the plan's estimate of 15 min because the core keeps eight tools each with its measured evidence; what the reader can look up (feature tables, transcripts, configs, mistake lists) is closed, and the remaining core units are all labelled core in the ledger.

## Ledger
`ledger.json` (201 units: core 139, depth 61, fat 1; `python3 ../../../../../../html_utils/ledger.py check` from the repo root reports problems 0). Labels are drafted by `label_ledger.py` (depth when the text sits only inside a closed block). `from_master.json`: 183 units of the language page's master ledger: 172 owned here, 1 owned by the internals sibling (3.15's UTF-8 default, key `encoding=`), 10 fat (part intros, routes, navs, pointers).

## Checks
`sh html_utils/checkpage.sh <page>` (fail=0, emdash 0, errbox 1, clipped 0); `node src/check_controls.mjs index.html` from the page (every drill, chip and stepper step, 390 dark and 920 light, nothing moves before the reader acts); `python3 src/check_numbers.py` (every static number against `pb/out` and `pa/outputs`, and the embedded data against the outputs).
