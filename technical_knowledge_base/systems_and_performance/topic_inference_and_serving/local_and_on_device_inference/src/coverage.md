# Coverage of the old page

Old page: "Ollama, llama.cpp, and local serving" (Notion 3c65c17b0d0d81f7a144fe25d799e811, last edited 2026-09-22), saved verbatim by the parent at `../../src/read/old/local_serving.md`. Every claim below is **verified** (source given), **corrected** (the page says what the source says), **unconfirmed** (not stated as fact), or **moved** (owned elsewhere, linked). Checked 2026-10-10. "R s5" = Reading section 5; "FR" = Further reading.

## Best resources
| Old claim | Status | Where now |
|---|---|---|
| llama.cpp repo, llama-server README, GGUF spec, Ollama blog and "new engine" post, HF GGUF types doc, daily.dev guide | verified (links resolve, 2026-10-10) | FR |

## The layering
| Old claim | Status | Source | Where now |
|---|---|---|---|
| ggml -> llama.cpp -> Ollama -> GUIs (LM Studio, Open WebUI) | verified, reworded | repos | R s0 stack |
| Ollama "historically shelled into llama.cpp; since 2025 runs its own ggml-based engine for new models while still using llama.cpp kernels" | corrected | Ollama v0.40.1 source: `llm/llama_server.go` L1-L14 (wraps upstream llama-server b11351 as a subprocess), `server/sched.go` L535-L598 (GGUF -> llama-server, MLX models -> mlxrunner); release notes v0.30.0 (2026-05-13), v0.40.0 (2026-09-25, MLX default on Apple silicon); the own engine was v0.7.0 (2025-05) | R s7 (correction box) |
| LM Studio bundles llama.cpp and MLX behind a GUI | verified | LM Studio 0.4.26 changelog (llama.cpp runtime upstream b11337; mlx-engine) | R s7 |
| Perplexity's Lily: on-device on Apple silicon, better prefill and decode than MLX-LM | corrected | pplx-garden lily docs (2026-09-02): one model (Qwen3.6-35B-A3B), M5 and newer only; decode 1.24-1.31x mlx-lm; prefill 1.13x at 256 tokens but 0.80x at 131K | R s6 |
| Hugging Face 207 WebGPU kernels | verified, qualified | HF blog 2026-09-01: 207 kernels; comparison is per kernel vs ONNX Runtime Web (2.57x geomean), not tokens/s | R s10 |

## llama.cpp
| Old claim | Status | Source | Where now |
|---|---|---|---|
| C/C++, single binary, backends CUDA, Metal, Vulkan, ROCm/HIP, SYCL, CPU | verified | README b11146 | R s0 |
| CPU+GPU split via `--n-gpu-layers` | verified | README (`-ngl`, default auto) | R s2, s5 |
| "A 2026 kernel overhaul substantially improved CUDA graph usage and Blackwell throughput" | unconfirmed as worded | no change of that name; nearest: NVIDIA blog 2026-01-05 (vendor: +35% MoE tg in llama.cpp) and a series of CUDA-graph PRs | not stated |
| llama-server endpoints: chat, completions, embeddings, reranking, Anthropic route, web UI | verified | README; PR #17570 (2025-11-28) | R s5 |
| `-np` slots, continuous batching `-cb`, per-slot KV, prompt caching | verified, extended | server.cpp L156-160 (auto = 4 slots, unified KV), arg.cpp, server-context.cpp L1547-1655 | R s5 (measured) |
| Speculative decoding via `-md`, grammar/JSON schema, function calling, LoRA hot-swap, multimodal | verified (features in README); `-md` alone does nothing without `--spec-type` (parent's bench) | README; parent Engine bench | R s5 links speculative sibling |
| Router mode (2026) with load/unload and LRU | corrected date | router mode PR #17470 merged 2025-12-01; LRU scheduler PR #26572 merged 2026-08-07 | R s5 (measured) |
| Lacks PagedAttention-grade KV management, radix sharing, wide EP, high-concurrency throughput; a low-latency small-batch engine | verified as framing | parent's Engine bench (llama-server vs vLLM); unified KV and host prompt cache exist | R s7 choosing table |

## GGUF quantisation
| Old claim | Status | Source | Where now |
|---|---|---|---|
| GGUF single file: weights + tokenizer + metadata + chat template | verified | GGUF spec | R s0; format owned by Model formats |
| Legacy Q4_0/Q5_0/Q8_0: 32-weight blocks, one scale | verified | ggml-common.h L194-256 | R s3 |
| K-quants Q2_K-Q6_K, super-blocks with per-sub-block scales and mins | verified | ggml-common.h L309-368; PR #1684 (2023-06-05) | R s3 |
| Q4_K_M "the classic sweet spot"; Q6_K "near-lossless" | measured | Quant ladder: Q6_K KLD 0.0127 on Qwen3-1.7B (small but measurable); Q4_K_M with imatrix KLD 0.060 | R s4 |
| I-quants IQ1_S-IQ4_XS: imatrix calibrated, lookup-based, best at <=4 bits, slightly slower decode | partly corrected | i-quants do not all require an imatrix (only IQ1, IQ2, IQ3_XXS: llama-quant.cpp L822-840); speed measured | R s3, s4 |
| MXFP4 GGUFs (gpt-oss), ternary TQ types | verified | PR #15091 (2025-08-05); PR #8151 (2024-09-06) | R s9 |
| Bonsai 2 27B: ternary of Qwen3.8 27B, 1.76 bpw, 5.9 GB, 98.2%, 262K, Apache 2.0, CUDA and MLX | verified as vendor claims, qualified | Prism ML 2026-09-17; model card: files 1.75 bpw (5.95 GB) / 2.13 bpw; 98.2% over 14 benchmarks; needs Prism forks | R s9 |
| "4-bit costs about 0.6 GB per billion parameters" | verified for Qwen3-4B (0.62), low for Qwen3-1.7B (0.74: its checkpoint carries a separate output matrix) | measured Q4_K_M files | R s4 box |
| Quality cliff below about 3 bits for dense models | verified, measured | ladder: Q2_K without imatrix, IQ2, IQ1 | R s4, s9 |
| MoE tolerate quantising experts harder than attention | unconfirmed (not measured; no MoE here) | llama.cpp's MXFP4_MOE recipe keeps non-expert tensors at Q8_0 (llama-quant.cpp), consistent but not proof | not stated as fact |
| Prefer a bigger model at Q4 over a smaller one at Q8 | verified here | ladder: Qwen3-4B Q4_K_M vs Qwen3-1.7B Q8_0 at similar size | R s4 predict |

## Ollama
| Old claim | Status | Source | Where now |
|---|---|---|---|
| `ollama run`, registry with Modelfile layers, VRAM residency, keep-alive, OpenAI-compatible API on :11434 | verified | Ollama docs v0.40.2; envconfig/config.go | R s7 |
| Own engine for multimodal/new architectures | corrected (see layering) | | R s7 |
| Vulkan on by default | verified as docs state; version unconfirmed | docs/gpu.mdx v0.40.2 | not stated (not local-relevant beyond mention) |
| NVIDIA-tuned kernels upstreamed with llama.cpp | unconfirmed | | not stated |
| MLX backend on Macs | verified | v0.19.0 preview, v0.40.0 default | R s7 |
| Tool calling, structured outputs, thinking toggles, embeddings | verified (docs) | | R s7 (summarised) |
| Ollama Cloud `:cloud` tags route big models to hosted GPUs | verified | blog 2025-09-19, v0.12.0; v0.18.0 auto-connect | R s7 |
| Perplexity Portable Computer on Windows, 24 GB+ NVIDIA, cloud fallback | verified by press only (Perplexity page not retrieved) | TechRepublic, The New Stack (2026-09) | not on page (product news, not local inference practice) |
| Conservative context defaults, check num_ctx | verified, made precise | 4k/32k/256k by VRAM since v0.15.5 (config.go L338) | R s7 table |
| Single-user orientation | verified | OLLAMA_NUM_PARALLEL default 1 (config.go L277) | R s7 |

## Dual RTX 5090
| Old claim | Status | Source | Where now |
|---|---|---|---|
| 2 x 32 GB GDDR7, ~1.79 TB/s each | verified | NVIDIA whitepaper | R s8 |
| What fits (70B Q4 across both, 32B FP8 on one, 100B+ MoE at 4-bit across both, 8-14B BF16) | recomputed | Fit and speed tab (parent planner shapes); gpt-oss-120b as released ~65 GB does not fit in 64 GB without CPU experts (corrected) | R s8, t-fit |
| Bonsai 2 27B 143 tok/s on a 5090, 46.8 on M5 Max | vendor claim; card says 129.9 / 47.0 at batch 1 | | R s9 |
| Decode bandwidth-bound; 32B FP8 ~40-60 tok/s single stream; small models 150-200+ | recomputed | 1792/32.8 GB = 55 ceiling; scoreboard efficiency 64% gives ~35 (derived) | t-fit |
| No NVLink; TP over PCIe works, all-reduce cost noticeable; prefer one model per GPU with a router | verified, extended | product page (NVLink No); NVIDIA forum (no P2P on GeForce); vLLM custom_all_reduce.py | R s8 |
| vLLM FP8 + FP8 KV native on Blackwell SM120 | verified, updated | vLLM v0.9.2 (CUTLASS FP8 SM120), v0.10.1 (block FP8, NVFP4), v0.30.0 (NVFP4 W4A4 default) | R s8 |
| Engine choice: Ollama/llama.cpp for single user, vLLM for concurrency | verified as advice | sections 5, 7, 8 | R s8 setup |

## Parent-coverage items moved here
| Claim | Status | Where |
|---|---|---|
| dlab (Dettmers, 2026-09-21): 450 tok/s Qwen 3.6 35B-A3B at 1.5 bits; 125B on 24 GB; DeepSeek V4.1 550B on a 128 GB MacBook | verified as the author's words; one post, no method, code unreleased | R s9 (labelled author claim) |
| BITCOS (arXiv 2609.16338) | verified | R s9 |

## Added in the 2026-10-11 fix pass
| Claim | Status | Source | Where |
|---|---|---|---|
| Qwen3-0.6B's checkpoint also ships a duplicate `lm_head.weight` (311 MB, 20.7% of its Hugging Face file), not only 1.7B | measured (sibling) | Model formats page, src/results (byte-identical to embed_tokens, 311,164,928 of 1,503,300,328 bytes) | R s3 |
| llama-server batches slots only when their LoRA adapter sets are identical; a request naming no adapter gets every loaded adapter at load scale; 8 users: same adapter 352 tok/s, 2 different 109-127, 4-8 different 83-90 | measured (sibling) | LLM serving in production page, src/exp (server-context.cpp L449-L455, L1708-L1723 at b11146) | R s5 options table |
