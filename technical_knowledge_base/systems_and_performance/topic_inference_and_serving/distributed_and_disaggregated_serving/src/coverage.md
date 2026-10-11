# Coverage of the old page

Old page: "NVIDIA Triton Inference Server, TensorRT-LLM, and Dynamo" (Notion 3c65c17b0d0d8170bd7cdf47af0ec07b, last edited 2026-09-22), saved verbatim by the parent at `../../src/read/old/nvidia_triton_trtllm_dynamo.md` (read-only fetch, 2026-10-08). Every claim below is **verified**, **corrected**, **unconfirmed** (left off the page) or **kept as advice**. Checks 2026-10-09 and 2026-10-10 (GitHub releases API, READMEs and docs at the stated versions; NVIDIA, CNCF and project pages). "R s8" = Reading, section 8; "FR" = Further reading.

## Resources
| Old item | Status | Where now |
|---|---|---|
| Triton docs and repo | verified links | FR (repo); R s8 (batcher.md) |
| TensorRT-LLM repo and "Disaggregated Serving in TensorRT-LLM" blog | verified links | FR, R s6, s8 |
| "Introducing NVIDIA Dynamo" (GTC 2025) | verified link, dated 2025-03-18 | FR, R s8 |
| Dynamo docs on disaggregated serving (docs.dynamo.nvidia.com/...) | replaced by the repository's README and design docs (current home of the docs) | FR |

## Naming
| Old claim | Status | Source | Where now |
|---|---|---|---|
| Three unrelated Tritons: the server, OpenAI's kernel DSL, the moon/myth | verified | n/a | R s8 |
| "NVIDIA has leaned into Dynamo-Triton branding" | corrected: a dated rename | NVIDIA blog note: "As of March 18, 2025 ... renamed to NVIDIA Dynamo Triton"; product page "Dynamo-Triton, formerly NVIDIA Triton Inference Server"; GitHub still "Triton Inference Server" | R s8, Corrections |

## Triton Inference Server
| Old claim | Status | Source | Where now |
|---|---|---|---|
| Veteran server (2018-), any model from any framework, monthly NGC containers, r26.x in 2026 | verified (cadence and version) | releases: v2.73.0 = NGC 26.09, 2026-09-30; monthly before | R s8 table and text |
| Backends: TensorRT, TensorRT-LLM, ONNX Runtime, PyTorch, TensorFlow, OpenVINO, FIL, vLLM, Python | verified | triton-inference-server/backend README (also DALI) | R s8 |
| "AMD maintains a ROCm port" | unconfirmed | not found in the repositories read | Corrections (left out) |
| Dynamic batching: queue, fire when full or on timeout; not continuous batching; LLM batching delegated to TensorRT-LLM or vLLM backend | verified | batcher.md (max_queue_delay_microseconds, preferred_batch_size); tensorrtllm_backend README ("inflight batching") | R s8, Mistakes, Interview |
| Ensembles / BLS | verified | Triton docs; TensorRT-LLM blog (BLS orchestrator for disaggregation) | R s8 |
| Concurrent model execution, model repository with versions and hot reload, Prometheus metrics, Model Analyzer | kept (documented features; not re-checked one by one) | Triton docs | R s8 |
| Use it for a heterogeneous zoo; adds little for pure LLM APIs; Dynamo takes the centre of gravity | kept as advice; Dynamo-Triton and Dynamo are separate NVIDIA products | product page | R s8 Choosing |

## TensorRT-LLM
| Old claim | Status | Source | Where now |
|---|---|---|---|
| Then: ahead-of-time compiled engines per model/GPU/shape | verified (history) | v1.0.0 notes; README | R s8 |
| Now (1.x, 2025-2026): PyTorch runtime default; trtllm-serve OpenAI-compatible; classic flow remains | verified and dated | v1.0.0 (2025-09-24) "PyTorch-based architecture is now stable and the default experience"; first in v1.0.0rc0 (2025-06-25) | R s8, Corrections |
| In-flight batching, paged KV, FP8 and NVFP4, speculative decoding (EAGLE-3, MTP, draft), wide-EP, chunked prefill, KV reuse | verified (features listed in README and docs) | README; paged-attention-ifb-scheduler.md | R s8 |
| Disaggregated serving with runtime-reconfigurable xPyD | partly: disaggregation verified; "runtime-reconfigurable" unconfirmed | disagg-serving.md, blog | R s6, s8; Corrections |
| NVIDIA-only; smaller model coverage than vLLM; rougher DX | NVIDIA-only verified (README); the rest opinion, dropped | README | R s8 table |
| MLPerf-winning numbers and GB200/NVL72 recipes come from this stack | softened: NVIDIA's MLPerf submissions and wide-EP GB200 blogs use it | parent planner (HPE MLPerf v5.1 run); wide-EP blogs | R s8 |
| (new) latest stable v1.2.1 (2026-04-20), 1.3 in RCs (rc29, 2026-09-29) | verified | releases API | R s8 table |

## Dynamo
| Old claim | Status | Source | Where now |
|---|---|---|---|
| Announced GTC March 2025, "operating system of the AI factory", 1.0 in March 2026 | verified dates (v0.1.0 and blog 2025-03-18; v1.0.0 2026-03-13); slogan not re-checked, dropped | releases API; blog | R s8 |
| Rust/Python, above the engines | verified | README | R s8 |
| Engine-agnostic: vLLM, SGLang, TensorRT-LLM | verified | README feature matrix | R s8 |
| Disaggregated serving, KV transfer over NIXL, planner rebalances prefill vs decode | verified | README; planner overview | R s6, s8 |
| KV-aware smart router | verified, with the current cost formula | routing-concepts.md (main, 2026-10-09) | R s8 |
| KV Block Manager offloads to CPU RAM, SSD, object storage | verified (G1 GPU, G2 pinned host, G3 disk, G4 S3-compatible) | kvbm-configuration.mdx | R s8 |
| Up to 30x more requests/GPU for DeepSeek-R1 on GB200 NVL72 | corrected wording and conditions: "increased the number of requests served by up to 30x", TensorRT-LLM FP4, 32K/8K, labelled "Projected performance subject to change" | GTC blog | R s8, Corrections |
| ~2x for Llama-70B on Hopper | corrected wording: "more than doubled the throughput"; vLLM FP8, 3K/50, TP8DP2 vs prefill TP2DP4 + decode TP8 | GTC blog | R s8, Corrections |
| Positioning vs llm-d: same problem; Dynamo NVIDIA-led and engine-agnostic, llm-d vLLM-centred; both use Gateway API Inference Extension patterns | verified (Dynamo README has a GAIE endpoint-picker mode; llm-d's EPP is now the llm-d Router) | READMEs | R s8 |

## llm-d
| Old claim | Status | Source | Where now |
|---|---|---|---|
| CNCF/Red Hat/Google-led | corrected: founded by Red Hat, Google Cloud, IBM Research, CoreWeave, NVIDIA (May 2025); CNCF Sandbox announced 2026-03-24 | CNCF blog | R s8, Corrections |
| Kubernetes-scale disaggregated LLM serving around vLLM | verified | README, well-lit paths | R s8 |

## Choosing within the NVIDIA stack
| Old claim | Status | Where now |
|---|---|---|
| One node, OSS-first: vLLM or SGLang; add TensorRT-LLM if benchmarks justify | kept as advice | R s8 Choosing |
| Peak perf per GPU, FP4 on Blackwell, enterprise support: TensorRT-LLM | kept as advice | R s8 Choosing |
| Mixed-framework zoo, ensembles: Triton (Dynamo-Triton) | kept as advice | R s8 Choosing |
| Multi-node fleet with P/D disaggregation: Dynamo (or llm-d if K8s/vLLM native) | kept as advice | R s8 Choosing |

## See also
| Old link | Where now |
|---|---|
| Batching/KV/scheduling child ("disaggregation, in-flight batching, FP8/FP4") | FR and inline links (that page now owns goodput and scheduling; disaggregation lives here) |
| vLLM and SGLang children | FR and inline links |

## Facts this page adds that touch other pages (for the parent's coverage)
- vLLM v0.31.0 registers 17 KV connectors and has no P2pNcclConnector (factory.py L153-246); its docs say "Disaggregated prefill DOES NOT improve throughput" (docs/features/disagg_prefill.md L16).
- SGLang v0.5.21 has six disaggregation transfer backends, default mooncake (choices.py L120-127); its docs still say "Mooncake and NIXL".
- DeepEP's README was rewritten (V2/V2.5, NVSHMEM removed, no performance tables); the numbers quoted come from the v1.2.1 README (2025-09-16).
