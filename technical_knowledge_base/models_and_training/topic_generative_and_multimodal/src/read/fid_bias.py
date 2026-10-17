import numpy as np
from scipy import linalg

def fid(a, b):  # the Frechet distance FID uses, on any features
    m1, m2 = a.mean(0), b.mean(0)
    s1, s2 = np.cov(a, rowvar=False), np.cov(b, rowvar=False)
    covmean = linalg.sqrtm(s1 @ s2).real
    return float(((m1 - m2) ** 2).sum() + np.trace(s1 + s2 - 2 * covmean))

d = 64                                   # Inception features have 2,048 dimensions; 64 keeps this fast
rng = np.random.default_rng(0)
A = rng.normal(size=(d, d)) / np.sqrt(d)
cov = A @ A.T + 0.1 * np.eye(d)          # one fixed "true" feature distribution
L = np.linalg.cholesky(cov)
draw = lambda n: rng.normal(size=(n, d)) @ L.T

for n in [500, 2000, 10000, 50000]:
    scores = [fid(draw(n), draw(n)) for _ in range(3)]
    print(f"n = {n:>6}: FID between two samples of the SAME distribution = {np.mean(scores):.4f} (3 draws: {', '.join(f'{s:.4f}' for s in scores)})")
