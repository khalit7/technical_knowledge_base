# Probability and statistics for ML

⏱ 11 min read · +11h 50m resources

Updated 2026-08-24.

## Best resources

- [Mathematics for Machine Learning, ch. 6](https://mml-book.github.io/) (book, ~1h 10m for ch. 6): Deisenroth et al., free PDF; probability, distributions, conjugacy at exactly this level.
- [CS229 probability review notes](https://cs229.stanford.edu/section/cs229-prob.pdf) (~1h): compact refresher; the [CS229 main notes](https://cs229.stanford.edu/main_notes.pdf) (course notes, ~5h) then derive losses as GLM maximum likelihood.
- All of Statistics (Wasserman) (book, ~4h for the estimation and testing chapters): the fastest serious route through estimation and testing; the reference for MLE properties and hypothesis testing.
- [Visual Information Theory (Olah)](https://colah.github.io/posts/2015-09-Visual-Information/) (~40 min): for the entropy/CE side of the same coin (see [information-theory.md](information-theory.md)).

## Independent vs dependent variables (flagged question)

Two unrelated meanings; do not conflate them.

1. Experimental-design sense. The independent variable is what the experimenter sets or controls; the dependent variable is what is observed and measured to see the effect. In ML terms: features/inputs $x$ are the independent variables, the target $y$ is the dependent variable ("$y$ depends on $x$"). Regression literature says covariates/regressors vs response.
2. Probability sense (statistical independence). Random variables $X, Y$ are independent iff $P(X, Y) = P(X)P(Y)$, equivalently $P(Y \mid X) = P(Y)$: knowing one tells you nothing about the other. Independence is a property of the joint distribution, not of who controls what. Conditional independence $X \perp Y \mid Z$ is the version that powers Naive Bayes, graphical models, and the i.i.d. assumption on training samples.

So "the dependent variable" (sense 1) and "these variables are dependent" (sense 2) are different claims: features and targets are dependent in sense 2 precisely when learning is possible.

## Distributions that matter, and the loss each one generates

The unifying idea: pick a distribution for $p(y \mid x)$, take negative log-likelihood, and the standard loss falls out. This is the answer to "why this loss?" every time.

### Bernoulli and binary classification (flagged question)

$Y \in \{0, 1\}$ with $P(Y = 1) = p$: $P(Y = y) = p^y (1-p)^{1-y}$. Mean $p$, variance $p(1-p)$.

Relation to classification, exactly: a binary classifier with sigmoid output $\hat{p} = \sigma(z)$ is modelling $y \mid x \sim \text{Bernoulli}(\hat{p}(x))$. The likelihood of an i.i.d. dataset is $\prod_i \hat{p}_i^{y_i}(1-\hat{p}_i)^{1-y_i}$, and the negative log-likelihood is

$$
-\sum_i \big[ y_i \log \hat{p}_i + (1 - y_i)\log(1 - \hat{p}_i) \big],
$$

which is binary cross-entropy. BCE is not an arbitrary choice: minimising BCE is exactly maximum-likelihood estimation under a Bernoulli model. Consequences: the optimal $\hat{p}$ is the true conditional probability (BCE is a proper scoring rule, so outputs are calibrated probabilities at the optimum), and the gradient through the sigmoid collapses to $\hat{p} - y$ (derived in [calculus-and-optimisation.md](calculus-and-optimisation.md)). Logistic regression = linear model + Bernoulli likelihood; it is the canonical GLM with logit link.

### Categorical and multi-class classification

$Y \in \{1..K\}$, $P(Y = k) = p_k$, $\sum p_k = 1$. Softmax over logits models this; the NLL of a categorical is $-\log p_{y}$, i.e. cross-entropy loss. So softmax + CE is the multiclass Bernoulli story verbatim: CE loss is categorical MLE. (The multinomial distribution is $n$ repeated categorical draws; for one label per example, categorical is the right name.)

### Gaussian and regression

$\mathcal{N}(y; \mu, \sigma^2) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\!\big(-\frac{(y-\mu)^2}{2\sigma^2}\big)$. Model $y \mid x \sim \mathcal{N}(f_\theta(x), \sigma^2)$ with fixed $\sigma$: the NLL is $\frac{1}{2\sigma^2}\sum_i (y_i - f_\theta(x_i))^2 + \text{const}$, i.e. MSE. MSE = Gaussian MLE; L1 loss = Laplace-noise MLE (hence L1's robustness to outliers, Laplace has heavier tails). Multivariate Gaussian $\mathcal{N}(\mu, \Sigma)$: sample via Cholesky $x = \mu + Lz$; log-density is a quadratic form, which is why Gaussians and linear algebra interlock so tightly.

### Poisson

Counts: $P(Y = k) = \frac{\lambda^k e^{-\lambda}}{k!}$, mean = variance = $\lambda$. Poisson regression models $\lambda = e^{z}$ (log link); NLL gives the loss $\lambda - y z$ per example up to constants. Use for count targets (clicks, events per interval); if variance $\gg$ mean (overdispersion), switch to negative binomial.

## MLE vs MAP vs Bayesian

- MLE: $\hat\theta = \arg\max_\theta \log p(D \mid \theta)$. Point estimate; consistent and asymptotically efficient, but overfits small data (a 3/3 coin gives $\hat{p} = 1$).
- MAP: $\arg\max_\theta \left[\log p(D \mid \theta) + \log p(\theta)\right]$. A prior as regulariser: Gaussian prior on weights $\Leftrightarrow$ L2 / weight decay; Laplace prior $\Leftrightarrow$ L1. Still a point estimate.
- Bayesian: keep the whole posterior $p(\theta \mid D) \propto p(D \mid \theta) p(\theta)$; predict by integrating $p(y^* \mid D) = \int p(y^* \mid \theta)\, p(\theta \mid D)\, d\theta$. Gives calibrated uncertainty; usually intractable, hence variational inference, MCMC, deep ensembles as a cheap approximation.

Rule of thumb: everything you train with "loss + regulariser" is MAP whether you say so or not.

## Bias-variance

For squared error at a point, over resampled training sets:

$$
\mathbb{E}\big[(\hat{f}(x) - y)^2\big] = \underbrace{\big(\mathbb{E}[\hat{f}(x)] - f(x)\big)^2}_{\text{bias}^2} + \underbrace{\mathbb{E}\big[(\hat{f}(x) - \mathbb{E}[\hat{f}(x)])^2\big]}_{\text{variance}} + \underbrace{\sigma^2}_{\text{irreducible}}.
$$

Classic regime: capacity up $\Rightarrow$ bias down, variance up. Modern caveat: heavily overparameterised nets can show double descent, where test error falls again past the interpolation threshold; the decomposition still holds, the variance term just behaves non-monotonically. Ensembling reduces variance (averaging), boosting attacks bias.

## Hypothesis testing essentials

- p-value: probability, under the null hypothesis $H_0$, of a result at least as extreme as observed. It is not $P(H_0 \mid \text{data})$. Reject when $p < \alpha$ (conventionally 0.05); with many comparisons, correct (Bonferroni: divide $\alpha$ by number of tests).
- Comparing two models: use paired tests on the same eval instances, because pairing removes the shared per-example variance. Options: paired t-test on per-example metrics; McNemar's test for classifiers (uses only the discordant counts $b$, $c$ where exactly one model is right: $\chi^2 = (b-c)^2/(b+c)$); paired bootstrap (resample the eval set, report how often model A beats B) as the robust default for LLM evals with a few hundred to a few thousand examples.
- Always report uncertainty on benchmark deltas: a 1-point gap on a 500-example eval is roughly within noise ($\pm 2\sqrt{p(1-p)/n} \approx \pm 4$ points at $p \approx 0.5$).

## CLT and concentration

- Law of large numbers: sample means converge to the true mean.
- CLT: $\bar{X}_n \approx \mathcal{N}(\mu, \sigma^2/n)$ for large $n$, regardless of the underlying distribution (finite variance). This is why eval-metric error bars shrink as $1/\sqrt{n}$ and why "4x more eval data halves the error bar".
- Concentration (finite-sample, non-asymptotic): Hoeffding for bounded variables, $P(|\bar{X}_n - \mu| \ge t) \le 2e^{-2nt^2}$. Deviations are exponentially unlikely; this bound underlies generalisation bounds and best-arm identification in bandits/RLHF data selection.
- Practical intuition: in high dimensions, sums and norms concentrate hard; random Gaussian vectors are nearly orthogonal and nearly equal-length, which is why random projections and hashing work.
