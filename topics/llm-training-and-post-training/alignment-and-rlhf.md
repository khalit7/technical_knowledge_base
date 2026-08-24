# Alignment: SFT, RLHF, DPO Family, RLVR

## Best resources

- [RLHF Book (Nathan Lambert)](https://rlhfbook.com/): free, continuously updated, the best end-to-end treatment of modern post-training.
- [GRPO, DPO and RLVR explained: reasoning RL in 2026 (Turing Post)](https://www.turingpost.com/p/reasoning-rl-in-2026): current map of the algorithm zoo.
- [HF TRL docs](https://huggingface.co/docs/trl): reference implementations of SFT, DPO, KTO, ORPO, PPO, GRPO, online DPO.
- Papers: [InstructGPT](../../papers/2022-03_instructgpt/summary.md), [DPO](../../papers/2023-05_dpo/summary.md), [DeepSeekMath/GRPO](../../papers/2024-02_deepseekmath-grpo/summary.md), [Constitutional AI](../../papers/2022-12_constitutional-ai/summary.md), plus DeepSeek-R1 (`papers/2025-01_deepseek-r1`).

## The pipeline

1. **Pretraining**: next-token prediction; produces a base model.
2. **SFT / instruction tuning**: train on (prompt, response) pairs with the LM loss
   on the response tokens, so the model answers instead of continuing text. Sets
   format, persona, and chat template; quality beats quantity (curated + synthetic
   data; Tulu 3 is the open reference recipe).
3. **Reward model (RM) training** (skipped by direct methods): humans rank 2+
   sampled responses per prompt; train a model (usually the SFT model with a scalar
   head) on the Bradley-Terry objective, maximising sigma(r_chosen - r_rejected),
   so it predicts a scalar "how much would a human like this". The RM lets
   optimisation continue offline without a human in the loop.
4. **Policy optimisation**: use the RM (or checkable rewards) to update the LLM.

## RL-based methods

- **RLHF with PPO** ([InstructGPT](../../papers/2022-03_instructgpt/summary.md);
  GPT-4, Llama 2): actor-critic policy gradient. Four models in memory: policy,
  reference (frozen, for the per-token KL penalty that keeps the policy close to
  the SFT model), reward model, and a learned **value/critic** model estimating
  expected return per state. PPO's clipped ratio objective bounds each policy
  update for stability. Powerful, notoriously fiddly and memory-hungry.
- **GRPO** ([DeepSeekMath](../../papers/2024-02_deepseekmath-grpo/summary.md)):
  drops the critic. Sample a **group** of G responses per prompt; advantage of
  each = (its reward - group mean) / group std. Group-relative baselines replace
  value estimation; otherwise PPO-style clipping + KL. The 2026 workhorse for
  reasoning RL. Known biases (length, std normalisation) spawned fixes:
  Dr. GRPO, DAPO (clip-higher, dynamic sampling, token-level loss), GSPO
  (sequence-level ratios, Qwen3), CISPO.
- **RLAIF**: same pipelines, but preference labels come from a strong AI judge
  instead of humans; scales far better and is now the norm for most labels.
- **Constitutional AI** ([paper](../../papers/2022-12_constitutional-ai/summary.md),
  Anthropic): a structured RLAIF. SL phase: model critiques and revises its own
  outputs against a written constitution, then trains on the revisions. RL phase:
  AI-generated preference labels judged against the constitution.

## Direct preference optimisation (no RM, no RL loop)

- **DPO** ([paper](../../papers/2023-05_dpo/summary.md)): the KL-constrained RLHF
  objective has a closed form; the implied reward is beta * log(pi/pi_ref).
  Substituting into Bradley-Terry gives a simple contrastive loss on (chosen,
  rejected) pairs: push up the chosen response's likelihood relative to the
  reference, push down the rejected. One model + frozen reference; stable, cheap.
- **IPO**: fixes DPO's tendency to overfit deterministic preferences (bounded loss).
- **KTO**: prospect-theory-inspired; needs only **unpaired** good/bad labels
  (thumbs up/down), not pairs; useful when preference pairs are unavailable.
- **ORPO**: reference-model-free; adds an odds-ratio penalty to the SFT loss so
  alignment happens during SFT in one stage.
- **SimPO**: reference-free, length-normalised average log-prob as implicit reward.
- Practice note: DPO-family results are sensitive to data quality and the
  chosen/rejected gap; iterative/online DPO (regenerate pairs from the current
  policy, judge, retrain) recovers much of the gap to PPO.

## Online vs offline

Offline (vanilla DPO on a fixed dataset) optimises preferences on stale,
off-policy data; online methods (PPO, GRPO, online/iterative DPO) sample from the
current policy and are consistently stronger at equal data budgets, at higher
compute and complexity cost. Current consensus: **DPO-family for cheap broad
preference shaping, online RL (GRPO/PPO variants) where it matters** (reasoning,
agentic behaviour, final alignment polish). Llama 3 used SFT + rejection sampling
+ DPO; frontier reasoning models all use large-scale online RL.

## RLVR: RL with verifiable rewards

RL only needs *some* reward source. When the reward is **checkable** (unit tests,
math answer checkers, compilers, rule-based format checks) you bypass learned RMs
and their hackability. Lineage: AlphaCode-style execution feedback; DeepSeek-R1-Zero
(pure RLVR on a base model, emergent long CoT), then DeepSeek-R1 (SFT cold start +
large-scale RLVR). Now standard for math/code/agentic training (OLMo 3 RL-Zero,
Qwen3, Tulu 3 RLVR). Open problems: whether RLVR elicits existing capabilities vs
teaches new ones (pass@k debates), reward design for unverifiable domains (LLM
judges, rubric rewards), multi-turn/agentic credit assignment, and entropy collapse
in long runs. Infrastructure: verl, OpenRLHF, TRL, SkyRL, NeMo-RL; rollouts served
by vLLM/SGLang with weight sync to the trainer.

See also [reward-hacking.md](reward-hacking.md) for the failure mode this whole
section orbits, and `topics/rl` for the underlying RL theory.
