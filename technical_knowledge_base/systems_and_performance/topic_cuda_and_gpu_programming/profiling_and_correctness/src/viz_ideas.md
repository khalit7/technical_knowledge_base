# Visualisations: built and rejected

## Built (ranked by what they teach)
1. **Report walk** (Reading s4, animation, before/after): NVIDIA's three sample Nsight Compute pairs walked in reading order (duration, Speed of Light, the section it points to, the rule, the fix, the re-profile, estimate against the clock). Real `ncu --import` values. Teaches the reading order and that rule estimates are hypotheses (64.67% estimated, 0.14% real).
2. **One matmul timed four ways** (s1, animation, to scale): CPU and GPU lanes; clock without synchronise, with synchronise, events, and a forgotten synchronise before start. Measured MPS medians of 3 runs.
3. **Summation order** (s5, animation): sixteen float16 numbers summed left to right, as a pairwise tree, and in random atomic orders ("Another run"); rounding from the page's float16 model (checked against PyTorch).
4. **Report reader tab**: all six reports, merged before/after tables per section, rules with estimated speedups, tap a label to see the metric name (from NVIDIA's section files).
5. **Numerics lab tab**: dot-product error for input/accumulator/output formats, length K, order (sequential, pairwise, split-K); pass rate against assert_close defaults; error-against-K chart. Model checked bit for bit against PyTorch casts (check/check_js.mjs).
6. Inline measured charts: warm-up curves (9 fresh processes), hot/cold cache bandwidth against size, histograms of 300 timings in 3 runs, accumulation error against K, order bars in ulps; real torch.profiler trace of one training step, CPU against MPS.
7. Metric-name anatomy (click the parts of two real metric names).

## Rejected
- An "Nsight Systems timeline" drawn from invented data: no nsys here; replaced by the real torch.profiler trace plus a symptoms table.
- A roofline tab: owned by Performance math and the memory hierarchy page (linked).
- Occupancy what-if tables from the reports: the parent's GPU simulator already validates occupancy against cuda_occupancy.h.
- A full metric browser (1 MB per chip from `--query-metrics`): too large; the cited names are checked instead (out/ncu/metric_names_checked.txt).
- Clock-locking experiment: impossible on the M1 (no user clock control); shown from docs and from NVIDIA's reports' recorded clocks.

## What the methodology lacked for this page
A rule for "real tool output without the hardware": here the tool (ncu) could read vendor-shipped reports, which beat any simulation. Worth checking for other tools: shipped samples are real evidence.
