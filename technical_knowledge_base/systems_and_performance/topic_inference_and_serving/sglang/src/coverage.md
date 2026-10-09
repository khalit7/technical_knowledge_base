# Coverage of the old SGLang page

The old page (saved verbatim in `../../src/read/old/sglang.md`, read-only fetch 2026-10-08) was treated as unverified notes.
Every claim below is marked verified, corrected, unconfirmed or dropped, with the source checked on 2026-10-08 and where the HTML carries it.
R = Reading section, T = tab.

| Old claim | Verdict | Source | Where |
|---|---|---|---|
| SGLang paper, NeurIPS 2024: RadixAttention and the frontend DSL | verified | arXiv 2312.07104; SGLang README | R1, Further reading |
| Docs at docs.sglang.io; Structured Outputs page | verified (URLs return 200) | docs.sglang.io | R6, Further reading |
| sgl-learning-materials | verified | GitHub | Further reading |
| XGrammar-2 blog (MLC, May 2026) | verified: 2026-05-04, "up to 80x" compilation speedup (authors) | blog.mlc.ai | R6, Further reading |
| Yotta Labs "What is SGLang?" comparison reading | dropped: a vendor marketing post, superseded by the independent InferenceX data | - | - |
| LMSYS origin, same lineage as Vicuna and Chatbot Arena | verified | README (hosted under LMSYS), paper authors | R1 |
| Organising idea: KV reuse across requests | verified | paper, launch blog | R0, R1 |
| "xAI serves Grok on SGLang" | corrected: README lists xAI among adopters; that Grok is served on it is not stated in any source read | README v0.5.21 | R1 (adopters, labelled the project's claim) |
| Reference engine for DeepSeek MLA/EP serving and many Chinese labs | partly verified: DeepSeek recipes and day-0 posts (LMSYS blog); "many Chinese labs" is the README's adopter list (Baidu, AntGroup, Alibaba, Tencent) | README, LMSYS 2025-05-05 | R1, R9 |
| Radix tree whose edges are token sequences and whose nodes point at paged KV | verified, refined: nodes hold KV slot indices; page size 1 by default | radix_cache.py L249, overrides.py L1280 | R2 |
| A new request reuses the longest matched prefix and prefills the tail | verified, refined: capped at prompt length minus one | schedule_batch.py L1702 | R2 |
| Eviction is LRU on tree leaves | verified, refined: unlocked leaves; lfu, slru, priority, tlru selectable | radix_cache.py L553, memory.py L25 | R2, R7 |
| "A cache-aware scheduler orders requests to maximise hit rate instead of pure FCFS" | corrected: default `fcfs` since v0.4.4 (2025-03-13); `lpm` and `dfs-weight` opt-in; `lpm` off above 128 waiting | schedule.py L82-98; server_args.py at v0.4.3 and v0.4.4; schedule_policy.py L331 | R4 |
| vLLM V1 also has automatic prefix caching (block hash, near-zero overhead) | verified: on by default, SHA-256 block hashes; APC first in vLLM v0.4.0 (2024-03-30) | vllm cache.py L142/L144; vLLM release notes | R0, R1, R3 |
| "Tree + cache-aware scheduling + router still tend to win where 60-90% of input tokens are shared; on unique prompts within noise" | corrected: on the same traces the two caches reuse the same tokens within 1 point (blocks win at tight pools); any edge comes from ordering and routing; "60-90%" unsourced, dropped | src/iso replays of both engines' classes | R3, R4, T Radix lab |
| Frontend DSL (`sgl.gen`, fork/join); most users use the OpenAI-compatible server | verified (python/sglang/lang still ships) | source tree | R1 |
| Constrained decoding via XGrammar (JSON schema, regex, EBNF) | verified; default backend; llguidance and outlines selectable | serving_hook.py L219, choices.py | R6 |
| "Compiled to token masks with microseconds of per-token overhead" | unconfirmed as stated; measured here per output token with and without a schema on the M1 | M1 run | R6, T M1 |
| SGLang pioneered compressed-FSM jump-forward decoding | verified as history (2024-02-05 post) | LMSYS blog | R6 |
| "Scheduling and jump-forward integration still are a differentiator" | corrected: jump-forward removed in v0.4.4 (PR #4032, 2025-03-03); not called anywhere in v0.5.21 | PR #4032; xgrammar_backend.py L167 has no caller | R6, Mistakes |
| XGrammar-2 ~80x faster compilation, default structured backend in SGLang, vLLM and TensorRT-LLM | partly verified: 80x is the authors' compilation figure; default in SGLang verified; integrated in vLLM and TensorRT-LLM per the MLC post; default status there not checked | MLC blog; serving_hook.py | R6 |
| Comparison table: organising idea | verified, kept in spirit | - | R0 |
| Comparison table: prefix caching "core of the scheduler, cache-aware routing" vs "on by default, less cache-driven" | corrected: both default to FCFS; cache-aware ordering is opt-in in SGLang | as above | R0 table, R4 |
| Comparison table: structured output "deepest integration, jump-forward" | corrected (jump-forward removed) | PR #4032 | R0 table, R6 |
| Comparison table: "model/hardware coverage narrower, NVIDIA/AMD focus" vs vLLM "broadest" | corrected for SGLang: NVIDIA, AMD, TPU (SGLang-Jax), Ascend, Intel XPU and CPU, Moore Threads, Jetson, Apple MLX (docs/hardware-platforms); "broadest" for vLLM unconfirmed, dropped | docs tree v0.5.21 | R1, R11 |
| Comparison table: overlapped CPU scheduling vs V1 engine core | verified, refined: both overlap (SGLang overlap scheduler; vLLM async scheduling) | scheduler.py L1941; root FACTS | R0 table, R5 |
| Comparison table: MoE at scale, reference for DeepSeek EP | verified (vendor posts) | LMSYS 2025-05-05, 2025-09-25 | R9 |
| Comparison table: ecosystem (Grok, DeepSeek recipes, spec-bench leaders; vLLM default in RLHF stacks, llm-d, clouds) | partly: README lists RL frameworks using SGLang (AReaL, Miles, slime, verl, ...); "spec-bench leaders" unconfirmed, dropped | README | R1 |
| "Performance folklore (2026): SGLang leads by ~20-30% on prefix-heavy small/mid models; at 70B+ a few percent" | dropped: no source; replaced by independent InferenceX data with its caveats | InferenceX API | T SGLang vs vLLM |
| Serves Grok; AMD day-0 MI support; LinkedIn, Cursor | partly: README adopters list includes AMD, LinkedIn, Cursor; Grok unconfirmed | README | R1 |
| Co-development with NVIDIA Dynamo (P/D) and LMCache/Mooncake KV offload | verified: Dynamo lists SGLang as a backend (root FACTS); Mooncake and NIXL are SGLang's PD transfer engines; LMCache integration in the cache registry | pd_disaggregation docs; registry.py L103 | R7, R9 |
| SGLang router does cache-aware load balancing | verified, with defaults and algorithm | cache_aware.rs, main.rs | R8 |
| Speculative decoding: EAGLE-2/3, MTP, DFlash | verified as supported algorithms (EAGLE, EAGLE3, NEXTN, STANDALONE, NGRAM, DFLASH, DSPARK, UNO); "frequently top of spec-decode benchmarks" unconfirmed, dropped | fields/spec.py L30 | Further reading (owned by the Speculative decoding page) |
| Governance: community project under LMSYS non-profit | verified | README | R1 |
| "Slower-moving than vLLM on long-tail model support, faster on frontier recipes" | unconfirmed, dropped | - | - |
| v0.5.18 (September 2026): 710 PRs, 212 contributors, PyTorch 2.13.0 / Triton 3.7.1, new models, TP LMHead, FlashInfer, overlapped checkpoint staging 2.38x faster start | corrected by the root's coverage: released 2026-08-22; 2.38x is the opt-in flag against the plain default (35.6 s vs 84.8 s, Qwen3-32B, H100) | release notes | Further reading (release notes) |
| Day-zero support for new open releases (Qwen-Image-2.1) | verified: Qwen-Image 2.1 listed in v0.5.21 new models | release notes v0.5.21 | not on page (a model list; release linked in Further reading) |
| When to choose it | rewritten from this page's evidence | - | R10 |
| See also: vLLM and Inference techniques pages | kept, as the vLLM and Batching children | - | Further reading |
