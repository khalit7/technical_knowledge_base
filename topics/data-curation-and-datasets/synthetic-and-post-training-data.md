# Synthetic data and post-training data

⏱ 8 min read · +4h 50m resources

Last updated: 2026-08-24

## Best resources

- [Cosmopedia blog post](https://huggingface.co/blog/cosmopedia) (~25 min): the open playbook for textbook-style synthetic pretraining data
- [BeyondWeb (DatologyAI, 2025)](https://arxiv.org/abs/2508.10975) (45 min): lessons from trillion-scale synthetic pretraining; why rephrasing won
- [Nemotron-CC](https://arxiv.org/abs/2412.02595) (45 min): rephrasing + synthetic QA as a corpus slice, with ablations
- [Tulu 3 paper](https://arxiv.org/abs/2411.15124) (90 min): end-to-end open post-training data recipe (SFT + preference + RLVR)
- [LIMA](https://arxiv.org/abs/2305.11206) (45 min): the quality-over-quantity result for SFT
- [AI models collapse when trained on recursively generated data (Shumailov et al., Nature 2024)](https://www.nature.com/articles/s41586-024-07566-y) (~40 min): the model-collapse result everyone cites

## Synthetic pretraining data

Two lineages:

- **Generation from scratch ("textbooks are all you need")**: Phi-1/2/3/4 built curricula of
  LLM-written textbooks and exercises; tiny models punched far above their weight, at the cost
  of narrow style and benchmark-shaped skills. Open replication: **Cosmopedia** (~39M
  documents, ~25-27B tokens of textbooks/blogs/stories from Mixtral-8x7B, seeded on web topics
  to force diversity); used in SmolLM. Diversity control (seeding, personas as in the
  Persona Hub work) is the hard part, not generation.
- **Rephrasing existing web ("WRAP" lineage)**: paraphrase real documents into cleaner styles
  (wiki-like, QA, MCQ, dialogue). Grounding in a real source document preserves information
  diversity while fixing form. Nemotron-CC generated 1.9T synthetic tokens this way (rephrase
  low-quality docs, generate QA/summaries from high-quality ones); Nemotron-CC-v2.1 added
  2.1T more using Qwen3-32B, including code rephrasing/transpiling. **BeyondWeb** (2025)
  distilled the field's lessons at trillion scale: rephrasing beats from-scratch generation,
  source-document quality still dominates, generator model size hits diminishing returns
  quickly, and style diversity matters. By 2025-26 rephrased-web slices are standard in
  frontier recipes (reported for Kimi K2, Qwen 2.5+, GPT-5-class models).

For a 150-350M pretrain: a small Cosmopedia v2 + rephrased-QA slice in the annealing phase is
cheap and evidenced (SmolLM2 recipe); do not make synthetic the bulk phase.

## SFT data construction

Lineage: **Self-Instruct** (2022: bootstrap instructions from the model itself) -> Alpaca
(52k, GPT-3.5-distilled) -> Evol-Instruct/WizardLM (complexity evolution) -> UltraChat,
OpenHermes-2.5 (large curated distillation pools) -> **Magpie** (2024: prompt an aligned
model with only its chat template header and it emits fresh instructions; zero seed data) ->
reasoning-trace distillation (2025: OpenThoughts, OpenR1-Math-220k, s1K; long chain-of-thought
from R1/QwQ-class teachers, verified before keeping).

What the evidence says:

- **Quality > quantity for style and format**: LIMA got a competitive chat model from 1,000
  hand-picked examples; "superficial alignment hypothesis": SFT mostly teaches format and
  persona, the knowledge is already in the base model.
- **But coverage needs scale**: Tulu 3's SFT mix is ~940k examples across skills (math, code,
  precise IF, safety, multilingual), heavily deduplicated and decontaminated; targeted subsets
  per weak skill beat indiscriminate volume.
- **Distillation from a strong teacher is the default** for small models: generate responses
  with a frontier model on curated prompts, filter (reward model, verifier, or judge), dedup
  (often semantic dedup here), decontaminate against evals. For tiny chat models, SmolTalk is
  the open template. See
  [../llm-training-and-post-training/distillation-and-small-lms.md](../llm-training-and-post-training/distillation-and-small-lms.md).
- **For reasoning SFT**: verify traces (answer check, unit tests) before training on them;
  s1K showed 1k excellent verified traces can unlock test-time-scaling behavior.

## Preference data

- Sources: human pairwise labels (Anthropic HH, the original RLHF setup) are now rare outside
  frontier labs; the open standard is **LLM-judged synthetic preferences**: UltraFeedback (64k
  prompts, GPT-4 ratings across helpfulness/honesty/instruction-following), then Tulu 3's
  regenerated on-policy version.
- Key empirical points: **on-policy beats off-policy** (include completions sampled from the
  model being trained, not only from other models); judge choice and per-aspect rubrics matter;
  contamination and length bias in judged preferences are the classic failure modes (judge
  prefers longer answers, DPO amplifies it).
- Consumed by DPO/GRPO/RLHF pipelines: see
  [../llm-training-and-post-training/alignment-and-rlhf.md](../llm-training-and-post-training/alignment-and-rlhf.md).

## Verifiable-reward (RLVR) datasets

RLVR replaces the learned reward model with a deterministic checker, so the dataset is
(prompt, verifier) pairs:

- **Math**: GSM8K, MATH, then harder pools (NuminaMath, DeepScaleR/DAPO-Math prompt sets,
  Big-Math); verifier = exact/symbolic answer match (math-verify).
- **Code**: prompts with unit tests (TACO, LiveCodeBench-style, KodCode); verifier = test
  execution in a sandbox.
- **Precise instruction following**: IFEval-style checkable constraints (Tulu 3 built RLVR
  data exactly this way: GSM8K + MATH + constraint-satisfaction prompts).
- **Broader domains**: Guru (~92k verified prompts across math, code, science, logic,
  simulation, tables); agentic/SWE environments (SWE-Gym, R2E-style) where the verifier is a
  full test harness.
- Dataset quality issues are the silent killer: unverifiable or wrongly keyed problems produce
  reward noise; difficulty filtering (drop prompts the policy always or never solves) is
  standard since GRPO gets zero gradient from all-same-reward groups. Reward-hacking angles in
  [../llm-training-and-post-training/reward-hacking.md](../llm-training-and-post-training/reward-hacking.md).

## Contamination and model collapse

- **Contamination**: distillation and synthetic generation launder benchmark data into
  training sets (teacher memorized GSM8K; generated "new" problems are paraphrases).
  Decontaminate synthetic sets against evals with n-gram plus embedding matching, same as
  pretraining ([filtering-and-dedup.md](filtering-and-dedup.md)); report it.
- **Model collapse**: Shumailov et al. (Nature 2024) showed recursive training on model
  outputs collapses distribution tails. The doom scenario mostly assumes *replacing* human
  data and *indiscriminate* recursion. In practice: data is accumulated not replaced
  (Gerstgrasser et al. 2024 showed accumulation avoids collapse), synthetic slices are
  grounded in real documents (rephrasing), and verification/filtering prunes the junk; ToEdit
  (ICML 2025) style token-level editing keeps distributions anchored. Real remaining risks:
  homogenized style, amplified biases of the generator, and the slow enshittification of
  Common Crawl itself as the web fills with unlabeled AI text (a genuine concern for
  post-2023 crawl snapshots).

## Practical recipe for a small model (150-350M)

1. Pretrain on FineWeb-Edu (+ code/math anneal) per [pretraining-corpora.md](pretraining-corpora.md).
2. SFT: SmolTalk-style mix, a few hundred k examples max, heavy on format diversity; distill
   responses from a strong open teacher; verify anything verifiable.
3. Preference: small on-policy DPO set (UltraFeedback-style judging over your own model's
   generations).
4. RLVR only if targeting math/IF wins: GSM8K-level prompts; at this scale pass rates on hard
   pools are too low to learn from.
