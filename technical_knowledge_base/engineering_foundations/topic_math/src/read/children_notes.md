# The four old child pages: facts checked (2026-10-05)

Saved verbatim (read-only fetch, extracted by `save_fetch.py` from the agent transcript) in `children/`. Every worked number was recomputed by `recompute_children.py` (output in `recompute_children.out`: 142 checks, 2 differences, both below). Claims that rest on a paper were checked against the paper (`sources_check.md`). Marks: **verified**, **corrected**, **unconfirmed**.

## Linear algebra for ML (3c65c17b0d0d81d89c26e1dab2fcb701), 18 min
- Rank-nullity, rank of [[1,2],[2,4]] = 1, null vector (2,-1), det 0: **verified**.
- Norms of (3,-4) = 5, 7, 4; a.b = 8, cos 0.889; (3,-4).(4,3) = 0: **verified**.
- A = [[3,0],[4,5]]: eigenvalues 3, 5, eigenvectors (1,-2), (0,1); A^T A = [[25,20],[20,25]]; sigma 6.708, 2.236; u1 = (1,3)/sqrt10; |det| 15; Frobenius 7.071; nuclear 8.944; kappa 3: **verified**.
- Cholesky of [[4,2],[2,3]] = [[2,0],[1,sqrt2]]: **verified**. LU 2n^3/3 vs Cholesky n^3/3 flops: **verified** (standard, Golub and Van Loan).
- Eckart-Young example A_1 = [[1.5,1.5],[4.5,4.5]], error norm sqrt5 = sigma_2 (spectral and Frobenius equal because the error is rank 1): **verified**.
- LoRA counts 16,777,216 / 65,536 / 0.39%: **verified**. "Ranks as low as 1 to 8 were competitive on GPT-3": **corrected** wording: the paper says "a rank as small as one suffices" for Wq and Wv (Table 6 tests r = 1, 2, 4, 8, 64). B initialised to zero, merge at inference: **verified**.
- GaLore "up to 65.5%" optimiser-state memory: **verified** (abstract).
- MLA as a low-rank factorisation: **verified** (DeepSeek-V2 report; already on the DeepSeek page).
- Muon: Newton-Schulz orthogonalisation, bfloat16-stable: **verified** (Keller Jordan post, 8 Dec 2024).
- Least squares (0,1),(1,2),(2,2): X^T X, X^T y, w = (7/6, 1/2), residuals, kappa(X) 2.92, kappa(X^T X) 8.55: **verified**.
- Gradient identities list (a^T x, x^T A x, tr(AX), ||X||_F^2, log det X, least squares): **verified** (rederived by hand; denominator layout as stated).
- Einsum cost 2*8*128*128*64 = 16,777,216: **verified**.
- Gradient-descent contraction (kappa-1)/(kappa+1) per step: **verified** for the optimal fixed step on a quadratic; the page states it without the "optimal step" condition in one place: **corrected** wording (true only at eta = 2/(lambda_max + lambda_min)).

## Probability and statistics for ML (3c65c17b0d0d815f9a47d613409b5a0c), 22 min
- Umbrella example: P(Y=1) 0.38, joint 0.24, product 0.114, P(rain|umbrella) 0.63: **verified**.
- Spam: 0.223 vs 1.609, "seven times": **verified** (ratio 7.2).
- Softmax (2,1,0) -> (0.665, 0.245, 0.090), loss 0.408, gradient (-0.335, 0.245, 0.090): **verified**.
- Gaussian NLL 0.125 + 0.919 = 1.044: **verified**. Laplace NLL and median remark: **verified**.
- Poisson P(3|2) 0.180, NLL 1.712, model part -0.079: **verified**.
- Table of gradients (p - y; (yhat - y)/sigma^2; sign/b; lambda - y): **verified**.
- Beta(2,2) coin: MLE 1, MAP 0.8, posterior mean 0.714, sd 0.16: **verified**.
- Gaussian prior -> L2 with lambda = 1/(2 tau^2); Laplace prior -> L1: **verified**.
- Shrinkage example MSE 0.5 vs 1: **verified**.
- Bias-variance decomposition and derivation sketch: **verified**. Double descent description: **verified** (Belkin et al. 2019; Nakkiran et al. 2019), not re-fetched.
- p-value 9/10 heads 0.011 one-sided, 0.021 two-sided; 1 - 0.95^20 = 0.64; Bonferroni 0.0025: **verified**.
- +-2 SE at n = 500: 0.045: **verified**.
- McNemar 25/55 = 0.45, p 0.50; paired SE 0.0148 (+-3 points); 225/45 = 5.0, p 0.025; continuity-corrected 4.36, p 0.037: **verified**. Unpaired "+-6.3 points": **corrected** to +-6.2 with 1.96 standard errors (6.3 only with 2 SE, inconsistent with the paired figure using 1.96).
- SE 0.022 at n 500, 0.011 at 2,000: **verified**. Hoeffding 0.16 and n >= 738: **verified**.
- Random-vector cosine sd about 1/sqrt(d) = 0.03 at d 1024: **verified**.

## Calculus and optimisation for ML (3c65c17b0d0d81eb8b49ed6a0f897f3b), 25 min
- Normal-equation example (1,1),(2,3),(3,4): w = (-1/3, 3/2), residuals: **verified**.
- BCE at z = -6 (p 0.0025, loss 6.0025, grad -0.9975) and z = 2 (0.8808, 0.1269, -0.1192): **verified**.
- Softmax CE at z = (2,1,0.1): e^z sum stated 11.212: **corrected** to 11.213 (11.2125 rounds up); p, loss 0.417 and gradient (-0.341, 0.242, 0.099) unaffected and **verified**.
- Softmax Jacobian diag(p) - pp^T; soft-label gradient p - q: **verified**.
- Log-sum-exp (1000, 1001) -> 1001.313: **verified**.
- MSE on sigmoid at z = -6: -0.0049, about 200 times smaller: **verified**.
- Logistic-unit backprop example (z 0.1, p 0.525, loss 0.644, grads, new w, new p 0.595): **verified**.
- 6N FLOPs per token, backward twice forward: **verified** (Kaplan et al. 2020 sec. 2.1; non-embedding compute). Chen et al. O(sqrt n) memory for one extra forward: **verified**.
- Hessian-vector product cost and identity: **verified**.
- Newton step, needs H positive definite: **verified**. Adam's v_t "running mean": **corrected** to exponential moving average (Kingma and Ba 2014); its relation to the diagonal Fisher is the paper's own remark: **verified**.
- XGBoost leaf weight -G/(H + lambda), gain formula, worked example (w* 0.5, gain 0.493, wL 0.857, wR -0.4): **verified** (formulas as in the XGBoost "Introduction to boosted trees" tutorial, not re-fetched).
- Conditioning example diag(1,10): limit 0.2, best step 0.182, contraction 0.818, 34.4 -> 35 steps, momentum 0.519 about 11 steps (10.5 exactly): **verified**.
- Edge of stability: **verified** (Cohen et al. 2021). Saddles dominate: **verified** (Dauphin et al. 2014).
- Convexity example, CE convex in logits, strong convexity rate 1 - 1/kappa: **verified**.
- Lagrange example (x = y = 0.707, lambda 0.707, f* 1.414, shadow price): **verified**. KKT statement, softmax as max-entropy, SVM support vectors, TRPO's Fisher curvature: **verified** (standard; TRPO from Schulman et al. 2015, not re-fetched).

## Information theory for ML (3c65c17b0d0d81c6baf3f778a62e14e5), 15 min
- 1 nat = 1.443 bits; weather entropy 1.5 bits and prefix code; coin 0.9: 0.469 bits: **verified**.
- Huffman H <= L < H + 1; arithmetic coding approaches H: **verified** (Cover and Thomas ch. 5, 13).
- Max-entropy facts (Gaussian, Boltzmann): **verified**.
- H(p,q) 1.75; KL 0.25 both directions; fair vs 0.9 coin KL 0.737 and 0.531 bits: **verified**.
- -ln 0.7 = 0.357 nats (0.515 bits), 0.010, 4.61: **verified**.
- Conditional-entropy floor; forward vs reverse KL; ELBO identity; RLHF objective: **verified** (standard).
- MI example: H(X,Y) 1.722, I 0.278, H(X|Y) 0.722; X, X^2: I = 0.918 bits: **verified**.
- Perplexity and BPB example (7.39, 4.95, 0.721): **verified**. Pile 0.29335 tokens per byte, 0.846 BPB: **verified** (Gao et al. 2020).
- enwik8 = first 10^8 bytes of the 3 March 2006 Wikipedia dump: **verified** (LTCB page).
- Deletang et al. vs PNG 58.5% / FLAC 30.3%: **corrected** (2026-10-05). The old page's 43.4% / 16.4% are the abstract's figures; Table 1 gives 48.0% (ImageNet) and 21.0% (LibriSpeech) for Chinchilla 70B in both arXiv versions (raw rates that ignore model size; say so if carried, and cite Table 1).
- InfoNCE example N = 4: p 0.711, loss 0.341, bound 1.046 nats (1.51 bits), ceiling ln 4: **verified**. CPC bound: **verified**.
- CLIP batch 32,768 (ceiling 10.4 nats, 15 bits); temperature init 0.07, logit scale capped at 100: **verified** (Radford et al. 2021).
- 2.0 nats = 2.885 bits: **verified**.

## Old root page's own worked examples
- Four hats with A correct: 0.408 nats, 0.588 bits, (-0.335, 0.245, 0.090), InfoNCE bound 0.691: **verified** (carried on the Reading tab).
- Bernoulli curvature p(1-p) = Hessian = variance = Fisher; 0.25 at z 0, 0.09 at z = ln 9 = 2.197; score y - p: **verified** symbolically (sympy). "Hessian equals Fisher, so natural gradient and K-FAC can use the Fisher": **corrected** in scope: exact with respect to the logits; with respect to network weights the Fisher equals the generalised Gauss-Newton part of the Hessian only (Martens 2020, arXiv 1412.1193).
- Flagged-question answers: all **verified**; entropy 0.47 bits for a 90% coin (0.469).
