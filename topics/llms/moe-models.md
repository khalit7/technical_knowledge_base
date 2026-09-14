# Mixture-of-Experts (MoE) models

⏱ 17 min read · +3h 25m resources

Last updated: 2026-08-31. Rewritten on 2026-08-31 under the "explain, do not name-drop" convention: every mechanism named here is now described rather than listed. Originally seeded from Khalid's own prep notes on 2026-08-24; nothing from that version was dropped.

## Best resources

- [Neptune.ai: Mixture of Experts LLMs](https://neptune.ai/blog/mixture-of-experts-llms) (25 min): the best single explainer of gating, load balancing, and MoE vs dense trade-offs.
- [HuggingFace: Mixture of Experts Explained](https://huggingface.co/blog/moe) (30 min): classic reference with Switch/GShard history and expert-parallelism detail.
- [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437) (1h 30m): the modern open MoE template (fine-grained plus shared experts, aux-loss-free balancing). Long tech report rather than a standard paper; the MoE and infrastructure sections are the ones to read if you are triaging.
- [Sebastian Raschka: The Big LLM Architecture Comparison](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison) (1h): MoE config tables across current open models.
- Papers in this repo: Switch Transformer, Mixtral, DeepSeek-V3, Qwen3.

## Core idea

A Mixture-of-Experts layer replaces the transformer block's single feed-forward network with N independent feed-forward networks (the experts) plus a small trainable router. For each token the router scores every expert, a selection rule keeps a few of them (usually the top k), and the layer's output is the sum of the selected experts' outputs weighted by the router's own scores. Everything else in the block is untouched: attention, normalisation, and the residual stream stay dense and shared, and only the FFN is sparse.

The consequence that matters is arithmetic. FLOPs per token are set by the k experts that actually run, while the model's knowledge capacity is set by all N of them. A model can therefore hold 671B parameters and cost roughly 37B parameters' worth of matmul per token, which is what "671B total, 37B active" on a model card means, and why total and active parameters are two different numbers that predict two different things: memory and quality from the first, latency and price from the second.

Per token with hidden state `h`, the layer does four things:

1. **Score.** Router logits `s = W_r h`, one per expert. `W_r` is a single `d_model x N` matrix and is typically well under 0.1% of the layer's parameters, so the router is free in every sense except the trouble it causes.
2. **Normalise.** A softmax over all N in the classic formulation, or an independent sigmoid per expert in the DeepSeek-V3 lineage. Softmax couples the experts (raising one score necessarily lowers every other weight), which squashes the individual gate values when k is large; independent sigmoids do not couple, which is why the high-k fine-grained designs moved to them.
3. **Select.** Keep the top k, and renormalise those k weights so they sum to one.
4. **Combine.** Output `y = sum of g_i times E_i(h)` over the selected experts, added back into the residual stream.

The gate weight `g_i` in step 4 is not decoration; it is the only path by which the router learns anything. Selection is a discrete argmax-like operation with no gradient, so the router receives gradient only through the magnitude of `g_i` on experts that were actually chosen. An expert that stops being selected therefore stops producing any signal about whether it would have been good, which is the structural reason routing collapses if nothing prevents it, and the reason every balancing technique below exists.

Why the trade works:

- **Same active budget, better quality.** Mixtral 8x7B (47B total, 13B active) matched or beat Llama-2 13B on MMLU, HellaSwag, PIQA and math. At equal inference FLOPs, the idle capacity is close to free quality.
- **Cheaper training to a given loss.** Switch Transformer reached T5-Base quality roughly 7x faster at fixed FLOPs, then kept improving. The mechanism is the same one: a token's gradient updates only the experts it visited, so parameter count grows without the per-step cost growing with it.
- **Capacity past one device.** Experts are independent by construction, so they shard cleanly across GPUs (expert parallelism), and total parameters can exceed any single node's memory.

What it costs, which is the subject of most of this page: every parameter must still be resident somewhere at serving time, so memory is priced on total parameters while throughput is priced on active ones; routing adds two all-to-all collectives per MoE layer; per-expert GEMMs are small and skinny, so hardware utilisation is worse than the FLOP count suggests; and a discrete decision sits inside an otherwise differentiable model, which is a permanent source of instability.

## Gating and routing

The router has three jobs that pull against each other: score experts per token, decide how many to activate, and keep the resulting traffic spread across hardware.

- **Top-1 (Switch Transformer).** Each token goes to exactly one expert. This is the cheapest possible configuration: minimum FLOPs, minimum dispatch volume, one expert's weights touched per token. What it costs is routing robustness. There is no second opinion within a token, so a bad routing decision is uncorrected, and the single gate weight is the only learning signal, which makes top-1 the configuration most dependent on aggressive balancing. Switch's real contribution was showing that k of 1 works at all, against the prior assumption that k of at least 2 was needed for the router to receive usable signal.
- **Top-2 (GShard, Mixtral).** The default for years. It doubles expert FLOPs per token against top-1 and buys a smoother layer function (the output can interpolate between two experts) and a better-conditioned router, because two gate weights per token give the router a comparison rather than a single scalar.
- **Noisy top-k.** Gaussian noise is added to the scores before selection, so experts whose scores are nearly tied share the traffic instead of the marginally better one winning every time. It is a balancing mechanism implemented in the selection rule rather than in the loss, and it costs a little routing precision in exchange for keeping marginal experts alive. Introduced in the original sparsely-gated MoE work and carried into GShard.
- **Fine-grained top-k plus shared experts (the DeepSeekMoE lineage, now dominant).** Split the same total expert FFN budget into many narrower experts and raise k to compensate, so active parameters stay roughly constant while the number of distinct expert combinations the router can express grows combinatorially: choosing 8 of 256 is an enormously larger hypothesis space than 2 of 8, and specialisation can be finer than "one expert per broad domain". One or more **shared experts** are then made always-on, bypassing the router entirely and running for every token. The shared expert absorbs what every token needs (general syntax, high-frequency patterns), so the routed experts do not each have to relearn the same common knowledge, and their capacity goes to actual specialisation instead of redundancy. The cost of going fine-grained is hardware: more, narrower experts mean smaller per-expert GEMMs (worse arithmetic intensity) and wider all-to-all fan-out per token.

A practical consequence of step 2 above: with sigmoid scoring the gate values are not forced to compete, so adding experts does not dilute the weights of the selected ones. That property, more than any quality claim, is why the V3-style sigmoid plus renormalisation replaced softmax as k climbed into double digits.

## Load balancing

Left alone, routing collapses. An expert that is chosen slightly more often receives more gradient, gets better, and is therefore chosen more often still, while the rest starve and (per the gradient argument above) never generate evidence that they were worth reviving. This is a quality problem, because the model's effective capacity shrinks to the experts that survived, and it is simultaneously a systems problem: with experts sharded across GPUs, an overloaded expert stalls its whole layer, since the all-to-all collectives wait on the slowest shard, and hot experts overrun whatever per-expert memory budget was allocated.

The fixes, in the order they were invented, with what each actually costs:

1. **Noisy gating.** Randomness in the selection rule redistributes tokens that were near a decision boundary. Cheap and unbiased, but it only touches marginal cases and cannot rescue an expert that has fallen far behind.
2. **Auxiliary load-balancing loss.** Switch Transformer's formulation adds a term proportional to the sum over experts of `f_i` times `P_i`, where `f_i` is the fraction of tokens actually dispatched to expert i and `P_i` is the mean router probability assigned to it. The product is minimised when both are uniform, so the term pushes the router toward even traffic. Note the asymmetry: `f_i` is a counting statistic with no gradient, so the loss is differentiated through `P_i` only, which is why it nudges the router's beliefs rather than directly editing the assignment. The cost is that this is an objective the model must satisfy alongside language modelling, and the two conflict wherever a token genuinely does belong to one expert. That quality tax is the thing the aux-loss-free method later removed.
3. **Device-level balancing loss.** DeepSeekMoE groups experts by the device they live on and balances traffic across groups rather than across individual experts. This concedes that per-expert uniformity was never the goal; what matters is that no GPU is the straggler in the all-to-all. It buys real throughput by aligning the penalty with the hardware topology, and it leaves the router freer within a device.
4. **Capacity factor.** A hard cap on how many tokens any one expert will accept, covered in its own section below.
5. **Aux-loss-free balancing (current best practice, DeepSeek-V3).** Maintain a per-expert bias term `b_i` that is added to the routing score **only for the purpose of top-k selection**, never to the gate weight that scales the expert's output. After each step, the bias of an overloaded expert is decreased and that of an underloaded expert increased by a small fixed rate. Because the bias never enters the gate weight, it never appears in the gradient of the loss: balancing is achieved by moving the decision boundary rather than by adding a competing training objective, so the quality tax of point 2 disappears. V3 retained only a very small sequence-level auxiliary term as a guard against extreme within-sequence imbalance. Widely copied since, and the reason "aux-loss-free" appears on nearly every 2025 and 2026 open MoE model card.

A related stabiliser worth knowing because it is often confused with load balancing: the **router z-loss** (introduced in ST-MoE) penalises the log-sum-exp of the router logits, keeping their magnitude small. It does not balance anything. It exists because large router logits combined with bf16 exponentials produce roundoff blowups and loss spikes, and it is nearly free insurance against a class of divergence that is otherwise painful to debug.

## Capacity factors and dropped tokens

Training an MoE efficiently means allocating a fixed-size buffer per expert before you know how many tokens will choose it. The capacity of an expert is set as a **capacity factor** times the average load, that is, roughly `CF times k times tokens_per_batch / N`. A capacity factor of 1.0 provisions exactly the average; 1.25 provisions 25% headroom.

The trade is direct. Raising the capacity factor costs memory and padding compute in proportion, because the buffers are allocated and processed whether or not they fill. Lowering it means tokens arriving at a full expert are **dropped**: in GShard and Switch they either skip the layer entirely, passing through on the residual connection with no FFN applied, or are rerouted to their next-best expert. A dropped token is not a crash, it is a silently weaker forward pass for that token, and drops concentrate on exactly the tokens that wanted the popular experts.

Two consequences that matter in practice. First, drop behaviour differs between training and inference, since inference batches have different composition and often no capacity limit at all, so a model trained with heavy dropping is being evaluated in a regime it was not trained in. Second, the whole problem is an artefact of static buffer allocation, and it can be removed: **dropless** MoE (the MegaBlocks line) reformulates the expert computation as block-sparse matrix multiplication over a ragged set of per-expert token groups, so no expert has a fixed capacity, nothing is padded, and nothing is dropped. That is why modern training stacks discuss grouped GEMM kernels rather than capacity factors, and why capacity factors show up mostly in older recipes and in inference-time admission control.

## Expert parallelism and the systems view

**Expert parallelism (EP)** shards the experts themselves across devices: each GPU holds a subset of the experts for a layer, and every token must travel to wherever its chosen experts live. The layer therefore costs two collectives, not one. A **dispatch all-to-all** sends each token's hidden state to the ranks holding its k experts, the experts compute locally, and a **combine all-to-all** returns the outputs to be weighted and summed on the token's home rank. Communication volume per token per layer is on the order of `k times d_model` elements each way, so it grows with k and with sparsity fan-out, not with total parameters.

How it composes with the rest of the parallelism stack, which is the part that decides whether a training run fits:

- **Data parallel / ZeRO / FSDP** shards optimiser state and parameters across the data-parallel group as usual; the MoE weights are simply the largest thing being sharded, and expert parameters dominate the count in a high-sparsity model.
- **Tensor parallel** splits the matrices inside each expert. EP splits which experts exist where; TP splits each expert. They are orthogonal and are frequently combined, with TP inside a node (NVLink bandwidth) and EP across nodes or across a whole node pool.
- **Pipeline parallel** splits layers across stages. Its bubble and the MoE all-to-all are both latency, and the interesting engineering is overlapping them: DeepSeek-V3's DualPipe schedule exists specifically to hide all-to-all communication inside pipeline computation.

The all-to-all is the thing to watch. It is a synchronising collective, so its cost is set by the slowest rank (this is the systems half of load balancing), and at small batch sizes it is latency-bound rather than bandwidth-bound, meaning it does not amortise. DeepSeek's **DeepEP** kernels are the reference open implementation: dispatch and combine kernels that use NVLink and RDMA paths directly and overlap communication with compute, plus a low-latency mode aimed at decoding. Together with **prefill/decode disaggregation** (running the compute-bound prefill phase and the memory-bound decode phase on separate pools so each can be batched and parallelised on its own terms), this is the reference stack for cheap high-sparsity serving, and "wide EP" means exactly this: spread hundreds of experts across a large pool so each GPU holds only a few and each expert's weights are read once for many tokens.

## What breaks at inference

Serving an MoE is a different problem from serving a dense model of the same active size, and every difference is a downside except the FLOP count.

- **Memory is priced on total parameters.** A 671B/37B model needs all 671B parameters resident across the serving pool. The active count buys you latency and price per token, never memory. This is why quantisation and MoE arrived together: expert weights are the overwhelming majority of the parameter count, so per-expert INT4 or MXFP4 storage is what makes trillion-parameter checkpoints fit at all.
- **Each expert sees only a slice of the batch.** With N routed experts and top-k selection, the expected number of tokens reaching any given expert is about `B times k / N`. At 256 experts and k of 8 that is one thirty-second of the batch. Decode already produces small GEMMs (one token per sequence); sparsity divides that further, so per-expert matmuls are skinny and memory-bandwidth-bound, and hardware utilisation is poor unless the aggregate batch is very large. This single fact drives the whole modern serving pattern: huge batches, wide expert parallelism so each GPU's few experts get a decent share, grouped GEMM kernels that fuse many small per-expert matmuls into one launch, and disaggregation so decode can be batched independently of prefill.
- **Load imbalance returns at request time, and it is not the training distribution.** Real traffic is skewed (one language, one code style, one prompt template repeated), so a handful of experts run hot and their host GPUs become the tail latency for everyone. The standard mitigation is redundancy: replicate the hot experts onto additional devices and rebalance the placement periodically from observed traffic, which costs memory in exchange for tail latency.
- **Attention was never sparsified.** MoE reduces FFN compute and leaves the attention cost and the KV cache exactly where they were. At long context, attention and KV cache dominate, which is precisely why the same models that pushed sparsity hardest also shipped MLA and trained sparse attention: two independent efficiency axes that have to be attacked separately.
- **Routing is input-dependent, so performance is input-dependent.** Latency and throughput vary with what the batch contains, which makes capacity planning statistical rather than deterministic, and makes benchmark numbers sensitive to prompt mix in a way dense models are not.

## Why sparsity ratios keep rising

Sparsity ratio here means total parameters divided by active parameters: Mixtral sat near 3.6x (about 28% of parameters active), the 2026 frontier sits at 25x to 30x (3% to 4% active).

The pull comes from scaling behaviour. Holding active parameters fixed and adding total parameters keeps improving loss, because you are adding capacity without adding per-token compute, and labs including DeepSeek and Moonshot have published scaling work that treats sparsity as a first-class axis alongside parameters and tokens rather than a fixed architectural choice. The returns diminish, but they diminish slowly enough that the optimum has kept moving toward sparser configurations as compute budgets grew.

Three things push back, and they are what set the current ceiling. Memory: total parameters must be stored and paid for at serving time, which is the hard constraint and the reason low-precision native checkpoints matter so much. Communication: fan-out per token grows with k, and all-to-all volume with it. Expert under-training: each expert sees roughly `1/N` of the token stream, so at very high N experts risk seeing too few tokens to specialise well within a fixed token budget, which is one motivation for shared experts and for architectural work on routing stability at large N (Kimi K3's Stable LatentMoE is aimed at exactly this at 896 experts).

## The 2026 MoE landscape

Sparse MoE is now the default for every frontier and near-frontier model, and the design has converged on high sparsity: many small experts, few active, usually with a shared expert alongside.

| Model (date) | Total/active params | Experts (routed, active + shared) |
|---|---|---|
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

Trends worth knowing, with what each one is:

- **Sparsity ratios keep rising**, from about 28% active (Mixtral) to 3% to 4% (V4, K3), for the reasons in the section above. Read the ratio first on any new model card: it tells you the gap between the GPU memory you must buy and the latency you will get.
- **Shared experts** (the always-on experts every token passes through) hold the common knowledge so routed experts can specialise. Qwen3 dropped them and did fine, most other lines kept them, so this is a genuine design choice rather than settled practice. Kimi K3's **Stable LatentMoE** reworks the expert representation space to keep routing stable at 896 experts, where ordinary routers become noisy.
- **Dense warm-up layers**: V3 and GLM keep the first few blocks dense rather than sparse. Early-layer token representations are still close to raw embeddings and poorly differentiated, so routing decisions there are near-random and destabilising; running those blocks dense costs a little compute and removes the problem.
- **MoE reached small models.** Gemma 4 26B-A4B, Cohere North Mini Code (30B-A3B) and gpt-oss-20b mean laptop-class MoE is normal now. The trade is the same one at a smaller scale: you need memory for the whole model but only pay compute for a fraction, which suits a machine with plenty of unified memory and little compute.
- **Low-precision native checkpoints.** K2 Thinking and K3 ship INT4/MXFP4 weights and gpt-oss shipped MXFP4, meaning the released weights are already in a 4-bit format rather than being quantised after the fact by the community. Sparse plus quantised is how trillion-parameter weights stay servable.
- **Sigmoid routing plus bias balancing** (the V3 lineage described in the gating and load-balancing sections) has largely replaced softmax routing with heavy auxiliary losses.

See [_comparisons/llm-architecture-gallery.md](_comparisons/llm-architecture-gallery.md) for per-model configs, and family pages for each line's specifics: [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](_comparisons/llm-architecture-gallery.md) (10 min read · +2h resources).
