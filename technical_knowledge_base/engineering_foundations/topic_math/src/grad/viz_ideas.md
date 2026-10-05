# Gradient lab (t-grad): visual ideas

Files: `parts/32_tab_grad.html` (HTML, CSS scoped under `#t-grad`, ids `gl-`), `parts/32_js_grad_core.js` (pure maths, also loaded by `check_js.mjs`), `parts/32_js_grad_u0_common.js` .. `u4_misc.js` (UI). Tiny model numbers: `model.json`. Checks: `recompute.py` (sympy, numpy, PyTorch autograd; writes `expected.json`), `check_js.mjs` (runs the page's maths and compares, 42 checks).

Central question of the tab: "is my gradient right, and what will the step do with it?"

## Built (score out of the methodology's questions; reproduce and computable count double)

| # | Idea | Where | Why it earns its place | Checks |
|---|---|---|---|---|
| G1 | Loss explorer: five losses, sliders on the logits, analytic vs central-difference gradient side by side, prediction minus target row, derivation per loss in MathML | Panel 1 | The reader derives each gradient and sees it confirmed numerically; the three canonical pairs give p - y, label smoothing gives p - q, focal gives w(p - y) | sympy derivative of every loss; numpy defaults; JS compared |
| G2 | Loss curve with tangent at the current point (slope = analytic gradient) | Panel 1 | "Gradient = slope" made visible for the chosen input | same |
| G3 | Finite-difference error against h, log-log V shape, the reader's h marked | Panel 1 | Shows why h = 1e-5 (CS231n) and why too small an h lies; best h measured 1e-6 in float64 | `fd_err_dz2` in expected.json |
| G4 | Canonical-pairs table at the worked examples | Panel 1 | The "prediction minus target" claim in one table | sympy |
| G5 | Backprop tape animation on two models (the Reading's one-matrix model by default: 6 forward, 12 backward with the embedding trained; and the lab's two-layer relu extension), before (forward only, 6 steps) / after (forward then backward, 13 steps), caption per step, running multiply-add counters, embedding-trained toggle (30 vs 24) | Panel 2 | Khalid's preferred before/after pattern; makes the VJP rules and the 2x cost countable (15 forward, 30 backward); shows a dead relu unit blocking its gradient | torch autograd on the same network |
| G6 | Gradient check over every parameter; one SGD step at lr 0.1, 0.3 or 1 (Reading's model, weights only: loss 2.408 to 1.773, 0.778, 0.011, matching src/read/numbers.json) | Panel 2 | The habit that catches gradient bugs; the step closes the spine's loop | numpy and torch |
| G7 | 2D quadratic bowl: eigenvalues, condition number, rotation, learning rate, GD / momentum / Adam / Newton, animated path, loss-per-step, verdict from eta x lambda_max, presets | Panel 3 | 2/lambda_max, oscillation and divergence seen; Goh's optimal momentum preset (lr 1.39, beta 0.44) converges with eta x lambda_max = 2.78 where GD would diverge; Newton one step; Adam labelled intuition | stability limits simulated (GD 2, momentum 2(1 + beta)); Goh optimum recomputed |
| G8 | Bernoulli curvature slider: Hessian by second difference (y = 0 and y = 1), label variance by summing outcomes, Fisher by averaged squared numerical score, against p(1 - p) | Panel 4 | The old page's worked example made live; three independent routes | sympy (0.25 at z = 0, 0.09 at z = ln 9) |
| G9 | Overflow table naive vs stable for logits (Z, Z - 1, 0), float64 and emulated float32 | Panel 5 | NaN appears exactly where the format overflows (709.78, 88.72) | numpy |
| G10 | Spot the bug: eight cards (sign, transpose, naive softmax, 1/n, softmax twice, detach, zero_grad, broadcasting), symptom computed live, reveal highlights the line | Panel 6 | Realistic debugging order: symptom first, then the line | traj, transpose, twice, detach, batch numbers in expected.json |

## Rejected
- A horizontal SVG computation graph for backprop: clips at 390 px with matrices; the tape (rows = values, columns = forward and gradient) works at every width and shows the matrices.
- A tanh/relu toggle on the backprop model: adds a control without a new idea; the dead relu unit already shows the local-derivative gate.
- Hutchinson or power-iteration estimate of lambda_max on the tiny network: belongs on an optimisation child page.
- A "learning rate finder" sweep on the tiny model: the bowl shows the same limit exactly, with theory to check against.
- Karpathy's "most common neural net mistakes" tweet as the source for the bug list: the tweet itself could not be fetched (the blog post only links it), so library documentation is cited instead.

## What the methodology lacked
A lab tab has no published figure to reproduce; the stand-in is "every displayed number recomputed by an independent route" (sympy and torch here), plus "the page's JS compared against the recompute".

## Model choice
The default is the Reading's model (src/read/recompute.py): context "the cat", target sat, x = (2, 1), W rows (1, 0), (0, 1), (1, -2). The two-layer extension (W1 rows (0.5, 0), (0, 1), (1, -3); W2 rows (2, 0, 1), (0, 1, 0), (-1, 1, 0)) was chosen so the logits are also (2, 1, 0) and so that training at lr 0.1 does not kill every relu unit (a first choice of W2 did: every step drove the loss to ln 3 and stuck there). The old page's "cat correct" four-hats case (loss 0.408) is a preset button in the loss explorer.
