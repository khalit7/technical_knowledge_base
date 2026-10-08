# Coverage of the old page

Old root and its six children saved verbatim in `old/` (Notion fetch, read only, 2026-10-08; the root was last edited 2026-09-28).
Every factual claim of the old root is listed below with its status and where the Reading carries it. Status:
**verified** (source and date given), **corrected** (the source says something else; the correction is what the page says),
**unconfirmed** (no primary source found; not on the page), **moved** (verified or not, it belongs to a child and stays there).
All checks 2026-10-08. "R s5" means Reading, section 5; "FR" means Further reading.

## Map, engines and orchestration
| Old claim | Status | Source | Where now |
|---|---|---|---|
| Three layers: engine, server/orchestration, techniques | verified (framing) | n/a | R s5 ("Above the engines") |
| vLLM: default OSS engine, PagedAttention, continuous batching, broad model/hardware coverage | verified | vLLM v0.31.0 README (NVIDIA, AMD, Intel, CPUs; TPU, Gaudi, Ascend via plugins) | R s5 table |
| vLLM under the PyTorch Foundation umbrella | unconfirmed | README says "originally developed in the Sky Computing Lab at UC Berkeley"; foundation not checked | not on page |
| SGLang: RadixAttention, fastest structured output, powers xAI's Grok | partly verified | RadixAttention: arXiv 2312.07104; "fastest structured output" not measured; Grok not stated in the current README | R s2, s5 (Grok omitted) |
| TensorRT-LLM: PyTorch-runtime-first | unconfirmed here | not checked against docs | moved to the NVIDIA child |
| TGI: maintenance mode Dec 2025, repo archived Mar 2026 | verified | README commit 55f7f7cb8, 2025-12-11; GitHub API `archived: true`, last push 2026-03-21 | R s5 table |
| llama.cpp: C/C++, GGUF, CPU/CUDA/Metal/Vulkan | verified | repo README; latest release v0.6.0 (2026-10-05) | R s5 |
| MLX/mlx-lm for Apple silicon | verified | mlx 0.32.3, mlx-lm 0.32.0 (PyPI) | R s5 |
| Dynamo: open, 1.0 in March 2026, engine-agnostic, disaggregation, KV-aware routing, KV offload | verified | GitHub release v1.0.0 2026-03-13; README (KV-aware routing, vLLM/SGLang/TensorRT-LLM backends); latest v1.5.1 | R s5, s7, s9 |
| llm-d: Kubernetes-native around vLLM, donated to CNCF March 2026 | partly verified | llm-d.ai: "a CNCF Sandbox project" (donation date unconfirmed); README: prefix-cache and load-aware routing | R s5, s9 |
| Triton Inference Server: multi-framework, ensembles, dynamic batching; LLM batching delegated to backends | verified | server docs `batcher.md` (dynamic batcher); tensorrtllm_backend README (inflight batcher) | R s5 |
| Ray Serve, KServe run vLLM | verified (docs exist) | docs.ray.io Serve LLM, kserve.github.io | R s5, FR |
| Ollama: llama.cpp-derived, registry, OpenAI API, cloud offload | partly verified | Ollama README lists llama.cpp as its back end; cloud offload not checked | R s5 |
| LM Studio: GUI, MLX + llama.cpp | verified (site) | lmstudio.ai | R s5 |
| Dual RTX 5090 box | personal context | n/a | local child |

## Techniques
| Old claim | Status | Source | Where now |
|---|---|---|---|
| KV caching makes decode O(1) per token in work, VRAM grows with context and batch; KV caps batch | verified | formula; planner | R s1, s2 |
| Continuous batching worth about an order of magnitude | verified | Orca 36.9x (OSDI 2022); Anyscale 23x (2023-06-22, vendor) | R s3, FR |
| PagedAttention removes the 60-80% waste of contiguous buffers | verified, reworded | PagedAttention Fig. 2: only 20.4%-38.2% of KV memory held tokens (so 62%-80% wasted) | R s2 |
| Prefix caching: 60-90% of input tokens shared on agentic traffic | unconfirmed | no source given | not on page (mechanism and measured 19x TTFT instead) |
| Speculative decoding lossless; EAGLE-3 acceptance above 0.8 | lossless: verified (Leviathan et al.); acceptance 0.8: unconfirmed (EAGLE-3 abstract gives speedups up to 6.5x, 1.38x throughput at batch 64 in SGLang) | arXiv 2211.17192, 2503.01840 | R s6 (with the measured caveat) |
| MTP heads ship with frontier MoE models | verified for DeepSeek-V3 (MTP); vLLM supports MTP (speculative.py) | vLLM source | R s6 |
| Gains shrink as batch grows | verified (mechanism; EAGLE-3 1.38x at batch 64) | arXiv 2503.01840 | R s6 |
| llama.cpp prompt lookup cut drafting from 165.48 us to 1.18 us per token, about 42x (Sep 2026) | corrected | PR #30061 (opened 2026-10-06, still open): 165.48 to 6.47 us per drafted token, 25.6x, at a 541 MB static n-gram cache, CPU only, M4 Pro; not merged | not on page (unmerged) |
| Chunked prefill co-schedules chunks in a per-step budget; on by default in vLLM V1 | verified | vLLM v0.31.0 config/scheduler.py L135; Sarathi-Serve | R s4 |
| P/D disaggregation, KV over RDMA, meets TTFT and ITL together | verified | DistServe, Splitwise, Mooncake abstracts | R s7 |
| FP8/INT4 cut bytes per token; accuracy must be measured | verified, measured here | Engine bench | R s6 |
| NVIDIA DeepSeek-V4-Pro-0813-NVFP4, made with Model Optimizer, commercial use; AMD NVFP4 build | partly verified | HF card `nvidia/DeepSeek-V4-Pro-NVFP4`: Model Optimizer, "ready for commercial/non-commercial use"; the "0813" name and the AMD build unconfirmed | not on page (model news) |
| MLA: 10-30x smaller KV than MHA | corrected | DeepSeek-V2 abstract: KV cache reduced 93.3% against DeepSeek 67B (about 15x); per-token 70,272 B for DeepSeek-V3 recomputed from config | R s2 |
| GLM-5.3-Flash IndexPool: KV under a quarter at 1M, attention compute about a third; AA index 57 at $0.09/task | unconfirmed at primary source | secondary pages report Z.ai's "4.4x smaller KV cache and 3.0x less attention compute than GLM-5.3"; The Batch and Z.ai notes not fetched; AA figures not checked | not on page (model news, Topic: llms) |
| Single-stream decode ~ bandwidth / bytes per token | verified | planner; measured fit 147 GB/s on M1 | R s1 |
| Three regimes: prefill compute-bound, decode bandwidth-bound, batch 1 launch-overhead-bound | verified (framing), with measured evidence | bench fit t0 2.18 ms of a ~5 ms step; planner 2.5 ms per step | R s1 ("A third regime") |
| Baseten efficient frontier: along vs outward | verified | Baseten blog 2026-09-02 | R s3, FR |
| Cohere megakernel: 292 tok/s at batch 1, 62% of speed-of-light, 1.58x vLLM, through 256K (2026-09-09) | verified, date corrected | Cohere blog dated 2026-09-08, H100 | R s1, FR |
| Cerebras Qwen3.8-27B at 1,500 to 1,850 tok/s (2026-09-04) | corrected | AlphaSignal 2026-09-11: "roughly 1,800" (headline 1,850); 1,500 not found | R s1 |
| TPU v7 megakernels: Kimi K3 over 700 tok/s with speculative decoding; 1.4-2x GB200 without, batch 1-8 (Sep 25) | verified, date corrected | Inferact 2026-09-23: 709 (16x TPU v7) against 452 (16x GB200) with spec decoding | R s1, FR |

## News sections
| Old claim | Status | Source | Where now |
|---|---|---|---|
| DFlash2: drafter for Qwen3.8-27B, up to 3.43x output throughput, vLLM/SGLang/MLX | verified, qualified | HF model card: 3.43x on GSM8K at concurrency 1 against autoregressive (authors) | R s6 |
| DiffusionGemma comparison | unconfirmed here | not checked | not on page |
| Context compression families (SnapKV, KVzip, Expected Attention; soft tokens) and algorithmic vs systems-realisable savings | verified (framing) | LCLM paper page in this knowledge base | R s2 |
| Random Attention matches or beats learned eviction at lower overhead | verified, scoped | arXiv 2609.03430: reasoning models, 4 models, 6 tasks, matches the strongest baseline, 32-43% higher throughput in vLLM | R s2, FR |
| LCLM: 0.6B encoder + 4B decoder, 350B tokens, 5-9x TTFT over KV compression, flat memory 128K-512K on H200 | verified | KB page Latent Context Language Models (3d45c17b...) | R s2 (link) |
| REFRAG 30.75x TTFT | corrected | arXiv 2509.01092: 30.85x | not on page (paper detail) |
| vLLM v0.28.0 (Aug 2026): DFlash2, DSpark, adaptive spec budget, Kimi-K3 DCP, DeepSeek-V4 sparse MLA, MRV2, disk KV offload; max_num_batched_tokens 8192 to 16384 | verified | release notes, 2026-08-26 (584 commits, 270 contributors); note: in v0.31.0 the API server on H100-class GPUs still defaults to 8,192 via `get_batch_defaults` (arg_utils.py), the offline class 16,384 | vLLM child |
| vLLM v0.29.0: 594 commits/277 contributors/91 new; MRV2 default; V1 removal targeted v0.32; acceptance stats; breaking changes | verified | release notes 2026-09-09 | vLLM child |
| vLLM v0.30.0 (Sep 22): 762/315/104; Fast Start ipc_cache; graph capture 12s to 2s, init 28.9s to 8.2s on H200; Gumbel-max watermarking; HiSparse; breaking changes; H20 +21% | verified | release notes 2026-09-22 | R s9 (start-up), vLLM child |
| Reading said vLLM v0.31.0 | verified latest | GitHub releases list: v0.31.0 (2026-10-05) is the newest; it adds `vllm preload` and CRIU engine snapshots | R s5, s9 |
| Hardware-agnostic layers reach up to 96.6% of native on H100 | corrected wording | PyTorch blog 2026-09-22: total token throughput within 3.4% of native, geometric mean over three models | R s6 |
| SGLang v0.5.18: 710 PRs/212 contributors, new models, overlapped checkpoint staging 2.38x faster start, PyTorch 2.13.0/Triton 3.7.1 | verified, qualified | release notes 2026-08-22 (not September): 2.38x is against the plain default (35.6 s vs 84.8 s, Qwen3-32B on H100, opt-in flag), 8.6-11.7% against serial with prefetch | R s9 |
| BITCOS: zeros up to 51.5%, 2 - z bits, 1.485 bits, 26 of 29 models, 1.18x CPU / 1.27x GPU (2026-09-14) | verified | arXiv 2609.16338 (GPUs are Intel Xe2) | moved: Quantization and Precision / Model formats child |
| Bonsai 2 27B: 1.76 bits, 5.9 GB, 98.2% | unconfirmed here | not checked | local child |
| dlab (Dettmers, from 2026-09-21): Qwen 3.6 35B-A3B 450 tok/s at 1.5 bits; Qwen 3.8 Flash Next 125B on one 24 GB GPU; DeepSeek V4.1 550B on a 128 GB MacBook | verified as the author's claims | timdettmers.com 2026-09-21 | moved: local child (practitioner claims, unbenchmarked) |
| DeepSeek V4.1-Flash: KV a quarter of HBM and an eighth of SSD of V4-Flash; prices $0.30/$1.20, off-peak half, cache hits $0.006 | partly verified | changelog 2026-09-10 confirms the release and a price cut; the KV fractions and price figures are not in the changelog text (pricing page not checked) | not on page |
| zartbot breakdown: 890 bytes KV per token, 40 layers, 8B prefill / 16B decode activated | verified as the analyst's figures | zartbot (2026-09-17), independent | not on page (model detail, Topic: llms) |
| AgentX: replays agentic traffic; Vera Rubin 1.4-3x throughput per TCO vs GB300 at 60-100 tok/s; up to 7x per MW; do not quote 67x | partly verified | SemiAnalysis 2026-09-14 (partly paywalled): 1.4-3x at 60-100 TPS confirmed; 7x per MW not visible | R s9 (methodology only) |
| Quick chooser | verified as advice | engine facts above | R s5 |
| Learning path ordering (credited on the old page to Paolo Perrone) | ordering kept; credit unconfirmed | links checked 2026-10-08, all 200 | FR "A learning path" |
| Φ-Bench: Claude Opus 5 36.53%, Kimi K3 28.12%, Qwen3.8-Max 27.73%, Hardware and Edge 5.4% | verified | KB paper page Φ-Bench | not on page (benchmark of models, not serving) |

## Children
The six children were saved verbatim and are not rewritten here: their details stay on them until each is rebuilt
(section 11 maps them). Corrections found while checking that touch them: the llama.cpp drafting figure above; SGLang
v0.5.18's date and the meaning of 2.38x; MLA's ratio; "acceptance 0.8+" for EAGLE-3 unconfirmed; vLLM's
`max_num_batched_tokens` default depends on usage context in v0.31.0.
