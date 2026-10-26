# How this page was built

A topic child, split on 2026-10-26 from Part 2 ("The machine underneath") of the C++ page (now "C++: the essentials"), following the language split plan (section 2, child 3).

## Source
- `build.sh`, `parts/01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (storage key `cbm-tab`) from the explainer-page templates.
- `cb/`: the measurement folder, copied with `cp -R` from the C++ page's `src/cb/` (programs, recorded outputs, `gen_data.py`, checks). See `cb/README.md`.
- `parts/40_js_cb_0data.js` is written by `cb/gen_data.py` (identical to the C++ page's copy). `40_js_cb_1core.js`, `40_js_cb_2read.js`, `41_js_cb_ladder.js`, `42_js_cb_cache.js`, `43_js_cb_simd.js` copied from the C++ page and retargeted from the lab tabs to the Reading; `44_js_cb_hero.js` is new. The prose parts `20_read_*.html` were rewritten from `40_tab_cb_read_*.html` and the four lab tabs.

## Shape and departures
- Core idea, hero (one operation's time on a log scale), "You need" (C++ essentials, the ownership sibling), new terms, an "In one screen" table, then twelve sections, each with its measurement inline and depth (code listings, assembly, provenance, x86 and llama.cpp detail) in closed blocks.
- Lab tabs moved inline (Latency ladder in 1, Cache simulator in 2 and 3, SIMD lanes in 6); the Roofline tab was dropped for the owners (Performance math; the hardware root's Roofline lab, which already plots these CPU roofs). The old "Common mistakes" section was folded into the core and the In one screen table: each mistake restated a section.
- Owners linked rather than re-taught: Virtual memory (pages, TLB, faults), Memory allocators (malloc), Concurrency (threads and locks), Scheduling and CPU time and Capacity planning (profilers), Performance math (roofline, decode bounds), the CUDA programming model and GPU memory hierarchy (SIMT, coalescing, divergence), Numerical computing (summation error), Local and on-device inference (mmap loading). Kept here because no owner carries them: the measured M1 page-fault and mmap timings, the C++ allocation measurement, the memory-order table with C++ syntax and the litmus count (the Concurrency page sends readers here for them).

## Length judgement
Before (Part 2 of the C++ page, audit 2026-10-26): Reading 46.6 min core plus 0.9 closed, plus 5.5 min across four lab tabs; 0 visuals inline in the Reading. After: Reading 29.5 min core plus 20.3 closed, Further reading 1.7; 5 visuals inline (hero, ladder, two cache simulators, SIMD stepper), 53 controls. The core counts about 1,400 words of code listings and recorded program output that are scanned rather than read, and the hidden predict-then-reveal answers; the core prose alone is about 16 minutes. Twelve mechanisms, each with its own measurement, is the subject; condensing further would mean dropping measured results that no other page holds, so this length is right.

## Ledgers
- `ledger.json`: this page, 262 units (207 core, 55 depth), `python3 html_utils/ledger.py check` problems 0.
- `from_master.json`: the 313 units of the C++ page's master ledger in the old Part 2 tabs (`t-cb-*`): 284 owned here, 4 Performance math, 4 the hardware root, 2 Virtual memory, 1 Concurrency, 18 fat (navigation, "Try" lines, questions the predictions carry, restated mistakes, the old Part 2 further-reading lab list).

## Checks
`sh html_utils/checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `cb/check/check_embed.py` problems 0; `cb/check/check_ui.mjs` problems 0.
