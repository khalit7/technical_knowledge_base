# DiffusionGemma Technical Report

⏱ 13 min read · +~1h 30m resources

- **Authors/lab**: DiffusionGemma Team, Google DeepMind
- **Date**: August 2026 (arXiv v1 31 Jul 2026; report dated 2026-08-04)
- **Links**: [arXiv 2608.00146](https://arxiv.org/abs/2608.00146) (~1h 30m, technical report) | open weights (Apache 2.0) with reference implementations in HuggingFace Transformers and vLLM, plus an open-source LoRA finetuning toolkit built on Hackable Diffusion
The first open-weights text diffusion model that is simultaneously fast and genuinely capable: Gemma 4 26B A4B (MoE, 3.85B active) converted from autoregressive to discrete diffusion with less than 10% of the AR model's training token budget, generating ~20 tokens per forward pass and ~1,500 tokens per second on a single H100, a 7.1x speedup over its own AR baseline (4.8x over the AR baseline with multi-token-prediction speculative decoding) while staying broadly competitive in quality and retaining thinking mode, multimodality, long context, and even AR decoding.

### Problem

Single-request AR decoding is memory-bound: each token requires streaming all weights and KV cache through HBM, leaving compute idle and capping per-user speed. Speculative decoding helps but tops out around 3-6 tokens per forward pass, and parallel drafters suffer falling acceptance rates at later draft positions. Text diffusion decodes whole blocks in parallel and shifts execution toward compute-bound, but as of mid-2026 the good models (Gemini Diffusion, Mercury) were locked behind APIs, and open-weights alternatives (LLaDA, Nemotron Diffusion) lacked reasoning and multimodal ability or failed to deliver the promised latency. There was also no public recipe for cheaply turning a frontier AR model into a competitive diffusion model.

### Method

#### Architecture and decoding

- **Base**: Gemma 4 26B A4B MoE checkpoint (25.2B total, 3.85B activated, 8 of 128 experts + 1 shared, 262k vocab, 550M vision encoder). No diffusion pretraining; AR weights are warm-started directly. Only 7.8M new parameters (a self-conditioning MLP).
- **Discrete multinomial diffusion** in the continuous-time Markov chain / discrete flow matching framework: each token in a 256-token "canvas" is independently replaced by a uniform-random vocabulary token with probability increasing along the noise schedule; the model learns the posterior over clean tokens given a noisy canvas. Multinomial (uniform) rather than masked diffusion means any token can transition to any other, so tokens accepted at earlier denoising steps can still be revised within the canvas (built-in self-correction).
- **Block-AR generation with a shared-weights encoder-decoder**: a causal encoder encodes the prompt into a KV cache; a bidirectional decoder iteratively denoises the current 256-token canvas, cross-attending to that cache; the finished canvas is re-encoded causally and appended to the cache before the next canvas. This is the structural inversion of BART/T5 (causal encoder, bidirectional decoder) and is what restores KV-cache reuse and open-ended length to diffusion decoding.
- **Self-conditioning**: at each step the softmaxed clean-token prediction is embedded (FFW over p_hat * E) and fed back into the next denoising step, letting steps build on previous predictions.
- **Entropy-bounded sampler** (Algorithm 1): temperature annealed linearly 0.8 -> 0.4 across the trajectory; tokens are accepted in rank order from lowest predictive entropy until a total entropy budget (b = 0.1) is hit, MaskGIT-style; remaining positions are re-noised uniformly. **Adaptive stopping** halts denoising when mean canvas entropy < 0.005 and the argmax prediction is unchanged for two consecutive steps: with a cap of N = 48 the model averages ~12 effective steps, spending fewer on structured tasks (code) and more on hard reasoning, an organic form of adaptive test-time compute.

#### Two-stage training (< 10% of the AR model's token budget)

1. **SFT**: extended finetuning to denoise 256-token canvases under a block-diagonal attention mask, cross-entropy against the clean canvas at uniformly sampled noise levels, conditioning on clean context via the encoder KV cache. Non-thinking quality appears quickly; coherent thinking behaviour needs extended SFT and improves log-linearly with training.
2. **SD-RL (sampler distillation + reinforcement learning)**: a unified online stage replacing the usual separate RLHF and few-step-distillation phases. The model acts as its own online teacher, generating high-step denoising trajectories; a joint objective simultaneously maximizes task reward (Gemma 4 RL data mix: helpfulness, math, coding, instruction following) and distills quality into the few-step regime by driving down predictive entropy. Lower entropy makes adaptive stopping trigger earlier, which automatically shifts the training distribution toward shorter trajectories: a self-paced curriculum. Continuing SD-RL past reward plateau keeps buying inference speed. Results of the stage: TPF roughly quadruples (5 -> ~20), +10 points on GPQA-Diamond + LiveCodeBench-v6 average, and it fixes the SFT checkpoint's few-step degeneration into repetition loops. Emergent side effect: outputs get ~2x more concise, multiplying the speed gains (final model uses < 5% of the AR baseline's forward passes across the eval suite) at some cost to long-reasoning gains.

#### Inference engineering

A DiffusionGemma step processes 256 tokens yet is only 3.2x slower than a single-token AR step (12.63ms vs 4.01ms per step, H100 FP8, 4096-token prompt). Overheads: MoE experts 4.3x (a 256-token canvas activates ~84 unique experts per layer vs 8 for one token, so expert-weight transfer stops amortizing; a dense model would lose under 2x), sampling 5.5x (full-canvas softmax over 262k vocab plus self-conditioning matmul, implemented in torch.compile rather than custom kernels), attention 4.1x (bidirectional over the canvas, FlashAttention-4). Serving avoids all CPU-GPU synchronization despite adaptive stopping and two attention-mask types via asynchronous scheduling and a per-sequence causal-attention flag in vLLM.

### Results

- **Speed**: ~1,479-1,512 TPS single-request on one H100 (FP8) vs 204 TPS for Gemma 4 AR and 303 TPS with MTP speculative decoding; ~2.5x faster than the proprietary Mercury 2 API and roughly 4x LLaDA 2.1 Flash 100B (itself on 8x B200). Third parties report up to 2,000 TPS on RTX 6000.
- **Quality (thinking TD mode vs the Gemma 4 AR-MTP baseline)**: GPQA-Diamond 73.2 vs 82.3, AIME 2026 69.1 vs 88.3, LiveCodeBench-v6 69.1 vs 77.1, GSM8K 96.3 vs 96.7, IFEval 97.4 vs 98.7, HumanEval 94.5 vs 98.8. A real but bounded quality tax for ~5x decoding speed; far above open diffusion baselines (Nemotron Diffusion 14B, LLaDA 2.1 Flash) and competitive with Mercury 2.
- **Dual mode**: the weights load straight back into the Gemma 4 architecture for standard AR decoding, scoring between TD mode and the original baseline; a path to latency-based routing and hybrid diffusion-AR decoding.
- **Adaptive compute in action**: highly constrained outputs (strict JSON extraction, code editing) converge in 2-3 denoising steps because structural priors are locked in across the whole sequence at once, something AR decoding cannot exploit.
- **Downstream SFT**: the released toolkit with LoRA on 2x A100 takes Sudoku accuracy from 0% to 84-85% while cutting effective denoising steps from ~41 to ~11.
- **Limitations (stated)**: quality gap vs the AR parent (short SFT, latency-targeted SD-RL, inherited AR-optimized architecture); emergent conciseness precludes long-reasoning gains; rare token-stuttering loops; a missed closing-think-tag bug depresses MMMU-Pro thinking scores; the throughput advantage inverts beyond ~32 concurrent requests since diffusion trades memory bandwidth for compute.

### Why it matters

- **Existence proof for open, fast, smart text diffusion.** Before this, the field forced a three-way trade between speed, intelligence, and open access. An Apache 2.0 release with Transformers and vLLM support makes text diffusion a practical serving option, not a demo.
- **The AR-to-diffusion conversion recipe is now public and cheap**: warm-start from AR weights, SFT for bidirectional denoising, then a single online SD-RL stage that couples reward maximization with sampler compression via an entropy-driven curriculum. Under 10% of the original training tokens, capabilities (thinking, multimodal, long context) inherited rather than retrained.
- **Latency economics**: 20 TPF vs the 3-6 TPF ceiling of speculative decoding attacks the memory-bandwidth bottleneck directly, trading data movement for FLOPs exactly as compute-to-bandwidth ratios keep growing. The per-step GPU breakdown (MoE expert transfer as the dominant diffusion overhead) is a useful design datapoint: dense or fewer-expert architectures suit diffusion decoding better.
- **A counterexample to RL-makes-outputs-longer**: SD-RL's entropy objective produces 2x shorter generations while raising reward, the opposite of typical RLVR length growth, because here brevity is a speed multiplier being optimized for.

### Connections

- topics/generative-and-multimodal/text-diffusion-and-world-models.md: the KB deep dive on this space; DiffusionGemma is the strongest open-weights entry in the 2026 AR-initialised block-diffusion recipe described there (Mercury, Gemini Diffusion, LLaDA 2.x), and this paper confirms the pattern of causal-context block diffusion to restore KV-cache reuse.
- 2020-06_ddpm: the continuous diffusion foundation; DiffusionGemma uses its discrete-state descendant (CTMC / discrete flow matching, multinomial corruption) rather than embedding-space Gaussian diffusion, which the paper argues breaks likelihood bounds under rounding.
- 2018-10_bert: masked/random token replacement pretraining is the single-step ancestor that discrete diffusion generalizes into a multi-step Markov process.
- 2024-01_mixtral: MoE serving background; the expert-transfer cost that helps sparse AR decoding becomes DiffusionGemma's largest per-step overhead (84 vs 8 unique experts per layer per canvas).
- 2023-09_vllm-pagedattention: the memory-bound serving analysis that motivates the whole approach; DiffusionGemma ships as a vLLM reference implementation with async scheduling.
- 2025-01_deepseek-r1: the RLVR baseline recipe; SD-RL is its diffusion-native counterpart, with sampler distillation fused into the RL stage and conciseness instead of length growth as the emergent behaviour.
