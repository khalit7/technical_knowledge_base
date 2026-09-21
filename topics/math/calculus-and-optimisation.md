# Calculus and optimisation for ML

⏱ 12 min read · +8h 45m resources

Updated 2026-08-24.

### Best resources

- [The Matrix Calculus You Need For Deep Learning](https://explained.ai/matrix-calculus/) (~1h 30m): Parr and Howard; the DL-focused refresher, covers every chain-rule form used below.
- [Mathematics for Machine Learning, ch. 5 and 7](https://mml-book.github.io/) (book, ~1h 45m for ch. 5 and 7): Deisenroth et al.; vector calculus and continuous optimisation.
- [Convex Optimization](https://web.stanford.edu/~boyd/cvxbook/) (book, ~5h for ch. 2-5): Boyd and Vandenberghe, free PDF; ch. 2-5 for convexity, duality, KKT.
- [CS231n backprop notes](https://cs231n.github.io/optimization-2/) (~30 min): backprop as local gradient routing, staged computation.

### Differentiation of each cost function (flagged question)

Setup: `n` examples, model output before the final activation is the logit `z = f_\theta(x)`; the loss gradient w.r.t. `z` is what backprop pushes into the network. All three standard losses produce the same beautiful form: prediction minus target.

#### MSE (linear output)

`L = \frac{1}{n}\sum_i (\hat{y}_i - y_i)^2` with `\hat{y}_i = z_i`.

```
\frac{\partial L}{\partial z_i} = \frac{2}{n}(\hat{y}_i - y_i).
```

For linear regression `\hat{y} = Xw`: `\nabla_w L = \frac{2}{n} X^\top (Xw - y)`; setting to zero gives the normal equations `X^\top X w = X^\top y`.

#### BCE + sigmoid

`L = -\big[y \log p + (1-y)\log(1-p)\big]` with `p = \sigma(z) = \frac{1}{1+e^{-z}}`.

Two ingredients: `\frac{\partial L}{\partial p} = -\frac{y}{p} + \frac{1-y}{1-p} = \frac{p - y}{p(1-p)}`, and the sigmoid's self-referential derivative `\sigma'(z) = \sigma(z)(1 - \sigma(z)) = p(1-p)`. Chain rule:

```
\frac{\partial L}{\partial z} = \frac{p - y}{p(1-p)} \cdot p(1-p) = p - y.
```

The `p(1-p)` factors cancel exactly. This is why you compute BCE on logits, not on probabilities: the combined gradient never divides by `p` or `1-p`, so no blow-up when `p \to 0` or `1`, and the loss itself can be computed stably via `\log(1+e^{-|z|})` tricks (`BCEWithLogitsLoss`).

#### Cross-entropy + softmax

`L = -\log p_y` with `p_k = \frac{e^{z_k}}{\sum_j e^{z_j}}`. The softmax Jacobian is `\frac{\partial p_k}{\partial z_j} = p_k(\delta_{kj} - p_j)`, i.e. `\operatorname{diag}(p) - pp^\top` as a matrix. Then

```
\frac{\partial L}{\partial z_j} = -\frac{1}{p_y}\cdot p_y(\delta_{yj} - p_j) = p_j - \delta_{yj}, \qquad \text{i.e. } \nabla_z L = p - \mathbf{1}_y.
```

Again exactly prediction minus one-hot target. With soft labels `q`: `\nabla_z L = p - q` (used in distillation).

#### Why the simplification matters

1. Numerical stability: no `\log` or division of saturated probabilities; frameworks fuse softmax+CE (`CrossEntropyLoss` takes logits) and use the log-sum-exp trick `\log \sum e^{z_j} = m + \log \sum e^{z_j - m}`.
2. No vanishing gradient at the output: a wrong confident prediction (`p \to 0` for the true class) still gives gradient of magnitude `\approx 1`, whereas MSE-on-sigmoid would multiply by `\sigma'(z) \to 0` and stall. This is the concrete reason CE, not MSE, is used for classification.
3. Cheap backprop: the `O(K^2)` softmax Jacobian is never materialised; the fused gradient is `O(K)`.
4. Same story from the GLM view: for any exponential-family output with canonical link, `\nabla_z L = p - y` falls out; sigmoid/Bernoulli and softmax/categorical are instances.

### Chain rule, backprop, VJPs

Chain rule for compositions `L = f_k(f_{k-1}(\dots f_1(x)))`: the Jacobians multiply. Reverse-mode autodiff computes, for scalar loss, the product `\nabla_x L^\top = v^\top J_{f_k} J_{f_{k-1}} \cdots` right-to-left, so it only ever needs vector-Jacobian products (VJPs): each op answers "given the gradient of the loss w.r.t. my output (`v`), what is it w.r.t. my inputs?" without building `J`.

- Reverse mode: one backward pass gives gradients w.r.t. all parameters; cost `\approx` 2-3x forward; memory holds activations (hence activation checkpointing). Right choice when outputs (1 loss) `\ll` inputs (billions of params).
- Forward mode computes Jacobian-vector products (JVPs); efficient when inputs are few. Hessian-vector products combine both: `Hv = \nabla_x (\nabla_x L \cdot v)`, one extra backward pass, no `n \times n` matrix.
Example VJPs: for `Y = XW`: `\bar{X} = \bar{Y}W^\top`, `\bar{W} = X^\top \bar{Y}` (shapes force the answer). For elementwise `\phi`: `\bar{x} = \bar{y} \odot \phi'(x)`.

### Second-order differentiation (flagged question)

The Hessian `H_{ij} = \frac{\partial^2 L}{\partial \theta_i \partial \theta_j}` is the symmetric matrix of curvatures: the Taylor expansion is

```
L(\theta + \delta) \approx L(\theta) + g^\top \delta + \tfrac{1}{2}\delta^\top H \delta.
```

Why second derivatives matter:

1. Newton's method: minimise the quadratic model, `\delta = -H^{-1} g`. It rescales each direction by its curvature: big steps along flat directions, small steps along steep ones, and it is invariant to linear reparameterisation. Impractical at `n = 10^9` params (`O(n^2)` memory), hence quasi-Newton (L-BFGS), diagonal approximations (Adam's second moment is a crude diagonal curvature proxy), K-FAC, and Hessian-free methods using only `Hv` products.
2. XGBoost uses them explicitly: each boosting round takes a second-order Taylor expansion of the loss per example, `g_i = \partial_{\hat{y}} l`, `h_i = \partial^2_{\hat{y}} l`, and the optimal leaf weight is `w^* = -\frac{\sum_{i \in \text{leaf}} g_i}{\sum_{i \in \text{leaf}} h_i + \lambda}` with gain scored by `\frac{G^2}{H + \lambda}`: a per-leaf Newton step. This is why XGBoost needs losses with defined second derivatives.
3. Curvature and conditioning: gradient descent's convergence rate on a quadratic depends on `\kappa = \lambda_{\max}(H)/\lambda_{\min}(H)`; error contracts per step like `\left(\frac{\kappa-1}{\kappa+1}\right)`. Ill-conditioned loss surfaces (long narrow valleys) force small LRs and zig-zagging; momentum improves the rate to depend on `\sqrt{\kappa}`; normalisation layers and good init are largely conditioning fixes. Stability: GD diverges if LR `> 2/\lambda_{\max}`; "edge of stability" training sits near this bound.
4. Classifying critical points: `g = 0` with `H \succ 0` is a minimum, `H \prec 0` a maximum, mixed signs a saddle. In high dimensions saddles vastly outnumber local minima; SGD noise helps escape them.
5. Second-order structure also appears in: Gauss-Newton and the Fisher information matrix (PSD Hessian approximations, natural gradient, K-FAC), influence functions (`H^{-1}` appears), sharpness-aware minimisation (flat minima), and pruning (OBD uses Hessian diagonals).

### Convexity basics

`f` is convex iff `f(\lambda x + (1-\lambda) y) \le \lambda f(x) + (1-\lambda) f(y)`; equivalently (differentiable) `f(y) \ge f(x) + \nabla f(x)^\top (y - x)`, the function sits above its tangents; equivalently (twice differentiable) `H \succeq 0` everywhere. Consequences: every local minimum is global; first-order stationarity suffices. Convex in ML: least squares, logistic regression, SVMs, lasso (in their parameters). Deep nets are non-convex, but CE-with-logits is convex in the logits, which is part of why the last layer is well behaved. Strong convexity (`H \succeq \mu I`) plus smoothness (`H \preceq L I`) gives linear convergence for GD with the `\kappa = L/\mu` dependence above.

### Lagrange multipliers, briefly

To optimise `f(x)` subject to `g(x) = 0`: at a constrained optimum, `\nabla f = \lambda \nabla g` (gradients parallel, no feasible descent direction). Form the Lagrangian `\mathcal{L}(x, \lambda) = f(x) - \lambda g(x)` and find stationary points. Inequality constraints add KKT conditions (multipliers `\ge 0`, complementary slackness). ML sightings: softmax as the max-entropy distribution under moment constraints, the constrained view of regularisation (penalty `\lambda` is the multiplier of a norm-ball constraint), SVM duality, and trust-region policy updates (TRPO's KL constraint).
