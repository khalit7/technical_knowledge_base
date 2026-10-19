"""Why mHC constrains the stream-mixing matrix (illustrative calculation, numpy, CPU, under a second).

With hyper-connections the stream after L sub-layers carries the product of L learned n x n mixing matrices
(n = 4 streams). Unconstrained matrices near the identity, I + noise, compose into a product whose gain drifts away
from 1; matrices projected onto doubly stochastic matrices (rows and columns sum to 1, Sinkhorn-Knopp, 20 iterations,
as DeepSeek-V4's hc_sinkhorn_iters) compose into another doubly stochastic matrix, whose gain is exactly 1.
Gain = the largest absolute row sum of the product (forward) and the largest absolute column sum (backward).
Random matrices, not trained ones: an illustration of the mechanism, not a reproduction of the paper's 3,000.
  hc_toy.py  ->  ../out/hc_toy.json
"""
import json, os
import numpy as np

n, L, seeds = 4, 120, 20      # 4 streams; 60 blocks x 2 sub-layers (DeepSeek-V4-Pro has 61 layers)


def sinkhorn(m, iters=20):
    m = np.exp(m)                                  # positive, like the softmax in modeling_deepseek_v4.py
    for _ in range(iters):
        m = m / m.sum(0, keepdims=True); m = m / m.sum(1, keepdims=True)
    return m


res = {"n": n, "sub_layers": L, "seeds": seeds, "rows": []}
for sigma in (0.05, 0.1, 0.2, 0.3):
    fw_u, bw_u, fw_c, bw_c = [], [], [], []
    for s in range(seeds):
        rng = np.random.default_rng(s)
        Pu, Pc = np.eye(n), np.eye(n)
        for _ in range(L):
            noise = rng.normal(0, sigma, (n, n))
            Pu = (np.eye(n) + noise) @ Pu
            Pc = sinkhorn(np.eye(n) * 3 + noise) @ Pc       # logits favouring the identity, then projected
        fw_u.append(np.abs(Pu).sum(1).max()); bw_u.append(np.abs(Pu).sum(0).max())
        fw_c.append(np.abs(Pc).sum(1).max()); bw_c.append(np.abs(Pc).sum(0).max())
    row = {"sigma": sigma, "unconstrained_fw_median": float(np.median(fw_u)), "unconstrained_fw_max": float(np.max(fw_u)),
           "unconstrained_bw_median": float(np.median(bw_u)),
           "doubly_stochastic_fw_max": float(np.max(fw_c)), "doubly_stochastic_bw_max": float(np.max(bw_c))}
    res["rows"].append(row); print(row)
json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "hc_toy.json"), "w"), indent=1)
