# Moonshot AI: Kimi

⏱ 9 min read · +3h 20m resources

Last updated: 2026-08-31 (rewritten: the optimiser, attention and quantization terms are now explained rather than listed). Per-model pages to follow; this page maps the family.

### Best resources

- [Kimi K2 tech report](https://arxiv.org/abs/2507.20534) (~1h 30m): MuonClip optimizer, agentic data synthesis, 1T-scale MoE training.
- [Kimi K3 overview (HF community)](https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei) (~20 min): current flagship specs and MXFP4 details.
- [Kimi Linear paper](https://arxiv.org/abs/2510.26692) (~45 min): Kimi Delta Attention, the hybrid linear-attention design K3 productionised.
- [Moonshot HuggingFace org](https://huggingface.co/moonshotai) (docs, ~15 min for the flagship model cards): weights and model cards.
- [Interconnects on Kimi](https://www.interconnects.ai/) (~30 min per deep-dive post): recurring deep coverage of Moonshot's role in open weights.

### The bet: research on the boring layers, shipped fast

Moonshot's edge is not data scale or a distribution channel, it is a willingness to change the parts of the stack that most labs treat as settled: the optimizer and the attention layer. AdamW and softmax attention are the two components everyone inherits without question, and Moonshot has replaced both in production models at trillion scale. The second half of the bet is cycle time: Kimi Linear went from paper (Oct 2025) to the backbone of the flagship (K3, Jul 2026) in well under a year, which is unusually fast for an architecture change that touches every kernel in the stack.

### MuonClip: Muon, plus a fix for what Muon breaks

**Muon** is an optimizer for the 2D weight matrices of a network (attention and MLP projections; embeddings, output heads and 1D parameters normally stay on AdamW). Where AdamW rescales each parameter independently by its own running second moment, Muon treats the momentum buffer as a matrix and *orthogonalises* it, approximately, with a few Newton-Schulz iterations before applying it. The intuition: a raw gradient matrix is usually dominated by a handful of large singular directions, so most of an AdamW step's magnitude goes into a few directions while the rest of the spectrum barely moves. Flattening the spectrum makes the update push in all directions at comparable scale, which empirically buys meaningfully better loss per token than AdamW at the same budget. It also carries less state: momentum only, rather than AdamW's two moment buffers per parameter, which is real memory in a sharded trillion-parameter run. The costs are a few extra matmuls per step (small against the forward and backward passes), a much shorter track record than AdamW, and the awkward fact that the orthogonalisation wants a whole matrix while your training job has that matrix sharded across devices, which is why Moonshot had to publish a distributed version.

**qk-clip** is the fix for what Muon's larger, better-conditioned updates broke. At scale, attention logits (the query-key dot products before the softmax) can grow without bound during training; once they are large enough the softmax saturates, gradients vanish or explode, and the loss spikes. The usual mitigation is QK-norm, which normalises queries and keys inside the forward pass, changing the model's own computation. qk-clip instead acts after the optimizer step: it monitors the maximum attention logit per head, and when a head exceeds a threshold it rescales that head's query and key projection weights back down. The instability is bounded at its source, in the weights, without adding an operation to the forward path. **MuonClip** is the combination, and the headline result is what it removed rather than what it added: a 15.5T-token, 1T-parameter run with no loss spikes at all, which at that scale means no lost weeks restarting from checkpoints.

### Kimi Delta Attention and the linear/full hybrid

Full softmax attention keeps every past key and value, so its cache grows linearly with context and every decoded token reads all of it. Linear attention removes the softmax, which lets the layer be rewritten as a recurrence over a fixed-size state matrix: each token writes its key-value outer product into the state, the query reads from it, and memory per token is constant regardless of context length. The catch is capacity. A fixed state has a fixed number of associations it can hold, writes superimpose on one another, and precise recall of something far back degrades.

**KDA (Kimi Delta Attention)**, from the Kimi Linear paper, is a gated delta-rule linear attention. The *delta rule* part means each write first subtracts what the state currently retrieves for that key, so a new association overwrites the old one instead of accumulating on top of it. The *gated* part adds learned decay so old content fades rather than occupying capacity forever, and KDA's contribution over earlier gated delta designs is a finer-grained gate (decay controlled per channel rather than by a single scalar per token), which gives the layer much more selective control over what it keeps. Kimi Linear interleaves KDA with full attention at roughly 3:1: the full-attention layers keep an exact, lossless recall path for retrieval and copying, the KDA layers carry most of the depth at constant memory. Reported against a full-attention baseline: roughly a 75% smaller KV cache and several-fold faster decode at million-token context, at equal or better quality. The costs are real too: custom chunked-parallel kernels are required to use tensor cores at all, and any capability that depends on exact long-range recall now leans on the one-in-four full layers.

### The trillion-scale shape: sparsity and cross-depth residuals

K2's MoE routes 8 of 384 experts plus 1 shared expert, giving 32B active from 1T total. K3 pushes far harder, at 16 of 896 experts for 104B active from 2.8T, under the name **Stable LatentMoE**. The direction of travel across the whole field is visible in those two numbers: as expert count rises and each expert shrinks, quality tracks total parameters while decode speed tracks active parameters, so extreme sparsity is the cheapest way to buy capacity. What it costs is routing: with hundreds of small experts, load imbalance worsens, the all-to-all traffic per token grows, every expert must still be resident in memory, and each expert sees proportionally fewer tokens, which makes both pretraining stability and later fine-tuning harder. The name Stable LatentMoE points at exactly that stability problem; the specifics beyond the model card are not something to guess at here, and the K3 overview linked above is the current best source.

**Attention Residuals** are described by Moonshot as selective cross-depth representation retrieval. The general shape of such a mechanism is a path that lets a layer's attention reach representations from earlier depths rather than only the output of the layer immediately below it: in a deep residual stack, information written early is progressively overwritten by later layers, and a cross-depth path makes it retrievable again on demand. Treat that as the shape of the idea rather than a reading of their implementation.

### Low precision as a release format, not a post-processing step

Moonshot ships its models *natively* quantized, which is a strategic choice rather than a convenience. A 2.8T-parameter model at BF16 is about 5.6 TB of weights; at 4 bits it is about 1.4 TB, which is the difference between a model a few labs can run and one a well-equipped team can serve.

**INT4 QAT** (quantization-aware training), used for K2 Thinking, simulates the 4-bit integer quantization inside the forward pass during (the later stages of) training, so the weights adapt to the coarse grid instead of being rounded onto it afterwards. This matters most for reasoning models: post-training quantization introduces small per-step errors, and a model that emits hundreds of dependent reasoning steps compounds them, so quality loss shows up far more in long-chain reasoning than in short answers. The payoff is a checkpoint whose published form is the deployable form, with roughly 4x less weight memory and correspondingly faster decode, since decode is memory-bandwidth-bound.

**MXFP4** (microscaling FP4), used for K3, is the newer option: 4-bit floating-point elements with a shared power-of-two scale factor per small block of values (32 in the OCP standard), rather than one scale per tensor. Block-wise scaling is what makes 4 bits survivable, because outliers only distort their own block instead of crushing the resolution of the entire tensor, and the format has native tensor-core support on Blackwell-class hardware, so it is fast rather than merely small. Shipping the flagship as an MXFP4 checkpoint is how a 2.8T model gets to be practically open-weight.

### Post-training: manufacturing agentic data, and rewards where no checker exists

There is very little naturally occurring training data for multi-step tool use, so Moonshot manufactures it: simulated tools and environments, generated trajectories, and filtering of those trajectories by whether the task actually succeeded. This is the same insight as RL with verifiable rewards, applied one level up, at the level of a whole tool-using episode rather than a single answer.

For tasks where no automatic checker exists (writing quality, judgement, following a complex instruction), they add **self-critique rubric rewards**: the model grades candidate outputs against explicit rubrics and that grade becomes the reward signal. It buys reward coverage over the large fraction of real work that is not verifiable, and it costs you the honesty of the grader, since a policy trained against a judge derived from itself has an obvious incentive to learn what the judge likes. The thinking variants are additionally trained for *interleaved* reasoning, alternating reasoning and tool calls across hundreds of steps rather than thinking once and then acting, which is the behaviour that agentic browsing benchmarks actually reward.

### Lineage

- **Kimi chat / K1.5 (2023-2025)**: long-context consumer assistant in China; K1.5 was an early RL reasoning model.
- **Kimi K2 (Jul 2025)**: the breakout release: 1T total / 32B active MoE (384 experts, 8 active + 1 shared), MLA attention (the latent-cache design from DeepSeek V2), trained on 15.5T tokens with **MuonClip**, zero loss spikes at 1T scale; modified MIT license (MIT terms plus an attribution requirement above a large deployment threshold). Best open agentic/coding model of its moment.
- **K2 Thinking (Nov 2025)**: reasoning variant with native INT4 quantization-aware training; interleaved thinking and tool calls over hundreds of steps; briefly ahead of closed flagships on HLE/BrowseComp-style agentic evals.
- **K2.5 / K2.6 / K2.7 Code (early 2026)**: multimodal (K2.5), then rapid capability and coding-focused updates (K2.6 Apr, K2.7 Code Jun).
- **Kimi K3 (Jul 2026)**: current flagship and the strongest open-weight model overall: 2.8T total / 104B active, **Stable LatentMoE** (896 experts, 16 active), **Kimi Delta Attention** (the hybrid linear attention from Kimi Linear) plus **Attention Residuals** (selective cross-depth representation retrieval), 1M context, native vision, shipped as a native MXFP4 checkpoint under modified MIT. Reported 81.2 FrontierSWE, 88.3 Terminal-Bench; second only to Fable 5 / GPT-5.6 Sol on GDPval-style rankings.

### Current models (Aug 2026)

| Model | Params | Notes |
| --- | --- | --- |
| Kimi K3 | 2.8T / 104B active | Open frontier leader; 1M ctx, vision, MXFP4 |
| K2.7 Code | K2-scale | Coding specialist |
| K2 Thinking / K2.5 | 1T / 32B | Previous generation, still served |
| Kimi Linear 48B | research | KDA hybrid attention testbed |

### Cross-links

- [Mixture-of-Experts (MoE) models](../moe-models.md): K2/K3 expert configs and sparsity trend.
- [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](../_comparisons/llm-architecture-gallery.md): KDA among the attention variants.
- Rivals: [DeepSeek](../deepseek/overview.md), [Alibaba: Qwen](../qwen/overview.md), [Z.ai (Zhipu): GLM](../zhipu-glm/overview.md).

<details>
<summary>2026-08-24: previous version of this page (superseded)</summary>

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

Best resources: [Kimi K2 tech report](https://arxiv.org/abs/2507.20534): MuonClip optimizer, agentic data synthesis, 1T-scale MoE training. [Kimi K3 overview (HF community)](https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei): current flagship specs and MXFP4 details. [Kimi Linear paper](https://arxiv.org/abs/2510.26692): Kimi Delta Attention, the hybrid linear-attention design K3 productionised. [Moonshot HuggingFace org](https://huggingface.co/moonshotai): weights and model cards. [Interconnects on Kimi](https://www.interconnects.ai/): recurring deep coverage of Moonshot's role in open weights.

Lineage: **Kimi chat / K1.5 (2023-2025)**: long-context consumer assistant in China; K1.5 was an early RL reasoning model. **Kimi K2 (Jul 2025)**: breakout release: 1T total/32B active MoE (384 experts, 8 active + 1 shared), MLA attention, trained on 15.5T tokens with **MuonClip** (Muon optimizer + qk-clip against logit explosions, zero loss spikes at 1T scale); modified MIT license. Best open agentic/coding model of its moment. **K2 Thinking (Nov 2025)**: reasoning variant with native INT4 quantization-aware training; interleaved thinking + tool calls over hundreds of steps; briefly ahead of closed flagships on HLE/BrowseComp-style agentic evals. **K2.5 / K2.6 / K2.7 Code (early 2026)**: multimodal (K2.5), then rapid capability and coding-focused updates (K2.6 Apr, K2.7 Code Jun). **Kimi K3 (Jul 2026)**: current flagship and the strongest open-weight model overall: 2.8T total/104B active, **Stable LatentMoE** (896 experts, 16 active), Kimi Delta Attention (hybrid linear attention from Kimi Linear) plus **Attention Residuals** (selective cross-depth representation retrieval), 1M context, native vision, shipped as a native MXFP4 checkpoint under modified MIT. Reported 81.2 FrontierSWE, 88.3 Terminal-Bench; second only to Fable 5 / GPT-5.6 Sol on GDPval-style rankings.

Training approach highlights: Optimizer research as an edge: Muon/MuonClip proved a non-AdamW optimizer at trillion scale and pushed token efficiency; widely copied since. Attention research productionised fast: Kimi Linear (KDA 3:1 hybrid) went from paper (Oct 2025) to flagship backbone (K3) in under a year. Agentic data synthesis + joint RL (verifiable rewards plus self-critique rubric rewards) for tool-use ability; thinking variants trained for interleaved reasoning. Low-precision-native releases (INT4, then MXFP4) so trillion-scale weights stay deployable; modified MIT license (attribution clause for very large deployments).

</details>
