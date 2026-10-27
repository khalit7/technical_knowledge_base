"""Check the page's JS engine (parts/22_js_dpo.js) against PyTorch autograd, independently.
usage (from src/): node check_engine.mjs && uv run --with torch python check_engine.py
Recomputes, from the dumped inputs only: every pair loss and its gradient with respect to the 444 logits
(DPO at two betas, IPO, conservative DPO, hinge, SimPO, unlikelihood, Preferred-FT), the reward-model loss
gradient (Eq. 2), a PPO clipped-surrogate gradient, and the exact evaluation over all 20,736 sequences
(expected true reward, KL to the reference, and the Eq. 4 optimum for three betas). Writes model/check_engine.json."""
import json, itertools, torch
torch.set_num_threads(2); torch.set_default_dtype(torch.float64)
J = json.load(open('model/check_in.json')); V, L, NP = J['V'], J['L'], J['NP']
def row(t, prev): return 0 if t == 0 else V + (t - 1) * V * V + prev * V
rows = [0] + [row(t, p) for t in range(1, L) for p in range(V)]
def logsm(th):
    out = torch.empty_like(th)
    for o in rows: out[o:o + V] = torch.log_softmax(th[o:o + V], 0)
    return out
seqs = list(itertools.product(range(V), repeat=L))
def idx_of(id_):
    w = [id_ // V ** 3, (id_ // V ** 2) % V, (id_ // V) % V, id_ % V]; prev = 0; ix = []
    for t in range(L): ix.append(row(t, prev) + w[t]); prev = w[t]
    return ix
def logp(lp, id_): return lp[idx_of(id_)].sum()
lref = torch.tensor(J['lref']); res = {}; worst = 0
for k, c in J['cases'].items():
    th = torch.tensor(J['theta'], requires_grad=True); lp = logsm(th); o = c['o']; tot = 0
    for a, b in J['pairs']:
        lw, ll = logp(lp, a), logp(lp, b)
        if o['method'] == 'sft': tot = tot - lw
        elif o['method'] == 'unlikelihood': tot = tot - lw + o['alpha'] * ll
        elif o.get('loss') == 'simpo':
            tot = tot - torch.nn.functional.logsigmoid(o['beta'] * (lw - ll) / L - o['gamma'])
        else:
            h = (lw - logp(lref, a)) - (ll - logp(lref, b)); b_ = o['beta']; kind = o.get('loss', 'dpo')
            if kind == 'dpo': tot = tot - torch.nn.functional.logsigmoid(b_ * h)
            elif kind == 'ipo': tot = tot + (h - 1 / (2 * b_)) ** 2
            elif kind == 'cdpo': e = o['eps']; tot = tot - (1 - e) * torch.nn.functional.logsigmoid(b_ * h) - e * torch.nn.functional.logsigmoid(-b_ * h)
            elif kind == 'hinge': tot = tot + torch.clamp(1 - b_ * h, min=0)
    loss = tot / len(J['pairs']); loss.backward()
    dg = (th.grad - torch.tensor(c['grad'])).abs().max().item(); dl = abs(loss.item() - c['loss'])
    res[k] = {'loss_torch': loss.item(), 'loss_js': c['loss'], 'max_grad_diff': dg, 'loss_diff': dl, 'grad_norm': th.grad.norm().item()}
    worst = max(worst, dg, dl)
# reward model
phi = torch.tensor(J['rm']['phi'], requires_grad=True)
def sc(id_): return phi[idx_of(id_)].sum()
loss = sum(-torch.nn.functional.logsigmoid(sc(a) - sc(b)) for a, b in J['pairs']) / len(J['pairs']); loss.backward()
res['reward_model'] = {'loss_diff': abs(loss.item() - J['rm']['loss']), 'max_grad_diff': (phi.grad - torch.tensor(J['rm']['grad'])).abs().max().item()}
worst = max(worst, res['reward_model']['loss_diff'], res['reward_model']['max_grad_diff'])
# PPO surrogate
th = torch.tensor(J['theta'], requires_grad=True); lp = logsm(th); P = J['ppo']; tot = 0
for y, A, lo in zip(P['ys'], P['A'], P['lo']):
    rho = torch.exp(logp(lp, y) - lo); tot = tot - torch.min(rho * A, torch.clamp(rho, 0.8, 1.2) * A)
(tot / len(P['ys'])).backward()
res['ppo'] = {'max_grad_diff': (th.grad - torch.tensor(P['grad'])).abs().max().item()}; worst = max(worst, res['ppo']['max_grad_diff'])
# exact evaluation by enumeration, vectorised
th = torch.tensor(J['theta']); lp = logsm(th)
IX = torch.tensor([idx_of(i) for i in range(V ** L)])
lpi = lp[IX].sum(1); lr = lref[IX].sum(1); rs = torch.tensor(J['rstar']); p = lpi.exp()
res['eval'] = {'reward_diff': abs((p * rs).sum().item() - J['eval']['reward']), 'kl_diff': abs((p * (lpi - lr)).sum().item() - J['eval']['kl'])}
for o in J['optimal']:
    q = torch.softmax(lr + rs / o['beta'], 0)
    res['optimal_beta_%g' % o['beta']] = {'reward_diff': abs((q * rs).sum().item() - o['reward']), 'kl_diff': abs((q * (q.log() - lr)).sum().item() - o['kl'])}
for k in ('eval',) + tuple(x for x in res if x.startswith('optimal')): worst = max(worst, *res[k].values())
res['worst'] = worst; res['verdict'] = 'PASS' if worst < 1e-9 else 'FAIL'
json.dump(res, open('model/check_engine.json', 'w'), indent=1)
for k, v in res.items(): print(k, v)
