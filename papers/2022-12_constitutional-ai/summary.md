# Constitutional AI: Harmlessness from AI Feedback

- **Authors/lab**: Yuntao Bai, Saurav Kadavath, Sandipan Kundu, Amanda Askell, Jared Kaplan et al. (Anthropic)
- **Date**: December 2022
- **Links**: [arXiv 2212.08073](https://arxiv.org/abs/2212.08073) | [PDF](https://arxiv.org/pdf/2212.08073) | [prompts + principles repo](https://github.com/anthropics/ConstitutionalHarmlessnessPaper)

## Best resources

- [Anthropic research post](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback): the official summary of the paper
- [Claude's Constitution](https://www.anthropic.com/news/claudes-constitution): the production constitution actually used for Claude, showing how the research-era principles evolved (UN Declaration of Human Rights, platform norms, etc.)
- [ConstitutionalHarmlessnessPaper repo](https://github.com/anthropics/ConstitutionalHarmlessnessPaper): the 16 SL principles, 16 RL principles, few-shot prompts, and sample transcripts; the fastest way to see what a "constitution" concretely is

## Problem

RLHF (InstructGPT, Anthropic's own HH work) needs tens of thousands of human preference labels, and those labels encode the objective opaquely: nobody can read the spec out of a pile of comparisons. Worse, when crowdworkers label for harmlessness they reward evasion, so HH-RLHF models learn to stonewall ("I can't answer that") on anything sensitive, creating a direct tension between helpfulness and harmlessness. The paper asks: can a model be trained to be harmless with **zero human harmlessness labels**, using only a short list of natural-language principles (the "constitution") plus AI feedback, and can it be harmless without being evasive? The broader motivation is scaling supervision: as models approach or exceed human level, oversight has to come partly from AI itself.

## Method

Start from a **helpful-only RLHF model** (trained with human helpfulness labels only; it will happily comply with harmful requests). Two phases follow.

**Phase 1, supervised (SL-CAI): critique -> revise -> finetune.**
1. Sample a response to a red-team prompt from the helpful model (typically harmful).
2. Append a **critique request** drawn from the constitution ("identify specific ways in which the assistant's last response is harmful, unethical, racist, sexist, toxic, dangerous, or illegal") and sample a critique.
3. Append a **revision request** and sample a revised response; splice the revision back onto the original prompt.
4. Repeat, randomly sampling a different principle at each step (4 revisions per prompt; 16 principles total; few-shot examples keep the format on rails).
5. Finetune a **pretrained** model on the revisions from all steps, mixed with sampled helpfulness responses to retain helpfulness. One epoch, LR 0.5x pretraining, batch 1024 sequences. Data: ~183k red-team prompts (43k human-written + 140k model-generated), 135k helpfulness prompts.

The first revision removes most harmful content; later revisions help marginally. Critiques matter for small models, but at 52B direct revision (skipping the critique) scores about the same; they keep critiques anyway for transparency. The number of principles does not change harmlessness scores but adds response diversity, which helps RL exploration later. The point of this phase is to get the policy on-distribution so the RL phase needs less exploration.

**Phase 2, RL from AI feedback (RL-CAI, i.e. RLAIF): AI comparisons -> preference model -> RL.**
1. Sample response **pairs** from the SL-CAI model on red-team prompts.
2. Present each pair to an independent **feedback model** (a pretrained LM) as a multiple-choice question with a randomly sampled constitutional principle ("Which of these assistant responses is less harmful? Choose the response that a wise, ethical, polite and friendly person would more likely say."), few-shot prompted.
3. Use the normalized log-probs of options (A)/(B) as **soft preference labels** (well calibrated, per the "LMs (mostly) know what they know" line of work); ensembling over the 16 principles makes the PM notably more robust than reusing one fixed principle.
4. Train a preference model on this AI-labeled harmlessness data (183k comparisons) mixed with **human** helpfulness comparisons (135k); harmlessness labels are 100% AI-generated.
5. Run RL (identical to standard RLHF from here on) against this PM, starting from the SL-CAI policy.

**Chain-of-thought variant**: use the helpful RLHF model as the feedback model and prompt it with "Let's think step-by-step" before it picks the less harmful response. CoT makes the label probabilities collapse toward 0/1 (overconfident), which pushed the policy toward extreme responses; clamping the soft labels to the 40-60% range fixed this and gave the best results.

## Results

- **Pareto improvement over RLHF**: on crowdworker Elo (52B models; ~10.3k helpfulness and ~8.1k harmlessness comparisons), RL-CAI (with and without CoT) is significantly more harmless than both helpful-RLHF and HH-RLHF at comparable helpfulness; Figure 2 shows the constitutional RL frontier sitting above the standard RLHF frontier. CoT trades a little helpfulness for a little more harmlessness.
- **AI labels approach human PMs**: on 438 handwritten HHH comparison questions, multiple-choice identification of the better response improves sharply with scale; with (ensembled) CoT the 52B feedback model approaches preference models trained on hundreds of thousands of human labels, and its log-probs are well calibrated on this eval.
- **Harmless without evasive**: RL-CAI is virtually never evasive; it engages with red-team prompts, explains why the request is harmful, and declines with reasons. HH-RLHF instead drifts toward canned refusals over RL training (its harmlessness Elo declines late in training under this paper's instruction that crowdworkers prefer the non-evasive of two equally harmless responses). On an absolute 0-4 harmfulness score over 64 held-out red-team prompts, helpful-RLHF gets worse during training while SL-CAI and RL-CAI steadily improve.
- **Goodharting exists**: over-trained RL-CAI becomes preachy and boilerplate ("you are valid, valued, and cared for"); mitigations were rewriting principles to discourage over-reactive answers, ensembling principles, and soft/clamped labels.

## Why it matters

- **RLAIF at scale, demonstrated first**: the founding empirical result that AI preference labels can replace human labels for an alignment objective and match or beat human feedback. It made the human-label bottleneck optional for harmlessness and enabled the now-standard pattern of AI-generated preference data feeding PM/DPO pipelines (Google's 2023 RLAIF paper later confirmed parity with RLHF on helpfulness tasks too).
- **Direct lineage into Claude**: CAI is a core component of how production Claude models are trained. The research constitution (16 ad hoc principles) grew into Claude's published constitution drawing on the UN Declaration of Human Rights and curated norms, then into Collective Constitutional AI (2023, publicly sourced principles). The same "explicit, legible behavior spec" idea shows up across the industry: OpenAI's Model Spec, and deliberative alignment training models to reason over the spec explicitly, much like CAI's CoT feedback model.
- **The evasiveness finding changed refusal design**: "harmless but non-evasive, explain your objection" is now the default expectation for frontier assistants, replacing the blanket-refusal behavior early HH-RLHF exhibited.
- **Scalable oversight in practice**: editing one sentence of the constitution replaces relabeling tens of thousands of comparisons, cutting iteration time on the objective itself. The critique-and-revise loop also seeded the self-improvement literature (self-refine, self-rewarding LMs), and the feedback model is an early, carefully calibrated LLM-as-judge.

## Connections

- [InstructGPT](../2022-03_instructgpt/summary.md): the RLHF recipe CAI extends; CAI swaps the human preference labels for AI labels (harmlessness only) and keeps the PM + RL machinery.
- [DPO](../2023-05_dpo/summary.md): later removes the PM/RL machinery entirely; modern pipelines often combine CAI-style AI preference data with DPO-style direct optimization.
- [DeepSeekMath / GRPO](../2024-02_deepseekmath-grpo/summary.md) and [DeepSeek-R1](../2025-01_deepseek-r1/summary.md): the RL-for-LLMs line that CAI's RLAIF stage belongs to; R1 replaces preference rewards with verifiable rewards, the other route around human labels.
- Topics: `topics/llm-training-and-post-training` (alignment, RLHF/RLAIF), `topics/rl` (RL for LLMs), `topics/evaluation-and-llm-judges` (the feedback model as an early LLM judge: calibration, ensembling, CoT overconfidence).
