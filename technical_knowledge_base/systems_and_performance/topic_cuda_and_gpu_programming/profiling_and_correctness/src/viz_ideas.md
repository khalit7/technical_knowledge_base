# Visualisations: built and rejected

## Built (ranked by what they teach)
1. **Report walk** (Reading s4, animation, before/after): NVIDIA's three sample Nsight Compute pairs walked in reading order (duration, Speed of Light, the section it points to, the rule, the fix, the re-profile, estimate against the clock). Real `ncu --import` values. Teaches the reading order and that rule estimates are hypotheses (64.67% estimated, 0.14% real).
2. **One matmul timed four ways** (s1, animation, to scale): CPU and GPU lanes; clock without synchronise, with synchronise, events, and a forgotten synchronise before start. Measured MPS medians of 3 runs.
3. **Summation order** (s5, animation): sixteen float16 numbers summed left to right, as a pairwise tree, and in random atomic orders ("Another run"); rounding from the page's float16 model (checked against PyTorch).
4. **Report reader tab**: all six reports, merged before/after tables per section, rules with estimated speedups, tap a label to see the metric name (from NVIDIA's section files).
5. **Numerics lab tab**: dot-product error for input/accumulator/output formats, length K, order (sequential, pairwise, split-K); pass rate against assert_close defaults; error-against-K chart. Model checked bit for bit against PyTorch casts (check/check_js.mjs).
6. Inline measured charts: warm-up curves (9 fresh processes), hot/cold cache bandwidth against size, histograms of 300 timings in 3 runs, accumulation error against K, order bars in ulps; real torch.profiler trace of one training step, CPU against MPS.
7. Metric-name anatomy (click the parts of two real metric names).

## Added or moved on 2026-10-23 (teaching-contract rebuild)
- **Hero: the loop** (top, static annotated diagram in HTML): five steps (timeline, ncu, change one thing, honest timing, check the answer), each with its tool and section, and the loop back.
- **Six timeline shapes** (s3, toggle-compare of end states): illustrative CPU/GPU/copy/NCCL rows for each row of the symptom table; the static table is the selector, so its text stays checkable. Labelled illustrative because no nsys trace exists here (the rejection below still stands for a fake "measured" trace).
- **Where a warp's cycles go** (s4, before/after on the same kernel): stacked warp cycles per issued instruction by stall reason, with issue rate and achieved occupancy, for NVIDIA's three sample pairs. Real Warp State and Occupancy tables.
- **Numerics lab moved** into a closed workbench in Reading s5 (it explains one mechanism, accumulation error); the tab was removed.
- **Formats table** is now static HTML (checked against the data by `check/check_embed.py`), with the float64 row absorbed from Writing kernels.
- Metric anatomy and the question-to-metric table moved into a closed reference block.

## Rejected
- An "Nsight Systems timeline" drawn from invented data: no nsys here; replaced by the real torch.profiler trace plus a symptoms table (2026-10-23: the symptoms table now draws labelled illustrative shapes, never presented as a measurement).
- A roofline tab: owned by Performance math and the memory hierarchy page (linked).
- Occupancy what-if tables from the reports: the parent's GPU simulator already validates occupancy against cuda_occupancy.h.
- A full metric browser (1 MB per chip from `--query-metrics`): too large; the cited names are checked instead (out/ncu/metric_names_checked.txt).
- Clock-locking experiment: impossible on the M1 (no user clock control); shown from docs and from NVIDIA's reports' recorded clocks.

## What the methodology lacked for this page
A rule for "real tool output without the hardware": here the tool (ncu) could read vendor-shipped reports, which beat any simulation. Worth checking for other tools: shipped samples are real evidence.

## The 2026-11-06 rollout, done 2026-11-10 (split layout, 3D stages v2, explained and autoplaying)
- **Built in 3D** (renderer v2, `25_js_s3.js`): Fig. 1 `stg-time` (s1): the CPU thread and the GPU stream as two glass lanes on one time axis, to scale, four ways of timing one matmul (launches as flowing dots, the host clock as green posts, events as purple flags; measured medians). Fig. 2 `stg-walk` (s4): one Nsight Compute report read top-down, before and after columns per metric under a glass ceiling at 100% of peak, the rule's estimate as a purple ghost against the real duration, for NVIDIA's three sample pairs. Fig. 3 `stg-sum` (s5): sixteen float16 numbers summed left to right, as a pairwise tree and in random atomic orders, with a row of "lost so far" columns (the page's float16 model).
- **Replaced**: the 2D timing animation (`25_js_rd_time.js`), the 2D report walk (`28_js_rd_walk.js`) and the 2D summation animation (`29_js_rd_num.js`); their captions moved into step lists.
- **Kept 2D, in splits**: the hero loop (a map of five steps, read as text), warm-up curves, hot/cold bandwidth and the 300-timing histograms (log axes and distributions read best flat), the six timeline shapes (illustrative; a flat timeline is the tool's own picture, and Fig. 1 already gives lanes their depth), the torch.profiler trace and table, warp stalls as stacked bars (a stacked bar with a legend reads exactly flat), accumulation error against K (log-log), the order bars (log scale).
- **Rejected this pass**: error columns per element with the tolerance as a glass slab (the recorded MPS matmul keeps only summaries, and the page's float model on 256 elements would show no failures at the measured rate of 23 in 65,536, so the picture would be invented or misleading); a 3D nsys timeline (no recorded nsys trace; proposed as a run for Khalid).
