# Extra checks for eos.py: seeds 1 and 2 at eta 0.2 and 0.3; cross-check the power-iteration sharpness with scipy's Lanczos (eigsh) at the end of a run.
import json, math, numpy as np, torch
from scipy.sparse.linalg import LinearOperator, eigsh
import eos
out = {}
for eta in (0.2, 0.3):
    for seed in (1, 2):
        r = eos.run(eta, 6000, 25, seed=seed)
        out[f'{eta}_seed{seed}'] = {'every': 25, 'rec': r['rec']}
# cross-check: train seed 0 at eta 0.2 for 3000 steps, compare power iteration with Lanczos
ps = eos.make(0)
for t in range(3000):
    L = eos.loss_fn(ps); gs = torch.autograd.grad(L, ps)
    with torch.no_grad():
        for p, g in zip(ps, gs): p -= 0.2 * g
lam_pi, _ = eos.sharpness(ps, iters=200)
L = eos.loss_fn(ps); gs = torch.autograd.grad(L, ps, create_graph=True)
sizes = [p.numel() for p in ps]; N = sum(sizes)
def mv(v):
    v = torch.tensor(np.asarray(v).ravel()); parts = list(torch.split(v, sizes)); parts = [a.view_as(p) for a, p in zip(parts, ps)]
    Hv = torch.autograd.grad(gs, ps, grad_outputs=parts, retain_graph=True)
    return torch.cat([h.reshape(-1) for h in Hv]).numpy()
vals = eigsh(LinearOperator((N, N), matvec=mv, dtype=np.float64), k=3, which='LA', return_eigenvectors=False)
out['crosscheck'] = {'params': N, 'power_iteration_200': lam_pi, 'lanczos_top3': sorted(vals.tolist(), reverse=True)}
print(out['crosscheck'])
json.dump(out, open('eos_extra.json', 'w'))
