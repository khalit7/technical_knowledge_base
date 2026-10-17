"""The Vision lab's linear probe (root folder src/vision/zeroshot.py, probe with standardise=True), copied verbatim
so every probe on this page uses the same settings: multinomial logistic regression, full-batch gradient descent,
features centred and divided by their std, lr 0.5, L2 1e-3, 1000 steps; fixed, not tuned."""
import numpy as np


def probe(X, y, Xt, yt, lam=1e-3, steps=1000, lr=0.5):
    Xm = X.mean(0); X = X - Xm; Xt = Xt - Xm
    s = X.std(); X = X / s; Xt = Xt / s
    W = np.zeros((X.shape[1], 10)); b = np.zeros(10); Y = np.eye(10)[y]
    for _ in range(steps):
        z = X @ W + b; z -= z.max(1, keepdims=True); p = np.exp(z); p /= p.sum(1, keepdims=True)
        gW = X.T @ (p - Y) / len(y) + lam * W; gb = (p - Y).mean(0)
        W -= lr * gW; b -= lr * gb
    return float(((Xt @ W + b).argmax(1) == yt).mean())
