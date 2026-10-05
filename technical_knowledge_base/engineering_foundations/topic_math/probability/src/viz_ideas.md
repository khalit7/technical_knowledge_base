# Visualisation ideas: Probability for ML (2026-10-05)

Central question: how does a distribution become a loss, and when are the probabilities a model trains honest? Scored 0 to 2 on: parameter to move, reproduces a stated figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; plus 1 for a before/after animation; minus build cost.

| # | Idea | Placement | Score | Status | Data and checks |
|---|---|---|---|---|---|
| PR1 | **The coin, flip by flip, before/after**: MLE alone (a spike at 1 after three heads, infinite log loss at the first tails) against the Beta(2, 2) posterior with MLE, MAP, mean and 95% credible interval, running sequential log loss for both | Reading, section 12 | 13 | built | recompute.py coin_steps (Simpson quantiles); total 8.518 = -ln evidence, reproduced independently |
| PR2 | **Calibration on real models**: reliability diagram, ECE, NLL for GPT-2, Qwen2.5-0.5B, Qwen2.5-0.5B-Instruct on 20,480 WikiText-2 tokens, temperature slider over precomputed T, ECE and NLL against T | Own tab | 13 | built | inputs/calib.py; Guo et al. 2017 eq. 3, M = 15; direction agrees with GPT-4 report Fig. 8 qualitatively (pretrained calibrated, post-trained less), at much smaller scale |
| PR3 | **Distribution explorer**: nine distributions, PMF/PDF/CDF, seeded samples checked against moment formulas, each read as a loss with analytic against numerical gradient | Own tab | 12 | built | Bishop PRML app. B; defaults reproduce the Reading's 0.223, 2.408, 1.712, 1.044, 1.193 by construction |
| PR4 | Inverse CDF against Gumbel-max on the tiny model, animated 1 to 10,000 draws | Reading, section 13 | 10 | built | same seeded stream; frequencies within 0.012 of p at 10,000 |
| PR5 | Base-rate dot grid (1,000 dots of 10 messages) with base rate, TPR, FPR | Reading, section 2 | 10 | built | 0.161 by construction; Gigerenzer and Hoffrage natural frequencies |
| PR6 | Covariance as a shape: one fixed cloud of 400 epsilon draws stretched by L, with eigen-ellipses | Reading, section 6 | 9 | built | Cholesky of [[1,.8],[.8,1]] = [[1,0],[.8,.6]], eigenvalues 1.8, 0.2 |
| PR7 | Score-function against pathwise gradient histograms | none | 7 | rejected: the exact variances (30, 18, 4) with the simulation check say it in one line; a histogram adds little |
| PR8 | Proper-score curves (log, Brier, absolute) against reported r for a chosen q | none | 8 | rejected for now: three numbers at q = 0.7 make the point; the explorer's Bernoulli loss panel shows the log-loss curve; candidate if Khalid wants more |
| PR9 | Sampler lab (temperature, top-p, min-p on a real model) | link | n/a | exists on Sampling and Decoding (Sampler lab); linked, not rebuilt |
| PR10 | Gradient checks of BCE/CE/MSE | link | n/a | exists in the root's Gradient lab; linked |

What the methodology lacked: guidance for a foundations page where "reproduce a published figure" rarely applies; here the stand-ins were reproducing a library's own formula (torch source) and an exact identity (sequential log loss = minus log evidence).
