# Concept owners

One page owns each concept: it has the explanation and the single best visual. Every other page gives the point that matters in its own context, in a sentence or two, and links to the owner (to the tab, `{{text|n:<id>#t-tab}}`, when a tool lives there). Before teaching a concept on a page, look it up here; before drawing it, check the owner does not already draw it (`python3 html_utils/audit_pages.py <audit.jsonl> --concepts` flags pages that teach the same thing). When a new page should own something, add the row here in the same commit. Paths are under `technical_knowledge_base/`.

Agreed 2026-10-23 with the teaching contract ([../.claude/skills/explainer-page/teaching/teaching-contract.md](../.claude/skills/explainer-page/teaching/teaching-contract.md)).

## Models and training
| Concept | Owner | Others name it and link |
|---|---|---|
| The decoder block end to end, shapes, a tiny GPT | `models_and_training/topic_llm_architecture/the_transformer_from_zero` | architecture root (map only) |
| Attention mechanisms: MHA, MQA, GQA, MLA, windows, NSA, DSA, CSA/HCA, sinks | `.../topic_llm_architecture/attention_variants` | lab pages say what the lab chose |
| KV-cache sizing, the memory wall, cache compression and eviction, effective context | `.../topic_llm_architecture/long_context` (calculator `#t-kv`) | provider pages, hardware memory, serving |
| Positional encodings, RoPE and its scaling | `.../topic_llm_architecture/positional_encodings` | |
| Tokenizers | `.../topic_llm_architecture/tokenizers` | |
| Mixture of experts: routing, load balancing, shared experts, expert parallelism as a design | `.../topic_llm_architecture/mixture_of_experts` | serving pages own EP at serve time |
| Transformer normalisation: pre-norm, RMSNorm, QK-norm, residual scaling, loss spikes | `.../topic_llm_architecture/normalisation_residuals_and_stability` | |
| Normalisation and initialisation in general (BatchNorm, LayerNorm maths, init schemes) | `models_and_training/topic_ml_fundamentals/normalisation_and_initialisation` | |
| SSMs, Mamba, linear attention, hybrids | `.../topic_llm_architecture/beyond_attention` | |
| Model families and objectives, multi-token prediction, diffusion LMs | `.../topic_llm_architecture/families_and_objectives` | |
| Parallelism forms: DP, FSDP/ZeRO, TP, PP, CP, EP for training | `models_and_training/topic_llm_training_and_post_training/distributed_training` | PyTorch, JAX and launcher pages show only their API or tooling |
| Quantisation and number formats (FP8, INT4, NF4, GPTQ, AWQ, QAT) | `.../topic_llm_training_and_post_training/quantization_and_precision` | serving pages say what they run |
| LoRA, QLoRA and other PEFT | `.../topic_llm_training_and_post_training/peft` | |
| The post-training pipeline, SFT, DPO family, RLVR as a stage | `.../topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr` | |
| RL algorithms for LLMs: PPO, GRPO and variants, their maths | `models_and_training/topic_rl/rl_for_llms` | the alignment page links for the algorithm |
| Reward hacking and over-optimisation | `.../topic_llm_training_and_post_training/reward_hacking` | |
| Post-training data | `models_and_training/topic_data_curation_and_datasets/post_training_data` | |
| Dataset formats and loaders | `.../topic_data_curation_and_datasets/storage_and_loading` | |
| Optimisers and learning-rate schedules | `models_and_training/topic_ml_fundamentals/optimisers_and_learning_rate_schedulers` | |
| Classical metrics (precision, recall, AUC, calibration) | `.../topic_ml_fundamentals/evaluation_metrics` | measurement pages own LLM evaluation |
| VAEs | `models_and_training/topic_generative_and_multimodal/autoencoders_and_vaes` | the math page keeps only the ELBO derivation |
| Diffusion | `.../topic_generative_and_multimodal/diffusion_from_zero` | |

## Systems and performance
| Concept | Owner | Others |
|---|---|---|
| Sampling and decoding strategies | `systems_and_performance/topic_inference_and_serving/sampling_and_decoding` | |
| Continuous batching, paged attention, scheduling | `.../topic_inference_and_serving/batching_kv_cache_and_scheduling` | vLLM and SGLang pages show their implementation |
| Speculative decoding | `.../topic_inference_and_serving/speculative_decoding` | |
| Roofline, arithmetic intensity, performance arithmetic | `systems_and_performance/topic_hardware/performance_math` | CUDA and serving pages |
| Interconnects and topology (NVLink, InfiniBand, ICI) | `.../topic_hardware/interconnects_and_scaling` | cluster anatomy |
| GPU memory hierarchy as hardware (HBM, SRAM) | `.../topic_hardware/memory_technology` | CUDA memory hierarchy owns the programming view |

## Agents and retrieval
| Concept | Owner | Others |
|---|---|---|
| Vector indexes (HNSW, IVF, PQ) | `agents_and_retrieval/topic_rag_and_retrieval/vector_indexes` | databases' search page owns database products and hybrid search in a database |
| OAuth and auth flows | `agents_and_retrieval/topic_protocols/auth` | MCP links for its auth |
| Context engineering, including agent memory | `agents_and_retrieval/topic_agentic_harnesses/context_engineering` | frameworks' memory layers page names libraries |
| LLM tracing and observability | `agents_and_retrieval/topic_agentic_frameworks/llm_observability` | |

## Engineering foundations
| Concept | Owner | Others |
|---|---|---|
| Metrics, logs, traces, OpenTelemetry in general | `engineering_foundations/topic_swe_and_system_design/observability` | ML infra owns GPU fleet metrics and cost |
| The event loop as an OS mechanism (epoll, kqueue) | `engineering_foundations/topic_operating_systems/concurrency` | Python and JS pages own their language's loop |
| File systems | `.../topic_operating_systems/storage_and_file_systems` | ML infra owns cluster storage; data curation owns dataset formats |
| The ELBO derivation | `engineering_foundations/topic_math/variational_inference_and_generative_models` | generative pages own the models |
