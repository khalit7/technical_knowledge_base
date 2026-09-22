# Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro

⏱ 10 min read · +6h 40m resources

### Best resources

- [GSM8K paper (Cobbe et al., 2021)](https://arxiv.org/abs/2110.14168) (45 min); [GSM-Symbolic (Apple, 2024)](https://arxiv.org/abs/2410.05229) (45 min) for the fragility critique
- [MATH paper (Hendrycks et al., 2021)](https://arxiv.org/abs/2103.03874) (45 min)
- [FrontierMath (Epoch AI, 2024)](https://arxiv.org/abs/2411.04872) (45 min) and [Epoch's FrontierMath trackers](https://epoch.ai/benchmarks) (~15 min)
- [MathArena](https://matharena.ai/) (~15 min): uncontaminated contest-time evals (AIME, HMMT, IMO)
- [HumanEval / Codex paper (Chen et al., 2021)](https://arxiv.org/abs/2107.03374) (90 min, 35 pages)
- [SWE-bench (Jimenez et al., 2023)](https://arxiv.org/abs/2310.06770) (45 min); [SWE-bench Verified writeup (OpenAI, 2024)](https://openai.com/index/introducing-swe-bench-verified/) (~12 min); [SWE-bench Pro (Scale, 2025)](https://labs.scale.com/leaderboard/swe_bench_pro_public) (~10 min)
- [LiveCodeBench](https://livecodebench.github.io/) (~15 min) and [LiveCodeBench Pro](https://livecodebenchpro.com/) (~15 min)

### Math

**GSM8K (2021, OpenAI)**: 8.5K grade-school word problems, free-form numeric answer, exact match; the benchmark chain-of-thought (CoT) prompting was demonstrated on. Now >95% for anything frontier, heavily contaminated, retired. **GSM-Symbolic** showed models drop sharply when names and numbers are templated or irrelevant clauses added: part of historical GSM8K performance was pattern matching, not arithmetic robustness.

**MATH (2021)**: 12.5K competition problems (AMC/AIME feeder level), 5 difficulty tiers,

LaTeX answers, exact match with normalization. MATH-500 is the common 500-problem eval

subset (from the PRM800K split). Saturated at the frontier (~99% on MATH-500); retired

from serious comparisons.

**AIME / HMMT (rolling vintages)**: each year's American Invitational Mathematics Examination (30 integer-answer problems) becomes an instant benchmark; using the current year's contest before it enters training data is the point. AIME 2024 and 2025 are near-solved by reasoning models (90-100% with consensus sampling); labs now report the newest vintage plus HMMT. **MathArena** formalizes this, evaluating models within days of a contest, before contamination is possible; it also runs the International Mathematical Olympiad (IMO) 2024/25/26 with human graders for proof-based problems (frontier models reached gold-medal level on IMO 2025 problems).

Protocol notes that change AIME numbers a lot: pass@1 vs maj@32 (consensus), temperature,

and token budget. A "93% AIME" without sampling details is not comparable to another.

**FrontierMath (2024, Epoch AI)**: ~300 research-level problems by professional mathematicians (Tao: "these will resist AIs for several years"), answers large exact objects checked programmatically, problems mostly private. Tiers 1-3 plus a 50-problem **Tier 4** of genuinely research-hard problems (v2 re-release after errata). Trajectory: <2% (2024), ~25% (o3-era claims, disputed protocol), high-80s on tiers 1-3 by mid-2026; Tier 4 remains the discriminator. Governance caveat: OpenAI funded it and had access to most problems, which Epoch disclosed late in 2024; Epoch maintains a true holdout set for independent runs.

**Formal math**: miniF2F (2021) and PutnamBench (2024) require machine-checkable Lean proofs, so there is no grading ambiguity; AlphaProof and successors drove miniF2F near saturation, PutnamBench still has headroom. Niche, but the cleanest metric design in the whole math space.

### Coding: the HumanEval lineage

**HumanEval (2021, Codex paper)**: 164 hand-written Python functions from docstrings, pass@k via unit tests, and the origin of the unbiased pass@k estimator. Saturated (>99%) and retired. **MBPP** (974 basic problems) same story. **EvalPlus / HumanEval+** hardened the test suites (80x more tests) and knocked several points off inflated scores: the lesson that weak test suites overstate correctness recurs in every code benchmark since. **BigCodeBench (2024)** moved to library-heavy, multi-call tasks; saturating.

**LiveCodeBench (2024)**: continuously harvests new problems from LeetCode, AtCoder and Codeforces with release dates attached, so any model can be evaluated on post-cutoff problems only: contamination control by construction. Also tests self-repair, test-output prediction and execution. Frontier models score ~90% on recent windows, so:

**LiveCodeBench Pro (2025)**: Olympiad/ICPC-grade problems annotated by medalists,

reports an Elo-style rating against the human distribution rather than pass@1

(frontier ratings around 2800-2900 in mid-2026, i.e. grandmaster-plus territory, but

still failing observation-heavy "insight" problems). Related: labs report Codeforces

ratings from live or simulated contest runs (o3's ~2700 was the 2024 headline; 2026

frontier models claim 3000+, top-tens-of-humans territory). International Olympiad in Informatics (IOI) and International Collegiate Programming Contest (ICPC) live runs

(gold-medal results in 2025/26) serve the same role for the "no contamination possible"

claim.

### Coding: the SWE-bench family

**SWE-bench (2023, Princeton)**: 2,294 real GitHub issues from 12 Python repos; the model gets the repo at the pre-fix commit plus the issue text and must produce a patch, scored by the repo's own fail-to-pass tests. It turned code evals from function completion into repo-level engineering and became the de facto coding-agent benchmark.

- **Lite (300)**: cheaper subset, popular 2024, now rarely reported.
- **Verified (500, 2024)**: OpenAI paid engineers to filter out broken tasks (underspecified issues, unfair tests: ~33% of the original had problems). The standard 2024-25 number. Aug 2026 state of the art (SOTA) ~97% (Claude Opus 5-class), effectively saturated, and known issues remain: solution leakage in issue comments, weak test suites, and repo-memorization effects (models perform notably worse on repos created after their cutoff, per SWE-bench-Illusion and SWE-rebench studies).
- **Pro (2025, Scale)**: 1,865 tasks from 41 repos, with copyleft-licensed and private commercial repos as a contamination guard, human-augmented problem statements, and requirements to match multi-file reference fixes. Public-split SOTA ~59% (Scale standardized harness), vendor-scaffold reports ~80%, private commercial split ~47%: a live illustration that scaffold and split choice can swing a "SOTA" claim by 30 points.
- **Multimodal (2024)**: JavaScript repos with screenshots/visual bug reports.
- **SWE-rebench / SWE-bench-Live**: continuously mined fresh issues, monthly updates,
  decontaminated by recency; increasingly cited as the honest alternative.

- **Real-SWE (2026, Specific Labs)**: ten tasks licensed from real companies' production repositories (median 11 files changed per task), each model run in its native harness over 640 scored rollouts. Sep 2026: Claude Fable 5.1 38.8%, GPT-6 Astra 33.8%, Gemini 3.8 Flash 31.2%, GLM-5.3 28.8%, Grok 4.6 and Muse Spark 1.3 23.8%, Kimi K3 18.8%, GPT-5.6 Sol 16.2%; six of ten tasks resolved under 15%, missed requirements was the commonest failure, 71.4% of rollouts finishing in under ten minutes failed, and cost per rollout ($2.50 to $6.96) had no relationship to score. Against the same models' Terminal-Bench 4.0 figures, private code costs roughly 20 points. The licensing model is the methodological contribution: repositories that are not public cannot leak into training data, which is the only contamination defence that does not depend on the benchmark being new. [Real-SWE](https://withspecific.com/benchmarks/real-swe) (15 min)
Metric subtlety: % resolved conflates model and agent harness (scaffold, retries, test execution, compute budget). Leaderboards mark "open scaffold vs bash-only vs proprietary"; never compare across those columns. SWE-bench counts as an agentic benchmark for this reason; see [Agentic benchmarks: GAIA, OSWorld, WebArena, tau2, Terminal-Bench, MCP evals](agentic-benchmarks.md).

**Aider Polyglot (2024)**: 225 hard Exercism problems across 6 languages in an edit-format harness; practitioner-favored because it correlates with real coding-assistant usefulness and is cheap to run.

**Phi-Bench (2026)**: infrastructure engineering rather than application code: 85 open-ended tasks in nine categories (training systems, inference and serving, kernels, hardware adaptation, data infrastructure and others) in three escalating formats, 55 single-file kernel completions, 20 multi-file repository implementations and 10 end-to-end optimisations where the model must find the bottleneck itself. It is built three ways, from pull-request and issue reconstruction, agent-assisted mining with generated tests, and expert curation where no pull-request history exists, grounded in 2,260 papers and 1,852 engineering artifacts. Claude Opus 5 leads at 36.53%, Kimi K3 28.12%, Qwen3.8-Max 27.73%; hardware and edge tasks collapse to 5.4% and longer reasoning budgets do not reliably help. Summary in [Φ-Bench: Can Large Language Models Engineer the Infrastructure That Powers Them?](../../papers/2026-09_phi-bench/summary.md).

### What to actually use

- Model-level codegen: LiveCodeBench (latest window) plus LiveCodeBench Pro rating.
- Agentic engineering: SWE-bench Pro (state the split and scaffold), Terminal-Bench 4.0 (current since Sep 2026; 2.x scores are not comparable to it) and Real-SWE for a private-code sanity check; SWE-bench Verified only for continuity with old reports.
- Math: current-year AIME/HMMT via the MathArena protocol, FrontierMath tiers for frontier claims; GSM8K/MATH only as cheap regression smoke tests for small models.
