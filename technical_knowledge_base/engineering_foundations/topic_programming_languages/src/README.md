# Topic: programming-languages: how the page is built

`sh src/build.sh` assembles `../index.html` from `parts/`. Tab sources: Reading and Further reading in `read/` (see `read/README.md`), Design space in `design/`, Rosetta in `rosetta/`, Benchmark in `bench/`, Toolchain atlas in `tools/`. The shared data in `rosetta/data` and `bench/results` is also read by the language pages' children: do not move or remove it.

## Rebuild to the teaching contract (2026-10-26)

The root was never rebuilt before; its four language pages were split into essentials plus four children each, so the root became a map, comparisons and definitions that never re-teach a child.

- **Top:** the core idea in one sentence (each language moved one kind of mistake to a different moment), a hero figure (where each language catches a mistake: edit, compile, run, no signal), "You need", eight new terms, the design space in one table (now with Waiting for I/O and Toolchain rows), and the running program. The fourteen-sections list, the reading-time line and "how this page teaches" are gone (provenance and the Shrestha et al. study are in a closed block).
- **Axes:** sections 1 to 10 keep the four cross-language visuals that children cite (how code runs, the same records in memory, the dangling reference, the shared counter) and every four-language code panel; each ends with a "Go deeper" naming the child that owns the mechanism. Every "What it costs" and "False friends" box is now a closed block. Section 9 gained an async table built from the Rust async child's side-by-side (calling, runtime, threads polling tasks with libuv's pool of 4, fan-out, cancellation, a blocking call, shared state across tasks), each row checked against the Python concurrency, Rust async and JavaScript event-loop children. Evolution and tooling merged into section 11 (governance table, dated status and the tool list closed); speed and interop (12) condensed.
- **The language pages:** four cards in learning order (TypeScript, Rust, C++, Python), each with the essentials page, its four children, their header times and one-line core ideas; milestones, the seven llama.cpp reading steps, the axis-to-founding-value table and the glossary are closed blocks.
- **Benchmark:** box 1's interpreter stepper is removed (the Reading tab's section 2 stepper carries the same per-character comparison; `32_js_bm_zanim.js` deleted, `bench/check_ui.mjs` updated); boxes 1, 5 and 6 keep the measured charts and numbers and link to Python internals, Rust PyO3 and Python concurrency for the mechanisms.
- **No autoplay:** `21_js_rd_common.js` and `99_js_tabs.js` from the skill templates (tab key `pl-tab`); the Toolchain atlas walk no longer starts on scroll.

## Length judgement

Reading core 49 min before (11,331 words), 36 min after (8,196 words), plus 20 min in closed details. Why this length: the root owns the four-language comparison on thirteen axes, and most of what remains is that comparison (two tables, eight code panels, four steppers, the hero) plus the map of twenty pages; everything that teaches one language in depth is a link to the child that owns it, and every cost box, false friend, dated status line and per-language list is closed. Cutting further would remove comparisons no other page carries.

## Ledger

`ledger.json`: 558 units of the old page; core 425, depth 97, owned 2 (`std::move` is a cast: C++ ownership child; the calling-convention conversion: Rust PyO3 child), fat 34 (navigation, the fourteen-sections list, stale "future child page" pointers, question stems, the removed stepper's widget labels). `python3 html_utils/ledger.py check` prints problems 0.

## Checks

`sh html_utils/checkpage.sh <page>`; from the repo root `node .../src/read/check_read.mjs`, `node .../src/design/check/ds_check.mjs <dir>`, `node .../src/rosetta/check/ro_check.mjs <dir>`; `node src/tools/ta_check.mjs`, `node src/bench/check_ui.mjs`, `python3 src/bench/check_numbers.py`, `python3 src/design/check.py`.
