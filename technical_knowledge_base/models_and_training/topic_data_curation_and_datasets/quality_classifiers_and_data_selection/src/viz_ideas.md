# Visual ideas: Quality classifiers and data selection (prefix qc), 2026-10-14/15

Question the page keeps returning to: **quality according to what, and who pays for the choice?** Every visual makes
one part of that measurable on the same 2,617 run0 documents (the root's running example), with published results kept apart.

Scores 0 to 2 on the methodology's questions (moves with a control, reproduces a figure (x2), computable from public data
(x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere), minus build cost.

## Built
| # | Idea | Score | Placement | Data |
|---|---|---|---|---|
| QC1 | **One page, two reference sets, step by step** (before/after animation): tokens, word features, hashed bigrams, average, sigmoid and cut, coloured by each feature's real push; toggle DCLM / Wikipedia / GPT-3 approx on the same document; counters reconcile to the logit | 13 | Reading s2 | real weights, exact rebuild of fastText v0.9.2 (max error 1e-5) |
| QC2 | Classifier replay tab: reference examples, top words both ways, logit strip of all 2,617 docs with the cut, token-coloured document, 6 classifiers x 16 documents | 12 | Own tab | vocab_*.json, explain/*.json |
| QC3 | Threshold explorer: keep-rate slider for 17 scorers, precision/recall against a uniform random hand-labelled sample, overlap with every other scorer against the random baseline, Llama-grade P/R and AUC, jump to published cut | 13 | Own tab | ranks, labels, annot curves |
| QC4 | Bias browser: keep rate or lift by WebOrganizer topic / format / country domain, click a cell to read the labelled documents; controlled-edit table (typography, case, bullets, spelling); Nemotron-CC paired rewrites | 12 | Own tab | WebOrganizer classifiers on run0, dialect.json, perturb.json, pairs |
| QC5 | GPT-3 Pareto keep curve P = (2 - s)^-9 with the GPT-3-style classifier's run0 histogram | 9 | Reading s2 | derived; simulation check |
| QC6 | DCLM Table 5 bars | 7 | Reading s3 | published table |
| QC7 | Reference-set table (keep, overlaps, hand precision, Llama AUC) | 11 | Reading s3 | measured |
| QC8 | DCLM's strongest words both ways | 9 | Reading s4 | vocab_dclm.json |
| QC9 | Nemotron-CC ensemble confusion matrix against published levels | 11 | Reading s5 | rebuilt ensemble, 1,000 docs |
| QC10 | Repetition calculator: keep share x pool against training tokens, effective data by Muennighoff's fit | 10 | Reading s10 | derived (R* = 15.39) |
| QC11 | Predict-then-reveal x 3 (strongest word, DCLM cut on FineWeb, curly quotes) | 9 | Reading | measured |

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
