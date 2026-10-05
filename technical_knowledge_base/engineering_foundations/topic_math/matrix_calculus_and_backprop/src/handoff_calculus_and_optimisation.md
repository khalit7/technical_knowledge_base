# Hand-off to Calculus and optimisation for ML (from the matrix-calculus child, 2026-10-05)

The old "Linear algebra for ML" page had a "Jacobians and Hessians" section. This page keeps the Jacobian and the computation of Hessian-vector products; the meaning of the Hessian belongs to the calculus page. Verbatim from the old page (src/read/children/linear_algebra_for_ml.md, lines 110-111), with the check:

> Hessian of scalar $`f`$: $`H_{ij} = \partial^2 f / \partial x_i \partial x_j`$, symmetric (Schwarz). At a point where the gradient is zero, positive definite $`\Rightarrow`$ local min; eigenvalues are curvatures along eigenvector directions.
> Here $`f_i`$ is the $`i`$-th output, $`x_j`$ the $`j`$-th input, and Schwarz's theorem says mixed second derivatives do not depend on the order of differentiation when they are continuous. Because the Hessian is symmetric, the spectral theorem applies: it has real eigenvalues and orthogonal eigenvectors, and, for a positive definite Hessian, the ratio of the largest to the smallest eigenvalue is exactly the condition number that sets gradient descent's speed.

Check: verified (standard; Schwarz requires continuous second partials, as stated).

Also left to the calculus page (its own old material, not repeated here): the per-loss derivations (MSE, BCE + sigmoid, softmax CE with the z = (2, 1, 0.1) example, corrected sum 11.213), the GLM "mean minus target" view, Newton, conditioning, convexity, Lagrange. The matrix-calculus page links them. The logistic-unit backprop example (z 0.1, p 0.525, ...) is carried on the matrix-calculus page (section 5a); the calculus page need not repeat it.

Useful numbers for the calculus page, recomputed here: the tiny model's Hessian in x is W^T (diag p - p p^T) W = [[0.1848, -0.2289], [-0.2289, 0.6007]] (PyTorch double backward, jax.hessian agree).
