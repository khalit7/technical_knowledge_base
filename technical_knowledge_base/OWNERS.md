# Concept owners

One page owns each concept: it has the explanation and the single best visual. Every other page gives the point that matters in its own context, in a sentence or two, and links to the owner (to the tab, `{{text|n:<id>#t-tab}}`, when a tool lives there). Before teaching a concept on a page, look it up here; before drawing it, check the owner does not already draw it (`python3 html_utils/audit_pages.py <audit.jsonl> --concepts` flags pages that teach the same thing). When a new page should own something, add the row here in the same commit. Paths are under `technical_knowledge_base/`.

Agreed 2026-10-23 with the teaching contract ([../.claude/skills/explainer-page/teaching/teaching-contract.md](../.claude/skills/explainer-page/teaching/teaching-contract.md)).

## Models and training
| Concept | Owner | Others name it and link |
|---|---|---|
| The decoder block end to end, every shape (hero, Shapes and counts tab `#t-drill`), a tiny GPT | `models_and_training/topic_llm_architecture/the_transformer_from_zero` | architecture root (map only) |
| Why a KV cache exists: recompute the prefix against keep it | `.../topic_llm_architecture/the_transformer_from_zero` (section 9) | Long context keeps the sizing |
| Attention mechanisms: MHA, MQA, GQA, MLA, windows, NSA, DSA, CSA/HCA, sinks | `.../topic_llm_architecture/attention_variants` | lab pages say what the lab chose |
| KV-cache sizing, the memory wall, cache compression and eviction, effective context | `.../topic_llm_architecture/long_context` (calculator `#t-kv`) | provider pages, hardware memory, serving |
| Positional encodings: absolute, sinusoidal, T5 bias, ALiBi, RoPE and its base, partial and M-RoPE, NoPE layers, RoPE scaling (PI, NTK, YaRN, Llama 3, LongRoPE) | `.../topic_llm_architecture/positional_encodings` | MLA's decoupled key is Attention variants' |
| Tokenizers, vocabulary size, chat templates and special tokens | `.../topic_llm_architecture/tokenizers` | the alignment page shows a template and links here |
| Mixture of experts: routing, load balancing (aux loss and bias), capacity and drops, fine-grained and shared experts, expert parallelism as a design, the dense-vs-MoE twin | `.../topic_llm_architecture/mixture_of_experts` | distributed training owns EP in training; serving pages own EP at serve time |
| Transformer normalisation: pre, post, sandwich and output norm, DeepNorm, mHC, RMSNorm, QK-norm and logit caps, z-loss, residual init, massive activations in the stream, loss spikes | `.../topic_llm_architecture/normalisation_residuals_and_stability` | attention sinks stay with Attention variants |
| Normalisation and initialisation in general (BatchNorm, LayerNorm maths, init schemes) | `models_and_training/topic_ml_fundamentals/normalisation_and_initialisation` | |
| SSMs, Mamba, linear attention, RWKV, the delta rule (Gated DeltaNet, KDA), hybrids, the state against KV crossover | `.../topic_llm_architecture/beyond_attention` | architecture root |
| Model families (decoder-only, encoder, encoder-decoder, prefix LM) and objectives (CLM, MLM, span corruption, UL2), multi-token prediction, diffusion LMs | `.../topic_llm_architecture/families_and_objectives` | |
| Survey of released architectures: which model made which choice, ratio counts, corrections of the Gallery's figures | `.../topic_llm_architecture/llm_architecture_gallery` | lab pages say what their own models chose |
| Parallelism forms: DP, FSDP/ZeRO, TP, PP, CP, EP for training | `models_and_training/topic_llm_training_and_post_training/distributed_training` | PyTorch, JAX and launcher pages show only their API or tooling |
| Number formats (FP32, TF32, BF16, FP16, FP8 E4M3/E5M2, MX, NVFP4, INT8/INT4, NF4), scaling granularity, PTQ (GPTQ, AWQ, SmoothQuant, rotations), QAT, mixed precision, FP8 and 4-bit training | `.../topic_llm_training_and_post_training/quantization_and_precision` | serving pages say what they run; RL for LLMs owns low-precision RL mismatch |
| Scaling laws, compute-optimal allocation, over-training | `.../topic_llm_training_and_post_training/pretraining` (section 3) | the training root's Scaling calculator (6ND cost) links it |
| Activation checkpointing and recomputation in training; bytes each split sends per step | `.../topic_llm_training_and_post_training/distributed_training` | interconnects owns collective algorithms on the wire |
| Knowledge distillation (logit, sequence-level, on-policy, reasoning), pruning plus distillation, what makes a good small model | `.../topic_llm_training_and_post_training/distillation_and_small_language_models` | pretraining, quantisation, local inference |
| The stage comparison, open recipes, price list, one-run compute calculator, the "running the job" stack | `models_and_training/topic_llm_training_and_post_training` (root) | |
| LoRA, QLoRA and other PEFT, and the fine-tuning memory calculator (full, LoRA, QLoRA) | `.../topic_llm_training_and_post_training/peft` | vLLM owns its multi-LoRA serving knobs |
| The post-training pipeline, SFT, DPO family, RLVR as a stage, how recipes combine the stages (section 8), the loss-mask widget | `.../topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr` | post-training data links the loss mask |
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
| Sampling and decoding strategies, logit processors, constrained and structured decoding (JSON schema, grammars, mask engines) | `systems_and_performance/topic_inference_and_serving/sampling_and_decoding` | engine pages say which backend they run |
| vLLM as a system, including its multi-LoRA serving knobs | `.../topic_inference_and_serving/vllm` | PEFT and serving in production link |
| Continuous batching, paged attention and block tables, prefix caching, offload tiers, chunked prefill, scheduling policies, admission and preemption, the realisable saving of compressed caches | `.../topic_inference_and_serving/batching_kv_cache_and_scheduling` | vLLM and SGLang pages show their implementation |
| Speculative decoding, its worked example, the batch-size crossover cost model, the exactness test | `.../topic_inference_and_serving/speculative_decoding` | |
| Roofline, arithmetic intensity, performance arithmetic | `systems_and_performance/topic_hardware/performance_math` | the hardware root's Roofline lab owns the measured M1 ceilings; CUDA and serving pages apply it |
| The CUDA programming model: threads, warps, blocks, grids, SIMT, sync scopes, occupancy as a concept, waves, host/device split, error model, a first kernel | `.../topic_cuda_and_gpu_programming/programming_model` | GPU architecture keeps per-generation SM limits |
| GPU memory as the programmer sees it: coalescing, L1/L2 hints, launch order, tiling, banks and swizzles, registers and spills, constant memory, cp.async and TMA, pinned and managed memory types | `.../topic_cuda_and_gpu_programming/memory_hierarchy` | streams owns managed-memory prefetch |
| Hand-written kernels: the progression (coalesce, tiles, vectorise), warp shuffles, reductions, scans, row norms, fusion, 4-bit decode GEMV, the FlashAttention algorithm across versions | `.../topic_cuda_and_gpu_programming/writing_kernels` | |
| Triton and Gluon, and when Triton, Gluon or CUDA | `.../topic_cuda_and_gpu_programming/triton_and_gluon` | |
| Tensor cores and their instructions (WMMA, mma.sync, wgmma, tcgen05, TMEM), TMA and warp specialisation, cuBLAS/cuBLASLt, GEMM tiling, waves, split-K and Stream-K, cuDNN, CUTLASS and CuTe, FlashAttention as a library | `.../topic_cuda_and_gpu_programming/libraries_and_tensor_cores` | |
| Profiling and correctness for GPU code: nsys against ncu, timelines, Speed of Light, warp stalls, honest timing, compute-sanitizer, assert_close tolerances | `.../topic_cuda_and_gpu_programming/profiling_and_correctness` | |
| The GPU compiler stack across front ends: nvcc, PTX and SASS, binary compatibility, NVRTC, what fusion and codegen decide | `.../topic_cuda_and_gpu_programming/compiler_stack` | torch.compile and XLA in depth have their own pages |
| Streams, events, CUDA graphs, peer access and IPC, NCCL from code, DDP/FSDP overlap from the programmer's view, hangs, NVSHMEM, managed-memory prefetch | `.../topic_cuda_and_gpu_programming/streams_graphs_and_multi_gpu` | |
| The CUDA map: the lever table, five ways to get a kernel, the GPU simulator and compiler explorer tools | `systems_and_performance/topic_cuda_and_gpu_programming` (root) | |
| Serving across GPUs and nodes: TP, PP and EP at serve time, disaggregation, KV transfer, the serving layer | `.../topic_inference_and_serving/distributed_and_disaggregated_serving` | |
| SGLang as a system: radix cache as implemented, queue policies, router code, frontend language, large-scale recipes | `.../topic_inference_and_serving/sglang` | |
| SLOs, goodput, endpoint capacity, cost per token, routing across replicas (and its visual), autoscaling, cold starts, multi-LoRA serving, load testing | `.../topic_inference_and_serving/llm_serving_in_production` | the inference root links |
| Model file formats (GGUF, safetensors, pickle, MLX, ONNX, conversions, mmap loading) and local engines | `.../topic_inference_and_serving/local_and_on_device_inference` | Model formats was merged here |
| torch.compile from the user's side: Dynamo, guards, graph breaks, recompiles and dynamic shapes, the AOTAutograd partitioner, Inductor, modes, compiled autograd, the activation_memory_budget, regional compilation, caches, torch.export and AOTInductor, debugging | `systems_and_performance/topic_pytorch_ecosystem/torch_compile` | the compiler stack keeps what happens below Inductor |
| PyTorch's distributed APIs: c10d and torchrun from the code side, DDP buckets and hooks, FSDP2, DTensor and DeviceMesh, TP and SP plans, the pipelining API, DCP | `.../topic_pytorch_ecosystem/distributed_pytorch` | distributed training owns the forms |
| Making a PyTorch training job fast: the profiler loop, data loading, fused optimisers, autocast and GradScaler in practice, memory budgets, checkpointing and the compile memory budget as levers, SDPA and FlexAttention, torchao, MFU of a measured step; and nn.Module registration, state_dict and tied weights, the training loop, determinism, DataLoader seeding | `.../topic_pytorch_ecosystem/making_training_fast` | quantisation keeps the formats |
| Libraries on top of PyTorch: which library takes which duty of the loop and its defaults, HF Trainer, Accelerate, PEFT and TRL as libraries, Lightning, torchtitan, torchtune, DeepSpeed and Megatron Core as libraries, config tools, the chooser | `.../topic_pytorch_ecosystem/libraries_on_top_of_pytorch` | |
| Extending PyTorch: custom ops (torch.library, custom_op, fake kernels), C++ and CUDA extensions, Triton ops, opcheck and its test grid, the silent-gradient traps | `.../topic_pytorch_ecosystem/extending_pytorch` | |
| The PyTorch map: the layer comparison, Inside one step, the Compile and Distributed labs, the Ecosystem map | `systems_and_performance/topic_pytorch_ecosystem` (root) | |
| JAX core: pure functions and tracing, jaxprs, the jit cache, grad/jvp/vjp, vmap and pmap history, custom rules, control flow under tracing, pytrees, PRNG keys | `systems_and_performance/topic_jax_and_tpu/jax_core` | |
| XLA in depth: HLO, pass pipelines, fusion decisions, layouts and TPU tiling, buffer assignment, HLO dumps, compile caches, GPU against TPU, recompiles, jax.export and AOT, profiling and flags | `.../topic_jax_and_tpu/xla_and_compilation` | the compiler stack keeps the cross-compiler view |
| The JAX training stack: Flax NNX state and transforms, Linen and Equinox state models, optax, orbax checkpointing and resume, grain pipelines, jmp loss scaling | `.../topic_jax_and_tpu/training_stack` | |
| Translating PyTorch habits into JAX: hidden state made explicit, differing defaults, weight conversion, the ladder equivalence test, the porting checklist | `.../topic_jax_and_tpu/pytorch_to_jax` | the JAX root's Training lab links it |
| Sharding in JAX: Mesh and PartitionSpec, jit with shardings, GSPMD and Shardy propagation, Explicit mode, shard_map and collectives as JAX calls, multi-host | `.../topic_jax_and_tpu/sharding_and_scale` | distributed training owns the forms; interconnects the wire costs |
| TPU as a programming target: TensorCore (MXU, VPU, scalar unit), HBM and VMEM, ICI, slices and meshes from the program's view, ridge and critical batch, tiling and MXU padding, TPU profiling, MFU counting | `.../topic_jax_and_tpu/tpu_programming_and_performance` | the hardware topic owns chips and pods as hardware |
| Pallas: grid and BlockSpecs, memory spaces, pipelining and manual DMAs, scalar prefetch, dimension semantics, testing with interpreters, production kernels, block sizes | `.../topic_jax_and_tpu/pallas_kernels` | |
| JAX LLM codebases: MaxText, Tunix, Levanter, EasyDeL, Pax/Saxml history, logical axis rules, which to start from | `.../topic_jax_and_tpu/jax_llm_codebases` | |
| The JAX map: the five layers, the five labs, per-example gradients, the toy tracer, the jit-cache overview | `systems_and_performance/topic_jax_and_tpu` (root) | |
| GPU architecture as hardware: SMs, register files and caches as silicon, tensor-core throughput per generation, per-generation SM limits, floorplans and dies, NVIDIA Ampere to Rubin, the AMD MI-series chip | `systems_and_performance/topic_hardware/gpu_architecture` | programming model owns occupancy as a concept |
| Accelerators beyond NVIDIA GPUs as hardware: TPU generations and pods, AMD boards and Helios, Trainium, Groq, Cerebras, Gaudi, SambaNova, Etched, in-house ASICs, availability | `.../topic_hardware/tpus_and_other_accelerators` | the AMD chip is GPU architecture's |
| Tensors (storage, strides, views), the dispatcher (keys, autocast as a key, functionalisation, fake tensors), autograd (graph, engine, saved tensors, version counters, hooks), custom autograd.Function, how torch.utils.checkpoint works | `.../topic_pytorch_ecosystem/tensors_dispatcher_and_autograd` | making training fast owns the checkpointing lever; distributed training the training trade-off |
| Interconnects and topology (NVLink, InfiniBand, ICI) | `.../topic_hardware/interconnects_and_scaling` | cluster anatomy |
| Memory technology as hardware: DRAM and SRAM cells, HBM, GDDR and LPDDR packaging, energy per bit, memory tiers including CXL, offload arithmetic, why bandwidth bounds decode | `.../topic_hardware/memory_technology` | CUDA memory hierarchy owns the programming view; long context owns KV sizing |

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
