# Coverage of the old page

The old Notion page "Inference techniques: what actually makes serving fast" (id 3c65c17b0d0d819db53bd2c48909e5b2, last
edited 2026-09-22) is saved verbatim in the parent's `src/read/old/inference_techniques.md`. This page reuses its id with a
narrower subject; every claim was treated as an unverified note. Status: **verified** (source and date), **corrected**
(the source says something else; the page says the correction), **unconfirmed** (not on the page), **moved** (belongs
to another page, which owns it). All checks 2026-10-08. "R s3" means Reading section 3.

## Claims this page owns
| Old claim | Status | Source | Where now |
|---|---|---|---|
| Continuous batching (Orca's iteration-level scheduling) admits and evicts every decode step; all modern engines do it (vLLM, TensorRT-LLM in-flight batching, llama.cpp `-cb`) | verified; mechanism expanded | Orca OSDI 2022 sections 3 to 4; llama-server help: continuous batching on by default (parent FACTS); vLLM scheduler.py | R s1 |
| Order-of-magnitude throughput win over static batching | verified as the authors' figure | Orca: 36.9x vs FasterTransformer on GPT-3 175B at the same latency | parent R s3 (not repeated) |
| PagedAttention: blocks of 16 to 64 tokens allocated on demand, per-sequence block tables | corrected | vLLM default block size 16 (cache.py L71); the paper found 16 to 128 best on ShareGPT and 16 or 32 on Alpaca (section 7.2); "16 to 64" is not a range any source gives | R s2 |
| Contiguous preallocation wasted 60 to 80% of KV memory | verified, restated | PagedAttention Fig. 2: 20.4% to 38.2% of KV memory held token states in its Orca baselines (so 61.8% to 79.6% wasted); breakdown by waste type transcribed | R s2 |
| PagedAttention enables copy-on-write sharing for parallel sampling and beam search | verified, numbers added | section 6.3: 6.1% to 9.8% (parallel) and 37.6% to 55.2% (beam) memory saving on Alpaca; 16.2% to 30.5% and 44.3% to 66.3% on ShareGPT | R s2 |
| ... and cheap preemption/swap | corrected | vLLM v1 (v0.31.0) preempts by recompute only; swap was removed; the paper measured recompute and swap comparable for 16 to 64-token blocks (section 7.3) | R s6 |
| vLLM ran 2 to 4 times bigger effective batches than 2023 baselines | corrected | the paper reports 2 to 4 times the throughput (not batch size) of FasterTransformer and Orca at the same latency, its own measurement | R s2 |
| The cost is an indirection in the hottest kernel | verified | block table in vLLM's FlashAttention metadata (flash_attn.py L520) | R s2 |
| Prefix caching: hashed per block (vLLM) or radix tree (SGLang); only the novel suffix is prefilled | verified, detail added | hash_block_tokens L684 (parent hash, tokens, extra keys); full blocks only; lookup stops one token short (kv_cache_manager.py L295); radix_cache.py L553 | R s3 |
| Massive TTFT and compute win on agentic workloads where 60 to 90% of tokens are shared | unconfirmed (no source); replaced by a measurement | Mooncake traces replayed here: unlimited-cache prefix hit rate 55.3% of blocks on tool and agent traffic, 36.6% on conversation, 64.0% synthetic | R s3, Eviction lab |
| Cache-aware routing (SGLang router, Dynamo KV-aware router, llm-d) | moved | owned by LLM serving in production | link in R s9 |
| KV offload tiers (LMCache, Mooncake, Dynamo KVBM) spill cold prefixes to CPU/SSD/object storage | verified for the systems run or read | vLLM v0.31.0 native OffloadingConnector (config/vllm.py L1130), LMCache paper (2510.09665), SGLang HiCache flags, Mooncake paper; Dynamo KVBM left to the distributed page | R s4 |
| vLLM's tiered KV offloading now reaches disk as well as host memory, with custom tier managers | verified (code exists) | `vllm/v1/kv_offload/tiering` (fs, obj, p2p backends) and CachePolicyFactory for external policies, at v0.31.0; not run here | R s4 table |
| Context compression: KV eviction by importance (SnapKV, KVzip, Expected Attention); soft-token compression (LCLM, REFRAG) | verified (framing) | arXiv abstracts 2404.14469, 2505.23416, 2510.00636; LCLM on its own KB page | R s8 |
| Algorithmic vs systems-realisable savings; per-head non-uniform eviction masks rather than shrinks | verified and measured | freeable-block counts in the KV compression experiment | R s8, KV compression tab |
| The one-line control: uniform random eviction matches or beats learned-importance eviction | verified as the authors' scoped claim, and qualified by measurement | Random Attention (2609.03430): reasoning traces, four models, six tasks, keeps the prompt; this page's experiment shows random without the first tokens collapses, and random fails on retrieval where a query-aware score succeeds | R s8 |
| Chunked prefill (Sarathi-Serve) co-schedules chunks with decodes in one token budget; on by default in vLLM V1 | verified | config/scheduler.py L135; Sarathi-Serve abstract numbers | R s5 |
| Levers in order: quantise (FP8), enable prefix caching, raise max batch/KV budget until ITL SLO binds, speculative decoding, chunk prefill, disaggregate | partly kept | the tuning table (R s9) gives each knob's trade and metric; speculation and disaggregation are owned by their pages | R s9 |
| Goodput = requests/s meeting both SLOs | corrected wording | DistServe defines goodput as the maximum request rate served at an SLO attainment goal (for example 90%) per GPU; the per-second count is the simulator's simpler version | R s7 |
| Throughput ceiling per GPU is min(bandwidth roof, compute roof, KV capacity) | verified (framing) | parent's planner | parent (not repeated) |

## Claims other pages own (moved, not repeated here)
| Old claim | Owner |
|---|---|
| Prefill compute-bound, decode bandwidth-bound; bandwidth arithmetic (H100 3.35 TB/s over 140 GB, about 24 tok/s; RTX 5090) | parent root section 1, Performance math |
| Megakernels at batch 1 | parent root section 1 |
| KV caching definition, per-token formula, Llama-3-70B 320 KB/token, 128K context about 40 GB | parent root section 2 (the formula is reused here in section 0) |
| FlashAttention | FlashAttention paper page, Writing kernels |
| Speculative decoding families, DFlash2, DSpark, adaptive budgets (vLLM v0.28.0) | Speculative decoding child |
| P/D disaggregation (DistServe, Mooncake, Dynamo, llm-d, TensorRT-LLM), NIXL/RDMA | Distributed and disaggregated serving child |
| Quantised serving menu (FP8, AWQ, GPTQ, NVFP4/MXFP4, GGUF) | Quantization and Precision; Local and on-device inference; Model formats |
| MQA/GQA/MLA and sliding windows | parent root section 2; Topic: llms architecture pages |
| Best-resources list (kipply, Anyscale, PagedAttention, DistServe, Sarathi-Serve, EAGLE-3) | kept where in scope (Further reading); kipply and Anyscale are on the parent |
