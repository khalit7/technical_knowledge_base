# Handoff to #4 statistics, from #3 probability (2026-10-05)

The old Notion page "Probability and statistics for ML" (3c65c17b0d0d815f9a47d613409b5a0c), saved verbatim at `../../src/read/children/probability_and_statistics_for_ml.md` (and copied to `probability/src/live.md`), mixed two subjects. The probability page carries the probability facts. The statistics facts below belong to the statistics page (#4). They are copied **verbatim** from the saved fetch (line numbers of the saved file given), followed by the corrections and checks.

Checks: every number was recomputed by the root's `src/read/recompute_children.py` (output `recompute_children.out`) and again by `probability/src/recompute.py` (section `handoff`). Marks as in `src/read/children_notes.md`: **verified**, **corrected**, **unconfirmed**.

## Corrections and notes (read these first)
1. **Unpaired error bar "about +-6.3 points" (line 183): corrected to +-6.2** when using 1.96 standard errors, as the paired figure (+-3 points = 1.96 x 0.0148 = 0.029) does. Unpaired SE of the difference with accuracies near 0.5 on n = 500: sqrt(2 x 0.25/500) = 0.0316; x 1.96 = 0.062; x 2 = 0.063. Use one multiplier throughout.
2. **"95% interval of +-2 standard errors (1.96 exactly)" (line 176)**: verified; the +-0.045 uses 2 SE (1.96 gives 0.0438). Say which.
3. **McNemar p-values**: chi2 = 0.4545 gives p = 0.500 (verified); chi2 = 5.0 gives p = 0.0253 (verified); continuity-corrected (|30-15|-1)^2/45 = 196/45 = 4.356, p = 0.0369 (verified). Exact binomial McNemar (b = 30, c = 15): two-sided p = 0.036 (computed by probability/src/recompute.py; not on the old page, offered as a check).
4. **Paired SE formula** sqrt((b + c) - (b - c)^2/n)/n = sqrt(55 - 25/500)/500 = sqrt(54.95)/500 = 0.01483: verified.
5. **Hoeffding**: 2e^{-2.5} = 0.1642; n >= ln(40)/(2 x 0.0025) = 737.8 so 738: verified. The bound is for the mean of i.i.d. variables bounded in [0, 1]; "for variables in [a, b] the exponent is divided by (b - a)^2": verified (Hoeffding 1963, Theorem 2).
6. **Double descent**: description verified against Belkin et al. 2019 (PNAS, arXiv 1812.11118) and Nakkiran et al. 2019 (arXiv 1912.02292); "the decomposition still holds; the variance term just behaves non-monotonically" is a simplification: Nakkiran et al. show epoch-wise and sample-wise double descent too, and the cause is debated (unconfirmed as a single mechanism). Statistics page: say so.
7. **Shrinkage example**: MSE(xbar) = 1, MSE(0.5 xbar) = 0.25 + 0.25 = 0.5: verified. The best shrink factor here is c = mu^2/(mu^2 + sigma^2/n) = 1/2 exactly, so 0.5 is also the optimal c (derived, not on the old page).
8. **Random-vector concentration**: sd of cosine of two independent Gaussian vectors in d dims is 1/sqrt(d) approximately (exactly sqrt(1/d) for the sign-symmetric case to first order): 1/32 = 0.031 at d = 1024: verified.
9. **"Ensembling divides the variance by M"**: verified for independent errors of equal variance; with pairwise correlation rho the variance of the average is rho sigma^2 + (1 - rho) sigma^2/M (standard; e.g. Hastie, Tibshirani and Friedman, ESL 2nd ed., eq. 15.1). Not on the old page; offered.
10. p-value examples: P(>= 9 heads of 10) = 11/1024 = 0.01074; two-sided 22/1024 = 0.0215; 1 - 0.95^20 = 0.6415; Bonferroni 0.0025: verified.
11. CLT SEs 0.02236 at n = 500 and 0.01118 at n = 2,000: verified.
12. The probability page keeps the shared definitions (random variable, distribution, joint/marginal/conditional, expectation and variance, i.i.d., likelihood, NLL), the LLN as a one-line statement used for Monte Carlo, and links to the statistics page for the CLT, error bars and tests. Everything below is yours.
13. The evaluation topic's Eval statistics page (3ef5c17b0d0d8187a7b4e5b4ec4a546d) owns eval-specific error bars, paired tests and sample sizes with measurements: per the plan, link it rather than repeat.

## Verbatim: the "keeps evaluation honest" job (line 18)
**They keep evaluation honest.** An eval score is an average over a finite sample of examples, so it is a random quantity with an error bar. Knowing how big that error bar is (it shrinks like $`1/\sqrt{n}`$), and how to compare two models on the same examples (paired tests, the bootstrap), is what separates a real improvement from noise.

## Verbatim: Bias-variance, Hypothesis testing essentials, CLT and concentration (lines 159 to 202)

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

## Verbatim: the statistics items of "Common mistakes" (lines 204, 205, 206, 210)

- **Reading a p-value as the probability the null is true**, or 1 minus it as the probability the result is real. It is the probability of data this extreme if the null were true.
- **Comparing models with unpaired error bars**, or with no error bars. On the same eval set, use a paired test; an unpaired interval is too wide, and none at all lets noise masquerade as progress.
- **Testing many variants and reporting the best** without a multiple-comparison correction or a held-out confirmation.
- **Assuming i.i.d. when it fails**: near-duplicate eval items, several items from one document, or test data leaked into training all shrink the real sample size, so the error bar is wider than $`\sqrt{p(1-p)/n}`$ suggests.

## Verbatim: the statistics resource (line 219)

- All of Statistics (Wasserman) (book, \~4h for the estimation and testing chapters): the fastest serious route through estimation and testing; the reference for MLE properties and hypothesis testing.
