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

- Every topic folder has a `summary.md`: a taxonomy diagram, a brief map of the space,
  and links to the topic's deep-dive files, relevant papers, and best resources. The
  summary is condensed and skimmable; depth lives in child files.
- Taxonomy diagrams ship rendered: the page embeds `taxonomy.svg` and keeps the mermaid
  source underneath in a `<details>` block. After editing the source, re-render with
  `npx -y @mermaid-js/mermaid-cli -i <src>.mmd -o taxonomy.svg -b white` so the image
  and the source never drift apart.
- Every deep-dive file starts with a **Best resources** block (links to the best
  explanations available), followed by a synthesis written from those resources.
- Cross-cutting comparison material lives in the topic's `_comparisons/` folder.
- Research papers live centrally in `papers/`, one folder per paper
  (`YYYY-MM_short-name/` containing `paper.pdf` and `summary.md`), indexed in
  `papers/INDEX.md` and cross-linked from topic summaries.
- `sources/` holds selective verbatim article snapshots (markdown), indexed in
  `sources/SOURCES.md`. Snapshot only canonical explainers, paywall or link-rot risks,
  and heavily cited references; everything else is a link plus synthesis.
- `updates/` holds one dated digest per periodic pull (`updates/YYYY-MM-DD.md`): the
  changelog of KB edits.
- `news/` holds one tech-news issue per week (`news/YYYY-MM-DD.md`): the newsletter.
  Scope: AI/ML + big-tech industry. Routing: technical items appear in the issue AND
  their topic files; pure industry news (IPOs, acquisitions, people moves) lives only
  in `news/`; papers obviously relevant to the topics get full papers/ treatment
  immediately, other interesting papers are just linked until Khalid asks.
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

## Maintenance (direction reversed 2026-08-25)

**Notion is the source of truth; this repo is the mirror.** The Notion root page is
"Technical knowledge base" (`3c65c17b-0d0d-81c7-b646-e548e65d9446`), and its child
"Operating guide (for Claude)" is the Notion-side manual.

- Weekly update: a scheduled cloud task (routine "Weekly tech KB update", Mondays
  07:00 UTC, Opus, Notion connector, repo cloned) researches every topic, updates
  Notion directly, then syncs this repo and pushes to main. Manual fallback:
  `/kb-weekly-update-manual`.
- Repo sync on the PC: `git pull` first; run `/kb-sync-from-notion` for ad-hoc
  catch-ups or to backfill anything the cloud run skipped (e.g. SVG re-renders).
- New paper: `/kb-add-paper <arxiv id or url>` (writes Notion first, then here).
- New topic: `/kb-new-topic <name>` (writes Notion first, then here).

## Known caveats (updated 2026-08-25)

1. Tick reading progress in the Notion Tracker (source of truth); `TRACKER.md` here
   mirrors it, ticks included.
2. Paper PDFs live only in this repo (`papers/*/paper.pdf`); the sync downloads them
   from the arXiv links in Notion. Revisit Git LFS if the repo passes ~1GB.
3. The weekly cloud task cannot reach this repo or this machine; anything it must know
   lives in Notion (that is what the Operating guide page is for).
