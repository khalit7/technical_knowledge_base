# Coverage: "Debugging training" folded into Topic: ml-fundamentals

Source: `live_debugging_training.md` (Notion 3c65c17b0d0d8198857bd8347723ad70, last edited 2026-09-20, fetched 2026-10-03). No child pages, no databases, no video on it.

Where things now live:
- **Tab** = the "When training goes wrong" tab (`t-debug`, parts `34_*`). Inside it: **Map** (symptom map), **Sym:X / cause n** (the debugger: symptom X, cause number n), **Recipe** (Before debugging), **Spikes** (Loss spikes at scale), **Foot** (tab footer).
- **Reading** = the Reading tab's short "When it goes wrong" section (written by the Reading agent; it links to this tab). It should carry the one-paragraph version: the symptom families and "overfit one batch first".
- **More** = Further reading tab (written by another agent). The three "Best resources" need their entries and times there; they are also cited inline in this tab.

| # | Fact, row, number or link in the old page | Where it lives now | Note |
|---|---|---|---|
| 1 | Header "5 min read · +3h 20m resources" | dropped | Page metadata, not knowledge; reading times are recomputed for the root page. |
| 2 | Karpathy, A Recipe for Training Neural Networks, link, ~35 min, "the canonical why your training silently fails checklist" | Tab: Recipe (link, the two observations quoted, the checklist and the other items); More (link and time) | Facts checked against the post (quotes verbatim). |
| 3 | Deep Learning Tuning Playbook (Google Research), repo link, ~2h main document, "systematic hyperparameter and debugging methodology" | Tab: Spikes (card with its instability procedure and fixes), Sym:osc cause 5, Sym:spike causes 1 and 4, Sym:van cause 3; More | Added from the playbook: two kinds of instability, warmup sweep (<= 10% of steps), clipping at the 90th percentile, > 50% clipped = lower the rate, x + f(Norm(x)). |
| 4 | Focal loss paper arXiv:1708.02002, 45 min, "the imbalance-handling reference" | Tab: Sym:imb cause 2 (formula, gamma 2, alpha 0.25, 100k locations, 1:1000) and cause 4 (prior pi = 0.01 bias init); More | |
| 5 | Feature scaling: all features contribute equally, large-range features do not dominate | Tab: Sym:osc cause 3 "Features on very different scales" | Recorded run osc_unscaled. |
| 6 | Feature scaling speeds up gradient-descent convergence (rounder loss contours) | Tab: Sym:osc cause 3 | |
| 7 | Feature scaling improves overall model performance | Tab: Sym:osc cause 3 ("usually improves the final model as well") | Recorded: unscaled 0.22 val loss against 0.058 scaled. |
| 8 | Mandatory for distance-based methods (kNN, SVM, k-means) | Tab: Sym:osc cause 3 fix | |
| 9 | Formulas in Normalisation and initialisation (link) | Tab: Sym:osc cause 3 fix links the page; band "Data" owner link | |
| 10 | Fit table, overfitting: symptom "Train loss low, val loss high", diagnosis Overfitting | Tab: Sym:over (symptom "Train falls, validation rises", lead names overfitting) | Recorded runs overfit / overfit_fix_reg / overfit_fix_data. |
| 11 | Overfitting fix 1: more data (incl. augmentation) | Tab: Sym:over cause 1 | Order of preference kept as the cause order. |
| 12 | Overfitting fix 2: regularisation (L1/L2, dropout, weight decay) | Tab: Sym:over cause 2 | |
| 13 | Overfitting fix 3: early stopping | Tab: Sym:over cause 3 | |
| 14 | Overfitting fix 4: reduce model complexity | Tab: Sym:over cause 4 | |
| 15 | Fit table, underfitting: "Train loss itself high", diagnosis Underfitting | Tab: Sym:under ("Train and validation both high", lead names underfitting) | |
| 16 | Underfitting fix 1: increase model complexity | Tab: Sym:under cause 1 | Recorded underfit_tiny / underfit_fix. |
| 17 | Underfitting fix 2: train longer | Tab: Sym:under cause 2 | |
| 18 | Underfitting fix 3: decrease regularisation | Tab: Sym:under cause 3 | Recorded underfit_wd. |
| 19 | Vanishing: symptom "early-layer gradients ~0; deep net learns slowly or not at all" | Tab: Sym:van lead; animation "Vanishing" | Recorded per-layer gradient norms. |
| 20 | Vanishing fix: better initialisation (Xavier/He) | Tab: Sym:van cause 2 | |
| 21 | Vanishing fix: residual connections | Tab: Sym:van cause 3 | |
| 22 | Vanishing fix: normalisation layers | Tab: Sym:van cause 3 | |
| 23 | Vanishing fix: better activation (ReLU family over sigmoid/tanh) | Tab: Sym:van cause 1 | |
| 24 | Vanishing fix: make the network shallower | Tab: Sym:van cause 4 | |
| 25 | Exploding: symptom "gradients/weights blow up; loss spikes or NaN" | Tab: Sym:exp lead; animation "Exploding" | |
| 26 | Exploding fix: better initialisation | Tab: Sym:exp cause 1 | Recorded explode_init / explode_fix_he. |
| 27 | Exploding fix: gradient clipping (bold in the old page) | Tab: Sym:exp cause 2; Sym:nan cause 1; Sym:spike cause 4 | |
| 28 | Exploding fix: residual connections | Tab: Sym:exp cause 4 | |
| 29 | Exploding fix: normalisation layers | Tab: Sym:exp cause 4 | |
| 30 | Exploding fix: make the network shallower | Tab: Sym:exp cause 5 | |
| 31 | Tree "Loss does not decrease from the start" | Tab: Sym:flat | |
| 32 | Cause LR too high or too low; check LR sweep, try 3x up/down | Tab: Sym:flat cause 1 (title and check) | Recorded flat_lowlr; too high recorded as nan_lr (network died). |
| 33 | Cause wrong loss function; check it matches the task and output activation (logits vs probabilities) | Tab: Sym:flat cause 4; Sym:nan cause 2 fix | Recorded flat_double_softmax (floor ln(e+9) - 1 = 1.461, derived). |
| 34 | Cause gradients not flowing; network actually connected? layers frozen? inspect grad norms per layer | Tab: Sym:flat cause 2 | Recorded flat_stale_opt and overfit_one_batch_stale. |
| 35 | Cause data/label mismatch; overfit a single batch first; visually inspect (x, y) after the pipeline | Tab: Sym:flat cause 3; Recipe (overfit-one-batch chart) | Added: shuffled labels pass the one-batch check (recorded), so passing does not clear the data. |
| 36 | "Loss increasing or hitting NaN from the start: LR too high, or exploding gradients" | Tab: Sym:nan lead and causes 1, 3 | |
| 37 | "Loss decreases, then suddenly jumps to NaN": numerical instability, division by zero or log(0) | Tab: Sym:nan cause 2 | Recorded nan_log (NaN at step 250; validation inf from step 70). |
| 38 | Fix: add epsilons | Tab: Sym:nan cause 2 fix | |
| 39 | Fix: fused/log-space ops (log-softmax + NLL) | Tab: Sym:nan cause 2 fix | Recorded nan_log_fix. |
| 40 | Fix: check for inf inputs | Tab: Sym:nan cause 4 | Plus the recorded scaler bug (val_scaler_bug). |
| 41 | Fix: consider loss-scaling with fp16 | Tab: Sym:nan cause 5 | Added Llama 3 §7.3 bf16 accumulation case. |
| 42 | Plateau table: reached a local/global minimum; may simply be done; check val metrics | Tab: Sym:plat cause 1 | |
| 43 | Saddle point; optimiser with momentum/adaptivity escapes it (link Optimisers) | Tab: Sym:plat cause 4 (link) | |
| 44 | LR too small; increase, or use warm restarts | Tab: Sym:plat cause 2 | Recorded plateau_decay. |
| 45 | Vanishing gradients; see gradient table | Tab: Sym:plat cause 7 (points to Sym:van) | |
| 46 | Dead ReLUs; fraction of zero activations per layer; switch to Leaky ReLU/GELU or lower LR | Tab: Sym:plat cause 3 | Recorded plateau_dead with measured dead fractions. |
| 47 | Loss oscillating heavily: LR too high | Tab: Sym:osc cause 1 | Recorded osc_lr. |
| 48 | Oscillating: batch size too small (noisy gradients) | Tab: Sym:osc cause 2 | Recorded osc_bs. |
| 49 | Oscillating: optimiser lacking momentum or adaptive LR | Tab: Sym:osc cause 4 | |
| 50 | Imbalanced data problem: model struggles to learn the minority class and accuracy hides it | Tab: Sym:imb lead and cause 1 | Recorded 1:20 run with five remedies. |
| 51 | Re-sampling: oversample minority (or SMOTE-style), undersample majority | Tab: Sym:imb cause 3 | Oversampling recorded. |
| 52 | Re-weighting: weighted loss, higher weights on minority terms | Tab: Sym:imb cause 2 | Recorded. |
| 53 | Focal loss -(1 - p_t)^gamma log p_t; down-weights easy examples so hard ones dominate; built for extreme imbalance (dense detection) | Tab: Sym:imb cause 2 | Shown in the paper's final alpha-balanced form; recorded: alpha 0.25 lowered recall here (see corrections). |
| 54 | Data augmentation: enlarge the minority class with realistic transforms | Tab: Sym:imb cause 3 | |
| 55 | Right metrics: precision/recall/F1/AUPRC, never plain accuracy (link Metrics) | Tab: Sym:imb cause 1 (link) | |
| 56 | Checklist 1: inspect data by hand before training | Tab: Recipe item 1 | |
| 57 | Checklist 2: overfit a single batch to ~0 loss; if you cannot, the bug is in the code | Tab: Recipe item 2 and chart | |
| 58 | Checklist 3: dumb baseline; initial loss -log(1/K) for K-class CE | Tab: Recipe item 3, the loss-at-init calculator and recorded table | |
| 59 | Checklist 4: change one thing at a time; log grad norms, weight norms, LR | Tab: Recipe item 4 | |
| 60 | Cross-link: warmup rationale, schedulers, saddle points on Optimisers | Tab: band "Schedule" and "Optimiser and LR" owner links; Sym:plat cause 4 | |
| 61 | Cross-link: initialisation and normalisation as gradient fixes on Norm and init | Tab: bands "Initialisation" and "Normalisation" owner links; Sym:van cause 3 | |

Counts: 61 items; 60 carried (all in this tab, the three resources also due in Further reading), 1 dropped (page metadata). No item dropped as stale.

## Corrections and refinements against sources and recorded runs
- Focal loss: the old formula omits alpha; Lin et al.'s final form is -alpha_t (1 - p_t)^gamma log p_t with gamma = 2, alpha = 0.25. Recorded at 1:20 imbalance, alpha = 0.25 (which down-weights positives) lowered minority recall from 37.5% to 19.2% at threshold 0.5: the detection setting does not transfer. Shown in Sym:imb.
- "Overfit a single batch ... if you cannot, the bug is in the code": true, but the converse does not hold. Recorded: shuffled labels fit one batch to 0.0012, so a pass does not clear the data pipeline.
- "LR too high" under "does not decrease from the start": recorded at this scale, a rate 30 times too high did not give NaN; it killed every ReLU in the first steps and the loss sat at ln 10. Added as Sym:plat cause 6.
- "Fix overfitting with regularisation": recorded with 30% label noise, dropout 0.5 plus weight decay 0.5 barely moved the best validation loss (0.69 to 0.64) and validation still rose; early stopping and more data did more. Said in Sym:over.

## Added beyond the old page (sourced)
PaLM's loss spikes and rollback (§5.1) and z-loss; OLMo 2's spike score and per-fix scores (via the OLMo 2 paper page, which carries the verified numbers); Wortsman et al. 2023 small-scale proxies, reproduced at toy scale (runs_spike.py); Llama 3's "few loss spikes" and bf16 accumulation fix, with a link to Training Infrastructure for the interruptions; the Tuning Playbook's instability procedure; Karpathy's further recipe items; the double-softmax loss floor; the scaler bug.
