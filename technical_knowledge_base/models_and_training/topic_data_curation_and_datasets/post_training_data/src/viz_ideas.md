# Visual ideas (2026-10-15)

Central question: what is a post-training row made of, and how do you know its "what good looks like" part is right?
Scores 0 to 2 per methodology question; reproduces and computable count double; build cost subtracted.

## Built
| Idea | Score | Placement | Why |
|---|---|---|---|
| Self-Instruct ROUGE-L filter, same candidate stream with filter on and off (animation, real Dolly candidates, 175 real seeds, JS LCS) | 11 | Reading 2 | Before/after on one input; shows the filter measures wording; the Alpaca measurement reproduces the strict > 0.7 rule independently |
| Mixtures by skill (Tulu 3, OLMo 2, Dolci) from full-set statistics | 8 | Reading 2 | Every row counted; shows what changed between generations |
| Lineage table on one set of metrics (7 sets) | 8 | Reading 2, Atlas | Same measurements across five years of SFT data |
| Generator bars (who wrote chosen and rejected) | 7 | Reading 3 | Licence exposure is countable; corrects "permissive pool only" |
| Judge-rescue labels bar | 7 | Reading 4 | Turns "the judge accepted 76%" into what it accepted |
| Real row, tokens coloured by loss mask | 7 | Reading 5 | Links template and mask to tokens; links Alignment page for the mechanics |
| Trained-token share across sets | 8 | Reading 5 | 14% to 98%: rows are not a budget unit |
| Binarization rules animation on real UltraFeedback prompts (three rules) | 10 | Reading 6 | Before/after: same ratings, different pairs |
| Length bias across 8 sets, by gap, by subset | 10 | Reading 6, Pair inspector | Measured; human labels lean too; delta pairs lean more |
| One R1 answer through six extractors, answer-only vs whole text (animation) | 10 | Reading 7 | Shows where each extractor looks |
| Extractor accept rates on 12,358 answers; agreement matrix | 10 | Reading 7, Checker lab | Checker choice changes the reward |
| OLMo 3 rollouts re-checked against Ai2's counts | 9 | Reading 7, Checker lab | Reproduces Ai2's counts with their checker; shows partial-credit IF reward |
| Pass-rate histogram of every OLMo 3 RL row | 7 | Reading 7 | The 62.5% cut is visible in the data |
| Mutation testing of code tests (sandboxed) | 10 | Reading 7 | Measures test strength; hand-read survivors |
| Trajectory step-through with trained and masked turns (real nebius trajectory) | 8 | Reading 8 | What a trajectory is as data |
| Prompt-overlap heatmap, contamination table with read labels | 8 | Reading 9 | Prompt reuse across stages; real copies vs boilerplate |
| Dataset timeline with detail panel | 7 | Atlas | One axis for all sets |
| Small judge in both orders (Qwen3-4B on GPU, 300 pairs) | 8 | Reading 6 | Measures position bias and consistency directly; cheap (about 30 minutes) |

## Rejected
- Local Qwen3 answers for the checker lab and our own delta pairs: dropped as expensive relative to what they add (R1 and OLMo 3 answers and the delta-learning paper cover them).
- Rebuilding the root lab's SFT filter animation, its contamination checker or its reference-solution checkers (owned there; linked).
- A loss-masking or packing animation (Alignment page and Storage and loading page own them).
- An RL environment simulator (Harnesses for training owns the Environment lab).
- Token-level n-gram contamination highlighter (Decontamination page owns it).

## What the methodology lacked
A rule for data pages whose truth is a checker: re-run the dataset's own checker and report whether its stored verdicts
reproduce (they did for Tulu 3's MATH verifier on OLMo 3's rollouts; they did not for Math-Verify across versions).
