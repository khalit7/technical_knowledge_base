# Positional Encodings

⏱ 6 min read · +2h 50m resources

## Best resources

- [How LLMs scaled from 512 to 2M context (Aman Arora, 2025)](https://amaarora.github.io/posts/2025-09-21-rope-context-extension.html) (~50 min): the best single walkthrough of RoPE, position interpolation, NTK-aware scaling, dynamic NTK, and YaRN.
- [EleutherAI: Rotary Embeddings, a relative revolution](https://blog.eleuther.ai/rotary-embeddings/) (~30 min): canonical RoPE explainer with derivation.
- [RoFormer paper](../../papers/2021-04_roformer-rope/summary.md): the RoPE original.
- [ALiBi paper (Press et al.)](https://arxiv.org/abs/2108.12409) (45 min) and [YaRN paper](https://arxiv.org/abs/2309.00071) (45 min): extrapolation and context extension.

## Encoding vs embedding, absolute vs relative

- **Positional embedding**: a learned vector per position (GPT-2, BERT). Simple,
  but hard-capped at the trained length; no extrapolation.
- **Positional encoding**: a fixed mathematical function of position. The original
  Transformer's **sinusoidal** encoding was chosen because it "may allow the model
  to extrapolate to sequence lengths longer than the ones encountered during
  training" (in practice extrapolation is still poor, but interpolation is fine).
- **Absolute** methods answer "where is this token?" and are added to the input
  embedding once. **Relative** methods answer "how far apart are these two tokens?"
  and act inside attention, which matches what attention actually needs.

## The relative family

- **Shaw et al. 2018**: add a learnable vector per relative distance (clipped)
  directly into the attention computation (keys and/or values).
- **T5 relative bias**: simplify Shaw to a learnable **scalar** bias added to the
  attention logit per relative-distance bucket, with logarithmic bucketing so far
  distances share buckets. Cheap and effective; per-head learned.
- **ALiBi**: no embeddings at all; add a **static, non-learned linear penalty**
  m * distance to attention scores (slope m geometric per head). Closer tokens
  score higher. Superpower: extrapolation; train at 1k, run at 2k+ with little
  degradation. Used by BLOOM, MPT; largely displaced by RoPE + scaling.
- **DeBERTa disentangled attention**: argues that summing content and position
  vectors entangles semantics with syntax too early. Keeps a content vector H and
  a relative position vector P separate, and computes attention from
  content-content, content-position, and position-content terms.

## RoPE (the modern default)

[RoFormer](../../papers/2021-04_roformer-rope/summary.md). Instead of **adding** a
position vector (which perturbs magnitude and direction), RoPE **rotates** each
query/key vector, pairwise in 2D subspaces, by an angle proportional to its
position: position m gets rotation m*theta_i, with per-dimension frequencies
theta_i = base^(-2i/d), base classically 10000.

Why it works: attention scores are dot products, and the dot product of two rotated
vectors depends only on the **angle difference**, i.e. on relative distance m-n.
So RoPE injects absolute position in form but yields relative-position-dependent
attention, with no extra parameters, applied at every layer. Long-range decay
falls out of the mixed frequencies. Every mainstream 2023+ LLM (Llama, Qwen,
DeepSeek, Gemma, Mistral) uses RoPE or a variant.

Notable variants: **partial RoPE** (rotate only a fraction of dims; GLM,
DeepSeek MLA's decoupled RoPE keys), **2D/multimodal RoPE** (Qwen-VL: separate
frequencies for image axes), **interleaved vs split-half** layouts
(implementation gotcha when porting weights).

## Context extension: RoPE scaling

Trained at length L, RoPE degrades sharply past L because high-frequency dims see
unseen rotation angles. Fixes, in historical order:

- **Position Interpolation (PI)**: divide all positions by scale s = L_new/L_train
  (positions squeezed into the trained range); needs a short fine-tune; hurts
  short-context slightly (crowds all frequencies equally).
- **NTK-aware scaling**: instead of scaling positions, **raise the base** (e.g.
  10000 -> 500000+) so high-frequency dims are barely touched and low-frequency
  dims interpolate. Works surprisingly well zero-shot; "dynamic NTK" adjusts the
  base with current sequence length at inference.
- **YaRN**: NTK-by-parts: leave high-frequency (short-wavelength) dims alone,
  fully interpolate low-frequency dims whose wavelength exceeds the context, ramp
  in between; plus an attention temperature (logit scaling) correction. Best
  quality per fine-tuning token; used by Qwen, DeepSeek, many 128k+ models.
- **LongRoPE / LongRoPE2**: per-dimension rescaling factors found by evolutionary
  search plus mixed-context training; behind Phi-3's 2M-token claims.
- Production recipe (Llama 3 style): pretrain at 8k with a large base (500k), then
  a continued-pretraining phase on long documents at 128k with scaled RoPE, then
  verify with needle-in-haystack and real long-context evals.

## Beyond RoPE

- **NoPE**: decoder-only models with **no** positional encoding still learn
  position implicitly through the causal mask; some evidence of better length
  generalisation in theory, but weaker in-context retrieval at scale. Showing up
  in hybrids: interleaving RoPE layers with NoPE layers (e.g. every 4th layer
  global-attention NoPE) in Llama 4-era and long-context architectures.
- **CoPE (Contextual Position Encoding, Meta 2024)**: positions are computed by
  **counting selected tokens** (via sigmoid gates on query-key pairs) rather than
  raw token index, so position can mean "i-th sentence" or "i-th verb"; solves
  counting/selective-copy tasks standard PEs fail; not yet mainstream at scale.
- **FoPE, wavelet-based, HoPE**: active research on making frequency components
  more robust for extrapolation.
- Long-context also depends on the attention mechanism itself (sliding window +
  a few global layers, sparse attention like DeepSeek DSA/NSA); that side lives in
  `topics/inference-and-serving` and architecture notes in `topics/llms`.
