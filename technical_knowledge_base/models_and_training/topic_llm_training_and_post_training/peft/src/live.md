Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81eba08eef56b3e3b4eb as of 2026-09-22T02:16:06.914Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81eba08eef56b3e3b4eb">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b" title="Topic: llm-training-and-post-training"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Parameter-Efficient Fine-Tuning (PEFT)"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +2h 30m resources
## Best resources
- [LoRA Without Regret (Thinking Machines Lab, Schulman et al. 2025)](https://thinkingmachines.ai/blog/lora/) (\~50 min): the definitive empirical study of when LoRA matches full fine-tuning; also as a [TRL guide](https://huggingface.co/docs/trl/main/lora_without_regret) (docs, \~30 min).
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81018f15edd19fa5c28a"/> and <mention-page url="https://app.notion.com/p/3c65c17b0d0d815a8f4edc33f9583671"/>.
- [HF PEFT library docs](https://huggingface.co/docs/peft) (docs, \~40 min): the standard implementation of every method below.
- [Sebastian Raschka: Practical Tips for Finetuning LLMs Using LoRA](https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms) (\~30 min): hyperparameter intuition.
## Why PEFT
Train only a small subset of (new) parameters while freezing the base model.
Motivations: memory (no optimizer states for frozen weights: the dominant cost),
cheap per-task adapters you can hot-swap or batch-serve (vLLM multi-LoRA), and
reduced catastrophic forgetting since the base weights never move.
## The method families
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
	W = W0 + dW, dW = (alpha/r) \* B A with A in R\^\{r x d\} (random init) and
	B in R\^\{d x r\} (zero init), so training starts at the base model. r is
	typically 8-128. After training, dW merges into W0: zero inference
	overhead. See <mention-page url="https://app.notion.com/p/3c65c17b0d0d81018f15edd19fa5c28a"/>.
5. **QLoRA**: quantize the frozen base to 4-bit **NF4** (information-theoretically
	optimal for normal-distributed weights), with double quantization of the scales
	and paged optimizers; train LoRA adapters in bf16 on top, backpropagating
	through the dequantized weights. Fine-tune a 65B model on a single 48GB GPU.
	See <mention-page url="https://app.notion.com/p/3c65c17b0d0d815a8f4edc33f9583671"/>.
6. **DoRA**: decompose each weight into **magnitude and direction**; apply the
	low-rank update only to the direction, learn the magnitude vector separately.
	Closes part of the LoRA/full-FT gap at low rank; supported in HF PEFT.
## LoRA in practice: what actually matters (2025-26 consensus)
From LoRA Without Regret and accumulated practice:
- **Apply LoRA to all weight matrices**, especially the MLPs (and MoE expert
	layers), not just attention q/v as in the original paper. Attention-only LoRA
	meaningfully underperforms.
- With all layers covered and enough capacity, **LoRA matches full fine-tuning**
	for typical post-training datasets (the "low-regret regime"), at roughly 2/3 the
	FLOPs (no gradient for frozen weights).
- **Optimal LR is \~10x the full fine-tuning LR**, consistently across SFT and RL.
- LoRA dislikes very large batches (effective batch \< 32 was best in their SFT
	setups); raising rank does not fix this.
- **For RL, even rank 1 suffices**: policy-gradient methods absorb on the order of
	1 bit per episode, versus O(tokens) bits for SFT, so capacity is rarely the
	binding constraint. This makes LoRA the default for RL fine-tuning where the
	policy must stay close to the base anyway. A worked instance at the small end: a 4B
	Postgres query-planner model was supervised fine-tuned on 420 trajectories distilled
	from GPT-6 Astra through LoRA adapters of roughly 21M parameters on consumer GPUs, then
	trained further with an anchored GRPO variant against an execution-time reward, and
	beat a hand-tuned production planner on join-heavy queries for a few hundred dollars.
- Capacity limit is real for large-corpus training: if your dataset approaches
	pretraining-like scale (continued pretraining), use full fine-tuning.
- rsLoRA scaling (alpha/sqrt(r)) stabilises behaviour across ranks; LoRA+ (higher
	LR on B than A) gives small gains.
## Choosing a method (2026)
<table header-row="true">
<tr>
<td>Situation</td>
<td>Choice</td>
</tr>
<tr>
<td>Post-training on 1 node, model fits in bf16</td>
<td>LoRA (all layers, r=16-64), FSDP2 if sharding needed</td>
</tr>
<tr>
<td>GPU-poor, big base model</td>
<td>QLoRA (NF4 base + bf16 adapters)</td>
</tr>
<tr>
<td>RL fine-tuning (GRPO etc.)</td>
<td>LoRA, low rank is fine</td>
</tr>
<tr>
<td>Domain adaptation on billions of tokens</td>
<td>Full fine-tuning / continued pretraining</td>
</tr>
<tr>
<td>Many tenants / tasks on one deployment</td>
<td>Per-task LoRA adapters, multi-LoRA serving</td>
</tr>
</table>
Serving note: merged LoRA is free; unmerged multi-LoRA serving (S-LoRA, vLLM)
batches heterogeneous adapters against one base. Quantized bases with adapters
usually get merged then re-quantized, or served with the adapter kept separate to
avoid quantization error on the merged weights.
</content>
</page>
