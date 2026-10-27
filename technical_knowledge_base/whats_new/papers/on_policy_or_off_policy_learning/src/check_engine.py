"""Check the page's JS engine against PyTorch autograd: losses, batch gradients, exact expected semi-gradients and
the rollout-spectrum policy pi_lambda, for both students (shared-parameter network and direct logits).
usage: node src/check_engine.mjs && uv run --no-project --with torch --with numpy python src/check_engine.py
Writes model/check_engine.json (shown on the page)."""
import json, math, os
import torch
torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'model', 'engine_case.json')))
W = D['world']; P, K, A, H = 12, 5, 5, 6; NIN = P + K + 1
zT1, zT2 = torch.tensor(W['zT1']), torch.tensor(W['zT2'])
lT1, lT2 = torch.log_softmax(zT1 / W['tT'], -1), torch.log_softmax(zT2 / W['tT'], -1)


def logits(model, th, p, k):
    if model == 'table':
        return th[p * K:p * K + K] if k < 0 else th[P * K + (p * K + k) * A:P * K + (p * K + k) * A + A]
    o = 0; W1 = th[o:o + H * NIN].view(H, NIN); o += H * NIN; b1 = th[o:o + H]; o += H
    Wr = th[o:o + K * H].view(K, H); o += K * H; br = th[o:o + K]; o += K; Wa = th[o:o + A * H].view(A, H); o += A * H; ba = th[o:o + A]
    x = torch.zeros(NIN); x[p] = 1; x[P + (K if k < 0 else k)] = 1
    h = torch.tanh(W1 @ x + b1)
    return Wr @ h + br if k < 0 else Wa @ h + ba


def kl(kind, lS, lT):
    return (lT.exp() * (lT - lS)).sum() if kind == 'f' else (lS.exp() * (lS - lT)).sum()


def lam_probs(lS, lT, lam, alpha=0.2, c=2 * math.log(3)):
    if abs(lam) <= 1: z = (1 + lam) / 2 * lS + (1 - lam) / 2 * lT
    elif lam > 1:
        r = lS - lT; m = (lS >= lS.max() + math.log(alpha)).double(); z = lS + (lam - 1) / 2 * m * r.clamp(min=0).clamp(max=c)
    else:
        r = lS - lT; m = (lT >= lT.max() + math.log(alpha)).double(); z = lT + (-lam - 1) / 2 * m * (-r).clamp(min=0).clamp(max=c)
    return torch.softmax(z, -1)


res = {'cases': []}
worst = 0
for c in D['cases']:
    M = c['model']; th = torch.tensor(c['theta'], requires_grad=True); rec = {'model': M, 'n_params': len(c['theta'])}
    for kind in ('f', 'r'):
        loss = 0
        for p, k in c['batch']:
            loss = loss + (kl(kind, torch.log_softmax(logits(M, th, p, -1), -1), lT1[p]) + kl(kind, torch.log_softmax(logits(M, th, p, k), -1), lT2[p, k])) / 2 / len(c['batch'])
        g, = torch.autograd.grad(loss, th)
        rec['loss_' + kind] = abs(loss.item() - c['lg'][kind]['loss'])
        rec['grad_' + kind] = (g - torch.tensor(c['lg'][kind]['g'])).abs().max().item()
        e = 0
        for lam, gj in c['eg'][kind].items():
            lam = float(lam); tot = 0
            for p in range(P):
                l1 = torch.log_softmax(logits(M, th, p, -1), -1)
                pr = lam_probs(l1.detach(), lT1[p], lam)          # stop-gradient through the rollout policy (Eq. 19)
                tot = tot + kl(kind, l1, lT1[p]) / 2 / P
                for k in range(K): tot = tot + pr[k] * kl(kind, torch.log_softmax(logits(M, th, p, k), -1), lT2[p, k]) / 2 / P
            ge, = torch.autograd.grad(tot, th)
            e = max(e, (ge - torch.tensor(gj)).abs().max().item())
        rec['expected_grad_' + kind] = e
    e = 0
    with torch.no_grad():
        for lam, rows in c['lam'].items():
            for p in range(P):
                e = max(e, (lam_probs(torch.log_softmax(logits(M, th, p, -1), -1), lT1[p], float(lam)) - torch.tensor(rows[p])).abs().max().item())
    rec['pi_lambda'] = e
    worst = max(worst, *[v for k2, v in rec.items() if k2 not in ('model', 'n_params')])
    res['cases'].append(rec)
res['max_abs_diff'] = worst
res['pass'] = worst < 1e-9
res['torch'] = torch.__version__
json.dump(res, open(os.path.join(HERE, 'model', 'check_engine.json'), 'w'), indent=1)
print(json.dumps(res, indent=1))
