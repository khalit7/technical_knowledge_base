# RL for LLMs: RLHF, GRPO, RLVR (state as of 2026-08-24)

## Best resources

- Nathan Lambert, *RLHF Book*: https://rlhfbook.com ; the reference text for this whole area, kept current; read the policy-gradient and GRPO chapters before writing any training code.
- "Understanding GRPO: PPO without the critic" (Aayush Garg, HF blog, 2026): https://huggingface.co/blog/garg-aayush/derive-grpo-loss ; step-by-step derivation of the GRPO loss from PPO.
- HF, "Illustrating RLHF": https://huggingface.co/blog/rlhf ; the canonical picture of the PPO-RLHF pipeline.
- verl docs, "Rollout Correction": https://verl.readthedocs.io/en/latest/algo/rollout_corr.html ; the practical guide to training/inference mismatch and importance-sampling fixes; directly relevant to a from-scratch RLVR loop.
- "The 37 Implementation Details of PPO": https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/ ; still where most GRPO bugs are caught.
- Papers: [DeepSeekMath/GRPO](../../papers/2024-02_deepseekmath-grpo/summary.md), [DeepSeek-R1](../../papers/2025-01_deepseek-r1/summary.md), [InstructGPT](../../papers/2022-03_instructgpt/summary.md).

Scope note: the full alignment pipeline (SFT, reward-model training, DPO and its family) lives in
[../llm-training-and-post-training/alignment-and-rlhf.md](../llm-training-and-post-training/alignment-and-rlhf.md);
reward-model exploitation lives in
[../llm-training-and-post-training/reward-hacking.md](../llm-training-and-post-training/reward-hacking.md).
This file covers the RL algorithms themselves.

## LLM generation as an MDP

Autoregressive generation maps cleanly onto the foundations file's vocabulary:
- **State** s_t: the prompt plus tokens generated so far (the "S_t = H_t" choice for a fully
  observable, deterministic environment).
- **Action** a_t: the next token; the action space is the vocabulary (~10^5 discrete actions).
- **Transition**: deterministic; the action is appended to the state.
- **Reward**: usually zero at every token except the last; a single scalar (reward-model score or
  verifier pass/fail) lands at sequence end. Sparse, delayed reward with horizon = generation
  length; gamma is typically 1.
- **Policy**: the LLM itself, pi_theta(token | prefix).

Consequences: the credit-assignment problem is severe (one scalar for thousands of tokens), the
environment model is trivially known (so "model-based" machinery buys nothing), and rollouts are
expensive (inference-time generation dominates wall-clock).

## PPO for RLHF (the InstructGPT recipe)

Four models participate:
1. **Policy** pi_theta: the model being trained (initialised from the SFT model).
2. **Reference model** pi_ref: a frozen copy of the SFT model.
3. **Reward model** RM: frozen, trained beforehand on human preference pairs; scores full responses.
4. **Value model** V_psi: trained alongside the policy (usually initialised from the RM); predicts
   expected reward from each prefix, giving per-token advantages via GAE.

Loop: sample prompts; generate responses from pi_theta; score each with the RM; subtract a
**per-token KL penalty**, r_t = RM_score(at end) - beta * KL(pi_theta || pi_ref), so the reward the
policy sees already contains the penalty; compute advantages with V_psi and GAE; update the policy
with the PPO clipped objective ([deep-rl.md](deep-rl.md)) and the value model with a regression
loss; repeat.

Why the KL penalty: (a) keeps the policy on-distribution for the reward model, which is only
trustworthy near the data it was trained on (anti-reward-hacking); (b) preserves general
capabilities and fluency; (c) acts as the trust region tying the policy to a fixed anchor rather
than merely to last iteration's policy.

Pain points: four large models in memory; the value model is as big as the policy, must be trained
from scratch during RL, and per-token value estimation is hard when the true reward is one scalar
at the end. This is the pain GRPO removes.

## GRPO in detail (DeepSeekMath, 2024)

**Group Relative Policy Optimization** = PPO minus the value model. For each prompt q, sample a
**group** of G responses {o_1..o_G} from the current policy; score each, r_i. The advantage of
every token in response i is the **group-relative advantage**:

A_i = (r_i - mean(r_1..r_G)) / std(r_1..r_G)

i.e. the empirical group mean is the baseline (a Monte Carlo estimate of V(prompt)), and the same
scalar A_i is applied to all tokens of response i. Then apply the familiar clipped objective with
per-token importance ratios, plus an explicit KL term to pi_ref (DeepSeek used the low-variance
"k3" estimator) added to the loss rather than folded into the reward.

What is gained and lost:
- No value model: ~half the memory, no critic warm-up, no per-token value estimation problem.
- The baseline is exactly the REINFORCE-with-baseline idea from [deep-rl.md](deep-rl.md); GRPO is
  closer to a group-baselined REINFORCE with PPO-style clipping than to true PPO.
- Pure Monte Carlo credit assignment: every token in a response is credited equally; no per-token
  shaping. Fine for verifiable tasks, noisier for long-horizon agentic tasks.
- Needs G rollouts per prompt (G ~ 8-64), which shifts cost from memory to inference compute.

## RLVR: verifiable rewards

**RL with Verifiable Rewards** replaces the learned reward model with a programmatic verifier:
exact-match answer checking for math, unit tests for code, format checks, task-success checks for
agents. Reward is typically binary or a small rubric sum. Benefits: no reward-model bias to hack,
no preference-data collection, scales with compute. Limits: only works where a verifier exists;
imperfect verifiers (extractable answers, weak test suites) reintroduce hacking; see
[reward-hacking](../llm-training-and-post-training/reward-hacking.md). Extending RLVR beyond
math/code ("the verifier problem", rubric-based and generative verifiers) is a main 2026 research
front.

## Case study: DeepSeek-R1 and R1-Zero (2025-01)

- **R1-Zero**: GRPO + RLVR (accuracy + format rewards) applied directly to the V3 base model, no
  SFT. Long chain-of-thought, self-verification, and "aha-moment" backtracking **emerged** from RL
  alone; response length grew over training as the model learned to spend more test-time compute.
  Weaknesses: readability, language mixing.
- **R1**: the production pipeline: cold-start SFT on curated CoT, reasoning-focused RL, rejection
  sampling to build a new SFT set, second RL stage for helpfulness/harmlessness. Matched o1-class
  reasoning at open weights, and made GRPO+RLVR the default open recipe through 2025-2026.
- Also demonstrated distillation of R1 traces into small models: cheaper than running RL on them.

## Current debates and refinements (as of Aug 2026)

The GRPO baseline has accumulated well-understood biases and a family of fixes:

- **Dr. GRPO** ("GRPO Done Right", Understanding R1-Zero-Like Training, 2025): GRPO's
  length-normalisation and std-normalisation are biased; dividing by response length rewards long
  wrong answers, and dividing by group std over-weights low-variance (too-easy/too-hard) prompts.
  Fix: drop both terms; reduces length inflation at equal performance.
- **DAPO** (ByteDance, 2025): four practical fixes for long-CoT RL at scale: **clip-higher**
  (asymmetric clipping, larger upward eps to fight entropy collapse), **dynamic sampling** (resample
  away groups whose rewards are all-identical, which give zero gradient), token-level (not
  sample-level) loss averaging, and overlong-response reward shaping. Open recipe, widely adopted.
- **GSPO** (Qwen, 2025): token-level importance ratios are noisy and misalign with the
  sequence-level reward, destabilising long sequences and MoE training. GSPO defines the ratio at
  the **sequence** level (length-normalised sequence likelihood ratio), clips whole sequences; used
  for Qwen3-series RL.
- **Off-policy corrections**: two sources of off-policyness in real systems: (a) minibatch updates
  make later steps off-policy within a batch; (b) **training/inference mismatch**: the vLLM/SGLang
  rollout engine computes slightly different probabilities than the training stack (kernels,
  precision, KV-cache), so data is subtly off-policy by design. Fixes now standard in frameworks
  (verl "rollout correction"): truncated importance sampling (TIS) against the actual rollout
  probabilities, masked/clipped IS (MIS/CISPO-style), or rejection sampling. A 2025 line of work
  ("Group-Relative REINFORCE is Secretly Off-Policy", https://arxiv.org/abs/2509.24203) reframes
  GRPO as off-policy REINFORCE, making these corrections principled rather than patches. For a
  from-scratch loop: log rollout-time logprobs and compare against training-time logprobs; the gap
  is your mismatch diagnostic.
- **Does RLVR teach or elicit?** The sharpening debate: pass@k studies showed early RLVR models
  beat the base at k=1 but not large k (RLVR as distribution sharpening within base-model support,
  the "invisible leash"); "Spurious Rewards" showed random rewards improve Qwen-Math anyway
  (pre-existing behaviours being surfaced, and a warning to always ablate on multiple base
  families). Counter-evidence at ICLR 2026 (CoT-Pass@k: judge the reasoning chain, not just the
  answer) finds genuine reasoning gains beyond the base at all k. Mid-2026 consensus: RLVR
  reliably converts pass@k into pass@1 and improves reasoning validity; whether it creates
  capability outside base-model support remains contested, and prolonged multi-stage RL
  (ProRL-style) is the strongest claim for genuine expansion.
- Other active threads: entropy control as the central stability knob (clip-higher, entropy
  targets); process/turn-level credit assignment for multi-turn agentic RL; replacing the group
  baseline (leave-one-out RLOO, optimal baselines); async/streaming RL infrastructure.

## Checklist for the from-scratch RLVR/GRPO loop

1. Rollout: G samples per prompt (temperature ~1.0), store per-token logprobs from the rollout engine.
2. Reward: verifier score per sample; keep format and correctness rewards separate for logging.
3. Advantage: group-mean baseline; decide explicitly on std-normalisation (Dr. GRPO says no) and
   length-normalisation (token-mean vs sequence-mean; be deliberate).
4. Loss: clipped ratio vs old (rollout) logprobs; consider clip-higher; KL to reference (or drop KL
   entirely, as much RLVR work now does when the reference anchor is not needed).
5. Filter degenerate groups (all-correct/all-wrong) or dynamic-sample past them.
6. Monitor: entropy, response length, KL, clip fraction, reward by difficulty bucket, and the
   rollout-vs-training logprob gap.
