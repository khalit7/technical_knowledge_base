# Visualisation ideas: SoL-Pi

Scored 1 to 5 on teaches-more-than-text (T), sourced data (D) and effort (E, 5 = cheap). Ranked by T.

| id | Idea | T | D | E | Placement | Data and formula |
|---|---|---|---|---|---|---|
| P-sol_pi.1 | Session replay: every request's prompt as a bar split into cache read and cache write, Pi against each mechanism on one session, stepped by plan step, Pi's profile dashed, counters vs Pi | 5 | 3 (rules and constants from the released code; session illustrative) | 2 | Replay a session tab (built) | `parts/15_js_sim.js`; prices recovered from Table 4 |
| P-sol_pi.2 | Compaction-gate explorer: the released decideCompaction ported, sliders for context, summarisable share, requests per step, steps left, cache price ratio, earlier compactions; payback against horizon bars and the reason in words | 4 | 5 (code, checked on 50,000 inputs) | 3 | Replay a session tab (built) | `parts/14_js_occ.js`, `check_occ.mjs` |
| P-sol_pi.3 | Tokens against dollars: the same Pi and SoL-Pi bars in tokens and in dollars at prices recovered from the table, behind a predict question (49% of tokens is 33% of dollars) | 5 | 5 | 4 | Reading, Tokens vs dollars (built) | Table 4 Opus 5 rows x $0.50/$6.25/$25 per million |
| P-sol_pi.4 | Hourly-saving derivation table behind a predict question: four cost differences over 102 hours reproduce the four printed per-hour figures | 4 | 5 | 5 | Reading (built) | Tables 1, 2 |
| P-sol_pi.5 | Cost against score map of every harness per model, arrow from Pi to the full stack, official reference line | 3 | 5 | 4 | Reading, EdgeBench (built) | Tables 1, 2 |
| P-sol_pi.6 | Figures 6 and 7 rebuilt from the PDF's printed labels, with the k/51 check | 3 | 5 | 4 | Tables tab (built) | `decode_figs.py` |
| P-sol_pi.7 | Recover a provider's per-token prices from a paper's cost table by least squares; an exact fit verifies the cost column, a failed fit shows the price sheet is not what it seems | 4 | 5 | 5 | recompute.py and Tables tab checks (built) | Table 4 |

Rejected: a reconstruction of the 152-idea funnel as an animation (the blog already has one, and the page cannot add data to it); a swarm cycle-curve replay (only final values are printed, the curves would need curve reading); a toy auto-research loop (nothing released to replay, and an invented loop would teach the method less than the mechanisms it produced).

What the methodology lacked for this page: a rule for harness papers whose mechanisms are released but whose traces are not. The approach here (run the released rules on an illustrative session, port any decision function and check it against the original code, and compare the simulator's direction, not its size, with the paper's table) may generalise.
