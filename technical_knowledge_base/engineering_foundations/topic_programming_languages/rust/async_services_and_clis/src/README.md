# Source of "Rust: async with tokio, services with axum, and CLIs"

Child page 4 of Rust: the essentials (page prefix `rs`, storage key `rsasync-tab`), section 3 child 4 of the language split plan. Built 2026-10-26 by splitting the Rust page's Part 3; no new measurements were run (every recording is from 2026-10-05, Apple M1 Pro).

## Build
`python3 rs/gen.py` (writes `parts/20_read_a.html` .. `20_read_z.html` and `parts/22_js_rs_0data.js` from `rs/tpl/`, `rs/code/`, `rs/out/`, `rs/bench/results/`), then `sh build.sh` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
Hand-written parts: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates), `10_header.html`, `39_tab_more.html`, and the scripts `23_js_rs_common.js`, `24_js_rs_life.js`, `25_js_rs_async.js`, `26_js_rs_bench.js`, `27_js_rs_cli.js`.
Checks: `sh html_utils/checkpage.sh <page>`, `node src/check_controls.mjs`, `python3 src/rs/check_outputs.py`, `python3 html_utils/ledger.py check <page>`.

## Provenance (copied with `cp -R` from the Rust page's `src/`, which was left unchanged)
| Here | From the Rust page | What changed |
|---|---|---|
| `rs/` (code, out, bench, scripts) | `src/rs/` | `run_all.sh` walks up to `topic_programming_languages` for the shared data and runs the Python concurrency child's asyncio programs (the Python essentials page no longer has `src/pa`); `gen.py` writes this page's part names and no longer embeds the asyncio and Node traces; `check_ui.mjs` removed (replaced by `check_controls.mjs`) |
| `rs/tpl/20_read_a..h.html` | `src/rs/tpl/50_tab_rs_read_a..k.html` and the three lab tabs `51`, `52`, `53` | rewritten to the teaching contract (below) |
| `parts/23..27_js_rs_*.js` | `parts/55..59_js_rs_*.js` | registered on `t-read`; no play on mode switch; the async replay shows tokio only; the CLI replay's first session is drawn still |

## Departures from the topic-child shape, and why
- **No lab tabs.** Async replay, Service benchmark and CLI replay each explained one section's claim, so each sits inline beside it; the benchmark's run list and caveats are closed blocks under the chart.
- **Order follows the title**: async, then the service, then the CLI and shipping. The old Part 3 put the CLI first as a warm-up.
- **Code in closed blocks.** Each recording or its visual stays in the core; most source listings are closed blocks, except the few a reader must see to follow (the router, the clap struct, the runtime builder).
- **s8 (asyncio, tokio and the JS loop side by side) is gone**: one sentence links the topic root's concurrency axis and the two sibling runtimes' pages; the Python and Node recordings stay in `rs/out/` but are not shown.
- **Common mistakes** became one closed checklist: every item repeats something the core shows.

## Length judgement
| | Rust page Part 3 (2026-10-26) | This page |
|---|---|---|
| Core reading (230 words a minute, `html_utils/audit_pages.mjs`) | 42 min Reading + 4 min in the three lab tabs | 27 min |
| Closed details | 5 min | 19 min (source listings, recorded outputs, the benchmark table and runs, the checklist) |
The plan estimated 26 min. Decision 19 (split into async and services against CLIs if the core stays over about 30 min) was not needed. The core is what a Python-fluent ML engineer does not already know: lazy futures, the runtime as a library, cancellation by dropping, blocking a worker (measured), Send + 'static errors, axum's extractors and layers, and the shipping story. Familiar ground (what async is for, HTTP design, test strategy, container mechanics) is one sentence and a link.

## Ledger
`ledger.json`: 273 units of this page (core 197, depth 75, fat 1), `ledger.py check` problems 0. `from_master.json`: all 298 master units of the Rust page's Part 3 (ids 694 to 991): 273 owned here, 1 by `python/concurrency_asyncio_and_the_gil` (Python's CancelledError cleanup), 1 by the topic root (the side-by-side table; the root carries only part of it today), 1 by `topic_operating_systems/containers_and_isolation` (what an image is), 22 fat (Part pointers, tab instructions, section headings, the old footer and further-reading line, now in the Further reading tab).
