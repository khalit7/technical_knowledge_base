# Goal

This repo is Khalid's personal technical knowledge base, managed by Claude. The mission:
know everything that matters in ML/AI, from fundamentals to this week's releases, and be
the most technically gifted person in every room.

Claude populates and maintains it. Khalid reads it, ticks off what he has read in
`TRACKER.md`, and periodically asks Claude to pull in news, releases, and papers.
Audience calibration: an AI research engineer with an MSc-level foundation and production
LLM experience. Fundamentals are included but summarised so known topics can be skimmed;
frontier material gets the depth.

## Topics

| Topic | Scope |
|---|---|
| `topics/llms` | Taxonomy of major LLMs by provider; per-family folders with per-model files; `_comparisons/` for cross-model material (e.g. llm-architecture-gallery) |
| `topics/benchmarks` | Comprehensive modern LLM/ML benchmark list, taxonomy of what each evaluates and how it is used |
| `topics/evaluation-and-llm-judges` | LLM-as-judge design and failure modes, eval harnesses (lm-eval-harness, Inspect, HELM), regression gates, contamination, guardrails |
| `topics/agentic-harnesses` | Claude Code, Codex CLI, Gemini CLI/Antigravity, OpenCode, Cursor, Aider, Devin and friends |
| `topics/agentic-frameworks` | LangChain/LangGraph, LlamaIndex, CrewAI, AutoGen, Claude Agent SDK, smolagents; observability (LangSmith, Langfuse) |
| `topics/inference-and-serving` | vLLM, SGLang, Ollama, NVIDIA Triton/TensorRT-LLM, TGI, llama.cpp; continuous batching, PagedAttention, speculative decoding, KV caching |
| `topics/llm-training-and-post-training` | Pretraining, distributed training (DP/DDP, TP, PP, EP, ZeRO, FSDP), tokenizers, positional encodings, PEFT, alignment (RLHF/DPO/GRPO/RLVR), reward hacking, quantization, distillation, sampling, training infra |
| `topics/cuda-and-gpu-programming` | CUDA programming model, kernels, memory hierarchy, Triton language, CUTLASS, profiling |
| `topics/pytorch-ecosystem` | PyTorch core, torch.compile, FSDP2, torchao/torchtitan/torchtune, HF stack, Axolotl |
| `topics/jax-and-tpu` | JAX/Flax/optax, XLA, sharding, TPU programming |
| `topics/programming-languages` | Python (modern tooling and language updates), C++ (modern practice), Rust (learning track and ML ecosystem) |
| `topics/protocols` | HTTP/1.1-2-3, MCP, A2A, webhooks, gRPC, WebSockets, SSE, REST/GraphQL, OAuth |
| `topics/ml-fundamentals` | Losses, activations, regularisation, optimisers, schedulers, normalisation, initialisation, metrics, classical ML, contrastive learning, sequence-model history, debugging training |
| `topics/rl` | MDPs, Bellman, policy/value iteration, MC/TD, SARSA/Q-learning, deep RL, RL for LLMs (RLVR, GRPO) |
| `topics/generative-and-multimodal` | Diffusion, VAE, GAN, ViT/CLIP, multimodal LLM architectures, speech/audio, text diffusion, world models |
| `topics/rag-and-retrieval` | RAG architectures, embeddings, vector DBs, chunking, rerankers, agentic RAG, GraphRAG |
| `topics/data-curation-and-datasets` | Pretraining corpora, filtering/dedup, synthetic data, tokenizer training, data mixing and CMR scaling law |
| `topics/ml-infra-and-orchestration` | SLURM, Kubernetes for ML, Dagster/Airflow, Terraform, AWS (SageMaker/HyperPod), monitoring, experiment tracking |
| `topics/hardware` | GPU architectures (Ampere to Blackwell), TPUs, interconnects, memory bandwidth math |
| `topics/swe-and-system-design` | System design for ML services, testing, API design, observability, systems fundamentals |
| `topics/math` | Linear algebra, probability/statistics, matrix calculus, information theory, optimization theory |

## Structure conventions (binding)

- Every topic folder has a `summary.md`: a mermaid taxonomy diagram, a brief map of the
  space, and links to the topic's deep-dive files, relevant papers, and best resources.
  The summary is condensed and skimmable; depth lives in child files.
- Every deep-dive file starts with a **Best resources** block (links to the best
  explanations available), followed by a synthesis written from those resources.
- Cross-cutting comparison material lives in the topic's `_comparisons/` folder.
- Research papers live centrally in `papers/`, one folder per paper
  (`YYYY-MM_short-name/` containing `paper.pdf` and `summary.md`), indexed in
  `papers/INDEX.md` and cross-linked from topic summaries.
- `sources/` holds selective verbatim article snapshots (markdown), indexed in
  `sources/SOURCES.md`. Snapshot only canonical explainers, paywall or link-rot risks,
  and heavily cited references; everything else is a link plus synthesis.
- `updates/` holds one dated digest per periodic pull (`updates/YYYY-MM-DD.md`).
- `TRACKER.md` has one checkbox per readable artifact, grouped by topic. New items land
  unchecked at the top of their section.

## Writing conventions (binding)

- No em-dashes anywhere. Use commas, colons, semicolons, or parentheses. `--` for date
  ranges is fine.
- Lead with the outcome; a section must stand on its own.
- Include all important information but keep every page readable by a human: condensed
  main pages, overflow goes to child pages.
- Date every update. Superseded content moves into a `<details>` block instead of being
  deleted.
- State an unfinished thing once, in the smallest space.

## Maintenance

- Periodic pull: run `/kb-weekly-update`. It researches every topic for news, writes
  `updates/<date>.md`, patches topic files, adds papers, updates the tracker, commits.
- New paper: run `/kb-add-paper <arxiv id or url>`.
- New topic: run `/kb-new-topic <name>`.
- Notion mirror: run `/kb-notion-sync` in an interactive session. GitHub is the source of
  truth; Notion is a one-way read mirror.

## Known caveats (recorded 2026-08-24)

1. Scheduled/headless runs cannot use the interactively-authenticated Notion MCP, so
   scheduled pulls update the repo only; Notion sync happens in interactive sessions.
2. GitHub's file view renders checkboxes but does not make them clickable; tick them in
   an editor or in Notion. `TRACKER.md` remains the source of truth.
3. Paper PDFs live in git; revisit Git LFS if the repo passes ~1GB.
