# LLM Modules: Knowledge Transfer from a Large to a Small Model using Enhanced Cross-Attention

Konstantin Kolomeitsev (independent, Almaty, Kazakhstan). arXiv [2502.08213](https://arxiv.org/abs/2502.08213), 12 Feb 2025. Added to the KB 2026-09-01 from a blog entry.

- [arXiv](https://arxiv.org/abs/2502.08213) | [code and weights](https://huggingface.co/kkolomeitsev/llm-modules)
- Topics: llm-training-and-post-training, llms
**Read this as a small proof of concept, not as a result.** Single author, tiny models, one dataset, no baseline sweep. It is filed here because the architectural idea is worth knowing, not because the evidence is strong.

### Problem

Getting the capability of a large model into a small deployable one normally means **distillation**: generate teacher outputs, train the student to imitate them. That needs a large training run, and the student ends up as one fused artifact with the teacher's knowledge baked in irreversibly.

The alternative explored here: leave the large model **frozen** and let a small trainable model read its internal representations directly, so the pair works as two composable modules rather than one distilled model.

### Method

**Enhanced Cross-Attention** between a frozen large model and a trainable small one.

- Frozen: **Qwen2-1.5B**. Its hidden representations are exposed, not its output text.
- Trainable: **GPT-Neo-125M**, receiving those representations through purpose-built cross-attention layers inserted into its stack.
- Only the small model and the connecting layers train. The large model never receives gradients, so training fits on modest hardware.
The framing is modular: the frozen model is a reusable knowledge source, and different small heads could in principle attach to it for different tasks. That composability is the structural difference from distillation.

### Results

- On **Bespoke-Stratos-17k**, after **15 epochs**, the combined model produces responses the author judges comparable in quality to a distillation baseline.
- Code and pretrained weights are released.
- The evaluation is qualitative and example-driven rather than benchmark-based, and the comparison is against the author's own distillation run.

### Why it matters

The idea belongs to a real family: **freeze the big model, train a small adapter that reads its internals**. That family includes Flamingo's Perceiver Resampler over a frozen LM and Google's CALM composing an anchor with an augmenting model. It is attractive whenever you want capability without owning or retraining the large model.

What this paper does not establish is whether it works at any useful scale. A 1.5B teacher and a 125M student on 17k examples cannot tell you whether the approach survives at 70B, whether it beats a well-tuned distillation run under equal compute, or how it behaves when the frozen model's representations are out of distribution. Treat the architecture as a pointer to the literature above and the results as anecdotal.

### Connections

- The serious versions of this idea: Flamingo's frozen-LM cross-attention, CALM, and the adapter/PEFT literature.
- Contrast with actual distillation, under llm-training-and-post-training.
- Adjacent in this batch: Bitune and Trained Persistent Memory, also frozen-backbone-plus-adapter designs.
