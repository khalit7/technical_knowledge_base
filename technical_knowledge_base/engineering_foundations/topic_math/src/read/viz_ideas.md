# Reading tab: visual ideas, built and rejected

Central question: how does one training step use each area of maths, and what does each number mean? One tiny model (vocabulary cat, dog, sat; x = (2, 1); W rows (1,0), (0,1), (1,-2); logits (2,1,0); truth sat) carries every section; all its numbers come from `recompute.py`.

| # | Idea | Placement | Score notes | Status |
|---|---|---|---|---|
| R1 | One-screen picture: the step as seven coloured boxes (input, Wx, softmax, loss, gradient, step, "was it real?"), real values, each linking its section | rd-one (22_js_rd_one.js) | the page's map; replaces the old mermaid tree of areas | built |
| R2 | Matrix times vector, row by row: arrows for x and each row in the plane, dot product and cosine per step | s1 (23_js_rd_mv.js) | step animation; shows "dot product = match" geometrically | built |
| R3 | Softmax in two moves (exponentiate, divide) with a temperature switch (0.5, 1, 2, 5) | s2 (24_js_rd_soft.js) | before/after of the same scores under different T | built |
| R4 | Loss against z_sat with the tangent; slope = p(sat) - 1 live | s4 (25_js_rd_slope.js) | the derivative as a slope, matched to the derivation | built |
| R5 | One gradient step, before and after: rows turn (old dashed, new solid), bet bars before/after, loss counters; eta 0.1, 0.3, 1 | s5 (26_js_rd_step.js) | the step on the real model, numbers reproduce recompute.py | built |
| R6 | Gradient descent on a bowl, eta below and above 2/lambda (0.1, 0.4, 0.6 at lambda 4) | s5 (27_js_rd_lr.js) | converging vs zig-zag vs diverging; the 2/lambda_max rule seen | built |
| R7 | One noisy evaluation vs the average of many: simulated per-sentence changes, running mean, 95% band shrinking with sqrt(n) | s6 (28_js_rd_noise.js) | labelled illustrative (seeded simulation, mean -0.1, sd 0.5) | built |
| R8 | Surprise bars per word with the entropy line | s3 (static HTML bars) | to scale; no animation needed | built |
| X1 | Long-narrow-valley 2D contour with zig-zag path | rejected for the root: the Gradient lab owns optimisation paths (32_js_grad_u3_curv.js) | | rejected (owned by t-grad) |
| X2 | Forward vs reverse KL fit to a two-peaked distribution | child (information theory) | root keeps it in words in an optional box | deferred to child |
| X3 | SVD as an ellipse (unit circle mapped by A) | child (linear algebra) | rank preview is text only on the root | deferred to child |
| X4 | Paired vs unpaired error bars side by side | Eval statistics page owns it | | rejected (linked) |
| X5 | Attention equation animated | the Attention paper page has a live toy Transformer | rd-eq uses tiny numbers in text | rejected (linked) |

What the methodology lacked here: a teaching page from zero has no "published figure to reproduce"; the equivalent check was that every animation's numbers reproduce the recompute script (spot-checked in `test_read.mjs` output and `check_numbers.py`).
