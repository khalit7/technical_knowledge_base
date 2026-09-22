# Google DeepMind: Gemini and Gemma

⏱ 10 min read · +3h 23m resources

This page maps both families; per-model pages to follow.

### Best resources

- [Gemini API release notes](https://ai.google.dev/gemini-api/docs/changelog) (docs, ~15 min for the entries in scope): authoritative dated model list, including quiet capability changes that never get a blog post.
- [Gemini (Wikipedia)](https://en.wikipedia.org/wiki/Gemini_(language_model)) (~20 min): well-maintained lineage overview, the fastest way to reconstruct what shipped when.
- [Gemini 1.5 tech report](https://arxiv.org/abs/2403.05530) (~1h 30m): the long-context MoE design notes, and still the most architectural detail Google has published for Gemini.
- [Gemma 3 tech report](https://arxiv.org/abs/2503.19786) (~1h): the open family's architecture, including the 5:1 sliding-window ratio and the distillation recipe. Read it for what Google actually believes about attention layouts.
- [Gemma (Wikipedia)](https://en.wikipedia.org/wiki/Gemma_(language_model)) (~10 min): open-family lineage including Gemma 4.

### Lineage: Gemini (closed)

**The PaLM era (2022-2023).** PaLM and PaLM 2 were dense models trained on TPU pods; PaLM's 540B run demonstrated that Google could train at frontier scale on its own silicon and orchestration layer, and it is where chain-of-thought prompting was first shown to work at scale. After Brain and DeepMind merged in 2023, Gemini was built as the successor with two departures designed in from the start: sparsity instead of dense scaling, and multimodality in pretraining instead of bolted on afterwards.

**Gemini 1.0 (Dec 2023) and 1.5 (Feb 2024): long context.** 1.5 Pro was the breakthrough: 1M tokens generally available, 10M demonstrated, and, more importantly, near-perfect retrieval across the whole window rather than the usual collapse in the middle. Two design choices carry it. It is a **sparse MoE (Mixture of Experts)**, so cost scales with active parameters rather than total, which is what keeps the cost of pushing a million tokens through the model bounded. And it is **natively multimodal**: text, images, audio and video are tokenised into one sequence and trained jointly from the beginning, rather than a separately trained vision encoder being projected into a finished text model. That is why you can hand a Gemini model an hour of video and ask about one moment in it: video is more tokens in the same context window, not a separate pipeline with its own failure modes.

**2.0 (Dec 2024) and 2.5 (Mar 2025): thinking, and distilled tiers.** 2.5 Pro made thinking the default with a controllable budget, exposed as a `thinking_budget` parameter: the same caller-owned-cost design Anthropic shipped as extended thinking, and the opposite of a hidden router. The **Flash** and **Flash-Lite** tiers are distillations of Pro, a smaller student trained to match the teacher's outputs and typically its full output distribution, which retains most of the quality at a fraction of the serving cost and is why Google can price the middle of the market aggressively. The agentic push dates from here too: Project Mariner for browser control, Jules for autonomous coding tasks.

**Deep Think (Jul 2025): parallel test-time compute.** Instead of one longer chain of thought, Deep Think explores several reasoning threads simultaneously and then selects or combines among them, spending far more inference compute per query in width rather than depth. It reached the official IMO gold standard, 35 of 42 points, solving 5 of 6 problems, under the competition's own conditions. The lesson is the o-series' on a different axis: once accuracy responds to inference compute, the question is how to spend it, and parallel exploration buys independence between attempts, which a single longer trace does not.

**Gemini 3 (Nov 2025) and 3.1 Pro (Apr 2026).** 3.1 Pro rolled out globally with stronger reasoning for complex coding and data analysis, and among the frontier pack it remains the preferred model for reasoning over long documents: the 1.5-era long-context advantage still compounding.

**Gemini 3.8 Flash and Flash Cyber (Sep 2026).** Where the line now sits for most traffic. 3.8 Flash scores 59 on the Artificial Analysis Intelligence Index, up 3 from 3.7 Flash and level with GPT-5.6 Sol and Grok 4.6, while beating most larger frontier models on DeepSWE v1.1 long-horizon software engineering and improving on Vals Finance Agent V2, Harvey's legal agent benchmark and HLE-Verified. How the gain was bought is the part worth carrying: Google's own framing is that the model **works harder**, taking more reasoning steps and calling tools more iteratively for the same question, so cost per task rose about 40% over 3.7 Flash even though the per-token price did not. A flash-tier model spending more test-time compute by default blurs the tier distinction the price list implies. Introductory pricing is $0.75 and $3.75 per million, doubling in the new year, which still works out at roughly $0.58 per Intelligence Index task, the cheapest at that level. On private enterprise code it resolves 31.2% of Real-SWE tasks, third behind Claude Fable 5.1 and GPT-6 Astra. **Flash Cyber** is the same model tuned for vulnerability detection and remediation, distributed through the Fairwind Program to governments, critical infrastructure and software maintainers rather than sold openly. [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/) (5 min)

**Gemini 3.8 Live and 3.8 Live Extended Thinking (Sep 2026): a tier, not a flagship.** Production voice-agent models doing near real-time speech with visual grounding and automatic language detection across 97 languages. Extended Thinking is the one with an idea in it: it **reasons and speaks at the same time**, filling with verbal cues like "Let me check that" while tool calls run in the background instead of going silent. Every other way of spending a test-time budget on this page makes the caller wait; this one covers the latency with speech, a product answer to a systems constraint and the first shipped one. First on Artificial Analysis' speech-to-speech index at 82.6, with 68.6% on tau-Voice, 35.1% on Sierra's tau-Voice-banking and 97.7% on Big Bench Audio. Live in the Gemini API and AI Studio, private preview in Gemini Enterprise, and already behind Search Live, Gmail and Keep; Google publishes no millisecond latency figure. [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/) (8 min)

**Gemini 4.** In pretraining, no announced date.

### Lineage: Gemma (open)

**Gemma 1 and 2 (2024).** Small open models built from Gemini research and distilled from larger internal teachers rather than trained from scratch at their own scale, which is why they consistently outperform their parameter count against conventionally trained models.

**Gemma 3 (Mar 2025).** 1B to 27B, multimodal, 128K context. The architectural point is the **5:1 local-to-global attention ratio**: five of every six layers attend only within a sliding window of about a thousand tokens, one in six across the whole sequence. KV-cache memory at long context is dominated by the global layers, so cutting them to one in six cuts long-context cache footprint sharply while keeping enough to route long-range information; the trade is that most layers can no longer see distant tokens directly and must rely on those global layers to carry the signal. The **3n** variants target on-device execution, keeping part of the parameters out of accelerator memory so the resident footprint is well below the raw parameter count.

**Gemma 4 (Apr 2026).** The current open family, notable for an MoE at small scale, gemma-4-26b-a4b (26B total parameters, roughly 4B active per token), alongside the dense gemma-4-31b and the E2B and E4B edge variants. An MoE at 26B bets that the memory-versus-compute trade favours sparsity even on a workstation: 26B of weights in VRAM but only about 4B of matmuls per token, the right trade when you are latency-bound and memory-rich, the wrong one when you are memory-bound. Gemma 4 is the strong open-weight small-model baseline.

**T5Gemma (Apr 2025) and T5Gemma 2 (Dec 2025): the encoder-decoder branch.** A research line rather than a product tier, and the only place a frontier lab currently ships open encoder-decoder LLMs. The method is **adaptation**: copy a pretrained decoder-only Gemma checkpoint into an encoder-decoder shell (self-attention switched from causal to bidirectional, decoder gaining cross-attention over the encoder output) and continue pretraining with UL2 or PrefixLM rather than pretraining a new model. Cheaper than from scratch and, above roughly 100M parameters, better; the gains land after instruction tuning rather than at pretraining, and encoder-decoder wins SuperGLUE at every scale. Two results carry beyond the Gemma family. **Asymmetric sizing**: a 9B encoder with a 2B decoder runs at Gemma 2 2B latency and scores far above it, the right shape for long-input, short-output work and structurally impossible in a decoder-only model. **Long context**: T5Gemma 2 4B-4B scores 81.7 on RULER 32K against Gemma 3 4B's 66.8 despite being pretrained at only 16K, because the encoder's parameters are spent entirely on reading. Released at 270M-270M, 1B-1B and 4B-4B with a frozen SigLIP vision encoder feeding the text encoder; EmbeddingGemma is built on these checkpoints. Full summary in [Encoder-Decoder Gemma and T5Gemma 2](../../../papers/2025-04_t5gemma/summary.md) (9 min read · +2h 35m resources).

### Training approach highlights

**Everything trains on TPUs.** Google is the only frontier lab fully off NVIDIA for training, using **JAX** (a functional array library that traces Python into XLA-compiled programs, with sharding expressed as explicit annotations on arrays rather than as a wrapper around a module tree) on **Pathways** (the orchestration layer letting a single program drive many TPU pods asynchronously). It buys no exposure to GPU supply, pricing or allocation politics, and a pod interconnect designed for exactly this collective pattern. It costs transferability: the stack is Google's own, so essentially none of it carries to an outside practitioner the way PyTorch, FSDP and NCCL do, and the published work is correspondingly hard to reproduce.

**Native multimodality as the differentiator.** Trained in from pretraining rather than added as an adapter, since 1.0: audio and video in, image out via integrated generation, all through the same context window.

**One distillation pipeline, three products.** Pro trains at the frontier, Flash and Flash-Lite are distilled from it for price-performance, and Gemma is the open end of the same pipeline. This is why the open models track the closed ones so closely in behaviour: they are not a separate research line.

**Distribution is the strategic asset.** Search (AI Overviews and AI Mode), Workspace, Android and Vertex all ship Gemini by default, and the Gemini app passed 750M users in 2026. No other lab can reach that many people without acquiring the users first. It now extends to a rival's flagship surface: Apple's rebuilt Siri entered public beta in September 2026 running on custom Google Gemini models with a device-and-cloud processing split, EU and China rollout pending. Google supplies the assistant model on the phones it competes with, which is distribution bought rather than owned and the strongest evidence yet that the training stack, not the app, is the durable asset.

### Current models

| Model | Role |
| --- | --- |
| Gemini 3.8 Flash | The volume model and the line's highest index score; spends more test-time compute per task by default |
| Gemini 3.8 Flash Cyber | Vulnerability detection and remediation; Fairwind Program distribution only |
| Gemini 3.8 Live / Live Extended Thinking | Voice agents; Extended Thinking reasons and speaks concurrently |
| Gemini 3.1 Pro | Long-document reasoning leader |
| Gemini 3 Flash-Lite | Cheapest latency tier |
| Deep Think mode | Parallel test-time compute for hardest problems |
| Gemma 4 (26b-a4b MoE, 31b, edge) | Open weights |

### Cross-links

- [Reasoning models and test-time compute](../reasoning-models.md): thinking budgets and Deep Think, alongside the serial-chain-of-thought approaches they contrast with.
- [Mixture-of-Experts (MoE) models](../moe-models.md): Gemini 1.5's role in mainstreaming frontier MoE, and where Gemma 4's small MoE sits.
- TPU stack: [Topic: jax-and-tpu](../../jax-and-tpu/summary.md) for the JAX and Pathways side of the training approach above.
