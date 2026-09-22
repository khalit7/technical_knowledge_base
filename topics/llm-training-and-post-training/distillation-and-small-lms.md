# Distillation and Small Language Models

⏱ 7 min read · +3h 50m resources

### Best resources

- [Hinton et al., Distilling the Knowledge in a Neural Network (2015)](https://arxiv.org/abs/1503.02531) (45 min): the original; still the right mental model.
- [On-policy distillation (Thinking Machines Lab, 2025)](https://thinkingmachines.ai/blog/on-policy-distillation/) (~40 min): why sampling from the student and grading with the teacher beats offline distillation for post-training.
- [MiniLLM](https://arxiv.org/abs/2306.08543) (45 min) and [GKD (Generalized Knowledge Distillation)](https://arxiv.org/abs/2306.13649) (45 min): the key papers on distribution-matching choices for LLM distillation.
- [BentoML: best open-source small language models 2026](https://www.bentoml.com/blog/the-best-open-source-small-language-models) (~20 min) and [SmolLM3 blueprint](https://huggingface.co/blog/smollm3) (~35 min): current landscape and a fully open small-model recipe.

### Making models smaller: the four levers

1. **Pruning**: remove redundant weights/neurons/layers (unstructured sparsity vs
   structured: heads, channels, whole layers via depth pruning); usually followed

   by healing (continued training or distillation). NVIDIA's Minitron recipe

   (prune width/depth of a big model, then distill into it) produced

   Llama-3.1-Minitron and the Nemotron Nano line at a fraction of

   train-from-scratch cost.

2. **Quantization**: see [Quantization and Precision](quantization-and-precision.md). The current
   marker for how far weight compression goes before quality breaks is **Bonsai 2 27B**

   (Prism ML, September 2026), a ternary compression of Qwen3.8 27B at 1.76 effective bits

   per weight that keeps 98.2% of aggregate benchmark performance. Nine times smaller than

   full precision for a couple of points of quality is a better trade than most

   distillation achieves, which is the argument for trying this lever before the others.

3. **Low-rank factorisation**: replace W with low-rank products (or SVD-compress);
   rarely used alone for LLMs, lives on inside LoRA-style methods and MLA-like

   architecture choices.

4. **Knowledge distillation (KD)**: train a small student to imitate a large
   teacher; the dominant lever for quality-per-parameter today.

### Distillation flavours

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

- **The contractual layer**: "distillation" of a proprietary API via generated data is
  the same mechanism, which is why frontier terms of service restrict it and why labs

  watermark or perturb logprobs. The restriction is contractual rather than technical,

  and enforcement is live: Anthropic has accused seven Chinese developers, including

  Alibaba, DeepSeek and Moonshot AI, of fraudulently accessing Claude to distil it and of

  routing their own customers' queries to Claude while presenting the output as their

  own, alleging that Alibaba alone ran 151 million exchanges through about 5,000

  fraudulent accounts between May and June 2026. Those are accusations and are

  unadjudicated. Andrew Ng's counterweight is the technical point worth holding onto: you

  cannot distil your way to a frontier model, and the labs named have published real work

  of their own. The policy argument runs in the other direction as well, with Garry Tan

  arguing that US open-weight labs should distil frontier models too. Whose terms you

  build a distillation pipeline on is a design decision, not a formality.

### Small language model landscape (2026)

The 0.5-9B tier is now genuinely capable (tool use, reasoning modes, 128k

context, multimodal in some), driven by better data, longer token budgets

(way past Chinchilla), and distillation from frontier teachers:

- **Qwen3 0.6-8B**: distilled (off- then on-policy) from Qwen3 flagships;
  hybrid thinking modes.

- **SmolLM3-3B (HF)**: fully open blueprint: 11T tokens, dual instruct/reasoning
  modes, beats Llama-3.2-3B/Qwen2.5-3B.

- **Gemma 4**: the current open Google family. Dense `gemma-4-31b`, plus
  `gemma-4-26b-a4b`, a 26B mixture of experts with roughly 4B active per token, plus E2B

  and E4B edge variants. The small MoE is the interesting entry: you pay for 26B of

  weights in memory to run about 4B of matmuls per token, the right trade when you are

  latency-bound and memory-rich, the wrong one on a phone.

- **Phi-4 family (14B, mini)**: the synthetic-data-heavy lineage; strong
  benchmarks, mixed real-world reputation.

- **Llama 3.2 1B/3B**: pruned + distilled from Llama 3.1 8B.
- **Nemotron Nano / OLMo 2 1B**: pruning+distillation and fully-open lanes.
- **OpenBMB MiniCPM5-2B**: a dense 2.5B Apache-2.0 on-device model averaging 53.9
  across 34 benchmarks, aimed at local assistants and coding.

- **K2 Horizon 0.9B / 3.7B / 7B**: the small tier of a fully open fleet (see
  [Pretraining](pretraining.md)), with the lab claiming state of

  the art at all three scales. The claim is IFM's own, but the training data was released

  with the weights, so unlike most small-model claims this one can be audited for

  contamination rather than argued about.

Recurring recipe: overtrain a small dense model on maximum-quality data, distill

from a frontier teacher (increasingly on-policy), then run the same post-training

pipeline (SFT -> preference opt -> RLVR) as the big models.

### Practical notes

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
