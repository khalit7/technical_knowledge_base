# Agentic benchmarks: visualisation ideas

Central question: what does an agent benchmark number measure (which system, how reliably, and could the environment have produced it)?

Scores: Q quantity the reader moves, R reproduces a published figure (x2), C computable from public data (x2), S shows what a sentence cannot, M corrects a misconception, P page's central question, N absent elsewhere, A before/after animation; minus build cost.

| # | Idea | Q | R | C | S | M | P | N | A | Cost | Total | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **One real task, three runs** (Terminal-Bench 2.0 regex-log: honest agent, RDI's curl-wrapper exploit on the shared-container verifier, same exploit against the 3.0/4.0 separate verifier); files and commands verbatim, counters for solution lines, real tests run, reward, time limit | 1 | 2 (x2: 82 of 89 curl tasks counted independently, matches RDI) | 2 (x2) | 2 | 2 (a reward of 1 is not evidence of a solution) | 2 | 2 | 2 | -2 | 17 | Reading, Anatomy | built (third mode labelled illustrative) |
| 2 | **pass^k against pass@k on real tau2-bench trials**, tasks as unit squares grouped by successes out of 4, filled by their contribution at k; any reproduced run | 2 | 2 (x2: published pass^1..4 exactly, 27 of 36 files) | 2 (x2) | 2 | 2 (pass^1 is not reliability; ties at pass^4) | 2 | 2 | 2 | -1 | 19 | Reading, pass^k | built |
| 3 | **pass^k tab**: all reproduced runs, rank changes with k, two runs task by task, plug-in curve beyond k = 4 (labelled), non-reproducing files listed | 2 | 2 (x2) | 2 (x2) | 2 | 2 | 2 | 2 | 0 | -1 | 18 | Own tab | built |
| 4 | **METR time horizon fit** on the released v1.1 runs (logistic on log2 human minutes, diversity weights, Newton in the browser), METR's bins, 80% horizon; trend with movable window and the 16 h rule | 2 | 2 (x2: every p50 within 0.02% of METR; doubling 128.7 and 187.8 days exactly) | 2 (x2) | 2 | 2 (7 months is stale: 4.2) | 2 | 1 (Anthropic page has a trend tab; nobody fits per-task data) | 0 | -1 | 17 | Own tab | built |
| 5 | **Grade a real task**: the reader's regex through regex-log's real test (Python re.findall semantics ported), exploit matrix, RDI catalogue with defences | 2 | 1 (x2: verdicts match Python re on presets) | 2 (x2) | 2 | 2 | 2 | 2 | 0 | -1 | 16 | Own tab | built |
| 6 | **Terminal-Bench 4.0 board, every entry**: score against dollars (log), effort ladders, pass@1 with CI against pass@5 | 1 | 2 (x2: board values) | 2 (x2) | 2 | 2 (rank flips with pass@5; effort spread) | 2 | 1 (root Same model tab shows Astra rows only) | 0 | 0 | 15 | Reading, The harness | built |
| 7 | **Terminal-Bench version timeline** with task counts, verifier mode, timeouts counted from task files at each tag | 1 | 2 (x2: 89, 74, 66; 82 curl; 66 separate) | 2 (x2) | 1 | 2 ("no 3.x" was wrong) | 1 | 2 | 0 | 0 | 15 | Reading, Terminal | built |
| 8 | Real tau2 airline task card with each model's 4 trial outcomes | 0 | 0 | 2 (x2) | 1 | 1 | 1 | 2 | 0 | 0 | 9 | Reading, Customer service | built (small) |
| 9 | OSWorld 2.0: one model, six numbers (binary/partial, releases, sets) | 0 | 2 | 2 | 2 | 2 | 1 | 0 | 0 | 0 | | | rejected: the root's Same model tab has the OSWorld Claude case; a table and correction box here |
| 10 | METR doubling-time explorer as a standalone tab | | | | | | | | | | | | merged into 4 (Anthropic page already has a doubling-fit tab) |
| 11 | Error-bar calculator for agent scores | | | | | | | | | | | | rejected: the root's Same model tab owns it; linked |
| 12 | HarnessTax per-pair scatter | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 0 | 0 | | | rejected: per-pair values only in images; key figures quoted in text |
| 13 | Animated OSWorld gold-file exploit | 1 | 0 | 1 | 1 | 1 | 1 | 1 | 2 | -2 | | | rejected: task configs not fetched; one exploit animation (1) teaches the isolation point, the table covers the rest |

Data and formulas: tau2 submissions and S3 trajectory files (`inputs/tau2_trials_2026-10-04.json`), pass^k = mean C(c,k)/C(n,k), pass@k = mean 1 - C(n-c,k)/C(n,k) (Yao et al. 2024). METR `runs.jsonl` aggregated per agent and task (`inputs/metr_runs_agg_1_1.json`), sklearn `LogisticRegression(C=1e5)` as in METR's `utils/logistic.py`. Terminal-Bench task files at tags (surveys in `inputs/`). Board JSON from tbench.ai page data.

What the methodology lacked: a rule for leaderboard files that do not reproduce their own published numbers (here: keep them out of charts, list them with both values); and a rule that solver tolerance, not the method, explains sub-0.1% differences when refitting a published model (checked by refitting with a tight tolerance).
