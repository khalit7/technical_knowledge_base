# Visualisation ideas: Testing and quality

Scored 1 to 5 on teaching value (T), real data available (D), cost to build (C, 5 = cheap). Built ones first.

| Idea | T | D | C | Placement | Status |
|---|---|---|---|---|---|
| Same bug, two kinds of test: the buggy chunker under three example tests (all pass) against the real Hypothesis run (seed 6, all 25 logged calls), stepping through generation, first failure and shrinking to `'0'`, size 2; third mode runs the property on the fixed code (100 calls, all pass). Characters coloured covered or lost, call strip, smallest-failure highlight, counters, captions. | 5 | 5 (trace_6.json, trace_6_fixed.json) | 3 | Reading, s-prop | built (the page's before/after animation) |
| Mutation lab: 10 test functions as checkboxes, live line coverage and mutation score from the real kill matrix (23 mutants x 26 test cases), source with covered lines, mutant list with kill status and kind (crash or value), click for the killing test's code, challenge preset (fewest tests that kill all: 3, by exhaustive search). | 5 | 5 (killmatrix.json, coverage_per_test.json) | 3 | Tab | built |
| Pyramid and trophy side by side, click a layer for catches/misses/speed/tools, with measured speeds where this page has them. | 3 | 3 | 5 | Reading, s-shape | built |
| Flaky-run strip: 2,000 real runs of the unseeded test, one square each, from the JUnit XML. | 4 | 5 | 5 | Reading, s-flaky | built |
| Measured terminal blocks (integration cost, float32 order, smoke test, coverage report, mutmut survivors) generated from inputs/ so numbers come from data. | 3 | 5 | 5 | Reading | built |
| Stateful LRU shrink animation (sequence of put/get shrinking to 5 steps) | 3 | 2 (only the final sequence was logged) | 3 | - | rejected: the final 5-step sequence shown as output teaches the point; logging intermediate sequences adds little |
| CI pipeline timeline simulator (jobs, caching, cancel-in-progress) | 3 | 1 (no real CI run) | 2 | - | rejected: would be illustrative only; the dated YAML plus the rules list is enough |
| Flakiness rate calculator (P(suite green) from N tests at p flakiness) | 3 | 2 | 4 | - | rejected: the measured strip makes the point with real data; maybe later |
| SQLite vs PostgreSQL side-by-side query animation | 2 | 5 | 4 | - | rejected: one failing assert says it; static output kept |

## Data and formulas
- Hypothesis: `experiments/hyp/trace.py` (20 seeds, `@seed(s)`, `database=None`), `trace_one.py 6`, `trace_fixed.py`. The page's JS ports `chunk()` and checks it reproduces every recorded result (error box otherwise).
- Mutation: mutmut 3.8.0 runs (`run_weak_tail.log`, `run_strong_tail.log`), then `experiments/killmatrix.py` runs both suites against each mutant via `MUTANT_UNDER_TEST`; per-test coverage via coverage.py `dynamic_context = test_function`.
- Flaky: pytest-repeat `--count=2000`, 6 batches; pytest-randomly seeds 1..200.
- Every derived number is recomputed by `recompute.py` and compared with `window.TQ.calc` in `check_page.mjs`.

## Inspiration
DeepSeek MLA explainer (step animation controller reused via code_design's RD.anim); Hypothesis's own shrinking explanations; Google's mutation-testing-in-code-review papers for the lab's "which test kills it" framing.

## What the methodology lacked
Nothing structural; for an engineering page the "real data" rule meant running experiments rather than fetching published numbers, and the main risk was environment drift (shrink results varied slightly between repeated runs of the same seed), handled by storing the logged runs and reading the page from them.
