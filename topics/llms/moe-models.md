# Mixture-of-Experts (MoE) models

Last updated: 2026-08-24. Seeded from Khalid's own prep notes, rewritten and extended with
the current landscape.

## Best resources

- [Neptune.ai: Mixture of Experts LLMs](https://neptune.ai/blog/mixture-of-experts-llms): the best single explainer of gating, load balancing, and MoE vs dense trade-offs.
- [HuggingFace: Mixture of Experts Explained](https://huggingface.co/blog/moe): classic reference with Switch/GShard history and expert-parallelism detail.
- [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437): the modern open MoE template (fine-grained + shared experts, aux-loss-free balancing).
- [Sebastian Raschka: The Big LLM Architecture Comparison](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison): MoE config tables across current open models.
- Papers in this repo: [Switch Transformer](../../papers/2021-01_switch-transformer/summary.md), [Mixtral](../../papers/2024-01_mixtral/summary.md), [DeepSeek-V3](../../papers/2024-12_deepseek-v3/summary.md), [Qwen3](../../papers/2025-05_qwen3/summary.md).

## Core idea

MoE replaces the transformer's feed-forward layer with N specialised sub-networks
(experts) plus a trainable gating network. For each token, the gate scores all N experts,
selects a subset (usually top-k), and the layer's output is the gate-weighted sum of the
selected experts' outputs (gate weights from a softmax, or sigmoid in newer designs).
Only the selected experts run, so compute per token tracks *active* parameters while
capacity tracks *total* parameters. Attention layers stay shared; only FFNs are sparse.

Why it wins:

- Same active-parameter budget, better quality: Mixtral 8x7B (13B active, 47B total)
  matched or beat Llama-2 13B on MMLU, HellaSwag, PIQA, and math.
- Faster/cheaper training to a given loss: Switch Transformer reached T5-Base quality
  roughly 7x faster at fixed FLOPs, then kept improving.
- Experts can be sharded across devices (expert parallelism), so total parameters scale
  past single-node memory.

Costs: all parameters must still be held in memory for serving, routing adds
communication (all-to-all), and training stability/load balancing needs care.

## Gating and routing

The gate has three jobs: score experts per token, select which to activate, and keep load
balanced.

- **Top-1 (Switch)**: cheapest routing; needs careful balancing.
- **Top-2 (GShard, Mixtral)**: the long-time default.
- **Noisy top-k**: add Gaussian noise to scores pre-softmax so near-tied experts share
  traffic (Sparsely-Gated MoE, GShard).
- **Modern fine-grained top-k**: many small experts, k of 6-16, plus one or more
  *shared experts* that every token passes through (DeepSeekMoE lineage).

## Load balancing

Without intervention, routing collapses: frequently chosen experts get more gradient,
improve, and attract even more traffic, while others starve. With experts sharded across
GPUs, imbalance also becomes a systems problem: one overloaded expert stalls the whole
layer (all-to-all waits on the slowest shard), and hot experts blow past memory/capacity
budgets. Standard fixes:

1. **Noisy gating**: randomness redistributes marginal tokens.
2. **Auxiliary load-balancing loss**: penalise skew in the fraction of tokens per expert
   (Switch Transformer's f_i * P_i formulation).
3. **Device-level balancing loss**: DeepSeekMoE groups experts per device and balances
   across groups, aligning the loss with the actual hardware topology.
4. **Capacity factor**: cap tokens per expert (GShard, Switch); overflow tokens skip the
   layer via the residual path or reroute to the next-best expert.
5. **Aux-loss-free balancing (current best practice)**: DeepSeek-V3 adjusts a per-expert
   bias on the routing scores online instead of adding a gradient-level loss, avoiding the
   quality tax of auxiliary objectives. Widely copied since.

## Expert parallelism (EP)

Experts are distributed across GPUs; tokens are dispatched to their experts' devices via
all-to-all, processed, and gathered back. EP composes with data/tensor/pipeline
parallelism and is the key to both training throughput and cheap high-sparsity serving
(wide-EP inference spreads hundreds of experts across a node pool so each GPU holds only
a few). DeepSeek's DeepEP kernels and prefill/decode disaggregation are the reference
open stack.

## The 2026 MoE landscape

Sparse MoE is now the default for every frontier and near-frontier model; the design has
converged on *high sparsity*: many small experts, few active, usually with a shared expert.

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

Trends worth knowing:

- **Sparsity ratios keep rising**: from ~28% active (Mixtral) to ~3-4% (V4, K3).
  Scaling-law work (e.g. DeepSeek, Kimi) treats sparsity as a first-class axis.
- **Shared experts** capture common knowledge so routed experts specialise; Qwen3 dropped
  them, most others kept them; K3's LatentMoE reworks the expert space for routing
  stability at 896 experts.
- **Dense warm-up layers**: V3 and GLM keep the first few blocks dense for stability.
- **MoE reached small models**: Gemma 4 26B-A4B, Cohere North Mini Code (30B-A3B),
  gpt-oss-20b; laptop-class MoE is normal now.
- **Low-precision native checkpoints**: K2 Thinking and K3 ship INT4/MXFP4 weights;
  gpt-oss shipped MXFP4. Sparse + quantised is how trillion-parameter weights stay
  servable.
- **Sigmoid routing + bias balancing** (V3 lineage) largely replaced softmax +
  aux-loss-heavy recipes.

See [_comparisons/llm-architecture-gallery.md](_comparisons/llm-architecture-gallery.md)
for per-model configs, and family pages for each line's specifics.
