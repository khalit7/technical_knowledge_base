# Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro

Last updated: 2026-08-24.

## Best resources

- [GSM8K paper (Cobbe et al., 2021)](https://arxiv.org/abs/2110.14168); [GSM-Symbolic (Apple, 2024)](https://arxiv.org/abs/2410.05229) for the fragility critique
- [MATH paper (Hendrycks et al., 2021)](https://arxiv.org/abs/2103.03874)
- [FrontierMath (Epoch AI, 2024)](https://arxiv.org/abs/2411.04872) and [Epoch's FrontierMath trackers](https://epoch.ai/benchmarks)
- [MathArena](https://matharena.ai): uncontaminated contest-time evals (AIME, HMMT, IMO)
- [HumanEval / Codex paper (Chen et al., 2021)](https://arxiv.org/abs/2107.03374)
- [SWE-bench (Jimenez et al., 2023)](https://arxiv.org/abs/2310.06770); [SWE-bench Verified writeup (OpenAI, 2024)](https://openai.com/index/introducing-swe-bench-verified/); [SWE-bench Pro (Scale, 2025)](https://labs.scale.com/leaderboard/swe_bench_pro_public)
- [LiveCodeBench](https://livecodebench.github.io/) and [LiveCodeBench Pro](https://livecodebenchpro.com/)

## Math

**GSM8K (2021, OpenAI)**: 8.5K grade-school word problems, free-form numeric answer,
exact match. The benchmark that CoT prompting was demonstrated on. Now: >95% for anything
frontier, heavily contaminated, retired. **GSM-Symbolic** showed models drop sharply when
names/numbers are templated or irrelevant clauses added: part of historical GSM8K
performance was pattern matching, not arithmetic robustness.

**MATH (2021)**: 12.5K competition problems (AMC/AIME feeder level), 5 difficulty tiers,
LaTeX answers, exact match with normalization. MATH-500 is the common 500-problem eval
subset (from the PRM800K split). Saturated at the frontier (~99% on MATH-500); retired
from serious comparisons.

**AIME / HMMT (rolling vintages)**: each year's American Invitational Mathematics
Examination (30 integer-answer problems) becomes an instant benchmark; using the current
year's contest before it enters training data is the point. AIME 2024 and 2025 are
near-solved by reasoning models (90-100% with consensus sampling); labs now report the
newest vintage plus HMMT. **MathArena** formalizes this: evaluates models on contests
within days of the contest, before contamination is possible; also runs IMO 2024/25/26
with human graders for proof-based problems (frontier models reached gold-medal level on
IMO 2025 problems).

Protocol notes that change AIME numbers a lot: pass@1 vs maj@32 (consensus), temperature,
and token budget. A "93% AIME" without sampling details is not comparable to another.

**FrontierMath (2024, Epoch AI)**: ~300 research-level problems by professional
mathematicians (Tao: "these will resist AIs for several years"), answers are large exact
objects checked programmatically, problems mostly private. Tiers 1-3 plus a 50-problem
**Tier 4** of genuinely research-hard problems (v2 re-release after errata). Trajectory:
<2% (2024), ~25% (o3-era claims, disputed protocol), high-80s on tiers 1-3 by mid-2026;
Tier 4 remains the discriminator. Governance caveat worth remembering: OpenAI funded it
and had access to most problems, which Epoch disclosed late in 2024; a true holdout set
is maintained by Epoch for independent runs.

**Formal math**: miniF2F (2021) and PutnamBench (2024) require machine-checkable Lean
proofs, so there is no grading ambiguity; AlphaProof and successor systems drove miniF2F
near saturation, PutnamBench still has headroom. Niche but the cleanest metric design in
the whole math space.

## Coding: the HumanEval lineage

**HumanEval (2021, Codex paper)**: 164 hand-written Python functions from docstrings;
metric pass@k via unit tests, introduced the unbiased pass@k estimator. Saturated (>99%)
and retired. **MBPP** (974 basic problems) same story. **EvalPlus / HumanEval+** hardened
the test suites (80x more tests) and knocked several points off inflated scores: the
lesson that weak test suites overstate correctness recurs in every code benchmark since.
**BigCodeBench (2024)** moved to library-heavy, multi-call tasks; saturating.

**LiveCodeBench (2024)**: continuously harvests new problems from LeetCode, AtCoder,
Codeforces with problem release dates attached, so you can evaluate any model only on
post-cutoff problems: contamination control by construction. Also tests self-repair,
test-output prediction, execution. Frontier models score ~90% on recent windows, so:

**LiveCodeBench Pro (2025)**: Olympiad/ICPC-grade problems annotated by medalists,
reports an Elo-style rating against the human distribution rather than pass@1
(frontier ratings around 2800-2900 in mid-2026, i.e. grandmaster-plus territory, but
still failing observation-heavy "insight" problems). Related: labs report Codeforces
ratings from live or simulated contest runs (o3's ~2700 was the 2024 headline; 2026
frontier models claim 3000+, top-tens-of-humans territory). IOI/ICPC live runs
(gold-medal results in 2025/26) serve the same role for the "no contamination possible"
claim.

## Coding: the SWE-bench family

**SWE-bench (2023, Princeton)**: 2,294 real GitHub issues from 12 Python repos; the model
gets the repo at the pre-fix commit plus the issue text and must produce a patch; scored
by the repo's own fail-to-pass tests. This turned code evals from function completion
into repo-level engineering, and became the de facto coding-agent benchmark.

- **Lite (300)**: cheaper subset, popular 2024, now rarely reported.
- **Verified (500, 2024)**: OpenAI paid engineers to filter out broken tasks
  (underspecified issues, unfair tests: ~33% of the original had problems). The standard
  2024-25 number. Aug 2026 SOTA ~97% (Claude Opus 5-class); effectively saturated, and
  known issues remain: solution leakage in issue comments, weak test suites, and
  repo-memorization effects (models perform notably worse on repos created after their
  cutoff, per SWE-bench-Illusion and SWE-rebench studies).
- **Pro (2025, Scale)**: 1,865 tasks from 41 repos, includes copyleft-licensed and
  private commercial repos as a contamination guard, human-augmented problem statements,
  requirements to match multi-file reference fixes. Public-split SOTA ~59% (Scale
  standardized harness) but vendor-scaffold reports reach ~80%, and the private
  commercial split sits near ~47%: a live illustration that scaffold + split choice can
  swing a "SOTA" claim by 30 points.
- **Multimodal (2024)**: JavaScript repos with screenshots/visual bug reports.
- **SWE-rebench / SWE-bench-Live**: continuously mined fresh issues, monthly updates,
  decontaminated by recency; increasingly cited as the honest alternative.

Metric subtlety: % resolved conflates model and agent harness (scaffold, retries, test
execution, compute budget). Leaderboards mark "open scaffold vs bash-only vs proprietary";
never compare across those columns. SWE-bench counts as an agentic benchmark for this
reason; see [agentic-benchmarks.md](agentic-benchmarks.md).

**Aider Polyglot (2024)**: 225 hard Exercism problems across 6 languages in an
edit-format harness; practitioner-favored because it correlates with real coding-assistant
usefulness and is cheap to run.

## What to actually use in Aug 2026

- Model-level codegen: LiveCodeBench (latest window) + LiveCodeBench Pro rating.
- Agentic engineering: SWE-bench Pro (state the split and scaffold) + Terminal-Bench 2.x;
  SWE-bench Verified only for continuity with old reports.
- Math: current-year AIME/HMMT via MathArena protocol, FrontierMath tiers for frontier
  claims; GSM8K/MATH only as cheap regression smoke tests for small models.
