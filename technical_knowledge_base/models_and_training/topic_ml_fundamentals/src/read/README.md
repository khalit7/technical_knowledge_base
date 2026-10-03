# Reading tab and Further reading: sources, scripts, visual choices

Parts: `parts/20_read.html` (styles, One step strip, steps 1 to 3), `20_read_b.html` (steps 4 to 7), `20_read_c.html` (the four threads, Beyond one network, When it goes wrong; closes the tab), `21_js_rd_common.js` (RD helpers and the step-animation controller, from the training topic), `22_js_rd_engine.js` (RDE: every computation, no DOM), `23` to `29` (one script per visual), `39_tab_more.html`. Ids are prefixed `rd-`; CSS is scoped under `#t-read`.

Shape: the Reading tab follows one training step (Khalid, 2026-10-03) instead of Part A's axis sections: each component appears at the stage where it acts, then four threads that cross stages, then the paradigms beyond one supervised network, then a hand-off to the t-debug tab.

## Checks

- `uv run --with torch --with numpy python src/read/recompute.py` writes `expected.json`: the five networks' forward and backward pass by PyTorch autograd in float64, both recipes' optimiser step by `torch.optim` (SGD, AdamW, `clip_grad_norm_`), the spectra by NumPy SVD, the weight-decay runs by `torch.optim.Adam` and `AdamW`, plus schedules, BPTT products, ROC/PR areas, erf and the loss gradients.
- `node src/read/check_engine.mjs` runs the page's engine in Node against it: 1,728 values, 0 mismatches, worst relative difference 1.6e-12.
- `node src/check_read.mjs` clicks every control and steps every animation at 390 dark and 920 light (510 checks each); screenshots in `../.shots/rd-*.png`.

## Visuals, and why each earns its place

| Visual | Where | Teaches | Numbers |
|---|---|---|---|
| One step as a seven-stage strip, animated and clickable, classic and 2026 recipes | One step | Where every component acts; a real step's numbers at each stage (loss against ln 10, clipping, update size, decay, batch against held-out) | Toy network, exact, checked against torch.optim |
| One batch through five 16-layer networks, spread forward and gradient backward per layer, with a comparison network | Step 2 (and threads 2, 3 load pairs into it) | Before/after of the fixes for vanishing gradients: sigmoid gives a first-layer gradient 1.9e9 times smaller than the last; 1/n init kills the signal; He holds it; BatchNorm residual grows it; pre-RMSNorm SwiGLU keeps both flat | Exact, PyTorch autograd to 1e-8 |
| One example, three losses (cross entropy, label smoothing, focal) with the push on the right logit | Step 3 | Focal down-weights easy examples; label smoothing's minimum at 0.91, not 1 | Exact formulas and autograd gradients |
| One gradient turned into an update three ways, stepping through Newton-Schulz | Step 5 | Muon keeps the gradient's 32 directions and equalises them (spread 7.2 to 1.66); Adam's first step fills all 64, 18% outside the gradient's span | NumPy SVD to 1e-7 |
| Schedules with a movable end | Step 5 | Cosine stopped early is left at a mid-run rate; WSD re-plans its cooldown | Closed forms |
| ROC against PR as positives get rarer | Step 7 | ROC-AUC does not move; AUPRC collapses (0.85 to 0.11 at 1%, d' = 1.5) | Binormal model, exact |
| Cross entropy = entropy + KL, four targets | Thread 1 | Hard labels, label smoothing, distillation and InfoNCE as one quantity | Exact |
| tanh RNN against LSTM cell path, gradient through 60 steps | Thread 3 | The fourth way gradients vanish, and the additive cell's fix | Exact products on seeded inputs |
| Adam with L2 against AdamW on pure-noise gradients | Thread 4 | Why AdamW exists: L2 through Adam decays low-noise weights to 0 and leaves high-noise ones at 0.97; AdamW decays all alike | torch.optim to 1e-8 |

Rejected: a loss-landscape trajectory toy for optimisers (the Training lab trains a real network with each optimiser); a dropout animation (one sentence carries inverted dropout); per-model recipe tables (Defaults across models owns them); symptom tables (When training goes wrong owns them); a t-SNE or k-means toy for classical ML (beyond a root's comparison level).
