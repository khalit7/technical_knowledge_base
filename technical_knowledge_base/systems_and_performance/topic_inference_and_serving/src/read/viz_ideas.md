# Reading tab: visuals built and rejected

Question the page keeps returning to: what does one more token, one more user, one more GPU cost, and what runs out first?

## Built (score out of 14 on the Methodology's questions; reproduce and computable count double)
| # | Visual | Where | Score | Why it earns its place |
|---|---|---|---|---|
| 1 | Request lifecycle, step animation (arrive, tokenize, queue, prefill, first token, decode, done) with a Gantt of stages, KV held and tokens streamed; counters clock, tokens, KV, bytes read, FLOPs | Section 0 | 10 | The whole page in one picture; ties TTFT, TPOT and E2E to their causes; derived from the planner so it matches its numbers |
| 2 | Prefill against decode on the same weights (before/after): layer groups read, tokens riding on the read, arithmetic busy bar 99% against 1% | Section 1 | 12 | The single most important fact of serving, shown rather than stated; intensities 3,956 against 2.0 FLOP/byte against the H200's 412 |
| 3 | KV cache per conversation for eight real models, context slider, BF16/FP8, conversations that fit on 8 x H200 | Section 2 | 11 | Recomputes every model's KV from config.json; shows MLA and sliding windows beating size; one slider makes the concurrency ceiling concrete |
| 4 | Prefix caching off/on (before/after): four requests, blocks to scale (125 tokens per square), hash hits, tokens computed, prefill time, GiB stored | Section 2 | 10 | The bench measures the effect; this shows the mechanism (hash per block, refcount); the bench tab defers to the Reading for it |
| 5 | Batching bars: derived H200 curve (B = 1 to 141) with step time and per-user speed, beside measured M1 Pro llama-batched-bench | Section 3 | 9 | Throughput against per-user speed in one view; derived against measured, with the reason they differ (per-sequence cost on the laptop) |
| 6 | Speculative decoding, target alone against draft + verify (before/after) on one 12-token answer | Section 6 | 9 | Shows why passes fall and what is paid; the warning box carries the measured slow-down and the non-identical MLX outputs |
| 7 | Five ways to use several GPUs: switchable diagram of what each GPU holds and what crosses the wire | Section 7 | 7 | One picture per scheme beside a comparison table; static because nothing moves per step that the table does not say |
| 8 | Round-robin against prefix-aware routing (before/after): eight requests, three replicas, hits and prompt tokens computed (13,000 against 7,800) | Section 9 | 9 | Makes the (N-1)/N miss rate and the load trade-off visible; illustrative traffic, derived prefill cost |
| 9 | Three predict-then-reveal questions (FLOPs against bandwidth; static batching; GPU against API price) | Sections 1, 3, 10 | 8 | Each corrects a misconception; none repeats the bench's own predict question (pp against tg) |

## Rejected
- Static against continuous batching animation, and contiguous against paged allocation: built on the Serving simulator (its section 1); linked instead.
- A streamed-token timeline of one request alone and under load: built on the Engine bench; the Reading quotes its numbers (TTFT 0.96 s, mean TPOT 43.9 ms, median gap 31.4 ms, longest 803 ms) to define the metrics.
- Chunked prefill stall animation: built on the Serving simulator (section 3).
- Speculative decoding speed-up calculator: built on the Engine bench with measured verification costs.
- Goodput chart and throughput-latency curve: built on the Engine bench and the Capacity planner.
- Memory budget bars per GPU and BF16/FP8, TP 1/TP 2 before/after: built on the Capacity planner.
- A roofline chart: owned by Topic: hardware's Roofline lab and Performance math.
- Engine feature matrix with dozens of flags: dates fast, and a root should compare on a few axes; kept to one table of five columns.

## What the Methodology lacked here
A root built after its data tabs must avoid repeating their visuals: the rule used was "the tab shows the measurement or
the lab; the Reading shows the mechanism once, with the tab's numbers quoted". Worth adding to the method as a lesson.
