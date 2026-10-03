# Training lab (tab t-lab): visualisation ideas

The question the tab answers: **what does each component of a training recipe actually change, and is the change real or one seed's luck?** Khalid chose the shape (2026-10-03): a small network trained live in the browser on a toy task, the reader swaps one component at a time and watches it against a baseline run side by side, with presets that each make one point, checked across seeds.

Scores follow the methodology in `html_utils/interactive-html-ideas.md` section 2 (0 to 2 per question; reproduces and computable count double; build cost subtracted). "Reproduces" here means the preset's claim is measured on ten seeds with the page's own code and the stated count is re-checked by `check_presets.mjs`, since a toy reproduces mechanisms, not published numbers.

## Built

| # | Idea | What it shows, what the reader does | Data and checks | Placement | Score |
|---|---|---|---|---|---|
| LB-1 | **Two runs side by side, trained live** (the before/after animation) | Run A and run B on the same data, initial weights, batches and dropout streams; play, pause, step, scrub, speed; each run's decision boundary, status counters (step, loss, accuracy, diverged or stopped) | Engine `parts/32_js_lab_a.js`, hand-written forward and backward; checked against PyTorch 2.14 (`check_grad.py`) | Tab, top | 13 |
| LB-2 | **Every component as a two-column control table** (A and B), rows that differ highlighted, one line per control with its primary source and the child page that owns it | Loss (4), activation (6), init (4), normalisation (4) and placement, residual, depth, width, optimiser (5), learning rate, schedule (4), warmup, batch size, weight decay λ and how it is applied, dropout, early stopping; shared task, points, label noise, steps, seed | Option sets chosen so every preset value is reachable | Tab, Controls | 11 |
| LB-3 | **Eight presets, each one point, with seed counts** | Zero init; sigmoid plus depth vanishes; BatchNorm rescues it; no warmup diverges; Adam + L2 against AdamW; dropout; early stopping; label smoothing. Each says what to see, why, and on how many of seeds 1 to 10 each claim holds (seed-dependent ones flagged) | `check_presets.mjs` runs every preset on ten seeds with the page's code and fails if a stated count is wrong; results in `preset_seeds.json` | Tab, Presets | 14 |
| LB-4 | **Per-layer activation, gradient and weight norms** at the scrubbed step, A and B as paired log bars | Vanishing (sigmoid: first layer about 1e-5 of the last), exploding activations at the start of the no-warmup residual net (0.5 to 25 across eight layers), weight collapse under Adam + L2 | Recorded every 1% of the run | Tab, under the curves | 12 |
| LB-5 | **Loss and accuracy curves**, train dashed and validation solid, with a cursor at the scrubbed step, a cross where a run diverged and a ring where it stopped | Generalisation gap opening (A) or staying shut (B) | Cross-entropy for every run, whatever it trains on, so different losses share an axis | Tab | 11 |
| LB-6 | **Learning-rate schedule strip** for both runs, whole run | Warmup ramps, step drops, cosine, WSD | `lrMult` in the engine, checked in `check_grad.py` | Tab | 7 |
| LB-7 | **Ten-seed check in the page** | Re-runs the current comparison on seeds 1 to 10 without drawing, in time slices; table of accuracies and losses, each claim yes or no, total against the stated count | Same judges as `check_presets.mjs` | Tab, own section | 12 |

## Rejected

| # | Idea | Why not |
|---|---|---|
| LB-8 | Loss-landscape slice (2-D filter-normalised plot around the weights) | Expensive per frame on a phone, and what it shows depends heavily on the chosen directions; the curves and per-layer bars carry the same lessons more directly |
| LB-9 | MSE against cross-entropy preset | Ten seeds: MSE reaches its best validation loss later but ends in the same place; no single clean point to make. Said in "What a toy cannot show" |
| LB-10 | Muon against AdamW preset | Ten seeds at two learning rates: no consistent difference on the toy; a preset would suggest an effect that is not there. Said in "What a toy cannot show" |
| LB-11 | "Residual connections rescue the deep sigmoid net" preset | Ten seeds: only partial (63 to 71% validation accuracy); BatchNorm's rescue (10 of 10 above 95%) makes the point cleanly |
| LB-12 | Warmup preset with Adam or post-LayerNorm | Swept Adam (0.03, 0.1), AdamW (0.3), SGD and momentum over plain, residual, pre- and post-LayerNorm and BatchNorm nets on six seeds: Adam either trained with and without warmup or failed with both; only plain SGD at 0.3 on an 8-layer residual net without normalisation diverged without warmup on every seed while warming up over 20% trained on every seed |
| LB-13 | Batch-size preset (BatchNorm at batch 8 against LayerNorm) | Both trained to 99 to 100% on all ten seeds; the toy does not show BatchNorm's small-batch weakness |
| LB-14 | Rolling back to the best weights on early stopping | Would hide the point that stopping trades a little loss for a lot of compute; the status line names the best step instead |
| LB-15 | Animated weight matrices (heatmaps per layer) | 24 × 24 matrices at phone width are unreadable; norms per layer carry the signal |
| LB-16 | Running PyTorch-exact bfloat16 Muon | The page runs Newton-Schulz in float64; the bfloat16 difference (about 0.5% of the weights after 40 steps) is reported instead of emulated |

## What the methodology lacked for this tab
A toy run has no published figure to reproduce, so "defaults reproduce a source" was replaced by two checks: the engine against PyTorch (exact to float64 rounding), and each preset claim counted over ten seeds and re-checked automatically. The rule that came out of it: **a preset states what fraction of seeds show it, and the page lets the reader recount**.
