# Moonshot AI: Kimi

⏱ 9 min read · +3h 28m resources

Per-model pages to follow; this page maps the family.

### Best resources

- [Kimi K2 tech report](https://arxiv.org/abs/2507.20534) (~1h 30m): MuonClip optimizer, agentic data synthesis, 1T-scale MoE training.
- [Kimi K3 overview (HF community)](https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei) (~20 min): current flagship specs and MXFP4 details.
- [Kimi Linear paper](https://arxiv.org/abs/2510.26692) (~45 min): Kimi Delta Attention, the hybrid linear-attention design K3 productionised.
- [Moonshot HuggingFace org](https://huggingface.co/moonshotai) (docs, ~15 min for the flagship model cards): weights and model cards.
- [Interconnects on Kimi](https://www.interconnects.ai/) (~30 min per deep-dive post): recurring deep coverage of Moonshot's role in open weights.

### The bet: research on the boring layers, shipped fast

Moonshot's edge is not data scale or distribution, it is a willingness to change what most labs treat as settled: the optimizer and the attention layer. AdamW and softmax attention are inherited without question almost everywhere; Moonshot has replaced both in production models at trillion scale. The other half of the bet is cycle time: Kimi Linear went from paper (Oct 2025) to flagship backbone (K3, Jul 2026) in well under a year, fast for an architecture change that touches every kernel in the stack.

### MuonClip: Muon, plus a fix for what Muon breaks

**Muon** is an optimizer for a network's 2D weight matrices (attention and MLP projections; embeddings, output heads and 1D parameters normally stay on AdamW). Where AdamW rescales each parameter independently by its own running second moment, Muon treats the momentum buffer as a matrix and approximately *orthogonalises* it with a few Newton-Schulz iterations before applying it. A raw gradient matrix is dominated by a handful of large singular directions, so most of an AdamW step's magnitude goes into those while the rest of the spectrum barely moves; flattening the spectrum makes the update push in all directions at comparable scale, which empirically buys meaningfully better loss per token at the same budget. It also carries less state, momentum only against AdamW's two moment buffers per parameter, real memory in a sharded trillion-parameter run. It costs a few extra matmuls per step (small against the forward and backward passes), a much shorter track record than AdamW, and the awkwardness that orthogonalisation wants a whole matrix while the training job has it sharded across devices, which is why Moonshot had to publish a distributed version. Widely copied since.

**qk-clip** fixes what Muon's larger, better-conditioned updates broke. At scale, attention logits (query-key dot products before the softmax) can grow without bound during training; once large enough the softmax saturates, gradients vanish or explode, and the loss spikes. The usual mitigation, QK-norm, normalises queries and keys inside the forward pass, changing the model's own computation. qk-clip acts after the optimizer step instead: it monitors the maximum attention logit per head and, when a head exceeds a threshold, rescales that head's query and key projection weights back down, bounding the instability at its source in the weights with no extra operation on the forward path. **MuonClip** is the combination, and the headline result is what it removed: a 15.5T-token, 1T-parameter run with no loss spikes at all, which at that scale means no weeks lost restarting from checkpoints.

### Kimi Delta Attention and the linear/full hybrid

Full softmax attention keeps every past key and value, so its cache grows with context and every decoded token reads all of it. Linear attention removes the softmax so the layer becomes a recurrence over a fixed-size state matrix: each token writes its key-value outer product in, the query reads out, and memory per token is constant. The catch is capacity: a fixed state holds finitely many associations, writes superimpose, and precise recall of something far back degrades.

**KDA (Kimi Delta Attention)**, from the Kimi Linear paper, is a gated delta-rule linear attention. *Delta rule*: each write first subtracts what the state currently retrieves for that key, so a new association overwrites the old one instead of accumulating on top of it. *Gated*: learned decay, so old content fades rather than occupying capacity forever. KDA's contribution over earlier gated delta designs is a finer-grained gate, decay controlled per channel rather than by one scalar per token, giving far more selective control over what is kept. Kimi Linear interleaves KDA with full attention at roughly 3:1: the full layers keep an exact, lossless recall path for retrieval and copying, the KDA layers carry most of the depth at constant memory. Against a full-attention baseline it reports roughly a 75% smaller KV cache and several-fold faster decode at million-token context, at equal or better quality. It costs custom chunked-parallel kernels (needed to use tensor cores at all), and any capability that depends on exact long-range recall now leans on the one-in-four full layers.

### The trillion-scale shape: sparsity and cross-depth residuals

K2's MoE routes 8 of 384 experts plus 1 shared, giving 32B active from 1T total. K3 pushes to 16 of 896 for 104B active from 2.8T, under the name **Stable LatentMoE**. The field's direction of travel is in those two numbers: as expert count rises and each expert shrinks, quality tracks total parameters while decode speed tracks active parameters, so extreme sparsity is the cheapest way to buy capacity. It costs routing: with hundreds of small experts, load imbalance worsens, all-to-all traffic per token grows, every expert must still be resident in memory, and each expert sees proportionally fewer tokens, which makes both pretraining stability and later fine-tuning harder. The name Stable LatentMoE points at exactly that stability problem; beyond the model card the specifics are not worth guessing at, and the K3 overview above is the current best source.

**Attention Residuals** are described by Moonshot as selective cross-depth representation retrieval. The shape of such a mechanism is a path letting a layer's attention reach representations from earlier depths rather than only the output of the layer immediately below: in a deep residual stack, information written early is progressively overwritten by later layers, and a cross-depth path makes it retrievable again on demand. That is the shape of the idea, not a reading of their implementation.

### Low precision as a release format, not a post-processing step

Moonshot ships its models *natively* quantized, a strategic choice rather than a convenience. A 2.8T-parameter model at BF16 is about 5.6 TB of weights; at 4 bits about 1.4 TB, the difference between a model a few labs can run and one a well-equipped team can serve.

**INT4 QAT** (quantization-aware training), used for K2 Thinking, simulates 4-bit integer quantization inside the forward pass during the later stages of training, so the weights adapt to the coarse grid instead of being rounded onto it afterwards. It matters most for reasoning models: post-training quantization introduces small per-step errors, and hundreds of dependent reasoning steps compound them, so quality loss shows up far more in long chains than in short answers. The payoff is a checkpoint whose published form is the deployable form, roughly 4x less weight memory and correspondingly faster decode, since decode is memory-bandwidth-bound.

**MXFP4** (microscaling FP4), used for K3, is the newer option: 4-bit floating-point elements with a shared power-of-two scale factor per small block (32 values in the OCP standard) rather than one scale per tensor. Block-wise scaling is what makes 4 bits survivable, since outliers distort only their own block instead of crushing the whole tensor's resolution, and the format has native tensor-core support on Blackwell-class hardware, so it is fast rather than merely small. Shipping the flagship as an MXFP4 checkpoint is how a 2.8T model gets to be practically open-weight.

### Post-training: manufacturing agentic data, and rewards where no checker exists

There is very little naturally occurring data for multi-step tool use, so Moonshot manufactures it: simulated tools and environments, generated trajectories, filtered by whether the task actually succeeded. That is RL with verifiable rewards one level up, at the level of a whole tool-using episode rather than a single answer.

Where no automatic checker exists (writing quality, judgement, following a complex instruction), they add **self-critique rubric rewards**: the model grades candidate outputs against explicit rubrics and that grade becomes the reward signal. It buys reward coverage over the large fraction of real work that is not verifiable, and costs the honesty of the grader, since a policy trained against a judge derived from itself has an obvious incentive to learn what the judge likes. The thinking variants are additionally trained for *interleaved* reasoning, alternating reasoning and tool calls across hundreds of steps rather than thinking once and then acting, which is what agentic browsing benchmarks actually reward.

### Lineage

- **Kimi chat / K1.5 (2023-2025)**: long-context consumer assistant in China; K1.5 was an early RL reasoning model.
- **Kimi K2 (Jul 2025)**: the breakout release: 1T total / 32B active MoE (384 experts, 8 active + 1 shared), MLA attention (the latent-cache design from DeepSeek V2), trained on 15.5T tokens with **MuonClip**, zero loss spikes at 1T scale; modified MIT license (MIT terms plus an attribution requirement above a large deployment threshold). Best open agentic/coding model of its moment.
- **K2 Thinking (Nov 2025)**: reasoning variant with native INT4 quantization-aware training; interleaved thinking and tool calls over hundreds of steps; briefly ahead of closed flagships on HLE/BrowseComp-style agentic evals.
- **K2.5 / K2.6 / K2.7 Code (early 2026)**: multimodal (K2.5), then rapid capability and coding-focused updates (K2.6 Apr, K2.7 Code Jun).
- **Kimi K3 (Jul 2026)**: current flagship, and the highest-placed open-weight model on the aggregate intelligence indices: Artificial Analysis' reranked v4.2 ranks Moonshot above Z.ai and Google, behind only Anthropic, OpenAI, Meta and SpaceXAI. 2.8T total / 104B active, **Stable LatentMoE** (896 experts, 16 active), **Kimi Delta Attention** (the hybrid linear attention from Kimi Linear) plus **Attention Residuals** (selective cross-depth representation retrieval), 1M context, native vision, shipped as a native MXFP4 checkpoint under modified MIT. Moonshot reports 81.2 FrontierSWE and 88.3 Terminal-Bench, the latter against the 2.x line that Terminal-Bench 4.0 has since replaced. That index lead is index-shaped and does not survive every benchmark: on Real-SWE's private enterprise codebases K3 resolves 18.8%, below GLM-5.3's 28.8%, and on Phi-Bench's infrastructure-engineering tasks it scores 28.12% against Claude Opus 5's 36.53%. Which open model "leads" is now a question about the benchmark, not about the models.
**What others build on K3.** The clearest evidence the weights matter is that a third party productised them. **Cognition SWE-2** (Sep 2026) is K3 reinforcement-learned into a coding agent, reporting FrontierCode 1.1 Main at 50.0% against Claude Fable 5.1's 50.9% at a claimed 64% lower cost. The training result is more interesting than the score: every selectable reasoning-effort level was trained in a single RL run using slope-matched cost penalties, and SWE-2 medium used 58% fewer turns and cost 81% less than SWE-1.7 for the same work. Its card is also the cleanest worked example of benchmark version skew anywhere in this subtree, quoting Terminal-Bench 2.1 at 92.8% and Terminal-Bench 4 at 27.3%, roughly 30 points behind rivals, for one model. No open weights and no standalone API: it runs only inside Devin Desktop and CLI. [Cognition](https://cognition.com/blog/swe-2) (8 min)

### Current models

| Model | Params | Notes |
| --- | --- | --- |
| Kimi K3 | 2.8T / 104B active | Highest-placed open weights on the aggregate indices; 1M ctx, vision, MXFP4 |
| K2.7 Code | K2-scale | Coding specialist |
| K2 Thinking / K2.5 | 1T / 32B | Previous generation, still served |
| Kimi Linear 48B | research | KDA hybrid attention testbed |

### Cross-links

- [Mixture-of-Experts (MoE) models](../moe-models.md): K2/K3 expert configs and sparsity trend.
- [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](../_comparisons/llm-architecture-gallery.md): KDA among the attention variants.
- Rivals: [DeepSeek](../deepseek/overview.md), [Alibaba: Qwen](../qwen/overview.md), [Zhipu: GLM](../zhipu-glm.md).
