# Reasoning models and test-time compute

Last updated: 2026-08-24. Seeded from Khalid's own prep notes, expanded to the current
state of the art.

## Best resources

- [DeepSeek-R1 paper](https://arxiv.org/abs/2501.12948) and this repo's [summary](../../papers/2025-01_deepseek-r1/summary.md): the openly documented recipe for RL-induced reasoning.
- [OpenAI: Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/): the o1 announcement that defined the category.
- [Sasha Rush: Speculations on Test-Time Scaling](https://www.youtube.com/watch?v=6PEJ96k1kiw): best technical lecture on the test-time compute design space.
- [Nathan Lambert: reasoning coverage on Interconnects](https://www.interconnects.ai/): ongoing analysis of RLVR and reasoning-model training.
- [Anthropic: extended thinking docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking): the reference for budgeted and interleaved thinking APIs.
- [Survey: Adaptive and Controllable Test-Time Compute](https://arxiv.org/abs/2507.02076): taxonomy of budget-control methods.

## Core idea

A reasoning model produces a long chain of thought (CoT) before its answer, and is
*trained* to use that CoT well: typically large-scale RL on tasks with verifiable outcomes
(math with checkable answers, code with unit tests), so the model learns to plan, check,
backtrack, and self-correct. This converts inference tokens into accuracy: test-time
compute became a second scaling axis alongside pretraining compute.

Two ways to spend test-time compute:

- **Sequential**: longer CoT, self-correction, revision (o1/R1 style). This is what RL
  training scales.
- **Parallel**: sample many solutions and select (majority vote / self-consistency,
  best-of-n with a verifier or reward model, or multi-agent setups like Grok 4 Heavy and
  Gemini Deep Think).

Training levers: RL with verifiable rewards (RLVR, usually GRPO-family policy gradients),
outcome vs process reward models, rejection-sampling distillation of long CoT into SFT
data, and length/efficiency penalties to control overthinking.

## How the category evolved

- **2022-2023, prompting era**: CoT prompting, self-consistency, STaR bootstrapping showed
  latent reasoning could be elicited and trained on.
- **Sep 2024, o1**: first production model trained with large-scale RL to reason in a
  hidden CoT; huge jumps on AIME/GPQA/Codeforces; introduced the compute-vs-accuracy
  test-time scaling curve.
- **Jan 2025, DeepSeek-R1**: replicated and published the recipe. R1-Zero showed pure RL
  on a strong base model (V3) produces emergent reflection ("aha moments") without SFT;
  R1 added cold-start SFT for readability; distilled 1.5B-70B variants seeded a whole
  ecosystem. MIT license, o1-class scores at a fraction of the price.
- **2025, hybridisation**: Claude 3.7 Sonnet introduced extended thinking with a
  user-set `budget_tokens`; Gemini 2.5 shipped thinking budgets; Qwen3 shipped
  think/no-think modes in one checkpoint; GPT-5 put a fast model and a reasoning model
  behind a real-time router. o3, Grok 4, Kimi K2 Thinking, GLM-4.x, MiniMax M1/M2 all
  shipped reasoning-first. Gemini Deep Think and an OpenAI experimental model hit IMO
  gold-medal standard (July 2025).
- **2026, absorption**: there are essentially no non-reasoning flagships left. The
  interesting problems are now *when and how much* to think, not whether.

## Current state (Aug 2026)

- **Router-based depth selection**: GPT-5.x decides per request how much to think;
  Claude and Gemini expose explicit budgets; most open models expose a reasoning-effort
  knob or thinking on/off switch.
- **Interleaved thinking for agents**: reasoning between tool calls, with depth varying
  per step (think hard before a complex action, skim after a trivial result). This is the
  dominant pattern in agentic coding harnesses.
- **Token efficiency is the competition**: frontier marketing now leads with "same score,
  fewer thinking tokens" (GPT-5.6, Opus 5). Research systems (CogRouter, ARES, 2026)
  train adaptive per-step depth and report 50-60% token cuts at equal accuracy.
  Overthinking (long CoT on easy inputs, accuracy *drops* with length) is a recognised
  failure mode.
- **Verification-heavy pipelines**: deep-research products chain reasoning with search
  and tools; parallel-sampling + verifier setups (Deep Think, Grok Heavy tiers) top the
  hardest benchmarks (HLE, IMO/Olympiad sets, ARC-AGI).
- **Open replication is complete**: R1's lineage (Qwen3, GLM-5.x, Kimi K3, OLMo 3 Think,
  MiniMax M3) means RLVR recipes, reasoning datasets, and even fully open training logs
  (OLMo) are public. Frontier gaps now come from scale, data, and infra, not secret
  algorithms.
- **What is measured**: AIME/HMMT (math), GPQA (science), SWE-bench/FrontierSWE and
  Terminal-Bench (agentic coding), HLE, ARC-AGI-2, long-horizon agent evals (GDPval-style
  economically valuable tasks).

## Caveats worth remembering

- CoT is not a faithful window into computation: models can reach answers for reasons
  their stated reasoning does not reflect; monitorability of CoT is an open safety topic.
- RLVR mostly sharpens capabilities the base model already has (pass@k narrows vs
  pass@1); pretraining quality still bounds the ceiling.
- Reward hacking and verbosity bias are endemic; length penalties and process rewards
  only partially fix them.

## Aside: multimodal LLM integration patterns (from the same notes)

Three integration depths: (1) LLM + tools, shallow (transcribe/caption to text first);
(2) LLM + adapters, modular (frozen encoders projected into the LLM's embedding space,
the LLaVA/BLIP pattern); (3) unified models, deep (jointly trained end to end: Gemini,
GPT-4o/5, Qwen-VL, Kimi K3, MiniMax M3). A unified stack = modality encoders (ViT/CLIP
for vision, audio codecs) -> input projector into the token space -> LLM backbone ->
output projector or generator head (text, or a diffusion/codec decoder for images and
speech). Depth on this lives in [topics/generative-and-multimodal](../generative-and-multimodal/).

## Cross-links

- Family specifics: [openai/](openai/overview.md) (o-series, GPT-5.x), [anthropic/](anthropic/overview.md) (extended thinking), [deepseek/](deepseek/overview.md) (R1), [google-gemini/](google-gemini/overview.md) (Deep Think).
- Training mechanics (GRPO, RLVR, reward models): [topics/llm-training-and-post-training](../llm-training-and-post-training/) and [topics/rl](../rl/).
- Papers: [DeepSeek-R1](../../papers/2025-01_deepseek-r1/summary.md), [Qwen3](../../papers/2025-05_qwen3/summary.md) (hybrid thinking), [DeepSeek-V3](../../papers/2024-12_deepseek-v3/summary.md) (the base under R1).
