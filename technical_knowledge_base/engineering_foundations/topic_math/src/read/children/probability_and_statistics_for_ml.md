Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d815f9a47d613409b5a0c as of 2026-09-30T16:03:01.187Z:
<page url="https://app.notion.com/p/3c65c17b0d0d815f9a47d613409b5a0c">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538" title="Topic: math"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Probability and statistics for ML"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="notion-file-block://edcab18b-3a67-4cdf-94e1-4231616853c5/656eaeb4-e5a0-4a98-9e10-f179cda00450?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=probability-and-statistics-for-ml.html">Interactive: Probability and statistics for ML</embed>
⏱ 22 min read · +11h 50m resources
## What this page is for
Probability is the language in which a model states what it believes, and statistics is the discipline of deciding what data actually licenses you to believe. In ML they do two concrete jobs.
**They explain the loss.** A classifier or regressor is a machine that outputs the parameters of a probability distribution over the target: a probability for a yes/no label, a vector of probabilities for $`K`$ classes, a mean for a real number, a rate for a count. Once you say which distribution, "train the model" means "make the observed targets as probable as possible", and taking the negative log of that probability produces binary cross-entropy, softmax cross-entropy, mean squared error, L1 or the Poisson loss. No loss has to be memorised: each is the consequence of one modelling choice.
**They keep evaluation honest.** An eval score is an average over a finite sample of examples, so it is a random quantity with an error bar. Knowing how big that error bar is (it shrinks like $`1/\sqrt{n}`$), and how to compare two models on the same examples (paired tests, the bootstrap), is what separates a real improvement from noise.
The rest of the page builds both jobs from a handful of definitions.
## Definitions
- **Random variable.** A quantity whose value is uncertain, written in capitals ($`X`$, $`Y`$); a particular value it takes is written in lower case ($`x`$, $`y`$).
- **Distribution.** For a discrete variable, a probability mass function $`P(X = x)`$ that is non-negative and sums to 1. For a continuous variable, a probability density $`p(x)`$ that integrates to 1; a density can exceed 1, and only its integral over an interval is a probability.
- **Joint, marginal, conditional.** The joint $`P(X, Y)`$ gives the probability of each pair of values. The marginal is obtained by summing the other variable out, $`P(X = x) = \sum_y P(X = x, Y = y)`$. The conditional is $`P(Y \mid X) = P(X, Y) / P(X)`$: the joint restricted to the rows where $`X`$ took its value, renormalised. Rearranged, $`P(X, Y) = P(Y \mid X) P(X)`$, and writing it both ways gives Bayes' rule $`P(\theta \mid D) = P(D \mid \theta) P(\theta) / P(D)`$.
- **Expectation and variance.** $`\mathbb{E}[X] = \sum_x x\,P(X = x)`$ (an integral for a density) is the probability-weighted average; $`\operatorname{Var}(X) = \mathbb{E}[(X - \mathbb{E}[X])^2]`$ is the average squared distance from it, and its square root is the standard deviation.
- **i.i.d.** Independent and identically distributed: every example is drawn from the same distribution, and no example tells you anything about another. It is the assumption that lets the probability of a whole dataset factor into a product over examples.
- **Likelihood.** For fixed data $`D`$, the probability of the data as a function of the parameters, $`L(\theta) = p(D \mid \theta)`$. It is not a distribution over $`\theta`$ (it need not integrate to 1 over $`\theta`$). Under i.i.d. it is a product, so its logarithm is a sum, $`\log p(D \mid \theta) = \sum_i \log p(y_i \mid x_i, \theta)`$, which is what makes it trainable by minibatch gradient descent.
- **Negative log-likelihood (NLL).** $`-\log p(D \mid \theta)`$. Maximising the likelihood and minimising the NLL are the same thing; the minus sign turns it into a loss and the log turns products into sums and stops tiny probabilities underflowing.
## Independent vs dependent variables (flagged question)
Two unrelated meanings; do not conflate them.
1. Experimental-design sense. The independent variable is what the experimenter sets or controls; the dependent variable is what is observed and measured to see the effect. In ML terms: features/inputs $`x`$ are the independent variables, the target $`y`$ is the dependent variable ("$`y`$ depends on $`x`$"). Regression literature says covariates/regressors vs response.
2. Probability sense (statistical independence). Random variables $`X, Y`$ are independent iff $`P(X, Y) = P(X)P(Y)`$ for every pair of values, equivalently $`P(Y \mid X) = P(Y)`$: knowing one tells you nothing about the other. Independence is a property of the joint distribution, not of who controls what. Conditional independence $`X \perp Y \mid Z`$ (read "$`X`$ is independent of $`Y`$ given $`Z`$") means $`P(X, Y \mid Z) = P(X \mid Z) P(Y \mid Z)`$: once $`Z`$ is known, the other variable adds nothing. It is the version that powers Naive Bayes (features assumed independent given the class, so $`P(x_1, \dots, x_d \mid c) = \prod_j P(x_j \mid c)`$), graphical models (the graph is a map of which conditional independences hold), and the i.i.d. assumption on training samples.
So "the dependent variable" (sense 1) and "these variables are dependent" (sense 2) are different claims: features and targets are dependent in sense 2 precisely when learning is possible. If $`P(y \mid x) = P(y)`$, the best any model can do is predict the base rate.
**Worked example.** Let $`X = 1`$ mean "it rained" with $`P(X = 1) = 0.3`$, and $`Y = 1`$ mean "the person carried an umbrella", with $`P(Y = 1 \mid X = 1) = 0.8`$ and $`P(Y = 1 \mid X = 0) = 0.2`$. The marginal is $`P(Y = 1) = 0.8 \times 0.3 + 0.2 \times 0.7 = 0.24 + 0.14 = 0.38`$. The joint cell $`P(X = 1, Y = 1) = 0.8 \times 0.3 = 0.24`$, while the product of marginals is $`0.3 \times 0.38 = 0.114`$. They differ, so $`X`$ and $`Y`$ are dependent: seeing an umbrella raises the probability of rain from 0.3 to $`0.24 / 0.38 \approx 0.63`$. Had the two conditionals been equal (say both 0.38), every joint cell would equal the product of its marginals and the variables would be independent.
## Distributions that matter, and the loss each one generates
The unifying idea: pick a distribution for $`p(y \mid x)`$, let the network output its parameters, take the negative log-likelihood, and the standard loss falls out. This is the answer to "why this loss?" every time.
### Bernoulli and binary classification (flagged question)
A Bernoulli variable is a single yes/no trial: $`Y \in \{0, 1\}`$ with $`P(Y = 1) = p`$. Both cases fit in one formula:
$$
P(Y = y) = p^y (1-p)^{1-y}.
$$
- $`y`$: the observed outcome, 0 or 1; the exponents switch on the factor for the outcome that happened ($`p`$ when $`y = 1`$, $`1 - p`$ when $`y = 0`$).
- $`p`$: the probability of a 1, the distribution's only parameter.
Mean $`p`$, variance $`p(1-p)`$, which is largest (0.25) at $`p = 0.5`$ and zero when the outcome is certain.
Relation to classification, exactly: a binary classifier with sigmoid output $`\hat{p} = \sigma(z) = 1/(1 + e^{-z})`$ is modelling $`y \mid x \sim \text{Bernoulli}(\hat{p}(x))`$. The likelihood of an i.i.d. dataset is $`\prod_i \hat{p}_i^{y_i}(1-\hat{p}_i)^{1-y_i}`$, and the negative log-likelihood is
$$
-\sum_i \big[ y_i \log \hat{p}_i + (1 - y_i)\log(1 - \hat{p}_i) \big],
$$
- $`i`$: indexes the training examples.
- $`y_i`$: the label of example $`i`$, 0 or 1.
- $`\hat{p}_i`$: the model's predicted probability that example $`i`$ is a 1.
which is binary cross-entropy (BCE). BCE is not an arbitrary choice: minimising BCE is exactly maximum-likelihood estimation under a Bernoulli model. Consequences:
- **The optimum is the true conditional probability.** BCE is a proper scoring rule: a loss whose expected value, when outcomes are drawn with probability $`q`$, is minimised by predicting exactly $`q`$. So at the optimum the outputs are calibrated probabilities, not just scores.
- **The gradient collapses to prediction minus target.** For one example, $`\partial L / \partial \hat{p} = (\hat{p} - y) / (\hat{p}(1 - \hat{p}))`$, and the sigmoid's derivative is $`\sigma'(z) = \hat{p}(1 - \hat{p})`$; multiplying, the $`\hat{p}(1-\hat{p})`$ factors cancel and $`\partial L / \partial z = \hat{p} - y`$. The full derivation, and why this is why BCE is computed on logits, is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b"/>.
- **Logistic regression = linear model + Bernoulli likelihood.** It is the canonical generalised linear model (GLM): a GLM predicts the mean of an exponential-family distribution through a link function applied to a linear score, and for the Bernoulli the canonical link is the logit $`z = \log(p / (1 - p))`$, whose inverse is the sigmoid.
**Worked example.** A spam filter outputs $`\hat{p} = 0.8`$. If the email is spam ($`y = 1`$), the loss is $`-\log 0.8 = 0.223`$ and the logit gradient is $`0.8 - 1 = -0.2`$ (push $`z`$ up a little). If it is not spam ($`y = 0`$), the loss is $`-\log 0.2 = 1.609`$ and the gradient is $`0.8 - 0 = 0.8`$ (push $`z`$ down hard). A confident wrong answer costs seven times as much as the matching right answer, and the loss grows without bound as a wrong prediction approaches certainty.
### Categorical and multi-class classification
A categorical variable is one draw among $`K`$ classes: $`Y \in \{1, \dots, K\}`$, $`P(Y = k) = p_k`$, $`\sum_k p_k = 1`$. Softmax turns the network's $`K`$ logits into such a vector:
$$
p_k = \frac{e^{z_k}}{\sum_{j=1}^{K} e^{z_j}}, \qquad L = -\log p_{y}.
$$
- $`z_k`$: the logit (unnormalised score) for class $`k`$.
- $`p_k`$: the predicted probability of class $`k`$; exponentiating makes it positive and dividing by the sum makes the vector sum to 1.
- $`y`$: the index of the true class; the NLL of a categorical is minus the log of the probability given to it, which is the cross-entropy loss.
So softmax + CE is the multiclass Bernoulli story verbatim: CE loss is categorical MLE, and its logit gradient is again prediction minus target, $`p - \mathbf{1}_y`$ ($`\mathbf{1}_y`$ is the one-hot vector of the true class). With $`K = 2`$ it reduces exactly to sigmoid + BCE. (The multinomial distribution is $`n`$ repeated categorical draws; for one label per example, categorical is the right name.)
**Worked example.** Logits $`z = (2, 1, 0)`$ for classes A, B, C. Then $`e^z = (7.389, 2.718, 1)`$, summing to 11.107, so $`p = (0.665, 0.245, 0.090)`$. If the true class is A, the loss is $`-\log 0.665 = 0.408`$ and the gradient with respect to the logits is $`(0.665 - 1, 0.245, 0.090) = (-0.335, 0.245, 0.090)`$: raise A's logit, lower the others in proportion to the probability they stole.
### Gaussian and regression
For a real-valued target, the Gaussian (normal) density is
$$
\mathcal{N}(y; \mu, \sigma^2) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\!\Big(-\frac{(y-\mu)^2}{2\sigma^2}\Big).
$$
- $`\mu`$: the mean, the centre of the bell.
- $`\sigma^2`$: the variance, its width; $`\sigma`$ is the standard deviation.
Model $`y \mid x \sim \mathcal{N}(f_\theta(x), \sigma^2)`$: the network $`f_\theta`$ predicts the mean and $`\sigma`$ is fixed. Taking minus the log of the density for each example and summing,
$$
-\log p(D \mid \theta) = \frac{1}{2\sigma^2}\sum_{i=1}^{n} \big(y_i - f_\theta(x_i)\big)^2 + \frac{n}{2}\log(2\pi\sigma^2),
$$
- $`n`$: the number of examples; $`f_\theta(x_i)`$ the prediction for example $`i`$.
- The second term does not depend on $`\theta`$, and the factor $`1/(2\sigma^2)`$ only rescales, so minimising the NLL over $`\theta`$ is minimising the sum of squared errors: MSE is Gaussian MLE.
**L1 is Laplace MLE.** The Laplace density $`\frac{1}{2b}\exp(-|y - \mu|/b)`$ has NLL $`|y - \mu|/b + \log 2b`$, so assuming Laplace noise gives the absolute-error (L1) loss. Laplace has heavier tails than a Gaussian, so a large residual is not astronomically improbable and is penalised linearly rather than quadratically: one outlier cannot dominate the fit. Relatedly, the constant that minimises squared error over a sample is its mean, while the constant that minimises absolute error is its median, and the median ignores how far away an outlier is.
**Worked example.** With $`\sigma = 1`$, a prediction of 2.5 for a target of 3 has NLL $`\tfrac12 (0.5)^2 + \tfrac12 \log 2\pi = 0.125 + 0.919 = 1.044`$; only the 0.125 depends on the model, and it is half the squared error.
**Multivariate Gaussian** $`\mathcal{N}(\mu, \Sigma)`$, with mean vector $`\mu`$ and covariance matrix $`\Sigma`$: its log-density is $`-\tfrac12 (x - \mu)^\top \Sigma^{-1} (x - \mu)`$ plus a constant, a quadratic form, which is why Gaussians and linear algebra interlock so tightly. To sample from it, factor $`\Sigma = L L^\top`$ with the Cholesky decomposition ($`L`$ lower triangular), draw $`z`$ with independent standard normal entries, and return $`x = \mu + Lz`$; its covariance is $`L\,\mathbb{E}[zz^\top] L^\top = LL^\top = \Sigma`$. The decompositions themselves are on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701"/>.
### Poisson
For counts $`k = 0, 1, 2, \dots`$ (clicks, events per interval):
$$
P(Y = k) = \frac{\lambda^k e^{-\lambda}}{k!}.
$$
- $`\lambda`$: the rate, the expected count per interval; mean = variance = $`\lambda`$.
- $`k!`$: $`k`$ factorial, which normalises the distribution.
Poisson regression models $`\lambda = e^{z}`$ (the log link keeps the rate positive). The NLL of one example is $`\lambda - y\log\lambda + \log y! = e^{z} - y z + \log y!`$, and $`\log y!`$ does not depend on the model, so the loss is $`e^z - yz`$ per example; its gradient $`e^z - y = \lambda - y`$ is once more prediction minus target. **Worked example:** predicted rate $`\lambda = 2`$, observed $`y = 3`$: $`P(Y = 3) = 8e^{-2}/6 = 0.180`$, NLL $`= 2 - 3\log 2 + \log 6 = 1.712`$, of which the model-dependent loss is $`2 - 3 \times 0.693 = -0.079`$ (a loss that drops constants can be negative). If the observed variance is much larger than the mean (overdispersion, common when some users click far more than others), switch to the negative binomial, whose variance $`\mu + \mu^2/r`$ exceeds its mean $`\mu`$ by an amount set by a dispersion parameter $`r`$.
### The pattern in one table
<table header-row="true">
<tr>
<td>Target</td>
<td>Distribution for $`y \mid x`$</td>
<td>Output activation</td>
<td>Loss (its NLL)</td>
<td>Gradient w.r.t. the logit</td>
</tr>
<tr>
<td>Binary label</td>
<td>Bernoulli</td>
<td>sigmoid</td>
<td>binary cross-entropy</td>
<td>$`\hat{p} - y`$</td>
</tr>
<tr>
<td>One of $`K`$ classes</td>
<td>Categorical</td>
<td>softmax</td>
<td>cross-entropy</td>
<td>$`p - \mathbf{1}_y`$</td>
</tr>
<tr>
<td>Real number</td>
<td>Gaussian, fixed $`\sigma`$</td>
<td>none (identity)</td>
<td>squared error (MSE)</td>
<td>$`(\hat{y} - y)/\sigma^2`$</td>
</tr>
<tr>
<td>Real number with outliers</td>
<td>Laplace, fixed $`b`$</td>
<td>none (identity)</td>
<td>absolute error (L1)</td>
<td>$`\operatorname{sign}(\hat{y} - y)/b`$</td>
</tr>
<tr>
<td>Count</td>
<td>Poisson</td>
<td>exp</td>
<td>$`e^z - yz`$</td>
<td>$`\lambda - y`$</td>
</tr>
</table>
## MLE vs MAP vs Bayesian
Three things you can do with a likelihood, in increasing order of how much uncertainty you keep.
**MLE** (maximum-likelihood estimation): $`\hat\theta = \arg\max_\theta \log p(D \mid \theta)`$. A single point estimate: the parameters that make the data most probable. It is consistent (it converges to the true parameter as data grows) and asymptotically efficient (no consistent estimator has lower variance in the large-data limit), but it overfits small data: a coin that lands heads 3 times out of 3 gives $`\hat{p} = 3/3 = 1`$, a confident claim that tails is impossible.
**MAP** (maximum a posteriori): $`\hat\theta = \arg\max_\theta \left[\log p(D \mid \theta) + \log p(\theta)\right]`$. Add the log of a prior $`p(\theta)`$, a distribution expressing what you believed before seeing data, and take the peak of the posterior. The prior acts as a regulariser. Still a point estimate.
**Bayesian**: keep the whole posterior $`p(\theta \mid D) \propto p(D \mid \theta) p(\theta)`$ and predict by averaging over it:
$$
p(y^* \mid D) = \int p(y^* \mid \theta)\, p(\theta \mid D)\, d\theta.
$$
- $`y^*`$: a new, unseen outcome to predict.
- $`p(\theta \mid D)`$: the posterior, how plausible each parameter value is after the data.
- The integral weights every parameter value's prediction by its plausibility, so uncertainty about $`\theta`$ becomes honest uncertainty about $`y^*`$.
It gives calibrated uncertainty, but for a neural network the integral is intractable, hence the approximations: variational inference (fit a simple distribution, such as a Gaussian per weight, to the posterior by optimisation), Markov chain Monte Carlo (MCMC: draw samples from the posterior with a random walk that visits regions in proportion to their probability), and deep ensembles (train several networks from different random initialisations and average them) as a cheap approximation.
**Gaussian prior = L2, Laplace prior = L1.** Put an independent Gaussian prior $`w_j \sim \mathcal{N}(0, \tau^2)`$ on every weight. Then $`-\log p(w) = \frac{1}{2\tau^2}\sum_j w_j^2 + \text{const}`$, and the MAP objective becomes
$$
\text{NLL}(w) + \lambda \|w\|_2^2, \qquad \lambda = \frac{1}{2\tau^2},
$$
- $`\tau^2`$: the prior variance, how large you believe weights can plausibly be.
- $`\lambda`$: the L2 (weight-decay) strength; a tight prior (small $`\tau`$) means strong regularisation.
A Laplace prior $`\frac{1}{2b}e^{-|w_j|/b}`$ gives $`\frac{1}{b}\sum_j |w_j|`$, the L1 penalty, whose sharp point at zero drives many weights exactly to zero. Rule of thumb: everything you train with "loss + regulariser" is MAP whether you say so or not.
**Worked example: the 3-for-3 coin with a Beta prior.** The Beta distribution $`\text{Beta}(a, b)`$ is a density on $`[0, 1]`$ proportional to $`p^{a-1}(1-p)^{b-1}`$; its mean is $`a/(a+b)`$, and $`a - 1`$, $`b - 1`$ act like heads and tails already seen. It is conjugate to the Bernoulli: a Beta prior times a Bernoulli likelihood with $`h`$ heads and $`t`$ tails gives a Beta posterior, $`\text{Beta}(a + h, b + t)`$. Take the mild prior $`\text{Beta}(2, 2)`$ (one imaginary head and one imaginary tail) and the data $`h = 3`$, $`t = 0`$:
- MLE: $`h / (h + t) = 3/3 = 1`$.
- MAP: the posterior is $`\text{Beta}(5, 2)`$, whose mode is $`(a + h - 1)/(a + b + h + t - 2) = 4/5 = 0.8`$.
- Bayesian: the predictive probability that the next toss is heads is the posterior mean, $`5/7 = 0.714`$. The posterior also says how unsure that is: a $`\text{Beta}(a, b)`$ has variance $`ab / ((a + b)^2 (a + b + 1))`$, so $`\text{Beta}(5, 2)`$ has standard deviation $`\sqrt{10/392} = 0.16`$.
Three flips move the estimate far from 0.5 but no longer to certainty. As the data grows, the imaginary flips are swamped and all three answers converge on $`h / (h + t)`$: priors matter most when data is scarce.
## Bias-variance
The training set is itself a random sample, so the fitted model $`\hat{f}`$ is a random function: retrain on a fresh sample and you get a slightly different one. Bias-variance splits the expected error at a point into what is wrong on average and what wobbles from sample to sample. For squared error, with the target $`y = f(x) + \varepsilon`$ where the noise $`\varepsilon`$ has mean 0 and variance $`\sigma^2`$:
$$
\mathbb{E}\big[(\hat{f}(x) - y)^2\big] = \underbrace{\big(\mathbb{E}[\hat{f}(x)] - f(x)\big)^2}_{\text{bias}^2} + \underbrace{\mathbb{E}\big[(\hat{f}(x) - \mathbb{E}[\hat{f}(x)])^2\big]}_{\text{variance}} + \underbrace{\sigma^2}_{\text{irreducible}}.
$$
- $`f(x)`$: the true function at $`x`$; $`\hat{f}(x)`$ the model's prediction there.
- $`\mathbb{E}`$: the average over resampled training sets (and the noise in $`y`$).
- $`\text{bias}^2`$: how far the average prediction sits from the truth; the error of the model family's systematic assumptions.
- $`\text{variance}`$: how much the prediction scatters around its own average from one training set to another.
- $`\sigma^2`$: the noise in the target itself, which no model can remove.
The derivation is two lines: write $`\hat{f} - y = (\hat{f} - \mathbb{E}\hat{f}) + (\mathbb{E}\hat{f} - f) - \varepsilon`$, square, and take expectations; every cross term has a factor with mean zero, so only the three squares survive.
**Worked example: shrinking an estimate.** Estimate a mean $`\mu = 1`$ from $`n = 4`$ samples of variance $`\sigma^2 = 4`$. The sample mean $`\bar{x}`$ is unbiased with variance $`\sigma^2/n = 1`$, so its mean squared error is 1. The shrunk estimator $`0.5\,\bar{x}`$ has bias $`0.5 - 1 = -0.5`$ (bias² 0.25) and variance $`0.5^2 \times 1 = 0.25`$, so its error is $`0.25 + 0.25 = 0.5`$: half the error, bought by accepting bias. This is exactly what a regulariser does, and why MAP with a prior pulling towards zero beats MLE on small data. (No irreducible term appears here because the target is the fixed number $`\mu`$, not a noisy $`y`$.)
Classic regime: capacity up $`\Rightarrow`$ bias down, variance up, so test error traces a U against model size. Modern caveat: heavily overparameterised nets can show double descent. Test error rises as capacity approaches the interpolation threshold (the size at which the model can first fit the training set exactly, with zero training error), then falls again past it, because among the many models that interpolate, training finds smooth ones. The decomposition still holds; the variance term just behaves non-monotonically. Ensembling reduces variance (averaging $`M`$ models with independent errors divides the variance by $`M`$; correlated errors give less), boosting attacks bias (each new weak learner fits what the ensemble still gets wrong).
## Hypothesis testing essentials
A test asks whether an observed effect could plausibly be chance. You state a null hypothesis $`H_0`$ (no effect: the coin is fair, the two models are equally accurate), compute a test statistic from the data, and ask how surprising it would be if $`H_0`$ were true.
**p-value**: the probability, under $`H_0`$, of a result at least as extreme as the one observed. It is not $`P(H_0 \mid \text{data})`$, the probability that the null is true; that would need a prior. **Worked example:** 9 heads in 10 tosses of a supposedly fair coin. $`P(\ge 9 \text{ heads}) = (\binom{10}{9} + \binom{10}{10}) / 2^{10} = 11/1024 = 0.011`$, and counting the equally extreme "at most 1 head" too gives a two-sided p-value of $`0.021`$.
**Significance level and multiple comparisons.** Reject $`H_0`$ when $`p < \alpha`$ (conventionally 0.05), accepting a 5% false-positive rate per test. With many tests the false positives accumulate: 20 independent tests at 0.05 on true nulls produce at least one "significant" result with probability $`1 - 0.95^{20} = 0.64`$. The Bonferroni correction divides $`\alpha`$ by the number of tests (0.05 / 20 = 0.0025 each), which guarantees at most a 5% chance of any false positive at the cost of power.
**Error bar on one score.** An accuracy $`p`$ measured on $`n`$ examples is a mean of Bernoulli outcomes, with standard error $`\sqrt{p(1-p)/n}`$, and an approximate 95% interval of $`\pm 2`$ standard errors (1.96 exactly). At $`p \approx 0.5`$ and $`n = 500`$ that is $`\pm 2\sqrt{0.25/500} = \pm 0.045`$, about $`\pm 4.5`$ points. A 1-point gap between two models on a 500-example eval is well within that noise.
**Comparing two models: pair them.** Both models are scored on the same examples, and most of the variation in a score comes from which examples are easy or hard, which both models share. A paired test looks only at per-example differences, so the shared difficulty cancels. Options: a paired t-test on per-example metrics; McNemar's test for classifiers; the paired bootstrap.
**McNemar's test** uses only the discordant counts: $`b`$ examples where model A is right and B wrong, and $`c`$ where B is right and A wrong. Under $`H_0`$ each discordant example is equally likely to fall either way, and
$$
\chi^2 = \frac{(b - c)^2}{b + c}
$$
This is compared with a chi-squared distribution with one degree of freedom (5% critical value 3.84). Some texts subtract 1 from $`|b - c|`$ before squaring (a continuity correction), which is slightly more conservative. Examples where both models agree carry no information about which is better and drop out.
**Worked example.** On 500 examples, A beats B on $`b = 30`$ and B beats A on $`c = 25`$, so A leads by $`5/500 = 1`$ point. $`\chi^2 = 25/55 = 0.45`$, p ≈ 0.50: no evidence of a difference. The paired standard error of the difference is $`\sqrt{(b + c) - (b - c)^2/n}\,/\,n = \sqrt{54.95}/500 = 0.0148`$, a 95% interval of about $`\pm 3`$ points; unpaired, treating the two scores as independent, it would be about $`\pm 6.3`$ points, so pairing halves the error bar but still cannot rescue a 1-point claim. With $`b = 30`$, $`c = 15`$ (a 3-point lead), $`\chi^2 = 225/45 = 5.0 > 3.84`$, p ≈ 0.025: significant at 0.05 (4.36 and p ≈ 0.037 with the continuity correction).
**Paired bootstrap**, the robust default for LLM evals with a few hundred to a few thousand examples, needs no distributional assumption. Keep each example's pair of scores together, then repeat many times (a few thousand is typical): draw $`n`$ examples with replacement from the eval set, and compute A's score minus B's on that resample. The spread of those differences is the uncertainty of the delta (its 2.5th and 97.5th percentiles give a 95% interval), and the fraction of resamples in which A beats B says how often the ordering survives resampling.
**Always report uncertainty on benchmark deltas**, with the number of examples and the test used.
## CLT and concentration
Why averages behave, and how fast.
**Law of large numbers**: the sample mean $`\bar{X}_n = \frac{1}{n}\sum_{i=1}^n X_i`$ of i.i.d. variables converges to the true mean $`\mu`$ as $`n`$ grows.
**Central limit theorem (CLT)**: for large $`n`$, regardless of the shape of the underlying distribution (as long as its variance is finite),
$$
\bar{X}_n \approx \mathcal{N}\!\Big(\mu, \frac{\sigma^2}{n}\Big).
$$
- $`\mu`$, $`\sigma^2`$: the mean and variance of a single $`X_i`$.
- $`\sigma^2 / n`$: the variance of the average, so its standard deviation (the standard error) is $`\sigma / \sqrt{n}`$.
This is why eval-metric error bars shrink as $`1/\sqrt{n}`$, and why 4 times more eval data halves the error bar: at accuracy 0.5 the standard error is $`\sqrt{0.25/500} = 0.022`$ on 500 examples and $`\sqrt{0.25/2000} = 0.011`$ on 2,000. It is also why the $`\pm 2`$ standard-error intervals above are legitimate even though each example's score is a 0 or a 1.
**Concentration** (finite-sample, non-asymptotic): the CLT says what happens in the limit; a concentration inequality gives a guarantee at every $`n`$. Hoeffding's inequality, for i.i.d. variables bounded in $`[0, 1]`$:
$$
P\big(|\bar{X}_n - \mu| \ge t\big) \le 2e^{-2nt^2}.
$$
- $`t`$: the deviation you are worried about; the bound falls exponentially in $`n t^2`$. For variables in $`[a, b]`$, the exponent is divided by $`(b - a)^2`$.
**Worked example:** on 500 examples, the chance that a measured accuracy is off by 5 points or more is at most $`2e^{-2 \times 500 \times 0.05^2} = 2e^{-2.5} = 0.16`$; to push that below 0.05 you need $`n \ge \ln(2/0.05)/(2 \times 0.05^2) = 738`$ examples. Hoeffding is looser than the CLT (it assumes the worst-case variance) but it is a guarantee rather than an approximation. Bounds of this shape underlie generalisation bounds and best-arm identification in bandits and in RLHF data selection, where you must decide from finitely many samples which option is best.
**Practical intuition: high dimensions concentrate hard.** Sums of many independent terms are sharply peaked, so the squared norm of a random Gaussian vector in $`d`$ dimensions is close to $`d`$ (its length close to $`\sqrt{d}`$), and the cosine similarity of two independent random vectors has standard deviation about $`1/\sqrt{d}`$ (about 0.03 at $`d = 1024`$). Random vectors are nearly orthogonal and nearly equal-length, which is why random projections and hashing work.
## Common mistakes
- **Reading a p-value as the probability the null is true**, or 1 minus it as the probability the result is real. It is the probability of data this extreme if the null were true.
- **Comparing models with unpaired error bars**, or with no error bars. On the same eval set, use a paired test; an unpaired interval is too wide, and none at all lets noise masquerade as progress.
- **Testing many variants and reporting the best** without a multiple-comparison correction or a held-out confirmation.
- **Treating the loss as a free design choice.** Choosing MSE for a binary label is choosing a Gaussian model of a yes/no outcome; the loss and the distribution are one decision.
- **Mixing up the two meanings of "independent".** A controlled input is not thereby statistically independent of anything, and "the dependent variable" is not a claim about a joint distribution.
- **Confusing likelihood with probability of the parameters.** $`p(D \mid \theta)`$ as a function of $`\theta`$ is not a distribution over $`\theta`$; the posterior needs the prior.
- **Assuming i.i.d. when it fails**: near-duplicate eval items, several items from one document, or test data leaked into training all shrink the real sample size, so the error bar is wider than $`\sqrt{p(1-p)/n}`$ suggests.
## How this connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b"/>: the full derivations of the prediction-minus-target gradients for MSE, BCE with sigmoid and CE with softmax, and why they are computed on logits.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5"/>: the same cross-entropy read as a code length. Minimising it is minimising the KL divergence from the data to the model, so the loss floors at the data's own entropy rather than at zero.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701"/>: the covariance matrices, quadratic forms and Cholesky and eigen decompositions that multivariate Gaussians are built from.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538">Topic: math</mention-page>: where this page sits among the four mathematical areas, and the objects they share.
## Best resources
- [Mathematics for Machine Learning, ch. 6](https://mml-book.github.io/) (book, \~1h 10m for ch. 6): Deisenroth et al., free PDF; probability, distributions, conjugacy at exactly this level.
- [CS229 probability review notes](https://cs229.stanford.edu/section/cs229-prob.pdf) (\~1h): compact refresher; the [CS229 main notes](https://cs229.stanford.edu/main_notes.pdf) (course notes, \~5h) then derive losses as GLM maximum likelihood.
- All of Statistics (Wasserman) (book, \~4h for the estimation and testing chapters): the fastest serious route through estimation and testing; the reference for MLE properties and hypothesis testing.
- [Visual Information Theory (Olah)](https://colah.github.io/posts/2015-09-Visual-Information/) (\~40 min): for the entropy/CE side of the same coin (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5"/>).
</content>
</page>