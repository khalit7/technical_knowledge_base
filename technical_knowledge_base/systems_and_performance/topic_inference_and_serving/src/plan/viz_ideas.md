# Capacity planner: visual ideas, data and checks

Central question: for a given model, GPU and traffic, how many GPUs keep TTFT and TPOT inside their targets, what does that cost per million tokens, and when is an API cheaper?

## Built (scores 0 to 2; reproduce and computable count double)

| # | Idea | Placement | Moves | Reproduces | Computable | Beyond prose | Misconception | Animation | Score |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Memory on one GPU: weights, activations, other, KV pool, reserve, to scale, with sequences that fit | section 1 | 2 | 2 (x2: 9.08 GB FP8 checkpoint) | 2 (x2) | 2 | 2 (the cache, not the weights, sets concurrency) | 0 | 16 |
| 2 | One step broken into bytes, FLOPs, communication, overhead; decode step against a step carrying a prompt chunk | section 2 | 2 | 1 | 2 (x2) | 2 | 2 (decode stalls behind prefill) | 0 | 13 |
| 3 | Throughput against TPOT and p99 TTFT for one copy, targets dashed, the knee visible, operating point marked (simulated) | section 3 | 2 | 2 (x2: MLPerf server points) | 2 (x2) | 2 | 2 (latency is flat until it is not) | 0 | 18 |
| 4 | Fleet and cost per million input and output tokens at the average load | section 4 | 2 | 1 | 2 (x2) | 1 | 2 (paying for the peak all day) | 0 | 12 |
| 5 | Self-host against API, dollars per hour against average traffic, break-even point | section 5 | 2 | 1 | 2 (x2) | 2 | 2 (self-hosting is not cheaper by default) | 0 | 14 |
| 6 | Before/after animation of the same deployment: BF16 to FP8 weights, FP16 to FP8 KV, TP 1 to 2; memory filling, sequences packing, a step timed, the fleet | own card | 2 | 1 | 2 (x2) | 2 | 2 | 2 | 15 |
| 7 | Calibration table: fitted and unfitted rows against MLPerf v5.1 logs, transfer of constants across GPUs and engines | table | 0 | 2 (x2) | 2 (x2) | 2 | 2 (one efficiency for every GPU) | 0 | 14 |
| 8 | Seed spread of the simulation at the calibration points | table | 0 | 0 | 2 (x2) | 1 | 1 | 0 | 6 |
| 9 | MLPerf single-node results per GPU, by model, with two takeaways computed from the data | table | 1 | 2 (x2) | 2 (x2) | 1 | 2 (software moves these numbers) | 0 | 12 |
| 10 | M1 Pro calibration against the Engine bench tab's llama.cpp runs, and what transfers | details | 0 | 2 (x2) | 2 (x2) | 1 | 1 | 0 | 10 |

## Rejected
- A closed-form queue (M/D/1 plus Erlang C) for TTFT and TPOT: built first and checked against a step-by-step simulation; it matched at moderate load but put prefill in separate steps, which made TPOT too low and TTFT too high exactly where MLPerf's TensorRT-LLM run sits (600 sequences per GPU, every step carrying prompts). The page simulates instead; the fluid limit stays for the offline ceiling.
- Rebuilding the parent's serving frontier (per-user against total tokens per second): Performance math owns it; linked.
- A per-chip cost leaderboard: prices differ by provider and contract (DigitalOcean on demand against reserved differs by 30%); the planner shows one dated list price per chip, editable, with the others in the note.
- Calibrating on Llama 2 70B, gpt-oss-120b or DeepSeek-R1 MLPerf runs: their mean input lengths are not published in the sources read (only output lengths), so they are shown as published numbers, not fits.
- Speculative decoding and disaggregated prefill in the planner: the Serving simulator and Reading tabs own them; the model note says they are not modelled.

## Data and sources (fetched 2026-10-08 unless said)
- Model shapes: config.json files (inputs/), the parent's seven plus Qwen3 0.6B, 1.7B, 4B, 8B, 30B-A3B, gpt-oss-20b, DeepSeek-R1.
- Chips: the parent's `model.py` (shared facts, 2026-10-05) plus the L40S product page.
- Prices: Lambda, DigitalOcean, RunPod, Hot Aisle pages; API prices from OpenRouter's endpoints API (lowest and median provider).
- Engine defaults: vLLM v0.31.0 source (cache.py L71, L103; arg_utils.py L2858-2890).
- Calibration: MLPerf Inference v5.1 result logs and run scripts (Red Hat vLLM 0.10.0 on H100 and L40S; HPE TensorRT-LLM on 8x H200); Red Hat's write-up for the 778-token mean input; SGLang's DeepSeek-V3 blog as an unfitted check.
- M1: the Engine bench tab's llama-bench, llama-batched-bench and llama-server Poisson runs (snapshot in inputs/m1_bench_src.json).

## Checks
- `check_plan.mjs`: 901 numbers, JavaScript equals Python (worst relative difference 3e-15), including the simulation.
- `check_embed.py`: embedded data equals the reference files; 19 prose numbers recomputed.
- Fitted by construction: Offline throughput and mean server TPOT per run. Independent: Server throughput inside the targets (+2.7% H100, +20% L40S, +1.7% H200), median TTFT (H100 within 36%), another submitter's single H200 (+6%), SGLang decode per GPU (planner +71%, H100 vLLM constants).

## What the methodology lacked
- A rule for calibrating a model with free constants: fit each constant to one published quantity, say which, and show every other quantity as an unfitted check, including the constants carried to other hardware.
- A rule for simulated results: fix the random stream, share it between the reference and the page, and publish the seed spread next to the results.
