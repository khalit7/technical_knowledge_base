# Judge bias lab (t-bias): visual ideas, data and checks

Question the tab answers: when the answers do not change, how far does an LLM judge's reading move, and what do the usual fixes buy back?

## Built

| Rank | Idea | Data | Placement | Check |
|---|---|---|---|---|
| 1 | **One pair, graded again and again** (before/after animation, 8 steps; play, pause, step, scrub, speed; on screen and visible tab only; paused under reduced motion). The Arena-Hard dice prompt: GPT-4 (0314) right, Claude 3 Opus wrong (divides by sqrt(100) twice). Cards swap places when the order swaps; verdict marker on the five-label scale; verbatim quote per verdict; running counters. Steps: gold line, GPT-4 Turbo order 1 (wrong answer much better), swapped (flips to the baseline), Claude 3 Opus both orders (own family, wrong both times), all ten verdicts (5 : 5), swap-and-require-agreement (1 : 1 : 3 ties), jury (no winner; without Anthropic judges, three ties), gold settles it | Released Arena-Hard-Auto v0.1 judgments of five judges (`inputs/pairs.json`, extracted by `extract_pairs.py`); exact distribution of the sum of 100 dice | Section 1 | `recompute.py` re-reads the ten raw verdicts and tallies; gold with a float DP: 317 to 383 holds 95.03%, Claude's 347 to 353 holds 16.2% |
| 2 | **Padding toggle**: same model (GPT-4 Turbo) asked to be concise or verbose on one AlpacaEval instruction, judge probability 0.0039% against 99.9997%; then the 805-instruction raw against length-controlled win rates | AlpacaEval released annotations and leaderboard file | Section 2 | Raw 22.92 and 64.30 recounted from annotations, independently matching the leaderboard file; 368 of 805 instructions flip |
| 3 | **Measured rates, one panel per study** (Position, Length, Own family). Position: Zheng Table 2 stacked consistent / first / second; recount of Arena-Hard per judge (GPT-4 Turbo 67.4%, Claude 3 Opus 56.9%, Gemini 1.5 Pro 58.6% with a recency lean, Claude 3.5 Sonnet 73.4%, Llama 3 70B 69.0%); recount of the MT-Bench leaderboard file (83.6%); Shi et al. Table 2 PC; Wang et al. Table 2 as a table (conflict rate is a different metric). Length: Zheng Table 3; AlpacaEval raw and LC bars. Own family: MT-Bench experts against GPT-4 judge on matched keys; Panickssery Table 7 with the 0.5 line; Arena-Hard judge-by-model delta heat table with own-family outlines | See sources in `mk_data.py` | Section 3 | Every Arena-Hard cell recomputed (own minus mean of the other four) |
| 4 | **Mitigations before and after**, one dumbbell per row with its own unit and scale | Zheng Tables 4 and 13, Wang Table 4, AlpacaEval LC, PoLL Table 1 | Section 4 | Typed from the papers; LC gap 9.7 and raw gap 41.4 recomputed |

## Rejected

- One chart of "bias rate by judge" across studies: the metrics differ (consistency, conflict rate, failure rate, self-preference score, win-rate deltas), and splicing them on one axis would mislead. Kept as separate panels.
- Padding the dice pair: no released dataset pads the same Arena-Hard answer, and calling a judge was ruled out, so padding uses a second real pair (AlpacaEval), said on the page.
- Claiming self-preference from the single dice pair: one pair is an anecdote (Claude 3 Opus may simply fail the sum, and GPT-4 Turbo's own worked answer made the same slip in one order). The aggregate heat table carries the claim, with its confounds.
- Separating the position effect from run-to-run variation on the dice pair: impossible from one released run per order; said in the caption, with Shi et al.'s repetition stability as the measured answer.
- Arena-Hard's official Bradley-Terry score per judge: needs the weighted strong-verdict counting and bootstrap; the sign-level win rate is enough for a within-dataset judge comparison and is labelled as this page's metric.
- Wataoka et al. self-preference on Chatbot Arena and JudgeBench outputs: left to the LLM-as-judge child and the Judge atlas tab.

## Notes for other tabs

- Zheng et al. Table 2's 65.0% GPT-4 consistency comes from two samples of the same model (hardest case); the released leaderboard file gives 83.6%. Do not quote 65% as "GPT-4 agrees with itself 65% of the time" in general.
- Zheng et al.'s text calls the repetitive-list table "Table 4"; it is Table 3 in v4.
- Figure 2(b) in v4 (not Figure 3) carries the self-enhancement observation.
