# Performance math: the arithmetic before every run

⏱ 7 min read · +2h 40m resources

Last updated: 2026-08-24. Every number here is a 30-second pencil estimate; do
these before launching anything, then let the profiler correct you.

## Best resources

- [Transformer Math 101](https://blog.eleuther.ai/transformer-math/) (~35 min) (EleutherAI): training FLOPs and memory budgets
- [Transformer Inference Arithmetic](https://kipp.ly/transformer-inference-arithmetic/) (~40 min) (kipply): the inference-side counterpart, KV cache and latency math
- [How To Scale Your Model: All About Rooflines](https://jax-ml.github.io/scaling-book/roofline/) (~45 min): rooflines for compute, memory, and network
- [Making Deep Learning Go Brrrr From First Principles](https://horace.io/brrr_intro.html) (25 min) (Horace He): compute vs bandwidth vs overhead bound, with intuition
- [PaLM paper, Appendix B](https://arxiv.org/abs/2204.02311) (~15 min for the appendix; 90 min for the full paper): the original MFU definition

## 1. FLOPs: the 6ND rule

Each weight participates in one multiply-add per token in the forward pass
(2 FLOPs), and backward costs ~2x forward. For a model with N parameters trained
on D tokens:

- Training compute: **C = 6ND** (add ~30% if activation checkpointing recomputes the forward)
- Inference forward: **2N FLOPs per token**, plus attention's 2 x seq x d per layer (matters only at long context)

Example: 8B model, 1T tokens: 6 x 8e9 x 1e12 = 4.8e22 FLOPs. On 8 H100s at 40%
MFU (8 x 989 TFLOPS x 0.4 = 3.16 PFLOPS): 4.8e22 / 3.16e15 = 1.5e7 s = ~176
days. That is why 8B-scale pretraining uses hundreds of GPUs and a node is for
fine-tuning.

## 2. Memory budgets

Per parameter, mixed-precision Adam training: bf16 weights (2) + fp32 master (4)
+ Adam m and v (4 + 4) + grads (2) = **~16 bytes/param**, before activations.

| Regime | Bytes/param | 8B model | 70B model |
|---|---|---|---|
| Inference FP8 / FP4 | 1 / 0.5 | 8 / 4 GB | 70 / 35 GB |
| Inference BF16 | 2 | 16 GB | 140 GB |
| LoRA fine-tune (bf16 base frozen) | ~2 + adapters | ~18 GB | ~150 GB |
| Full fine-tune, Adam mixed precision | ~16 | 128 GB | 1.1 TB |

Activations: order sbh x L x c bytes (batch s x seq b x hidden h, L layers,
c ~ 10-30 depending on recompute and flash attention); with full activation
checkpointing this drops to roughly one layer's worth plus boundaries. Rule of
thumb: budget 10-30% on top of states, more at long context.

KV cache per token = 2 x L x n_kv_heads x d_head x bytes. Llama-3.1-8B (32
layers, 8 KV heads, d 128, bf16): 2 x 32 x 8 x 128 x 2 = **128 KB/token**, so an
8K-token conversation holds 1 GB and 32 concurrent 8K streams on a 5090 would
want 32 GB for cache alone: this is why serving quantises KV to FP8 and why GQA
(8 heads not 32) exists. Details:
[../inference-and-serving/](../inference-and-serving/).

Immediate corollaries for Khalid's hardware: full fine-tune of 8B (128 GB) does
not fit two 5090s (64 GB) without ZeRO-offload; LoRA/QLoRA fits comfortably.
One H100 node (640 GB) full-fine-tunes 8B easily and 70B only with FSDP +
recompute + care (1.1 TB states > 640 GB, so offload or more nodes).

## 3. Roofline: compute bound vs memory bound

Arithmetic intensity AI = FLOPs performed / bytes moved from HBM. The hardware's
critical intensity is peak FLOPs / peak bandwidth; above it you are compute
bound, below it bandwidth bound.

| Chip | Peak (dense) | BW | Critical AI (FLOPs/byte) |
|---|---|---|---|
| RTX 5090, BF16 (fp32 acc) | ~210 TFLOPS | 1.79 TB/s | ~117 |
| RTX 5090, FP8 | ~419 TFLOPS | 1.79 TB/s | ~234 |
| H100 SXM, BF16 | 989 TFLOPS | 3.35 TB/s | ~295 |
| B200, FP8 | 4.5 PFLOPS | 8 TB/s | ~560 |

- A bf16 matmul of an (s x h) activation against an (h x h) weight has AI ~ s
  (for s << h): so **the batch/sequence dimension is your arithmetic intensity**.
  Training (s in the thousands) is compute bound; decode at batch 1 (s = 1) has
  AI ~ 1 and is utterly bandwidth bound.
- Every generation raises critical AI (FLOPs grow faster than bandwidth), so
  batching and quantisation keep getting more important, not less.
- Pointwise ops (norms, activations, residuals) have AI < 4: always bandwidth
  bound: fuse them (torch.compile, FlashAttention exist for exactly this).
- Third regime: **overhead bound** (kernel launches, Python, small ops): if
  neither FLOPs nor bytes explain your step time, look there (CUDA graphs,
  compile).

## 4. Inference tokens/sec

Decode at low batch: every token reads all weights plus the KV cache once, so
**tokens/sec ceiling = bandwidth / (weight bytes + KV bytes per token read)**

5090, Llama-3.1-8B:

- FP8 weights (8 GB), short context: 1,790 / 8 = **~224 tok/s** single-stream
  ceiling; expect 60-80% of it in vLLM/TensorRT-LLM, so ~140-180 tok/s.
- FP4 weights (4 GB): ceiling ~450 tok/s; kernels are newer, expect a bigger gap.
- At 64K context the KV read (64K x 128 KB / 8 with FP8 KV = ~4 GB, same order
  as weights with paging/attention reads) roughly halves it.

8 x H100 node, 70B bf16, TP=8: aggregate 26.8 TB/s / 140 GB = **~190 tok/s**
single-stream ceiling (minus NVLink all-reduce time each layer; real ~120-150).

Throughput serving is a different game: raise batch until AI approaches the
critical value (~300 concurrent decode tokens on H100 BF16), at which point
tokens/sec ~ peak FLOPs / 2N: 7.9e15 x 0.5 (achievable) / 1.6e10 = ~250k tok/s
for 8B-class on the node. Prefill is compute bound from the start: time ~ 2N x
prompt_tokens / achieved FLOPs.

## 5. MFU

**MFU = (tokens/sec x 6N) / peak FLOPs of the hardware** (model FLOPs only:
recompute does not count; HFU counts it and is the flattering number).

Example: 8 x H100, 8B model, you measure 50k tok/s: 50,000 x 4.8e10 = 2.4e15
model FLOP/s against 7.9e15 peak: **MFU = 30%**. Calibration for dense models:
40-50% is very good on H100/TPU at scale, 30% is respectable, under 20% means a
bottleneck (input pipeline, comms, small batch, unfused ops). MoE, long context,
and small per-GPU batches all push it down; do not compare MFU across different
architectures blindly.

## 6. The checklist

For any planned run, in order: (1) params -> memory per regime, does it fit and
with what sharding; (2) 6ND -> total compute -> wall-clock at an assumed MFU
(0.3-0.4 training); (3) roofline check: is the per-device batch big enough to be
compute bound; (4) communication volume per step vs interconnect tier
([interconnects-and-scaling.md](interconnects-and-scaling.md)); (5) for
inference: weights+KV vs bandwidth for latency, critical AI for throughput.
Five lines of arithmetic that regularly saves a week of debugging.
