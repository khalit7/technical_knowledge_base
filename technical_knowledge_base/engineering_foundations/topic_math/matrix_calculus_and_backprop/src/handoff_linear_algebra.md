# Hand-off to Linear algebra for ML (from the matrix-calculus child, 2026-10-05)

The old page's sections "Matrix calculus: layout conventions", "Jacobians and Hessians" (Jacobian part), the "Gradients worth knowing cold" list and "Einsum thinking" are now carried on Matrix calculus and backprop (see its src/coverage.json); the linear-algebra page can link it instead of repeating them.

Stays with the linear-algebra page (verbatim source: src/read/children/linear_algebra_for_ml.md line 119): the numerical half of the least-squares example, "Numerically, forming $`X^\top X`$ squares the condition number: here $`\kappa(X) \approx 2.92`$ but $`\kappa(X^\top X) \approx 8.55`$. That is why solvers use QR ($`X = QR`$, then solve the triangular system $`Rw = Q^\top y`$) instead of the normal equations." Check: verified (2.924 and 8.550 recomputed).

Correction found while checking: the old page says numerator layout is "Used by MML book, most papers". MML does use it (section 5.3, p. 150: "In this book, we use the numerator layout of the derivative"), but "most papers" has no support; Wikipedia's Matrix calculus article says conventions compete even within a field and many authors mix them.
