"""Replay model/engine_trace.json (written by check_engine.mjs from the page's JS engine) in PyTorch float64.
Writes model/check_engine.json. usage: uv run --with torch --with numpy python check_engine.py"""
import json, math, os, sys
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train as T
torch.set_num_threads(2)
d = json.load(open('model/engine_trace.json'))
base = {k: torch.tensor(np.array(v).reshape(T.SHAPES[k]), dtype=torch.float64) for k, v in d['base'].items()}
q = T.load(os.path.join(T.MD, 'base_q.pt'))
res = {'base_matches_base_q_pt': max(float((base[k] - q[k].double()).abs().max()) for k in T.NAMES)}
# 1. forward
X = torch.tensor(np.array(d['fwd']['X']).reshape(-1, T.NT))
lora = {k: (torch.tensor(np.array(v['A']).reshape(v['r'], -1)), torch.tensor(np.array(v['B']).reshape(-1, v['r'])), v['s']) for k, v in d['fwd']['lora'].items()}
lg = T.forward(base, X, lora).numpy(); js = np.array(d['fwd']['logits'])
res['forward_max_logit_diff'] = float(np.abs(lg - js).max()); res['forward_same_argmax'] = int((lg.argmax(1) == js.argmax(1)).sum()); res['forward_n'] = len(js)
res['js_merged_vs_unmerged_max_diff'] = d['mergeMaxDiff']
# teachers: the JS copies (24-bit) against the PyTorch teachers used by the sweep
TT = torch.load(os.path.join(T.MD, 'teachers.pt'))
res['teacher_max_diff'] = max(max(float(np.abs(np.array(v['A']) - TT[t]['A'].double().numpy().ravel()).max()), float(np.abs(np.array(v['B']) - TT[t]['B'].double().numpy().ravel()).max())) for t, v in d['teachers'].items())
TL = {t: {v['k']: (torch.tensor(np.array(v['A']).reshape(v['r'], -1)), torch.tensor(np.array(v['B']).reshape(-1, v['r'])), 1.0)} for t, v in d['teachers'].items()}
# the JS labels of the forward set against PyTorch's teacher argmax
with torch.no_grad():
    yt = T.forward(base, X, TL['v4']).argmax(-1).numpy()
res['teacher_labels_same'] = int((yt == np.array(d['fwd']['y'])).sum())
res_p = []
# 2. training
res['traces'] = []
for tr in d['traces']:
    o = tr['o']; steps = o['steps']
    if o['method'] == 'ft':
        P = {k: v.clone().requires_grad_(True) for k, v in base.items()}; params = list(P.values()); L = None
    else:
        P = base; L = {}; params = []
        s = o['alpha'] / o['r'] if o['scaling'] == 'r' else o['alpha'] / math.sqrt(o['r'])
        for k in o['targets']:
            dout, din = T.SHAPES[k]
            A = torch.tensor(np.array(tr['init'][k]).reshape(o['r'], din), dtype=torch.float64, requires_grad=True)
            B = torch.zeros(dout, o['r'], dtype=torch.float64, requires_grad=True)
            L[k] = (A, B, s); params += [A, B]
    opt = torch.optim.Adam(params, lr=o['lr'])
    losses = []
    for st in range(steps):
        for g in opt.param_groups:
            g['lr'] = T.lr_at(st, steps, o['lr'], 50)
        b = tr['batches'][st]
        Xb = torch.tensor(np.array(b['X']).reshape(-1, T.NT))
        with torch.no_grad():
            pt = torch.softmax(T.forward(base, Xb, TL[o['task']]), -1)
        res_p.append(float(np.abs(pt.numpy().ravel() - np.array(b['p'])).max()))
        loss = -(pt * torch.log_softmax(T.forward(P, Xb, L), -1)).sum(-1).mean()
        opt.zero_grad(); loss.backward(); opt.step(); losses.append(loss.item())
    wd = 0.0
    if L:
        for k, (A, B, s) in L.items():
            wd = max(wd, float(np.abs(A.detach().numpy().ravel() - np.array(tr['fin'][k]['A'])).max()), float(np.abs(B.detach().numpy().ravel() - np.array(tr['fin'][k]['B'])).max()))
    else:
        for k in tr['fin']:
            wd = max(wd, float(np.abs(P[k].detach().numpy().ravel() - np.array(tr['fin'][k])).max()))
    res['traces'].append({'config': {k: o.get(k) for k in ('method', 'task', 'targets', 'r', 'scaling', 'lr', 'steps', 'batch')},
                          'max_loss_diff': float(np.abs(np.array(losses) - np.array(tr['losses'])).max()), 'max_weight_diff': wd,
                          'first_loss': losses[0], 'last_loss': losses[-1]})
# 3. svd
M = np.array(d['svd']['M']).reshape(8, 32)
res['teacher_prob_max_diff'] = max(res_p)
res['svd_max_singular_value_diff'] = float(np.abs(np.linalg.svd(M, compute_uv=False) - np.array(d['svd']['S'])).max())
ok = res['forward_max_logit_diff'] < 1e-9 and all(t['max_loss_diff'] < 1e-9 and t['max_weight_diff'] < 1e-8 for t in res['traces']) and res['svd_max_singular_value_diff'] < 1e-9
res['verdict'] = 'PASS' if ok else 'FAIL'
json.dump(res, open('model/check_engine.json', 'w'), indent=1)
print(json.dumps(res, indent=1))
