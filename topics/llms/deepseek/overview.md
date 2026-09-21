# DeepSeek

⏱ 13 min read · +4h 45m resources

Last updated: 2026-08-31 (rewritten: every named technique now carries a mechanism, not just a label). Per-model pages to follow; this page maps the family.

### Best resources

- [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437) (~1h 30m, 50+ pages) and repo summary: the modern open-MoE template, unusually complete on infra.
- [DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948) (~1h) and repo summary: the open reasoning recipe.
- [DeepSeek-V4 report](https://arxiv.org/pdf/2606.19348) (~1h 30m) ("Towards Highly Efficient Million-Token Context Intelligence"): current architecture.
- [The Salt: DeepSeek-V4, the interesting part is the attention](https://thesalt.substack.com/p/deepseek-v4-the-interesting-part) (~20 min): best V4 attention walkthrough.
- [DeepSeek HuggingFace org](https://huggingface.co/deepseek-ai) (docs, ~15 min for the core model cards): all weights and model cards.

### The through-line: one question, asked at every layer

DeepSeek is a spinoff of High-Flyer, a Chinese quantitative hedge fund, and the model line reads like it was designed by people who pay for their own GPUs. A single question runs through every release: what does it cost to train, and above all to *serve*, a frontier-quality model. Nearly every named DeepSeek contribution is that question asked at a different layer of the stack: at the attention layer (MLA, then sparse attention, then compressed attention), at the feed-forward layer (fine-grained mixture-of-experts with shared experts, and load balancing without an auxiliary loss), in the numerics (FP8 training, low-precision serving), in the parallelism schedule (DualPipe, DeepEP), and in the RL recipe (GRPO, which deletes the critic network). They then publish the details, which is why the line matters well beyond its own weights: it is the de facto reference design that most open MoE models now copy.

The sections below explain each of those ideas: what it is, how it works, and what it buys against the obvious alternative.

### Attention: MLA, then DSA, then compressed attention

**The problem being attacked.** Standard multi-head attention caches one key and one value vector per head per token. During decode the arithmetic intensity is terrible (one token at a time against the whole cache), so serving throughput is set by KV cache size: it decides how many sequences fit on a GPU and how much memory bandwidth each decoded token costs. Every DeepSeek attention variant is an attack on that number.

**The pre-existing answer, for contrast.** Multi-Query Attention (MQA) keeps a single shared K/V head for all query heads, and Grouped-Query Attention (GQA) keeps one K/V head per group of query heads. Both shrink the cache linearly in the sharing factor, and both pay for it in representational capacity: the keys and values are genuinely shared, so the heads lose independent memory and quality degrades as you push the ratio.

**MLA (Multi-head Latent Attention)**, introduced in V2, refuses that trade. Instead of caching per-head keys and values, it projects the token's hidden state down into a single low-rank *latent* vector, caches only that latent, and reconstructs each head's keys and values through learned up-projections at attention time. The cache shrinks by roughly an order of magnitude against full MHA, and quality holds because nothing is being shared between heads: the per-head structure still exists, it is just stored in compressed form. Two details make it practical. First, the key up-projection can be algebraically folded into the query projection and the value up-projection into the output projection, so at inference you never materialise the full K/V at all and the "decompression" costs no extra pass. Second, rotary position embeddings do not commute with that folding, so MLA carries a small *decoupled* rope-bearing key dimension cached alongside the latent. The cost of MLA is extra projection FLOPs per attention call and a fussier kernel; the benefit is that long contexts become affordable to serve without GQA's quality tax.

**DSA (DeepSeek Sparse Attention)**, shipped in V3.2-Exp, attacks the other half of the bill: even with a small cache, every decoded token still reads *all* of it, so cost grows linearly with context length. DSA puts a cheap scoring function, the "lightning indexer", in front of attention: it ranks cached entries against the current query and attention runs only over the top-k of them. Once the context is much longer than k, the per-token cost stops growing with context. Two things make or break it. The indexer has to be genuinely cheap (small, low precision) or its own cost eats the saving, and the model has to be trained with the sparsity in place so it does not depend on entries the indexer will drop. It is an approximation, unlike MLA, which is exact up to the low-rank bottleneck. This is what halved DeepSeek's long-context prices.

**Compressed attention (V4)** changes what is stored rather than what is read. V4 uses a hybrid of two compression granularities, CSA over groups of 4 tokens and HCA over groups of 128, plus low-rank query and output projections (MLA's trick applied to the projections either side of attention). The general principle of grouped KV compression is that a group of tokens is summarised into a single cached entry, so the cache grows at one over the group size: fine granularity preserves near-exact local detail where it matters most, coarse granularity covers distant history for almost nothing, and running both in parallel gives you a cache that is precise nearby and cheap far away. DeepSeek report the combination holding the KV cache at roughly 2% of a vanilla transformer's at 1M-token context. Against DSA the contrast is clean: sparse selection still requires the whole cache to be resident so that something can be selected from it, whereas compression shrinks what is resident in the first place. Treat the sketch above as the general mechanism of grouped compression; The Salt walkthrough linked above is the place to go for V4's exact formulation.

### The MoE layer: fine-grained experts, shared experts, balancing without a loss

**DeepSeekMoE**, from V2, makes two changes to the Mixtral-style mixture of experts (a handful of large experts, two active per token). First, **fine-grained experts**: split each expert into several narrower ones and activate more of them per token, so V3 routes 8 of 256 experts rather than 2 of 8. The active parameter count is unchanged, but the number of distinct expert *combinations* a token can be routed to explodes combinatorially, which is what lets experts specialise narrowly instead of each having to be a generalist. Second, **shared experts**: one expert that every token passes through unconditionally, which absorbs the common computation that would otherwise be duplicated inside every routed expert, freeing routed capacity for what is actually specialised. The price of both is routing and communication overhead: more experts touched per token means more all-to-all traffic, which is exactly why DeepSeek ended up writing their own communication kernels.

**Aux-loss-free load balancing** (V3) fixes a problem every MoE has. Routers collapse: left alone, tokens pile onto a few popular experts, wasting the capacity of the rest, and under expert parallelism the most loaded GPU sets the step time for everyone. The standard fix is an auxiliary balancing loss added to the training objective, and it works, but it is a second objective actively fighting the first: its gradient pushes tokens away from the expert that would have modelled them best. DeepSeek's alternative keeps the objective clean. Each expert gets a bias term added to its routing logits, and that bias is nudged up or down between steps according to whether the expert has been under- or over-loaded. Balancing becomes a control loop sitting outside the loss, so it costs nothing in the objective and cannot trade quality for uniformity. It is cheap, it is a few lines, and it is now close to standard practice across open MoE models.

**MTP (Multi-Token Prediction)** adds lightweight prediction modules that, during training, predict not only the next token but the one after it (and further out) from the same trunk. That is a denser supervision signal per forward pass, so the model learns more per token seen, and it forces representations that look slightly further ahead. The second payoff arrives at inference: the extra heads are already a draft of the next few tokens, so they can be reused as a built-in draft model for speculative decoding, getting the usual speedup without training, aligning and hosting a separate draft model.

### Numerics and systems: FP8, DualPipe, DeepEP, disaggregation

**FP8 mixed-precision training** was V3's headline systems result: the first frontier-scale run demonstrated end to end in 8-bit floating point, roughly halving memory traffic and raising effective tensor-core throughput against BF16. Naive FP8 fails because the format's dynamic range is small: a single outlier forces the tensor's scale down and small gradients flush to zero. The recipe that made it work is fine-grained scaling (per-tile and per-block scale factors rather than one per tensor, so one outlier cannot poison a whole matrix), keeping the sensitive components (master weights, optimizer state, normalisation, embedding and output layers) in higher precision, and promoting accumulation to higher precision at intervals to work around the limited accumulate width of the tensor cores. What it buys, on their reported curves, is BF16-equivalent loss at roughly half the memory and materially faster steps. What it costs is a much more delicate training stack.

**DualPipe** is a pipeline-parallel schedule. Ordinary pipeline parallelism leaves "bubbles", stretches where a stage has nothing to do because it is waiting on its neighbour. DualPipe feeds the pipeline from both ends and overlaps the MoE all-to-all dispatch and combine traffic of one micro-batch with the compute of another, so the expert communication is hidden behind arithmetic instead of serialised in front of it. This mattered more to DeepSeek than to most: they trained on H800s, whose interconnect bandwidth is cut relative to H100, so communication was the binding constraint rather than FLOPs.

**DeepEP** is their open-sourced expert-parallel communication library: hand-written dispatch and combine kernels for MoE routing traffic, with separate NVLink and RDMA paths and a low-latency variant for decode. The reason it exists is that generic collective operations are not shaped like MoE traffic, which is a skewed, dynamically-routed, token-level all-to-all rather than a uniform exchange.

**Prefill/decode disaggregation** splits serving across two pools of GPUs because the two phases have opposite bottlenecks: prefill is compute-bound and batches thousands of tokens at once, decode is memory-bandwidth-bound and produces one token per sequence per step. Interleaving them on the same workers means each phase is configured wrong; separating them lets each pool be batched, parallelised and sized for its own limit, at the cost of shipping the KV cache between pools. It is now standard practice in serious vLLM and SGLang deployments.

### Training and RL: GRPO, R1, hybrid thinking

**GRPO (Group Relative Policy Optimization)**, introduced in the DeepSeekMath work, is a PPO variant whose distinguishing move is deleting the value network. PPO needs a learned critic of roughly policy size to produce the advantage baseline, which means a second large model in memory, a second thing to train, and a second thing to go unstable. GRPO instead samples a group of completions for the same prompt, scores them all, and uses the group's own statistics (mean, and in the original formulation standard deviation) as the baseline, so a completion's advantage is simply how much better it did than its siblings. What it buys is roughly half the memory and one fewer model to babysit, and it fits verifiable-reward RL naturally, since sampling many rollouts per prompt is cheap when scoring is automatic. What it costs is those extra rollouts, which moves the expense into sampling, and later work has pointed out that the standard-deviation normalisation introduces a bias across prompt difficulty and response length, which several successor variants simply drop.

**RLVR and R1.** R1-Zero applied GRPO directly to the V3 base with rewards computed only from automatically checkable outcomes (mathematics with a known answer, code that passes tests) plus formatting, with no supervised reasoning traces at all. Long chains of thought, self-checking and backtracking emerged from that alone, and that emergence, not the benchmark number, is the result that mattered: it showed that reasoning was reachable without proprietary reasoning data, which is what made an open reasoning era possible rather than merely announced. R1 proper added a small cold-start supervised set to fix R1-Zero's unreadable and language-mixed output, then RL, then a further supervised-plus-RL round. DeepSeek also distilled R1's traces into Qwen and Llama bases from 1.5B to 70B, demonstrating that the behaviour transfers by ordinary SFT on traces, which is why half the open reasoning models of 2025 were R1 distillations.

**Hybrid thinking** (V3.1 onward) folds the chat model and the reasoning model into one checkpoint, with the long-chain mode selected by the prompt template rather than by loading different weights. It buys operational simplicity (one set of weights, one cache, one deployment) and lets the caller pay for deliberation only where it earns its latency.

### Lineage

Dates and what actually changed; the mechanisms are explained in the sections above.

- **DeepSeek LLM / Coder (2023)**: High-Flyer (quant fund) spinoff; early Llama-style dense models, notable mainly for the scaling-law and data work that set up what followed.
- **V2 (May 2024)**: introduced **MLA** and **DeepSeekMoE** (fine-grained plus shared experts). The serving cost that fell out of MLA is what let them start the Chinese API price war.
- **V3 (Dec 2024)**: 671B total / 37B active; MLA plus a 256-expert MoE (8 routed active, 1 shared), aux-loss-free bias-based balancing, multi-token prediction, FP8 mixed-precision training, DualPipe. The ~$5.6M final-run compute claim on 2,048 H800s is what shook the industry, and the report is unusually explicit about the infra that made it possible.
- **R1 (Jan 2025)**: GRPO-based RL on the V3 base produced o1-class reasoning; R1-Zero showed the behaviour emerging from pure RL; MIT license plus 1.5B-70B distillations. Triggered the "DeepSeek moment" and Nvidia's record one-day selloff.
- **V3.1 (Aug 2025)**: merged chat and reasoning into one hybrid-thinking checkpoint.
- **V3.2-Exp (Sep 2025)**: introduced **DSA**, the lightning-indexer sparse attention described above; halved long-context costs.
- **V4 (Apr 2026)**: current family, two MoE models. **V4 Pro** (1.6T total / 49B active) and **V4 Flash** (284B / 13B). Hybrid compressed attention (CSA over groups of 4, HCA over groups of 128) with low-rank query and output projections holds the KV cache near 2% of a vanilla transformer's at 1M context. Pro leads open coding (~80.6% SWE-bench verified); Flash leads browsing-style agentic evals at very low cost.
- Added 2026-08-24: **DeepSeek-v4-flash-vision-exp** (Aug 21), an experimental vision variant of V4 Flash: images are normalised to at most 384 tokens each, up to 600 images per request. It is currently the only DeepSeek model accepting image input. [API docs](https://api-docs.deepseek.com/guides/vision/) (docs, ~10 min)

### Current models (Aug 2026)

| Model | Params | Notes |
| --- | --- | --- |
| V4 Pro | 1.6T / 49B active | Open-weight coding/reasoning leader, 1M context |
| V4 Flash | 284B / 13B active | Price-performance and agentic browsing |
| R1 (legacy) | 671B / 37B | Historic; reasoning now folded into V-line |

### Cross-links

- [Reasoning models and test-time compute](../reasoning-models.md): R1's role in the reasoning era.
- [Mixture-of-Experts (MoE) models](../moe-models.md): DeepSeekMoE, aux-loss-free balancing.
- [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](../_comparisons/llm-architecture-gallery.md): MLA/DSA/CSA in context.

<details>
<summary>2026-08-24: previous version of this page (superseded)</summary>

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

Best resources: [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437) and repo summary: the modern open-MoE template, unusually complete on infra. [DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948) and repo summary: the open reasoning recipe. [DeepSeek-V4 report](https://arxiv.org/pdf/2606.19348) ("Towards Highly Efficient Million-Token Context Intelligence"): current architecture. [The Salt: DeepSeek-V4, the interesting part is the attention](https://thesalt.substack.com/p/deepseek-v4-the-interesting-part): best V4 attention walkthrough. [DeepSeek HuggingFace org](https://huggingface.co/deepseek-ai): all weights and model cards.

Lineage: **DeepSeek LLM / Coder (2023)**: High-Flyer (quant fund) spinoff; early Llama-style dense models. **V2 (May 2024)**: invented **MLA** (multi-head latent attention) and **DeepSeekMoE** (fine-grained + shared experts); started the Chinese API price war. **V3 (Dec 2024)**: 671B/37B active; MLA + 256-expert MoE (8 active + 1 shared), aux-loss-free bias-based load balancing, multi-token prediction, FP8 mixed-precision training; ~$5.6M compute cost claim on 2,048 H800s shook the industry. **R1 (Jan 2025)**: RL (GRPO) on V3 base produced o1-class reasoning; R1-Zero showed emergent reflection from pure RL; MIT license plus distilled 1.5B-70B models. Triggered the "DeepSeek moment" (Nvidia's record one-day selloff). **V3.1 (Aug 2025)**: merged chat + reasoning into one hybrid-thinking checkpoint. **V3.2-Exp (Sep 2025)**: introduced **DSA** (DeepSeek Sparse Attention): a lightning indexer selects top-k KV entries per query; halved long-context costs. **V4 (Apr 2026)**: current family. Two MoE models: **V4 Pro** (1.6T total/49B active) and **V4 Flash** (284B/13B). Hybrid compressed attention: CSA (groups of 4 tokens) + HCA (groups of 128) + low-rank query/output projections shrink KV cache to ~2% of a vanilla transformer at 1M-token context. Pro leads open coding (~80.6% SWE-bench verified); Flash leads browsing-style agentic evals at very low cost.

Training approach highlights: Efficiency as ideology: every generation pairs an architecture idea (MLA, fine-grained MoE, MTP, DSA, CSA/HCA) with infra co-design (FP8, DualPipe, DeepEP all-to-all kernels, prefill/decode disaggregation), then publishes it. RLVR at scale via GRPO (their invention, from DeepSeekMath); hybrid thinking modes since V3.1. Open MIT-ish licensing, weights + tech reports (not data); prices set the floor for the whole market.

</details>
