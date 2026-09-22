# Alibaba: Qwen

⏱ 5 min read · +3h 15m resources

Per-model pages to follow; this page maps the family.

### Best resources

- [Qwen3 tech report](https://arxiv.org/abs/2505.09388) (~1h 30m) and repo summary: hybrid thinking modes and the dense+MoE ladder.
- [Qwen blog](https://qwen.ai/blog) (docs, ~30 min for the recent release posts): primary source for the fast release cadence.
- [Qwen HuggingFace org](https://huggingface.co/Qwen) (docs, ~20 min for the flagship model cards): the largest open-weight catalogue of any lab.
- [Qwen lineage and roadmap 2026 (Presenc)](https://presenc.ai/research/alibaba-qwen-model-lineage-and-roadmap-2026) (~25 min): dated family tree through Qwen3.8.
- [Qwen3.8-Max announcement (Alibaba)](https://www.alibabagroup.com/en-US/document-2021044032125272064) (~10 min): current flagship.

### The strategy: breadth as the moat

Where DeepSeek optimises cost per served token and Moonshot optimises frontier capability per training run, Qwen optimises *coverage*. Every generation ships a full ladder of sizes, from sub-billion models that run on a phone through mid-size dense models to a sparse flagship, in multiple modalities (Coder, VL for vision-language, Audio, Math, Embedding), almost all under Apache 2.0, which permits commercial use and redistribution with essentially no conditions. That compounds: because a Qwen base exists at whatever size and licence a project needs, Qwen bases became the default starting point for open research and for distillation, including DeepSeek's own R1 distillations. Being the substrate everyone else builds on is a position no benchmark win can buy, and it feeds Alibaba Cloud Model Studio, where the same models are the paid, hosted option.

That characterisation acquired its first material qualification in September 2026, when **Qwen-Image-2.1** shipped under the Qwen Research License Agreement rather than Apache 2.0: non-commercial only, with commercial use requiring a separate unpublished agreement. One image model does not settle whether the Apache default is being walked back, and a second would, so it is worth watching deliberately rather than treating the licence as permanent. Detail on [Topic: generative-and-multimodal](../../generative-and-multimodal/summary.md).

Two caveats when reading benchmark claims. Arena placings (Text Arena, Vision Arena) are human pairwise-preference leaderboards: they measure which answer people prefer, not whether a task was completed correctly, and they move with formatting and verbosity as well as with capability. And the release cadence means the "current" model changes every few months, so this page ages faster than the architecture sections below, which are the durable part.

### Hybrid thinking and thinking budgets

From Qwen3 onward a single checkpoint serves both a fast direct-answer mode and a long chain-of-thought mode, selected by the caller through the chat template rather than by loading different weights. Post-training teaches both behaviours to the same model, conditioned on the mode marker, so it learns "when this marker is present, deliberate before answering".

The distinctive part is the **thinking budget**: the caller caps how many tokens the model may spend deliberating, and the model is trained to wrap up and commit to an answer when the budget runs out rather than being truncated mid-thought. Reasoning depth becomes a runtime dial, which matters because reasoning tokens are the dominant cost and latency term in an agentic loop and most requests do not need them.

The hybrid's cost is real, and Alibaba acknowledged it: the Qwen3-2507 refresh split the line back into separate Instruct and Thinking checkpoints. One set of weights serving both modes appears to leave quality on the table at the top end, presumably because the two behaviours want different post-training distributions. The trade is operational simplicity (one deployment, one KV cache, one set of weights in memory) against peak quality in each mode.

### Architecture: expert sparsity, and the linear attention in the Next line

**The MoE shape.** Qwen3's flagship is 235B total with 22B active (235B-A22B), routing 8 of 128 experts per token with no shared expert. DeepSeek by contrast routes 8 of 256 finer-grained experts *plus* a shared expert every token traverses, to absorb the common computation so routed experts can specialise. Qwen left it out and let the router handle everything: simpler, and no fixed unconditional cost per token, at the risk of routed experts each relearning general behaviour. Both work, and the divergence is one of the more informative disagreements in open MoE design.

**Qwen3-Next and Gated DeltaNet.** The 80B-A3B Next model is the line's efficiency testbed, and three quarters of its attention layers are not attention in the usual sense. Linear attention drops the softmax so attention can be rewritten as a recurrence: instead of caching every past key and value and comparing the query against all of them, the layer maintains a fixed-size state matrix, writes each token's key-value outer product into it, and reads it with the current query. Memory per token becomes constant instead of growing, cost over a sequence linear instead of quadratic. Plain linear attention never displaced softmax attention because of interference: a fixed-size state has finite capacity, writes superimpose, and recall of a specific earlier fact degrades badly.

**DeltaNet** fixes the write rule. Before writing a new value for a key it subtracts what the state currently returns for that key, so the update *replaces* the association rather than piling on top of it: the classical delta rule applied to an associative memory. **Gated** DeltaNet adds a learned per-token decay so the state can forget, stopping stale content occupying capacity forever. Qwen3-Next interleaves these layers with full attention at roughly 3:1, the pragmatic compromise: the full-attention layers preserve an exact recall path for the retrieval and copying behaviours agents depend on, while three quarters of the layers cost constant memory. The price is custom kernels (the recurrence must be run in chunked parallel form to use tensor cores at all) and lossy recall through the linear layers, which is exactly why the ratio is not higher.

Next also pushes **expert sparsity** much further, activating roughly 3B of 80B parameters. High sparsity is attractive because decode speed tracks *active* parameters (memory bandwidth per token) while quality tracks total parameters, so the ratio looks like a free lunch on paper. It is not: all experts must still be resident in memory, all-to-all traffic per token grows, load imbalance worsens as experts get smaller, and fine-tuning or RL on a very sparse model is harder because each expert sees fewer tokens. The 3.8 generation's hybrid attention and high-sparsity MoE productionise what Next was built to test, the standard flow in this line: Next experiments, Max adopts, mainline inherits.

**Qwen3.8-Flash-Next and QSA.** Qwen3.8-Flash-Next, released August 2026 as an explicit preview of the **Qwen4 architecture**, replaces the Gated Attention half of the hybrid with **Qwen Sparse Attention (QSA)**, which selects context at micro-block rather than individual-token granularity because block selection maps onto GPU memory access patterns in a way token-level selection does not, and pushes expert sparsity to roughly 21x (125B total, 6B active), the most aggressive ratio in the open flash tier, though not in the open frontier as a whole: DeepSeek V4 Pro sits near 33x and Kimi K3 near 27x at flagship scale. What 6B active buys is the absolute figure rather than the ratio, since it is what a 6B dense model costs to decode. With DeepSeek's DSA and CSA, Kimi's KDA and MiniMax's MSA, every open frontier line is now on some form of trainable sparse or linear attention. Details in the lineage below.

### Data and how the whole ladder ships at once

Qwen3 was pretrained on roughly 36T tokens, and a large share of the specialised data is synthetic, produced by the previous generation's own Math and Coder models. That is the flywheel behind the cadence: each release is a data generator for the next, particularly where correctness can be checked automatically and bad samples filtered out.

The ladder ships at once because the small models are not trained the hard way. The Qwen3 report describes building them by distilling from the large ones (training the student on the teacher's output distribution rather than only on hard labels, then on the teacher's on-policy behaviour) instead of running the full multi-stage reasoning and RL pipeline at each size. Distillation transfers far more signal per token than supervised fine-tuning on text, which is what makes an 0.6B-to-235B family releasable on the same day, and it is the mechanism that made R1's distilled models work.

### Lineage

- **Qwen 1/1.5/2/2.5 (2023-2024)**: a full dense ladder (0.5B-72B+) at every release, Apache 2.0, strong multilingual; plus Coder, VL, Audio, Math variants. Qwen2.5-72B and Coder-32B became default open bases; **QwQ-32B** was their first reasoning model, notable for showing a 32B model could reach reasoning behaviour previously seen only in far larger ones.
- **Qwen3 (Apr 2025)**: 0.6B-235B (MoE 235B-A22B, 128 experts, 8 active, no shared expert); single checkpoints with think/no-think switching and thinking budgets; 36T-token pretraining. Later 2507 updates split Instruct/Thinking; Qwen3-Coder 480B.
- **Qwen3-Next (Sep 2025)**: 80B-A3B hybrid: Gated DeltaNet linear attention at 3:1 with full attention, ultra-sparse MoE; the efficiency testbed for what followed.
- **Qwen3-Max (2025)**: 1T+ closed flagship, the first Qwen model held back from open weights; the Qwen3-VL line carried open vision.
- **Qwen3.5 (Feb 2026)**: 397B open-weight flagship aimed at the "agentic AI era"; benchmarked on par with US frontier models of the moment.
- **Qwen3.8 (Aug 2026)**: current generation. **Qwen3.8-Max**: 2.4T-parameter sparse MoE with hybrid attention, native multimodal, 1M context, top-5 Text Arena / top-2 Vision Arena. On Aug 12 Alibaba open-weighted **Qwen3.8-2.4T-A95B**, the first open Max-class flagship, a strategy change: the Max tier had been the one thing kept closed. Aug 14 added **Qwen3.8-27B**: dense, Apache 2.0, native image+video VL, 262K context.
- Qwen3.8-27B is the local model of the moment: Simon Willison finds it excellent but prone to overthinking; XDA handed it a reverse-engineering job it finished in 30 minutes. [Simon Willison](https://simonwillison.net/2026/Aug/16/qwen-38-27b/) (~10 min), [XDA](https://xda-developers.com/qwen-3-8-27b-reverse-engineering-job-frontier-model/) (~10 min)
- **Qwen3.8-Flash-Next (Aug 26, 2026)**: an open-weight preview of the **Qwen4 architecture**, released early so the ecosystem can adapt before the full Qwen4 family lands. 125B total / 6B active MoE (about 21x sparsity), a causal LM plus a vision encoder, 262,144-token native context extensible to 1M. Qwen3.x's Gated DeltaNet plus Gated Attention hybrid becomes Gated DeltaNet plus QSA, as above. It shipped natively multimodal in the same week as GLM-5.3-Flash and Tencent Hy4, three releases pointing the same way: the open frontier now competes on active-parameter efficiency and attention sparsity rather than total parameter count. [Weights](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) (model card, ~10 min), [Qwen blog](https://qwen.ai/blog?id=qwen3.8-flash-next) (~10 min), [TechNode](https://technode.com/2026/08/26/alibabas-qwen-to-open-source-qwen3-8-flash-next-previewing-qwen4-architecture/) (~5 min)
- **Qwen3.8-Max-0902 (Sep 2, 2026)**: a post-trained snapshot of the 2.4T flagship rather than a new version: 1M-token context, further post-trained on coding and Cowork agentic data. The convention matters more than the model: Alibaba now ships dated snapshots instead of incrementing version numbers, so "Qwen3.8-Max" is no longer a single artifact and any reproducible result must pin the snapshot id. [TechNode](https://technode.com/2026/09/02/alibaba-upgrades-qwen38-max-with-new-0902-snapshot/) (5 min)

### Current models

| Model | Params | Notes |
| --- | --- | --- |
| Qwen3.8-Max / 2.4T-A95B | 2.4T / 95B active | Flagship; open weights since Aug 2026; shipped as dated snapshots (0902 current), so pin the snapshot id |
| Qwen3.8-Flash-Next | 125B / 6B active | Qwen4 architecture preview; Gated DeltaNet plus QSA, vision encoder, 262K native context |
| Qwen3.8-27B | 27B dense | Apache 2.0, native VL, best small all-rounder |
| Qwen3.5-397B | 397B MoE | Previous open flagship, still widely served |
| Qwen3 / Qwen3-VL ladder | 0.6B-235B | Workhorse open bases everywhere |

### Cross-links

- [Mixture-of-Experts (MoE) models](../moe-models.md), [Reasoning models and test-time compute](../reasoning-models.md).
- Rivals in open weights: [DeepSeek](../deepseek/overview.md), [Moonshot AI: Kimi](../moonshot-kimi/overview.md), [Zhipu: GLM](../zhipu-glm.md).
