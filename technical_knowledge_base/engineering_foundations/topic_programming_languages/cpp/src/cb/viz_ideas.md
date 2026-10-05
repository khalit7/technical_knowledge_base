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
