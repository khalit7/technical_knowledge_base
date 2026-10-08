# Engine bench: visual ideas, built and rejected (2026-10-08)

Central question: what does a serving engine actually do to speed and latency as prompts, context, batch, load,
precision and caching change, measured, and which of those shapes carry over to a datacenter GPU?

## Built (score out of 14, methodology section 2)
1. Alone vs under load streaming replay (13): two recorded requests from the same server, token blocks appear at
   their real arrival times; play/pause/step/scrub/speed; before/after on the same input shape. Reading-tab favourite pattern.
2. Decode vs context with a fitted bandwidth line (13): two-parameter fit lands on 147 GB/s against 143 GB/s measured
   independently on Topic: hardware; reproduces a published-elsewhere number from first principles.
3. Throughput-latency curve with engine, load mode and metric selectors (12), points labelled by load level and joined in load order.
4. Goodput under SLO sliders (12): per-request TTFT/TPOT, so goodput is exact, not from percentiles; MLPerf SLOs quoted.
5. Speculative decoding bars per prompt, llama.cpp and MLX, with a cost model from measured step costs (12);
   what-if calculator (acceptance, k) with measured vs flat verify cost (illustrative datacenter ideal).
6. KV memory: measured allocations against the formula, plus sequences-that-fit sliders (11).
7. Quantization bars (decode, prefill, effective GB/s, size) and quality table (PPL, KLD, same top token) (11).
8. Prefill speed vs prompt length (10); batching total vs per-sequence (10); prefix caching bars (9).
9. Engines table at 1/4/16 users; every-run table with exact commands and load (9).
10. Two predict-then-reveal questions (prefill speed; batch of 8).

## Rejected
- GPU utilisation timelines: powermetrics needs root; not measurable here.
- An animated batch scheduler: belongs to the Serving simulator tab (inf-sim), which owns scheduling mechanics.
- Absolute GPU comparisons (M1 vs H100 tokens/s): absolute numbers do not transfer; the Capacity planner owns them.
- vLLM open-loop sweep: at 0.1 to 0.3 requests/s on 4 CPU cores it would hold the shared machine for hours.
- SGLang curves: not runnable here (AMX/x86 CPU backend).

## What the methodology lacked
Measurement pages need a "machine state" column (load average per run) and a rule for failed runs: keep them,
show them, and say what failed (MLX OOM, the first spec run without --spec-type).
