# Chip atlas: visual ideas (built and rejected)

Question the tab answers: "across every accelerator an ML engineer meets, how do they compare on equal footing, and what does a spec sheet really promise?"

Scores per the Methodology (0 to 2 each: moves with a parameter, reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; minus build cost; +1 animation).

| # | Idea | Score | Status | Why |
|---|---|---|---|---|
| 1 | **Read the headline** before/after animation: two vendor headlines peeled in the same four steps (per chip, dense, same format) with running ratio counters; four pairs | 14 | built | Corrects the commonest misreading (364x becomes 2.5x for GB200 NVL72 vs H100); reproduces each vendor's dense per-chip figure from its rack figure; shows where "halve the sparse number" fails (GB300 FP4 20 vs 15; Rubin 50 vs 35) |
| 2 | Atlas table, 25 chips: format selector (dense), per chip / per server / per scale-up domain toggle, sortable, row detail with every source, sparse printed beside dense, derived and announced tags | 13 | built | The old page's "at what scale was this measured" idea done right: one toggle, multiplied from per-chip figures and checked against vendor rack/pod totals in each row's detail (gaps shown in red: Rubin bandwidth +13%, Trainium GiB vs GB) |
| 3 | Compare two or three: bars per metric relative to the largest, with ratios, including FLOPs/byte and BF16 per kW | 10 | built | Interview and buying questions are pairwise |
| 4 | Compute against bandwidth over six NVIDIA generations (A100 to Rubin), animated step per generation, three bars (BF16, lowest format, bandwidth) on log scale | 12 | built | Shows "chips get more compute-bound" and its exception (H200, Rubin in BF16): BF16 13x and NVFP4 112x vs bandwidth 11x |
| 5 | Ridge point of every chip in BF16 / FP8 / FP4 with dashed lines for decode at batch 1, batch 64 and a 4096^3 matmul (formula shared with the Roofline lab) | 11 | built | Turns the ratio into "is my workload memory-bound on this chip" |
| 6 | Timeline scatter (date x log metric), vendor colours, announced hollow | 9 | built | Lays the subject on one axis (method's second favourite kind) |
| 7 | Memory capacity vs model sizes with bytes-per-parameter (BF16, FP8, FP4, 16 B Adam) and the scale toggle; "needs k chips" | 11 | built | Answers "does it fit" for six real models; 16 B/param from ZeRO section 3.1 |
| 8 | Vendor peak vs independent measurement (SemiAnalysis GEMM, Chips and Cheese bandwidth, M1 Pro measured here) | 10 | built | Keeps the two kinds of evidence apart, as the brief requires |
| 9 | Dated price table with peak PFLOP-hours per dollar | 8 | built | Short and dated; calculator tab owns run costs |
| 10 | Predict-then-reveal drills (4) and interview questions (5) | 9 | built | Reader goal: interviews |
| R1 | Per-gigawatt view (chips per GW) | 6 | rejected | Power per chip unpublished for TPUs, Trainium, Rubin; would rest on unconfirmed numbers |
| R2 | Die-shot style physical diagrams of each chip | 5 | rejected | Images only; the Reading tab owns "inside a GPU" |
| R3 | Price history over time | 4 | rejected | A pattern Khalid removed elsewhere; prices kept as one dated snapshot |
| R4 | MLPerf results per chip | 6 | rejected for now | System-level, submitter-tuned, not comparable per chip without a long caveat; better on the calculator or a child page |
| R5 | Radar chart per chip | 3 | rejected | Axes with different units on one radar mislead |

What the methodology lacked here: a rule for vendor figures that disagree with the same vendor's other page (Rubin 22 vs 19.2 TB/s; Trainium GiB vs GB). Applied: pick one, show the other in the row, and expose the gap in the rack check rather than hiding it.
