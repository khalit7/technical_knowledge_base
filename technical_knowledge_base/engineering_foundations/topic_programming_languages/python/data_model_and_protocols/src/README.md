# Source of "Python: the data model and protocols"

Child page 1 of Python: the essentials (page prefix `dm`, storage key `pydm-tab`). Built 2026-10-26 by splitting the Python language page (plan: section 1, child 1). Editing only: no new runs; every snippet, output and number was recorded on 2026-10-05 (CPython 3.14.8 and 3.13.16, Apple M1 Pro, macOS 27) by the language page's Part 1 agent.

## Build
`sh build.sh` writes `../index.html` from `parts/` (the skill template, unchanged). Seven parts are generated, never edited by hand: `python3 pa/gen.py` expands `pa/tpl/20_read_b.html` to `20_read_g.html` (sections 1 to 7) and `pa/tpl/22_js_dm_0pa.js` (`window.PA`: the copy graph, the pipeline trace, the 19 dispatch traces) into `parts/`, inlining `pa/code/*.py` and `pa/outputs/*`. Markers: `[[run:]]`, `[[runx:]]` (output shown, code in a closed block; added here), `[[code:]]`, `[[out:]]`, `[[predict:]]`, `[[drill:TITLE]]` (a recorded drill from `outputs/q_drills.json` behind a reveal), `[[json:]]`.
Hand-written parts: `20_read_a.html` (styles, nav, the top screen), `23_js_dm_read.js` (copy and pipeline steppers), `24_js_dm_explorer.js` (the Data model explorer), `39_tab_more.html`.
Order: `python3 pa/gen.py && sh build.sh`.

## Provenance (copied with `cp`, never moved, from `../src/` of the language page, which other agents also read)
| Here | From | Trimmed |
|---|---|---|
| `pa/code/*.py`, `pa/outputs/*` (30 scripts, 32 outputs) | `src/pa/code`, `src/pa/outputs` | only this page's: n3 to n7, d1, d2, g1 to g6, f1 to f5, c1 to c6, e1 to e4 (with the 3.13 run of e4 and n5), x1, q_drills |
| `pa/gen.py` | `src/pa/gen.py` | class prefix `dm-`; datasets reduced to n7_graph, d2_dispatch, g2_order; `[[drill:]]` (as the concurrency sibling did) and `[[runx:]]` added |
| `pa/run_all.sh`, `pa/versions.txt` | `src/pa/` | the run list reduced to this page's scripts; versions unchanged |
| `pa/tpl/20_read_b..g.html` | `src/pa/tpl/30_tab_pa_read_a..e.html`, `_g.html`, `32_tab_pa_dm.html` | rewritten for one Reading tab (below) |
| `parts/23_js_dm_read.js` | `src/pa/tpl/35_js_pa_read.js` (names and lazy blocks) | ids `dm-`, tab `t-read`, a mode switch resets instead of playing |
| `parts/24_js_dm_explorer.js` | `src/pa/tpl/37_js_pa_dm.js` | inline in `t-read`, ids `dm-ex-`, picking a scenario resets instead of playing |
| `check_controls.mjs` | the concurrency sibling's | card ids and class prefix |
No copied script climbs above `src/`, so no depth fix was needed (`run_all.sh` takes its toolchain from `$PL`).

## Shape and departures
- Top: the core sentence, a static hero (five pieces of syntax and the lookup each runs on the type), "You need", new terms (only the ones an everyday Python user may not name precisely).
- Sections in the subject's order: syntax to methods (with the Data model explorer inline), copies and calls, iterators and generators, functions, classes, exceptions, `with`.
- The language page's Data model tab moved inline (it explains section 1). Its Predict-the-output tab is gone: 19 of its 26 drills sit beside the section that explains each (the rest belong to the essentials page, the concurrency sibling and the internals sibling). On 2026-10-26 the essentials pass trimmed `pa/code/q_drills.py` and `pa/outputs/q_drills.json` to those 19, so each drill lives on one page only (Integer caching and Float arithmetic: the internals sibling; the two async drills: the concurrency sibling; Aliasing, Default argument and "is with strings": the essentials page); the built page did not change.
- Closed: long scripts whose output carries the point (`[[runx:]]`), the 3.13 outputs, the full dispatch script, extra predictions, `yield from` and `send`, itertools, parameter kinds, the retry decorator, the bytecode of a method call, the tracebacks of chaining, and each section's "Costs and habits" box.
- Sent elsewhere with one line and a link: names, aliasing and mutable defaults (the essentials page); `Protocol` types (the toolchain sibling); coroutines, `async with` and TaskGroup (the concurrency sibling); bytecode and the cost of a method lookup (the internals sibling); composition against inheritance and error-handling design (Code design); retry policy (Reliability engineering).

## Length judgement
Before (inside the language page, all open): about 32 min (Part 1 section 1's copying and arguments, sections 2 to 5, 7 and 8, and the Data model tab; about 7,450 words), plus the 26-question drill tab. After: 23 min core, 21 min in closed details (`node html_utils/audit_pages.mjs`, 230 words a minute). The core counts the real code and outputs that are the evidence for each rule (about 1,000 words) and the explorer's script-written steps. Longer than the plan's 18 min estimate because the page owns seven mechanisms, each with its rule, a run that proves it and a prediction; for a reader who already writes Python, what he can skip (scripts behind outputs, version differences, cost boxes, extra drills) is closed, and every remaining unit is labelled core in the ledger.

## Ledger
`ledger.json` (170 units: core 137, depth 32, fat 1; `python3 html_utils/ledger.py check <page>` reports problems 0). Labels are drafted by `label_ledger.py` (depth when the text sits only inside a closed block); three hand-added units cover the script-rendered explorer and steppers, keyed to their static source names. `from_master.json` (written by `make_from_master.py`): 144 units of the language page's master ledger: 138 owned here, 6 fat (the "In one screen" section pointers and the drill tab's instructions).

## Checks
`sh html_utils/checkpage.sh <page>` (fail=0, emdash 0, errbox 1, clipped 0); `node src/check_controls.mjs` from the page (every chip, mode and step at 390 dark and 920 light, and under reduced motion nothing moves before the reader acts); `python3 src/check_numbers.py` (every quoted number and the bar chart against `pa/outputs`).
