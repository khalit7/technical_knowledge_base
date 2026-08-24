# The Llama 3 Herd of Models

- **Authors/lab**: Llama Team, AI @ Meta
- **Date**: July 2024 (paper 2024-07-23; arXiv v3 2024-11)
- **Links**: [arXiv 2407.21783](https://arxiv.org/abs/2407.21783) | [Meta blog](https://ai.meta.com/blog/meta-llama-3-1/) | [llama.meta.com](https://llama.meta.com/) | [Model repo](https://github.com/meta-llama/llama-models)

## Best resources

- [Oxen.ai arXiv Dive: How Meta Trained Llama 3.1](https://www.oxen.ai/blog/llama-3-1-herd-of-models): section-by-section walkthrough with emphasis on data and the training pipeline.
- [Raschka, New LLM Pre-training and Post-training Paradigms](https://magazine.sebastianraschka.com/p/new-llm-pre-training-and-post-training): puts the Llama 3.1 recipe side by side with Qwen 2, Gemma 2, and Apple AFM.
- [Arize: Breaking Down Meta's Llama 3 Herd of Models](https://arize.com/blog/breaking-down-meta-llama-3/): compact tour of pre-training, post-training, and the key levers.
- [Rudrite interactive visual explainer](https://research.rudrite.com/llama-3): animated walkthrough with exhibits computed from the paper's formulas.

## Problem

Open-weight models trailed frontier closed models (GPT-4 class) by a wide margin, and no open release documented how to actually build one: the data curation, the scaling-law methodology, the infrastructure needed to keep 16K GPUs busy, and a post-training recipe that scales. Llama 3 closes the capability gap with a dense 405B model and, unusually, publishes the full engineering playbook. The stated philosophy is three levers: data, scale, and managing complexity (deliberately choosing a dense Transformer over MoE and SFT+RS+DPO over RL, for stability and simplicity).

## Method

Herd of 8B / 70B / 405B dense Transformers, 128K token vocabulary (tiktoken 100K + 28K multilingual tokens), GQA with 8 KV heads, RoPE theta 500,000, intra-document attention masking. 405B: 126 layers, d=16384, 128 heads, trained on 15.6T tokens with 3.8e25 FLOPs. All released results are the Llama 3.1 versions.

### Pre-training data

- Web curation: custom HTML parser (markdown stripped as harmful), three-level dedup (URL, global MinHash at document level, aggressive ccNet-style line-level removing lines seen >6 times per bucket of 30M docs), heuristic filters (duplicated n-gram coverage, dirty-word counts, token-distribution KL outliers), and model-based quality filtering (fasttext "would Wikipedia cite this", plus DistilRoberta classifiers trained on Llama 2 quality judgments). Separate domain pipelines for code and math pages.
- **Final mix: roughly 50% general knowledge, 25% math and reasoning, 17% code, 8% multilingual** (176-language fasttext ID). Mix chosen via knowledge classification plus scaling-law experiments on candidate mixes; mix adjusted mid-run (more non-English, upsampled math, fresher web data late, downsampled low-quality subsets).
- Annealing as a data lever: annealing an 8B on GSM8k/MATH train sets lifts validation 24.0% / 6.4%, but gains are negligible at 405B. They also use annealing (30% new dataset, 70% default mix, 40B tokens on a half-trained 8B) as a cheap estimator of a new dataset's value, instead of full scaling-law runs.

### Scaling laws

Two-stage downstream prediction: (1) correlate compute-optimal models' negative log-likelihood on a benchmark with training FLOPs, (2) map NLL to accuracy via a sigmoid fit that also uses Llama 2 models. IsoFLOPs experiments (6e18 to 1e22 FLOPs) give N*(C) = A*C^alpha with (alpha, A) = (0.53, 0.29); extrapolating to 3.8e25 FLOPs suggests 402B params on 16.55T tokens, hence 405B. IsoFLOPs curves flatten near the optimum at high compute, so the size choice is robust. The ARC-Challenge forecast extrapolated four orders of magnitude and only slightly underestimated the final model.

### Infrastructure (the part worth memorizing)

- **Compute**: up to 16K H100s (700W, 80GB HBM3) on Meta production clusters, Grand Teton servers, MAST scheduler. Storage: Tectonic, 240PB SSD, 2 TB/s sustained / 7 TB/s peak, sized for extremely bursty checkpoint writes.
- **Network**: 400 Gbps RoCE (Arista 7800 + Minipack2) in a 3-layer Clos over 24K GPUs; full bisection within 3,072-GPU pods, 1:7 oversubscription at the aggregation layer, so parallelism layout is topology-aware. Enhanced-ECMP with 16 flows per GPU pair for load balancing, deep-buffer spine switches, and no DCQCN. NCCLX (NCCL fork) for collectives. The 8B/70B trained on InfiniBand clusters instead.
- **4D parallelism** ordered [TP, CP, PP, DP] innermost to outermost by bandwidth need: TP=8, PP=16, FSDP as DP (optimizer state and gradients sharded, weights not resharded after forward to skip a backward all-gather). Pipeline improvements: tunable number of contiguous micro-batches (interpolates between DFS and BFS schedules), one layer removed from first and last stages to balance embedding and loss compute, interleaved schedule, async point-to-point. Result: 8K-token pre-training without activation checkpointing. Context parallelism (long-context stage only) is all-gather based over K/V, cheap because GQA keeps K/V small. **BF16 MFU 38-43%** (430 TFLOPs/GPU at 8K GPUs, 380 at 131K sequence length). FP32 gradient accumulation and reduce-scatter for stability.
- **Reliability**: over a 54-day snapshot, 466 job interruptions, 419 unexpected, **78% attributed to hardware; faulty GPUs 30.1% and HBM3 memory 17.2% are the top causes** (Table 5); at least one interruption per day. Still: >90% effective training time and only 3 incidents needing manual intervention, the rest automated. Tooling: PyTorch NCCL flight recorder for hang diagnosis, straggler detection for slow-but-alive GPUs, and a 1-2% diurnal throughput swing from midday temperatures. Synchronized GPU idle/busy transitions swing datacenter power by tens of megawatts.

### Pre-training recipe (405B)

AdamW, peak LR 8e-5, 8K-step linear warmup, cosine decay to 8e-7 over 1.2M steps. Batch ramp: 4M tokens at seq 4096, doubled to 8M at seq 8192 after 252M tokens, to 16M after 2.87T tokens. Very stable, few loss spikes, no divergence interventions. Then **long-context pre-training**: six stages from 8K to 128K context (about 800B tokens), advancing only when short-context evals recover and needle-in-a-haystack is solved at the current length. Finally **annealing**: LR linearly to 0 over the last 40M tokens at 128K context, upsampling top-quality data, with Polyak averaging of checkpoints for the final model.

### Post-training: six rounds of RM + SFT + DPO

Each of six rounds: (1) train a **reward model** on human preference data (Llama 2 recipe minus the margin term; annotators pick chosen vs rejected on model pairs from different recipes, then optionally edit the winner, giving edited > chosen > rejected); (2) **rejection sampling**: K = 10 to 30 samples per prompt from the best current checkpoint, RM picks the winner; PagedAttention (vLLM) gives >2x RS throughput; (3) **SFT** on rejection-sampled plus synthetic plus curated data, LR 1e-5, 8.5-9K steps; (4) **DPO** on the latest preference batches only (near on-policy), LR 1e-5, beta 0.1, with two fixes: mask formatting/header tokens out of the loss (they caused tail repetition and abrupt termination) and add an NLL loss on chosen sequences with coefficient 0.2; (5) **model averaging** across RM/SFT/DPO variants. DPO beat PPO in their tests at less compute, notably on IFEval.

Data: preference mix is 82% general English, 7% coding, 5% multilingual, 6% reasoning/tools; SFT mix is 52.7% general, 21.2% reasoning and tools, 14.9% code, 8.1% exam-like, 3.0% multilingual, 0.11% long context. Since most data is model-generated, heavy quality control: rule-based cleaning (excess emojis, "I apologize" tone), topic classification with a finetuned 8B, quality scoring by RM OR Llama-as-judge (the two disagree a lot; the union wins), difficulty scoring (Instag + Llama), and semantic dedup (RoBERTa clustering, keep by quality x difficulty).

Capability-specific machinery: a **code expert** (main run branched and continued on 1T tokens of >85% code, CodeLlama style) and a **multilingual expert** (90% multilingual continued pre-training) generate annotations and synthetic data; 2.7M synthetic code SFT examples with execution feedback (parser, linter, generated unit tests in containers; about 20% of solutions started wrong and were self-corrected), cross-language translation, and 1.2M backtranslation dialogs for documentation and explanation. Math uses stepwise reward models and MCTS to filter bad reasoning traces. Long context needs only 0.1% synthetic long-context SFT data to keep 128K working, and short-context-only DPO does not hurt it. Tool use (Brave Search, Python interpreter, Wolfram Alpha) is trained with message-level human preference annotation. Factuality follows "align to know what it knows": knowledge probing generates refusal training for questions the model consistently gets wrong. The 405B is served with FP8 quantization on feedforward matmuls.

## Results

- 405B Instruct lands in the GPT-4 class: MMLU 87.3 (5-shot) / 88.6 (0-shot CoT), MMLU-Pro 73.3, IFEval 88.6, HumanEval 89.0, GSM8K 96.8, MATH 73.8, MGSM 91.6, ARC-C 96.9; roughly at or near GPT-4 (0125) and competitive with GPT-4o and Claude 3.5 Sonnet on many tasks, though behind on some coding and GPQA.
- 8B and 70B are best-in-class at their sizes against Gemma 2 9B, Mistral 7B, and Mixtral 8x22B (e.g. 70B: MMLU 86.0 0-shot CoT, HumanEval 80.5, GSM8K 95.1).
- The forecasting methodology validated: the two-stage scaling law predicted flagship benchmark accuracy across a four-orders-of-magnitude compute extrapolation.
- Released open weights (base + instruct at all three sizes) plus Llama Guard 3; vision, video, and speech adapters trained compositionally but not released.

## Why it matters

First open-weights model credibly at GPT-4 level, and still the most detailed public account of a frontier-scale training run: the failure taxonomy of a 16K-GPU job (78% hardware, GPUs and HBM dominating), the MFU numbers, the 4D parallelism layout, and the exact annealing and batch-ramp schedules are reference data you cannot get elsewhere. It cemented the now-standard open post-training recipe (iterative rejection sampling + SFT + DPO instead of PPO), popularized annealing both as a final-quality boost and as a cheap dataset evaluator, and demonstrated downstream-benchmark scaling-law forecasting. The "managing complexity" argument (dense over MoE, DPO over RL) defined one pole of the design space that DeepSeek-V3/R1 later took the opposite side of.

## Connections

- `papers/2022-03_chinchilla`: the compute-optimal framework Llama 3 extends; the 8B/70B are deliberately overtrained past compute-optimal for inference efficiency.
- `papers/2020-01_scaling-laws`: ancestor of the scaling-law methodology; Llama 3 adds the NLL-to-accuracy second stage.
- `papers/2023-05_dpo`: the alignment algorithm Llama 3 scales up (with token masking and the NLL term).
- `papers/2022-03_instructgpt`: the PPO-based RLHF pipeline Llama 3 explicitly moves away from.
- `papers/2023-09_vllm-pagedattention`: used to double rejection-sampling throughput.
- `papers/2021-04_roformer-rope`: RoPE with theta raised to 500K for long context.
- `papers/2019-09_megatron-lm`, `papers/2019-10_zero`: the TP and FSDP building blocks of the 4D parallelism stack.
- `papers/2024-12_deepseek-v3`: the counterpoint (MoE, FP8 training, RL-heavy post-training) to Llama 3's dense-and-simple bet.
- Topics: `topics/llm-training-and-post-training`, `topics/data-curation-and-datasets`, `topics/ml-infra-and-orchestration`, `topics/llms`, `topics/hardware`.
