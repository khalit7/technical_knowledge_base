# Knowledge and reasoning benchmarks: MMLU family, GPQA, HLE, ARC-AGI

⏱ 10 min read · +7h 5m resources

Last updated: 2026-08-24.

### Best resources

- [MMLU paper (Hendrycks et al., 2020)](https://arxiv.org/abs/2009.03300) (45 min) and [MMLU-Pro (2024)](https://arxiv.org/abs/2406.01574) (45 min)
- [GPQA paper (Rein et al., 2023)](https://arxiv.org/abs/2311.12022) (45 min); [Epoch AI GPQA Diamond tracker](https://epoch.ai/benchmarks/gpqa-diamond) (~10 min)
- [HLE paper (Phan et al., 2025)](https://arxiv.org/abs/2501.14249) (45 min); official leaderboard at [lastexam.ai](https://lastexam.ai/) (~10 min) / [Scale labs](https://labs.scale.com/leaderboard/humanitys_last_exam) (~10 min)
- [FutureHouse: about 30% of HLE answers are wrong](https://www.futurehouse.org/research/hle-exam) (~15 min); [HLE-Verified (2026)](https://arxiv.org/abs/2602.13964) (45 min)
- [On the Measure of Intelligence (Chollet, 2019)](https://arxiv.org/abs/1911.01547) (90 min, 60+ pages); [ARC Prize site](https://arcprize.org/) (~20 min) for ARC-AGI-1/2/3 rules and leaderboards
- [MMLU-Redux / "Are We Done with MMLU?" (2024)](https://arxiv.org/abs/2406.04127) (45 min) for MMLU errata

### MMLU family

**MMLU (2020)**: 15,908 four-option MCQs across 57 subjects, scraped from exams and study

guides. Metric: accuracy, historically 5-shot without CoT; modern reports use 0-shot CoT.

Random chance 25%. It defined 2021-2023 model comparisons (GPT-4's 86.4% was a headline).

Known issues, all documented:

- **Errata**: MMLU-Redux found ~6.5% of questions have errors (wrong gold labels,
  ambiguous or unanswerable items); the virology subset is notoriously bad (~57% flawed).

- **Contamination**: questions come from public web sources; verbatim and paraphrase
  overlap with pretraining corpora is widespread.

- **Saturation**: frontier average is ~92%+ in 2026; remaining headroom is mostly errata.
  Status: retired as a discriminator; still used as a mid-training sanity check.

**MMLU-Pro (2024)**: 12K harder questions, 10 options (chance 10%), reasoning-heavy,

requires CoT (CoT beats direct answer by up to ~20 points, the reverse of MMLU). Cleaned

of many MMLU trivia items. Frontier models are now high-80s to low-90s: saturating at the

top but still useful for mid-tier and open-weight comparisons.

**SimpleQA (2024, OpenAI)**: not knowledge breadth but factual reliability: 4,326

short-form questions graded correct / incorrect / not attempted. Used mainly to report

hallucination and abstention behavior; still active because calibration remains unsolved.

### GPQA (2023)

Graduate-level Google-proof QA: 448 questions in biology, physics, chemistry, written by

PhD-holders, validated so that skilled non-experts with unrestricted web access got only

~34% (experts ~65-74%). **GPQA Diamond** is the clean 198-question subset (both experts

correct, most non-experts wrong) and is the number everyone reports.

- Format: 4-option MCQ, accuracy; sensitive to answer-choice ordering shuffles, so good
  reports average over permutations.

- Trajectory: GPT-4 ~36% (2023), o1 ~78% (2024), frontier ~92-95% by mid-2026
  (Gemini 3.1 Pro ~95%, GPT-5.4 ~92%, Claude Opus 4.6 ~91%).

- Status: saturating at the frontier; above ~90% remaining errors overlap with disputed
  items (a few percent of gold labels are contested). Still the best single MCQ

  discriminator for the 60-90% band, so it remains on model cards.

- 198 questions means wide binomial error bars: a 2-point gap on Diamond is noise
  (95% CI is roughly +/- 4 points at these scores).

### Humanity's Last Exam (2025)

CAIS + Scale AI crowd-sourced ~2,500 questions (from ~70K submissions, ~1,000

contributors) explicitly selected because frontier models of late 2024 failed them.

Multi-domain (math is ~40%), ~14% multimodal, mix of exact-answer and MCQ; graded by an

LLM judge (GPT-4o rubric originally, o3-mini-class judges later). A private held-out split

exists to detect overfitting to the public set. Also reports calibration error: models are

confidently wrong on it.

- Trajectory: launch SOTA ~9% (early 2025), ~25-30% by mid-2025 (with tools), ~46%
  no-tools SOTA on the official leaderboard as of Aug 2026; tool-augmented and heavy

  scaffolds report 55-65% on third-party aggregators. Always check the tools/no-tools

  protocol before comparing numbers.

- **Errata is the big caveat**: FutureHouse (2025) found ~29% of text-only chem/bio
  answers contradicted by peer-reviewed literature; Scale's own review found ~18% expert

  disagreement overall. Roughly: ~50% solidly supported, ~30% contradicted, ~20% nuanced.

  **HLE-Verified (2026)** re-verified and revised the set down to 668 clean items;

  models gain 30-40 points on items whose statement or gold answer was wrong, which

  means part of the unsolved residue in raw HLE is unfixable noise, giving an effective

  ceiling well below 100%.

- Use: headline "frontier reasoning" number of 2025-26; treat absolute values with
  skepticism, deltas between models on the same harness are more meaningful.

### ARC-AGI family

Chollet's Abstraction and Reasoning Corpus: few-shot induction of novel grid

transformation rules. Designed to measure skill-acquisition efficiency (fluid

intelligence) rather than stored knowledge; every task is novel, so pretraining

contamination is structurally limited (though the format itself can be trained for).

- **ARC-AGI-1 (2019)**: 800 public + private eval tasks; metric is % solved with 2
  attempts. GPT-class models scored ~0-5% for years; program-synthesis hybrids ~30-40%;

  o3 hit 75.7% (semi-private, $ capped) and 87.5% (unlimited compute) in Dec 2024, which

  effectively ended it as a frontier target. The efficiency framing survives: score per

  dollar became part of the reporting.

- **ARC-AGI-2 (2025)**: same format, tasks calibrated so humans still solve them (avg
  human ~66%, panels ~100%) but 2024-era reasoners scored ~1-4%. Prize target: 85% within

  Kaggle compute limits. Progress was violent: ~4% (mid-2025), Gemini 3 Deep Think ~85%

  (Feb 2026), high-80s/low-90s reported by aggregators for GPT-5.6-class and Opus-5-class

  systems by Aug 2026; official leaderboard numbers are lower (high-60s) because of cost

  caps and protocol. Treat "ARC-AGI-2 solved" claims with care: leaderboards differ in

  compute budget, retries, and public vs semi-private sets.

- **ARC-AGI-3 (launched 2026-03-25)**: pivot from static puzzles to interactive
  turn-based game environments; the agent must explore, infer the goal, and plan without

  instructions. Metric: % environments completed. Humans: 100%. Frontier at launch: <1%;

  Aug 2026 SOTA ~30% (Claude Opus 5). The only major reasoning benchmark with large

  headroom as of today; ARC Prize 2026 runs a $2M pool across ARC-AGI-2/3 tracks.

### What to actually use in Aug 2026

- Frontier discrimination: HLE (with errata caveats), ARC-AGI-3, GPQA Diamond for the
  sub-frontier band.

- Regression testing your own stack: MMLU-Pro subsets are cheap and stable; full MMLU
  only as a smoke test.

- Never compare across harnesses without checking: shots, CoT, tools, answer-extraction
  regex, and MCQ option shuffling. See [Benchmark methodology: how benchmarks are used, misused, and die](benchmark-methodology.md).
