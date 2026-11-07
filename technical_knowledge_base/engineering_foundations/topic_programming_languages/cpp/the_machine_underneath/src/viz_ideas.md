# Part 2 (The machine underneath): visualisation ideas

Scored 1 to 5 on teaching value (T), uses real data (D), cost to build (C, 5 = cheap). Placement in brackets.

| # | Idea | T | D | C | Decision |
|---|---|---|---|---|---|
| 1 | Latency ladder: measured pointer-chase curve, 3 random + 2 sequential runs, level bands, step-through "climb" animation, tap readout | 5 | 5 | 4 | built (tab Latency ladder) |
| 2 | Cache simulator: the same loop stepped one access at a time over AoS against SoA (before/after toggle) and a matrix by rows against columns with an 8-line LRU cache; counters of lines fetched, bytes moved and used; measured ratio revealed at the end | 5 | 4 (illustrative model, measured endpoints) | 3 | built (tab Cache simulator) |
| 3 | SIMD lanes: one 16-element block of the dot product as scalar fmadd chain, -O2 fmul.4s plus serial fadd, NEON 4 accumulators; cycle counter from Dougall Johnson's latencies; model checked against measured ns | 5 | 5 | 3 | built (tab SIMD lanes) |
| 4 | Roofline with measured roofs (1 and 8 threads) and measured kernels; LLM decode point swept over batch (animation), weight format and model size | 5 | 4 (measured roofs, illustrative decode) | 3 | built (tab Roofline) |
| 5 | Assembly switches inline: -O0 against -O2 (loop replaced by a formula), virtual against final, four dot products, five memory orders | 4 | 5 | 5 | built (Reading 5, 6, 8) |
| 6 | Predict-then-reveal drills with recorded outputs (rows vs columns, sizeof, AoS/SoA, dot product, branches, litmus, false sharing, -O2 sum_squares, ladder sequential) | 5 | 5 | 5 | built (Reading, 9 drills) |
| 7 | mmap runs switch: cold (major faults) against warm page cache | 3 | 5 | 5 | built (Reading 4) |
| 8 | False-sharing animation: a cache line ping-ponging between four cores | 3 | 2 | 3 | rejected: the measured 8/64/128-byte table says it more precisely |
| 9 | Branch predictor state machine (2-bit counters) animation | 2 | 1 | 3 | rejected: Apple's predictor is undocumented; a 2-bit toy would teach a model the chip does not use |
| 10 | Store-buffer animation of message passing | 3 | 2 | 3 | rejected for now: the litmus count (real reorderings) teaches the consequence; candidate if Khalid wants more on memory orders |
| 11 | Instruments flame graph | 4 | 0 | 2 | not possible: xctrace hung and sample could not attach in this session |

Methodology notes: every number is measured on this machine (three runs, spread and load average shown) or computed from a stated formula; illustrative models (8-line cache, decode bound) are labelled. What the methodology lacked for this page: guidance for measurements on a shared, busy laptop (we used best-of-N inside a run, three runs, and printed the spread).

## Rebuild as a child page (2026-10-26)
- Hero added: a static log-scale bar chart of one operation's time (fused multiply-add, L1, L2, DRAM in address and random order, a page fault), drawn from `window.CB` by `parts/44_js_cb_hero.js`.
- Latency ladder, Cache simulator and SIMD lanes moved from their own tabs into the Reading beside the claims they prove (sections 1, 2 and 3, 6). The cache simulator is now two instances (`cb-cm-` rows against columns in section 2, `cb-cs-` AoS against SoA in section 3) instead of one with a task switch.
- Roofline tab dropped: the hardware root's Roofline lab plots the same measured CPU roofs (and the GPU and datacenter chips), and Performance math owns the decode sweep. The roof table stays inline.
- The SIMD tab's duplicate "measured, all four ways" table dropped (the Reading's dot-product table holds the same numbers).

## Split layout and 3D stages (2026-11-07, the 2026-11-06 rollout)
| Visual | Decision |
|---|---|
| Cache ladder as stacked plates (registers, L1, L2, SLC, DRAM), a 128-byte line rising on a miss, the pointer chase hopping across DRAM, the prefetcher streaming neighbours | built, 3D (`45_js_sc_mem.js`, section 1); sizes from `sysctl`, latencies from `ladder.cpp` run 1 |
| Latency against working-set size | kept 2D (log axes read best flat); its 37-size climb regrouped into six explained stretches |
| Cache model, rows against columns | kept 2D (a grid of lines reads best flat); 512 accesses per order regrouped into seven explained stretches on one sequence (rows, then columns), no mode switch |
| AoS against SoA: the same 32 records rearranged from 8 lines of 4 records into 8 one-field arrays, lines flowing to the core | built, 3D (`46_js_sc_aos.js`, section 3), replaces the 64-access AoS/SoA simulator; measured bars from `aos.v` |
| SIMD: instructions as boxes in lanes against cycles in depth, scalar, -O2 and NEON side by side | built, 3D (`47_js_sc_simd.js`, section 6), replaces the 2D lanes stepper (16, 17 and 5 steps in three modes) |
| Store-buffer message passing, relaxed against release/acquire (old idea 10) | built, 3D (`48_js_sc_mo.js`, section 8), labelled illustrative; the counts are measured |
| False sharing, a line moving between four cores' L1s (old idea 8) | built, 3D (`49_js_sc_fs.js`, section 8): with the stage the 8/64/128-byte timings now have a picture of why |
| Hero (one operation's time, log scale) | kept 2D (bars on a log axis), moved into a split beside "You need" |
| Branch predictor state machine (old idea 9) | still rejected: Apple's predictor is undocumented |
| Roofline chart | still left to its owners (hardware root's Roofline lab, Performance math) |
