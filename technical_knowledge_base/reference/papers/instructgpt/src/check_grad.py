"""Recompute every gradient of the toy with PyTorch autograd and compare with the page's JS (model/case.json).
  node dump_case.cjs && uv run --with torch python check_grad.py      (writes model/check_grad.json)"""
import json, os, torch
torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)
HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'model', 'case.json')))
V, H, CTX = C['V'], C['H'], C['CTX']

def params(p):
    return {k: torch.tensor(p[k], requires_grad=True) for k in ('E', 'b1', 'U', 'b2')}

def logp(P, c, y):
    E = P['E'].view(CTX, V, H)
    h = P['b1'] + sum(E[j, c[CTX - 1 - j]] for j in range(CTX))   # block j holds token t-1-j
    z = torch.tanh(h) @ P['U'].view(H, V) + P['b2']
    return torch.log_softmax(z, 0)[y]

def cmp(name, js, P):
    worst = 0.0
    for k in ('E', 'b1', 'U', 'b2'):
        d = (torch.tensor(js[k]) - P[k].grad).abs().max().item(); worst = max(worst, d)
    return worst

res = {}
# 1. language model
P = params(C['params'])
ll = sum(logp(P, w['c'], w['y']) for w in C['lm']['W']) / len(C['lm']['W']); ll.backward()
res['lm'] = {'value_diff': abs(ll.item() - C['lm']['ll']), 'grad_max_diff': cmp('lm', C['lm']['g'], P)}
# 2. reward model, Eq. 1 with all C(K,2) pairs of a prompt in one batch element (ascent on -loss)
w = torch.tensor(C['rm']['w'], requires_grad=True); b = torch.tensor(C['rm']['b'])
L = 0
for e in C['rm']['els']:
    r = torch.stack([b + w @ torch.tensor(f, dtype=torch.float64) for f in e["f"]])
    if e['pairs']: L = L + sum(-torch.nn.functional.logsigmoid(r[a] - r[l]) for a, l in e['pairs']) / len(e['pairs'])
(-L).backward()
res['rm'] = {'value_diff': abs(L.item() - C['rm']['loss']), 'grad_max_diff': (torch.tensor(C['rm']['g']) - w.grad).abs().max().item()}
# 3. PPO-ptx minibatch: clipped surrogate per token, mean over tokens, plus gamma * mean pretraining log-likelihood
Q = C['ppo']; P = params(Q['params'])
ntok = sum(len(e['y']) for e in Q['eps']); obj = 0
for e in Q['eps']:
    for i, y in enumerate(e['y']):
        c = e['seq'][e['n0'] + i - CTX:e['n0'] + i]
        ratio = torch.exp(logp(P, c, y) - e['lps'][i]); A = e['A'][i]
        obj = obj + torch.min(ratio * A, torch.clamp(ratio, 0.8, 1.2) * A) / ntok
obj = obj + Q['gam'] * sum(logp(P, x['c'], x['y']) for x in Q['P']) / len(Q['P'])
obj.backward()
res['ppo_ptx'] = {'value_diff': abs(obj.item() - Q['obj']), 'grad_max_diff': cmp('ppo', Q['g'], P), 'tokens': ntok, 'tokens_clipped': Q['nclip']}
ok = all(v['value_diff'] < 1e-9 and v['grad_max_diff'] < 1e-9 for v in res.values())
res['verdict'] = 'PASS' if ok else 'FAIL'
json.dump(res, open(os.path.join(HERE, 'model', 'check_grad.json'), 'w'), indent=1)
print(json.dumps(res, indent=1))
