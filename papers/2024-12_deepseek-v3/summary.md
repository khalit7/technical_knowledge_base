# DeepSeek-V3 Technical Report

- **Authors/lab**: DeepSeek-AI
- **Date**: December 2024 (arXiv v1 2024-12-27; v2 2025-02-18)
- **Links**: [arXiv 2412.19437](https://arxiv.org/abs/2412.19437) | [GitHub (weights + code)](https://github.com/deepseek-ai/DeepSeek-V3)
- Added to KB: 2026-08-24

## Best resources

- [DeepSeek-V3 Explained: Multi-head Latent Attention (Shirley Li, TDS)](https://towardsdatascience.com/deepseek-v3-explained-1-multi-head-latent-attention-ed6bee2a67c4/): the clearest derivation of MLA from MHA/MQA/GQA, including the decoupled RoPE trick.
- [Stratechery: DeepSeek FAQ (Ben Thompson)](https://stratechery.com/2025/deepseek-faq/): context on what the $5.576M figure does and does not cover, and why the release landed the way it did.
- [DeepSeek-V3 training budget Fermi estimation (planetbanatt)](https://planetbanatt.net/articles/v3fermi.html): independent sanity check that the claimed GPU hours are plausible for a 37B-active MoE on 14.8T tokens.
- [DeepWiki: DeepSeek-V3 MLA implementation walkthrough](https://deepwiki.com/deepseek-ai/DeepSeek-V3/4.2-multi-head-latent-attention-(mla)): maps the paper's equations to the released code.

## Problem

Open-source models trailed frontier closed models, and the assumed fix (more dense parameters, more GPUs) was priced out of reach for most labs. DeepSeek-V2 had validated MLA and fine-grained MoE as an efficiency architecture; V3 asks how far algorithm-framework-hardware co-design can push a 671B-parameter MoE trained on export-restricted H800s: MoE without auxiliary-loss damage, FP8 without divergence, and cross-node expert parallelism without communication becoming the bottleneck.

## Method

671B total parameters, 37B activated per token; 61 layers, hidden dim 7168, 128 attention heads; trained on 14.8T tokens with remarkable stability (no irrecoverable loss spikes, no rollbacks).

**MLA (multi-head latent attention).** Keys and values are produced from a low-rank joint compression: h_t is down-projected to a latent c_KV of dimension 512 (vs 128 heads x 128 dims = 16384 for full KV), then up-projected per head. RoPE cannot commute through the up-projection, so a separate "decoupled" shared key k_R (dim 64) carries positional information and is concatenated to every head's key. Only c_KV and k_R are cached, so the KV cache per token is 576 dims instead of 32768 (K+V), a ~57x reduction, while matching or beating standard MHA quality. Queries get an analogous low-rank compression (dim 1536) purely to cut activation memory in training; at inference the up-projections can be absorbed into adjacent matrices.

**DeepSeekMoE with auxiliary-loss-free balancing.** Each MoE layer (all but the first 3) has 1 shared expert plus 256 fine-grained routed experts (intermediate dim 2048); top-8 routing by sigmoid affinity scores, normalized over the selected set. The load-balancing innovation: instead of an auxiliary balance loss that distorts gradients, each expert gets a non-learned bias b_i added to its affinity score only for top-K selection (gating values still use the raw score). After every step, overloaded experts get their bias decremented by gamma=0.001 and underloaded ones incremented. A vestigial sequence-wise balance loss (alpha=1e-4) only guards against extreme per-sequence imbalance. Ablations at 16B and 229B scale show aux-loss-free consistently beats aux-loss models and yields stronger expert domain specialization; the paper argues batch-wise balancing is a strictly looser constraint than sequence-wise. Routing is node-limited (each token reaches at most 4 nodes) and no tokens are ever dropped, in training or inference.

**Multi-token prediction (MTP).** One extra sequential module (D=1) predicts the second-next token, keeping the full causal chain (unlike Gloeckle et al.'s parallel heads; closer to EAGLE). It shares the embedding and output head with the main model and adds a weighted CE loss (lambda 0.3 then 0.1). The module is discarded at inference, so it is a free training-signal densifier, or repurposed for speculative decoding: the second-token acceptance rate is 85-90%, giving 1.8x decoding TPS. Ablations show consistent benchmark gains at identical inference cost.

**FP8 training.** First public validation of FP8 mixed precision at this scale. All three Linear GEMMs (Fprop, Dgrad, Wgrad) run in FP8; embedding, output head, MoE gating, normalization, and attention ops stay BF16/FP32, master weights and gradients FP32, optimizer moments BF16. Two key fixes make E4M3-everywhere work: (1) fine-grained quantization, 1x128 tiles for activations and 128x128 blocks for weights, with online (not delayed) scale computation, sharing exponent bits across small groups; (2) increased accumulation precision, since H800 tensor cores accumulate at only ~14 bits: partial sums are promoted to FP32 CUDA-core registers every N_c=128 elements, with dequantization scales applied there. Relative loss error vs a BF16 baseline stays under 0.25%. This tile/block scaling anticipates the microscaling formats native to Blackwell. Section 3.5 is effectively a wishlist to NVIDIA: better accumulation precision, native fine-grained scaling, fused FP8 cast + TMA.

**DualPipe and infra.** Cross-node expert parallelism naively gives a ~1:1 compute-to-communication ratio. DualPipe is a bidirectional pipeline schedule that pairs forward and backward chunks and overlaps their attention/MLP compute with all-to-all dispatch/combine, splitting backward into input-grad and weight-grad (ZeroBubble style). Bubble shrinks to (PP/2 - 1)(F&B + B - 3W) at the cost of 2x parameter copies (cheap given the large EP degree). Parallelism layout: 16-way PP, 64-way EP across 8 nodes, ZeRO-1 DP, and notably no tensor parallelism. Custom all-to-all kernels exploit the IB (50 GB/s) vs NVLink (160 GB/s) asymmetry: each token goes over IB once per target node then fans out via NVLink, so 8 routed experts cost the same as up to 13; only 20 SMs (warp-specialized, tuned PTX) saturate both fabrics. Memory tricks (recompute RMSNorm and MLA up-projections, EMA in CPU, shared embedding/head across PP ranks) keep everything in HBM without TP. Inference disaggregates prefill and decode with redundant expert deployment for load balance.

**The $5.576M claim, precisely.** Total 2.788M H800 GPU hours: 2664K pre-training (180K GPU hours per trillion tokens, 3.7 days per trillion on the 2048-GPU cluster, under 2 months total), 119K context extension (YaRN, two stages, 4K to 32K to 128K), 5K post-training. At an assumed $2/GPU-hour rental that is $5.576M. The paper itself states this covers only the final official run: no prior research, no ablations, no failed experiments, and implicitly no hardware capex or salaries. Much of the January 2025 discourse ignored that caveat; the honest reading is "marginal compute cost of one training run", which is still roughly an order of magnitude below contemporaneous dense frontier runs.

**Post-training.** SFT on 1.5M instances, with reasoning data distilled from DeepSeek-R1-series expert models via rejection sampling (balancing R1 accuracy against its verbosity), then GRPO with rule-based rewards (math answers, code tests) plus a model-based RM for open-ended tasks, and constitutional-AI-style self-rewarding using V3's own voting judgments.

## Results

- **Base model**: strongest open-source base at release. MMLU 87.1, BBH 87.5, HumanEval 65.2, MATH 61.6, beating LLaMA-3.1 405B (11x more active params) on most benchmarks, especially code and math.
- **Chat model**: MMLU 88.5, MMLU-Pro 75.9, GPQA-Diamond 59.1, MATH-500 90.2 (above o1-preview), AIME 2024 39.2, LiveCodeBench 40.5, Codeforces 51.6 percentile, SWE-bench Verified 42.0 (below Claude-3.5-Sonnet's 50.8 but far above other open models). Arena-Hard 85.5: first open model over 85, on par with Claude-3.5-Sonnet.
- **Efficiency**: full training in 2.788M H800 hours; MTP-based speculative decoding gives 1.8x TPS; MLA keeps the KV cache small enough for long-context serving (solid 128K needle-in-a-haystack).

## Why it matters

The release collapsed the assumed cost floor for frontier-class training and, together with R1 a month later, triggered a broad repricing of AI compute narratives (the "DeepSeek moment"). Technically it is the reference blueprint for large-scale MoE efficiency: MLA, fine-grained experts with aux-loss-free balancing, FP8 with tile/block scaling, and scheduling that hides all-to-all behind compute have all been widely studied and adopted since. It also normalized publishing real systems detail (SM counts, PTX-level tricks, hardware requests to NVIDIA) in open model reports, and it is the base model for DeepSeek-R1, making it the substrate of the 2025 open reasoning-model wave. V3 is a case study in what algorithm-hardware co-design buys when GPU supply is the binding constraint.

## Connections

- [papers/2025-01_deepseek-r1](../2025-01_deepseek-r1/summary.md): RL-based reasoning successor built on V3-Base; also the distillation source for V3's own reasoning SFT data.
- [papers/2024-02_deepseekmath-grpo](../2024-02_deepseekmath-grpo/summary.md): origin of the GRPO algorithm used in V3 post-training.
- [papers/2024-01_mixtral](../2024-01_mixtral/summary.md) and [papers/2021-01_switch-transformer](../2021-01_switch-transformer/summary.md): earlier open MoE designs; V3's aux-loss-free balancing directly addresses the auxiliary-loss trade-off Switch introduced.
- [papers/2021-04_roformer-rope](../2021-04_roformer-rope/summary.md): RoPE, whose incompatibility with low-rank KV compression motivates MLA's decoupled key.
- [papers/2019-10_zero](../2019-10_zero/summary.md) and [papers/2019-09_megatron-lm](../2019-09_megatron-lm/summary.md): the DP/TP/PP toolbox V3 remixes (ZeRO-1 DP, no TP, DualPipe PP).
- [papers/2024-07_llama-3](../2024-07_llama-3/summary.md): the dense 405B baseline V3 overtakes with 37B active parameters.
- [papers/2022-12_constitutional-ai](../2022-12_constitutional-ai/summary.md): basis of V3's self-rewarding feedback for open-ended RL.
- Topics: `topics/llms`, `topics/llm-training-and-post-training`, `topics/inference-and-serving`, `topics/hardware`.
