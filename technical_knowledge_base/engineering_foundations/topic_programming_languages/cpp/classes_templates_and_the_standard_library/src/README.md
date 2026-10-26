# How this page was built

A topic child, split on 2026-10-26 from Part 1 of the C++ page (now "C++: the essentials"), following the language split plan (section 2, child 2): Reading sections 7 to 11 (classes and virtual functions, templates and concepts, the standard library, lambdas, error handling) and the Predict the output items on them.

## Source
- `build.sh`, `parts/01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (storage key `cts-tab`) from the explainer-page templates.
- `ca/`: copied (never moved) from the C++ page's `src/ca/` (`lib.sh` from the ownership sibling, which drops the LLVM 23 wrapper this page does not need), trimmed to this page's programs (`code/lang/`), recordings (`out/`) and two step files. `out_2026-10-05/` keeps the C++ page's original `t_vcost` and `t_throw` recordings, shown beside today's reruns.
- New programs: `code/lang/dispatch.cpp` (one sum over 10 million shapes, eight ways of calling, objects in allocation order and allocated in shuffled order) and `code/lang/exc_cost.cpp` (exceptions against std::expected by failure rate, and by the number of frames the error crosses).
- `ca/gen.py` turns `ca/tpl/20_read_*.html` into `parts/20_read_*.html` (directives `[[code:]]`, `[[out:]]`, `[[pr:]]`, `[[g:]]` as on the C++ page, plus `[[m:KEY]]` for medians of the three timing runs, written to `ca/summary.json`) and writes `parts/22_js_ct_data.js`. Never edit the generated parts by hand. `parts/23_js_ct_read.js` draws the dispatch bars, the vector staircase, the lazy-pipeline stepper and the two exception charts.
- Pipeline: `PL=<scratch folder> sh src/ca/run_all.sh` (about a minute; `dispatch` peaks near 1.4 GB), `python3 src/ca/gen.py`, `sh src/build.sh`, `node src/check_controls.mjs [shots dir]`, `sh html_utils/checkpage.sh <page>`.

## Runs (2026-10-26, Apple M1 Pro, Apple clang 17, `-std=c++23 -O2`)
- Every language recording copied from the C++ page was rerun and is byte-identical to the 2026-10-05 runs.
- `t_vcost` reproduces (0.98 / 0.42 / 0.32 ns against 1.01 / 0.47 / 0.34); one earlier rerun under load average 12.5 printed 1.42 / 1.32, which is why the new benchmarks run three times and the page quotes medians. `t_throw` reproduces (4643 ns per throw against 4766).
- `t_dispatch`, three runs: predictable virtual call about 1.0 ns; three classes in random order about 6 ns for virtual, std::function and std::variant alike; sorted by class about 1.0; plain struct flat 0.32; scattered pointer rows 5 to 17 ns. A first version swept 1,000 objects 10,000 times and was dropped: the branch predictor learned the repeating sequence (variant 2.1 ns there against 5.6 on 10 million). A second version shuffled the pointers, which also destroyed the "sorted by class" order; the final version shuffles the allocation order instead.
- `t_exc`, three runs: cost per call fits success path + rate x one throw (about 4.8 µs); a throw grows about 0.7 µs per frame unwound. A first version let clang turn the recursion into a loop (depth had no effect); an empty `asm volatile` after each recursive call keeps the frames.
- Load average 5.7 to 12.1 during the runs (other agents); recorded in the outputs.

## Shape and departures
- Core idea, hero (three lanes: compile time, run time, errors, each with its measured cost), "You need" (essentials, ownership sibling), new terms, an "In one screen" table, then six sections in the old order.
- Visuals inline: the hero; object layout with the vptr; dispatch bars with an in-order / scattered toggle and a prediction prompt; the one-template-three-functions figure; diagnostic-length bars; the vector capacity staircase; the SSO figure; the lazy-pipeline stepper (from the recorded trace); the closure-object figure; the failure-rate slider with a fitted model; the depth bars. No lab tabs (the C++ page had none for these sections); the drill items became the predict-then-reveal blocks and prompts beside each visual.
- Linked rather than taught: devirtualisation assembly and branch prediction (the machine page, sections 5 and 7), noexcept and vector growth replays and exception unwinding (the ownership page), the UB gallery's dangling string_view, capture and reallocated-vector cases (the essentials page).

## Length judgement
Before: the C++ page's sections 7 to 11, about 2,300 words of template source (the split plan estimated 15 min core; not measured separately). After: Reading 22 min core (5,078 words) plus 17 in closed details, Further reading 1 min. The core counts about 1,000 words of code and recorded output that are scanned rather than read; the prose is about 17 minutes. The page grew by two measurements the plan asks it to own (dispatch cost and exception cost, each with its widget and the reading of its results) and the figures; condensing further would mean dropping one of the five subjects or the measured rules (sort by type, flat over pointers, expected when failure is common), so this length is right.

## Ledgers
- `ledger.json`: this page, 163 units (143 core, 19 depth, 1 fat: the section nav); `python3 html_utils/ledger.py check` problems 0.
- `from_master.json`: 82 units of the C++ page's master ledger (ids 161 to 225, sections 7 to 11; 365 to 377 and 382 to 383, the drill items on these sections; 405, the Stage 3 gate's vector<bool> answer; 22, the Start here exception finding): 74 owned here, 8 fat (drill questions whose answers the page carries, a restating cost box).

## Checks
`sh html_utils/checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `node src/check_controls.mjs` all checks passed (22 embedded outputs equal their files; 50 prose numbers equal `summary.json`; no autoplay under reduced motion; every control at 390 dark and 920 light).
