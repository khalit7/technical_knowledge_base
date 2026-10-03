# Gao, Schulman, Hilton (2022): Scaling Laws for Reward Model Overoptimization

Research notes for the reward hacking page. Paper: arXiv 2210.10760, OpenAI. Only one arXiv version exists (v1, submitted 19 Oct 2022).

Sources used:
- PDF: https://arxiv.org/pdf/2210.10760v1 (text extracted with `pdftotext -layout`; figures read from the embedded raster images)
- ar5iv HTML mirror: https://ar5iv.labs.arxiv.org/html/2210.10760 (anchors below, e.g. `#S3.SS2`, `#S3.F3`)
- arXiv native HTML (https://arxiv.org/html/2210.10760) answers 200 but was not needed; ar5iv anchors are used.
- No GitHub repository or released data is linked anywhere in the paper or on ar5iv. Not found: any public table of the fitted coefficients.

Legend: **[verbatim]** quoted from the paper; **[read from figure]** my reading of a plotted image (approximate); **[derived]** my own arithmetic; **[unconfirmed]** could not be confirmed in the paper text.

---

## 1. Functional forms and KL

Source: Section 1, https://ar5iv.labs.arxiv.org/html/2210.10760#S1 (PDF p.2)

**[verbatim]** "Our main results are empirically validated functional forms for the gold reward model scores R as a function of the Kullback-Leibler divergence from the initial policy to the optimized policy KL := D_KL(π ‖ π_init), which depends on the method of optimization used. This KL distance between the initial and optimized policies increases monotonically during during RL training (fig. 14), and can be computed analytically as a function of n for BoN. Further, because it is a quadratic metric of distance [Bai et al., 2022, Section 4.3], we will define d := sqrt(D_KL(π ‖ π_init)), and write our functional forms in terms of d."

**[verbatim]** "We find empirically that for best-of-n (BoN) sampling,
R_bon(d) = d (α_bon − β_bon d),
and for reinforcement learning,
R_RL(d) = d (α_RL − β_RL log d),
Here, R(0) := 0 by definition and α_RL, β_RL, α_bon and β_bon are parameters that may depend on the number of proxy reward model parameters, the size of the proxy reward model dataset, and so on. We see that these scaling laws make accurate predictions."

Footnote 1 **[verbatim]**: "We note that this form likely does not hold near the origin, as it has infinite slope there. We experimented with a number of different forms, but found worse fits and extrapolation. See appendix B for more details."

Appendix B (RL form details), https://ar5iv.labs.arxiv.org/html/2210.10760#A2 **[verbatim]**: "Ideally all overoptimization forms would have finite slope at the origin. We tried the following forms: d (α_RL − β_RL log (1 + d)): Has slope α at the origin; however, has substantially worse extrapolation behavior. [...] Power laws d (α_RL − β_RL d^γRL): Has slope α at the origin; however, this adds another degree of freedom, and the best fits resulted in small values of γRL. Note that the power law forms with small γRL approximate the RL form that we decided on, as lim n→∞ n(x^(1/n) − 1) = log x."

BoN KL, Section 2, https://ar5iv.labs.arxiv.org/html/2210.10760#S2 (PDF p.4) **[verbatim]**: "The KL distances for BoN are computed analytically: KL_bon = log n − (n−1)/n [Stiennon et al., 2020, Appendix G.3]."

Also **[verbatim]**: "In BoN, we generate n trajectories for the policy and use the reward model to pick the one with the highest proxy RM score. We use the unbiased estimator from Nakano et al. [2021, Appendix I] to compute all of the gold and proxy scores for intermediate n between 1 and the maximum n [...]"

Units: the paper states KL in **nats** (Section 3.1: "n = 60,000 (KL ≈ 10 nats)", "n = 1,000 (KL ≈ 6 nats)"; Figure 26 caption: "a KL of 6 nats"). log is therefore the natural log. **[derived]** check: log(1000) − 999/1000 = 5.91 nats; log(60000) − 1 = 10.0 nats. Matches.

Closed-form optimum **[derived]** (the paper only names it in Fig. 12):
- BoN: peak at d* = α_bon / (2 β_bon), peak gold R* = α_bon² / (4 β_bon). Figure 12 caption **[verbatim]**: "Max BoN gold scores (α_bon/2β_bon) predicted with the BoN closed form" (https://ar5iv.labs.arxiv.org/html/2210.10760#A3.F12). Note: α/2β is the argmax d, not the max score; the caption is loose.
- RL: dR/dd = α − β log d − β = 0 gives d* = exp(α/β − 1), R* = β d*; gold returns to 0 at d = exp(α/β).

---

## 2. Fitted coefficients by RM size

**Status: no table of numbers exists anywhere in the paper (main text or appendices A to C). The coefficients are only plotted, in Figure 3, as raster images (450x300 px each). α_RL is never stated as a number.** No released data or GitHub repo was found.

Source: Section 3.2, https://ar5iv.labs.arxiv.org/html/2210.10760#S3.SS2 (PDF p.5) **[verbatim]**: "We hold policy size (1.2B) and data size (90,000) constant (fig. 1). We observe that for the gold RM scores, α_bon and β_bon change smoothly with RM size (figs. 3a and 3b). For RL, we find that we can hold α_RL constant across all RM sizes, resulting in a clean scaling curve for β_RL (fig. 3c). These scaling laws allow us to predict properties of training runs; for instance, we can also predict the peak gold RM scores for different RM sizes (fig. 12)."

Section 1 bullet **[verbatim]**: "Smooth coefficient scaling. The α and β coefficients in the BoN and RL functional forms vary smoothly with the number of proxy reward model parameters, following approximate logarithmic trends. This allows prediction of attained gold RM score." Footnote 2 **[verbatim]**: "The coefficient α_RL in particular being nearly independent of RM parameter count."

Figure 3 caption, https://ar5iv.labs.arxiv.org/html/2210.10760#S3.F3 **[verbatim]**: "The values of α_bon, β_bon and β_RL in the BoN and RL overoptimization scaling laws for both proxy (dashed line) and gold (solid line) rewards as they scale with parameter count." (Only one fitted line with a confidence band plus dots is visible in each panel; no dashed proxy line is visible in the published image. The plotted dots appear to be the gold coefficients.) The slope and intercept of the fitted lines (linear in log10 RM params) are **not printed**.

RM sizes (Figure 1 legend): 3M, 12M, 25M, 42M, 85M, 300M, 680M, 1.2B, 3B (nine proxy RMs). Section 2.1: "our proxy RMs vary from 3M to 3B parameters"; footnote 3: "We originally trained two additional RMs smaller than 3M parameters, which achieved near-chance accuracy and were off-trend, and so were excluded."

**[read from figure]** Values read from the extracted Figure 3 images (gold; policy 1.2B, 90,000 RM comparisons). Precision about ±0.003 for α, ±0.001 for β_bon, ±0.002 for β_RL:

| Proxy RM | α_bon | β_bon | β_RL |
|---|---|---|---|
| 3M | 0.490 | 0.120 | 0.175 |
| 12M | 0.513 | 0.120 | 0.167 |
| 25M | 0.558 | 0.115 | 0.152 |
| 42M | 0.548 | 0.111 | 0.146 |
| 85M | 0.599 | 0.106 | 0.137 |
| 300M | 0.633 | 0.0995 | 0.124 |
| 680M | 0.649 | 0.098 | 0.119 |
| 1.2B | 0.653 | 0.0965 | 0.122 |
| 3B | 0.662 | 0.090 | 0.118 |

Fitted trend lines **[read from figure]** (endpoints at 3M and 3B): α_bon line from about 0.49 to 0.68; β_bon line from about 0.123 to 0.0915; β_RL line from about 0.173 to 0.111. **[derived]** Approximate equations with N = RM parameters: α_bon ≈ 0.49 + 0.065 · log10(N / 3e6); β_bon ≈ 0.123 − 0.0108 · log10(N / 3e6); β_RL ≈ 0.173 − 0.021 · log10(N / 3e6). These are my fits to the drawn lines, not published numbers.

**Consistency checks [derived]:**
- BoN is self-consistent with Figure 1a: 3M gives d* = 0.49/0.24 = 2.04 (KL ≈ 4.2 nats), R* = 0.49²/0.48 = 0.50, matching the 3M gold peak of about 0.50 near KL 4 to 5 in Fig. 1a. 3B gives R(KL=10) = 3.16·(0.662 − 0.090·3.16) ≈ 1.19 vs about 1.24 plotted.
- α_RL is not printed. Digitising the thin "Gold (Fit)" lines in Figure 1b (x axis is square root scale): 3M fit peaks at about 0.55 near KL ≈ 13 (d ≈ 3.6) and returns to 0 at KL ≈ 95 (d ≈ 9.7); 12M fit peaks at about 0.60 near KL ≈ 19. Solving the RL form gives **α_RL ≈ 0.34 to 0.35 (estimate, unconfirmed)**, with β_RL(3M) ≈ 0.154 and β_RL(12M) ≈ 0.136. These β values are about 12% lower than the Figure 3c dots (0.175, 0.167), so the Fig. 3c values and the Fig. 1b curves do not reproduce each other exactly with a single α_RL (possibly a normalisation difference, see Section 2.2 recalibration; not explained in the paper). For a redrawn chart, using α_RL ≈ 0.35 and β_RL ≈ 0.88 × (Fig. 3c value) reproduces Figure 1b closely: e.g. 3B gives β ≈ 0.104, R(KL=88) ≈ 1.10 vs about 1.07 plotted, peak near KL ≈ 110.

Proxy coefficients **[verbatim]**: "When modelled using the same functional forms as the respective gold scores, the proxy score fits have much lower values of β_bon. We also see smooth scaling in the proxy score's α_bon and β_bon. However, for the reasons in section 3.1, we are less confident about these fits." No proxy numbers are given.

Data-size scaling of coefficients (Section 3.3, https://ar5iv.labs.arxiv.org/html/2210.10760#S3.SS3) **[verbatim]**: "The scaling of α and β with data size are not as cleanly described as for RM size scaling (fig. 17, fig. 18)." Fig. 17: "α_bon with dataset size, averaged across RM sizes"; Fig. 18: "β_bon with dataset size, averaged across RM sizes". Plots only.

---

## 3. Setup and main findings

### Setup (Section 2, https://ar5iv.labs.arxiv.org/html/2210.10760#S2 and #S2.SS1, #S2.SS2)
- **[verbatim]** "The setting used throughout this paper is the same as for InstructGPT [Ouyang et al., 2022]."
- **[verbatim]** "For all experiments, we use pretrained GPT-3 series language models as the initial checkpoint [Brown et al., 2020]. All initial policies are trained with supervised fine-tuning (SFT) on human-generated InstructGPT demonstrations [Ouyang et al., 2022] for 2 epochs. All RMs also use the GPT-3 architecture but have an added scalar head to output the reward."
- **[verbatim]** "The RL experiments use Proximal Policy Optimization (PPO) [Schulman et al., 2017]. KL penalty for all RL experiments is set to 0 except for in section 3.6."
- Gold RM **[verbatim]**: "The 6B reward model from Ouyang et al. [2022] is used as the gold RM, and our proxy RMs vary from 3M to 3B parameters."
- Labels **[verbatim]**: "The synthetic comparisons are created deterministically by always marking the trajectory with the higher gold RM score as preferred. We generate 100,000 synthetic comparisons and reserve 10% of these as a held out test set for computing the validation loss of RMs."
- Recalibration (Section 2.2) **[verbatim]**: "we recenter each RM such that the average reward of the initial policy is 0. We also unit normalize the variance of the gold RM scores. [...] we recalibrate the proxy RMs by rescaling the logits to minimize cross-entropy loss using a validation set of soft labels. All renormalization and recalibration is applied after the experiments". So y axis "RM Score" is in units of gold-RM standard deviations, 0 = initial policy.
- Policy size: 1.2B for the main RM-size sweep (Fig. 1 caption, Section 3.2). Data size: 90,000 comparisons for that sweep.
- Hyperparameters (Appendix C, Table 1): RM Adam LR multiplier 1.67e-2, RM batch 64; RL Adam LR multiplier 4e-3, RL batch 256, PPO clip 0.2, timesteps per rollout 256, minibatches per epoch 128, GAE 0.95.

### Validation of the form (Section 3.1, #S3.SS1) **[verbatim]**
"The BoN functional form was hypothesized using data up to n = 1000. In order to validate the functional forms, we performed a BoN experiment with up to n = 60,000 (KL ≈ 10 nats), after only having seen data up to n = 1,000 (KL ≈ 6 nats). As this experiment was conducted after the functional form was hypothesized based on data up to 6 nats, this was a true advance prediction."

### Proxy reward behaviour **[verbatim]**
- Section 3.1: "We also attempted to model the proxy scores but were unable to obtain a satisfactory fit. For BoN, despite visual similarity, a linear fit (d α_bon) did not work well (fig. 20). [...] We leave a better understanding of the proxy RM score behavior to future work."
- Section 3.2: "For both BoN and RL, we observe systematic underestimates of the proxy reward model when extrapolated to higher KLs. Both appear to eventually grow roughly linearly in sqrt(KL), as in Bai et al. [2022]."
- Figure 20 caption: "The BoN proxy scores are slightly concave, so that a linear fit does not fit well."
- Key visual: in Figures 1, 4, 7, 9 the proxy (dashed) keeps rising while the gold (solid) rises, peaks and falls.

### RM data size (Section 3.3, #S3.SS3) **[verbatim]**
- "We hold RM size constant (12M) and sweep RM data size for both RL and BoN. Overall, the results are consistent with intuition: more data leads to better gold scores and less goodharting."
- "For all RM sizes, we observe that for amounts of data less than around 2,000 comparisons, there is very little improvement over near-chance loss (Figure 6)."
- "We hypothesized that two RMs of equal validation loss would achieve the same robustness against optimization, regardless of the combination of RM size and RM data size. Our results provide some weak evidence for this hypothesis (fig. 5)."
- Footnote 7: "running 4 epochs instead of 1 yields no change in gold score whatsoever, whereas 1 epoch of 4 times as much data performs substantially better (fig. 13)." Fig. 13 validation losses: 1x2000 = 0.686109, 1x8000 = 0.654857, 4x2000 = 0.683869.
- Exact list of data sizes swept is only in figure legends (Fig. 4, 6, 10); **[unconfirmed]** as text.

### Policy size (Section 3.4, #S3.SS4) **[verbatim]**
- "We briefly explore the impact of policy size by holding the RM size constant (12M) and evaluating two different policy sizes." (1.2B and 6B; also repeated with a 3B RM, fig. 22.)
- "Larger policies see less benefit from optimization against an RM, but don't overoptimize more. We observe that the 6B policy run has a smaller difference between its initial and peak gold reward model scores than the 1.2B policy run. [...] contrary to intuition, we find that both gold scores peak at almost the same KL. In fact, the gap between the proxy and gold scores is almost the same between the two policy sizes (fig. 24)."

### RL vs BoN (Section 3.5, #S3.SS5) **[verbatim]**
- "RL is far less KL-efficient than BoN. Viewing KL distance as a resource to be spent, we observe that RL "consumes" far more KL than BoN. This means that both optimization and overoptimization require more KL to occur with RL. Intuitively, BoN searches very locally around the initial policy, and thus KL_bon increases with roughly log(n). For RL on the other hand, each step modifies the policy from the policy of the previous step, KL increases approximately quadratically with step in the absence of KL penalty (Figure 16, Figure 14). An implication of this result is that KL distance is an inadequate metric for quantity of (over)optimization". (The paper uses a dash after "previous step"; replaced here by a comma.)
- "When looking at proxy vs gold RM scores, BoN and RL look more similar. [...] However, we do observe that RL initially has a larger proxy-gold gap (i.e requires more proxy RM increase to match BoN), but then peaks at a higher gold RM score than BoN (fig. 8)."
- Section 1 bullet: "As a function of the KL divergence, reinforcement learning tends to be slower than best-of-n sampling at both optimization and overoptimization. This suggests inadequacies with using KL to compare amount of (over)optimization across methods. However, the relationship between the proxy reward model score and the gold reward model score is similar for both methods."

### KL penalty (Section 3.6, #S3.SS6) **[verbatim]**
- "We observe in our setting that when varying the KL penalty for RL, the gold RM scores depend only on the KL distance of the policy KL_RL (Figure 9). The KL penalty only causes the gold RM score to converge earlier, but does not affect the KL_RL-gold reward frontier, and so the effect of the penalty on the gold score is akin to early stopping (Figure 14). However, we have seen some evidence that this result could be particularly sensitive to hyperparameters."
- "Because we observe that using KL penalty has a strictly larger proxy-gold gap, we set KL penalty to 0 for all other RL experiments in this paper."
- Section 1 bullet: "In our reinforcement learning setup, using a KL penalty increases the proxy reward model score that can be achieved for a given KL divergence, but this does not correspond to a measurable improvement in the gold RM score-KL_RL frontier."
- Figure 9 caption: "RL experiments with various KL penalties. Policy size (1.2B) and RM size (1.2B) are held constant. [...] We observe the effect of the KL penalty on the gold score as being equivalent to early stopping."
- The specific KL penalty values are in figure legends only, **[unconfirmed]** as text.

### Goodhart taxonomy interpretation (Section 4.2, #S4.SS2) **[verbatim]**
- α term: "the difference in the slope of the proxy score and the linear component of the gold score (i.e the α term) can be interpreted as the amount of regressional Goodhart occurring."
- β term: "We expect extremal Goodharting to be primarily responsible for the nonmonotonicity of the gold RM scores in this paper, and is mostly responsible for the β term, which in the limit of optimization, results in an unbounded loss of utility. This lends a natural interpretation to the smooth decrease in β for both BoN and RL with increased RM size as smooth improvements in model robustness (fig. 3)."
- Footnote 10: "Optimized policies producing very long answers even when a short answer would be preferred is a real issue that we have observed in other experiments in the InstructGPT setting."
- Adversarial: "We do not expect the effects of adversarial Goodhart to be captured in this work, as the models involved are not powerful enough to implement adversarial strategies. [...] When this occurs, the scaling laws observed in this paper may break down."

### Iterated RLHF (Section 4.3, #S4.SS3) **[verbatim]**
"the final gold reward model score after k iterations each covering a distance d/k is given by R_RL(d) = d (α_RL − β_RL log (d) + β_RL log (k))." and the gain is "β_RL d log (k)". "the iterative approach does not affect any Goodharting captured by the α_RL term".

### Abstract (https://arxiv.org/abs/2210.10760) **[verbatim]**
"In reinforcement learning from human feedback, it is common to optimize against a reward model trained to predict human preferences. Because the reward model is an imperfect proxy, optimizing its value too much can hinder ground truth performance, in accordance with Goodhart's law. This effect has been frequently observed, but not carefully measured due to the expense of collecting human preference data. In this work, we use a synthetic setup in which a fixed "gold-standard" reward model plays the role of humans, providing labels used to train a proxy reward model. We study how the gold reward model score changes as we optimize against the proxy reward model using either reinforcement learning or best-of-n sampling. We find that this relationship follows a different functional form depending on the method of optimization, and that in both cases its coefficients scale smoothly with the number of reward model parameters. [...]"

### A worked BoN example (Appendix, Table 2; policy 1.2B, proxy RM 12M; prompt "What is full of holes but still holds water?") **[verbatim values]**

| n | Answer (short) | Proxy | Gold |
|---|---|---|---|
| 1 | Mussels / clam ramble | -0.1922 | -0.5225 |
| 3 | "Most likely a pipe is having trouble staying full." | 0.0322 | -0.0165 |
| 10 | "A sponge" | 0.2336 | 0.4828 |
| 30 | "When something is full of holes, it is used for stirring or moving liquid." | 0.6534 | -0.1543 |
| 100, 300, 1000 | "A tornado is usually a swirling cloud of swirling air ..." | 0.8968 | -0.3367 |
| 3000, 10000 | "A bore hole is a hole drilled into a rock ..." | 0.9003 | 0.2733 |
| 30000 | "A pothole is a structural vulnerability that allows water to penetrate ..." | 0.9527 | 0.5490 |

Caption: "For each individual question, the gold scores do not follow as clean a trend as they do when averaged over many questions as in fig. 1." Good material for a "proxy climbs, gold does not" animation.

---

## 4. Figure 1 axes and ranges (for a matching redraw)

Source: Figure 1, https://ar5iv.labs.arxiv.org/html/2210.10760#S1.F1 (PDF p.3). Caption **[verbatim]**: "Reward model (RM) parameter size scaling experiments using the InstructGPT environment. Policy size is held constant (1.2B), while reward model size is varied. The x-axes have a square-root scale. Note that the plots have different x-axes. The gold reward represents the ground truth reward; we observe that when we optimize for a learned proxy of the gold reward, the gold reward initially increases and later decreases. We show that our functional forms fit this effect well."

**[read from figure]**
- (a) BoN: x label "KL distance between best-of-n policy and initial policy"; square-root scale; ticks 0, 2, 4, 6, 8, 10; data to KL = 10 nats (n = 60,000). y label "RM Score", ticks 0.0 to 1.4 step 0.2, axis top about 1.5. Gold peaks: 3M about 0.50 near KL 4 to 5; 12M about 0.55; 25M/42M about 0.69 near KL 6 to 7; 85M about 0.87 near KL 8; larger RMs still rising at KL 10 (3B about 1.24). Proxy dashed lines rise to about 1.4+ by KL 10.
- (b) RL: x label "KL distance between RL tuned policy and initial policy"; square-root scale; ticks 0, 20, 40, 60, 80, 100; data to about KL 95 to 100 (3B run ends near 88). y ticks 0.0 to 1.4, axis top about 1.5. Gold: 3M peaks about 0.58 near KL 15 to 18 and falls to 0 at about KL 95; 12M peaks about 0.62 near KL 18, falls to about 0.25 at 95; 25M/42M peak about 0.70 to 0.76 near KL 20 to 30; 85M about 0.83 near KL 35; 300M about 0.97 near KL 40; 680M/1.2B/3B about 1.0 to 1.08, flat or slowly declining out to KL 80 to 100. Proxy dashed lines exceed 1.5 (clipped off the top).
- Legend: "RM Size" 3M, 12M, 25M, 42M, 85M, 300M, 680M, 1.2B, 3B (viridis colors, dark purple to yellow); "RM Type": Proxy (dashed), Gold (solid), Gold (Fit) (thin solid).
- Other figures: Fig. 4 (RM data scaling, RM 12M), Fig. 7 (policy 1.2B vs 6B, RM 12M; asterisks mark max gold), Fig. 8 (proxy vs gold RM score, BoN and RL; "RL curves are truncated to a proxy RM score of 1.6 for readability"), Fig. 9 (KL penalty sweep), Fig. 26 (extrapolation: "The regressions (shown in faint lines) are only fit to data to the left of the vertical black dotted lines").
