# Google DeepMind: Gemini and Gemma

⏱ 8 min read · +3h 15m resources

Last updated: 2026-08-31 (explanation pass: every named model, architecture and acronym below now says what it is and what it changes; time estimates added). Per-model files to follow; this page maps both families.

## Best resources

- [Gemini API release notes](https://ai.google.dev/gemini-api/docs/changelog) (docs, ~15 min for the entries in scope): authoritative dated model list, including quiet capability changes that never get a blog post.
- [Gemini (Wikipedia)](https://en.wikipedia.org/wiki/Gemini_(language_model)) (~20 min): well-maintained lineage overview, the fastest way to reconstruct what shipped when.
- [Gemini 1.5 tech report](https://arxiv.org/abs/2403.05530) (~1h 30m): the long-context MoE design notes, and still the most architectural detail Google has published for Gemini.
- [Gemma 3 tech report](https://arxiv.org/abs/2503.19786) (~1h): the open family's architecture, including the 5:1 sliding-window ratio and the distillation recipe. This is the one to read if you want to know what Google actually believes about attention layouts.
- [Gemma (Wikipedia)](https://en.wikipedia.org/wiki/Gemma_(language_model)) (~10 min): open-family lineage including Gemma 4.

## Lineage: Gemini (closed)

**The PaLM era (2022-2023).** PaLM and PaLM 2 were dense models trained on TPU pods; PaLM's 540B run was the demonstration that Google could train at frontier scale on its own silicon and its own orchestration layer, and it is the model on which chain-of-thought prompting was first shown to work at scale. After Brain and DeepMind merged in 2023, Gemini was built as the successor with two departures designed in from the start: sparsity instead of dense scaling, and multimodality in pretraining instead of bolted on afterwards.

**Gemini 1.0 (Dec 2023) and 1.5 (Feb 2024): long context.** 1.5 Pro was the breakthrough, with 1M tokens generally available and 10M demonstrated, and, more importantly, near-perfect retrieval across the whole window rather than the usual collapse in the middle. Two design choices carry it. It is a **sparse MoE (Mixture of Experts)**, where the feed-forward block is replaced by many expert networks of which a router activates a few per token, so total parameters and per-token compute decouple; that is what keeps the cost of pushing a million tokens through the model bounded, since cost scales with active parameters, not total. And it is **natively multimodal**: text, images, audio and video are tokenised into one sequence and trained jointly from the beginning, rather than a separately trained vision encoder being projected into a finished text model. Native multimodality is why you can hand a Gemini model an hour of video and ask about one moment in it: video is simply more tokens in the same context window, not a separate pipeline with its own failure modes.

**2.0 (Dec 2024) and 2.5 (Mar 2025): thinking, and distilled tiers.** 2.5 Pro made "thinking" the default with a controllable budget, exposed as a `thinking_budget` parameter, which is the same caller-owned-cost design Anthropic shipped as extended thinking and the opposite of a hidden router. The **Flash** and **Flash-Lite** tiers are distillations of Pro: a smaller student is trained to match the teacher's outputs and typically its full output distribution, which retains most of the quality at a fraction of the serving cost and is why Google can price the middle of the market aggressively. The agentic push dates from here too: Project Mariner for browser control, Jules for autonomous coding tasks.

**Deep Think (Jul 2025): parallel test-time compute.** Instead of one longer chain of thought, Deep Think explores several reasoning threads simultaneously and then selects or combines among them, spending far more inference compute per query in width rather than depth. It reached the official IMO gold standard, 35 of 42 points, solving 5 of 6 problems, under the competition's own conditions. The lesson is the o-series' lesson on a different axis: once accuracy responds to inference compute, the question becomes how to spend it, and parallel exploration buys something that a single longer trace does not, namely independence between attempts.

**Gemini 3 (Nov 2025) and 3.1 Pro (Apr 2026).** The current flagship line. 3.1 Pro rolled out globally with stronger reasoning for complex coding and data analysis, and among the Aug 2026 frontier five it is the preferred model for reasoning over long documents, which is the 1.5-era long-context advantage still compounding.

**Gemini 4.** In pretraining as of Aug 2026, no announced date.

## Lineage: Gemma (open)

**Gemma 1 and 2 (2024).** Small open models built from Gemini research and trained with distillation from larger internal teachers rather than from scratch at their own scale, which is why they consistently outperform their parameter count against models trained conventionally.

**Gemma 3 (Mar 2025).** 1B to 27B, multimodal, 128K context. The architectural point worth knowing is the **5:1 local-to-global attention ratio**: five of every six layers attend only within a sliding window of about a thousand tokens, and one in six attends across the whole sequence. Since KV-cache memory at long context is dominated by the global layers, cutting them to one in six cuts long-context cache footprint sharply while keeping enough global layers to route long-range information; the trade is that most layers can no longer see distant tokens directly and must rely on those global layers to carry the signal. The **3n** variants target on-device execution, keeping part of the parameters out of accelerator memory so the resident footprint is well below the raw parameter count.

**Gemma 4 (Apr 2026).** The current open family. Notable for including an MoE at small scale, gemma-4-26b-a4b (26B total parameters, roughly 4B active per token), alongside the dense gemma-4-31b and the E2B and E4B edge variants. An MoE at 26B is a bet that the memory-versus-compute trade favours sparsity even on a workstation: you pay for 26B of weights in VRAM but only about 4B of matmuls per token, which is the right trade when you are latency-bound and memory-rich, and the wrong one when you are memory-bound. Gemma 4 is the strong open-weight small-model baseline as of Aug 2026.

**T5Gemma (Apr 2025) and T5Gemma 2 (Dec 2025): the encoder-decoder branch.** Added 2026-09-07. Easy to miss because it is a research line rather than a product tier, and it is the only place a frontier lab is currently shipping open encoder-decoder LLMs. The method is **adaptation**: copy a pretrained decoder-only Gemma checkpoint into an encoder-decoder shell (encoder identical but with self-attention switched from causal to bidirectional, decoder gaining cross-attention over the encoder output) and continue pretraining with UL2 or PrefixLM instead of pretraining a new model. That is cheaper than from scratch and, above roughly 100M parameters, also better. The gains land after instruction tuning rather than at pretraining, and encoder-decoder wins SuperGLUE at every scale, which is the direct evidence for the bidirectional-encoder claim. Two things carry beyond the Gemma family. **Asymmetric sizing**: because the halves are separately sized, a 9B encoder with a 2B decoder runs at Gemma 2 2B latency and scores far above it, which is the right shape for any long-input, short-output task and is structurally impossible in a decoder-only model. And **long context**: T5Gemma 2 4B-4B scores 81.7 on RULER 32K against Gemma 3 4B's 66.8 despite being pretrained at only 16K, because encoder parameters are spent exclusively on reading and cross-attention retrieves from a high-level representation rather than rescanning raw tokens. Released at 270M-270M, 1B-1B and 4B-4B with a frozen SigLIP vision encoder feeding the text encoder, and EmbeddingGemma is built on these checkpoints. Full summary in [Encoder-Decoder Gemma and T5Gemma 2](../../../papers/2025-04_t5gemma/summary.md) (9 min read · +2h 35m resources).

## Training approach highlights

**Everything trains on TPUs.** Google is the only frontier lab fully off NVIDIA for training, using **JAX** (a functional array library that traces Python into XLA-compiled programs, with sharding expressed as explicit annotations on arrays rather than as a wrapper around a module tree) on **Pathways** (the orchestration layer that lets a single program drive many TPU pods asynchronously). What it buys: no exposure to GPU supply, pricing or allocation politics, and a pod interconnect designed for exactly this collective pattern. What it costs: the stack is Google's own, so essentially none of it transfers to an outside practitioner the way PyTorch, FSDP and NCCL do, and the published work is correspondingly hard to reproduce.

**Native multimodality as the differentiator.** Trained in from pretraining rather than added as an adapter, since 1.0. Audio and video in, image out via integrated generation, all through the same context window.

**One distillation pipeline, three products.** Pro trains at the frontier, Flash and Flash-Lite are distilled from it for price-performance, and Gemma is the open end of the same pipeline. This is why the open models track the closed ones so closely in behaviour: they are not a separate research line.

**Distribution is the strategic asset.** Search (AI Overviews and AI Mode), Workspace, Android and Vertex all ship Gemini by default, and the Gemini app passed 750M users in 2026. No other lab can put a model in front of that many people without acquiring the users first.

## Current models (Aug 2026)

| Model | Role |
|---|---|
| Gemini 3.1 Pro | Flagship; long-document reasoning leader |
| Gemini 3 Flash / Flash-Lite | Price-performance and latency tiers |
| Deep Think mode | Parallel test-time compute for hardest problems |
| Gemma 4 (26b-a4b MoE, 31b, edge) | Open weights |

## Cross-links

- [../reasoning-models.md](../reasoning-models.md): thinking budgets and Deep Think, alongside the serial-chain-of-thought approaches they contrast with.
- [../moe-models.md](../moe-models.md): Gemini 1.5's role in mainstreaming frontier MoE, and where Gemma 4's small MoE sits.
- TPU stack: topics/jax-and-tpu for the JAX and Pathways side of the training approach above.
