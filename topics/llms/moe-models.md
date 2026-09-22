# Mixture-of-Experts (MoE) models

⏱ 15 min read · +3h 25m resources

### Best resources

- [Neptune.ai: Mixture of Experts LLMs](https://neptune.ai/blog/mixture-of-experts-llms) (25 min): the best single explainer of gating, load balancing, and MoE vs dense trade-offs.
- [HuggingFace: Mixture of Experts Explained](https://huggingface.co/blog/moe) (30 min): classic reference with Switch/GShard history and expert-parallelism detail.
- [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437) (1h 30m): the modern open MoE template (fine-grained plus shared experts, aux-loss-free balancing). A long tech report rather than a paper; triage by reading the MoE and infrastructure sections.
- [Sebastian Raschka: The Big LLM Architecture Comparison](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison) (1h): MoE config tables across current open models.
- Papers: [Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity](../../papers/2021-01_switch-transformer/summary.md), [Mixtral of Experts](../../papers/2024-01_mixtral/summary.md), [DeepSeek-V3 Technical Report](../../papers/2024-12_deepseek-v3/summary.md), [Qwen3 Technical Report](../../papers/2025-05_qwen3/summary.md).

### Core idea

A Mixture-of-Experts layer replaces the transformer block's single feed-forward network with N independent FFNs (the experts) plus a small trainable router. Per token the router scores every expert, a selection rule keeps a few (usually the top k), and the layer outputs the sum of the selected experts' outputs weighted by the router's own scores. Attention, normalisation and the residual stream stay dense and shared; only the FFN is sparse.

The consequence is arithmetic. FLOPs per token come from the k experts that run, knowledge capacity from all N. A model can hold 671B parameters and cost roughly 37B parameters' worth of matmul per token, which is what "671B total, 37B active" on a model card means, and why the two numbers predict different things: memory and quality from the total, latency and price from the active.

Per token with hidden state `h`, the layer does four things:

1. **Score.** Router logits `s = W_r h`, one per expert. `W_r` is a single `d_model x N` matrix, typically well under 0.1% of the layer's parameters, so the router is free in every sense except the trouble it causes.
2. **Normalise.** Softmax over all N classically, or an independent sigmoid per expert in the DeepSeek-V3 lineage. Softmax couples the experts, since raising one score lowers every other weight, which squashes individual gate values when k is large; independent sigmoids do not, which is why high-k fine-grained designs moved to them.
3. **Select.** Keep the top k, and renormalise those k weights so they sum to one.
4. **Combine.** Output `y = sum of g_i times E_i(h)` over the selected experts, added back into the residual stream.
The gate weight `g_i` in step 4 is the only path by which the router learns anything. Selection is a discrete argmax-like operation with no gradient, so the router receives gradient only through the magnitude of `g_i` on experts actually chosen. An expert that stops being selected stops producing any evidence that it would have been good: the structural reason routing collapses unless something prevents it, and the reason every balancing technique below exists.

Why the trade works:

- **Same active budget, better quality.** Mixtral 8x7B (47B total, 13B active) matched or beat Llama-2 13B on MMLU, HellaSwag, PIQA and math. At equal inference FLOPs, the idle capacity is close to free quality.
- **Cheaper training to a given loss.** Switch Transformer reached T5-Base quality roughly 7x faster at fixed FLOPs, then kept improving. Same mechanism: a token's gradient updates only the experts it visited, so parameter count grows without per-step cost growing with it.
- **Capacity past one device.** Experts are independent by construction, so they shard cleanly across GPUs (expert parallelism), and total parameters can exceed any single node's memory.
What it costs, the subject of most of this page: memory is priced on total parameters while throughput is priced on active ones, since every parameter must be resident at serving time; routing adds two all-to-all collectives per layer; per-expert GEMMs are small and skinny, so utilisation is worse than the FLOP count suggests; and a discrete decision inside an otherwise differentiable model is a permanent source of instability.

### Gating and routing

The router has three jobs that pull against each other: score experts per token, decide how many to activate, and keep the resulting traffic spread across hardware.

- **Top-1 (Switch Transformer).** One expert per token: minimum FLOPs, minimum dispatch volume, one expert's weights touched. It costs routing robustness. There is no second opinion within a token, so a bad routing decision is uncorrected, and the single gate weight is the only learning signal, which makes top-1 the configuration most dependent on aggressive balancing. Switch's real contribution was showing that k of 1 works at all, against the prior assumption that k of at least 2 was needed for usable router signal.
- **Top-2 (GShard, Mixtral).** The default for years. Doubles expert FLOPs per token against top-1 and buys a smoother layer function (the output can interpolate between two experts) and a better-conditioned router, because two gate weights per token give it a comparison rather than a single scalar.
- **Noisy top-k.** Gaussian noise added to the scores before selection, so nearly-tied experts share the traffic instead of the marginally better one winning every time. Balancing implemented in the selection rule rather than in the loss; it costs a little routing precision to keep marginal experts alive. From the original sparsely-gated MoE work, carried into GShard.
- **Fine-grained top-k plus shared experts (the DeepSeekMoE lineage, now dominant).** Split the same total expert FFN budget into many narrower experts and raise k to compensate: active parameters stay roughly constant while the distinct expert combinations the router can express grow combinatorially, since 8 of 256 is an enormously larger hypothesis space than 2 of 8, and specialisation can be finer than "one expert per broad domain". One or more **shared experts** are then always-on, bypassing the router entirely and running for every token; they absorb what every token needs (general syntax, high-frequency patterns), so routed experts spend their capacity on actual specialisation rather than each relearning the same common knowledge. The cost is hardware: more, narrower experts mean smaller per-expert GEMMs (worse arithmetic intensity) and wider all-to-all fan-out per token.
A practical consequence of step 2: with sigmoid scoring the gate values do not compete, so adding experts does not dilute the weights of the selected ones. That property, more than any quality claim, is why V3-style sigmoid plus renormalisation replaced softmax as k climbed into double digits.

### Load balancing

Left alone, routing collapses. An expert chosen slightly more often receives more gradient, gets better, and is chosen more often still, while the rest starve and (per the gradient argument above) never generate evidence that they were worth reviving. It is a quality problem, because effective capacity shrinks to the experts that survived, and simultaneously a systems problem: with experts sharded across GPUs, an overloaded expert stalls its whole layer, since the all-to-all collectives wait on the slowest shard, and hot experts overrun whatever per-expert memory budget was allocated.

The fixes, in the order they were invented, with what each actually costs:

1. **Noisy gating.** Randomness in the selection rule redistributes tokens near a decision boundary. Cheap and unbiased, but it touches only marginal cases and cannot rescue an expert that has fallen far behind.
2. **Auxiliary load-balancing loss.** Switch Transformer adds a term proportional to the sum over experts of `f_i` times `P_i`, where `f_i` is the fraction of tokens actually dispatched to expert i and `P_i` its mean router probability. The product is minimised when both are uniform, so the term pushes the router toward even traffic. Note the asymmetry: `f_i` is a counting statistic with no gradient, so the loss differentiates through `P_i` only, nudging the router's beliefs rather than directly editing the assignment. The cost is a second objective alongside language modelling, and the two conflict wherever a token genuinely does belong to one expert. That quality tax is what the aux-loss-free method later removed.
3. **Device-level balancing loss.** DeepSeekMoE groups experts by the device they live on and balances traffic across groups rather than individual experts, conceding that per-expert uniformity was never the goal: what matters is that no GPU is the straggler in the all-to-all. Aligning the penalty with the hardware topology buys real throughput and leaves the router freer within a device.
4. **Capacity factor.** A hard cap on how many tokens any one expert will accept, covered in its own section below.
5. **Aux-loss-free balancing (current best practice, DeepSeek-V3).** Maintain a per-expert bias `b_i` added to the routing score **only for top-k selection**, never to the gate weight that scales the expert's output. After each step, the bias of an overloaded expert is decreased and that of an underloaded one increased by a small fixed rate. Because the bias never enters the gate weight, it never appears in the gradient: balancing moves the decision boundary instead of adding a competing training objective, so the quality tax of point 2 disappears. V3 retained only a very small sequence-level auxiliary term as a guard against extreme within-sequence imbalance. Widely copied since, and the reason "aux-loss-free" appears on nearly every 2025 and 2026 open MoE model card.
Often confused with load balancing: the **router z-loss** (ST-MoE) penalises the log-sum-exp of the router logits, keeping their magnitude small. It does not balance anything. It exists because large router logits combined with bf16 exponentials produce roundoff blowups and loss spikes, and it is nearly free insurance against a class of divergence that is otherwise painful to debug.

### Capacity factors and dropped tokens

Training an MoE efficiently means allocating a fixed-size buffer per expert before you know how many tokens will choose it. An expert's capacity is a **capacity factor** times the average load, roughly `CF times k times tokens_per_batch / N`: 1.0 provisions exactly the average, 1.25 provisions 25% headroom.

The trade is direct. Raising the capacity factor costs memory and padding compute in proportion, because the buffers are allocated and processed whether or not they fill. Lowering it means tokens arriving at a full expert are **dropped**: in GShard and Switch they either skip the layer entirely, passing through on the residual connection with no FFN applied, or are rerouted to their next-best expert. A dropped token is not a crash, it is a silently weaker forward pass, and drops concentrate on exactly the tokens that wanted the popular experts.

Two consequences in practice. First, drop behaviour differs between training and inference, since inference batches have different composition and often no capacity limit at all, so a model trained with heavy dropping is evaluated in a regime it was not trained in. Second, the problem is an artefact of static buffer allocation and can be removed: **dropless** MoE (the MegaBlocks line) reformulates expert computation as block-sparse matrix multiplication over ragged per-expert token groups, so no expert has a fixed capacity, nothing is padded, and nothing is dropped. Hence modern training stacks discuss grouped GEMM kernels rather than capacity factors, which survive mostly in older recipes and in inference-time admission control.

### Expert parallelism and the systems view

**Expert parallelism (EP)** shards the experts across devices: each GPU holds a subset of a layer's experts, and every token must travel to wherever its chosen experts live. The layer therefore costs two collectives, not one. A **dispatch all-to-all** sends each token's hidden state to the ranks holding its k experts, the experts compute locally, and a **combine all-to-all** returns the outputs to be weighted and summed on the token's home rank. Communication volume per token per layer is on the order of `k times d_model` elements each way, so it grows with k and with sparsity fan-out, not with total parameters.

How it composes with the rest of the parallelism stack, the part that decides whether a training run fits:

- **Data parallel / ZeRO / FSDP** shards optimiser state and parameters across the data-parallel group as usual; MoE weights are simply the largest thing being sharded, and expert parameters dominate the count at high sparsity.
- **Tensor parallel** splits the matrices inside each expert. EP splits which experts exist where; TP splits each expert. They are orthogonal and frequently combined, TP inside a node (NVLink bandwidth) and EP across nodes or a whole node pool.
- **Pipeline parallel** splits layers across stages. Its bubble and the MoE all-to-all are both latency; the engineering is overlapping them, which is exactly what DeepSeek-V3's DualPipe schedule exists to do.
The all-to-all is the thing to watch. It is a synchronising collective, so its cost is set by the slowest rank (the systems half of load balancing), and at small batch sizes it is latency-bound rather than bandwidth-bound, so it does not amortise. DeepSeek's **DeepEP** is the reference open implementation: dispatch and combine kernels using NVLink and RDMA paths directly and overlapping communication with compute, plus a low-latency mode aimed at decoding. With **prefill/decode disaggregation** (compute-bound prefill and memory-bound decode on separate pools, each batched and parallelised on its own terms), this is the reference stack for cheap high-sparsity serving. "Wide EP" means exactly this: hundreds of experts spread across a large pool so each GPU holds only a few and each expert's weights are read once for many tokens.

### What breaks at inference

Serving an MoE is a different problem from serving a dense model of the same active size, and every difference is a downside except the FLOP count.

- **Memory is priced on total parameters.** A 671B/37B model needs all 671B resident across the serving pool; the active count buys latency and price per token, never memory. Quantisation and MoE arrived together for this reason: expert weights are the overwhelming majority of the parameter count, so per-expert INT4 or MXFP4 storage is what makes trillion-parameter checkpoints fit at all.
- **Each expert sees only a slice of the batch.** With N routed experts and top-k selection, the expected number of tokens reaching an expert is about `B times k / N`: at 256 experts and k of 8, one thirty-second of the batch. Decode already produces small GEMMs (one token per sequence) and sparsity divides that further, so per-expert matmuls are skinny and memory-bandwidth-bound, and utilisation is poor unless the aggregate batch is very large. This one fact drives the modern serving pattern: huge batches, wide expert parallelism so each GPU's few experts get a decent share, grouped GEMM kernels fusing many small per-expert matmuls into one launch, and disaggregation so decode batches independently of prefill.
- **Load imbalance returns at request time, and it is not the training distribution.** Real traffic is skewed (one language, one code style, one prompt template repeated), so a handful of experts run hot and their host GPUs become everyone's tail latency. The standard mitigation is redundancy: replicate hot experts onto extra devices and rebalance placement periodically from observed traffic, trading memory for tail latency.
- **Attention was never sparsified.** MoE reduces FFN compute and leaves attention cost and the KV cache where they were. At long context these dominate, which is precisely why the models that pushed sparsity hardest also shipped MLA and trained sparse attention: two independent efficiency axes that have to be attacked separately.
- **Routing is input-dependent, so performance is input-dependent.** Latency and throughput vary with what the batch contains, making capacity planning statistical rather than deterministic and making benchmark numbers sensitive to prompt mix in a way dense models are not.

### Why sparsity ratios keep rising

Sparsity ratio here means total parameters divided by active parameters: Mixtral sat near 3.6x (about 28% of parameters active), the 2026 frontier sits at roughly 22x to 33x (3% to 5% active), with DeepSeek V4 Pro the sparsest by ratio at about 33x.

Read a "sparsest model" claim carefully, because two different quantities get that label. The **ratio** decides how much memory you buy per unit of decode speed, and on that measure the flagships lead. The **absolute active count** decides what a token actually costs to decode, and there the leader is different: StepFun's Step 5 Preview activates 27B of 600B, the smallest active count yet shipped in the frontier band even though its 22x ratio is unremarkable, and Qwen3.8-Flash-Next's 6B of 125B is the smallest in the flash tier at about 21x. A vendor claiming to be sparsest is usually quoting whichever of the two it wins.

The pull is scaling behaviour. Holding active parameters fixed and adding total parameters keeps improving loss, because that is capacity without per-token compute, and labs including DeepSeek and Moonshot have published scaling work treating sparsity as a first-class axis alongside parameters and tokens rather than a fixed architectural choice. Returns diminish, but slowly enough that the optimum has kept moving toward sparser configurations as compute budgets grew.

Three things push back and set the current ceiling. Memory: total parameters must be stored and paid for at serving time, the hard constraint and the reason low-precision native checkpoints matter so much. Communication: fan-out per token grows with k, and all-to-all volume with it. Expert under-training: each expert sees roughly `1/N` of the token stream, so at very high N experts risk seeing too few tokens to specialise well within a fixed token budget, which motivates shared experts and architectural work on routing stability at large N (Kimi K3's Stable LatentMoE is aimed at exactly this at 896 experts).

### The 2026 MoE landscape

Sparse MoE is the default for every frontier and near-frontier model, converged on high sparsity: many small experts, few active, usually with a shared expert alongside.

| Model (date) | Total/active params | Experts (routed, active + shared) |
| --- | --- | --- |
| Mixtral 8x7B (2023) | 47B / 13B | 8, top-2 (old "few big experts" style) |
| DeepSeek-V3/R1 (2024-25) | 671B / 37B | 256, top-8 + 1 shared |
| Llama 4 Maverick (2025) | 400B / 17B | 128, top-1 + shared |
| Qwen3 235B (2025) | 235B / 22B | 128, top-8, no shared |
| Kimi K2 (2025) | 1T / 32B | 384, top-8 + 1 shared |
| gpt-oss-120b (2025) | 117B / 5.1B | 128, top-4 |
| GLM-5.2 (2026) | 744B / 40B | fine-grained, MIT-licensed |
| DeepSeek-V4 Pro (2026) | 1.6T / 49B | fine-grained + compressed sparse attention |
| Qwen3.8-Max (2026) | 2.4T / 95B | sparse MoE + hybrid attention |
| Kimi K3 (2026) | 2.8T / 104B | 896 experts, 16 active ("Stable LatentMoE") |
| GLM-5.3-Flash (2026) | 320B / 18B | 288 experts, 8 active; hybrid linear plus sparse attention, IndexPool KV compression |
| Tencent Hy4 preview (2026) | 770B / 49B | About 16x, conservative for the band; two reasoning levels |
| Qwen3.8-Flash-Next (2026) | 125B / 6B | About 21x; Gated DeltaNet plus QSA, the Qwen4 architecture preview |
| Step 5 Preview (2026) | 600B / 27B | Smallest active count in the frontier band; weights promised, not yet published |
| DeepSeek V4.1-Flash (2026) | 552B / 8B prefill, 16B decode | Encoder-decoder, so the active count differs by phase |

Trends worth knowing:

- **Sparsity ratios keep rising**, from about 28% active (Mixtral) to 3% to 4% (V4, K3), for the reasons above. Read the ratio first on any new model card: it is the gap between the GPU memory you must buy and the latency you will get. Read the absolute active count second, because that is the one a "sparsest model" headline is usually about.
- **The active count need not be one number.** DeepSeek V4.1-Flash is an encoder-decoder activating 8B during prefill and 16B during decode, so a single "total/active" figure does not describe it. Expect more of this as labs optimise the two phases separately, and expect model cards and capacity plans built around one active count to mislead on it.
- **Shared experts** (always-on, every token passes through them) hold the common knowledge so routed experts can specialise. Qwen3 dropped them and did fine, most other lines kept them, so this is a genuine design choice rather than settled practice. Kimi K3's **Stable LatentMoE** reworks the expert representation space to keep routing stable at 896 experts, where ordinary routers become noisy.
- **Dense warm-up layers**: V3 and GLM keep the first few blocks dense. Early-layer representations are close to raw embeddings and poorly differentiated, so routing there is near-random and destabilising; running those blocks dense costs a little compute and removes the problem.
- **MoE reached small models.** Gemma 4 26B-A4B, Cohere North Mini Code (30B-A3B) and gpt-oss-20b make laptop-class MoE normal. Same trade at a smaller scale: memory for the whole model, compute for a fraction, which suits a machine with plenty of unified memory and little compute.
- **Low-precision native checkpoints.** K2 Thinking and K3 ship INT4/MXFP4 weights and gpt-oss shipped MXFP4, so the released weights are already 4-bit rather than quantised after the fact by the community. Sparse plus quantised is how trillion-parameter weights stay servable.
- **Sigmoid routing plus bias balancing** (the V3 lineage, described in the gating and load-balancing sections) has largely replaced softmax routing with heavy auxiliary losses.
See [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](_comparisons/llm-architecture-gallery.md) (11 min read · +2h resources) for per-model configs, and the family pages for each line's specifics.
