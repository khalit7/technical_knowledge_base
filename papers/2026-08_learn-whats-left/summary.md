# Learn What's Left, Not What's Mastered: Saturation Aware Advantage Reweighting for Multi-Reward Policy Optimization

- **Authors/lab**: Yixuan Wang, Yifei Chen, Haichao Zhang, Haozheng Luo, Xander Wu, Jie Ni, Yun Fu, Nuno Vasconcelos, Yijiang Li (University of Florida, UC San Diego, Northeastern, Northwestern, Stanford, Zillion Network, Universitaet Innsbruck)
- **Date**: August 2026 (arXiv v1, 17 Aug 2026)
- **Links**: [arXiv 2608.16072](https://arxiv.org/abs/2608.16072)

Introduces **SA-MRPO** (Saturation Aware Advantage Reweighting for Multi-Reward Policy Optimization): a drop-in change to how the advantage is built in GRPO-style RLVR when there are multiple reward objectives (correctness plus length, format, executability, ...). Each objective is normalized independently and then down-weighted by how close its batch-mean reward already is to its ceiling, so gradient budget flows to the objectives with remaining headroom instead of the ones already solved. Strictly generalizes both GRPO and GDPO.

## Best resources

Skipped: the preprint is a week old and no good external explanations exist yet; the paper itself (14 pages) is the reference.

## Problem

Reasoning RLVR is rarely single-objective in practice: a response must be correct, but also respect length budgets, format constraints, safety, or executability. The standard recipe scalarizes: r_sum = sum_k w_k * r_k with fixed weights, then computes the usual group-standardized GRPO advantage on the scalar. Two failure modes:

1. **Scalarization loses reward resolution.** Distinct reward profiles can collapse to the same scalar (with equal weights, (1, 0) and (0, 1) are indistinguishable) and therefore receive the same advantage. A rollout with perfect format and zero correctness can be reinforced as strongly as the reverse.
2. **Fixed weights ignore objective saturation.** Each objective keeps its relative weight all through training regardless of how close it is to its ceiling. Easy auxiliary objectives (format, length compliance) saturate early, yet keep drawing the same share of the update, so training keeps polishing what is already solved while correctness, the hard objective, still has most of its headroom left.

GDPO (group reward-decoupled normalization) fixes problem 1 by normalizing each reward dimension per group before summing, but not problem 2: the fixed weights persist after decoupling. Concurrent methods (DVAO, GD2PO, SAW, Focal Reward) adapt weights by reward variance or advantage agreement, but none tie the allocation directly to remaining attainable reward range.

## Method

Setup: B queries per batch, G >= 2 rollouts per query from the frozen behavior policy, n bounded verifiable reward objectives with known attainable bounds [r_min^(k), r_max^(k)] and prescribed weights w_k.

**Per-objective group advantage** (the GDPO part). For each objective k and query i, standardize within the rollout group:

A_k^(i,j) = (r_k^(i,j) - mu_k^(i)) / sigma_k^(i)

with mu, sigma the group mean and std of objective k's rewards over the G rollouts. This keeps the per-objective resolution that scalarization destroys.

**Saturation ratio** (the new part). Per batch, measure how much of each objective's attainable range is already realized:

s^(k) = (rbar^(k) - r_min^(k)) / (r_max^(k) - r_min^(k)) in [0, 1]

where rbar^(k) is the batch-mean reward of objective k over all B x G rollouts. No estimation needed: with rule-based bounded rewards the bounds are prescribed by the reward function itself.

**Saturation-aware aggregation.** With saturation exponent gamma >= 0:

wtilde_k = w_k * (1 - s^(k))^gamma
Atilde^(i,j) = sum_k wtilde_k * A_k^(i,j)

then re-standardize Atilde over the whole batch (mean/std over all i, j) to keep the advantage scale stable as saturations drift during training. That final A_SA plugs into the completely standard clipped GRPO surrogate; nothing else about the policy update changes. Wall-clock overhead is a few batch means, essentially zero.

Key properties:

- **Special cases**: gamma = 0 recovers GDPO exactly; single objective further reduces to GRPO. So SA-MRPO strictly generalizes both.
- **gamma is the single knob**: for two objectives a, b, the effective ratio wtilde_a/wtilde_b = (w_a/w_b) * ((1-s^(a))/(1-s^(b)))^gamma, strictly decreasing in gamma when a is more saturated. Larger gamma pushes allocation harder toward the objective with more headroom.
- **Sign reversal, not just rescaling**: reweighting can flip the sign of a rollout's aggregate advantage. In the paper's Figure 1 example (saturated format, unsaturated correctness), a rollout with perfect format but zero correctness gets a positive advantage under GDPO and a negative one under SA-MRPO.
- **Honest caveats, stated by the authors**: (a) no monotonic-retention guarantee; the first-order analysis (their Eq. 2) gives the exact local condition under which conflicting gradients from an unsaturated objective can degrade an already-optimized one, since the reweighting deliberately shrinks the saturated objective's self-protection term. It is an adaptive allocation rule, not a constrained Pareto method. (b) 1 - s^(k) is nominal reward headroom, not achievable headroom; model capacity may make part of the remaining range unreachable.

## Results

Setup: verl + vLLM, G = 8, batch 256, 3 epochs, max response 4096 tokens; math and adaptive reasoning on DeepScaleR-Preview (~40K competition problems); pass@1 averaged over 16 samples at temperature 0.6. Baseline is GDPO with identical data, rewards, and hyperparameters; only the advantage construction differs.

- **Math reasoning** (Qwen2.5-3B/7B-Instruct; correctness + binary length reward, optionally + format): SA-MRPO beats GDPO on accuracy in 12 of 15 benchmark comparisons, up to +5.0 points on AIME24 (7B, three objectives: 11.5 -> 16.5) and +3.5 on MATH500, while the EXCEED rate (length-budget violations) stays essentially unchanged. Improving the hard objective did not require abandoning the easy one.
- **Adaptive reasoning** (DeepSeek-R1-Distill-Qwen-7B; correctness + graded length reward that explicitly saturates below 1024 tokens): SA-MRPO beats GDPO on all five benchmarks, +3.8 average accuracy, up to +9.2 on AMC23 (28.3 -> 37.5). Responses get moderately longer (333 -> 459 tokens on average) but stay under the saturation threshold: exactly the intended behavior of spending reward that is free under the length objective on correctness.
- **Code generation** (Qwen2.5-7B-Instruct on Eurus-2-RL; test-case pass rate + executability): higher pass rate on 3 of 4 benchmarks (up to +2.3 on Codeforces), comparable bug rates. Executability (the easy objective) is preserved while the harder pass-rate objective improves.
- **Gamma ablation** (correctness + length, Qwen2.5-3B/7B): every gamma > 0 beats gamma = 0 (GDPO) on average accuracy; gamma = 0.5 is the sweet spot; larger gamma keeps accuracy competitive but starts eroding the saturated length objective (EXCEED creeps up). Training curves show the tradeoff moving monotonically with gamma, confirming the knob does what the formula says.

## Why it matters

- Directly relevant if you are building a GRPO/RLVR loop with more than one reward term, which is nearly always the case once format or length shaping enters. The standard "weighted sum, then standardize" recipe silently wastes gradient budget on saturated auxiliary objectives; this paper shows the fix is about 10 lines: per-objective group standardization, one batch-mean saturation ratio per objective, multiply weights by (1 - s)^gamma, re-standardize over the batch.
- Practical defaults from the paper: gamma = 0.5 with rule-based bounded rewards; needs known reward bounds per objective (trivial for 0/1 or fraction-type rewards, ill-defined for unbounded learned RM scores, so this is an RLVR technique, not a general RLHF one).
- The two identified failure modes (reward-resolution loss under scalarization; fixed weights ignoring saturation) are useful diagnostics even if you adopt none of the method: if your format reward is at 0.99 and correctness is flat, your effective correctness learning rate is being taxed.
- Fits the 2026 trend of treating multi-reward aggregation as a first-class design axis in reasoning RL (GDPO, DVAO, GD2PO, SAW, Focal Reward, multi-task GRPO), with the cleanest formulation so far: allocation driven by remaining attainable reward range rather than variance or gradient agreement.

## Connections

- [2024-02_deepseekmath-grpo](../2024-02_deepseekmath-grpo/): the underlying policy update; SA-MRPO changes only the advantage construction and keeps the clipped GRPO surrogate.
- [2025-01_deepseek-r1](../2025-01_deepseek-r1/): the RLVR regime (rule-based verifiable rewards) this method assumes; R1-style recipes with format + correctness rewards are exactly the saturation scenario in Figure 1.
- GDPO ([arXiv 2601.05242](https://arxiv.org/abs/2601.05242)): the reward-decoupled baseline SA-MRPO generalizes (its gamma = 0 case).
- DVAO ([arXiv 2605.25604](https://arxiv.org/abs/2605.25604)) and GD2PO ([arXiv 2606.16771](https://arxiv.org/abs/2606.16771)): concurrent multi-reward GRPO variants driven by reward variance and advantage conflict rather than saturation.
- KB topics: [topics/rl](../../topics/rl/) (RL for LLMs, RLVR, GRPO), [topics/llm-training-and-post-training](../../topics/llm-training-and-post-training/) (alignment, reward shaping).
