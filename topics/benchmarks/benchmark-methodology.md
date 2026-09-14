# Benchmark methodology: how benchmarks are used, misused, and die

⏱ 10 min read · +3h resources

Last updated: 2026-08-24. Folds in Khalid's own notes (IBM benchmark primer, benchmark
lifespan observation).

## Best resources

- [IBM: What are LLM benchmarks?](https://www.ibm.com/think/topics/llm-benchmarks) (~12 min): the primer Khalid's original notes came from
- [The Leaderboard Illusion (2025)](https://arxiv.org/abs/2504.20879) (45 min) and [LMArena's response](https://arena.ai/blog/our-response/) (~10 min); [Simon Willison's summary](https://simonwillison.net/2025/Apr/30/criticism-of-the-chatbot-arena/) (~8 min)
- [A Careful Examination of LLM Benchmark Contamination (GSM1k, 2024)](https://arxiv.org/abs/2405.00332) (45 min)
- [Adding Error Bars to Evals (Anthropic, 2024)](https://www.anthropic.com/research/statistical-approach-to-model-evals) (~20 min)
- [BetterBench (2024)](https://betterbench.stanford.edu/) (~15 min): assesses benchmarks themselves against design criteria
- [Berkeley RDI on gamed agent benchmarks (2026)](https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/) (~25 min)

## The basic protocol (from the notes, still the right skeleton)

1. **Sample data**: the benchmark ships the dataset (and ideally a canonical prompt).
2. **Testing**: run the model zero-shot or few-shot (today: plus CoT on/off, tools
   on/off, reasoning-effort setting, agent scaffold).
3. **Scoring**: defined metric: accuracy, precision/recall/F1, exact match, pass@k,
   ROUGE/BLEU (legacy generation), perplexity (legacy LM quality), Elo (preference),
   judge score, task success rate, pass^k (reliability).

Every one of those knobs changes the number. A benchmark result is meaningless without
the protocol tuple: (dataset version, shots, CoT, tools, sampling params, extraction
logic, scaffold, judge). Harness details live in
[../evaluation-and-llm-judges/](../evaluation-and-llm-judges/summary.md).

## Few-shot vs zero-shot, and protocol drift

- Base-model era: few-shot (MMLU 5-shot) taught the format. Instruct era: zero-shot CoT
  is standard; few-shot can even hurt reasoning models (o1-class models were explicitly
  evaluated 0-shot; OpenAI noted few-shot prompts degraded o1 on GPQA).
- Answer extraction is a silent killer: regex-parsing "The answer is (X)" vs
  logprob-over-options gives different MMLU scores for the same model. Harnesses
  (lm-eval-harness vs HELM vs vendor) legitimately disagree by points.
- Reasoning models add: token budget and effort level (a model at "high effort" is a
  different system), plus tools (HLE with vs without search differs by ~10-20 points).

## Sampling variance and error bars

- Generative evals at temperature > 0 need repeated runs: single-run pass@1 on a
  30-question AIME has a standard error of several points; a 2-point SWE-bench delta on
  500 tasks is within noise. Anthropic's error-bar work: treat questions as sampled from
  a population, report CLT-based CIs, use paired tests when comparing two models on the
  same items (paired analysis kills much of the variance).
- Common inflation tricks: cherry-picking best-of-N runs, maj@k/consensus reported next
  to competitors' pass@1, "with tools" next to "without". Read the footnotes.

## Contamination: detection and defenses

Detection heuristics:

- N-gram / substring overlap between benchmark and pretraining corpus (weak vs
  paraphrase).
- Perplexity or completion tests: model completes a benchmark item verbatim from a
  prefix.
- Fresh-parallel-set rebuilds: GSM1k (new GSM8K-alike) showed up to 13% drops for some
  model families, showing memorization; GSM-Symbolic template perturbations same story.
- Temporal splits: performance cliff on data created after the training cutoff
  (SWE-rebench found models score much better on pre-cutoff repos).

Defenses (ranked roughly by strength): fully private sets with an evaluation API
(FrontierMath, HLE private split, SWE-bench Pro commercial split) > rolling live data
pinned to dates (LiveCodeBench, MathArena, SWE-rebench) > canary strings (BIG-bench
GUIDs, respected only by cooperating labs) > perturbation/templating > trust.

## The saturation lifecycle (Khalid's note, formalized)

Benchmarks have a limited lifespan: as models improve, everyone scores highly and the
benchmark stops discriminating; or models train on it (deliberately or via web scrape)
and the score decouples from capability. Typical arc:

1. **Launch**: frontier scores low (MMLU 2020: ~32%; ARC-AGI-2 2025: ~4%).
2. **Discriminative years**: the useful period, historically 2-4 years, now often <18
   months (ARC-AGI-2 went ~4% to ~85%+ in about a year; Terminal-Bench 1.0 lasted months).
3. **Saturation**: top models cluster within noise of each other and of the errata
   ceiling (MMLU ~92%, SWE-bench Verified ~97%, GPQA ~95%).
4. **Zombie phase**: still cited for continuity and marketing; deltas are meaningless.
5. **Replacement**: a harder sibling (MMLU->MMLU-Pro->GPQA->HLE; SWE-bench->Verified->
   Pro; ARC 1->2->3) or a design change (static -> live/rolling, static -> interactive).

Implication for eval engineering: pin benchmark versions, expect to rotate the suite
yearly, and keep a private regression set that never touches the internet.

## Goodhart effects and benchmark gaming

"When a measure becomes a target, it ceases to be a good measure." Concrete forms:

- **Training on the test** (or its paraphrases/distillations); the boundary with
  "training on similar data" is genuinely blurry.
- **Overfitting the format**: models tuned for MCQ letter-answering or arena-pleasing
  verbosity; length and style bias in judge-based evals (AlpacaEval needed
  length-controlled variants).
- **Scaffold shopping**: report the best of many agent harnesses, compare to rivals'
  default harness.
- **Reward hacking inside the eval**: agents tamper with checkers or fetch gold answers
  (Berkeley RDI 2026 broke 8 agent benchmarks this way; METR saw o3 hack scoring
  organically in ~30% of some runs). Evaluator isolation is now a design requirement.
- **Selective reporting**: private variants tested in the arena, only the winner
  released (see below).

## Private vs public splits

Public test sets die by leakage; fully private sets are unauditable and concentrate
trust in one org (FrontierMath's OpenAI-funding disclosure is the cautionary tale).
Best current practice is a hybrid: public dev + private held-out (HLE, ARC-AGI
semi-private, SWE-bench Pro), with the private split used to measure public-split
overfitting, plus independent rerunners (Epoch, HAL, Artificial Analysis) as auditors.
Private in-house benchmarks (like AveniBench: finance capabilities, general
capabilities, safety) are the same idea applied inside a company: they stay
discriminative precisely because they are not in anyone's training data.

## Elo arenas and their critiques

LMArena (ex Chatbot Arena/LMSYS): anonymous pairwise battles, human votes, Bradley-Terry
(Elo-style) ratings; Arena-Hard distills hard arena prompts into an offline judge-graded
proxy. Strengths: live, contamination-free by construction, measures what users prefer.
Critiques:

- **The Leaderboard Illusion (2025)**: undisclosed private testing (Meta tested 27
  Llama-4 variants pre-release, best-of-N retracted at will), unequal sampling rates
  favoring big proprietary labs, silent deprecation of open models, and arena data
  access advantages (arena-vote data measurably trains models to win the arena).
  LMArena disputed parts (notably the open-model data-share calculation) but tightened
  policy on variant testing.
- **Preference is not capability**: votes reward confident, well-formatted, sycophantic
  answers; style effects rival capability effects (style-controlled ratings reorder the
  board). The 2025 "sycophancy incident" (GPT-4o rollback) showed optimization pressure
  toward arena-pleasing behavior has product consequences.
- Practical read: use arenas as one noisy signal of user preference, category-filtered
  (coding, hard prompts, style control on), never as the capability ranking.

## Misuse checklist (for reading model cards)

- Same protocol for all models compared? (shots, tools, maj@k, effort, scaffold)
- Error bars or at least n-per-benchmark stated?
- Benchmark version pinned? (MMLU vs MMLU-Pro; TB 2.0 vs 2.1; which AIME year)
- Saturated benchmark deltas being narrated as meaningful?
- Any number you cannot reproduce with a public harness deserves a discount.

Cross-links: harnesses, judge design, regression gates, and contamination tooling in
[../evaluation-and-llm-judges/](../evaluation-and-llm-judges/summary.md); reward hacking in
[../llm-training-and-post-training/](../llm-training-and-post-training/summary.md).
