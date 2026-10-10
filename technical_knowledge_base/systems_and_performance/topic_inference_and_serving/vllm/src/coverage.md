# Coverage of the old "vLLM" page

The old page is saved verbatim in the root's `src/read/old/vllm.md` (Notion fetch, 2026-10-08; last edited 2026-09-22).
Every claim is listed with its status and where this page carries it. Status: **verified** (source given), **corrected**
(the source says something else; the page says what the source says), **unconfirmed** (no primary source found; not on
the page as fact), **moved** (belongs to another page, linked). Checks 2026-10-08 against the v0.31.0 tree
(commit db9527a4), the GitHub release notes and the docs. "R s3" = Reading section 3; "FR" = Further reading; "KL" = Knob lab; "ST" = Scheduler stepper.

## Resources
| Old claim | Status | Where now |
|---|---|---|
| vLLM docs, Architecture Overview (entrypoints, engine core, scheduler, model runner) | verified (link 200) | FR, R s1 |
| PagedAttention paper (SOSP 2023), KB paper page | verified | R s3, FR |
| V1 alpha announcement 2025-01-27 | verified (link 200) | R s1, FR |
| vLLM blog: 2026 posts on speculative decoding, decode context parallelism, EAGLE 3.1 | not checked post by post | not on page (blog index only via release notes); speculative decoding is the sibling's |
| Contributing guide; roadmap issues Q1 2026 #32455, Q2 2026 #39749 | guide verified at v0.31.0; roadmap issues not opened | R s8, FR (guide only) |

## What it is
| Old claim | Status | Source | Where now |
|---|---|---|---|
| UC Berkeley origin | verified | README v0.31.0 ("Sky Computing Lab at UC Berkeley") | R s0 |
| Under the PyTorch Foundation umbrella | verified (the root had it unconfirmed) | pytorch.org blog 2025-05-07, "hosted project" | R s0 |
| Default open-source engine, OpenAI-compatible server and LLM class, continuous batching, PagedAttention | verified | README, arch_overview.md | R s0, s1 |
| Broadest model and hardware coverage (NVIDIA, AMD, Intel, TPU, Neuron, CPU) | verified in part (README lists NVIDIA, AMD, Intel, CPUs; others via plugins); "broadest" not measured | README; the root's R s5 table | root |
| Standard rollout engine for RL stacks (verl, SkyRL, TRL) | verified for verl and TRL (TRL supports vLLM 0.21.0 to 0.31.0); SkyRL README links vLLM's RL API post | READMEs/docs fetched 2026-10-08 | R s0 (verl, TRL) |

## Architecture
| Old claim | Status | Source | Where now |
|---|---|---|---|
| entrypoint -> EngineCore (busy loop, own process, ZeroMQ) -> Scheduler -> ModelRunner/Worker per GPU | verified, detailed | core.py L1470, L1754, L1856; core_client.py L1259 | R s1 (animation with file:line) |
| Block size 16, block table per sequence | verified (GPU default 16, cache.py L71); CPU default 128, multiple of 32 | cpu.py L275 | R s3, s5, ST |
| Copy-on-write sharing for beam search and parallel sampling; cheap preemption by swap or recompute | corrected | V1 preemption is recompute only (scheduler.py L1538 to L1580); sharing is by ref counts on hashed blocks; no swap path | R s2, Mistakes |
| Scheduling per step, fresh batch mixing prefill and decode; chunked prefill on by default in V1 | verified | scheduler.py L564; config/scheduler.py L135 | R s2 |
| V1 collapsed prefill/decode phases; token budget {request: num_tokens} | verified | scheduler.py L564 to L573 | R s2 |
| Priority and FCFS policies; preemption by recompute or KV swap | corrected (recompute only) | as above; policy fcfs default L160 | R s2 |
| V1 default since v0.8.x, only engine now | not re-checked (historical); V1 is the only engine in the v0.31.0 tree | tree | not on page |
| Isolated EngineCore, near-zero-overhead prefix caching (hash per block, on by default), persistent batch, piecewise CUDA graphs, multiprocessing API server, torch.compile | verified, updated: default CUDA graph mode is FULL_AND_PIECEWISE at -O2 | compilation.py L606; optimization_levels.md | R s1, s3, s4 |
| Model Runner V2: matured in v0.28.0 (E/P/D disaggregation, weight offloading); default for every model since v0.29.0; V1 deprecated, removal targeted v0.32 | verified | release notes v0.28.0, v0.29.0 | R s4, s7 |
| SP and dual-batch overlap not supported on V2 | updated | v0.30.0 added DBO in eager mode and with FULL graphs; v0.31.0 fallback list: SP with TP > 1, some DBO cases, ngram/suffix/medusa/mlp_speculator/custom_class, elastic EP, mamba "all" (vllm.py L3051) | R s4 |

## Feature set
| Old claim | Status | Where now |
|---|---|---|
| Quantized serving formats (FP8, NVFP4/MXFP4, AWQ, GPTQ, GGUF, bitsandbytes, compressed-tensors; FP8 KV) | not re-checked format by format; bitsandbytes is an out-of-tree plugin since v0.28.0 (verified) | moved: Quantization and Precision; R s7 (bitsandbytes) |
| Speculative decoding: EAGLE-3/3.1, MTP, draft models, n-gram; DSpark adaptive verification; v0.28.0 DSpark confidence-scheduled verification, adaptive token budget about 60% better DSpark TTFT, DFlash2; v0.29.0 per-request acceptance stats and adaptive verification for logprobs | verified in release notes (v0.28.0 #47808, #51725, #52816; v0.29.0 #48915, #52242); EAGLE 3.1 co-development not checked | moved: Speculative decoding sibling; R s7 lists the acceptance-stats flag |
| Decode context parallelism, about 3x throughput on long-context agentic workloads | unconfirmed (not in the release notes) | not on page |
| v0.28.0 DCP for Kimi-K3, FlashKDA, combined all-gathers 1.5-3x kernel-level | verified (release notes) | not on page (model-specific; noted in R s7) |
| v0.29.0 fused MXFP4 top-k about 5% K3 latency; 6.6-7.6x Mamba metadata; fused experts with adaptive selection for DeepSeek V4 | first two verified; the third only partly (adaptive top-k width re-landed, shared experts fused into MegaMoE) | not on page (model-specific) |
| Parallelism TP, PP, EP, DP attention | verified (tree) | moved: Distributed sibling |
| KV connector API (NIXL, LMCache, Mooncake), llm-d, Dynamo, production-stack | verified (tree, docs) | moved: Distributed and Production siblings; R s7 upgrade checklist mentions shared caches |
| Structured output (xgrammar default, guidance), tool calling, reasoning parsers | verified (README) | moved: Production sibling |
| RL features: in-place weight sync, KV reset, sleep/wake | verified (async_llm.py sleep/wake_up, reset_prefix_cache; v0.29.0 RL weight sync notes) | not on page beyond R s0 |
| Hybrid Mamba, MLA, sliding window, vLLM-Omni; DeepSeek-V4 sparse MLA end to end (v0.28.0); Hy4-preview 770B, Qwen3.8-Flash-Next (v0.29.0) | verified in release notes | not on page (model support) |
| v0.28.0 hardware: ROCm DeepSeek-V4/Kimi-K3, Intel XPU torch linear with blockwise GEMM, FlashInfer XQA on SM12x, CPU MLA backend | verified (v0.28.0 "Hardware & Performance") | not on page |
| Rule of thumb vs SGLang and TensorRT-LLM | opinion; not measured | root's engine table; siblings |

## Upgrade notes
| Old claim | Status | Where now |
|---|---|---|
| v0.29.0: 594 commits, 277 contributors, 91 new; MRV2 default; ten architectures removed; models moved to Transformers backend; PyAV removed | verified | R s7 |
| v0.28.0: 584/270/76; max_num_batched_tokens doubles 8192 to 16384 for any deployment that never set it | **corrected**: PR #51726 only adds a tier for GPUs with >= 160 GiB; H100/H200 API server stays 8192 (arg_utils.py L2858 to L2887) | R s5, s7 (correction box), Mistakes |
| v0.28.0: bitsandbytes plugin; Transformers 5.15.0; calculate_kv_scales and override_attention_dtype removed | verified | R s7 |

## Contributing
| Old claim | Status | Where now |
|---|---|---|
| fork, `uv pip install -e .`, pre-commit | corrected: Python-only work uses `VLLM_USE_PRECOMPILED=1 uv pip install -e .` | R s8 |
| PRs need tests | practice, not a stated rule in the guide | R s8 note |
| >500 LOC needs an RFC | verified (excluding kernel/data/config/test) | R s8 |
| Status updates every 2-3 days; ping after 7 | verified | R s8 |
| Good first issues, roadmap issues, CI fixes | good first issue link verified; roadmap issues not opened | R s8 |
| Model support template under vllm/model_executor/models/; scheduler and KV cache manager readable (vllm/v1/core/sched/, kv_cache_manager.py); kernels under csrc/ and vllm/attention/ | verified paths exist except vllm/attention/ (attention now under vllm/v1/attention/) | R s8, s2, s3 |
| Slack, office hours | not checked | not on page |

## Added on this page (not on the old page)
DCO and the AI-assisted contribution rule; the CPU backend's forced multiprocessing executor, async scheduling off, V1 model runner;
the eviction-counter patch with tests (baseline 373 passed + new test failing, patched 374 passed); the recorded scheduler traces;
the knob sweeps and live metrics; kv_cache_usage_perc excluding cached free blocks; the Qwen3 chat-template prefix-cache miss.
