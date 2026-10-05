"""Write coverage.json: every fact of the old page (live.md, fetched 2026-09-30) and where this page carries it, or which sibling owns it."""
import json
C = []
def c(fact, where, note="verified"): C.append({"fact": fact, "where": where, "note": note})
# elements
c("Embed linear-algebra-for-ml.html (interactive built outside the repo)", "replaced by this page (Reading animations, Matrix playground, Low-rank lab)", "element")
c("18 min read, +8h 15m resources", "new: about 40 min Reading (stated in rd-one); resources timed one by one in Further reading", "updated")
# what it is
c("Linear algebra is the language: dense layer = matrix on vector, batch = one more axis, attention = two contractions, fine-tuning update = matrix added", "rd-map use box, rd-shape, rd-attn, rd-low")
c("Practical questions: rank, norms, eigen/singular values, low-rank approximation, matrix calculus", "rd-one table; matrix calculus to sibling #2", "verified; matrix calculus owned by matrix_calculus_and_backprop")
c("Mental picture: a matrix is a map that rotates, stretches, squashes, rotates; geometry first", "rd-one lead, rd-map, rd-svd animation")
# vector spaces
c("Vector space, span, basis, dimension definitions", "rd-rank (span, independence, basis, dimension, coordinates)")
c("Column space = image, dim r; null space dim n - r; r <= min(m, n); full-rank square invertible", "rd-rank, rd-sub table")
c("Rank-nullity theorem rank + dim null = n", "rd-rank (formula, plain words, four-step proof)")
c("Worked [[1,2],[2,4]]: rank 1, null (2,-1), det 0, flattens plane, not invertible", "rd-rank numbers box; playground preset")
c("ML: rank = directions used; trained weights 'often effectively low rank'; fine-tuning updates more so; collapse = low-dimensional subspace", "rd-rank use box, rd-low", "corrected: GPT-2 small's pretrained weights are not effectively low rank in the truncation sense (k90 near 300 to 513 of 768; 90% rank truncation of all matrices raises loss 3.17 to 3.91); updates are (real LoRA adapters)")
# norms
c("L2, L1, Linf definitions and uses (L2 reg, clipping; lasso; adversarial budgets)", "rd-norm")
c("Frobenius = sqrt(sum sigma^2), weight decay", "rd-norm")
c("Spectral norm = sigma_max, Lipschitz constant, spectral normalisation, muP-style init reasoning", "rd-norm (Lipschitz derivation, Miyato et al. 2018 linked)", "verified; muP mention dropped as unsourced aside (no claim depended on it)")
c("Nuclear norm sum sigma, convex surrogate for rank", "rd-norm")
c("Why L1 gives sparsity (diamond corners) vs L2 none", "rd-norm with unit-ball figure")
c("Lipschitz inequality ||Ax - Ay|| <= sigma_max ||x - y||; spectral normalisation divides by sigma_max", "rd-norm")
c("Cosine similarity formula; embeddings normalised so dot = cosine", "rd-vec, rd-vec use box")
c("Projection of x onto y: (x.y/||y||^2) y", "rd-vec (projection, worked (2,1) on (1,1))")
c("Worked norms (3,-4): 5, 7, 4; ordering Linf <= L2 <= L1", "rd-norm numbers box")
c("Worked a=(1,2,2), b=(2,1,2): dot 8, norms 3, cos 0.889; (3,-4).(4,3)=0", "rd-vec numbers box")
# decompositions
c("Eigenvector definition Av = lambda v", "rd-eig")
c("SVD definition Av_i = sigma_i u_i, circle to ellipse with semi-axes sigma_i u_i; eigen vs singular directions; coincide for symmetric PSD", "rd-svd (animation, formula, by-hand)", "verified; 'symmetric with nonnegative eigenvalues' kept as symmetric PSD")
c("A = U Sigma V^T = sum sigma_i u_i v_i^T with shapes", "rd-svd")
c("Table: eigendecomposition, SVD, QR, Cholesky: forms, existence, ML uses", "rd-tools table (extended with LU and costs)")
c("Definitions: orthogonal Q^T Q = I, SPD, N(mu, Sigma) via x = mu + Lz", "rd-orth, rd-sym")
c("Cholesky ~n^3/3 vs LU 2n^3/3 flops", "rd-tools (Trefethen and Bau lectures 20, 23)")
c("Spectral theorem: real symmetric -> real eigenvalues, orthonormal eigenvectors; covariances and Hessians", "rd-sym (with proof of orthogonality)")
c("A^T A = V Sigma^2 V^T, A A^T = U Sigma^2 U^T; singular values real and nonnegative even without eigenvalues (non-square, rotation)", "rd-svd, rd-eig (rotation complex eigenvalues)")
c("det = product of eigenvalues, |det| = product of singular values, area scale; trace = sum of eigenvalues", "rd-map, rd-eig, rd-svd checks")
c("Condition number sigma_max/sigma_min; error amplification up to kappa in Ax = b", "rd-cond (derivation and worked near-singular example)")
c("GD on quadratic shrinks by (kappa-1)/(kappa+1) per step", "rd-cond", "corrected: only at the optimal fixed step eta = 2/(lambda_max + lambda_min); derivation owned by calculus_and_optimisation")
c("PCA = eigendecomposition of covariance (1/n)X^T X of centred X = SVD; variance sigma_i^2/n", "rd-svd PCA (worked four-point example)")
c("Muon: keep singular vectors, set singular values to 1 (U V^T), Newton-Schulz, bfloat16-stable", "rd-cond (coefficients, 5 steps, 2-D hidden weights only, all from the post), worked cubic iteration, playground button")
c("Worked A = [[3,0],[4,5]]: eigen 3, 5, eigenvectors (1,-2), (0,1) not orthogonal; A^T A [[25,20],[20,25]]; sigma 6.708, 2.236; v1, v2; u1 = (1,3)/sqrt10; |det| 15; Fro 7.071; spectral 6.708; nuclear 8.944; kappa 3; stretch exceeds largest eigenvalue", "rd-eig, rd-svd, rd-norm, rd-cond, animation")
c("Worked Cholesky [[4,2],[2,3]] -> [[2,0],[1,sqrt2]]; sampling Lz", "rd-sym (plus sample z = (1,-1))")
# low rank
c("Eckart-Young-Mirsky: truncated SVD optimal; spectral error sigma_{k+1}, Frobenius sqrt(sum)", "rd-svd")
c("Storage k(m + n) vs mn", "rd-svd, Low-rank lab")
c("Worked A_1 = [[1.5,1.5],[4.5,4.5]], error sqrt5 = sigma_2", "rd-svd numbers box")
c("LoRA: Delta W = BA, rank r, 2dr params, frozen W0, B = 0 init, merge; r(d + k) non-square", "rd-low")
c("LoRA counts 16,777,216 / 65,536 / 0.39%", "rd-low")
c("LoRA paper: ranks 1 to 8 competitive on GPT-3; top singular directions agree across ranks and seeds", "rd-low", "corrected: 'a rank as small as one suffices for adapting both Wq and Wv' (Table 6: r = 1, 2, 4, 8, 64); subspace agreement left to the LoRA paper page, linked")
c("MLA as low-rank factorisation through a narrow bottleneck", "rd-low (d_c 512, 576 vs 32,768, absorption)")
c("GaLore: project gradient onto top-r singular vectors every T steps, optimiser state in small space, up to 65.5%", "rd-low (T = 200, alpha 0.25, memory formula, worked 4096 x 4096)")
# matrix calculus -> sibling
for f in ["Layout conventions: numerator (Jacobian) vs denominator (gradient) layout; chain rule J_f J_g; frameworks return gradient shaped like the parameter",
          "Worked f(x) = Wx: derivative W (numerator) or W^T (denominator); grad_W ||Wx - y||^2 = 2(Wx - y)x^T",
          "Jacobian J_ij = df_i/dx_j; backprop computes v^T J without building J",
          "Hessian symmetric (Schwarz); PD at stationary point -> local min; eigenvalues are curvatures",
          "Gradients worth knowing: a^T x, x^T A x, tr(AX), ||X||_F^2, log det X, least squares",
          "Matrix Cookbook and matrixcalculus.org for symbolic checking",
          "Einsum cost: product of all index sizes; worked 2*8*128*128*64 = 16,777,216; quadratic in sequence length"]:
    c(f, "matrix_calculus_and_backprop (handoff_matrix_calculus_and_backprop.md); this page links it from rd-mul, rd-ls, rd-ein", "handed to sibling #2, verified")
c("Hessian eigenvalue ratio is the condition number that sets GD speed", "rd-cond, rd-eig use box")
c("Least squares worked (0,1),(1,2),(2,2): X^T X, X^T y, w = (7/6, 1/2), predictions, residuals sum to zero and orthogonal to t; kappa(X) 2.92, kappa(X^T X) 8.55; QR solve", "rd-ls (derived by orthogonality; QR solve worked), rd-orth (Gram-Schmidt of this X)")
# einsum
c("Einsum rules and examples (matmul, batched, attention scores/output, outer, trace); einops", "rd-ein table (cost counting linked to sibling #2)")
c("Worked attention scores shape (2, 8, 128, 128)", "rd-ein")
# tradeoffs
c("Trade-offs: eigen vs SVD; normal equations vs QR vs SVD; Cholesky for SPD and sampling, fails loudly; truncated SVD vs LoRA; which norm to regularise", "rd-tools, rd-ls, rd-sym, rd-low, rd-norm")
# mistakes
for m in ["Treating eigenvalues as stretches", "Forgetting to centre before PCA", "Mixing layouts", "Reading low rank as small", "Inverting a matrix to solve a system", "Taking floating-point rank literally"]:
    c("Common mistake: " + m, "rd-mist")
# connections and resources
c("How it connects: Topic: math, calculus page, probability page, information theory page, LoRA paper, PEFT, optimisers page", "Further reading (all linked with times)")
c("Resource MML ch. 2-4 (~3h 15m)", "Further reading step 4", "corrected time: about 12 to 15 h for ch. 2 to 4 and 10 (the root re-estimated ch. 2 to 7 at 20 to 30 h)")
c("Resource Parr and Howard, matrix calculus", "owned by matrix_calculus_and_backprop; not repeated", "handed to sibling #2")
c("Resource Matrix Cookbook", "Further reading step 8")
c("Resource 3Blue1Brown Essence of Linear Algebra (~3h)", "Further reading step 1")
json.dump(C, open(__file__.replace("mk_coverage.py", "coverage.json"), "w"), indent=1)
from collections import Counter
print(len(C), Counter(x["note"].split(":")[0].split(",")[0] for x in C))
