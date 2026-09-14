# Linear algebra for ML

⏱ 9 min read · +8h 15m resources

Updated 2026-08-24.

## Best resources

- [Mathematics for Machine Learning, ch. 2-4](https://mml-book.github.io/) (book, ~3h 15m for ch. 2-4): Deisenroth, Faisal, Ong; free PDF. Vector spaces, norms, decompositions, matrix calculus, in exactly the notation used below.
- [The Matrix Calculus You Need For Deep Learning](https://explained.ai/matrix-calculus/) (~1h 30m): Parr and Howard; paper-length article. Jacobians, layout conventions, chain rules for vectors.
- [The Matrix Cookbook](https://www.math.uwaterloo.ca/~hwolkowi/matrixcookbook.pdf) (reference, ~30 min to skim the identities you actually use): Petersen and Pedersen; lookup table for derivatives, inverses, decompositions; do not memorise, bookmark.
- [3Blue1Brown, Essence of Linear Algebra](https://www.3blue1brown.com/topics/linear-algebra) (video series, ~3h): geometric intuition for span, determinants, eigenvectors.

## Vector spaces, rank, and the mental model

A vector space is a set closed under addition and scalar multiplication. A basis is a minimal spanning set; its size is the dimension. For a matrix $A \in \mathbb{R}^{m \times n}$ viewed as a map $x \mapsto Ax$:

- Column space (image): all reachable outputs; its dimension is the rank $r$.
- Null space (kernel): inputs mapped to zero; dimension $n - r$ (rank-nullity).
- Rank $r \le \min(m, n)$; full-rank square matrices are invertible.

ML relevance: rank is "how many independent directions of variation the map actually uses". Weight matrices in trained networks are often effectively low rank, which is the empirical fact LoRA exploits.

## Norms

- $\ell_2$: $\|x\|_2 = \sqrt{\sum_i x_i^2}$. Rotation-invariant; L2 regularisation, gradient clipping.
- $\ell_1$: $\|x\|_1 = \sum_i |x_i|$. Sparsity-inducing (lasso); its unit ball has corners on the axes.
- $\ell_\infty$: $\max_i |x_i|$. Adversarial perturbation budgets.
- Frobenius (matrices): $\|A\|_F = \sqrt{\sum_{ij} a_{ij}^2} = \sqrt{\sum_i \sigma_i^2}$. Weight decay on matrices.
- Spectral norm: $\|A\|_2 = \sigma_{\max}(A)$, the largest singular value; controls Lipschitz constant of a linear layer (spectral normalisation in GANs, muP-style init reasoning).
- Nuclear norm: $\|A\|_* = \sum_i \sigma_i$; convex surrogate for rank.

Inner product and cosine similarity: $\cos\theta = \frac{x^\top y}{\|x\|\|y\|}$; the workhorse of embedding retrieval.

## The four decompositions that matter

| Decomposition | Form | Exists for | ML use |
|---|---|---|---|
| Eigendecomposition | $A = Q \Lambda Q^{-1}$; symmetric: $A = Q\Lambda Q^\top$, $Q$ orthogonal, $\Lambda$ real | Square, diagonalisable (always for symmetric) | Covariance analysis, PCA, Hessian curvature, power iteration |
| SVD | $A = U \Sigma V^\top$, $\sigma_1 \ge \sigma_2 \ge \dots \ge 0$ | Every matrix | Low-rank approximation, PCA, pseudo-inverse, conditioning |
| QR | $A = QR$, $Q$ orthonormal columns, $R$ upper triangular | Every matrix | Numerically stable least squares, orthogonalisation (Gram-Schmidt done right), Muon-style orthogonalised updates |
| Cholesky | $A = LL^\top$, $L$ lower triangular | Symmetric positive definite | Sampling from $\mathcal{N}(\mu, \Sigma)$ via $x = \mu + Lz$, solving SPD systems at half the cost of LU, GP regression |

Key facts:

- Spectral theorem: real symmetric matrices have real eigenvalues and orthonormal eigenvectors. Covariances and Hessians are symmetric, so this applies constantly.
- SVD relates to eigen: $A^\top A = V \Sigma^2 V^\top$, $AA^\top = U \Sigma^2 U^\top$. Singular values are always real and nonnegative even when eigenvalues are not defined.
- Condition number $\kappa(A) = \sigma_{\max}/\sigma_{\min}$: large $\kappa$ means ill-conditioned; for optimisation, $\kappa$ of the Hessian governs gradient descent's convergence rate (see [calculus-and-optimisation.md](calculus-and-optimisation.md)).
- PCA is the eigendecomposition of the covariance $\frac{1}{n}X^\top X$, equivalently the SVD of the centred data matrix.

## Low-rank approximation and LoRA

Eckart-Young-Mirsky: the best rank-$k$ approximation of $A$ in Frobenius or spectral norm is the truncated SVD

$$
A_k = \sum_{i=1}^{k} \sigma_i u_i v_i^\top, \qquad \|A - A_k\|_2 = \sigma_{k+1}.
$$

So singular values tell you exactly how much you lose by compressing. LoRA's move: instead of learning a full update $\Delta W \in \mathbb{R}^{d \times d}$ during fine-tuning, parameterise $\Delta W = BA$ with $B \in \mathbb{R}^{d \times r}$, $A \in \mathbb{R}^{r \times d}$, $r \ll d$: a hard rank-$r$ constraint, cutting trainable params from $d^2$ to $2dr$. It works because task-adaptation updates have low "intrinsic rank". Same idea underlies low-rank KV compression (DeepSeek MLA) and low-rank gradient projection (GaLore).

## Matrix calculus: layout conventions

The perennial confusion: given $f: \mathbb{R}^n \to \mathbb{R}^m$, is the derivative $m \times n$ or $n \times m$?

- Numerator layout (Jacobian convention): $\frac{\partial f}{\partial x} \in \mathbb{R}^{m \times n}$, rows indexed by outputs. Chain rule composes left-to-right as matrix products: $\frac{\partial f(g(x))}{\partial x} = J_f J_g$. Used by MML book, most papers.
- Denominator layout (gradient convention): the transpose, $n \times m$. For scalar $f$, this makes $\nabla f$ a column vector the same shape as $x$, which is what optimisers want and what autodiff frameworks return.

Practical rule: derive in numerator layout (chain rule is clean), then remember frameworks hand you gradients shaped like the parameter. For scalar loss $L$: $\nabla_W L$ has the shape of $W$, always.

## Jacobians and Hessians

- Jacobian of $f: \mathbb{R}^n \to \mathbb{R}^m$: $J_{ij} = \partial f_i / \partial x_j$. Backprop never materialises $J$; it computes vector-Jacobian products $v^\top J$ (see [calculus-and-optimisation.md](calculus-and-optimisation.md)).
- Hessian of scalar $f$: $H_{ij} = \partial^2 f / \partial x_i \partial x_j$, symmetric (Schwarz). Positive definite $\Rightarrow$ local min; eigenvalues are curvatures along eigenvector directions.

Gradients worth knowing cold (numerator layout, $x$ vector, $A$ constant):

- $\nabla_x (a^\top x) = a$
- $\nabla_x (x^\top A x) = (A + A^\top)x$, $= 2Ax$ for symmetric $A$
- $\nabla_X \operatorname{tr}(AX) = A^\top$; $\nabla_X \|X\|_F^2 = 2X$
- $\nabla_X \log\det X = X^{-\top}$
- Least squares: $\nabla_w \|Xw - y\|_2^2 = 2X^\top(Xw - y)$, giving normal equations $X^\top X w = X^\top y$.

Anything else: Matrix Cookbook, or [matrixcalculus.org](https://www.matrixcalculus.org/) (tool, no reading time) for symbolic checking.

## Einsum thinking

Every contraction is "label the axes, repeat an index to sum over it". Reading and writing `einsum` makes attention and batched ops unambiguous:

- Matrix multiply: `ij,jk->ik`
- Batched matmul: `bij,bjk->bik`
- Attention scores: `bhqd,bhkd->bhqk` (queries times keys per batch and head)
- Attention output: `bhqk,bhkd->bhqd`
- Outer product: `i,j->ij`; trace: `ii->`

Rules: repeated index on the input side and absent on the output is summed; index order on the output side is free (transposes are relabeling). If a shape bug survives ten minutes of staring, rewrite the op as einsum and it usually surfaces. `torch.einsum` and `einops.rearrange` are the practical tools; einops adds explicit reshapes (`b (h d) -> b h d`) that document intent.
