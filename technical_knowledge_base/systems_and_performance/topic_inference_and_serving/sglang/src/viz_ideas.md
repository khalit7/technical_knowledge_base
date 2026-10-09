# Visual ideas: SGLang child page

Central question: what does SGLang do with the KV cache that vLLM does not, and does it show up in measurements?

| # | Idea | Placement | Score (0-2 each: parameter, reproduces, computable, beyond a sentence, corrects a misconception, central, absent elsewhere; x2 on reproduce and computable) | Status |
|---|---|---|---|---|
| SG1 | Eight toy requests through the radix tree, then through hash blocks of 4: match, split, lock, insert, evict, to token scale, with counters (reused, evicted, nodes or blocks, slots) | Reading s2 | 2,1x2,2x2,2,2,2,2 = 17 | built (before/after animation) |
| SG2 | Same traces, two caches: share reused per trace at a chosen pool | Reading s3 | 2,2x2,2x2,2,2,2,2 = 18 | built |
| SG3 | Radix lab: trace x pool size, live; hit share against pool size curve; per-request difference strip | Tab | 2,2x2,2x2,2,2,2,2 = 18 | built |
| SG4 | Queue policies over 10 arrival orders (mean and range) | Reading s4 | 2,1x2,2x2,2,2,2,2 = 17 | built |
| SG5 | Scheduling lab: four policies on one queue, round-by-round animation with the queue order and cached share of each document, fcfs against lpm on the same input | Tab | 2,1x2,2x2,2,2,2,2 = 17 | built (before/after animation) |
| SG6 | Overlap loop: CPU and GPU lanes for five steps, plain against overlap, durations derived from the M1 runs | Reading s5 | 1,1x2,2x2,2,1,1,2 = 14 | built (before/after animation) |
| SG7 | SGLang on the M1: bug reproduction table, split-prefill numerics, policies, cache on/off TTFT by turn, overlap, JSON schema | Tab | 1,2x2,2x2,2,2,2,2 = 17 | built |
| SG8 | InferenceX trade-off curves (throughput per GPU against per-user speed) for both engines, per GPU, precision and prompt length, with matched-concurrency table and the vendor-claims table | Tab | 2,2x2,2x2,2,2,1,2 = 17 | built |
| SG9 | Router simulation (cache_aware against round robin on N replicas) | - | belongs to LLM serving in production, which measures a real router | rejected (owned by a sibling) |
| SG10 | Jump-forward compressed-FSM animation | - | the feature was removed in v0.4.4; would teach something no current release does | rejected |
| SG11 | DeepSeek 96-GPU deployment diagram with numbers | - | vendor numbers only, nothing to move; a table carries them | rejected (table instead) |
| SG12 | HiCache tier simulator | - | needs bandwidth and hit models not measured here; Batching child owns offload tiers | rejected |
| SG13 | Grammar token-mask visual over Qwen3's vocabulary | - | a static fact; the measured overhead says more | rejected |

Inspiration: the RadixAttention launch post's nine-step tree figure (LMSYS 2024-01-17), the SGLang paper's Theorem 3.1, InferenceX's dashboard (throughput per GPU against interactivity), the root's Serving simulator validation approach (port checked step by step against the real classes).

What the methodology lacked here: a rule for when the product under study is buggy on the test platform. Done here: reproduce, find the upstream issue and fix, apply it, report both states, and add a correctness check (A/B/A greedy) before timing anything.
