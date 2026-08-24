# 2 OLMo 2 Furious (OLMo 2)

- **Authors/lab**: OLMo Team, Allen Institute for AI (Ai2) with University of Washington; core contributors include Pete Walsh, Luca Soldaini, Dirk Groeneveld, Kyle Lo, Nathan Lambert, Hannaneh Hajishirzi
- **Date**: December 2024 (arXiv 2501.00656; 32B added March 2025; COLM 2025)
- **Links**: [arXiv](https://arxiv.org/abs/2501.00656) | [Ai2 blog](https://allenai.org/blog/olmo2) | [OLMo-core trainer](https://github.com/allenai/OLMo-core) | [open-instruct post-training](https://github.com/allenai/open-instruct) | [OLMES evals](https://github.com/allenai/olmes) | Data: olmo-mix-1124, dolmino-mix-1124 on HF

## Best resources

- [Ai2 release blog](https://allenai.org/blog/olmo2): condensed overview of the recipe, artifacts, and links to every dataset, checkpoint, and log
- [Interconnects: Interviewing OLMo 2 leads](https://www.interconnects.ai/p/olmo-2-pod): the team on the practical secrets behind the recipe (stability debugging, mid-training, infra)
- [Sebastian Raschka: The Big LLM Architecture Comparison](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison): puts OLMo 2's post-norm and QK-norm choices in context against Llama/Qwen/Gemma
- [Papers Explained 284: OLMo 2 (Ritvik Rastogi)](https://ritvik19.medium.com/papers-explained-olmo-2-f4d34e886503): section-by-section walkthrough of the paper

## Problem

Open-weights models (Llama 3.1, Qwen 2.5, Gemma 2) release only the final artifact of a complex pipeline; you cannot study or reproduce how they were trained. Prior fully open models (OLMo 1, Pythia, Amber, MAP-Neo, DCLM) lagged the open-weights frontier in quality. OLMo 2 aims to close that gap while releasing everything: weights, full pretraining and mid-training data, training code, recipes, logs, and thousands of intermediate checkpoints (Apache 2.0). It is the best public documentation of a complete, competitive LLM training pipeline, which makes it the reference recipe for anyone reproducing pretraining.

## Method

Dense decoder-only transformers at 1B, 7B, 13B, 32B. Four deep dives: pretraining stability, mid-training, post-training, infrastructure.

**Architecture** (changes vs OLMo 1/0424, all motivated by stability ablations): no biases, SwiGLU, RoPE with theta 5e5, RMSNorm instead of nonparametric LayerNorm, **reordered norm** (normalize the *outputs* of attention and MLP blocks, not the inputs: h = x + RMSNorm(Attn(x)); h_out = h + RMSNorm(MLP(h))), **QK-norm** (RMSNorm on queries and keys before attention, prevents attention-logit blowup), **z-loss** (1e-4 * log^2 Z on the softmax normalizer, keeps final logits bounded). Tokenizer: cl100k (GPT-4's), plus OLMo PII masking tokens. 7B/13B use MHA; 32B uses GQA (40 Q heads / 8 KV). Sequence length 4096. 7B: 32 layers, d=4096, peak LR 3e-4; 13B: 40 layers, d=5120, LR 9e-4; 32B: 64 layers, d=5120, LR 6e-4. Batch 1024-2048 sequences, 2000-step warmup, cosine decay truncated before reaching its end.

**Stability interventions** (each ablated; together they removed the loss/grad-norm spikes that plagued OLMo-0424):

- **Repeated n-gram filtering**: documents with a span of 1-13 tokens repeated 32+ times are removed from data (plus a trainer-side loss mask); these sequences were prevalent in spike batches.
- **Initialization**: plain normal(0, 0.02) for every parameter, replacing scaled/depth-dependent init. Empirically preserves activation and gradient norms across layers (growth exponent near 0) and correlates gradient norms with sqrt(d_model), which predicts hyperparameter transfer across widths. Grad-norm spike score dropped 0.40 to 0.03.
- **AdamW epsilon 1e-8** instead of the 1e-5 found in some LM codebases: allows larger early updates, gradient norm settles faster and stays lower.
- **No weight decay on embeddings**: decayed embeddings shrink, and small embedding norms inflate early-layer gradients (the Jacobian of layer norm is inversely proportional to input norm).
- Practical war story: Flash Attention's fused z-loss silently diverged from a plain PyTorch implementation in the backward pass; they abandoned the fused version and retrained from before the divergence.

**Two-stage training.** Stage 1 pretraining (90-95% of FLOPs) on **OLMo 2 Mix 1124**: 3.9T tokens, over 95% web (DCLM-Baseline 3.71T) plus StarCoder, peS2o, arXiv, OpenWebMath, Algebraic Stack, Wikipedia. 7B sees 4T tokens total, 13B 5.6T, 32B 6.6T.

**Stage 2 mid-training** (5-10% of FLOPs) on **Dolmino Mix 1124** while linearly decaying LR to zero: quality-filtered web (DCLM top 7% by FastText classifier, crossed with FineWeb-Edu score >= 2; about 50% of the mix), FLAN, peS2o, Wikipedia, Stack Exchange Q&A, plus a 10.7B-token synthetic **math mix** (TuluMath persona-generated problems, TinyGSM rewritten into natural language by Qwen2.5-7B-Instruct, MathCoder2, Metamath, GSM8K train). Key findings for reproducers:

- **LR sensitivity is folklore-busting**: peak LRs from 3e-4 to 12e-4 all land within noise after anneal-to-zero; a higher LR makes mid-training more effective by exactly as much as it made pretraining worse. Crossover between LRs happens past 200B tokens, so short sweeps mislead.
- **Microannealing**: to evaluate a candidate data source, anneal LR to zero on a small 50/50 mix of the candidate and baseline web data. 19 microanneals cost 130B tokens total and give clean signal in under 10B tokens per run. Lessons: domain data helps even at 10% concentration; duplicating scarce high-quality data 2x helps; rewriting code-formatted data into natural language (TinyGSM-MIND) took GSM8K-dev from 25 to 70.
- **Checkpoint souping**: run the anneal 3-4 times with different data orders and average the weights. Souping consistently matches or beats the best single run. Final 7B = average of three 50B-token anneals; 13B/32B = average of three 100B runs plus one 300B run.
- Mid-training gains are large: 7B jumps +10.6 avg points (GSM8K 24.1 to 67.5), 13B +9.4.

**Post-training** follows the Tulu 3 recipe: SFT (about 939K prompts, permissive-license focus), DPO on on-policy synthetic preferences (GPT-4o judge over completions from ~20 models), then **RLVR** with PPO on GSM8K/MATH/IFEval-style verifiable prompts, run as multiple sequential stages (13B: general mix, then GSM8K, then MATH), with PPO's value function initialized from the reward model. 1B and 32B use GRPO instead (no reward model needed). OLMo 2 needed notably higher post-training LRs than Llama 3.1.

**Infrastructure** (Section 6, unusually candid): two H100 clusters (Jupiter, 1024 GPUs in Austin; Augusta, 160 GCP A3 Mega nodes), Beaker workload manager with pre-job GPU health checks and node cordoning. Throughput tricks in OLMo-core: torch.compile, avoiding host-device syncs (async CPU-to-GPU copies, no per-step metric logging), bookkeeping on a separate GLOO backend thread for async checkpointing, and disabling automatic Python GC in favor of synchronized explicit gc.collect() across ranks (uncoordinated GC stalls lockstep distributed training). Pretraining 7B plus 13B took about 391 MWh.

## Results

- OLMo 2 sits on the compute-performance Pareto frontier among open models: 7B averages 62.9 on the 10-task OLMES subset (vs Llama 3.1 8B 61.8, Qwen 2.5 7B 67.4 at ~4.6x the FLOPs), 13B scores 68.3, 32B 73.3 (beating Qwen 2.5 14B and approaching Qwen 2.5 32B with far fewer FLOPs).
- Fully open models catch up: the previous best fully open 7B (DCLM) scored 56.9; OLMo 2 7B's 62.9 closes most of the gap to open-weights peers.
- Instruct models: OLMo 2 13B Instruct averages 63.5, above Llama 3.1 8B Instruct and Tulu 3 8B, approaching Qwen 2.5 14B Instruct; 32B Instruct (68.8) beats GPT-3.5 Turbo (60.5) and GPT-4o Mini (65.7) on their evaluation average.
- They maintained a declared held-out eval suite (AGIEval, GSM8K, MMLU-Pro, TriviaQA) untouched during development; dev gains transferred, evidence the recipe generalizes rather than overfitting the benchmarks.

## Why it matters

The most complete public account of training a competitive LLM end to end, and the de facto reproduction target for open pretraining. Its stability package (normal init, post-norm plus QK-norm, z-loss, no embedding weight decay, AdamW epsilon 1e-8, n-gram filtering) has become a standard checklist for new pretraining codebases. Mid-training with anneal-to-zero on a curated mix, microannealing for cheap data ablations, and checkpoint souping are directly reusable techniques that cost little and gave double-digit gains. The finding that peak LR barely matters after annealing overturns common folklore and de-risks hyperparameter choices for small-budget reproductions. The infra section (host-device syncs, GC synchronization, async checkpointing) is rare practical detail for anyone running distributed training. Successor work (OLMo 3, 2025) extends the same fully open approach to reasoning models.

## Connections

- Related papers here: [DeepSeek-V3](../2024-12_deepseek-v3/) and [Llama 3](../2024-07_llama-3/) (the open-weights recipes OLMo 2 makes transparent), [Chinchilla](../2022-03_chinchilla/) (compute-optimal background; OLMo 2 trains far past Chinchilla-optimal), [DeepSeekMath/GRPO](../2024-02_deepseekmath-grpo/) (GRPO used for 1B/32B RLVR), [DPO](../2023-05_dpo/) (preference stage), [RoFormer](../2021-04_roformer-rope/) (RoPE), [ZeRO](../2019-10_zero/) and [Megatron-LM](../2019-09_megatron-lm/) (distributed training lineage)
- Tulu 3 (Lambert et al. 2024) supplies the entire post-training pipeline including RLVR; DCLM supplies the pretraining web data
- KB topics: `topics/llm-training-and-post-training` (stability, two-stage pretraining, annealing, souping, SFT/DPO/RLVR), `topics/data-curation-and-datasets` (OLMo 2 Mix / Dolmino Mix, quality filtering, microannealing, synthetic math data), `topics/llms` (OLMo family)
