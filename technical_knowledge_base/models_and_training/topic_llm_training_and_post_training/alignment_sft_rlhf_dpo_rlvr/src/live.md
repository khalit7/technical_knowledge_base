Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81d5bed7e608d4061c7a as of 2026-09-22T02:15:25.884Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81d5bed7e608d4061c7a">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b" title="Topic: llm-training-and-post-training"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Alignment: SFT, RLHF, DPO Family, RLVR"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 6 min read · +7h 25m resources
## Best resources
- [RLHF Book (Nathan Lambert)](https://rlhfbook.com/) (\~6h): free, continuously updated, the best end-to-end treatment of modern post-training.
- [GRPO, DPO and RLVR explained: reasoning RL in 2026 (Turing Post)](https://www.turingpost.com/p/reasoning-rl-in-2026) (\~25 min): current map of the algorithm zoo.
- [HF TRL docs](https://huggingface.co/docs/trl) (docs, \~1h for the core pages): reference implementations of SFT, DPO, KTO, ORPO, PPO, GRPO, online DPO.
- Papers: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b958d8299996a063"/>, <mention-page url="https://app.notion.com/p/3c65c17b0d0d818bb1d8cafd30e20f9e"/>, <mention-page url="https://app.notion.com/p/3c65c17b0d0d817f9fc5cb9a9fbcbee5"/>, <mention-page url="https://app.notion.com/p/3c65c17b0d0d815a9b31e9443961c700"/>, and <mention-page url="https://app.notion.com/p/3c65c17b0d0d813faca4f7a51eaa0c65"/>.
## The pipeline
1. **Pretraining**: next-token prediction; produces a base model.
2. **SFT / instruction tuning**: train on (prompt, response) pairs with the LM loss
	on the response tokens, so the model answers instead of continuing text. Sets
	format, persona, and chat template; quality beats quantity (curated + synthetic
	data; Tulu 3 is the open reference recipe). NeoHorse-1 is the production-traffic
	variant of this step rather than an offline curation pass: a router over a
	heterogeneous model pool predicts each request's capability demand, those predictions
	order a three-stage supervised curriculum, and served interactions become training
	examples after structural validation and subscene-level labelling, finer than
	per-conversation labelling, which is what makes supervising a partial trajectory work.
3. **Reward model (RM) training** (skipped by direct methods): humans rank 2+
	sampled responses per prompt; train a model (usually the SFT model with a scalar
	head) on the Bradley-Terry objective, maximising sigma(r_chosen - r_rejected),
	so it predicts a scalar "how much would a human like this". The RM lets
	optimisation continue offline without a human in the loop.
4. **Policy optimisation**: use the RM (or checkable rewards) to update the LLM.
## RL-based methods
- **RLHF with PPO** (InstructGPT; GPT-4, Llama 2): actor-critic policy gradient with
	four models in memory: policy, frozen reference (for the per-token KL penalty that
	keeps the policy close to the SFT model), reward model, and a learned **value/critic**
	estimating expected return per state. The clipped ratio objective bounds each update.
	Powerful, notoriously fiddly and memory-hungry; mechanics in <mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>.
- **GRPO** (DeepSeekMath): drops the critic. Sample a **group** of G responses per
	prompt; advantage of each = (its reward - group mean) / group std, so group-relative
	baselines replace value estimation; otherwise PPO-style clipping + KL. The 2026
	workhorse for reasoning RL. Its known length and std-normalisation biases spawned
	Dr. GRPO, DAPO, GSPO and CISPO, all detailed in <mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>.
- **RLAIF**: same pipelines, but preference labels come from a strong AI judge
	instead of humans; scales far better and is now the norm for most labels.
- **Constitutional AI** (paper,
	Anthropic): a structured RLAIF. SL phase: model critiques and revises its own
	outputs against a written constitution, then trains on the revisions. RL phase:
	AI-generated preference labels judged against the constitution.
## Direct preference optimisation (no RM, no RL loop)
- **DPO** (<mention-page url="https://app.notion.com/p/3c65c17b0d0d818bb1d8cafd30e20f9e"/>): the KL-constrained RLHF
	objective has a closed form; the implied reward is beta \* log(pi/pi_ref).
	Substituting into Bradley-Terry gives a simple contrastive loss on (chosen,
	rejected) pairs: push up the chosen response's likelihood relative to the
	reference, push down the rejected. One model + frozen reference; stable, cheap.
- **IPO**: fixes DPO's tendency to overfit deterministic preferences (bounded loss).
- **KTO**: prospect-theory-inspired; needs only **unpaired** good/bad labels
	(thumbs up/down), not pairs; useful when preference pairs are unavailable.
- **ORPO**: reference-model-free; adds an odds-ratio penalty to the SFT loss so
	alignment happens during SFT in one stage.
- **SimPO**: reference-free, length-normalised average log-prob as implicit reward.
- **PLC-DPO**: posterior label correction for noisy preference optimisation (KAIST AI). It
	works on the input rather than the objective, inferring and correcting mislabelled
	pairs, which is the failure mode the practice note below names.
- Practice note: DPO-family results are sensitive to data quality and the
	chosen/rejected gap; iterative/online DPO (regenerate pairs from the current
	policy, judge, retrain) recovers much of the gap to PPO.
## Online vs offline
Offline (vanilla DPO on a fixed dataset) optimises preferences on stale, off-policy
data; online methods (PPO, GRPO, online/iterative DPO) sample from the current policy
and are consistently stronger at equal data budgets, at higher compute and complexity
cost. Consensus: DPO-family for cheap broad preference shaping, online RL (GRPO/PPO
variants) where it matters (reasoning, agentic behaviour, final alignment polish).
Llama 3 used SFT, rejection sampling and DPO; frontier reasoning models all use
large-scale online RL.
## RLVR: RL with verifiable rewards
RL only needs *some* reward source. When the reward is **checkable** (unit tests, math
answer checkers, compilers, rule-based format checks) you bypass learned RMs and their
hackability. Lineage: AlphaCode-style execution feedback; DeepSeek-R1-Zero
(pure RLVR on a base model, emergent long CoT), then DeepSeek-R1 (SFT cold start +
large-scale RLVR). Now standard for math/code/agentic training (OLMo 3 RL-Zero,
Qwen3, Tulu 3 RLVR). Open problems: whether RLVR elicits existing capabilities vs
teaches new ones (pass@k debates), reward design for unverifiable domains (LLM
judges, rubric rewards), multi-turn/agentic credit assignment, and entropy collapse
in long runs. Infrastructure: verl, OpenRLHF, TRL, SkyRL, NeMo-RL; rollouts served
by vLLM/SGLang with weight sync to the trainer.
See also <mention-page url="https://app.notion.com/p/3c65c17b0d0d8196a6f1f29a817aa974"/> for the failure mode this whole
section orbits, and <mention-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e"/> for the underlying RL theory.
</content>
</page>
