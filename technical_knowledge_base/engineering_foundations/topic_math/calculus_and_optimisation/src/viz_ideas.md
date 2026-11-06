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

| C8 (2026-10-24) | Hero: the real one-weight logistic loss at w0 = 1.5 with the tangent, the gradient-descent step-penalty parabola and the true-curvature parabola, and both landing points | Reading top | The whiteboard picture of the page's core sentence, on real data; static | recompute.py hero_*; check_page.mjs |
| C9 (2026-10-24) | Gradient in the logit against z for cross-entropy and squared error on a sigmoid, true label 1 | Reading section 2 | The section had no visual; the 203x gap at z = -6 is seen | formula; values match recompute.py bce_m6_g, mse_sig_g |

| C10 (2026-11-06) | 3D hero (Fig. 1): the real two-weight logistic loss as a surface with contours; tangent plane (glass) and gradient with flowing dots; the touching Hessian bowl; one gradient-descent and one Newton step; both paths to the optimum | Reading top | Replaces C8: the page's core sentence on a surface instead of a curve | 32_js_sc_hero.js; recompute.py hero2_*; check_page.mjs |
| C11 (2026-11-06) | 3D Hessian stage (Fig. 3): bowl, dome, saddle, x^2 + y^4, x^2 - y^4, morphing; eigen-arrows and the surface along each eigen-direction; dots sliding off the saddle | Reading s3 | Replaces C7's 2D contour gallery: curvature is a shape, and depth shows it | 33_js_sc_hess.js |
| C12 (2026-11-06) | 3D gradient descent on diag(1, 10) (Fig. 4): eta 0.1, 2/11, 0.21 (illustrative) and heavy ball, each path iterated live | Reading s4 | The step limit and the zig-zag as motion over the bowl; the rate slider (C4) stays for the parameter | 34_js_sc_gd.js; recompute.py gd_steps_*, hb_steps_best |
| C13 (2026-11-06) | 3D convex against non-convex (Fig. 8): chord above the real logistic loss, tangent planes below, flat plane at the optimum; the lab's two-minima function with the chord below and the permutation reading | Reading s8 | Convexity in two weights, beside C7's one-variable chord slider | 35_js_sc_cvx.js; recompute.py cvx_* |
| C14 (2026-11-06) | 3D Lagrange (Fig. 9): f = x + y as a plane, the circle lifted onto it, gradients at the floor point, the circle loosened to c = 2 | Reading s9 | Replaces C7's 2D Lagrange circle | 36_js_sc_lag.js |
| C15 (2026-11-06) | Section 5's GD against Newton becomes one six-step animation with both methods at once and a step list (was a mode toggle and a start toggle with 2 x 30 frames) | Reading s5 | The long-replay rule: grouped into explained stretches | 24_js_rd_anim.js; check_page.mjs |

## Moved (2026-10-24)
- C7's secant figure is inside the closed refresher block of section 1 (known ground for the reader).

## Rejected
- (2026-11-06) 3D for the rate slider, race, noise, SGD floors and edge of stability: curves on log or linear axes read best flat; the lab keeps 2D contours, where paths read best from above.
- Momentum vs GD animation on diag(1, 10): already the root's Gradient lab panel 3 and the Optimiser race; linked instead. (2026-11-06: this page owns the step limit and the rate, so Fig. 4 now draws them in 3D; the root's panel stays a lab.)
- A backprop animation: owned by matrix_calculus_and_backprop.
- Hessian spectrum histogram of the trained MLP (full Lanczos): costly, and Sagun/Ghorbani already show it; linked.
- An SVM dual visual: belongs to Classical ML's Boundary lab.

## What the methodology lacked here
A maths page's "published figure to reproduce" is often a theorem's constant (a rate, a limit) rather than a table entry; reproducing it on real data (C2, C3) played that role.
