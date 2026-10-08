# Serving simulator: visual ideas built and rejected

Question the tab answers: what does each serving mechanism buy, on the same requests, and how far can the model of it be trusted?

## Built
| # | Idea | Where | Why it earns its place | Score notes |
|---|---|---|---|---|
| S1 | **Same 20 requests, animated step by step**, two toggles (static/continuous batching, contiguous/paged KV): a request-by-time Gantt drawn to one time scale for all four settings, a KV map of 80 blocks x 16 slots coloured by request (filled, reserved-but-empty, free, largest free gap), counters, a caption per step generated from the step log, summary table of all four | Section 1 | The before/after Khalid asks for, twice on one input; shows padding rows, waiting rows, stranded reservations and preemption | Reproduces vLLM's decisions in the continuous+paged setting (Check 1); animation point |
| S2 | Two predict-then-reveal questions answered from the runs (last finish time static vs continuous; peak concurrency contiguous vs paged) | Section 1 | Belief first, then the number | |
| S3 | **Lab**: three hardware presets (H100 BF16, H100 FP8 as calibrated, M1 Pro llama.cpp as measured), five traffic scenarios, every engine switch, deployment (1 GPU, 2 replicas, 1P+1D), SLOs; stat tiles; **Compare buttons** that rerun the same requests with one switch flipped and show deltas, plus a "no difference because..." hint | Section 2 | Before/after for every mechanism on identical requests, including the cases where a mechanism does nothing | Every input computable; defaults from vLLM and TensorRT-LLM source |
| S4 | Engine-over-time strip (prefill tokens per step, decoding sequences, KV use, preemption ticks) for current and comparison | Section 2 | Shows chunking, prefill bursts and cache filling | |
| S5 | Per-request TTFT x TPOT scatter with the SLO box (goodput made visible) | Section 2 | Goodput as the share of dots in the box | |
| S6 | **Long prompt against eight decodes**: token-gap step plot for one user, three settings (no chunking, 512, 2,048 per step) | Section 3 | The stall chunked prefill removes, as a plateau | |
| S7 | **Load sweep**: TPOT p50, TTFT p99 (log) and goodput against throughput, 11 rates, goodput peak marked | Section 4 | The knee; the throughput-latency curve every capacity plan needs | |
| S8 | **Validation**: vLLM trace table; predicted-vs-published log-log scatter for ITL, throughput, TTFT (fit rows hollow) with +/-25% lines and full table; M1 server runs measured vs simulated with load averages | Section 5 | A simulator is only worth what its checks show; residuals left visible | Reproduces the NIM table independently on 21 held-out rows (ITL median 7%) |

## Rejected
- A separate disaggregation animation: the Compare button already runs it on the same traffic, and the result (often worse at equal GPUs for short prompts) is better shown as numbers than as a picture implying it always wins.
- Fitting TTFT at moderate concurrency on the NIM table: it would hide a real mismatch (NIM's batching of new prompts is unpublished); left as a stated residual.
- Reserve (GUARANTEED_NO_EVICT) admission for the H100 fit: tried, predicts held-out rows worse; kept as a switch.
- Swap over a modelled PCIe queue: the simple bytes/bandwidth cost already shows why vLLM v1 dropped swap (recompute of a few thousand tokens costs about the same on an H100).
- Tensor parallelism inside the simulator: belongs to the Capacity planner tab; one replica per GPU here.
- Block-by-block KV maps for the lab (tens of thousands of blocks): unreadable; the animation shows the mechanism at toy scale instead.

## What the methodology lacked
A rule for simulators: say which parts are checked against running code (here: the scheduler, step for step), which are calibrated (step time, with fit and held-out rows separated), and which are designs only (static, contiguous, swap, disaggregation), and label each in the page.
