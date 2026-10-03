# Visualisation ideas: Prime Agent

Central question: does the harness, rather than the model, explain the scores, and how far does the evidence isolate that? Every visual below makes part of it measurable.

| # | Idea | What it shows, and what the reader does | Placement | Score | Status |
|---|---|---|---|---|---|
| P-prime_agent.1 | **Rescore the released ARC-AGI-3 run**: RHAE recomputed level by level from the scorecard API (actions against the upper-median human), with rule controls (cap 100/115/132%, efficiency power 1/2/3, level weights), a 25-game by 10-level grid with per-cell detail, and the ten public-set community scorecards beside it | Rescore tab (live ingredient) | 2+2+2+2+2+2+2 = 14 | built; reproduces all 11 printed scores to 0.001 independently |
| P-prime_agent.2 | **Scorecard replay, game by game, two cards side by side** (Continual Harness June against Prime Agent; Human Intelligence Harness; Tycho), levels drawn to scale against the human tick, running RHAE | Rescore tab | 2+2+2+1+2 = 9 | built |
| P-prime_agent.3 | **A subagent as a blocking tool call against rlm() and messages, animated**: the Appendix B task (reviewer, tester, follow-up) through both designs, bands L1/L2/L3, child lifecycles, daemon queue, parent-blocked timeline, counters | Reading, Idea | 1+0+1+2+1+2 = 7 (illustrative, labelled) | built |
| P-prime_agent.4 | **Clickable state hierarchy** (Figure 2): each level's contents and the mechanism that changes it | Reading, Idea | 6 | built |
| P-prime_agent.5 | **Figure 5 rebuilt from vector paths**, tokens/cost toggle, external references marked | Reading, ARC | 2+2+2+1+2 = 9 | built; every end point equals its label |
| P-prime_agent.6 | **Factorio replay from decoded Figure 9**: technology steps, 1,560-point active-subagent trace, cumulative count, reset marker, counters | Reading, Factorio | 2+2+2+1+2 = 9 | built |
| P-prime_agent.7 | Predict-then-reveal: public-set scorecards above 95.5% (three), Table 1 pairs won (20 of 27, gap plot with the 0.02 band), nanoGPT records (no difference; Figure 6 with raw counts and exact tests) | Reading | 10 | built |
| P-prime_agent.8 | **Table 1 with paper/blog toggle** (one changed cell: Codex OOLONG 0.500 to 0.900), gaps coloured by the 0.02 band, sort by mean gap | Tables tab | 8 | built |
| P-prime_agent.9 | **Figure 10 decoded with the clipped data**: the SVG keeps points beyond the $45 window behind a clip path; a checkbox shows them | Tables tab | 7 | built |
| P-prime_agent.10 | Figures 6, 7, 8 rebuilt with counts, decoded reach costs and standard errors; 45 checks | Tables tab | 7 | built |
| P-prime_agent.11 | Live REPL-against-context toy (an OOLONG-style aggregation done by code vs by reading) | none | would invent token counts the paper does not give | rejected |
| P-prime_agent.12 | Then and now tab | none | a September 2026 result; What it takes covers adoption | rejected |
| P-prime_agent.13 | Training-bill or cost tab | none | a pattern Khalid removed | rejected |

Lessons for the method: for agent papers on ARC-AGI-3, the scorecard API (`/api/v3/scorecards/<id>`) returns per-level actions and baselines for any linked run, so a released run can be rescored exactly and set beside every community card on the same games. Diff a lab's launch blog against the paper: here it held the run count behind "Best@1", the Best@3 figure, the fork lineage and an earlier version of the main table. Vector figures can hide clipped data behind clip paths.
