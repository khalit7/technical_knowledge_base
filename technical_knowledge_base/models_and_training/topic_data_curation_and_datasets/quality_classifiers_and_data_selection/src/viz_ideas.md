# Visual ideas: Quality classifiers and data selection (prefix qc), 2026-10-14/15

Question the page keeps returning to: **quality according to what, and who pays for the choice?** Every visual makes
one part of that measurable on the same 2,617 run0 documents (the root's running example), with published results kept apart.

Scores 0 to 2 on the methodology's questions (moves with a control, reproduces a figure (x2), computable from public data
(x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere), minus build cost.

## Built
| # | Idea | Score | Placement | Data |
|---|---|---|---|---|
| QC1 | **One page, two reference sets, step by step** (before/after animation): tokens, word features, hashed bigrams, average, sigmoid and cut, coloured by each feature's real push; toggle DCLM / Wikipedia / GPT-3 approx on the same document; counters reconcile to the logit | 13 | Reading s2 | real weights, exact rebuild of fastText v0.9.2 (max error 1e-5) |
| QC2 | Classifier replay: reference examples, top words both ways, logit strip of all 2,617 docs with the cut, token-coloured document, 6 classifiers x 16 documents | 12 | Reading s3 (was its own tab until 2026-10-24) | vocab_*.json, explain/*.json |
| QC3 | Threshold explorer: keep-rate slider for 17 scorers, precision/recall against a uniform random hand-labelled sample, overlap with every other scorer against the random baseline, Llama-grade P/R and AUC, jump to published cut | 13 | Reading s5 (was its own tab) | ranks, labels, annot curves |
| QC4 | Bias browser: keep rate or lift by WebOrganizer topic / format / country domain, click a cell to read the labelled documents; controlled-edit table (typography, case, bullets, spelling); Nemotron-CC paired rewrites | 12 | Reading s10 (heatmap), s3 (edits and pairs, closed blocks); was its own tab | WebOrganizer classifiers on run0, dialect.json, perturb.json, pairs |
| QC5 | GPT-3 Pareto keep curve P = (2 - s)^-9 with the GPT-3-style classifier's run0 histogram | 9 | Reading s2 | derived; simulation check |
| QC6 | DCLM Table 5 bars | 7 | Reading s3 | published table |
| QC7 | Reference-set table (keep, overlaps, hand precision, Llama AUC) | 11 | Reading s3 | measured |
| QC8 | DCLM's strongest words both ways | 9 | Reading s4 | vocab_dclm.json |
| QC9 | Nemotron-CC ensemble confusion matrix against published levels | 11 | Reading s5 | rebuilt ensemble, 1,000 docs |
| QC10 | Repetition calculator: keep share x pool against training tokens, effective data by Muennighoff's fit | 10 | Reading s10 | derived (R* = 15.39) |
| QC11 | Predict-then-reveal x 3 (strongest word, DCLM cut on FineWeb, curly quotes) | 9 | Reading | measured |

## Added 2026-10-24 (teaching-contract rebuild)
| # | Idea | Kind | Placement | Data |
|---|---|---|---|---|
| QC12 | Hero: pool, scorer families, run0's real DCLM logit histogram with the published cut, kept sets | static annotated diagram | top | tr.logits.dclm, facts |
| QC13 | LLM-graded pipeline: annotator, student, combine, cut for FineWeb-Edu and Nemotron-CC | static annotated diagram | Reading s4 | published |
| QC14 | DSIR length bias: median selected length toward three targets against the pool, Spearman per target | static bars on real data | Reading s7 | out/dsir.json |
| QC15 | Gradient alignment: target direction and three candidates with cosines | static diagram, labelled illustrative | Reading s8 | none (illustrative) |
| QC16 | DCLM Table 4 as bars (the family comparison every later paper quotes) | static bars | Reading s11 | published |
| QC17 | Threshold reveal: DCLM's hand precision plateaus, FineWeb-Edu's climbs | predict then reveal (closed) | Reading s5 | counted from th, checked by check_page.mjs |

No real image: the page is about mechanisms and data, not a physical object; a paper figure would repeat what the recomputed figures show.

## Added 2026-11-09 (split layout and renderer v2 stages)
| # | Idea | Kind | Placement | Data |
|---|---|---|---|---|
| QC18 | Fig. 1: one real run0 page through fastText: tokens as tiles on a glass page, then in reading order on a see-through plinth; word pushes up or down, bigram shares stacked, flows into the averaged logit on a logit axis, the cut as a glass plane (replaces the 2D stepper and its captions) | 3D stage, 6 steps, page and classifier chips | Reading s1 | `QC.a1` (fastText rebuilt from the model files) |
| QC19 | Fig. 2: six reference sets as glass plates; rows for overlap with DCLM, hand precision, Llama AUC, DCLM's published Core | 3D stage, 5 steps | Reading s2 | `QC.reftab`, `QC.t5` |
| QC20 | Fig. 3: the 200 labelled pages as columns by rank (square-root scale), a glass threshold plane rising from the top 60% to 5%, then the same pages re-sorted by FineWeb-Edu (replaces the closed reveal) | 3D stage, 6 steps | Reading s5 | `QC.th.rank`, `QC.th.lab` |

Kept 2D, and why: the hero (a histogram with a cut), the Pareto keep curve, Table 5 and Table 4 bars (numbers on one axis), the
Classifier replay and the Threshold explorer (reader-driven widgets with selects and a slider; one parameter), the edit table, the
LLM-graded pipeline (a flowchart), the Nemotron-CC confusion matrix and the bias heatmap (heatmaps), the Qwen perplexity histogram
(log axis), DSIR's length bars (no per-document data survives the 2026-10-15 scratch wipe, so a point-cloud scene would need invented
points), the gradient diagram (illustrative 2-D arrows), the repetition calculator (a curve with inputs).

## Rejected
- Live fastText training in the browser: models are about 1 GB; the replay of real weights teaches the same mechanism.
- Re-drawing the root's same-shard before/after animation and its agreement scatter: the root owns them; linked instead.
- A ROC curve per classifier on the Llama labels: AUC plus precision/recall at the slider's keep rate answers the threshold question more directly.
- A DSIR animation of Gumbel top-k: the formula and the measured length bias say it; an animation of noise added to scores teaches little.
- A LESS gradient toy on CPU: per-example backward passes through an LM are a GPU job, and a toy on a linear classifier would show influence on the classifier, not on pretraining. Published numbers and cost table instead.
- Hosts of all 2,617 documents in the bias browser: personal sites carry names; only labelled documents with scrubbed excerpts are listed, and pages about private individuals are withheld.

## What the methodology lacked
A rule for controlled edits (change one property of the same text and rescore): it is the cleanest causal evidence a
page like this can produce without training, and it found the typography effect that score-level comparisons hid.
