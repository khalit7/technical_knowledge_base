# Reasoning models and test-time compute

⏱ 16 min read · +4h 15m resources

Last updated: 2026-08-31. Rewritten on 2026-08-31 under the "explain, do not name-drop" convention: the training methods and control mechanisms named here are now explained rather than listed. Originally seeded from Khalid's own prep notes on 2026-08-24; nothing from that version was dropped.

## Best resources

- [DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948) (~1h) and this repo's summary: the openly documented recipe for RL-induced reasoning.
- [OpenAI: Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) (15 min): the o1 announcement that defined the category, and the source of the original test-time scaling curve.
- [Sasha Rush: Speculations on Test-Time Scaling](https://www.youtube.com/watch?v=6PEJ96k1kiw) (video, ~40 min): best technical lecture on the test-time compute design space.
- [Nathan Lambert: reasoning coverage on Interconnects](https://www.interconnects.ai/) (ongoing blog, ~30 min for the RLVR posts): running analysis of RLVR and reasoning-model training.
- [Anthropic: extended thinking docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) (docs, ~20 min): the reference for budgeted and interleaved thinking APIs.
- [Survey: Adaptive and Controllable Test-Time Compute](https://arxiv.org/abs/2507.02076) (1h 30m): taxonomy of budget-control methods.

## Core idea

A reasoning model produces a long chain of thought (CoT) before its answer, and is *trained* to use that chain well: typically large-scale reinforcement learning on tasks whose answers can be checked mechanically (mathematics with a reference answer, code with unit tests), so the model learns to plan, verify, backtrack and self-correct rather than to emit a plausible-looking derivation. This converts inference tokens into accuracy, which is why test-time compute is described as a second scaling axis alongside pretraining compute.

### What test-time compute actually buys

Worth being precise about, because the phrase is used loosely. A transformer forward pass has fixed depth, so the amount of serial computation available to produce one next-token distribution is bounded by the layer count and cannot be increased at inference. Generating a chain of thought removes that bound: each emitted token is another full forward pass conditioned on everything written so far, so the number of serial steps becomes unbounded and the context window acts as an external working memory that persists across them. That is the whole mechanism. Three concrete capabilities follow from it: decomposition (a problem needing more serial steps than the model has layers becomes reachable), externalised state (intermediate results are written down instead of held in activations that are discarded at every token), and revision (the model can read what it wrote, notice a contradiction, and start again, which no single forward pass can do).

What it does not buy is equally important. It adds no knowledge that is not in the weights or retrievable by a tool. It does not make a problem solvable if the model cannot make any correct partial progress on it, since there is nothing for later steps to build on. And the returns are shaped badly for economics: accuracy against thinking tokens is roughly logarithmic over a useful range and then flattens, while cost and latency are strictly linear in tokens.

### Two ways to spend it

- **Sequential**: one longer trajectory, with self-correction and revision inside it (the o1 and R1 pattern). Later steps see earlier ones, which is what makes backtracking possible. This is the axis that RL training scales. The costs are that latency is irreducible (the tokens are generated in order and cannot be parallelised), the KV cache grows linearly with the trajectory, and attention over an ever-longer scratchpad gets more expensive per token.
- **Parallel**: sample many independent solutions and select one. Wall-clock time need not grow if you have the hardware, but total tokens scale with the sample count, and the whole approach lives or dies on the selector. Majority voting (self-consistency) needs answers in a canonical comparable form, so it works for mathematics and fails for open-ended output. Best-of-n against a learned reward model gains less than it appears to as n grows, because a larger sample is also a larger search for the reward model's errors. Best-of-n against a real verifier (unit tests, a proof checker) does not have that failure and is the strongest form. Multi-agent tiers such as Grok 4 Heavy and Gemini Deep Think are this pattern with aggregation between the parallel trajectories rather than a single final vote.

The two compose, and frontier "heavy" tiers are usually parallel sampling of already-long sequential traces, which is why they cost an order of magnitude more than the standard tier for a few points of benchmark score.

## Training: supervised traces versus RL on verifiable rewards

The category's defining question is how a model learns to use a scratchpad well. There are two answers and current practice uses both.

**Supervised fine-tuning on reasoning traces.** Collect problems, generate or obtain long chains of thought, keep the ones whose final answers are correct (rejection sampling, the STaR idea), and train on them as ordinary next-token prediction. It is cheap, stable, needs no rollout infrastructure, and is how a small model inherits a large one's reasoning style: DeepSeek's distilled R1 variants from 1.5B to 70B were produced exactly this way. Its limits are structural. The student is bounded by the teacher. It imitates the surface form of deliberation, including steps it could not have derived itself, so it learns what reasoning looks like rather than a policy it can execute reliably. And because the training set is filtered for success, it contains almost no genuine errors and therefore teaches almost nothing about recovering from one.

**RL with verifiable rewards (RLVR).** Let the model generate its own trajectories and score the final answer with a program: string or numeric match against a reference for mathematics, a test suite for code, a checker for formal proofs. Two properties follow. First, the reward is not a learned model, so the usual channel for reward hacking (exploiting a reward model's misgeneralisation) is closed; what remains is gaming the checker itself, for example code that special-cases the visible tests. Second, and more important, the trajectories are the model's own, so credit assignment is on-policy: the behaviour that gets reinforced is behaviour this model can actually produce. That is why long traces, self-checking and backtracking *emerge* under RLVR rather than having to be demonstrated. R1-Zero was the clean demonstration: pure RL on a strong base model, no supervised reasoning data at all, produced spontaneous re-derivation and reflection.

The production recipe combines them in a specific order, and R1's is the openly documented version: a small cold-start SFT on curated long CoT to fix format and readability (R1-Zero's traces were correct but mixed languages and were painful to read), then large-scale RLVR for capability, then rejection-sampling of the RL model's own best trajectories into a new SFT set used both to re-tune the flagship and to distil smaller models.

The binding constraint on RLVR is that it needs a verifier, so it covers mathematics, code, and formal domains cleanly and covers writing, analysis and judgement poorly. Extending it means reintroducing a learned reward model or model-graded rubrics, which reopens exactly the reward-hacking channel that made RLVR attractive.

## GRPO versus PPO

Both are policy-gradient methods with a clipped surrogate objective: compute the ratio of new-policy to old-policy probability for each token, multiply by an advantage, and clip the ratio so a single update cannot move the policy too far. They differ in where the advantage comes from, and that difference is most of the practical story.

**PPO (Proximal Policy Optimization)** learns a value function, the critic, alongside the policy. The critic predicts the expected return from a given prefix, advantages are computed from it (usually via generalised advantage estimation), and a KL penalty against a frozen reference model keeps the policy from drifting away from its pretrained behaviour. In LLM RL this means holding up to four large networks at once: policy, reference, critic, and (in RLHF) a reward model. Two costs dominate. The critic is typically of comparable size to the policy, so it roughly doubles the memory and adds its own training dynamics to debug. And value estimation is genuinely hard here: the reward is a single scalar arriving after several thousand tokens, so the critic must learn to predict, from a half-finished derivation, whether the final answer will be right. It is noisiest exactly where the signal matters.

**GRPO (Group Relative Policy Optimization)**, introduced in DeepSeekMath and used to train R1, deletes the critic and replaces its job with a group statistic. For each prompt, sample a group of G completions from the current policy, score each with the verifier, and set a completion's advantage to its reward minus the group mean, divided by the group standard deviation. That single scalar is then assigned to every token of that completion, and the clipped surrogate and reference KL work as before.

What it buys: one fewer large network to hold and to fit, no value-estimation problem at all, and a formulation that matches verifiable rewards naturally, since with binary correctness the only meaningful signal is relative ranking within a group of attempts at the same problem.

What it costs, and these are the things that show up in practice:

- **Compute moves from training into sampling.** Every prompt now needs G rollouts, so the bottleneck of an RL run becomes generation throughput, which is why modern RL stacks run vLLM or SGLang inside the training loop and why rollout/training weight synchronisation is a first-order engineering concern.
- **No per-token credit assignment.** Every token in a failed trajectory receives the same negative advantage, including the early steps that were correct, and every token in a lucky success is reinforced. Deleting the critic deleted the only component that could have distinguished them.
- **Degenerate groups.** If all G samples are correct, or all are wrong, the advantages are zero and the group contributes nothing but its sampling cost. On easy or impossible problems this is most of the batch.
- **Normalisation bias.** Dividing by the group standard deviation inflates updates from low-variance prompts, and standard length normalisation systematically favours longer wrong answers.

The follow-up work is mostly aimed at those last two. **Dr. GRPO** removes the standard-deviation and length normalisations, arguing that both are biases rather than variance reduction. **DAPO** keeps the group formulation but adds asymmetric clipping (a higher upper clip bound, so low-probability tokens can still gain probability and exploration does not collapse), dynamic sampling (discard prompts whose group came out all-correct or all-wrong and resample, so every batch carries gradient), token-level rather than sequence-level loss aggregation, and shaped penalties for overlong generations. If you are reading a 2026 RL recipe, expect some combination of these rather than textbook GRPO.

## Hybrid and adjustable thinking budgets

Once every flagship reasons, the interesting control problem is how much. Four mechanisms are in production, and they sit at different layers.

- **Two modes in one checkpoint.** Qwen3 trained thinking and non-thinking behaviour into a single model, selected by a chat-template flag or an inline `/think` and `/no_think` marker. It buys one deployment instead of two and a per-turn switch inside a conversation. It costs capacity that is shared between the modes, plus the training effort of keeping the non-thinking mode genuinely good rather than a degraded version of the thinking one.
- **A token budget.** Anthropic's `budget_tokens` and Gemini's thinking budget put a ceiling on the thinking block. The naive implementation is truncation, which is bad: a derivation cut off at the limit yields an answer with no conclusion. The useful version conditions the model on the budget during training so it learns to compress and to land a conclusion inside the allowance, which is where the current research lives. Budgets also serve as latency insurance in a product, which is often the real reason they exist.
- **Interleaved thinking.** Thinking blocks placed between tool calls rather than only at the start of a turn, with depth varying per step: think hard before a consequential action, skim after a trivial tool result. This is the dominant pattern in agentic coding harnesses because an agent's uncertainty is not front-loaded; it arrives when a tool returns something surprising.
- **Routed reasoning.** A classifier in front of the model decides per request how much thinking to spend, or which model tier answers at all, as GPT-5.x does. It buys a large reduction in average cost, since most traffic is easy. It costs predictability: the same prompt can route differently on different days, evaluation now measures the router as much as the model, capacity planning depends on the routing mix rather than on a fixed per-request cost, and a misroute is invisible to the caller, who simply gets a worse answer with no indication that a cheaper path was taken.

## How the category evolved

- **2022-2023, prompting era**: CoT prompting (asking for step-by-step working), self-consistency (sample several answers and take the majority), and STaR (bootstrap by fine-tuning on the model's own correct chains) showed that latent reasoning could be elicited by prompt alone and, more consequentially, that it could be trained on.
- **Sep 2024, o1**: the first production model trained with large-scale RL to reason in a hidden chain of thought, with large jumps on AIME, GPQA and Codeforces. It also introduced the test-time scaling curve as a public artefact: accuracy plotted against inference compute, rising where everyone had previously assumed the model was fixed at deployment.
- **Jan 2025, DeepSeek-R1**: replicated the result and published the recipe described above. R1-Zero established that pure RL on a strong base model (V3) produces emergent reflection without any SFT; R1 added the cold-start stage for readability; the distilled 1.5B to 70B variants seeded an entire open ecosystem. MIT licence, o1-class scores, a fraction of the price.
- **2025, hybridisation**: Claude 3.7 Sonnet introduced extended thinking with a user-set `budget_tokens`; Gemini 2.5 shipped thinking budgets; Qwen3 shipped think and no-think modes in one checkpoint; GPT-5 put a fast model and a reasoning model behind a real-time router. o3, Grok 4, Kimi K2 Thinking, GLM-4.x and MiniMax M1/M2 all shipped reasoning-first. Gemini Deep Think and an experimental OpenAI model reached IMO gold-medal standard (July 2025).
- **2026, absorption**: there are essentially no non-reasoning flagships left, so the standalone category has dissolved into the mainline. The open problems are when and how much to think, not whether.

## Current state, August 2026

- **Router-based depth selection**: GPT-5.x decides per request how much to think; Claude and Gemini expose explicit budgets; most open models expose a reasoning-effort knob or a thinking on/off switch.
- **Interleaved thinking for agents** is the dominant harness pattern, for the reason given above: an agent's need for deliberation is triggered by tool results, not by the initial prompt.
- **Token efficiency is the competition.** Frontier marketing now leads with "same score, fewer thinking tokens" (GPT-5.6, Opus 5), because at equal accuracy the thinking budget is the price. Research systems (CogRouter, ARES, 2026) train per-step adaptive depth, deciding at each step how much deliberation the step deserves, and report 50% to 60% token reductions at equal accuracy.
- **Verification-heavy pipelines**: deep-research products chain reasoning with search and tools, and parallel-sampling plus verifier setups (Deep Think, Grok Heavy tiers) hold the top of the hardest benchmarks (HLE, olympiad sets, ARC-AGI).
- **Open replication is complete.** R1's lineage (Qwen3, GLM-5.x, Kimi K3, OLMo 3 Think, MiniMax M3) means RLVR recipes, reasoning datasets and in OLMo's case the full training logs are public. Remaining frontier gaps come from scale, data and infrastructure rather than from secret algorithms.
- **What is measured**: AIME and HMMT (competition mathematics), GPQA (graduate-level science), SWE-bench, FrontierSWE and Terminal-Bench (agentic coding), HLE (Humanity's Last Exam, deliberately at the edge of expert knowledge), ARC-AGI-2 (abstraction from few examples), and long-horizon agent evaluations of the GDPval kind that score economically valuable multi-step work.

## Where the scaling stops paying

- **Overthinking is real and measurable.** On easy inputs, longer chains reduce accuracy: the model revisits a correct answer and argues itself out of it. This is the failure mode that adaptive-depth work exists to fix, and it means "always think harder" is not a safe default policy.
- **RLVR sharpens, it does not extend.** The standard evidence is pass@k: the RL-trained model wins decisively at pass@1, but as k grows the base model's pass@k catches up and can overtake, which says the RL model is concentrating probability mass on solutions the base model could already sample rather than acquiring new ones. Pretraining quality still bounds the ceiling, and this is the most important thing to keep in mind before assuming an RL stage will fix a capability gap.
- **Parallel scaling is capped by the selector.** Gains from best-of-n track how good your verifier is, and against a learned reward model they saturate and then reverse as n grows.
- **The economics are unfavourable by construction.** Cost and latency are linear in thinking tokens while accuracy is roughly logarithmic, so every additional point costs more than the last one. Sequential thinking is also unparallelisable, so interactive latency hits a wall that hardware does not move.

## Caveats worth remembering

- **CoT is not a faithful window into the computation.** Models can reach an answer for reasons their stated reasoning does not reflect, and can state reasoning that did not drive the answer. Whether chains of thought stay monitorable enough to be useful for oversight is an open safety question, and one that gets harder as training rewards short, efficient traces.
- **Reward hacking and verbosity bias are endemic.** Verifiable rewards remove the reward-model channel but not the checker channel, and length penalties and process reward models (scoring intermediate steps rather than only the final answer) only partially fix the resulting behaviours.

## Aside: multimodal LLM integration patterns, from the same notes

Three integration depths, in increasing order of how much of the model is jointly trained:

1. **LLM plus tools, shallow.** Convert other modalities to text first (transcribe audio, caption images) and feed the text. Nothing about the LLM changes, and everything the converter discards is lost.
2. **LLM plus adapters, modular.** A frozen encoder produces embeddings that a small trained projection maps into the LLM's token embedding space, the LLaVA and BLIP pattern. Cheap to train and easy to swap encoders; the ceiling is set by what the frozen encoder chose to represent.
3. **Unified models, deep.** Modalities are trained jointly end to end (Gemini, GPT-4o and GPT-5, Qwen-VL, Kimi K3, MiniMax M3), so representations are shared rather than translated. Most expensive, and currently the only route to genuinely cross-modal reasoning.

A unified stack is: modality encoders (a vision transformer or CLIP-style encoder for images, a codec for audio), then an input projector into the token space, then the LLM backbone, then either the ordinary text head or an output projector into a generator (a diffusion model for images, a codec decoder for speech). Depth on this lives in topics/generative-and-multimodal.

## Cross-links

- Family specifics: openai/ (o-series, GPT-5.x routing), anthropic/ (extended thinking and budgets), deepseek/ (R1 and the published recipe), google-gemini/ (Deep Think, thinking budgets).
- Training mechanics in depth (GRPO variants, RLVR infrastructure, reward models): topics/llm-training-and-post-training and topics/rl.
- Papers: DeepSeek-R1, Qwen3 (hybrid thinking), DeepSeek-V3 (the base model under R1).
