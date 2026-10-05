Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701 as of 2026-09-30T15:59:10.919Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538" title="Topic: math"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Linear algebra for ML"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="notion-file-block://3dd5b475-7a64-481e-a15a-2c5a5ed1b7f0/46c4b08e-5daf-4799-88d3-f46aad4e3290?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=linear-algebra-for-ml.html">Interactive: Linear algebra for ML</embed>
⏱ 18 min read · +8h 15m resources
## What it is and why it matters
Linear algebra is the language every model is written in. A dense layer is a matrix acting on a vector, a batch is one more axis, an attention head is two contractions, and a fine-tuning update is a matrix added to a matrix. So the questions that come up in practice are linear-algebra questions in disguise: how much does this map actually use its dimensions (rank), how big is this vector or this update (norms), which directions does this matrix stretch and by how much (eigenvalues and singular values), how much do I lose if I compress it (low-rank approximation), and what shape is this gradient (matrix calculus).
The single most useful mental picture: **a matrix is a map**. $`A \in \mathbb{R}^{m \times n}`$ takes a point in $`\mathbb{R}^n`$ to a point in $`\mathbb{R}^m`$, and it does so by rotating, stretching along some directions, possibly squashing some directions to zero, and rotating again. Every decomposition on this page is a way of making one part of that picture explicit. Read everything below as geometry first and algebra second.
## Vector spaces, rank, and the mental model
A **vector space** is a set closed under addition and scalar multiplication: add two members or scale one, and you stay in the set. A **span** is everything you can reach by adding scaled copies of some vectors. A **basis** is a minimal spanning set (no vector in it is a combination of the others); its size is the **dimension**. For a matrix $`A \in \mathbb{R}^{m \times n}`$ viewed as a map $`x \mapsto Ax`$:
- Column space (image): all reachable outputs, the span of the columns of $`A`$; its dimension is the rank $`r`$.
- Null space (kernel): inputs mapped to zero; dimension $`n - r`$ (rank-nullity).
- Rank $`r \le \min(m, n)`$; full-rank square matrices are invertible.
The rank-nullity theorem says the input dimensions are shared out exactly between the two:
$$
\operatorname{rank}(A) + \dim \operatorname{null}(A) = n
$$
where $`n`$ is the number of columns of $`A`$ (the input dimension), $`\operatorname{rank}(A)`$ the dimension of the column space, and $`\dim \operatorname{null}(A)`$ the dimension of the null space. Every input direction is either passed through to the output or destroyed.
**Worked example.** $`A = \begin{pmatrix} 1 & 2 \\ 2 & 4 \end{pmatrix}`$. The second column is twice the first, so the column space is the line spanned by $`(1, 2)`$ and the rank is 1. Rank-nullity then says the null space has dimension $`2 - 1 = 1`$, and indeed $`A(2, -1)^\top = (2 - 2, 4 - 4)^\top = (0, 0)^\top`$: the whole line through $`(2, -1)`$ is squashed to zero. Geometrically the map flattens the plane onto a line. It cannot be inverted, because two inputs differing by any multiple of $`(2, -1)`$ land on the same output. Its determinant is $`1 \cdot 4 - 2 \cdot 2 = 0`$, which is the same fact: the area of the image of the unit square is zero.
ML relevance: rank is "how many independent directions of variation the map actually uses". Weight matrices in trained networks are often effectively low rank (a few singular values carry most of the matrix), and fine-tuning updates are even more so, which is the empirical fact LoRA exploits (below). A rank-deficient representation is also the signature of collapse: if every embedding lies in a low-dimensional subspace, most of the dimensions are wasted.
## Norms
A norm measures size. Different norms measure different notions of "big", and the choice decides what a regulariser or a constraint pushes towards.
- $`\ell_2`$: $`\|x\|_2 = \sqrt{\sum_i x_i^2}`$. Rotation-invariant; L2 regularisation, gradient clipping.
- $`\ell_1`$: $`\|x\|_1 = \sum_i |x_i|`$. Sparsity-inducing (lasso); its unit ball has corners on the axes.
- $`\ell_\infty`$: $`\max_i |x_i|`$. Adversarial perturbation budgets.
- Frobenius (matrices): $`\|A\|_F = \sqrt{\sum_{ij} a_{ij}^2} = \sqrt{\sum_i \sigma_i^2}`$. Weight decay on matrices.
- Spectral norm: $`\|A\|_2 = \sigma_{\max}(A)`$, the largest singular value; controls Lipschitz constant of a linear layer (spectral normalisation in GANs, muP-style init reasoning).
- Nuclear norm: $`\|A\|_* = \sum_i \sigma_i`$; convex surrogate for rank.
where $`x_i`$ is the $`i`$-th entry of the vector $`x`$, $`a_{ij}`$ the entry of $`A`$ in row $`i`$ and column $`j`$, and $`\sigma_i`$ the $`i`$-th singular value of $`A`$ (defined in the next section: how much $`A`$ stretches its $`i`$-th principal direction).
Why $`\ell_1`$ gives sparsity: minimising a loss subject to $`\|x\|_1 \le c`$ means growing the $`\ell_1`$ ball until it first touches a level set of the loss, and a diamond is far more likely to be touched at a corner, where some coordinates are exactly zero, than along an edge. The round $`\ell_2`$ ball has no corners, so it shrinks every coordinate a little and zeroes none. Why the spectral norm is a Lipschitz constant: $`\|Ax - Ay\|_2 \le \sigma_{\max}(A)\,\|x - y\|_2`$, so no two inputs can move further apart than $`\sigma_{\max}`$ times their distance. Spectral normalisation divides a layer's weights by $`\sigma_{\max}`$ to force that factor to 1.
Inner product and cosine similarity: $`\cos\theta = \frac{x^\top y}{\|x\|\|y\|}`$; the workhorse of embedding retrieval.
where $`x^\top y = \sum_i x_i y_i`$ is the inner (dot) product, $`\|x\|`$ and $`\|y\|`$ are $`\ell_2`$ norms, and $`\theta`$ is the angle between the vectors. Cosine similarity ignores length and keeps direction, which is why embeddings are usually normalised to unit length first, after which the dot product and the cosine are the same number. The projection of $`x`$ onto the direction of $`y`$ is $`\frac{x^\top y}{\|y\|^2}\,y`$.
**Worked example.** For $`x = (3, -4)`$: $`\|x\|_2 = \sqrt{9 + 16} = 5`$, $`\|x\|_1 = 3 + 4 = 7`$, $`\|x\|_\infty = 4`$. Always $`\|x\|_\infty \le \|x\|_2 \le \|x\|_1`$. For $`a = (1, 2, 2)`$ and $`b = (2, 1, 2)`$: $`a^\top b = 2 + 2 + 4 = 8`$, $`\|a\| = \|b\| = 3`$, so $`\cos\theta = 8/9 \approx 0.889`$. And $`(3, -4)`$ against $`(4, 3)`$ gives $`12 - 12 = 0`$: orthogonal, cosine 0.
## The four decompositions that matter
Two definitions first. An **eigenvector** of a square matrix $`A`$ is a nonzero direction that $`A`$ only scales, $`Av = \lambda v`$, with the scale $`\lambda`$ its **eigenvalue**. A **singular value decomposition** instead asks, for any matrix, which orthonormal input directions $`v_i`$ are sent to orthogonal output directions: $`Av_i = \sigma_i u_i`$, with $`u_i`$ orthonormal and $`\sigma_i \ge 0`$ the stretch. Geometrically, the SVD says $`A`$ turns the unit circle (or sphere) into an ellipse (ellipsoid) whose semi-axes are $`\sigma_i u_i`$. Eigenvectors are about directions that do not turn; singular vectors are about directions that stay perpendicular. For a symmetric matrix with nonnegative eigenvalues the two coincide.
$$
A = U \Sigma V^\top = \sum_{i=1}^{r} \sigma_i u_i v_i^\top
$$
where $`U \in \mathbb{R}^{m \times m}`$ and $`V \in \mathbb{R}^{n \times n}`$ are orthogonal (their columns $`u_i`$ and $`v_i`$ are the left and right singular vectors), $`\Sigma \in \mathbb{R}^{m \times n}`$ is zero except for $`\sigma_1 \ge \sigma_2 \ge \dots \ge 0`$ on its diagonal, and $`r`$ is the rank (the number of nonzero singular values). The sum form reads the matrix as $`r`$ rank-one layers, largest first.
<table header-row="true">
<tr>
<td>Decomposition</td>
<td>Form</td>
<td>Exists for</td>
<td>ML use</td>
</tr>
<tr>
<td>Eigendecomposition</td>
<td>$`A = Q \Lambda Q^{-1}`$; symmetric: $`A = Q\Lambda Q^\top`$, $`Q`$ orthogonal, $`\Lambda`$ real</td>
<td>Square, diagonalisable (always for symmetric)</td>
<td>Covariance analysis, PCA, Hessian curvature, power iteration</td>
</tr>
<tr>
<td>SVD</td>
<td>$`A = U \Sigma V^\top`$, $`\sigma_1 \ge \sigma_2 \ge \dots \ge 0`$</td>
<td>Every matrix</td>
<td>Low-rank approximation, PCA, pseudo-inverse, conditioning, orthogonalised updates (Muon replaces an update $`U\Sigma V^\top`$ by $`UV^\top`$)</td>
</tr>
<tr>
<td>QR</td>
<td>$`A = QR`$, $`Q`$ orthonormal columns, $`R`$ upper triangular</td>
<td>Every matrix</td>
<td>Numerically stable least squares, orthogonalisation (Gram-Schmidt done right)</td>
</tr>
<tr>
<td>Cholesky</td>
<td>$`A = LL^\top`$, $`L`$ lower triangular</td>
<td>Symmetric positive definite</td>
<td>Sampling from $`\mathcal{N}(\mu, \Sigma)`$ via $`x = \mu + Lz`$, solving SPD systems at half the cost of LU, GP regression</td>
</tr>
</table>
In the table, $`Q`$ holds eigenvectors as columns and $`\Lambda`$ is the diagonal matrix of eigenvalues; "orthogonal" means $`Q^\top Q = I`$; "symmetric positive definite" (SPD) means $`A = A^\top`$ and $`x^\top A x > 0`$ for every nonzero $`x`$; $`\mathcal{N}(\mu, \Sigma)`$ is a Gaussian with mean $`\mu`$ and covariance $`\Sigma = LL^\top`$, and $`z`$ a vector of independent standard normal samples, so $`x = \mu + Lz`$ has covariance $`L I L^\top = \Sigma`$. LU is the general-purpose factorisation into lower and upper triangular factors; Cholesky exploits symmetry to do the same job in about $`n^3/3`$ floating-point operations instead of $`2n^3/3`$.
Key facts:
- Spectral theorem: real symmetric matrices have real eigenvalues and orthonormal eigenvectors. Covariances and Hessians are symmetric, so this applies constantly.
- SVD relates to eigen: $`A^\top A = V \Sigma^2 V^\top`$, $`AA^\top = U \Sigma^2 U^\top`$. Singular values are always real and nonnegative even when eigenvalues are not defined (a non-square matrix has none, and a rotation has only complex ones).
- The determinant is the product of the eigenvalues and, in absolute value, the product of the singular values: the factor by which the map scales area or volume. The trace is the sum of the eigenvalues.
- Condition number $`\kappa(A) = \sigma_{\max}/\sigma_{\min}`$: large $`\kappa`$ means ill-conditioned, the ellipse is long and thin, and small input errors in the thin direction are amplified by up to $`\kappa`$ when solving $`Ax = b`$. For optimisation, $`\kappa`$ of the Hessian governs gradient descent's convergence rate: on a quadratic the error shrinks by a factor of about $`(\kappa - 1)/(\kappa + 1)`$ per step, so a long narrow valley means many small, zig-zagging steps (derived on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b"/>).
- PCA is the eigendecomposition of the covariance $`\frac{1}{n}X^\top X`$ of a centred data matrix $`X`$ ($`n`$ rows, one per example, each column's mean subtracted), equivalently the SVD of that centred matrix: if $`X = U\Sigma V^\top`$, the principal directions are the columns of $`V`$ and the variance along the $`i`$-th is $`\sigma_i^2/n`$.
- Muon's orthogonalised update keeps the singular vectors of the momentum update and sets every singular value to 1, so the step pushes equally along every direction instead of being dominated by a few large ones. A full SVD is too slow, so it approximates $`UV^\top`$ with a few Newton-Schulz iterations, which run stably in bfloat16 ([Keller Jordan, Muon](https://kellerjordan.github.io/posts/muon/)); the optimiser itself is covered on <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>.
**Worked example: eigenvalues are not singular values.** Take $`A = \begin{pmatrix} 3 & 0 \\ 4 & 5 \end{pmatrix}`$. It is triangular, so its eigenvalues are the diagonal entries, 3 and 5, with eigenvectors $`(1, -2)`$ (check: $`A(1, -2)^\top = (3, -6)^\top = 3(1, -2)^\top`$) and $`(0, 1)`$ (check: $`(0, 5)^\top`$). These two eigenvectors are not orthogonal, because $`A`$ is not symmetric. For the singular values, form $`A^\top A = \begin{pmatrix} 25 & 20 \\ 20 & 25 \end{pmatrix}`$. Its eigenvalues solve $`(25 - \lambda)^2 = 400`$, so $`\lambda = 45`$ or $`5`$, and the singular values are $`\sigma_1 = \sqrt{45} \approx 6.708`$ and $`\sigma_2 = \sqrt{5} \approx 2.236`$, with right singular vectors $`v_1 = (1, 1)/\sqrt{2}`$ and $`v_2 = (-1, 1)/\sqrt{2}`$. Then $`u_1 = Av_1/\sigma_1 = (3, 9)/(\sqrt{2}\sqrt{45}) = (1, 3)/\sqrt{10}`$. The circle becomes an ellipse with semi-axes 6.708 and 2.236. Consistency checks: $`|\det A| = 15 = 3 \times 5 = \sqrt{45}\sqrt{5}`$; $`\|A\|_F = \sqrt{9 + 0 + 16 + 25} = \sqrt{50} \approx 7.071 = \sqrt{45 + 5}`$; spectral norm 6.708; nuclear norm $`6.708 + 2.236 = 8.944`$; condition number $`\sqrt{45}/\sqrt{5} = 3`$. The largest stretch (6.708) is larger than the largest eigenvalue (5): a non-symmetric matrix can stretch more than it scales any single direction.
**Worked example: Cholesky.** For $`\Sigma = \begin{pmatrix} 4 & 2 \\ 2 & 3 \end{pmatrix}`$, $`L = \begin{pmatrix} 2 & 0 \\ 1 & \sqrt{2} \end{pmatrix}`$: $`l_{11} = \sqrt{4} = 2`$, $`l_{21} = 2/2 = 1`$, $`l_{22} = \sqrt{3 - 1^2} = \sqrt{2}`$, and $`LL^\top = \begin{pmatrix} 4 & 2 \\ 2 & 1 + 2 \end{pmatrix}`$. To sample from $`\mathcal{N}(0, \Sigma)`$, draw two independent standard normals $`z`$ and output $`Lz`$.
## Low-rank approximation and LoRA
Eckart-Young-Mirsky: the best rank-$`k`$ approximation of $`A`$ in Frobenius or spectral norm is the truncated SVD
$$
A_k = \sum_{i=1}^{k} \sigma_i u_i v_i^\top, \qquad \|A - A_k\|_2 = \sigma_{k+1}, \qquad \|A - A_k\|_F = \sqrt{\sum_{i > k} \sigma_i^2}.
$$
where $`A_k`$ keeps the $`k`$ largest rank-one layers of the SVD and drops the rest, $`\sigma_i, u_i, v_i`$ are the $`i`$-th singular value and singular vectors, and the two error formulas give the spectral-norm error (the largest dropped singular value) and the Frobenius error (all dropped singular values combined). No other rank-$`k`$ matrix does better in either norm.
So singular values tell you exactly how much you lose by compressing: a matrix whose singular values fall off quickly compresses well, one with a flat spectrum does not. Storing $`A_k`$ for an $`m \times n`$ matrix costs $`k(m + n)`$ numbers (the $`\sigma_i`$ can be folded into $`u_i`$) instead of $`mn`$.
**Worked example.** For $`A = \begin{pmatrix} 3 & 0 \\ 4 & 5 \end{pmatrix}`$ from the previous section, $`A_1 = \sigma_1 u_1 v_1^\top = \sqrt{45} \cdot \frac{(1, 3)^\top}{\sqrt{10}} \cdot \frac{(1, 1)}{\sqrt{2}} = \frac{3}{2}\begin{pmatrix} 1 & 1 \\ 3 & 3 \end{pmatrix} = \begin{pmatrix} 1.5 & 1.5 \\ 4.5 & 4.5 \end{pmatrix}`$. The error $`A - A_1 = \begin{pmatrix} 1.5 & -1.5 \\ -0.5 & 0.5 \end{pmatrix}`$ has spectral and Frobenius norm $`\sqrt{5} \approx 2.236 = \sigma_2`$, exactly as the theorem says.
LoRA's move: instead of learning a full update $`\Delta W \in \mathbb{R}^{d \times d}`$ during fine-tuning, parameterise $`\Delta W = BA`$ with $`B \in \mathbb{R}^{d \times r}`$, $`A \in \mathbb{R}^{r \times d}`$, $`r \ll d`$: a hard rank-$`r`$ constraint, cutting trainable params from $`d^2`$ to $`2dr`$. It works because task-adaptation updates have low "intrinsic rank". The frozen pretrained weight $`W_0`$ is untouched and the layer computes $`W_0 x + BAx`$; $`B`$ starts at zero so training begins exactly at the pretrained model, and after training $`BA`$ can be merged into $`W_0`$ so inference costs nothing extra. For a non-square $`d \times k`$ weight the count is $`r(d + k)`$. With $`d = 4096`$ and $`r = 8`$: a full update has $`4096^2 = 16{,}777{,}216`$ parameters, the LoRA pair $`2 \cdot 4096 \cdot 8 = 65{,}536`$, which is $`2r/d = 0.39\%`$ of it. The paper's own analysis found that ranks as low as 1 to 8 were competitive on GPT-3 and that the top singular directions learned at different ranks and seeds agree, which is the direct evidence that the useful update lives in a tiny subspace (<mention-page url="https://app.notion.com/p/3c65c17b0d0d81018f15edd19fa5c28a"/>; practice on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eba08eef56b3e3b4eb"/>).
Same idea underlies low-rank KV compression (DeepSeek MLA) and low-rank gradient projection (GaLore). Multi-head latent attention (MLA) caches one small latent vector per token and reconstructs the keys and values from it with learned up-projection matrices, so the map from a token to its keys and values is a factorisation through a narrow bottleneck, exactly the $`BA`$ shape (<mention-page url="https://app.notion.com/p/3c65c17b0d0d81a2ae7ec6796947a235"/>). GaLore keeps full-rank weights but projects each weight's gradient onto its top-$`r`$ singular vectors, recomputed by an SVD of the current gradient every $`T`$ steps, and keeps the optimiser state in that small space, cutting optimiser-state memory by up to 65.5% in the paper's LLaMA pretraining runs ([Zhao et al., GaLore](https://arxiv.org/abs/2403.03507)).
## Matrix calculus: layout conventions
The perennial confusion: given $`f: \mathbb{R}^n \to \mathbb{R}^m`$, is the derivative $`m \times n`$ or $`n \times m`$?
- Numerator layout (Jacobian convention): $`\frac{\partial f}{\partial x} \in \mathbb{R}^{m \times n}`$, rows indexed by outputs. Chain rule composes left-to-right as matrix products: $`\frac{\partial f(g(x))}{\partial x} = J_f J_g`$. Used by MML book, most papers.
- Denominator layout (gradient convention): the transpose, $`n \times m`$. For scalar $`f`$, this makes $`\nabla f`$ a column vector the same shape as $`x`$, which is what optimisers want and what autodiff frameworks return.
Here $`J_f`$ is the Jacobian of $`f`$ evaluated at $`g(x)`$ and $`J_g`$ the Jacobian of $`g`$ at $`x`$. In numerator layout the derivative of a scalar with respect to a vector is a row vector; in denominator layout it is a column. Neither is wrong; mixing them within one derivation is.
Practical rule: derive in numerator layout (chain rule is clean), then remember frameworks hand you gradients shaped like the parameter. For scalar loss $`L`$: $`\nabla_W L`$ has the shape of $`W`$, always.
**Worked example.** Take $`f(x) = Wx`$ with $`W \in \mathbb{R}^{3 \times 2}`$, so $`f: \mathbb{R}^2 \to \mathbb{R}^3`$. In numerator layout $`\partial f/\partial x = W`$, a $`3 \times 2`$ matrix (row $`i`$ is how output $`i`$ responds to each input). In denominator layout it is $`W^\top`$, $`2 \times 3`$. Now a scalar loss $`L = \|Wx - y\|_2^2`$ with $`y \in \mathbb{R}^3`$: the gradient with respect to $`W`$ must be $`3 \times 2`$ like $`W`$, and it is $`\nabla_W L = 2(Wx - y)x^\top`$, a $`3 \times 1`$ column times a $`1 \times 2`$ row. The shapes alone nearly force the answer, which is the fastest sanity check there is.
## Jacobians and Hessians
- Jacobian of $`f: \mathbb{R}^n \to \mathbb{R}^m`$: $`J_{ij} = \partial f_i / \partial x_j`$. Backprop never materialises $`J`$; it computes vector-Jacobian products $`v^\top J`$: given $`v`$, the gradient of the loss with respect to a layer's output, it returns the gradient with respect to the layer's input, at roughly the cost of the forward computation and without ever building the $`m \times n`$ matrix (the full mechanism is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b"/>).
- Hessian of scalar $`f`$: $`H_{ij} = \partial^2 f / \partial x_i \partial x_j`$, symmetric (Schwarz). At a point where the gradient is zero, positive definite $`\Rightarrow`$ local min; eigenvalues are curvatures along eigenvector directions.
Here $`f_i`$ is the $`i`$-th output, $`x_j`$ the $`j`$-th input, and Schwarz's theorem says mixed second derivatives do not depend on the order of differentiation when they are continuous. Because the Hessian is symmetric, the spectral theorem applies: it has real eigenvalues and orthogonal eigenvectors, and, for a positive definite Hessian, the ratio of the largest to the smallest eigenvalue is exactly the condition number that sets gradient descent's speed.
Gradients worth knowing cold (gradient layout: each result has the shape of the variable, as a framework returns it; $`x`$ vector, $`a`$ and $`A`$ constant):
- $`\nabla_x (a^\top x) = a`$
- $`\nabla_x (x^\top A x) = (A + A^\top)x`$, $`= 2Ax`$ for symmetric $`A`$
- $`\nabla_X \operatorname{tr}(AX) = A^\top`$; $`\nabla_X \|X\|_F^2 = 2X`$
- $`\nabla_X \log\det X = X^{-\top}`$
- Least squares: $`\nabla_w \|Xw - y\|_2^2 = 2X^\top(Xw - y)`$, giving normal equations $`X^\top X w = X^\top y`$.
where $`\operatorname{tr}`$ is the trace (sum of the diagonal), $`X^{-\top}`$ the transpose of the inverse, and in the least-squares line $`X`$ is the data matrix (one row per example), $`w`$ the weights and $`y`$ the targets. In numerator layout each of these would be the transpose (for example $`a^\top`$ for the first).
**Worked example: least squares.** Fit a line $`\hat{y} = w_0 + w_1 t`$ to the points $`(t, y) = (0, 1), (1, 2), (2, 2)`$. With a column of ones for the intercept, $`X = \begin{pmatrix} 1 & 0 \\ 1 & 1 \\ 1 & 2 \end{pmatrix}`$ and $`y = (1, 2, 2)^\top`$. Then $`X^\top X = \begin{pmatrix} 3 & 3 \\ 3 & 5 \end{pmatrix}`$ and $`X^\top y = (5, 6)^\top`$. The determinant is $`15 - 9 = 6`$, so $`w = \frac{1}{6}\begin{pmatrix} 5 & -3 \\ -3 & 3 \end{pmatrix}(5, 6)^\top = \frac{1}{6}(7, 3)^\top \approx (1.167, 0.5)`$. Predictions $`1.167, 1.667, 2.167`$; residuals $`-0.167, 0.333, -0.167`$ (targets minus predictions), which sum to zero and are orthogonal to $`t`$, exactly what $`X^\top(Xw - y) = 0`$ demands. Numerically, forming $`X^\top X`$ squares the condition number: here $`\kappa(X) \approx 2.92`$ but $`\kappa(X^\top X) \approx 8.55`$. That is why solvers use QR ($`X = QR`$, then solve the triangular system $`Rw = Q^\top y`$) instead of the normal equations.
Anything else: Matrix Cookbook, or [matrixcalculus.org](https://www.matrixcalculus.org/) (tool, no reading time) for symbolic checking.
## Einsum thinking
Every contraction is "label the axes, repeat an index to sum over it". Reading and writing `einsum` makes attention and batched ops unambiguous:
- Matrix multiply: `ij,jk->ik`
- Batched matmul: `bij,bjk->bik`
- Attention scores: `bhqd,bhkd->bhqk` (queries times keys per batch and head)
- Attention output: `bhqk,bhkd->bhqd`
- Outer product: `i,j->ij`; trace: `ii->`
Rules: repeated index on the input side and absent on the output is summed; index order on the output side is free (transposes are relabeling). If a shape bug survives ten minutes of staring, rewrite the op as einsum and it usually surfaces. `torch.einsum` and `einops.rearrange` are the practical tools; einops adds explicit reshapes (`b (h d) -> b h d`) that document intent.
The cost falls out of the labels too: a plain contraction does one multiply-add for every combination of all the distinct indices, so its count is the product of every index's size. The output shape is the sizes of the output indices, in the order written.
**Worked example.** Attention scores `bhqd,bhkd->bhqk` with batch $`b = 2`$, heads $`h = 8`$, query and key length $`q = k = 128`$ and head dimension $`d = 64`$: the index `d` is summed away, so the output has shape $`(2, 8, 128, 128)`$, and the cost is $`2 \cdot 8 \cdot 128 \cdot 128 \cdot 64 = 16{,}777{,}216`$ multiply-adds. Doubling the sequence length doubles both `q` and `k`, so the cost quadruples: the quadratic cost of attention, read straight off the einsum string.
## Trade-offs: which tool when
- **Eigendecomposition or SVD.** Use the eigendecomposition for symmetric matrices (covariances, Hessians), where it is the SVD up to signs and is cheaper. Use the SVD for anything else, and whenever you care about how much a map stretches rather than which directions it preserves.
- **Solving least squares.** The normal equations are cheapest and fine for well-conditioned problems, but square the condition number. QR is the default for accuracy. The SVD (the pseudo-inverse) is the most robust, and the only one that handles a rank-deficient $`X`$ gracefully, at the highest cost.
- **SPD systems and Gaussian sampling.** Cholesky: half the cost of LU, and it fails loudly (a negative number under a square root) when the matrix is not positive definite, which doubles as a test.
- **Compression.** Truncated SVD is optimal but needs the full matrix and a decomposition. LoRA never forms the full update at all: it trades a hard rank cap for trainable-parameter and optimiser-memory savings, which is right when the update is low rank and wrong when the task needs to write a lot of new information into the weights.
- **Which norm to regularise.** $`\ell_2`$ (weight decay) shrinks everything smoothly; $`\ell_1`$ zeroes coordinates; the nuclear norm pushes a matrix towards low rank; the spectral norm bounds how much a layer can amplify its input.
## Common mistakes
- **Treating eigenvalues as stretches.** For a non-symmetric matrix they differ from the singular values (3 and 5 against 6.708 and 2.236 in the worked example), and the eigenvectors need not be orthogonal. Stretch, norms and conditioning are singular-value questions.
- **Forgetting to centre before PCA.** $`\frac{1}{n}X^\top X`$ is the covariance only if every column of $`X`$ has mean zero; otherwise the first "principal component" mostly points at the mean.
- **Mixing layouts.** Writing the chain rule in numerator layout and plugging in a gradient from a framework (denominator layout) gives transposes in the wrong places. Check shapes at every step.
- **Reading "low rank" as "small".** A rank-one matrix can have a huge norm, and a full-rank matrix can be tiny. Rank counts directions; norms measure size.
- **Inverting a matrix to solve a system.** Computing $`A^{-1}b`$ explicitly is slower and less accurate than solving $`Ax = b`$ with a factorisation (LU, QR, Cholesky), and fails badly when $`\kappa`$ is large.
- **Taking the rank of a floating-point matrix literally.** In floating point almost every matrix is full rank; the useful quantity is the effective rank, how many singular values are above a tolerance, or how fast the spectrum falls.
## How it connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538">Topic: math</mention-page>: the map of the four maths areas; linear algebra is the notation the other three are written in.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b"/>: backprop as vector-Jacobian products, the Hessian's role in Newton's method, and the condition-number convergence rate stated above.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d815f9a47d613409b5a0c"/>: covariance matrices and Gaussians, where the spectral theorem and Cholesky are used.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5"/>: the entropy side of the same toolkit; dot products reappear as the logits inside InfoNCE.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81018f15edd19fa5c28a"/> and <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eba08eef56b3e3b4eb"/>: low-rank adaptation in full, the paper's evidence and current practice.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>: Muon's orthogonalised updates and the second-order preconditioners that build on eigen and Kronecker structure.
## Best resources
- [Mathematics for Machine Learning, ch. 2-4](https://mml-book.github.io/) (book, \~3h 15m for ch. 2-4): Deisenroth, Faisal, Ong; free PDF. Vector spaces, norms, decompositions, matrix calculus, in exactly the notation used on this page.
- [The Matrix Calculus You Need For Deep Learning](https://explained.ai/matrix-calculus/) (\~1h 30m): Parr and Howard; paper-length article. Jacobians, layout conventions, chain rules for vectors.
- [The Matrix Cookbook](https://www.math.uwaterloo.ca/~hwolkowi/matrixcookbook.pdf) (reference, \~30 min to skim the identities you actually use): Petersen and Pedersen; lookup table for derivatives, inverses, decompositions; do not memorise, bookmark.
- [3Blue1Brown, Essence of Linear Algebra](https://www.3blue1brown.com/topics/linear-algebra) (video series, \~3h): geometric intuition for span, determinants, eigenvectors.
</content>
</page>