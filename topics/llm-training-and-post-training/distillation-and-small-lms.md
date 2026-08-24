# Distillation and Small Language Models

## Best resources

- [Hinton et al., Distilling the Knowledge in a Neural Network (2015)](https://arxiv.org/abs/1503.02531): the original; still the right mental model.
- [On-policy distillation (Thinking Machines Lab, 2025)](https://thinkingmachines.ai/blog/on-policy-distillation/): why sampling from the student and grading with the teacher beats offline distillation for post-training.
- [MiniLLM](https://arxiv.org/abs/2306.08543) and [GKD (Generalized Knowledge Distillation)](https://arxiv.org/abs/2306.13649): the key papers on distribution-matching choices for LLM distillation.
- [BentoML: best open-source small language models 2026](https://www.bentoml.com/blog/the-best-open-source-small-language-models) and [SmolLM3 blueprint](https://huggingface.co/blog/smollm3): current landscape and a fully open small-model recipe.

## Making models smaller: the four levers

1. **Pruning**: remove redundant weights/neurons/layers (unstructured sparsity vs
   structured: heads, channels, whole layers via depth pruning); usually followed
   by healing (continued training or distillation). NVIDIA's Minitron recipe
   (prune width/depth of a big model, then distill into it) produced
   Llama-3.1-Minitron and the Nemotron Nano line at a fraction of
   train-from-scratch cost.
2. **Quantization**: see [quantization-and-precision.md](quantization-and-precision.md).
3. **Low-rank factorisation**: replace W with low-rank products (or SVD-compress);
   rarely used alone for LLMs, lives on inside LoRA-style methods and MLA-like
   architecture choices.
4. **Knowledge distillation (KD)**: train a small student to imitate a large
   teacher; the dominant lever for quality-per-parameter today.

## Distillation flavours

- **Logit (white-box) distillation**: minimise divergence between student and
  teacher **token distributions** (soft targets, optionally temperature-scaled),
  usually mixed with the hard next-token loss. Choice of divergence matters:
  forward KL (mass-covering) can force the student to spread mass it cannot
  model; **reverse KL** (mode-seeking, MiniLLM) suits generation better.
  Requires teacher logits, same (or aligned) tokenizer.
- **Sequence-level (black-box) distillation**: generate outputs from the teacher
  and SFT the student on them. This is what most "distilled" open models are
  (DeepSeek-R1's distilled Qwen/Llama variants are pure SFT on ~800k R1 traces).
  Simple, API-compatible, but off-policy: the student never sees its own mistakes
  (exposure bias).
- **On-policy distillation (GKD, Thinking Machines)**: sample sequences from the
  **student**, then supervise every token with the teacher's per-token
  distribution (typically reverse KL). Combines RL's on-policy relevance with
  dense per-token supervision; reported ~10-30x compute efficiency vs RL for
  teaching reasoning, and it is the standard recipe for turning a big reasoning
  model into small ones (Qwen3's smaller models: off-policy then on-policy
  distillation from the flagship).
- Aside: "distillation" of proprietary APIs via generated data is the same
  mechanism, which is why frontier ToS restrict it and why labs watermark or
  perturb logprobs.

## Small language model landscape (2026)

The 0.5-9B tier is now genuinely capable (tool use, reasoning modes, 128k
context, multimodal in some), driven by better data, longer token budgets
(way past Chinchilla), and distillation from frontier teachers:

- **Qwen3 0.6-8B**: distilled (off- then on-policy) from Qwen3 flagships;
  hybrid thinking modes.
- **SmolLM3-3B (HF)**: fully open blueprint: 11T tokens, dual instruct/reasoning
  modes, beats Llama-3.2-3B/Qwen2.5-3B.
- **Gemma 3 / Gemma 3n**: 1B-27B, multimodal; 3n's selective activation runs 5B
  params in a ~2B memory footprint on-device.
- **Phi-4 family (14B, mini)**: the synthetic-data-heavy lineage; strong
  benchmarks, mixed real-world reputation.
- **Llama 3.2 1B/3B**: pruned + distilled from Llama 3.1 8B.
- **Nemotron Nano / OLMo 2 1B**: pruning+distillation and fully-open lanes.

Recurring recipe: overtrain a small dense model on maximum-quality data, distill
from a frontier teacher (increasingly on-policy), then run the same post-training
pipeline (SFT -> preference opt -> RLVR) as the big models.

## Practical notes

- Tokenizer mismatch blocks logit distillation; use sequence-level KD or
  vocabulary-mapping tricks (ULD) across families.
- Temperature: higher T softens teacher distributions and transfers "dark
  knowledge" (relative probabilities of wrong answers); tune it, and anneal the
  hard-loss/KD-loss mix.
- Capacity gap: a too-strong teacher can hurt a tiny student; intermediate
  teachers (teacher assistants) or on-policy KD mitigate this.
- Evaluate beyond benchmarks: distilled models inherit teacher style and can
  overfit teacher quirks; check robustness and refusal behaviour independently.
- For reasoning distillation, trace quality and diversity of teacher CoT matter
  more than raw count; filtering for verified-correct traces (rejection sampling)
  is standard.
