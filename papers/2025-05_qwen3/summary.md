# Qwen3 Technical Report

- **Authors/lab**: Qwen Team (Alibaba)
- **Date**: May 2025 (arXiv v1 2025-05-14; models released 2025-04-29)
- **Links**: [arXiv 2505.09388](https://arxiv.org/abs/2505.09388) | [Blog: Qwen3: Think Deeper, Act Faster](https://qwenlm.github.io/blog/qwen3/) | [GitHub](https://github.com/QwenLM/Qwen3) | [HF collection](https://huggingface.co/Qwen)
- Added to KB: 2026-08-24

## Best resources

- [Understanding and Implementing Qwen3 From Scratch (Sebastian Raschka)](https://magazine.sebastianraschka.com/p/qwen3-from-scratch): builds the dense architecture in plain PyTorch; the fastest way to internalize exactly what a Qwen3 block contains.
- [The Big LLM Architecture Comparison (Sebastian Raschka)](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison): situates Qwen3 dense and MoE against DeepSeek-V3, Llama, Gemma and later designs; good on the no-shared-expert MoE choice.
- [Qwen 3: The new open standard (Nathan Lambert, Interconnects)](https://www.interconnects.ai/p/qwen-3-the-new-open-standard): release-week analysis of why the size ladder plus Apache 2.0 made Qwen3 the default open family.
- [Official release post](https://qwenlm.github.io/blog/qwen3/): the team's own framing of hybrid thinking, the 119-language jump, and agentic focus.

## Problem

By early 2025 the open ecosystem had split into chat models (Qwen2.5-Instruct, GPT-4o class) and dedicated reasoners (QwQ-32B, R1 class), forcing users to route between models and giving them no control over how many reasoning tokens they pay for. Small open models were also expensive to make good: running a full reasoning-RL pipeline per size does not amortize. Qwen3 targets all three gaps at once: one model that both thinks and answers directly under an explicit token budget, a full ladder of sizes trained cheaply from flagship teachers, and much broader multilingual coverage (29 to 119 languages).

## Method

**Family and architecture.** Six dense models (0.6B, 1.7B, 4B, 8B, 14B, 32B) and two MoE models (Qwen3-30B-A3B; flagship Qwen3-235B-A22B, 235B total / 22B activated), all Apache 2.0. Dense architecture is Qwen2.5-like (GQA, SwiGLU, RoPE, pre-norm RMSNorm) with two changes: QKV-bias removed and QK-Norm added to attention for training stability. MoE layers use 128 fine-grained experts with 8 activated, no shared experts (unlike Qwen2.5-MoE), and a global-batch load-balancing loss to encourage expert specialization. BBPE tokenizer, 151,669 vocab. Context 32K for 0.6B/1.7B, 128K for the rest.

**Pretraining: 36T tokens, 3 stages.** Data is doubled over Qwen2.5 partly by pipeline tricks: Qwen2.5-VL OCRs a large corpus of PDF-like documents and Qwen2.5 refines the text (trillions of extra tokens); Qwen2.5-Math and Qwen2.5-Coder synthesize textbook/QA/code data. A multilingual annotation system labels 30T+ tokens along educational value, field, domain and safety, and the data mixture is optimized at instance level (not source/domain level) via ablations on small proxy models. Stages: (S1) general, ~30T tokens at 4K context, 119 languages; (S2) reasoning, ~5T higher-quality tokens up-weighted toward STEM, code and synthetic data with accelerated LR decay; (S3) long context, hundreds of billions of tokens at 32K (75% of samples 16-32K), RoPE base raised 10K to 1M via ABF, with YaRN and Dual Chunk Attention giving 4x sequence-length extrapolation at inference. Optimal LR/batch-size are set per model and stage from in-house scaling laws.

**Post-training: 4 stages for the flagships (235B-A22B and 32B).**
1. **Long-CoT cold start.** Verifiable math/code/logic/STEM queries, two-phase filtered: drop queries that are non-verifiable or that Qwen2.5-72B can answer without CoT (to prevent superficial guessing), then generate candidates with QwQ-32B and strictly filter responses (wrong answers, repetition, guesswork, think/summary inconsistency, language mixing, eval contamination). Deliberately minimal SFT: instill the reasoning format without capping the RL headroom.
2. **Reasoning RL.** Only 3,995 held-out query-verifier pairs, chosen to be learnable-but-hard and domain-diverse; GRPO with large batches, many rollouts per query, off-policy reuse, and entropy control for stable exploration. Qwen3-235B-A22B goes 70.1 to 85.1 on AIME'24 over 170 RL steps with no hyperparameter intervention.
3. **Thinking Mode Fusion.** Continual SFT on a mix of thinking data (rejection-sampled from the stage-2 model itself on stage-1 queries) and curated non-thinking data. The chat template adds /think and /no_think flags in user/system turns; non-thinking samples keep an empty `<think></think>` block so the format is uniform and deployers can force non-thinking by pre-filling an empty block. Multi-turn data randomly interleaves flags; the model obeys the last one. The thinking budget falls out of this stage for free: when thinking hits a user-set token threshold, a stop-thinking instruction is inserted and the model answers from partial reasoning, an ability that emerges from fusion rather than explicit training.
4. **General RL.** A reward system over 20+ tasks: instruction and format following (including correct /think switching and `<think>` token discipline), preference alignment, agent/tool-use with real multi-turn environment execution feedback, and specialized tasks like RAG hallucination control. Three reward types: rule-based verifiers, Qwen2.5-72B-as-judge against reference answers, and a reference-free reward model on human preference data.

**Strong-to-weak distillation for everything else** (0.6B-14B dense, 30B-A3B). Two phases: off-policy distillation on teacher outputs in both /think and /no_think modes, then on-policy distillation where the student samples its own responses and is trained to minimize KL to the teacher's logits (Qwen3-32B or 235B-A22B). This replaces the whole 4-stage pipeline per small model at ~1/10 the GPU hours and beats RL: from the same 8B checkpoint, on-policy distillation reaches AIME'24 74.4 (pass@64 93.3) in 1,800 GPU hours versus 67.6 (pass@64 90.0, unchanged from the checkpoint) in 17,920 hours for reasoning RL, i.e. distillation also expands the exploration frontier where RL only sharpens pass@1.

## Results

- **Base models**: Qwen3-235B-A22B-Base beats DeepSeek-V3-Base on 14/15 benchmarks with ~1/3 the total and 2/3 the activated parameters, and beats Llama-4-Maverick at half its size. The dense ladder shifts a tier: Qwen3-1.7B/4B/8B/14B/32B-Base match Qwen2.5-3B/7B/14B/32B/72B-Base, and MoE bases match dense bases with 1/5 the activated parameters.
- **Flagship (thinking)**: Qwen3-235B-A22B scores AIME'24 85.7, AIME'25 81.5, LiveCodeBench v5 70.7, CodeForces Elo 2056 (98.2 percentile, above o1 and R1), BFCL v3 70.8; overall competitive with o1, DeepSeek-R1, and Gemini 2.5 Pro at 1/3 of R1's total parameters. Non-thinking mode beats GPT-4o-1120 and DeepSeek-V3 on most benchmarks.
- **Thinking budget**: performance scales smoothly and monotonically with allocated thinking tokens (1K to 32K) on AIME, LiveCodeBench and GPQA, validating budgeted test-time compute as a user-facing dial.
- **Small models**: Qwen3-4B roughly matches Qwen2.5-72B-Instruct-era quality on many tasks; Qwen3-8B/14B/30B-A3B beat DeepSeek-R1-Distill-Qwen-14B/32B; Qwen3-1.7B beats R1-Distill-Llama-8B. Stage-3/4 ablations show mode fusion and general RL buy large gains in instruction following, agent stability, and mode switching (ThinkFollow 88.7 to 98.9) at a small cost in peak math/code scores.

## Why it matters

Qwen3 is the release that cemented Qwen as the default open family to fine-tune: a complete Apache 2.0 ladder from 0.6B to 235B sharing one tokenizer, one template, and one behavior contract, with small models that punch far above their size because they inherit flagship post-training through distillation. Most 2025 open fine-tunes, RL research baselines, and distillation studies build on these checkpoints (and this is the family Khalid has fine-tuned professionally). Three ideas proved durably influential: budgeted thinking as a first-class inference dial; the minimal-cold-start-then-GRPO recipe with aggressively filtered verifiable data; and on-policy logit distillation as a 10x cheaper, strictly better substitute for per-model RL, a result that shaped later small-model pipelines industry-wide.

The hybrid thinking experiment itself did not survive contact with users: the July 2025 refresh (Qwen3-235B-A22B-Instruct-2507 and Thinking-2507, plus 30B-A3B and 4B 2507 variants, 256K context) split the modes back into separate Instruct and Thinking models after the team concluded fusion taxed peak quality, an instructive negative result about capability interference. The family then expanded fast on this substrate: Qwen3-Coder (480B-A35B agentic coder), Qwen3-Next-80B-A3B (hybrid gated-attention/linear-attention with ultra-sparse MoE), Qwen3-VL, Qwen3-Omni, and the closed flagship Qwen3-Max, keeping Qwen the most actively iterated open line through 2025.

## Connections

- [papers/2025-01_deepseek-r1](../2025-01_deepseek-r1/summary.md): the reasoning-RL paradigm Qwen3 adopts (cold start then RL); its distilled models are the direct baselines Qwen3's small models beat, and Qwen3 answers its RL-vs-distillation question in favor of distillation for students.
- [papers/2024-02_deepseekmath-grpo](../2024-02_deepseekmath-grpo/summary.md): GRPO, the algorithm used in Qwen3's reasoning RL stage.
- [papers/2024-12_deepseek-v3](../2024-12_deepseek-v3/summary.md): the rival open MoE flagship; Qwen3-235B-A22B-Base overtakes it with a third of the parameters, via more tokens rather than architectural exotica (no MLA, no shared experts, no MTP).
- [papers/2021-01_switch-transformer](../2021-01_switch-transformer/summary.md) and [papers/2024-01_mixtral](../2024-01_mixtral/summary.md): the MoE lineage behind Qwen3's fine-grained 128-expert, 8-active design.
- [papers/2021-04_roformer-rope](../2021-04_roformer-rope/summary.md): RoPE, extended here via ABF base scaling plus YaRN and Dual Chunk Attention.
- [papers/2024-07_llama-3](../2024-07_llama-3/summary.md): the competing open-family technical report; Qwen3's comparisons against Llama-4 Maverick/Scout mark the moment the open-weight lead moved east.
- Topics: `topics/llms`, `topics/llm-training-and-post-training`, `topics/rl`, `topics/data-curation-and-datasets`.
