# Training language models to follow instructions with human feedback (InstructGPT)

⏱ 11 min read · +~4h 55m resources

- **Authors**: Long Ouyang, Jeff Wu, Xu Jiang, Diogo Almeida, Carroll Wainwright, Pamela Mishkin, Chong Zhang, Sandhini Agarwal, Katarina Slama, Alex Ray, John Schulman, Jacob Hilton, Fraser Kelton, Luke Miller, Maddie Simens, Amanda Askell, Peter Welinder, Paul Christiano, Jan Leike, Ryan Lowe (OpenAI Alignment team)
- **Date**: March 2022 (arXiv 2203.02155; NeurIPS 2022)
- **Links**: [arXiv](https://arxiv.org/abs/2203.02155) (~1h 30m, long paper with appendices) | [OpenAI blog](https://openai.com/index/instruction-following/) (~10 min) | [model samples](https://github.com/openai/following-instructions-human-feedback) (repo, ~10 min to skim)

### Best resources

- [Chip Huyen: RLHF, Reinforcement Learning from Human Feedback](https://huyenchip.com/2023/05/02/rlhf.html) (~40 min): the whole pipeline (pretrain, SFT, RM, PPO) with the math, data economics, and practical failure modes; the single best walkthrough of what this paper standardised.
- [Hugging Face: Illustrating RLHF](https://huggingface.co/blog/rlhf) (Lambert, Castricato, von Werra, Havrilla) (~25 min): the canonical diagram-first explanation of the three stages and the KL-penalised reward.
- [Nathan Lambert: RLHF Book](https://rlhfbook.com/) (book, ~2h for the reward-modeling and policy-optimisation chapters): book-length treatment of RLHF and post-training; the chapters on reward modeling and policy optimisation put InstructGPT in the context of everything that came after (DPO, GRPO, RLVR).

### Problem

The language-modeling objective (predict the next token of internet text) is misaligned with what users actually want from a deployed model: "follow my instructions helpfully, honestly, and harmlessly". GPT-3 could do many tasks with careful prompting, but by default it fabricated facts, produced toxic or biased text, ignored instructions, and needed few-shot scaffolding to be useful. Prior RLHF work (Christiano et al. 2017; Ziegler et al. 2019; Stiennon et al. 2020) had applied human preference learning only to narrow tasks like summarisation. This paper applies RLHF to the full, open-ended distribution of instructions real API customers send, and asks whether preference fine-tuning can make models users prefer, without giving up capabilities.

### Method

The now-canonical three-stage pipeline, applied to pretrained GPT-3 at 1.3B, 6B, and 175B parameters.

**Stage 1, SFT.** Hired labelers write demonstrations of ideal behavior on ~13k prompts (mostly real prompts submitted to the OpenAI API Playground, deduplicated, capped at 200 per user, PII-filtered, split by user ID; plus labeler-written prompts to bootstrap: plain tasks, few-shot examples, and prompts matching API waitlist use cases). Fine-tune GPT-3 on these for 16 epochs with cosine decay. Notably, the SFT model overfits validation loss after 1 epoch, but training longer keeps improving both RM score and human preference; final checkpoint selection is by RM score, not loss.

**Stage 2, reward model.** Initialise from the SFT model with the unembedding layer replaced by a scalar head. Labelers rank K = 4 to 9 sampled completions per prompt (~33k prompts), yielding K-choose-2 pairwise comparisons. Loss is pairwise cross-entropy on the reward difference:

```javascript
loss(theta) = -(1 / C(K,2)) * E_(x, y_w, y_l) [ log sigmoid( r_theta(x, y_w) - r_theta(x, y_l) ) ]
```

Key implementation detail: all comparisons from one prompt go into a single batch element. Shuffling them as independent examples makes the RM overfit within one epoch (each completion appears in K-1 gradient updates); batching by prompt fixes this and is also K times cheaper in forward passes. Only 6B RMs are used; 175B RM training was unstable. Rewards are shifted so labeler demonstrations score 0 on average.

**Stage 3, PPO with KL penalty (RLHF proper).** Treat generation as a bandit environment: a prompt is sampled, the policy generates one response, the RM scores it, episode ends. Fine-tune the SFT model with PPO on ~31k prompts, with a per-token KL penalty against the SFT policy to prevent reward-model over-optimisation; the value function is initialised from the RM. The plain version is "PPO". The headline variant, **PPO-ptx**, mixes pretraining gradients into the PPO updates to repair capability regressions:

```javascript
objective(phi) = E_(x,y)~pi_RL [ r_theta(x, y) - beta * log( pi_RL(y|x) / pi_SFT(y|x) ) ] + gamma * E_x~D_pretrain [ log pi_RL(x) ]
```

"InstructGPT" in the paper means the PPO-ptx models. Stages 2 and 3 can be iterated: collect new comparisons on the current policy, retrain the RM, retrain the policy.

**Labeler setup.** About 40 contractors (Upwork and Scale AI), selected by a screening test for sensitivity to harmful content and to the preferences of different demographic groups, with detailed instructions and a shared chat room for edge cases. During training labelers prioritise helpfulness to the user; during final evaluation they prioritise truthfulness and harmlessness. Inter-annotator agreement: 72.6% among training labelers, 77.3% for held-out labelers. Data is over 96% English; use cases are dominated by open-ended generation (46%), open QA (12%), and brainstorming (11%), not classic NLP tasks.

**Alignment tax.** Vanilla PPO regresses on public NLP benchmarks (SQuAD, DROP, HellaSwag, WMT'15 Fr-En) relative to GPT-3. The pretraining-mix trick (PPO-ptx) reverses most of these regressions with minimal loss in preference win rate, and works better than simply raising the KL coefficient, which craters validation reward without fully recovering benchmark performance.

### Results

- **1.3B InstructGPT beats 175B GPT-3** in human preference despite 100x fewer parameters: same architecture, different training data. This is the headline result.
- Head to head, 175B InstructGPT is preferred to 175B GPT-3 85 +/- 3% of the time, and 71 +/- 4% vs few-shot-prompted GPT-3. Ordering across the board: PPO-ptx ~ PPO > SFT > GPT-3 (prompted) > GPT-3.
- **Truthfulness**: about 2x more truthful and informative than GPT-3 on TruthfulQA; hallucination rate on closed-domain API tasks (summarisation, closed QA) drops from 41% to 21%.
- **Toxicity**: ~25% fewer toxic generations than GPT-3 when instructed to be respectful (RealToxicityPrompts); no improvement on bias benchmarks (Winogender, CrowS-Pairs), and when explicitly instructed to be toxic it is worse than GPT-3 (it follows instructions, including bad ones).
- **Beats instruction-tuned baselines**: 175B InstructGPT preferred over FLAN- and T0-fine-tuned 175B GPT-3 78% and 79% of the time; public NLP datasets do not cover the open-ended generation that dominates real usage.
- **Generalisation**: held-out labelers who produced no training data prefer InstructGPT at the same rate as training labelers, so it is not overfitting to 40 people's taste; it also follows instructions in non-English languages and on code QA despite such data being a tiny fraction of the fine-tuning set.
- **Cost**: SFT on 175B took 4.9 petaflops/s-days and PPO-ptx 60, versus 3,640 for GPT-3 pretraining; alignment fine-tuning was more cost-effective than a 100x scale-up for making models useful.
- Failure modes remain: accepting false premises, over-hedging on simple questions (likely the RM rewarding epistemic humility), and degrading under multiple explicit constraints.

### Why it matters

- **This recipe became ChatGPT and the industry standard.** ChatGPT (November 2022) was a sibling model trained with the same method on dialogue data, and SFT -> reward model -> RL became the default post-training pipeline at every lab (GPT-4, Claude, Gemini, Llama). Nearly every "post-training" section of a modern model report is a descendant of Figure 2 of this paper.
- **It reframed alignment as an engineering discipline with a measurable tax.** The paper popularised the practical framing of the "alignment tax" and demonstrated a low-tax procedure (PPO-ptx), arguing that alignment methods must be cheap in capabilities or labs will not adopt them.
- **It made the capability-vs-alignment economics explicit**: for user-facing quality, tens of petaflops/s-days of RLHF beat thousands spent on a 100x larger pretrain. This shifted industry investment toward data and post-training.
- **It surfaced the "who are we aligning to?" question honestly**: the models align to ~40 mostly US/Southeast-Asian contractors, mediated by researcher-written instructions and API-customer prompts, not to "human values" in the abstract. This discussion seeded later work on pluralistic alignment and on RLAIF (Constitutional AI) as a way to reduce dependence on labeler pools.
- **It set the template later work simplifies or extends**: DPO collapses stages 2-3 into one loss; Constitutional AI replaces human preference labels with AI feedback; GRPO drops the value model; RLVR swaps the learned RM for verifiable rewards. All of them define themselves against this pipeline. Its documented pathologies (reward over-optimisation held in check by the KL penalty, sycophantic hedging learned from the RM) became the reward-hacking literature.

### Connections

- GPT-3 (2020-05): the base models and architecture; InstructGPT is GPT-3 plus human-feedback fine-tuning.
- Constitutional AI (2022-12): replaces human harmlessness labels with AI feedback (RLAIF) on top of the same RLHF skeleton.
- DPO (2023-05): collapses the RM + PPO stages of this pipeline into a single classification loss.
- DeepSeekMath / GRPO (2024-02) and DeepSeek-R1 (2025-01): the modern RL-for-reasoning line; GRPO removes the value function this paper initialised from the RM, and RLVR replaces the learned RM with verifiable rewards.
- Llama 3 (2024-07), OLMo 2 (2025-01): open production pipelines built on this SFT + preference-tuning + RL template.
- Topics: llm-training-and-post-training, rl.
