# DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning

⏱ 16 min read · +~5h 35m resources

- **Authors/lab**: DeepSeek-AI (core contributors: Daya Guo, Dejian Yang, Junxiao Song, Peiyi Wang, Zhihong Shao, et al.)
- **Date**: January 2025 (arXiv v1); v2 January 2026 is the expanded Nature version (published in Nature, September 2025)
- **Links**: [arXiv 2501.12948](https://arxiv.org/abs/2501.12948) (~2h, long report) | [Nature paper](https://www.nature.com/articles/s41586-025-09422-z) (~1h 30m, the expanded version of the same work) | [GitHub](https://github.com/deepseek-ai/DeepSeek-R1) (repo, ~20 min for the README and entry path) | [Models on HF](https://huggingface.co/deepseek-ai) (~10 min)
The paper that showed frontier reasoning can be trained with **pure RL against rule-based verifiable rewards, no reasoning SFT required** (R1-Zero), then packaged that capability into a usable model via a four-stage pipeline (R1) and transferred it to small models by plain SFT distillation. It is the open blueprint for o1-style reasoning models and the founding recipe of the RLVR ecosystem.

### Best resources

- [The Illustrated DeepSeek-R1 (Jay Alammar)](https://newsletter.languagemodels.co/p/the-illustrated-deepseek-r1) (~20 min): visual walkthrough of the three training paths (R1-Zero, R1, distillation); the fastest way to get the whole picture.
- [Understanding Reasoning LLMs (Sebastian Raschka)](https://magazine.sebastianraschka.com/p/understanding-reasoning-llms) (~30 min): places R1 among the four ways to build reasoning models (inference scaling, pure RL, SFT+RL, distillation), with the pipeline redrawn stage by stage.
- [DeepSeek R1's recipe to replicate o1 (Nathan Lambert)](https://www.interconnects.ai/p/deepseek-r1-recipe-for-o1) (~20 min): the best analysis of what the four-stage recipe means for RL training practice and the o1 replication race.
- [Open-R1 (Hugging Face)](https://github.com/huggingface/open-r1) (repo, ~25 min for the README and training entry path): fully open reproduction with GRPO training code, data generation, and evals; the natural starting point for building your own loop.

### Problem

Reasoning gains in LLMs had come from human-annotated CoT for SFT plus inference-time tricks (few-shot CoT, majority voting, search against a PRM). Human demonstrations are expensive, do not scale, and cap the model at human-provided reasoning patterns; process reward models and MCTS both hit reward-hacking and search-space problems (documented in the paper's "unsuccessful attempts" section). OpenAI's o1 proved long-CoT test-time scaling works but published nothing about how. Open question: can reasoning *emerge* from RL alone, with only outcome-level verifiable rewards, skipping supervised reasoning data entirely?

### Method

#### 1. DeepSeek-R1-Zero: pure RL on the base model

Take **DeepSeek-V3-Base** (671B MoE, 37B active) with no SFT at all and run large-scale **GRPO** against **rule-based rewards only**:

- **GRPO recap** (from DeepSeekMath): sample a group of G outputs per question, advantage A_i = (r_i - mean(r)) / std(r) shared across all tokens of output i, PPO-style clipped ratio, KL to a reference policy added in the loss via the unbiased k3 estimator (no critic, no value model). The Nature version adds a PPO-vs-GRPO ablation: PPO can match GRPO but only with careful GAE lambda tuning (lambda=1.0; the common default 0.95 is much worse) and it still costs a full value model. They also refresh the reference model to the current policy every 400 steps, since over thousands of steps the policy legitimately diverges far from init and a fixed KL anchor would fight the learning.
- **Rewards**: accuracy reward (boxed final answer string/sympy match for math; compiler plus hidden test cases for code) + format reward (reasoning must sit inside `<think>...</think>` tags), equally weighted. **Deliberately no neural reward models**, outcome- or process-based, because they get hacked at scale and add retraining complexity.
- **Template**: a minimal "think then answer" prompt with `<think>`/`<answer>` tags and zero content constraints, so any reasoning strategy that appears is the model's own.
- **Hyperparameters** (worth copying for any RLVR loop): lr 3e-6, KL coeff 0.001, temperature 1.0, G=16 outputs per question, max length 32,768 (raised to 65,536 after step 8.2k, which caused a jump in both accuracy and length), 32 questions per step (batch 512), 10,400 steps (1.6 epochs); each rollout wave generates 8,192 outputs split into 16 mini-batches, trained for a single inner epoch (so nearly on-policy).
- **RL data** (Table 4): 26k math, 17k algorithm competition + 8k GitHub-issue bug-fixing, 22k STEM multiple choice, 15k logic (incl. synthetic code-IO and puzzle tasks); all auto-verifiable, all binary 0/1 reward.
**Emergent behavior**: AIME 2024 pass@1 climbs 15.6% -> 77.9% (86.7% with self-consistency), response length grows from hundreds to ~10k+ tokens purely because longer thinking earns more reward, and reflective behaviors appear without being taught: frequency of reflective words ("wait", "verify", "check") rises 5-7x, with "wait" nearly absent early, then spiking after step 8000. The famous **"aha moment"**: an intermediate checkpoint interrupts itself mid-derivation ("Wait, wait. Wait. That's an aha moment I can flag here."), re-evaluates step by step, and tries a different attack. Self-verification, reflection, and strategy switching are *incentivized into existence*, not demonstrated.

**Failure modes of R1-Zero** (the reason R1 exists): CoT has poor readability, mixes English and Chinese inside one trace (traced to V3-Base being mostly EN/CN pretrained, with no language-consistency pressure in the reward), and the model is narrowly reasoning-shaped: weak instruction following, writing, and open-domain QA.

#### 2. DeepSeek-R1: the four-stage pipeline

Each stage produces a named checkpoint (Dev1/Dev2/Dev3 in the Nature version):

1. **Cold-start SFT -> Dev1.** Thousands of long-CoT samples, mostly harvested from R1-Zero itself: sample at temperature 1.0, keep only correct (sympy-checked) and readable outputs (repetition and language-mix filters), then have DeepSeek-V3 plus human annotators rewrite the traces into a consistent first-person conversational style and add a proper summary. SFT V3-Base on this. Fixes readability, costs some raw math skill (AIME drops to 59.0 vs R1-Zero's 77.9).
2. **Reasoning RL -> Dev2.** Same GRPO recipe as R1-Zero (lr 3e-6, KL 0.001, temp 1.0, G=16), with two additions: a **language consistency reward** = fraction of CoT words in the target language (slightly hurts benchmark scores, much more readable; direct addition to the final reward), and a notably **large clip ratio eps = 10**; they report low clip values truncate gradients on many tokens and degrade the model, while too-high causes instability. Recovers and passes R1-Zero on reasoning (AIME 74.0).
3. **Rejection-sampling SFT -> Dev3.** From the Dev2 checkpoint, sample multiple responses per prompt and keep only correct ones; expand beyond rule-checkable prompts using DeepSeek-V3 as a generative judge (ground truth + prediction in, verdict out); filter out mixed-language, rambling, and code-block-laden CoTs. Yields **~600k reasoning samples**, plus **~200k non-reasoning samples** (writing, factual QA, translation, SWE data) from the V3 SFT pipeline, some with V3-prompted CoT. Then SFT **V3-Base again from scratch** on the full 800k (2-3 epochs, lr 5e-5 cosine to 5e-6, ctx 32,768, batch 128). Adds general and writing ability (big AlpacaEval/Aider jumps).
4. **All-scenario RL -> R1.** Second RL stage mixing prompt distributions: rule-based rewards for reasoning data, **model-based rewards for general data** (helpful RM trained on 66k V3-judged preference pairs, arena-hard format, length-debiased, scoring only the final summary; safety RM trained pointwise on 106k prompts, scoring the whole response incl. CoT), plus the language reward. Temperature lowered to 0.7 (1.0 becomes incoherent here). Only 1,700 steps, with preference-model rewards confined to the final 400 steps: longer exposure to a learned RM produces measurable **reward hacking** and degrades reasoning.
**Cost** (Table 7, H800 at $2/GPU-hr): R1-Zero 101K GPU-hrs ($202K, ~198h on 512 H800s), SFT data creation 5K ($10K), R1 41K ($82K, ~80h): **$294K total** on top of the V3-Base pretrain. The RL infra (Supplementary B.1) is a good systems read: vLLM rollout workers with expert parallelism and MTP self-speculative decoding, rule-based reward computation run async and overlapped with rollout, models offloaded from VRAM between rollout/inference/train phases, best-fit length-sorted data packing, DualPipe.

#### 3. Distillation to small models

Take the same 800k SFT samples (R1 as teacher) and run **plain SFT, no RL**, on Qwen2.5-Math-1.5B/7B, Qwen2.5-14B/32B, Llama-3.1-8B, Llama-3.3-70B-Instruct (2-3 epochs, ctx 32,768, batch 64, per-model lr from 1e-4 down to 2e-5). The key control experiment: running the full R1-Zero-style RL recipe directly on Qwen2.5-32B-Base for 10k+ steps (Qwen2.5-32B-Zero) only reaches QwQ-32B-Preview level, while Distill-Qwen-32B beats it decisively on every benchmark. Conclusion: **reasoning patterns discovered by a big model transfer cheaply by SFT; small models cannot discover them via RL at any reasonable compute**. Pushing the frontier still needs a strong base model plus large-scale RL.

### Results

- **R1-Zero**: AIME 2024 15.6 -> 77.9 pass@1 (86.7 cons@16), from pure RL with binary rewards; above the average human AIME competitor.
- **R1 (stage-wise, Table 3)**: AIME 77.9 (Zero) -> 59.0 (Dev1) -> 74.0 (Dev2) -> 78.1 (Dev3) -> **79.8**; final R1: MATH-500 **97.3**, Codeforces rating **2029** (96.3 percentile), LiveCodeBench 65.9, GPQA Diamond 71.5, MMLU 90.8, SWE-bench Verified 49.2. Stage 4 barely moves reasoning but lifts AlpacaEval 2.0 by 25% and ArenaHard by 17% (to 87.6 / 92.3): on par with OpenAI o1-1217 at a fraction of the price.
- **Distilled models**: Distill-Qwen-7B 55.5 AIME / 92.8 MATH-500; Distill-Qwen-32B 72.6 AIME / 94.3 MATH-500 / 62.1 GPQA; Distill-Llama-70B 70.0 AIME / 94.5 MATH-500. All crush GPT-4o and Claude-3.5-Sonnet on reasoning benchmarks; the 32B roughly matches o1-mini.
- **Negative results**: PRM (fuzzy step definitions, unscalable annotation, reward hacking) and MCTS (exponential token search space, value model too hard to train) both failed as training strategies.

### Why it matters

- **Proof that RLVR works at scale.** The recipe is: hard verifiable questions + a reliable rule-based verifier + enough compute, and sophisticated reasoning (reflection, verification, backtracking) emerges without demonstrations. This reframed post-training: capability was already latent in the base model; RL elicits and sharpens it.
- **It set the open-source reasoning agenda.** MIT-licensed weights for R1, R1-Zero, and six distills triggered the 2025 replication wave (Open-R1, TinyZero, SimpleRL, verl/TRL GRPO pipelines) and made GRPO + binary rewards the default open reasoning-RL stack. The market reaction to the $294K RL cost figure (on top of V3's ~$5.6M pretrain) is its own historical footnote.
- **Practical lessons for building a GRPO/RLVR loop**: rule-based rewards only during long RL runs (learned RMs get hacked; here they are quarantined to 400 final steps); watch the clip ratio (they use an unusually large eps and warn both directions); refresh the reference model periodically instead of anchoring to init; group-relative advantage with temp 1.0 rollouts and a single inner epoch; response length is a capability signal but also a cost center (overthinking is a named limitation); a small cold-start SFT trades a little pass@1 for controllability and a better RL starting point.
- **Known limitations** stated by the authors: no tool use, prompt-sensitive (few-shot hurts; use zero-shot), language mixing outside EN/CN, weak gains on SWE tasks (eval too slow for RL), token inefficiency on easy problems. Follow-up analyses (Dr. GRPO, DAPO; see the DeepSeekMath entry) later corrected GRPO's length and difficulty biases.

### Connections

- 2024-02_deepseekmath-grpo: introduced GRPO; R1 is GRPO scaled up with verifiable instead of learned rewards. Read its "Why it matters" for the Dr. GRPO/DAPO fixes to bake into your own loop.
- 2024-12_deepseek-v3: the 671B MoE base model both R1-Zero and R1 start from; its SFT data supplies the 200k non-reasoning samples.
- 2022-03_instructgpt: the SFT-then-RLHF paradigm this paper partially inverts (RL before any reasoning SFT, rules before reward models).
- 2023-05_dpo: the offline alternative for preference alignment; R1's stage 4 shows where online RL with preference RMs still gets used, and its hacking risk.
- 2025-05_qwen3: a descendant reasoning-model family trained with an R1-style long-CoT RL pipeline; Qwen2.5 models are also the distillation students here.
- KB topics: topics/rl (RLVR, GRPO, RL for LLMs), topics/llm-training-and-post-training (post-training pipelines, distillation, reward hacking).
