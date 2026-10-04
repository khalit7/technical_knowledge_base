# Agent and trajectory evaluation: visualisation ideas

Central question: when you grade your own agent, which grader (message, outcome, steps) gives which verdict on the same trial, and why?

Scores: Q quantity the reader moves, R reproduces a published figure (x2), C computable from public data (x2), S shows what a sentence cannot, M corrects a misconception, P page's central question, N absent elsewhere, A before/after animation; minus build cost.

| # | Idea | Q | R | C | S | M | P | N | A | Cost | Total | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ATJ1 | **One trajectory, three graders, animated**: five real τ²-bench airline trials (GPT-5.2, Opus 4.5) stepped call by call; message, final-state and step panels say what each grader would conclude if the run stopped there; DB diff computed with τ²-bench's environment; lens toggle; play/step/scrub/speed | 1 | 2 (x2: recorded rewards reproduced 200/200 by re-grading) | 2 (x2) | 2 | 2 ("All set" is not evidence; outcome rewards inaction; gold can be wrong) | 2 | 2 | 2 | -2 | 19 | Reading, rd-anim | built |
| ATJ2 | **Do-nothing agent** through τ²-bench's evaluator: 23/50 airline, 11/114 retail (DB only), 0/114 telecom; per-model passes split by no-change tasks | 0 | 1 (x2: by construction from tau2's code) | 2 (x2) | 2 | 2 (83% overall is 72% on tasks needing a change) | 2 | 2 | 0 | -1 | 14 | Reading, rd-outcome | built |
| ATJ3 | **Three graders, 400 trials** tab: pass rate under five graders; 2x2 agreement between any two, filters, trial lists and cards, jump to the animation | 2 | 2 (x2: pass^1 83.0/84.0 = leaderboard) | 2 (x2) | 2 | 2 | 2 | 2 | 0 | -1 | 19 | Own tab | built |
| ATJ4 | **Path matchers** tab: agentevals' 4 match modes x 4 argument modes, all calls or writes only, on 400 trials; JS port checked against the Python port on 160 verdicts | 2 | 1 | 2 (x2) | 2 | 2 (strict path match agrees with the outcome on 38 of 200) | 2 | 2 | 0 | -1 | 16 | Own tab | built |
| ATJ5 | Task strip: 50 tasks by successes of 8, no-change tasks outlined, tap for outcomes | 1 | 2 (x2: pass^4 72.0/70.0) | 2 (x2) | 1 | 1 | 1 | 1 | 0 | 0 | 13 | Reading, rd-rel | built |
| ATJ6 | Cost bars: mean agent cost and calls, passing against failing trials | 0 | 0 | 2 (x2) | 1 | 1 | 1 | 1 | 0 | 0 | 8 | Reading, rd-cost | built (small) |
| ATJ7 | pass^k animation on real trials | | | | | | | | | | | | rejected: owned by Agentic benchmarks (linked) |
| ATJ8 | DevAI agent-judge vs LLM-judge bars | | | | | | | | | | | | rejected: two self-reported numbers; the root's Judge atlas owns judge readings |
| ATJ9 | Running a PRM or LLM judge on the trials live | | | | | | | | | | | | rejected: no network, no model in the page; recorded judge verdicts used instead |
| ATJ10 | MOLE monitor audit | | | | | | | | | | | | rejected: the MOLE paper page runs it (linked) |
| ATJ11 | OpenTelemetry span tree of a trial | 0 | 0 | 1 | 1 | 0 | 1 | 1 | 0 | -1 | 3 | | rejected: a table of span names and opt-in attributes says it; tau2 files are not OTel traces |
| ATJ12 | SWE-bench experiments-repo trajectories | | | | | | | | | | | | rejected for this build: τ²-bench gives three graders on the same trial, which SWE-bench (tests only) does not; time budget |

Data and formulas: `inputs/tau2_airline_trials.json` (400 rows, from the released files, MIT), `inputs/tau2_cases.json` (five trials with steps, gold, judge verdicts and the DB diff). pass^k = mean C(c,k)/C(n,k). Do-nothing agent: messages truncated after the first user turn, `evaluate_simulation(..., EvaluationType.ALL)` at tau2 commit 5bfa7e3. agentevals port: `match_port.py`.

What the methodology lacked: a rule for graders that are themselves recorded data (the judge verdicts stored in a trajectory file): treat them as a dated reading of that judge, not re-run, and say so.
