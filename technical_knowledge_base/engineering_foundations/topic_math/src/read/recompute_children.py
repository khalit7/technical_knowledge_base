"""Recompute every worked number on the four old child pages (saved in children/*.md).
Run from the scratchpad: uv run --no-project --with numpy --with scipy python recompute_children.py
Each line: page | claim | page value | recomputed | OK/DIFF."""
import numpy as np, math
from math import comb, log, log2, sqrt, exp
from scipy import stats

rows = []
def chk(page, claim, stated, val, tol=None):
    if isinstance(stated, (int, float)) and isinstance(val, (int, float, np.floating)):
        t = tol if tol is not None else 0.5 * 10 ** (-max(0, len(str(stated).split('.')[-1]) if '.' in str(stated) else 0)) + 1e-12
        ok = abs(float(val) - stated) <= t
    else:
        ok = stated == val
    rows.append((page, claim, stated, val if not isinstance(val, float) else round(val, 6), "OK" if ok else "DIFF"))

LA, PS, CO, IT = "linear algebra", "probability", "calculus", "information"
# ---------------- Linear algebra ----------------
A = np.array([[1, 2], [2, 4.]])
chk(LA, "rank of [[1,2],[2,4]]", 1, int(np.linalg.matrix_rank(A)))
chk(LA, "A(2,-1) = 0", [0, 0], (A @ [2, -1]).tolist() and [int(v) for v in A @ [2, -1]])
chk(LA, "det", 0, round(float(np.linalg.det(A)), 9))
x = np.array([3, -4.])
chk(LA, "||(3,-4)||_2", 5, float(np.linalg.norm(x))); chk(LA, "||.||_1", 7, float(np.abs(x).sum())); chk(LA, "||.||_inf", 4, float(np.abs(x).max()))
a, b = np.array([1, 2, 2.]), np.array([2, 1, 2.])
chk(LA, "a.b", 8, float(a @ b)); chk(LA, "cos", 0.889, float(a @ b / 9)); chk(LA, "(3,-4).(4,3)", 0, float(x @ [4, 3]))
A = np.array([[3, 0], [4, 5.]])
chk(LA, "eigenvalues", [3.0, 5.0], sorted(np.linalg.eigvals(A).real.round(9).tolist()))
chk(LA, "A(1,-2) = 3(1,-2)", [3, -6], [int(v) for v in A @ [1, -2]])
chk(LA, "A^T A", [[25, 20], [20, 25]], (A.T @ A).astype(int).tolist())
s = np.linalg.svd(A, compute_uv=False)
chk(LA, "sigma1", 6.708, float(s[0])); chk(LA, "sigma2", 2.236, float(s[1]))
U, S, Vt = np.linalg.svd(A)
chk(LA, "u1 = (1,3)/sqrt10 (up to sign)", True, bool(np.allclose(np.abs(U[:, 0]), np.array([1, 3]) / sqrt(10))))
chk(LA, "|det|", 15, abs(round(float(np.linalg.det(A)), 9)))
chk(LA, "Frobenius", 7.071, float(np.linalg.norm(A)))
chk(LA, "nuclear", 8.944, float(s.sum())); chk(LA, "kappa", 3, round(float(s[0] / s[1]), 9))
S2 = np.array([[4, 2], [2, 3.]]); Lc = np.linalg.cholesky(S2)
chk(LA, "Cholesky L", [[2, 0], [1, 1.414]], Lc.round(3).tolist())
A1 = S[0] * np.outer(U[:, 0], Vt[0]); chk(LA, "A_1", [[1.5, 1.5], [4.5, 4.5]], A1.round(3).tolist())
E = A - A1; chk(LA, "||A-A1||_2", 2.236, float(np.linalg.norm(E, 2))); chk(LA, "||A-A1||_F", 2.236, float(np.linalg.norm(E)))
chk(LA, "LoRA full d^2", 16777216, 4096 ** 2); chk(LA, "LoRA 2dr", 65536, 2 * 4096 * 8); chk(LA, "LoRA pct", 0.39, 100 * 16 / 4096)
X = np.array([[1, 0], [1, 1], [1, 2.]]); yv = np.array([1, 2, 2.])
chk(LA, "X^T X", [[3, 3], [3, 5]], (X.T @ X).astype(int).tolist()); chk(LA, "X^T y", [5, 6], (X.T @ yv).astype(int).tolist())
w = np.linalg.solve(X.T @ X, X.T @ yv); chk(LA, "w", [1.167, 0.5], w.round(3).tolist())
res = yv - X @ w; chk(LA, "residuals", [-0.167, 0.333, -0.167], res.round(3).tolist())
chk(LA, "kappa(X)", 2.92, float(np.linalg.cond(X))); chk(LA, "kappa(X^T X)", 8.55, float(np.linalg.cond(X.T @ X)))
chk(LA, "einsum cost", 16777216, 2 * 8 * 128 * 128 * 64)
# ---------------- Probability ----------------
chk(PS, "P(Y=1)", 0.38, 0.8 * 0.3 + 0.2 * 0.7); chk(PS, "P(X=1|Y=1)", 0.63, 0.24 / 0.38)
chk(PS, "product of marginals", 0.114, 0.3 * 0.38)
chk(PS, "spam -log 0.8", 0.223, -log(0.8)); chk(PS, "-log 0.2", 1.609, -log(0.2)); chk(PS, "ratio 'seven times'", 7, round(log(0.2) / log(0.8), 2), tol=0.3)
p = np.exp([2, 1, 0]); p /= p.sum(); chk(PS, "softmax (2,1,0)", [0.665, 0.245, 0.09], p.round(3).tolist()); chk(PS, "-log 0.665", 0.408, -log(p[0]))
chk(PS, "Gaussian NLL 1.044", 1.044, 0.5 * 0.25 + 0.5 * log(2 * math.pi)); chk(PS, "0.5 log 2pi", 0.919, 0.5 * log(2 * math.pi))
chk(PS, "Poisson P(3|2)", 0.180, 8 * exp(-2) / 6); chk(PS, "Poisson NLL", 1.712, 2 - 3 * log(2) + log(6)); chk(PS, "model part", -0.079, 2 - 3 * log(2))
chk(PS, "MAP mode Beta(5,2)", 0.8, 4 / 5); chk(PS, "posterior mean", 0.714, 5 / 7)
chk(PS, "Beta(5,2) sd", 0.16, sqrt(5 * 2 / (49 * 8))); chk(PS, "10/392", True, abs(5 * 2 / (49 * 8) - 10 / 392) < 1e-12)
chk(PS, "shrinkage MSE", 0.5, 0.25 + 0.25)
chk(PS, "9 of 10 one-sided", 0.011, (comb(10, 9) + 1) / 1024); chk(PS, "two-sided", 0.021, 2 * 11 / 1024)
chk(PS, "1-0.95^20", 0.64, 1 - 0.95 ** 20); chk(PS, "Bonferroni", 0.0025, 0.05 / 20)
chk(PS, "+-2 SE n=500", 0.045, 2 * sqrt(0.25 / 500))
chk(PS, "McNemar 25/55", 0.45, 25 / 55); chk(PS, "p for 0.45", 0.50, float(stats.chi2.sf(25 / 55, 1)))
chk(PS, "paired SE", 0.0148, sqrt(55 - 25 / 500) / 500); chk(PS, "paired 95% +-3pts", 3, 196 * sqrt(55 - 25 / 500) / 500, tol=0.2)
# unpaired: two accuracies near 0.5 on 500 each: SE diff = sqrt(2*0.25/500)
chk(PS, "unpaired +-6.3 pts", 6.3, 196 * sqrt(2 * 0.25 / 500), tol=0.05)
chk(PS, "McNemar 225/45", 5.0, 225 / 45); chk(PS, "p for 5.0", 0.025, float(stats.chi2.sf(5, 1)))
chk(PS, "continuity corrected", 4.36, (15 - 1) ** 2 / 45, tol=0.01); chk(PS, "p cc", 0.037, float(stats.chi2.sf(14 ** 2 / 45, 1)))
chk(PS, "SE n=500", 0.022, sqrt(0.25 / 500)); chk(PS, "SE n=2000", 0.011, sqrt(0.25 / 2000))
chk(PS, "Hoeffding bound", 0.16, 2 * exp(-2 * 500 * 0.0025)); chk(PS, "n >= 738", 738, math.ceil(log(2 / 0.05) / (2 * 0.0025)))
chk(PS, "cos sd 1/sqrt(1024)", 0.03, 1 / sqrt(1024), tol=0.002)
# ---------------- Calculus ----------------
X = np.array([[1, 1], [1, 2], [1, 3.]]); yv = np.array([1, 3, 4.])
chk(CO, "X^T X", [[3, 6], [6, 14]], (X.T @ X).astype(int).tolist()); chk(CO, "X^T y", [8, 19], (X.T @ yv).astype(int).tolist())
w = np.linalg.solve(X.T @ X, X.T @ yv); chk(CO, "w", [-0.333, 1.5], w.round(3).tolist())
chk(CO, "residuals yhat-y", [0.167, -0.333, 0.167], (X @ w - yv).round(3).tolist())
sig = lambda z: 1 / (1 + exp(-z))
chk(CO, "sigma(-6)", 0.0025, sig(-6)); chk(CO, "loss at z=-6", 6.0025, -log(sig(-6))); chk(CO, "grad", -0.9975, sig(-6) - 1)
chk(CO, "sigma(2)", 0.8808, sig(2)); chk(CO, "loss z=2", 0.1269, -log(sig(2))); chk(CO, "grad z=2", -0.1192, sig(2) - 1)
z = np.array([2, 1, 0.1]); e = np.exp(z); chk(CO, "e^z", [7.389, 2.718, 1.105], e.round(3).tolist()); chk(CO, "sum", 11.212, float(e.sum()))
p = e / e.sum(); chk(CO, "p", [0.659, 0.242, 0.099], p.round(3).tolist()); chk(CO, "loss", 0.417, -log(p[0]))
chk(CO, "grad", [-0.341, 0.242, 0.099], (p - [1, 0, 0]).round(3).tolist())
chk(CO, "logsumexp(1000,1001)", 1001.313, 1001 + log(exp(-1) + 1))
chk(CO, "MSE on sigmoid at z=-6", -0.0049, 2 * (sig(-6) - 1) * sig(-6) * (1 - sig(-6))); chk(CO, "ratio ~200", 200, 0.9975 / 0.0049, tol=10)
zz = 0.5 * 1 - 0.25 * 2 + 0.1; chk(CO, "z", 0.1, zz); chk(CO, "p", 0.525, sig(zz)); chk(CO, "loss", 0.644, -log(sig(zz)))
gz = sig(zz) - 1; chk(CO, "zbar", -0.475, gz); chk(CO, "wbar", [-0.475, -0.950], [round(gz, 3), round(2 * gz, 3)])
chk(CO, "xbar", [-0.2375, 0.1188], [round(gz * 0.5, 4), round(gz * -0.25, 4)])
w2 = np.array([0.5, -0.25]) - 0.1 * gz * np.array([1, 2]); b2 = 0.1 - 0.1 * gz
chk(CO, "w after", [0.5475, -0.155], w2.round(4).tolist()); chk(CO, "b after", 0.1475, b2)
chk(CO, "new logit", 0.385, float(w2 @ [1, 2] + b2)); chk(CO, "new p", 0.595, sig(float(w2 @ [1, 2] + b2)))
# XGBoost
G, Hh = -1.0, 1.0; chk(CO, "w* one leaf", 0.5, -G / (Hh + 1))
gain = 0.5 * (2.25 / 1.75 + 0.25 / 1.25 - 1 / 2); chk(CO, "gain", 0.493, gain)
chk(CO, "wL", 0.857, 1.5 / 1.75); chk(CO, "wR", -0.4, -0.5 / 1.25)
chk(CO, "2/10", 0.2, 0.2); chk(CO, "2/11", 0.182, 2 / 11); chk(CO, "9/11", 0.818, 9 / 11); chk(CO, "steps", 34.4, log(1000) / log(11 / 9))
mom = (sqrt(10) - 1) / (sqrt(10) + 1); chk(CO, "momentum contraction", 0.519, mom); chk(CO, "about 11 steps", 11, math.ceil(log(1000) / -log(mom)))
chk(CO, "Lagrange x=y", 0.707, 1 / sqrt(2)); chk(CO, "f*", 1.414, sqrt(2)); chk(CO, "shadow price", 0.707, 1 / sqrt(2 * 1))
chk(CO, "convexity example", (1, 5), (1 ** 2, 0.5 * (1 + 9)))
# ---------------- Information ----------------
chk(IT, "1 nat in bits", 1.443, 1 / log(2))
chk(IT, "weather H", 1.5, -(0.5 * log2(0.5) + 2 * 0.25 * log2(0.25)))
chk(IT, "coin 0.9", 0.469, -(0.9 * log2(0.9) + 0.1 * log2(0.1))); chk(IT, "-log2 0.9", 0.152, -log2(0.9)); chk(IT, "-log2 0.1", 3.322, -log2(0.1))
P = np.array([0.5, 0.25, 0.25]); Q = np.array([0.25, 0.5, 0.25])
chk(IT, "H(p,q)", 1.75, float(-(P * np.log2(Q)).sum())); chk(IT, "KL(p||q)", 0.25, float((P * np.log2(P / Q)).sum())); chk(IT, "KL(q||p)", 0.25, float((Q * np.log2(Q / P)).sum()))
P2, Q2 = np.array([.5, .5]), np.array([.9, .1])
chk(IT, "KL(fair||0.9)", 0.737, float((P2 * np.log2(P2 / Q2)).sum())); chk(IT, "KL(0.9||fair)", 0.531, float((Q2 * np.log2(Q2 / P2)).sum()))
chk(IT, "-ln 0.7", 0.357, -log(0.7)); chk(IT, "bits", 0.515, -log2(0.7)); chk(IT, "-ln .99", 0.010, -log(0.99)); chk(IT, "-ln .01", 4.61, -log(0.01))
J = np.array([.4, .1, .1, .4]); HJ = float(-(J * np.log2(J)).sum())
chk(IT, "H(X,Y)", 1.722, HJ); chk(IT, "I", 0.278, 2 - HJ); chk(IT, "H(X|Y)", 0.722, HJ - 1)
chk(IT, "I(X;X^2)=H(Y)", 0.918, -(1 / 3 * log2(1 / 3) + 2 / 3 * log2(2 / 3)))
chk(IT, "e^2", 7.39, exp(2)); chk(IT, "e^1.6", 4.95, exp(1.6)); chk(IT, "BPB", 0.721, 2000 / (4000 * log(2)))
chk(IT, "Pile BPB", 0.846, 0.29335 * 2 / log(2))
pp = exp(2) / (exp(2) + 3); chk(IT, "InfoNCE p", 0.711, pp); chk(IT, "loss", 0.341, -log(pp)); chk(IT, "bound", 1.046, log(4) + log(pp)); chk(IT, "bits", 1.51, (log(4) + log(pp)) / log(2))
chk(IT, "ln 4", 1.386, log(4)); chk(IT, "ln 32768", 10.4, log(32768)); chk(IT, "bits", 15, log2(32768))
chk(IT, "2 nats in bits", 2.885, 2 / log(2))

w = max(len(r[1]) for r in rows)
for r in rows: print(f"{r[0]:14s} | {r[1]:{w}s} | {r[2]} | {r[3]} | {r[4]}")
print("DIFF count:", sum(r[4] == "DIFF" for r in rows), "of", len(rows))
