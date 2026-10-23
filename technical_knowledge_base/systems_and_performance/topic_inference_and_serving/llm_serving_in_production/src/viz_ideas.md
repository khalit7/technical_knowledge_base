# Visual ideas: LLM serving in production

Question the page keeps returning to: when one engine becomes a service, what decides whether users wait, and what does each production lever (routing, autoscaling, fast starts, adapters, constraints, measurement) change, measured rather than asserted?

Scores: quantity the reader controls (0-2), reproduces a stated figure (x2), computable from public or measured data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animation (before/after) point; minus build cost.

## Built
| # | Visual | Placement | Score | Data and checks |
|---|---|---|---|---|
| 1 | **The parent's eight requests replayed on three real llama-server replicas** (before/after animation: round robin against least loaded, SGLang cache-aware, weighted, hash; three scenarios: one at a time with a small and a large host cache, two bursts) | Reading, s1 | 13 | `exp/route_client.py` on `root8*.json`; confirms the parent's 13,000 for round robin and corrects its 7,800 for prefix-aware routing (see coverage.md) |
| 2 | Mooncake-trace routing table, all repeats (hit rate, tokens computed, TTFT p50/p99, busiest replica's share) | Reading, s1 | 11 | `exp/out/measured.json`; per-replica computed tokens equal llama-server's `llamacpp:prompt_tokens_total` |
| 3 | Router lab: every request as a dot by send time and replica, coloured by cache hit; TTFT CDF of every policy | Own tab | 10 | per-request data, repeat 1 |
| 4 | Router lab: hit rate against replica count 1 to 16 at five cache sizes (simulated) with the measured squares | Own tab | 10 | `exp/route_sim.py`; 2,048-token LRU per replica lands within about 2 points of the measured hit rates |
| 5 | **Autoscaling lab**: two HPA-style autoscalers on one spike, animated over 30 minutes (replicas serving/starting, p90 TTFT), presets for metric, cold start and scale-down window | Own tab | 13 | `sim/autoscale.py`; JS port identical on 26,088 numbers (`sim/check_sim.mjs`); inputs from the parent's Capacity planner; HPA rules from kubernetes.io |
| 6 | Predict: GPU utilization at 10% load (96%) | Reading, s2 | 9 | Poisson in-flight count, derived |
| 7 | Cold start: measured start-up per model size, cold (APFS clone, uncached) and warm, plus vLLM CPU start phases from its log | Reading, s3 | 10 | `exp/cold_start.py`, `exp/run_vllm.sh` |
| 8 | Multi-LoRA: aggregate tokens/s with 0, 1, 2, 4, 8 different adapters in a batch on llama-server, and on vLLM CPU | Reading, s4 | 11 | `exp/run_lora_so.sh`, `exp/run_vllm.sh`; llama-server's `can_batch_with` read from source |
| 9 | Structured output: time per token with and without a JSON schema, at 1 and 4 concurrent requests, validity counted | Reading, s5 | 8 | same runs |
| 10 | **Coordinated omission, animated**: the same 5-second SIGSTOP stall under closed and open loop, dots appearing as answers return | Reading, s7 | 12 | `exp/run_co.sh` with the parent's `loadgen.py` |
| 11 | Load-test lab: every request of the stall runs, percentiles of all runs with the HdrHistogram-style correction | Own tab | 9 | `exp/summarize.py` |
| 12 | The production path diagram (client, gateway, router, replicas, metrics, autoscaler), sections marked | Reading, s0 | 6 | static |

## Rejected
- A router served as a separate HTTP proxy: the measurement is identical with the routing done in the client; the proxy would add only code.
- A full GPU-cluster routing simulator with latency: the parent's Serving simulator owns per-replica latency; this page's simulated part stays at hit rates, which the measurement validates.
- Scale-to-zero in the autoscaling simulator: HPA cannot scale from zero on per-pod metrics (no pods, no metrics); said in prose instead.
- A histogram_quantile widget: the Observability page owns it; one measured example in prose.
- Live burn-rate alert simulator: owned by the Observability page.
- vLLM metrics table read live: owned by the vLLM page; names listed with file and line.

## What the methodology lacked here
A rule for experiments on a shared machine where the lock is contended for long periods: queue every run in one script per lock acquisition, record load average with each run, and keep the page's derived claims (simulators) independent of the timing runs.

## 2026-10-23 rebuild: placement and additions
- Moved inline (teaching contract: a visual sits beside the claim it proves): #3's TTFT distribution and #4's replica-count simulation to Reading s2 (#3's per-request dots and the all-repeats table in a closed block); #5 to Reading s3 (presets open, custom panels closed; opens on the final state, never autoplays); #11 to a closed block in s8. The three lab tabs were removed.
- Added: **cost per million tokens against average traffic** (s1, one slider, defaults reproduce the parent's $0.54 and $33.12 independently from its inputs; break-even 67% derived), **cold-start phases on one axis** (s4: measured vLLM CPU phases, NVIDIA's Run:ai test, the running example derived before and after vLLM v0.30), **one adapter set per batch against a mixed batch** (s5, static toggle; the mechanism the measured bars depend on).
- Rejected again: a throughput-latency knee chart for s1 (the parent's Capacity planner and Engine bench draw it; linked); a histogram_quantile chart (the Observability page owns it; the measured example stays in prose).
