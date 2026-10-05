# Inherited sections of two old child pages (verbatim, from the root's saved copies in src/read/children/)

## From "Linear algebra for ML" (3c65c17b0d0d81d89c26e1dab2fcb701): matrix calculus, Jacobians and Hessians, gradients worth knowing, einsum, related mistakes and resources

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

- **Mixing layouts.** Writing the chain rule in numerator layout and plugging in a gradient from a framework (denominator layout) gives transposes in the wrong places. Check shapes at every step.
- [Mathematics for Machine Learning, ch. 2-4](https://mml-book.github.io/) (book, \~3h 15m for ch. 2-4): Deisenroth, Faisal, Ong; free PDF. Vector spaces, norms, decompositions, matrix calculus, in exactly the notation used on this page.
- [The Matrix Calculus You Need For Deep Learning](https://explained.ai/matrix-calculus/) (\~1h 30m): Parr and Howard; paper-length article. Jacobians, layout conventions, chain rules for vectors.
- [The Matrix Cookbook](https://www.math.uwaterloo.ca/~hwolkowi/matrixcookbook.pdf) (reference, \~30 min to skim the identities you actually use): Petersen and Pedersen; lookup table for derivatives, inverses, decompositions; do not memorise, bookmark.

## From "Calculus and optimisation for ML" (3c65c17b0d0d81eb8b49ed6a0f897f3b): backprop, VJPs, softmax Jacobian, costs, related mistakes and resources

- **How do you get the gradient of a billion parameters at once?** Reverse-mode automatic differentiation (backprop), which chains local vector-Jacobian products and never builds a Jacobian, so a backward pass costs about twice a forward pass.
- **Jacobian.** For a vector function $`f : \mathbb{R}^n \to \mathbb{R}^m`$, the $`m \times n`$ matrix $`J_{ij} = \partial f_i / \partial x_j`$; row $`i`$ is the gradient of output $`i`$. Whether a gradient is written as a row or a column (numerator versus denominator layout) is covered on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701"/>; autograd always returns a gradient in the shape of the parameter.
### Cross-entropy + softmax
For $`K`$ classes, softmax cross-entropy (CE):
$$
L = -\log p_y, \qquad p_k = \frac{e^{z_k}}{\sum_{j=1}^{K} e^{z_j}}.
$$
where $`z \in \mathbb{R}^K`$ is the logit vector, $`p_k`$ the predicted probability of class $`k`$ and $`y`$ the index of the true class. The softmax Jacobian is
$$
\frac{\partial p_k}{\partial z_j} = p_k(\delta_{kj} - p_j), \qquad \text{i.e. } J = \operatorname{diag}(p) - pp^\top.
$$
where $`\delta_{kj}`$ is 1 if $`k = j`$ and 0 otherwise (the Kronecker delta) and $`\operatorname{diag}(p)`$ is the diagonal matrix with $`p`$ on its diagonal. Since $`\partial L / \partial p_y = -1/p_y`$:
$$
\frac{\partial L}{\partial z_j} = -\frac{1}{p_y}\cdot p_y(\delta_{yj} - p_j) = p_j - \delta_{yj}, \qquad \text{i.e. } \nabla_z L = p - \mathbf{1}_y.
$$
where $`\mathbf{1}_y`$ is the one-hot vector of the true class. Again exactly prediction minus one-hot target. With soft labels, a target distribution $`q`$ instead of a single class (as in knowledge distillation or label smoothing), $`L = -\sum_k q_k \log p_k`$ and $`\nabla_z L = p - q`$.
Worked example: $`z = (2, 1, 0.1)`$ with class 1 true. $`e^{z} = (7.389, 2.718, 1.105)`$, summing to $`11.212`$, so $`p = (0.659, 0.242, 0.099)`$. The loss is $`-\log 0.659 = 0.417`$ and the gradient is $`p - \mathbf{1}_y = (-0.341, 0.242, 0.099)`$. The components sum to zero, because adding the same constant to every logit leaves the softmax unchanged; the true logit is pushed up and each other logit is pushed down in proportion to the probability it took. A finite-difference check (nudge each logit by $`\pm 10^{-5}`$ and difference the loss) reproduces all three numbers to four decimals.
### Why the simplification matters
1. **Numerical stability.** Nothing takes the log of, or divides by, a saturated probability. Frameworks fuse softmax and CE (`CrossEntropyLoss` takes logits) and use the log-sum-exp trick $`\log \sum_j e^{z_j} = m + \log \sum_j e^{z_j - m}`$ with $`m = \max_j z_j`$, so the largest exponent is $`e^0 = 1`$. For logits $`(1000, 1001)`$, $`e^{1001}`$ overflows even in float64, while the trick gives $`1001 + \log(e^{-1} + 1) = 1001.313`$.
2. **No vanishing gradient at the output.** A confidently wrong prediction ($`p \to 0`$ for the true class) still gives a gradient of magnitude close to 1, whereas MSE on a sigmoid output, $`L = (p - y)^2`$, has $`\partial L / \partial z = 2(p - y)\,p(1-p)`$ and so multiplies by $`\sigma'(z) \to 0`$ and stalls. At $`z = -6`$, $`y = 1`$: CE gives $`-0.9975`$, MSE gives $`2(0.0025 - 1)(0.0025)(0.9975) = -0.0049`$, about 200 times smaller. This is the concrete reason CE, not MSE, is used for classification.
3. **Cheap backprop.** The $`K \times K`$ softmax Jacobian, $`O(K^2)`$, is never materialised; the fused gradient $`p - \mathbf{1}_y`$ costs $`O(K)`$. For a language model $`K`$ is the vocabulary size, so a $`K \times K`$ matrix per token would be prohibitive.
4. **The same story from the generalised linear model (GLM) view.** A GLM models the target with an exponential-family distribution whose natural parameter is the logit. With the canonical link (logit for Bernoulli, log for Poisson, identity for Gaussian), the gradient of the negative log-likelihood with respect to the natural parameter is always mean minus target, $`\nabla_z L = \mu - y`$. Sigmoid with Bernoulli, softmax with categorical and identity with Gaussian (MSE up to a constant) are instances, which is why the three derivations above end in the same place. How each loss is the negative log-likelihood of its distribution is derived on <mention-page url="https://app.notion.com/p/3c65c17b0d0d815f9a47d613409b5a0c"/>.
## Chain rule, backprop, VJPs
For a composition $`L = f_k(f_{k-1}(\dots f_1(x)))`$ the chain rule says the Jacobians multiply:
$$
\frac{\partial L}{\partial x} = J_{f_k} \, J_{f_{k-1}} \cdots J_{f_1}.
$$
where $`J_{f_i}`$ is the Jacobian of step $`i`$ evaluated at the input it saw on this forward pass. Because $`L`$ is a scalar, $`J_{f_k}`$ is a single row, and the product is the same whichever end you start from, but the cost is not.
- **Reverse mode (backprop)** starts at the loss end and carries a row vector leftwards through the product: $`v^\top \leftarrow v^\top J_{f_i}`$, from $`i = k`$ down to 1, the opposite direction to the forward pass. Each step is a **vector-Jacobian product (VJP)**: each operation answers "given the gradient of the loss with respect to my output ($`v`$), what is it with respect to my inputs?" without ever building $`J`$. One backward pass gives the gradient with respect to every parameter. The backward pass costs about twice the forward pass, so a training step costs about three forward passes; this is the accounting behind the estimate of 6N floating-point operations per training token for a model with N parameters, 2N forward and 4N backward ([Kaplan et al. 2020, section 2.1](https://arxiv.org/abs/2001.08361)). The binding constraint is usually memory rather than compute: the backward pass needs the activations stored during the forward pass. **Activation checkpointing** stores only some of them and recomputes the rest during the backward pass; the scheme of [Chen et al. 2016](https://arxiv.org/abs/1604.06174) trains an $`n`$-layer network in $`O(\sqrt{n})`$ activation memory for the cost of one extra forward pass per mini-batch. Reverse mode is the right choice when outputs (one loss) are far fewer than inputs (billions of parameters).
- **Forward mode** carries a column vector $`u`$ from the input end alongside the forward pass, computing **Jacobian-vector products (JVPs)** $`Ju`$: the derivative of every output along one input direction. It is efficient when inputs are few and outputs many; for a gradient over $`n`$ parameters it would need $`n`$ passes.
- **Hessian-vector products** combine the two: $`Hv = \nabla_\theta(\nabla_\theta L \cdot v)`$. Take the gradient, dot it with a fixed vector $`v`$, and differentiate again. The cost is a small constant multiple of one gradient, and the $`n \times n`$ matrix is never formed.
Example VJPs, where a bar denotes the gradient of the loss with respect to that quantity ($`\bar{X} = \partial L / \partial X`$, the same shape as $`X`$):
- Matrix multiply $`Y = XW`$, with $`X`$ of shape $`b \times d`$, $`W`$ of shape $`d \times m`$ and $`Y`$ of shape $`b \times m`$: $`\bar{X} = \bar{Y}W^\top`$ ($`b \times m`$ times $`m \times d`$) and $`\bar{W} = X^\top \bar{Y}`$ ($`d \times b`$ times $`b \times m`$). The shapes force the answer.
- Elementwise $`y = \phi(x)`$: $`\bar{x} = \bar{y} \odot \phi'(x)`$, where $`\odot`$ is the elementwise product. For ReLU, $`\phi'`$ is 1 where $`x > 0`$ and 0 elsewhere, so the gradient is simply masked.
- A bias added to every row of a batch: its gradient is the sum of $`\bar{Y}`$ over the rows, because one parameter fed $`b`$ outputs.
Worked example: one logistic-regression unit, with $`x = (1, 2)`$, $`w = (0.5, -0.25)`$, $`b = 0.1`$ and label $`y = 1`$.
1. Forward: $`z = w \cdot x + b = 0.5 - 0.5 + 0.1 = 0.1`$, $`p = \sigma(0.1) = 0.525`$, loss $`-\log 0.525 = 0.644`$.
2. Backward through the loss: $`\bar{z} = p - y = -0.475`$.
3. Backward through $`z = w \cdot x + b`$: $`\bar{w} = \bar{z}\,x = (-0.475, -0.950)`$, $`\bar{b} = \bar{z} = -0.475`$, and $`\bar{x} = \bar{z}\,w = (-0.2375, 0.1188)`$, which is what an earlier layer would receive.
4. A gradient step with $`\eta = 0.1`$ gives $`w = (0.5475, -0.155)`$ and $`b = 0.1475`$; the new logit is $`0.5475 - 0.31 + 0.1475 = 0.385`$ and $`p = 0.595`$: the probability of the true class rose.
For derivatives themselves: reverse mode when there are few outputs and many inputs (every training loss), forward mode when there are few inputs and many outputs (sensitivity of many quantities to one hyperparameter), and Hessian-vector products whenever curvature is needed without the matrix.
- **Transposed gradients.** A paper's $`\partial L / \partial W`$ may be the transpose of the gradient autograd stores on `W`, which always has the shape of `W`.
- **"Backprop costs the same as the forward pass."** It costs about twice as much, and memory for stored activations, not compute, is usually what runs out.
- [CS231n backprop notes](https://cs231n.github.io/optimization-2/) (\~30 min): backprop as local gradient routing, staged computation.
- [Chen et al. 2016, Training Deep Nets with Sublinear Memory Cost](https://arxiv.org/abs/1604.06174) (paper, \~40 min): activation checkpointing.
- [Kaplan et al. 2020, Scaling Laws for Neural Language Models, section 2.1](https://arxiv.org/abs/2001.08361) (\~10 min for the section): the 6N compute accounting.
