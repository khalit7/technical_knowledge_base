# Visual ideas: vLLM child page

The question the page keeps returning to: **what does vLLM's code actually do with my traffic, and which knob changes it?**
Scores 0 to 2 on: parameter to move, reproduces a source, computable from public/real data, shows what a sentence cannot,
corrects a misconception, measures the central question, absent elsewhere, animation (before/after). Build cost subtracted.

| # | Idea | Placement | Score | Status | Data |
|---|---|---|---|---|---|
| VL1 | **Scheduler stepper**: vLLM v0.31.0's real scheduler and block pool recorded while the real engine serves Qwen3-0.6B; every block's ref count and hash, the free queue in order, queues, the step's budget, request text; runs: prefix caching off and on (before/after on identical arrivals), big budget, tight memory | Own tab | 14 | built | `stepper/inputs/trace_*.json` from `record.py` |
| VL2 | **Request path animation**: one request through API server, ZeroMQ, engine core threads, scheduler, model runner and back, each step linked to file and line; counters for process hops and messages | Reading s1 | 11 | built | source at v0.31.0 |
| VL3 | **Sync against async scheduling** timelines (CPU and GPU lanes, GPU busy %) | Reading s1 | 9 | built (durations illustrative, mechanism from source) | core.py L670, vllm.py L592 |
| VL4 | **Real hash chains**: two requests' blocks side by side with their real SHA-256 prefixes and text; where they meet and part (found the Qwen3 template miss) | Reading s3 | 11 | built | stepper recordings |
| VL5 | Predict-then-reveal: process count, budget split, preemption victim, full-sequence admission, test_evict free order, MRV2 fallback, KV tokens from VLLM_CPU_KVCACHE_SPACE | Reading | 10 | built | source, unit test, server log |
| VL6 | **Knob lab**: max_num_seqs, chunk budget and cache size swept on the live CPU image, two repetitions each, load average recorded | Own tab | 12 | built | `knob/results/` |
| VL7 | Metrics time series from a 1-second /metrics scrape (running, waiting, KV usage, preemptions, generation rate) | Knob lab | 10 | built | scrapes |
| VL8 | Every exported metric, before and after a run, with what it tells you | Knob lab | 9 | built | /metrics |
| VL9 | The patch's diff, test results and the new metric live | Reading s8, Knob lab | 10 | built | patch/ |
| VL10 | Per-hardware default table for max_num_batched_tokens and max_num_seqs | Reading s5 | 8 | built (table) | arg_utils.py L2829 |
| VL11 | In-browser re-implementation of the scheduler | rejected: the root's Serving simulator already is one, checked against this code on 10 traces; this page records the real thing instead |
| VL12 | MRV2 persistent batch animation (row reordering V1 against fixed rows V2) | rejected for now: not runnable here (CPU uses V1) and the design doc's own figures cover it; a table instead |
| VL13 | GPU throughput charts of V1 against V2 | rejected: no independent measurement found; vendor figures only in release notes |

What the methodology lacked: a rule for recording a real system's internal state as the data of a visual (here: wrapping two
methods to snapshot objects each step). It worked well and is reusable for SGLang's radix cache.

## 2026-10-23 rebuild to the teaching contract
| # | Idea | Placement | Status |
|---|---|---|---|
| VL14 | **Hero**: static annotated diagram of the API server, the engine core (loop, scheduler, KV cache manager and block pool) and the GPU worker, each knob drawn where it acts (`23_js_vl_hero.js`) | Reading, top | built |
| VL15 | **Free queue diagram**: allocate at the head, freed unhashed blocks to the front, hashed to the tail, touch unlinks from the middle (`23_js_vl_fq.js`) | Reading s3 | built (blocks illustrative) |
| VL16 | **V1 against V2 runner, toggle on the same event** (B finishes, E joins): V1 fills the empty row then swaps rows so decodes come first, V2 writes one row and gathers (`23_js_vl_mr.js`) | Reading s4 | built; replaces the rejection of VL12 with a static toggle whose moves are V1's code (gpu_input_batch.py L326, L582; gpu_model_runner.py L1135) |
| VL1 | Scheduler stepper | moved from its tab to the end of Reading s3 | moved |
| VL6, VL7, VL8, VL9 | Knob lab sweeps, metrics time series, every metric, patched metric | moved inline: sweeps beside the knob table (s5, headline charts open, the rest in closed blocks), time series in s6, every metric in a closed block in s6, the live patched metric in s8 | moved |
