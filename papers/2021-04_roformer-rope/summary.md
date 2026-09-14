# RoFormer: Enhanced Transformer with Rotary Position Embedding

⏱ 10 min read · +~3h 10m resources

- **Authors**: Jianlin Su, Yu Lu, Shengfeng Pan, Ahmed Murtadha, Bo Wen, Yunfeng Liu (Zhuiyi Technology, Shenzhen)
- **Date**: April 2021 (arXiv v1; v5 November 2023; journal version in Neurocomputing 2024)
- **Links**: [arXiv:2104.09864](https://arxiv.org/abs/2104.09864) (~45 min) | [code](https://github.com/ZhuiyiTechnology/roformer) (repo, ~15 min for the README) | [HF model doc](https://huggingface.co/docs/transformers/model_doc/roformer) (docs, ~10 min)

## Best resources

- [Rotary Embeddings: A Relatively Revolutionary](https://blog.eleuther.ai/rotary-embeddings/) (EleutherAI) (~30 min): the canonical English explainer; complex-number view, derivation, runnable code, and the early adoption story (GPT-NeoX, GPT-J)
- [Transformer升级之路: 旋转式位置编码](https://kexue.fm/archives/8265) (Jianlin Su) (~30 min): the first author's original blog derivation, which predates and is more readable than the paper (Chinese)
- [You could have designed state of the art positional encoding](https://huggingface.co/blog/designing-positional-encoding) (Fleetwood, Hugging Face) (~35 min): rederives RoPE step by step from desiderata; the best intuition builder for why each design choice is forced
- [Annotated RoPE implementation](https://nn.labml.ai/transformers/rope/index.html) (labml.ai) (~25 min): line-by-line PyTorch of the efficient elementwise form

## Problem

Self-attention is position-agnostic, so position must be injected somewhere. Every prior scheme is additive: absolute position embeddings (learned or sinusoidal) are added to token embeddings before the QKV projections, and relative schemes (Shaw et al., Transformer-XL, T5 bias, DeBERTa) surgically edit terms in the expanded q^T k product. The additive family has two structural problems. First, it entangles position with content instead of stating what attention should actually see, which the authors argue is only the relative offset. Second, the relative variants operate on the expanded softmax attention matrix, so they cannot be used with linear attention, which never materializes q^T k. The gap: a formulation where the query-key inner product provably depends on the two token embeddings and their relative offset m - n only, while each position is still encoded independently (an absolute operation per token, which is also what makes KV caching cheap).

## Method

**The constraint.** Find functions f_q, f_k such that <f_q(x_m, m), f_k(x_n, n)> = g(x_m, x_n, m - n): each token is encoded using only its own absolute position, yet the inner product depends only on the relative offset.

**2D solution: rotation.** In d = 2, identify the plane with the complex numbers. The solution is f_q(x_m, m) = (W_q x_m) e^{imθ} and f_k(x_n, n) = (W_k x_n) e^{inθ}: rotate the projected query/key by an angle proportional to its position. Then

```
<q_m, k_n> = Re[(W_q x_m)(W_k x_n)* e^{i(m-n)θ}]
```

The conjugation makes the phases subtract, so absolute rotations by mθ and nθ leave only the relative angle (m - n)θ. The paper's Section 3.4.1 shows this is essentially forced: decomposing f into radial and angular parts, the constraint makes the radius position-independent and the angle an arithmetic progression φ(m) = mθ + γ, i.e. rotation at constant angular velocity is the solution, not just a solution.

**General form.** For even d, split the vector into d/2 independent 2D pairs, each rotated by its own frequency: f(x, m) = R_{Θ,m} W x with R a block-diagonal matrix of 2x2 rotations by angles mθ_1, ..., mθ_{d/2}. Since rotations are orthogonal and R_{Θ,m}^T R_{Θ,n} = R_{Θ,n-m},

```
q_m^T k_n = x_m^T W_q^T R_{Θ,n-m} W_k x_n
```

which satisfies the constraint exactly. Position is injected multiplicatively into q and k only (values are untouched), norms are preserved, and the sparse block structure means no matrix multiply is needed: implement as elementwise cos/sin combination of x with its pair-swapped negation (Equation 34), a few fused elementwise ops per layer.

**Frequency spectrum.** θ_i = 10000^{-2(i-1)/d}, the same geometric spectrum as the original sinusoidal encoding, wavelengths from 2π up to about 2π * 10000. Fast-rotating (high-frequency) pairs resolve nearby offsets sharply; slow pairs change little over hundreds of tokens and carry coarse long-range order. This spectrum is the knob every later context-extension method turns.

**Long-term decay.** Section 3.4.3 writes the RoPE inner product as a sum of complex per-pair terms and bounds it via Abel summation: with the 10000^{-2i/d} spectrum, the upper bound on |q_m^T k_n| decays as |m - n| grows (Figure 2). Distant token pairs get systematically weaker interaction by construction, matching the linguistic prior, and this is the paper's explanation for its long-text advantage.

**Linear attention compatibility.** Because RoPE is a norm-preserving rotation applied to q and k rather than an edit to the attention matrix, it composes with kernelized linear attention: rotate the feature-mapped queries and keys, R_{Θ,m} φ(q_m) and R_{Θ,n} φ(k_n), in the numerator while leaving the denominator unrotated (Equation 19). It is the first relative position encoding usable with O(N) attention.

## Results

- **WMT14 En-De**: BLEU 27.5 vs 27.3 for the transformer-base baseline; a sanity check, not the headline.
- **BERT-style pretraining**: swapping sinusoidal APE for RoPE gives visibly faster MLM loss convergence than BERT under identical settings; on GLUE fine-tuning, RoFormer significantly beats bert-base on 3 of 6 tasks (MRPC 89.5, STS-B 87.0, QQP 86.4).
- **Performer + RoPE**: on Enwik8, adding RoPE to a 12-layer char-level Performer gives faster convergence and lower loss, demonstrating the linear-attention claim in practice.
- **Chinese long text (CAIL2019-SCM)**: pretraining across stages with varying max sequence length, accuracy improves as the length cap rises; RoFormer-1024 reaches 69.79% test vs 68.10% for WoBERT-512 (+1.5% absolute from longer input alone), the paper's main evidence for sequence-length flexibility.
- The authors are candid in the limitations section: the empirical gains are modest and they lack a full theoretical account of why convergence is faster; the decay property is shared with other relative schemes yet RoPE does better on long text.

## Why it matters

The paper's benchmark numbers were unremarkable; the formulation conquered the field anyway. Picked up first by the open-source side (EleutherAI's GPT-NeoX and GPT-J, 2021), then PaLM and Llama, RoPE has been the default positional encoding of essentially every notable LLM since 2023: Llama 1-3, Mistral/Mixtral, Qwen, DeepSeek, Gemma, GPT-OSS. The properties that won: exact relative dependence with per-token absolute application (each cached key is rotated once at cache time, so KV caching needs no recomputation), zero parameters, norm preservation, and applicability at every layer.

It also became the substrate for the entire long-context toolchain, which works by manipulating the θ_i spectrum of a pretrained model:

- **Base frequency scaling**: modern models simply train with a larger base than 10000 for longer contexts (Llama 3 uses 500,000; 1M is common), slowing the spectrum so it stays informative at long range.
- **Position Interpolation** (Meta, 2023): rescale positions m to m * L_train/L_target so all angles stay in the trained range; a small fine-tune extends context with minimal degradation.
- **NTK-aware / dynamic NTK scaling** (2023): rescale the base instead of positions, so high-frequency dims (local resolution) are interpolated less than low-frequency ones.
- **YaRN** (2023): per-dimension interpolation by wavelength (NTK-by-parts) plus an attention temperature; the standard recipe behind many 128k+ models, including DeepSeek's context extensions.
- **Partial and interleaved RoPE**: rotating only a fraction of head dims (GPT-NeoX's rotary_pct; DeepSeek's MLA carries a small decoupled RoPE key alongside NoPE-compressed latents), and Llama 4's iRoPE interleaves RoPE layers with position-free attention layers for length generalization. Multimodal variants (Qwen2-VL's M-RoPE, factoring rotation across time/height/width) extend the same machinery to images and video.

Method aside, the 2D-pair rotation trick has become a standard reasoning tool: attention-sink analyses, length-generalization theory, and positional-encoding follow-ups are routinely phrased in RoPE's complex-exponential language.

## Connections

- [`papers/2017-06_attention-is-all-you-need`](../2017-06_attention-is-all-you-need/): the additive sinusoidal encoding whose frequency spectrum RoPE reuses multiplicatively
- [`papers/2018-10_bert`](../2018-10_bert/): the pretraining baseline RoFormer swaps its APE out of
- [`papers/2024-07_llama-3`](../2024-07_llama-3/): RoPE at base 500k plus staged long-context extension; the mainstream deployment pattern
- [`papers/2024-12_deepseek-v3`](../2024-12_deepseek-v3/): MLA's decoupled RoPE keys, the trick that reconciles RoPE with latent KV compression
- [`papers/2024-01_mixtral`](../2024-01_mixtral/): representative RoPE-based open-weight architecture
- Topics: `topics/llm-training-and-post-training` (positional encodings, long-context extension), `topics/llms` (architecture gallery material)
