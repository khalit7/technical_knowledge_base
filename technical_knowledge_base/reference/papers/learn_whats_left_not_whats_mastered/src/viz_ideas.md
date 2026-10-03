# Visualisation ideas: Learn What's Left (SA-MRPO)

The question the paper keeps returning to: **where does the update go when one objective is nearly solved and another is not, and does moving it help?** Every visual below makes part of that measurable.

Scores 0 to 2 on the methodology's questions (parameter to move, reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animatable before/after), minus build cost.

## Built (rows for the ideas log, ids P-learn_whats_left_not_whats_mastered.k)

| # | Idea | What it shows, what the reader does | Why it helps | Data and sources | Placement | Score |
|---|---|---|---|---|---|---|
| P-learn_whats_left_not_whats_mastered.1 | **Figure 1 group, animated through GRPO, GDPO and SA-MRPO** | The same four answers step by step: sum then standardise (2 and 3 tie at 0), standardise each then sum (answer 3 above 2), discount by saturation (answer 3 turns negative); γ slider, Eq. 1 toggle, counters with the printed values | Before/after on one input; reproduces Figure 1 independently, and shows it was computed at γ = 1 without Eq. 1 | Figure 1 rewards; recompute.py | Reading, One group | 15 |
| P-learn_whats_left_not_whats_mastered.2 | Predict: sign of answer 3 at γ = 0.5, then the four advantages against γ with the flip threshold (γ = 0.157) | Sign reversal is exact algebra; the threshold is derived | Figure 1 | Reading | 10 |
| P-learn_whats_left_not_whats_mastered.3 | **Predict: one failure in a group of 8** (−2.65), slider for passes, and the share of the update a rarely failing objective draws | Explains why saturation matters after decoupling, and why there is little to reallocate when the easy objective is saturated from the start | derived; Table 1 Exceed | Reading, Method | 12 |
| P-learn_whats_left_not_whats_mastered.4 | Table 1 differences with an evaluation-noise band (±2 SE of 16-sample pass@1, upper bound) per benchmark | Shows which of the 12 of 15 wins are outside even eval-only noise (AIME24's +5.0 barely; Minerva, Olympiad not) | Table 1; benchmark sizes from HF | Reading, Results | 12 |
| P-learn_whats_left_not_whats_mastered.5 | Table 2 bars with the released R1-Distill-Qwen-7B's published scores | Both runs end far below the released model (MATH500 47 to 52 against 92.8) | Table 2; R1 Table 5 | Reading, Results | 9 |
| P-learn_whats_left_not_whats_mastered.6 | Table 4 averages against γ (accuracy and Exceed) | The trade the paper describes, and how small the γ = 0.25 to 0.5 gap is | Table 4 | Reading, γ | 7 |
| P-learn_whats_left_not_whats_mastered.7 | Predict: the length score at step 0 (above 97, from Figure 2's printed axes) with the share of varying groups per failure rate | The "saturated" objective in Tables 1 and 4 was saturated before training | Figure 2 axis labels (not curves) | Reading, γ | 10 |
| P-learn_whats_left_not_whats_mastered.8 | **Live toy trainer**: 200 question types, method plus length choice, two rule rewards, two settings (binary budget, graded), 10 methods plus custom γ and fixed weight; exact accuracy every 10 steps, batch curves, the length weight share | The paper's mechanism run live with every sample and budget shared; JS checked against PyTorch (8.9e-16, 3.1e-16) | toy_sweep.mjs, check_engine.py | Own tab | 14 |
| P-learn_whats_left_not_whats_mastered.9 | **The missing baseline: γ sweep against fixed-weight sweep, accuracy against length reward**, re-runnable in the page (288 runs, about 8 s) | In the graded setting the fixed-weight curve lies 1.3 to 2.1 points above SA-MRPO at matched length reward; in the binary budget nothing separates | toy_sweep.mjs | Train tab | 15 |
| P-learn_whats_left_not_whats_mastered.10 | Share table: groups where each objective varies, and the length objective's share of the advantage, start and end | Measures the "gradient budget" claim directly: under 4% at the start, under 0.3% at the end in the binary-budget setting | toy | Train tab | 9 |
| P-learn_whats_left_not_whats_mastered.11 | Tables tab: Tables 1 to 4 with differences from GDPO, Figure 1 recomputed in six variants, 13 claims checked | Exceed up in 10 of 15, bug rates equal or higher on all four, Table 4 equals Table 1 cell for cell, the epoch mismatch | tables.json, recompute.py | Own tab | 9 |

## Rejected

| Idea | Why |
|---|---|
| Figure 2 training curves redrawn | Only a PNG of smoothed curves; the method forbids reading curves. Used only its printed axis ranges. |
| A small LLM trained with SA-MRPO | Far beyond a CPU budget, and the toy answers the like-for-like question more cleanly. |
| Then and now tab | The paper is six weeks old; there is no later work to morph into. The concurrent methods are linked instead. |
| DVAO and GD2PO in the toy | Their exact rules would have to be reconstructed from other papers; out of scope for this page, noted as a gap in the evidence instead. |
| Eq. 2 gradient-conflict demo on a 2-D quadratic | Generic multi-objective geometry; it would illustrate the paper's caveat but not test anything the paper claims. |

## What the methodology lacked for this page

A rule for **when the paper's comparison omits the obvious simpler alternative** (here, a fixed smaller weight): the toy should run that alternative and compare at a matched point on the trade-off, not at each method's own default, because a method that only moves along a trade-off curve will always "win" on the objective it favours.
