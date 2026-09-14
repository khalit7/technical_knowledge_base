# Direct Preference Optimization: Your Language Model is Secretly a Reward Model

⏱ 9 min read · +~2h 30m resources

- **Authors**: Rafael Rafailov, Archit Sharma, Eric Mitchell, Stefano Ermon, Christopher D. Manning, Chelsea Finn (Stanford, CZ Biohub)
- **Date**: May 2023 (arXiv 2305.18290; NeurIPS 2023, Outstanding Paper Runner-Up)
- **Links**: [arXiv](https://arxiv.org/abs/2305.18290) (~45 min) | [reference implementation](https://github.com/eric-mitchell/direct-preference-optimization) (repo, ~20 min for the README and the loss in trainers.py)

## Best resources

- [Cameron Wolfe: Direct Preference Optimization](https://cameronrwolfe.substack.com/p/direct-preference-optimization) (~40 min): full derivation walked through step by step, plus where DPO sits in the modern post-training pipeline and TRL code.
- [HF TRL DPOTrainer docs](https://huggingface.co/docs/trl/dpo_trainer) (docs, ~25 min for the core pages): the production implementation, expected dataset format, logged implicit-reward metrics, and a catalogue of the loss variants (IPO, SimPO-style normalisation, robust DPO, etc.) that TRL exposes as `loss_type`.
- [Nathan Lambert: Do we need RL for RLHF?](https://www.interconnects.ai/p/the-dpo-debate) (~20 min): the DPO-vs-PPO debate laid out with the evidence on both sides.
- [Official repo](https://github.com/eric-mitchell/direct-preference-optimization) (the same repo as the Links line): the ~20-line loss in `trainers.py` is worth reading once; the whole method fits in it.

## Problem

RLHF as practised in 2023 (InstructGPT-style) was a three-stage pipeline: SFT, fit a reward model r(x, y) on pairwise human preferences via Bradley-Terry maximum likelihood, then run PPO to maximise the learned reward under a KL penalty against the reference policy. The RL stage is the painful part: it trains and serves multiple models (policy, reference, reward, value), samples from the policy in the training loop, and is notoriously unstable and hyperparameter-sensitive. The paper asks whether the RL stage is necessary at all, and shows it is not: the exact same KL-constrained objective can be optimised with a single binary cross-entropy loss on the preference pairs, with no reward model, no sampling, and no RL.

## Method

The key move is a change of variables from reward functions to policies.

**1. Closed-form optimal policy.** The RLHF objective is max_pi E[r(x, y)] - beta * KL(pi || pi_ref). For any reward r this has a known analytical solution (standard result from KL-regularised control):

```
pi_r(y | x) = (1 / Z(x)) * pi_ref(y | x) * exp(r(x, y) / beta)
```

where Z(x) is the partition function summing pi_ref(y | x) exp(r(x, y) / beta) over all y. This is exact but useless directly, since Z(x) is intractable.

**2. Reparameterise the reward in terms of the policy.** Take logs and rearrange:

```
r(x, y) = beta * log(pi_r(y | x) / pi_ref(y | x)) + beta * log Z(x)
```

So every reward function can be written as a scaled policy/reference log-ratio plus a per-prompt constant. Section 5 makes this rigorous: rewards that differ only by a function of x form equivalence classes, all rewards in a class induce the same preference distribution (Bradley-Terry is invariant to per-prompt shifts) and the same optimal policy, and every class contains exactly one member of the form beta * log(pi(y|x) / pi_ref(y|x)). Nothing is lost by restricting to this parameterisation.

**3. Substitute into Bradley-Terry.** BT models p(y_w > y_l | x) = sigmoid(r(x, y_w) - r(x, y_l)). The difference of rewards cancels the log Z(x) term, so the preference probability depends only on the policy and the reference. Plugging the reparameterised reward into the standard reward-model MLE loss gives the DPO objective:

```
L_DPO = -E_(x, y_w, y_l) [ log sigmoid( beta * log(pi_theta(y_w|x) / pi_ref(y_w|x)) - beta * log(pi_theta(y_l|x) / pi_ref(y_l|x)) ) ]
```

This is logistic regression on the difference of policy/reference log-ratios: four forward passes per pair (policy and frozen reference on chosen and rejected), one backward, no sampling.

**4. Implicit reward.** The quantity r_hat(x, y) = beta * log(pi_theta(y|x) / pi_ref(y|x)) is a fully valid reward model; DPO is exactly reward-model fitting under this parameterisation, and the trained LM doubles as the reward model (hence the title). TRL logs these as `rewards/chosen`, `rewards/rejected`, `rewards/margins`.

**5. Gradient intuition.** The gradient is

```
-beta * E[ sigmoid(r_hat(x, y_l) - r_hat(x, y_w)) * ( grad log pi(y_w|x) - grad log pi(y_l|x) ) ]
```

i.e. push up the chosen completion, push down the rejected one, weighted per example by how badly the implicit reward currently misorders the pair. Pairs the model already gets right contribute little; confidently wrong pairs dominate. The paper shows this weighting is essential: a naive unweighted probability-ratio objective degenerates.

**Practical recipe**: pi_ref = the SFT model (or, lacking one, an MLE fit to the chosen completions to reduce distribution shift); beta ~ 0.1-0.5; preference pairs ideally sampled from pi_ref. The derivation also goes through for Plackett-Luce rankings of more than two completions.

## Results

Experiments on GPT-2-large / GPT-J / Pythia-2.8B scale, GPT-4 as judge (validated against humans, who agree with GPT-4 about as often as with each other):

- **IMDb sentiment (ground-truth reward available)**: DPO gives the best reward-vs-KL frontier of all methods, strictly dominating PPO and even PPO-GT trained on the ground-truth reward. Same objective, better optimiser in practice.
- **TL;DR summarisation**: ~61% win rate vs reference summaries at temperature 0, beating PPO's best (57%) and Best-of-128; far more robust to sampling temperature than PPO, which collapses at high temperature.
- **Anthropic-HH dialogue**: the only computationally efficient method that beats the dataset's chosen completions, roughly matching Best-of-128.
- **OOD generalisation (CNN/DailyMail)**: TL;DR-trained DPO still beats TL;DR-trained PPO (0.36 vs 0.26 win rate), initial evidence the policy generalises without the extra unlabeled prompts PPO consumes.
- All of this with essentially no hyperparameter tuning beyond beta.

## Why it matters

- **It commoditised preference tuning.** DPO reduced RLHF from a multi-model RL system to a fine-tuning loss anyone can run on preference pairs. Zephyr-7B (late 2023) proved it at 7B on UltraFeedback, and it became the standard alignment stage in open post-training pipelines: Mixtral-Instruct, Llama 3, Tulu, OLMo 2, Qwen, and many others ship DPO stages.
- **The DPO-vs-PPO debate.** Follow-up work ("Is DPO Superior to PPO for LLM Alignment?", 2024; DeepMind's online-vs-offline gap analysis) found on-policy RL wins on hard tasks and that DPO's offline, off-policy nature (it can hit distributions the preference data never covered, and tends to drive both chosen and rejected likelihoods down) is a real weakness. The rough consensus as of 2026: DPO is the cheap, stable choice for general preference/style alignment; online RL (PPO, and above all GRPO/RLVR with verifiable rewards, per DeepSeek-R1) wins for reasoning and frontier-scale post-training. Iterative/online DPO variants close part of the gap. Labs commonly run both: a DPO stage then RLVR, as in OLMo 2 and Tulu 3.
- **It spawned a family.** IPO (fixes overfitting of the sigmoid loss with an identity transform), KTO (unpaired thumbs-up/down data), ORPO (folds preference into SFT, no reference model), SimPO (reference-free, length-normalised), CPO, rDPO, TR-DPO, and DiscoPOP-style automated loss search all live in the design space this paper opened. GRPO's group-relative advantage is a separate line but shares the motivation of deleting RLHF machinery (there, the value model).
- **Conceptually**, the equivalence "policy log-ratio = reward" gave the field a reusable tool: implicit rewards from DPO models are used for data filtering and reward-model distillation, and the derivation pattern (solve the KL-regularised objective in closed form, substitute back) recurs across post-training papers.

## Connections

- [InstructGPT (2022-03)](../2022-03_instructgpt/): the three-stage RLHF pipeline DPO collapses into one loss.
- [Constitutional AI (2022-12)](../2022-12_constitutional-ai/): RLAIF preference data; DPO consumes such pairs directly.
- [DeepSeekMath / GRPO (2024-02)](../2024-02_deepseekmath-grpo/): the online-RL counterpoint that now dominates reasoning post-training.
- [DeepSeek-R1 (2025-01)](../2025-01_deepseek-r1/): RLVR at scale, the other pole of the DPO-vs-online-RL debate.
- [Llama 3 (2024-07)](../2024-07_llama-3/) and [OLMo 2 (2025-01)](../2025-01_olmo-2/): production pipelines with DPO stages.
- Topics: [llm-training-and-post-training](../../topics/llm-training-and-post-training/), [rl](../../topics/rl/).
