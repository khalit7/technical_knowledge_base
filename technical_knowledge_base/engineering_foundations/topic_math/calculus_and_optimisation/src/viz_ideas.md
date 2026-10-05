# Calculus and optimisation for ML: visual ideas

Central question: "what does the local Taylor model of the loss say, and how far should a method trust it?" Scored with the methodology's questions (0 to 2; reproduce and computable count double; build cost subtracted). Existing visuals checked first: the root's Gradient lab (loss explorer, curvature bowl with GD/momentum/Adam/Newton, Bernoulli curvature), the Optimisers page's Optimiser race (13 rules on 5 surfaces), Goh 2017's momentum figures.

## Built
| # | Idea | Where | Why it earns its place | Data and check |
|---|---|---|---|---|
| C1 | GD step (first-order model plus step penalty) against Newton step (second-order model), animated on the same real 1D logistic loss, two starts (w = 0 converges; w = 8 Newton diverges) | Reading s10 | The before/after the brief asked for; shows both the speed and the failure of Newton on real data; counters tie to the numbers box | breast-cancer feature; iterates match recompute.py od_* |
| C2 | Edge of stability measured: sharpness by power iteration with HVPs during full-batch GD on a 8,970-parameter tanh MLP (digits), five step sizes, loss and per-step strip | Reading s17 | Reproduces Cohen et al. 2021 independently: second-half sharpness 10.02 vs 2/eta = 10, 6.70 vs 6.67; progressive sharpening below; 2 more seeds; Lanczos cross-check | inputs/eos.py, eos_extra.py |
| C3 | Real optimiser race on logistic regression (GD, line search, Nesterov, Adam, L-BFGS, Newton), per iteration and per evaluation | Reading s11 | Ranks methods by the curvature they use; checks the (kappa-1)/(kappa+1) rate on real data (0.974 measured vs 0.977) | inputs/lr_real.py; matches sklearn to 1.1e-6 |
| C4 | Rate against step on a quadratic: |1 - eta lambda_min|, |1 - eta lambda_max| and their maximum, kappa slider | Reading s8 | Makes the minimax derivation of eta* and (kappa-1)/(kappa+1) visible; defaults reproduce the old page's 0.818 and 35 steps | recompute.py q_* |
| C5 | Optimisation lab: 8 methods (incl. saddle-free Newton, BFGS) x 4 functions (quadratic with kappa and rotation, Rosenbrock, saddle with two minima, real 2D logistic loss), step inspector with Hessian, eigenvalues, classification, local 2/lambda_max, Newton step, Taylor-model contours and eigenvector arrows | Lab tab | Goes deeper than the root's bowl and the Optimiser race: the second-order view at every iterate | lab checks: Newton one step on quadratics; Newton to the saddle, SFN to a minimum; logistic w* vs recompute |
| C6 | Minibatch-gradient noise against batch size (measured vs sigma^2/B with finite-population factor) and SGD floors (constant 2, 0.5, 0.1, decaying) | Reading s16 | Turns Bottou-Curtis-Nocedal Theorems 4.6/4.7 into measurements | lr_real.py |
| C7 | Secant to tangent; directional derivative dial; Taylor orders on e^x; Hessian gallery; chord/Jensen; Lagrange circle; XGBoost leaf calculator | Reading s1, s3, s4, s6, s13, s14, s12 | Each is the picture for one definition at the moment it is introduced; defaults reproduce the old page's worked numbers | recompute.py |

## Rejected
- Momentum vs GD animation on diag(1, 10): already the root's Gradient lab panel 3 and the Optimiser race; linked instead.
- A backprop animation: owned by matrix_calculus_and_backprop.
- Hessian spectrum histogram of the trained MLP (full Lanczos): costly, and Sagun/Ghorbani already show it; linked.
- An SVM dual visual: belongs to Classical ML's Boundary lab.

## What the methodology lacked here
A maths page's "published figure to reproduce" is often a theorem's constant (a rate, a limit) rather than a table entry; reproducing it on real data (C2, C3) played that role.
