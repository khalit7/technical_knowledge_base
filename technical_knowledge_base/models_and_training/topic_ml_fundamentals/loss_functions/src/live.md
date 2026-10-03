<!-- Notion fetch of "Loss functions" (3c65c17b0d0d8161a72bc8c572f37d55), last edited 2026-09-22T00:06:00.473Z, fetched 2026-10-03. Content block copied verbatim from the tool result (JSON-unescaped). No child pages, databases or video. Note: Notion's export garbled the MAE, MAPE and Huber rows of the regression table (the "|" in |y - ŷ| split the cells); kept exactly as returned. -->
<page url="https://app.notion.com/p/3c65c17b0d0d8161a72bc8c572f37d55">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Loss functions"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +2h 10m resources
## Best resources
- [A comprehensive guide to loss functions, part 1: regression (Analytics Vidhya / Medium)](https://medium.com/analytics-vidhya/a-comprehensive-guide-to-loss-functions-part-1-regression-ff8b847675d6) (\~20 min): the regression-loss walkthrough, loss by loss.
- [PyTorch loss function docs](https://pytorch.org/docs/stable/nn.html#loss-functions) (docs, \~20 min): canonical reference for exact formulas and reduction semantics.
- [Focal loss paper (Lin et al. 2017, arXiv:1708.02002)](https://arxiv.org/abs/1708.02002) (45 min): the original derivation and the class-imbalance argument.
- [When does label smoothing help? (Müller et al. 2019, arXiv:1906.02629)](https://arxiv.org/abs/1906.02629) (45 min): what smoothing does to representations and calibration.
## Terminology
- **Loss function**: error for a single datapoint. **Cost function**: aggregated (usually mean) over a batch or dataset. Used interchangeably in practice.
- Choice is driven by the dependent variable: numeric target -\> regression loss; probabilistic target -\> classification loss.
- Cross entropy = negative log likelihood of the correct class under the model; minimising CE is maximum likelihood estimation.
## Regression losses
<table header-row="true">
<tr>
<td>Loss</td>
<td>Formula (per point)</td>
<td>Pros</td>
<td>Cons</td>
</tr>
<tr>
<td>MSE</td>
<td>$`(y-\hat y)^2`$</td>
<td>Smooth gradient that shrinks near the minimum: clean convergence for small errors</td>
<td>Squaring makes huge errors dominate: drastic update jumps; very outlier-sensitive</td>
</tr>
<tr>
<td>RMSE</td>
<td>$`\sqrt{\text{MSE}}`$</td>
<td>Same units as target; less extreme than MSE for large errors, still more outlier-sensitive than MAE</td>
<td>Linear scoring, so gradient does not soften near the minimum</td>
</tr>
<tr>
<td>MAE</td>
<td>\$\`\\</td>
<td>y-hat y\\</td>
<td>\`\$</td>
</tr>
<tr>
<td>MAPE</td>
<td>\$\`\\</td>
<td>y-hat y\\</td>
<td>/\\</td>
</tr>
<tr>
<td>Huber</td>
<td>quadratic for \$\`\\</td>
<td>e\\</td>
<td>ledelta\`\$, linear beyond</td>
</tr>
<tr>
<td>Log-cosh</td>
<td>$`\log\cosh(y-\hat y)`$</td>
<td>Huber-shaped but twice differentiable (XGBoost-style second-order methods want this); cheaper than Huber</td>
<td>Fixed scale, no $`\delta`$ to adapt to the data</td>
</tr>
</table>
Rule of thumb: MSE by default, MAE/Huber when outliers are real data, log-cosh when a second derivative is needed.
## Classification losses
<table header-row="true">
<tr>
<td>Loss</td>
<td>Use case</td>
<td>Notes</td>
</tr>
<tr>
<td>Binary cross entropy</td>
<td>Binary and multilabel classification</td>
<td>$`-[y\log\hat p + (1-y)\log(1-\hat p)]`$; one sigmoid per output for multilabel</td>
</tr>
<tr>
<td>Categorical cross entropy</td>
<td>Multiclass (softmax outputs)</td>
<td>$`-\sum_c y_c \log \hat p_c`$; per-example loss, average over the batch for the cost</td>
</tr>
<tr>
<td>Sparse categorical CE</td>
<td>Multiclass, integer labels</td>
<td>Identical to CCE; takes the class index directly instead of a one-hot vector</td>
</tr>
<tr>
<td>Label smoothing CE</td>
<td>Overconfident models, calibration</td>
<td>Replace hard one-hot targets with $`1-\epsilon`$ on the true class and $`\epsilon/(K-1)`$ elsewhere; same CE formula, softened targets</td>
</tr>
<tr>
<td>Weighted CE</td>
<td>Class imbalance</td>
<td>Per-class weight multiplies the loss; upweight the minority class</td>
</tr>
<tr>
<td>Focal loss</td>
<td>Extreme imbalance (dense detection)</td>
<td>$`-(1-\hat p_t)^\gamma \log \hat p_t`$: down-weights easy examples so hard examples dominate the gradient</td>
</tr>
<tr>
<td>Hinge loss</td>
<td>SVMs, max-margin</td>
<td>$`\max(0, 1 - y\cdot f(x))`$ with $`y\in\{-1,1\}`$; zero loss once margin is satisfied</td>
</tr>
</table>
## Specialised losses
- **KL divergence** $`D_{KL}(P\|Q)=\sum P\log(P/Q)`$: distance-like measure between distributions (asymmetric, not a metric). Used as the regulariser in VAEs, in distillation (student matches teacher distribution), and in RLHF (policy stays near reference).
- **L1 / L2 / elastic net penalties**: additive regularisation terms, not task losses. L1 (lasso) drives weights to exactly zero (sparsity, feature selection); L2 (ridge) shrinks weights toward zero without zeroing them; elastic net combines both. Details in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81e988b5c3cb5e197f98"/>.
- **Adversarial loss**: GAN minimax objective; generator and discriminator trained against each other. See <mention-page url="https://app.notion.com/p/3c65c17b0d0d817ab6ade318917bff55"/>.
## Cross-links
- Class-imbalance handling in practice: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70"/>
- Entropy vs cross entropy vs KL: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81a29acef722e842a29b"/>
</content>
</page>
