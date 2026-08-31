# Quantization and Precision

## Best resources

- [Maarten Grootendorst, A Visual Guide to Quantization](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization): the best visual intro to formats, PTQ, QAT, GPTQ.
- [Ultra-Scale Playbook, mixed-precision section](https://huggingface.co/spaces/nanotron/ultrascale-playbook): bf16/fp8 training mechanics.
- [Pretraining LLMs with NVFP4 (NVIDIA, 2025)](https://arxiv.org/abs/2509.25149) and [NVFP4 vs MXFP4 decision guide](https://www.spheron.network/blog/nvfp4-vs-mxfp4-gpu-cloud-4bit-quantization-guide/): the 4-bit training/inference frontier.
- [LMSYS: end-to-end MXFP8 and NVFP4 RL (2026)](https://www.lmsys.org/blog/2026-07-29-mxfp8-nvfp4-rl/): low-precision RL in practice.

## Number formats

| Format | Bits (sign/exp/mantissa) | Notes |
|---|---|---|
| fp32 | 1/8/23 | Master weights, reductions |
| tf32 | 1/8/10 | Ampere matmul default, fp32 range |
| fp16 | 1/5/10 | Precision-rich, range-poor: needs loss scaling |
| bf16 | 1/8/7 | fp32 range, less precision; **training default**, no loss scaling |
| fp8 E4M3 / E5M2 | 1/4/3, 1/5/2 | Hopper+; E4M3 for weights/activations, E5M2 for grads |
| int8 | integer | Classic inference PTQ target |
| NF4 | 4-bit code | QLoRA's normal-distribution-optimal codebook |
| MXFP8/MXFP4 | fp8/fp4 + shared E8M0 scale per 32-block | OCP open microscaling standard (NVIDIA + AMD) |
| NVFP4 | fp4 (E2M1) + fp8 scale per 16-block | NVIDIA Blackwell native; finer scaling, better quality |

## Post-training quantization (PTQ)

Quantize a trained model, no retraining. fp32 -> fp16/bf16 is essentially free.
Integer/4-bit needs a mapping: quantized = round(x / scale) + zero_point, with
scale/zero-point chosen per tensor, per channel, or per block.

- **Dynamic PTQ**: activation quantization parameters computed on the fly per
  batch; simpler, some latency overhead.
- **Static PTQ**: run a small calibration set through the model first, record
  activation statistics, fix the quantization parameters; lower latency.
- **Weight-only methods** (the LLM mainstream, since inference is memory-bound):
  - **GPTQ**: layer-wise quantization minimising output error using approximate
    second-order (Hessian) information; 3-4 bit weights.
  - **AWQ**: activation-aware; protect the ~1% salient weight channels (identified
    by activation magnitude) via per-channel scaling before 4-bit quantization.
  - **llama.cpp K-quants / GGUF**, **bitsandbytes NF4**: ecosystem workhorses.
    Added 2026-08-24: Unsloth shipped Dynamic 3.0 GGUFs (Aug 19), the next iteration
    of its dynamic quantization scheme for local models.
    [Docs](https://unsloth.ai/docs/basics/dynamic-3.0-ggufs)
  - **SmoothQuant** (W8A8): migrate activation outliers into weights so both
    quantize well; **FP8 W8A8** is now the low-effort serving default on Hopper+.
- Outliers are the central difficulty: a few channels with huge magnitudes destroy
  naive scaling (hence per-channel/block scales, AWQ, and rotation methods like
  QuIP#/SpinQuant for 2-3 bit).

## Quantization-aware training (QAT)

Insert **fake-quantization** ops during training (quantize-dequantize in forward;
straight-through estimator in backward) so the model learns weights robust to the
eventual precision. Costs extra training compute; recovers most of PTQ's loss at
4 bits and below. Current practice: short QAT fine-tunes after PTQ (torchao),
Gemma/Qwen official QAT checkpoints, and "QAT-from-scratch" for 4-bit-native
models. QLoRA-style training (frozen NF4 base + bf16 adapters) is the budget
alternative; see [peft.md](peft.md).

## Mixed-precision training

Compute-heavy ops run in low precision; numerically sensitive state stays high:

1. **fp32 master weights and optimizer states**; low-precision working copies for
   forward/backward (otherwise tiny updates round away).
2. Matmuls in fp16/bf16 (tensor cores); reductions/softmax/norms often fp32.
3. **Loss scaling** (fp16 only): gradients underflow fp16's range, so multiply the
   loss by S (e.g. 1024, or dynamic) before backward, scaling all grads up
   through the chain rule; unscale in fp32 before the optimizer step. bf16 has
   fp32's exponent range, so it skips loss scaling entirely: this is why bf16
   became the default.
4. **fp8 training** (Hopper/Blackwell + Transformer Engine): matmul inputs in
   E4M3/E5M2 with per-tensor (delayed) or per-block scaling; weights/grads
   accumulate in higher precision. DeepSeek-V3 proved fine-grained fp8 pretraining
   at 671B scale (block-wise 128x128 weight scales, tile-wise activations);
   torchtitan/TE make fp8 a config flag with ~30-40% throughput gains.

## The 4-bit frontier (2025-26)

Blackwell tensor cores natively support MXFP8/MXFP4/NVFP4, moving 4-bit from a
storage trick to a compute format:

- **NVFP4 pretraining** (NVIDIA 2025): 12B model, 10T tokens, matching-quality
  training with 2-3x matmul speedups; needs Hadamard-transform outlier smoothing,
  stochastic rounding, and keeping sensitive layers in higher precision.
- **NVFP4 vs MXFP4**: NVFP4's 16-element blocks with fp8 scales beat MXFP4's
  32-element E8M0 blocks on quality (one study: MXFP4 needs ~36% more tokens to
  match NVFP4's loss); MXFP4 wins only for NVIDIA+AMD portability.
- Low-precision **RL** is live: MXFP8 rollouts+training and NVFP4 rollouts with
  bf16 training (LMSYS Miles, 2026), reducing the rollout/trainer precision
  mismatch that destabilises RL.
- Inference default stack 2026: bf16 -> fp8 W8A8 (near-lossless) -> NVFP4/int4
  weight-only for memory-bound serving; MoE models quantize experts aggressively.

Serving-side kernels and KV-cache quantization live in
`topics/inference-and-serving`; hardware details in `topics/hardware`.

## Added 2026-08-31: GGUF K-quants, and reading a quant name

The methods above (GPTQ, AWQ, SmoothQuant, FP8, NF4) are what the GPU-serving world uses.
The local-inference world speaks a different dialect, the llama.cpp **K-quants**, and the
naming is worth decoding because it is what you actually pick when pulling a model.

`Q4_K_M` reads as three parts:

- **`Q4`**: roughly 4 bits per weight.
- **`_K`**: a K-quant, meaning the two-level super-block scheme rather than the legacy
  flat-scale formats (`Q4_0`, `Q4_1`, `Q5_0`, `Q5_1`, `Q8_0`).
- **`_M`**: the size variant (**S**mall / **M**edium / **L**arge), which selects how much
  extra precision goes to the sensitive tensors.

**The super-block idea**: 256 weights form a super-block, subdivided into blocks of 16 or 32
depending on bit width. One FP16 scale sits on the super-block, and each inner block carries
a 4- or 6-bit sub-scale relative to it. Quantizing the scales themselves is where the quality
gain over legacy quants comes from, at around 4.5 effective bits/weight for Q4_K once
overhead is counted. This is the same insight as group-wise quantization in GPTQ/AWQ, taken
one level further by compressing the group scales too.

**What the variant changes**: llama.cpp ships a hand-tuned per-tensor precision allocation
based on measured layer sensitivity. `Q4_K_M` keeps half the `attention.wv` and
`feed_forward.w2` tensors at `Q6_K` and the rest at `Q4_K`; `Q4_K_S` is uniformly `Q4_K`.
Value and down-projection tensors get the extra bits because they are empirically the most
quantization-sensitive, which matches what AWQ finds when it protects salient channels.

**The IQ family** (`IQ2_XXS`, `IQ3_S`, `IQ4_NL`, ...) adds an importance matrix from
calibration data plus codebook quantization, which is what makes 2-3 bit models usable at
all. Slower to decode, and needs a calibration pass, so it is the trade you make when the
model would otherwise not fit.

**Defaults worth remembering**: `Q4_K_M` is the standard recommendation and sits at the knee
of the quality-size curve; `Q5_K_M` when memory allows; `Q6_K` is close enough to FP16 that
the gap is rarely measurable; `Q8_0` is effectively lossless and usually not worth it over
FP16. And the allocation rule that matters more than the quant choice: **a larger model at
lower precision generally beats a smaller model at higher precision for the same memory
budget**, so a 70B at Q3 tends to beat an 8B at Q8.

Container details, and how GGUF compares to safetensors, ONNX, TensorRT engines, and MLX,
are in [../inference-and-serving/model-formats.md](../inference-and-serving/model-formats.md).

**Added resources**: [What is quantization?](https://theaiengineer.substack.com/p/what-is-quantization)
and [Quantization in practice: GPTQ vs AWQ](https://theaiengineer.substack.com/p/quantization-in-practice-gptq-vs-awq)
(The AI Engineer); [GGUF format and k-quants explained](https://zeroentropy.dev/concepts/gguf/);
[Which Quantization Should I Use? (arXiv 2601.14277)](https://arxiv.org/abs/2601.14277), a
unified evaluation of llama.cpp quantizations on Llama-3.1-8B-Instruct.
