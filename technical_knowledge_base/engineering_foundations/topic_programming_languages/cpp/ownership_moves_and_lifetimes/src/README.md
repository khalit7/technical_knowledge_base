# How this page was built

A topic child, split on 2026-10-26 from Part 1 of the C++ page (now "C++: the essentials"), following the language split plan (section 2, child 1): Reading sections 2 to 6 (values, references and pointers; the stack and the heap; RAII; unique_ptr and shared_ptr; move semantics) and the Object lifetimes tab.

## Source
- `build.sh`, `parts/01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (storage key `oml-tab`) from the explainer-page templates.
- `ca/`: copied with `cp -R` from the C++ page's `src/ca/`, then trimmed to this page's programs (`code/lang/`), recordings (`out/`) and one step file (`steps/20_lang.sh`). `ca/gen.py` turns `ca/tpl/20_read_*.html` into `parts/20_read_*.html` (directives `[[code:]]`, `[[out:]]`, `[[pr:]]`, `[[g:]]`, as on the C++ page) and writes `parts/22_js_ca_data.js` (the lifetime logs, the printed addresses, the owner-cost timings). Never edit the generated parts by hand.
- `parts/23_js_ca_util.js` and `24_js_ca_life.js` are the C++ page's `33_js_ca_util.js` and `34_js_ca_life.js` (reading-time and nav code removed; switching scenario no longer starts playback; a leak caption when objects are never destroyed). `25_js_ow_read.js` is new: hero, address map, cost bars, and the four replay mounts.
- Pipeline: `PL=<scratch folder> sh src/ca/run_all.sh` (about 30 seconds; compiles in the scratch folder, never in the repo), `python3 src/ca/gen.py`, `sh src/build.sh`, `node src/check_controls.mjs [shots dir]`, `sh html_utils/checkpage.sh <page>`.

## Runs (2026-10-26, Apple M1 Pro, Apple clang 17, `-std=c++23 -O2`)
- Every recording copied from the C++ page was rerun: byte-identical to the 2026-10-05 runs except `l_stack_heap` (randomised addresses).
- New: `lt_cycle` (a shared_ptr cycle leaks #1 and #2; the weak_ptr version destroys both nodes, d's Tracer first, by member destruction order), `lt_temps` (a temporary dies at the semicolon; one bound to `const&` lives to the brace), `t_ptr_cost` (ns per call: raw pointer, `const unique_ptr&` and `const shared_ptr&` 0.96; `shared_ptr` by value 13.50; by value from 4 threads at once 302.42; load average 6.70). The first `ptr_cost` version printed 0.00 ns because clang hoisted the read-only calls; an empty `asm` with a memory clobber fixed it, and the page says so.

## Shape and departures
- Core idea, hero, "You need" (C++ essentials), new terms, an "In one screen" table of when each kind of object dies (it absorbs the Stage 1 gate answer from the old drill tab), then seven sections in the order of the old Part 1.
- The Object lifetimes tab moved inline: its nine scenarios (plus the two new ones) are four replay cards beside sections 3, 4, 5 and 6. Its "what to notice" list became the bullet notes under each card. Tracer and lifetime.cpp sources are in a closed block in section 3.
- Drill questions on these sections (old Predict the output tab) are carried as the "Predict, then step" prompts beside the replays and one predict-then-reveal output (section 1); the Stage 2 gate answer is the closed block in section 7.
- Linked rather than taught: malloc and Python's reference counting and cycle collector (Memory allocators), why the stack is fast and why a shared cache line is slow (the machine underneath), dangling references, the double-free crash and the UB gallery (C++ essentials), Rust's checked ownership (the Rust lifetimes child).

## Length judgement
Before (the C++ page, measured 2026-10-26 in the rendered DOM): Reading sections 2 to 6, 3,862 words core (16.8 min) plus 346 closed; the Object lifetimes tab 363 words core plus 802 closed; 1 inline visual (the noexcept replay). After: Reading 19 min core (4,463 words) plus 13 in closed details, Further reading 1 min; 3 static figures, 4 replays and the cost bars inline. The core counts about 530 words of code and recorded output and about 550 words drawn inside the replay cards (code panel, log, captions), which are scanned rather than read; the prose alone is about 14 minutes. The page grew by the cycle and weak_ptr, temporaries, the owner-cost measurement, the "when does each object die" table and the hero; condensing further would mean dropping one of the mechanisms an ML engineer meets daily reading C++ (who frees what, what a move does, why a vector copies), so this length is right.

## Ledgers
- `ledger.json`: this page, 156 units (134 core, 18 depth, 4 fat: header and navigation); `python3 html_utils/ledger.py check` problems 0.
- `from_master.json`: 125 units of the C++ page's master ledger (sections 2 to 6, ids 74 to 160; the Object lifetimes tab, 335 to 344; the drill items on these sections and the Stage 1 and 2 gates): 115 owned here, 10 fat (drill questions whose answers are carried, navigation lines).

## Checks
`sh html_utils/checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `node src/check_controls.mjs` all checks passed (no autoplay under reduced motion; every chip, step and slider at 390 dark and 920 light; 11 embedded outputs equal their files; 11 replay logs equal their files; the trace facts the prose states recomputed from the logs).
