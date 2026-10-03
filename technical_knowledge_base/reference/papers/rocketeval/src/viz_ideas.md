# RocketEval: visualisation ideas

Question the page keeps returning to: when can a small judge stand in for a frontier judge, and at what level (ranking a field against single verdicts)?

| # | Idea | Placement | Score | Status | Data |
|---|---|---|---|---|---|
| P-rocketeval.1 | **Re-rank the leaderboard from released grades**: GPT-4o's WildBench grades of the 12 test models reproduce Table 3's GPT-4o row (0.909 / 0.979) independently; bootstrap over queries, per-response noise sigma and per-model bias tau, presets calibrated to the released small-judge gradings; bump chart, 200-draw histogram with Table 3's values marked, 66-pair grid | Own tab | 13 | built | `inputs/released.json`; shows independent noise at r 0.29 still ranks near 0.96 while a 0.2-point per-model bias costs more |
| P-rocketeval.2 | **RocketEval against the CoT judge, animated** on one released grading (prefix to scale, 7 independent items with real p-hat, Figure 5 flip rates inside the CoT analysis, counters) | Reading, Method | 11 | built | released grading, Table 5, Figure 5 decoded |
| P-rocketeval.3 | **Replay four real gradings** by Qwen2.5-0.5B and 3B with soft/hard toggle beside GPT-4o's grade and analysis; includes a failure (the checklist does not name the right YouTuber) | Reading, Method 2 | 11 | built | HF judgment files |
| P-rocketeval.4 | **Scatter of 1,000 released gradings against GPT-4o**, soft vs hard correlation per judge | Reading, Method 2 | 10 | built | soft beats hard for all three judges |
| P-rocketeval.5 | **Figures 4 and 5 rebuilt from vector PDF rectangles** | Reading, Diagnosis; Tables tab | 9 | built | `decode_figs.py` |
| P-rocketeval.6 | **Alpha as label entropy**: ten-grade picker, alpha live, histogram over 1,015 real queries | Reading, Method 3 (predict reveal) | 9 | built | released train-model grades |
| P-rocketeval.7 | **Kendall as discordant pairs** (66 cells per judge) behind a predict question | Reading, Results; Tables tab | 9 | built | Table 3 |
| P-rocketeval.8 | **Cost calculator** with batch/standard OpenAI prices, log-log lines, break-even against GPT-4o-mini (about 16 runs); finds the Llama-3-70B row mismatch | Reading, Cost; Tables tab | 10 | built | Table 4, archived pricing page |
| P-rocketeval.9 | **Results dumbbell** (baseline to Ours, Sup. squares) for Tables 2 and 3 with reference lines | Reading, Results | 8 | built | tables.json |
| P-rocketeval.10 | Figure 1 scatter (agreement against Open LLM Leaderboard average) | none | 5 | rejected | only labels printed, no values; the two legend numbers are quoted instead |
| P-rocketeval.11 | Recomputing Table 2 from released data | none | 4 | rejected | gradings exist for 3 of 6 human-judged models; the subset check is quoted in How much to believe |
| P-rocketeval.12 | Running a small judge in the browser | none | 2 | rejected | far over the size limit; released gradings replace it |

Methodology note: for a judge or benchmark paper, the released per-item grades are the live ingredient; resampling the queries gives the error bars the paper omits, and a "noise plus bias" model separates what averages out from what does not.
