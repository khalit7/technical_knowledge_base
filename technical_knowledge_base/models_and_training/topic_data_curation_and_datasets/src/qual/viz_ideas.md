# Quality lab: visual ideas (built and rejected), 2026-10-14

Question the tab keeps returning to: **quality according to what, and what does each filter throw away?**

## Built
| # | Idea | Why it earns its place | Data |
|---|---|---|---|
| Q1 | Same shard before/after, animated (canvas, 6 steps: shard, score, sort, cut, drop into a pile, compare with a second filter; 6 filters; hand labels overlay; click a square to inspect) | Khalid's before/after pattern on one input; the dropped pile is visible, and step 6 shows disagreement square by square | run0 final, 2,617 docs, all scores |
| Q2 | Agreement explorer: scatter (edu score vs log DCLM P) + Jaccard-vs-keep-fraction curve with random baseline and Nemotron-CC's published point; keep-fraction slider and published cut-offs; three populations | Turns "the classifiers disagree" into a number that moves with the threshold; shows agreement depends on the population | run0, 2,000 FineWeb rows, 1,000 Nemotron-CC head docs; Nemotron Table 8 |
| Q3 | Document inspector: every classifier's score on its scale with the cut, hand label and reason, 300-char excerpt | Lets the reader check a wrong drop themself | 100 labelled docs |
| Q4 | Hand labels by stratum (stacked bars) and population-weighted wrong-drop estimates | Answers "what do filters wrongly drop" with a measurement and its error | labels.jsonl |
| Q5 | Learning curve of our fastText vs the published encoder's F1 | Shows how much the cheap model gets and from how many labels | 232k annotations |
| Q6 | Nemotron-CC level vs pass rate of each public classifier | Checks the buckets and shows max-ensemble behaviour | head samples |
| Q7 | DCLM pass rate by Llama 3 score (232k pages) | Agreement at scale without the encoder | annotations |
| Q8 | CCNet perplexity histogram with cc_net's own English cut-offs | Real CCNet model, not a stand-in | cc_net LM |
| Q9 | Predict-then-reveal: DCLM's lowest kept probability | Corrects reading fastText probabilities as calibrated | DCLM-baseline sample |

## Rejected
- Live fastText training in the browser: the model is 900 MB; the learning curve shows the same thing.
- ROC curves per classifier against Llama labels: the binary F1 table and the learning curve already answer the question; another chart adds little at root depth (fits the child page).
- Domain (host) breakdown of drops like Nemotron-CC Table 11: 2,617 docs from one WARC give too few per host.
- Qwen3 perplexity view: pending GPU run; shown as a dashed pending box instead of a chart.

## What the methodology lacked
A rule for labels made by the agent itself: here they are labelled as such, committed with reasons, and the
DCLM finding that human agreement does not predict data usefulness is shown next to them.
