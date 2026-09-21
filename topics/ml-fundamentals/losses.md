# Loss functions

⏱ 5 min read · +2h 10m resources

### Best resources

- [A comprehensive guide to loss functions, part 1: regression (Analytics Vidhya / Medium)](https://medium.com/analytics-vidhya/a-comprehensive-guide-to-loss-functions-part-1-regression-ff8b847675d6) (~20 min): the regression-loss walkthrough these notes were seeded from.
- [PyTorch loss function docs](https://pytorch.org/docs/stable/nn.html#loss-functions) (docs, ~20 min): canonical reference for exact formulas and reduction semantics.
- [Focal loss paper (Lin et al. 2017, arXiv:1708.02002)](https://arxiv.org/abs/1708.02002) (45 min): the original derivation and the class-imbalance argument.
- [When does label smoothing help? (Müller et al. 2019, arXiv:1906.02629)](https://arxiv.org/abs/1906.02629) (45 min): what smoothing does to representations and calibration.

### Terminology

- **Loss function**: error for a single datapoint. **Cost function**: aggregated (usually mean) over a batch or dataset. Used interchangeably in practice.
- Choice is driven by the dependent variable: numeric target -> regression loss; probabilistic target -> classification loss.
- Cross entropy = negative log likelihood of the correct class under the model; minimising CE is maximum likelihood estimation.

### Regression losses

| Loss | Formula (per point) | Pros | Cons |
| --- | --- | --- | --- |
| MSE | `(y-\hat y)^2` | Smooth gradient that shrinks near the minimum: clean convergence for small errors | Squaring makes huge errors dominate: drastic update jumps; very outlier-sensitive |
| RMSE | `\sqrt{\text{MSE}}` | Same units as target; less extreme than MSE for large errors, still more outlier-sensitive than MAE | Linear scoring, so gradient does not soften near the minimum |
| MAE | $`\ | y-hat y\ | `$ |
| MAPE | $`\ | y-hat y\ | /\ |
| Huber | quadratic for $`\ | e\ | ledelta`$, linear beyond |
| Log-cosh | `\log\cosh(y-\hat y)` | Huber-shaped but twice differentiable (XGBoost-style second-order methods want this); cheaper than Huber | Fixed scale, no `\delta` to adapt to the data |

Rule of thumb: MSE by default, MAE/Huber when outliers are real data, log-cosh when a second derivative is needed.

### Classification losses

| Loss | Use case | Notes |
| --- | --- | --- |
| Binary cross entropy | Binary and multilabel classification | `-[y\log\hat p + (1-y)\log(1-\hat p)]`; one sigmoid per output for multilabel |
| Categorical cross entropy | Multiclass (softmax outputs) | `-\sum_c y_c \log \hat p_c`; per-example loss, average over the batch for the cost |
| Sparse categorical CE | Multiclass, integer labels | Identical to CCE; takes the class index directly instead of a one-hot vector |
| Label smoothing CE | Overconfident models, calibration | Replace hard one-hot targets with `1-\epsilon` on the true class and `\epsilon/(K-1)` elsewhere; same CE formula, softened targets |
| Weighted CE | Class imbalance | Per-class weight multiplies the loss; upweight the minority class |
| Focal loss | Extreme imbalance (dense detection) | `-(1-\hat p_t)^\gamma \log \hat p_t`: down-weights easy examples so hard examples dominate the gradient |
| Hinge loss | SVMs, max-margin | `\max(0, 1 - y\cdot f(x))` with `y\in\{-1,1\}`; zero loss once margin is satisfied |

### Specialised losses

- **KL divergence** `D_{KL}(P\|Q)=\sum P\log(P/Q)`: distance-like measure between distributions (asymmetric, not a metric). Used as the regulariser in VAEs, in distillation (student matches teacher distribution), and in RLHF (policy stays near reference).
- **L1 / L2 / elastic net penalties**: additive regularisation terms, not task losses. L1 (lasso) drives weights to exactly zero (sparsity, feature selection); L2 (ridge) shrinks weights toward zero without zeroing them; elastic net combines both. Details in [Regularisation](regularisation.md).
- **Adversarial loss**: GAN minimax objective; generator and discriminator trained against each other. See [Topic: generative-and-multimodal](../generative-and-multimodal/summary.md).

### Cross-links

- Class-imbalance handling in practice: [Debugging training](debugging-training.md)
- Entropy vs cross entropy vs KL: [Evaluation metrics](metrics.md)
