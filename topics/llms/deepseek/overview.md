# DeepSeek

⏱ 12 min read · +7h 21m resources

Per-model pages to follow; this page maps the family.

### Best resources

- [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437) (~1h 30m, 50+ pages) and repo summary: the modern open-MoE template, unusually complete on infra.
- [DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948) (~1h) and repo summary: the open reasoning recipe.
- [DeepSeek-V4 report](https://arxiv.org/pdf/2606.19348) (~1h 30m) ("Towards Highly Efficient Million-Token Context Intelligence"): current architecture.
- [The Salt: DeepSeek-V4, the interesting part is the attention](https://thesalt.substack.com/p/deepseek-v4-the-interesting-part) (~20 min): best V4 attention walkthrough.
- [DeepSeek HuggingFace org](https://huggingface.co/deepseek-ai) (docs, ~15 min for the core model cards): all weights and model cards.

### The through-line: one question, asked at every layer

DeepSeek is a spinoff of High-Flyer, a Chinese quantitative hedge fund, and the line reads like it was designed by people who pay for their own GPUs. One question runs through every release: what does it cost to train, and above all to *serve*, a frontier-quality model. Nearly every named contribution asks it at a different layer: attention (MLA, then sparse attention, then compressed attention), feed-forward (fine-grained mixture-of-experts with shared experts, and load balancing without an auxiliary loss), numerics (FP8 training, low-precision serving), parallelism (DualPipe, DeepEP), and RL (GRPO, which deletes the critic network). They publish weights and tech reports, though not data, under MIT-ish licences, which is why the line matters beyond its own weights: it is the de facto reference design most open MoE models now copy, and its prices set the market floor. In September 2026 the question reached the shape of the model itself: **V4.1-Flash** is a 552B **encoder-decoder**, the first shipped at frontier scale since the field settled on decoder-only stacks, and the reason DeepSeek give is the KV cache rather than quality. That is the same question asked one layer further out than any of the others, and the T5 evidence had argued the encoder-decoder case on quality grounds years earlier without moving anyone; serving arithmetic did.

### Attention: MLA, then DSA, then compressed attention

**The problem.** Multi-head attention caches one key and one value vector per head per token. Decode reads the whole cache one token at a time, so KV cache size sets serving throughput: how many sequences fit on a GPU, and what each decoded token costs in memory bandwidth. Every DeepSeek attention variant attacks that number.

**The prior answer.** Multi-Query Attention (MQA) shares one K/V head across all query heads; Grouped-Query Attention (GQA) keeps one per group of query heads. Both shrink the cache linearly in the sharing factor and both pay in representational capacity: the keys and values are genuinely shared, so heads lose independent memory and quality degrades as the ratio is pushed.

**MLA (Multi-head Latent Attention)**, from V2, refuses that trade. It projects the token's hidden state into one low-rank *latent* vector, caches only that, and reconstructs each head's keys and values through learned up-projections at attention time. The cache shrinks roughly an order of magnitude against full MHA and quality holds, because nothing is shared between heads: the per-head structure still exists, stored compressed. Two details make it practical. The key up-projection folds algebraically into the query projection and the value up-projection into the output projection, so inference never materialises the full K/V and decompression costs no extra pass; and since rotary position embeddings do not commute with that folding, MLA carries a small *decoupled* rope-bearing key dimension cached alongside the latent. It costs extra projection FLOPs per attention call and a fussier kernel, and buys long contexts that are affordable to serve without GQA's quality tax.

**DSA (DeepSeek Sparse Attention)**, shipped in V3.2-Exp, attacks the other half of the bill: even a small cache is read in full by every decoded token, so cost grows linearly with context length. A cheap scoring function, the "lightning indexer", ranks cached entries against the current query and attention runs over the top-k only, so past k the per-token cost stops growing with context. Two things make or break it: the indexer must be genuinely cheap (small, low precision) or its own cost eats the saving, and the model must be trained with the sparsity in place so it does not depend on entries the indexer will drop. Unlike MLA, which is exact up to the low-rank bottleneck, DSA is an approximation. It is what halved DeepSeek's long-context prices.

**Compressed attention (V4)** changes what is stored rather than what is read: two compression granularities, CSA over groups of 4 tokens and HCA over groups of 128, plus low-rank query and output projections (MLA's trick applied to the projections either side of attention). Grouped KV compression summarises a group of tokens into one cached entry, so the cache grows at one over the group size; fine granularity preserves near-exact local detail, coarse granularity covers distant history for almost nothing, and running both gives a cache precise nearby and cheap far away. DeepSeek report the combination holding the KV cache near 2% of a vanilla transformer's at 1M-token context. Against DSA: sparse selection still needs the whole cache resident so that something can be selected from it, whereas compression shrinks what is resident. That is the general mechanism; the Salt walkthrough above has V4's exact formulation.

**The V4.1-Flash cache stack (Sep 2026)** pushes the programme past the attention layer into the shape of the network. Splitting a 40-layer transformer into a 20-layer causal encoder and a 20-layer decoder means the prompt is encoded once into a shared representation rather than carried as a per-layer cache through one causal stack, and DeepSeek combine that with cross-layer sparse attention with index reuse, hierarchical retrieval, an Engram memory and FP4 cache storage. The reported result is **890 bytes per token**, roughly a quarter of V4-Flash's HBM footprint and an eighth of its SSD footprint, which is what makes long agent loops affordable rather than merely possible. [zartbot's architecture breakdown](https://zartbot.github.io/blog/model_arch/dsv41flash_arch/en.html) (146 min) is the detailed public walkthrough.

### The MoE layer: fine-grained experts, shared experts, balancing without a loss

**DeepSeekMoE**, from V2, makes two changes to the Mixtral-style mixture of experts (a handful of large experts, two active per token). **Fine-grained experts**: split each expert into several narrower ones and activate more per token, so V3 routes 8 of 256 rather than 2 of 8. Active parameter count is unchanged, but the number of distinct expert *combinations* explodes combinatorially, which is what lets experts specialise narrowly instead of each being a generalist. **Shared experts**: one expert every token passes through unconditionally, absorbing the common computation otherwise duplicated inside every routed expert and freeing routed capacity for what is actually specialised. Both cost routing and communication overhead: more experts touched per token means more all-to-all traffic, which is why DeepSeek ended up writing their own communication kernels.

**Aux-loss-free load balancing** (V3). Left alone, routers collapse: tokens pile onto a few popular experts, wasting the rest, and under expert parallelism the most loaded GPU sets the step time for everyone. The standard auxiliary balancing loss works but is a second objective fighting the first, pushing tokens away from the expert that would have modelled them best. DeepSeek instead add a bias term to each expert's routing logits and nudge it up or down between steps according to whether that expert was under- or over-loaded. Balancing becomes a control loop outside the loss: it costs nothing in the objective and cannot trade quality for uniformity. A few lines of code, and now close to standard practice across open MoE models.

**MTP (Multi-Token Prediction)** adds lightweight modules that predict, during training, not only the next token but the one after it (and further out) from the same trunk: denser supervision per forward pass, so the model learns more per token seen, and representations forced to look further ahead. At inference the extra heads are already a draft of the next few tokens, reusable as a built-in draft model for speculative decoding, with no separate draft model to train, align and host.

### Numerics and systems: FP8, DualPipe, DeepEP, disaggregation

**FP8 mixed-precision training** was V3's headline systems result: the first frontier-scale run demonstrated end to end in 8-bit floating point, roughly halving memory traffic and raising effective tensor-core throughput against BF16. Naive FP8 fails because the format's dynamic range is small: one outlier forces the tensor's scale down and small gradients flush to zero. The recipe: fine-grained scaling (per-tile and per-block scale factors rather than one per tensor, so one outlier cannot poison a whole matrix), sensitive components (master weights, optimizer state, normalisation, embedding and output layers) kept in higher precision, and accumulation promoted to higher precision at intervals to work around the tensor cores' limited accumulate width. On their reported curves it buys BF16-equivalent loss at roughly half the memory and materially faster steps, and costs a much more delicate training stack.

**DualPipe** is a pipeline-parallel schedule. Ordinary pipeline parallelism leaves "bubbles", stretches where a stage waits on its neighbour with nothing to do. DualPipe feeds the pipeline from both ends and overlaps one micro-batch's MoE all-to-all dispatch and combine traffic with another's compute, hiding expert communication behind arithmetic instead of serialising it in front. This mattered more to DeepSeek than to most: they trained on H800s, whose interconnect bandwidth is cut relative to H100, so communication rather than FLOPs was the binding constraint.

**DeepEP**, their open-sourced expert-parallel communication library, is hand-written dispatch and combine kernels for MoE routing traffic, with separate NVLink and RDMA paths and a low-latency variant for decode. It exists because generic collective operations are not shaped like MoE traffic, which is a skewed, dynamically-routed, token-level all-to-all rather than a uniform exchange.

**Prefill/decode disaggregation** splits serving across two GPU pools because the phases have opposite bottlenecks: prefill is compute-bound and batches thousands of tokens at once, decode is memory-bandwidth-bound and produces one token per sequence per step. Interleaving them configures each phase wrong; separating them lets each pool be batched, parallelised and sized for its own limit, at the cost of shipping the KV cache between pools. Now standard in serious vLLM and SGLang deployments.

### Training and RL: GRPO, R1, hybrid thinking

**GRPO (Group Relative Policy Optimization)**, from the DeepSeekMath work, is a PPO variant whose distinguishing move is deleting the value network. PPO needs a learned critic of roughly policy size for the advantage baseline: a second large model in memory, a second thing to train, a second thing to go unstable. GRPO instead samples a group of completions for the same prompt, scores them all, and uses the group's own statistics (mean, and in the original formulation standard deviation) as the baseline, so a completion's advantage is how much better it did than its siblings. That buys roughly half the memory and one fewer model to babysit, and fits verifiable-reward RL naturally, since many rollouts per prompt are cheap when scoring is automatic. It costs those extra rollouts, moving the expense into sampling, and later work showed the standard-deviation normalisation biases across prompt difficulty and response length, which several successor variants simply drop.

**RLVR and R1.** R1-Zero applied GRPO directly to the V3 base with rewards computed only from automatically checkable outcomes (mathematics with a known answer, code that passes tests) plus formatting, with no supervised reasoning traces at all. Long chains of thought, self-checking and backtracking emerged from that alone, and the emergence, not the benchmark number, is the result that mattered: reasoning was reachable without proprietary reasoning data, which is what made an open reasoning era possible rather than merely announced. R1 proper added a small cold-start supervised set to fix R1-Zero's unreadable, language-mixed output, then RL, then a further supervised-plus-RL round. DeepSeek also distilled R1's traces into Qwen and Llama bases from 1.5B to 70B, showing the behaviour transfers by ordinary SFT on traces, which is why half the open reasoning models of 2025 were R1 distillations.

**Hybrid thinking** (V3.1 onward) folds chat and reasoning into one checkpoint, with long-chain mode selected by the prompt template rather than by loading different weights. One set of weights, one cache, one deployment, and the caller pays for deliberation only where it earns its latency.

### Lineage

Dates and what changed; mechanisms are above.

- **DeepSeek LLM / Coder (2023)**: High-Flyer (quant fund) spinoff; early Llama-style dense models, notable for the scaling-law and data work that set up what followed.
- **V2 (May 2024)**: introduced **MLA** and **DeepSeekMoE** (fine-grained plus shared experts). MLA's serving cost is what let them start the Chinese API price war.
- **V3 (Dec 2024)**: 671B total / 37B active; MLA plus a 256-expert MoE (8 routed active, 1 shared), aux-loss-free bias-based balancing, multi-token prediction, FP8 mixed-precision training, DualPipe. The ~$5.6M final-run compute claim on 2,048 H800s shook the industry; the report is unusually explicit about the infra behind it.
- **R1 (Jan 2025)**: GRPO-based RL on the V3 base produced o1-class reasoning; R1-Zero showed the behaviour emerging from pure RL; MIT license plus 1.5B-70B distillations. Triggered the "DeepSeek moment" and Nvidia's record one-day selloff.
- **V3.1 (Aug 2025)**: chat and reasoning merged into one hybrid-thinking checkpoint.
- **V3.2-Exp (Sep 2025)**: **DSA**, the lightning-indexer sparse attention above; halved long-context costs.
- **V4 (Apr 2026)**: current family, two MoE models. **V4 Pro** (1.6T total / 49B active) and **V4 Flash** (284B / 13B). Hybrid compressed attention (CSA over groups of 4, HCA over groups of 128) with low-rank query and output projections holds the KV cache near 2% of a vanilla transformer's at 1M context. Pro is the strongest open-weight model on SWE-bench verified (~80.6%); Flash leads browsing-style agentic evaluations at very low cost.
- **V4 Flash vision (Aug 2026)**: **DeepSeek-v4-flash-vision-exp** (Aug 21), an experimental vision variant of V4 Flash and the only DeepSeek model accepting image input; images are normalised to at most 384 tokens each, up to 600 images per request. [API docs](https://api-docs.deepseek.com/guides/vision/) (docs, ~10 min)
- **V4.1-Flash (Sep 2026)**: 552B total, 8B active during prefill and 16B during decode, MIT licence, weights on Hugging Face in 48 safetensors shards. A causal **encoder-decoder**, 40 layers split 20 and 20, the first frontier-scale open model to abandon the decoder-only consensus, with a 1M-token context, native vision and a reasoning-effort dial from 1 to 100. Reported Terminal-Bench 2.1 at 90.6, Codeforces 3471 and GPQA Diamond 90.9, with DeepSeek conceding it holds up better on shorter agent loops than on the longest-horizon evaluations. Pricing $0.30 and $1.20 per million at peak and half that off-peak, cache hits from $0.006. One operational detail decides whether anything you pinned still behaves: the API id is `deepseek-flash`, and since Sep 14 at noon Beijing time `deepseek-v4-pro` requests route here at Flash pricing until V4.1 Pro ships, so a call naming V4 Pro is answered by V4.1-Flash. [API changelog](https://api-docs.deepseek.com/updates/) (10 min)

### Current models

| Model | Params | Notes |
| --- | --- | --- |
| V4.1-Flash | 552B / 8B prefill, 16B decode | Encoder-decoder, 1M context, native vision; `deepseek-flash`, and `deepseek-v4-pro` currently routes here |
| V4 Pro | 1.6T / 49B active | Strongest open weights on SWE-bench verified, 1M context; API requests route to V4.1-Flash until V4.1 Pro ships |
| V4 Flash | 284B / 13B active | Price-performance and agentic browsing |
| R1 (legacy) | 671B / 37B | Historic; reasoning now folded into V-line |

### Cross-links

- [Reasoning models and test-time compute](../reasoning-models.md): R1's role in the reasoning era.
- [Mixture-of-Experts (MoE) models](../moe-models.md): DeepSeekMoE, aux-loss-free balancing.
- [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](../_comparisons/llm-architecture-gallery.md): MLA/DSA/CSA in context.
