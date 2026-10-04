# Visualisation ideas: RL for LLMs: RLHF, GRPO, RLVR

What the text needs to be understood: how a single end-of-sequence score becomes per-token credit under each method (the page's spine); why the group statistics bias the update (length, difficulty); why the clip and its successors treat rare tokens differently; how large engine/trainer mismatch actually is; what verifiers get wrong; why pass@k curves cross; why asynchronous RL is faster and what it costs.

Data principle: real where possible. 160 responses sampled for this page from Qwen2.5-0.5B-Instruct on ten GSM8K test problems (16 each, temperature 1, every other processor off, 512-token cap), with per-token log-probabilities under float16-with-cache (MPS), float32 one-pass (CPU), bfloat16 one-pass (MPS) and the base model; three verifiers; a real reward model (Skywork-Reward-V2-Qwen3-0.6B); Monte Carlo prefix values (16 continuations from each of 10 prefixes, scored by verifier and reward model) for two responses; and a 32-response variant with the shipped repetition penalty left on. Scripts in `rollouts/`.

## Ranked ideas (score = teaches more than text, 1 to 5; fidelity of data, 1 to 5)

| # | Idea | Teach | Data | Placement | Status |
|---|---|---|---|---|---|
| 1 | **One real response through RLHF-PPO, GRPO+verifier, Dr. GRPO** (before/after, six steps: response, score, KL, baseline, advantage, loss weight; counters for models in memory, rollouts, networks, distinct advantages; λ toggle) | 5 | 5 (real tokens, real RM, measured values) | Reading section 5 | built |
| 2 | **One group step by step: GRPO, Dr. GRPO, RLOO** (reused from Topic: rl reading_full, now with real groups and lengths) | 5 | 5 | Reading section 3 | built (reused) |
| 3 | **Rare token under four objectives** (PPO clip, clip-higher, CISPO, no clip; 16 minibatch steps; probability on log scale; per-step gradient weight) | 4 | 3 (illustrative toy, exact gradients, checked in Python) | Reading section 7 | built |
| 4 | **Rollout mismatch tab** (histograms of real per-token log-ratios in three set-ups; TIS cap and MIS band sliders; sequence ratio against GSPO's geometric mean) | 4 | 5 | Tab | built |
| 5 | **Verifier gallery** (three checkers on 160 answers, agreement table, real disagreements annotated, documented failures with sources) | 4 | 5 | Tab | built |
| 6 | **Real rollouts tab** (all groups, verdicts, RM score, three advantages, KL to base; RM-against-verifier scatter with AUC and length correlation) | 4 | 5 | Tab | built |
| 7 | **Synchronous against asynchronous** (real lengths, illustrative engine/trainer model; utilisation and staleness counters) | 3 | 3 | Reading section 12 | built |
| 8 | **pass@k crossing** (sharpening against expansion) | 3 | 2 (illustrative, exact) | Reading section 9 | built |
| 9 | k3 against the plain log-ratio on real tokens | 3 | 4 (base model as stand-in reference) | Reading section 3 | built |
| 10 | DAPO overlong penalty slider | 2 | 5 (formula) | Reading section 7 | built (from the old embed) |

## Formulas and sources reproduced
- Worked example of four, clip steps, k3 at 0.5, Dr. GRPO's length and difficulty numbers, RLOO, DAPO clip-higher and overlong, GSPO 3-token example, TIS examples: `recompute.py`, checked against the page engine by `check_engine.mjs` (independently computed, PASS).
- Defaults reproduce the old page's worked numbers and Dr. GRPO's +3.873 / +1.0 by construction (formula); InstructGPT's 1.6% RL share, R1's $294K and 28-fold length growth, SWE-2's 58% and Mercor's 70% from the sources' own numbers.

## Rejected or linked instead
- PPO clipped-against-unclipped over ten epochs on a softmax policy (reading_full section 14): the generic mechanism belongs to Policy gradients and actor-critic; this page's rare-token toy is its LLM-specific successor.
- Policy-gradient baseline widget (reading_full section 13): generic, left for Policy gradients and actor-critic.
- PPO against GRPO on one question animated, six methods trained live, GRPO objective "Then and now": already on DeepSeekMath; linked.
- One batch through PPO, GRPO and DPO with memory: on the training topic's Axis 3; linked.
- Tiny R1-Zero: on the DeepSeek-R1 page; linked.
- The old embed's quiz cards and glossary: not carried as widgets; their content is in the Reading text.
- A learned value network trained on the real rollouts: too small a sample to fit honestly; Monte Carlo prefix values (VinePPO's approach) stand in and are labelled.

## What the methodology lacked here
- Guidance for a "measured instead of learned" stand-in (Monte Carlo values in place of a critic, a base model in place of the SFT reference): we label each stand-in at the point of use and say what it changes (magnitudes, not shapes).
