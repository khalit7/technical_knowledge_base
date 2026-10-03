"""Recompute the toy's advantages from the paper's formulas (Section 3, Section 4.1, Eq. 1) and its gradient by
PyTorch autograd of the clipped surrogate (one update per batch: ratio 1, old policy detached), and compare with the
JS engine's numbers dumped by check_engine.mjs.   uv run --with torch python check_engine.py"""
import json, torch
torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)
C = json.load(open('model/engine_case.json'))
EPS, CLIP = 1e-6, 0.2
worstA = worstG = 0.0
for c in C:
    cfg = c['cfg']; R = torch.tensor([c['Rc'], c['Rl']], dtype=torch.float64)          # (2, B, G)
    w = torch.tensor(cfg.get('w', [1, 1]), dtype=torch.float64)
    z = lambda x: (x - x.mean(-1, keepdim=True)) / (x.std(-1, unbiased=False, keepdim=True) + EPS)
    if cfg.get('only') == 'c':
        A = z(R[0])
    elif cfg['agg'] == 'sum':                                      # GRPO: scalarise, then standardise per group
        A = z((w[:, None, None] * R).sum(0))
    else:                                                          # GDPO / SA-MRPO
        s = R.mean(dim=(1, 2))                                     # saturation, bounds [0, 1]
        wt = w * (1 - s) ** cfg.get('gamma', 0)
        At = (wt[:, None, None] * z(R)).sum(0)
        A = (At - At.mean()) / (At.std(unbiased=False) + EPS)      # Eq. 1
    worstA = max(worstA, (A - torch.tensor(c['A'])).abs().max().item())
    th = torch.tensor(c['P']['th'], requires_grad=True); phi = torch.tensor(c['P']['phi'], requires_grad=True); chi = torch.tensor(c['P']['chi'], requires_grad=True)
    h = torch.tensor(c['h'])
    qs = torch.tensor(c['qs']); acts = torch.tensor(c['acts'])     # (B, G, 2)
    la = torch.log_softmax(th[qs], -1)                             # (B, K)
    lb = torch.log_softmax(phi[None, :] + h[qs][:, None] * chi[None, :], -1)
    lp = la.gather(1, acts[:, :, 0]) + lb.gather(1, acts[:, :, 1])  # (B, G)
    ratio = torch.exp(lp - lp.detach())
    surr = torch.min(ratio * A, torch.clamp(ratio, 1 - CLIP, 1 + CLIP) * A)
    loss = -surr.mean()                                             # (1/B) sum_i (1/G) sum_j, one token per answer
    loss.backward()
    for got, ref in ((th.grad, c['g']['th']), (phi.grad, c['g']['phi']), (chi.grad, c['g']['chi'])):
        worstG = max(worstG, (got - torch.tensor(ref)).abs().max().item())
res = {'cases': len(C), 'max_abs_diff_advantage': worstA, 'max_abs_diff_gradient': worstG,
       'verdict': 'PASS' if worstA < 1e-9 and worstG < 1e-12 else 'FAIL'}
json.dump(res, open('model/check_engine.json', 'w'), indent=1)
print(res)
