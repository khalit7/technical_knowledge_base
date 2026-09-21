# Parameter-Efficient Fine-Tuning (PEFT)

⏱ 5 min read · +2h 30m resources

### Best resources

- [LoRA Without Regret (Thinking Machines Lab, Schulman et al. 2025)](https://thinkingmachines.ai/blog/lora/) (~50 min): the definitive empirical study of when LoRA matches full fine-tuning; also as a [TRL guide](https://huggingface.co/docs/trl/main/lora_without_regret) (docs, ~30 min).
- [LoRA: Low-Rank Adaptation of Large Language Models](../../papers/2021-06_lora/summary.md) and [QLoRA: Efficient Finetuning of Quantized LLMs](../../papers/2023-05_qlora/summary.md).
- [HF PEFT library docs](https://huggingface.co/docs/peft) (docs, ~40 min): the standard implementation of every method below.
- [Sebastian Raschka: Practical Tips for Finetuning LLMs Using LoRA](https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms) (~30 min): hyperparameter intuition.

### Why PEFT

Train only a small subset of (new) parameters while freezing the base model.

Motivations: memory (no optimizer states for frozen weights: the dominant cost),

cheap per-task adapters you can hot-swap or batch-serve (vLLM multi-LoRA), and

reduced catastrophic forgetting since the base weights never move.

### The method families

1. **Head-only tuning**: freeze the backbone, train a task head. The classic
   transfer-learning baseline; too weak for generative LLM behaviour.

2. **Adapters (Houlsby 2019)**: small bottleneck MLP modules inserted between
   layers of the frozen model. Effective but adds inference latency (extra

   sequential ops); superseded by LoRA which merges away.

3. **Soft prompts**: train a few "virtual token" embeddings prepended to the input
   (prompt tuning), or to every layer's keys/values (prefix tuning, P-tuning v2).

   Zero architecture change, tiny parameter count; weaker and fiddlier than LoRA;

   niche today.

4. **LoRA**: reparameterise the update of a frozen weight as low-rank:
   W = W0 + dW, dW = (alpha/r) * B A with A in R^{r x d} (random init) and

   B in R^{d x r} (zero init), so training starts at the base model. r is

   typically 8-128. After training, dW merges into W0: zero inference

   overhead. See [LoRA: Low-Rank Adaptation of Large Language Models](../../papers/2021-06_lora/summary.md).

5. **QLoRA**: quantize the frozen base to 4-bit **NF4** (information-theoretically
   optimal for normal-distributed weights), with double quantization of the scales

   and paged optimizers; train LoRA adapters in bf16 on top, backpropagating

   through the dequantized weights. Fine-tune a 65B model on a single 48GB GPU.

   See [QLoRA: Efficient Finetuning of Quantized LLMs](../../papers/2023-05_qlora/summary.md).

6. **DoRA**: decompose each weight into **magnitude and direction**; apply the
   low-rank update only to the direction, learn the magnitude vector separately.

   Closes part of the LoRA/full-FT gap at low rank; supported in HF PEFT.

### LoRA in practice: what actually matters (2025-26 consensus)

From LoRA Without Regret and accumulated practice:

- **Apply LoRA to all weight matrices**, especially the MLPs (and MoE expert
  layers), not just attention q/v as in the original paper. Attention-only LoRA

  meaningfully underperforms.

- With all layers covered and enough capacity, **LoRA matches full fine-tuning**
  for typical post-training datasets (the "low-regret regime"), at roughly 2/3 the

  FLOPs (no gradient for frozen weights).

- **Optimal LR is ~10x the full fine-tuning LR**, consistently across SFT and RL.
- LoRA dislikes very large batches (effective batch < 32 was best in their SFT
  setups); raising rank does not fix this.

- **For RL, even rank 1 suffices**: policy-gradient methods absorb on the order of
  1 bit per episode, versus O(tokens) bits for SFT, so capacity is rarely the

  binding constraint. This makes LoRA the default for RL fine-tuning where the

  policy must stay close to the base anyway.

- Capacity limit is real for large-corpus training: if your dataset approaches
  pretraining-like scale (continued pretraining), use full fine-tuning.

- rsLoRA scaling (alpha/sqrt(r)) stabilises behaviour across ranks; LoRA+ (higher
  LR on B than A) gives small gains.

### Choosing a method (2026)

| Situation | Choice |
| --- | --- |
| Post-training on 1 node, model fits in bf16 | LoRA (all layers, r=16-64), FSDP2 if sharding needed |
| GPU-poor, big base model | QLoRA (NF4 base + bf16 adapters) |
| RL fine-tuning (GRPO etc.) | LoRA, low rank is fine |
| Domain adaptation on billions of tokens | Full fine-tuning / continued pretraining |
| Many tenants / tasks on one deployment | Per-task LoRA adapters, multi-LoRA serving |

Serving note: merged LoRA is free; unmerged multi-LoRA serving (S-LoRA, vLLM)

batches heterogeneous adapters against one base. Quantized bases with adapters

usually get merged then re-quantized, or served with the adapter kept separate to

avoid quantization error on the merged weights.
