"""Check the Training lab's hand-written forward, backward and optimisers against PyTorch (float64).

usage (from src/lab):  node dump_cases.mjs && OMP_NUM_THREADS=2 uv run --with torch python check_grad.py
Reads grad_cases.json and e2e_cases.json (written by dump_cases.mjs from the page's own engine, parts/32_js_lab_a.js)
and writes check_grad_result.json.

1. Gradients: for every activation x normalisation x placement x residual x loss (and dropout with the page's masks),
   the same weights and batch go through a PyTorch model built from torch.nn.functional; loss, logits and every
   parameter gradient are compared.
2. Training steps: for every optimiser, 40 steps with the page's batches, dropout masks and schedule, using
   torch.optim.SGD / Adam / AdamW / Muon; per-step losses, final weights, BatchNorm running statistics and the final
   validation loss are compared. Muon's Newton-Schulz iteration runs in bfloat16 in PyTorch; the page runs it in
   float64, so the check swaps in a float64 copy of PyTorch's own function (and reports how far bfloat16 lands).
"""
import json, math, os, pathlib
import torch
import torch.nn.functional as F
import torch.optim._muon as tmuon

torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)
HERE = pathlib.Path(__file__).parent
T = lambda a, shape=None: torch.tensor(a, dtype=torch.float64).reshape(shape) if shape else torch.tensor(a, dtype=torch.float64)

ACT = {'sigmoid': torch.sigmoid, 'tanh': torch.tanh, 'relu': F.relu,
       'gelu': lambda x: F.gelu(x, approximate='tanh'), 'silu': F.silu}


def build(params):
    return {p['name']: T(p['w'], p['shape']).requires_grad_(True) for p in params}


def forward(cfg, P, X, train, masks=None, step=0, bn=None):
    """Mirror of Net.forward. masks[block][step] is the 0/1 dropout mask the page drew; bn holds running stats."""
    h, d = X, cfg['depth']
    def norm(x, nm):
        t = cfg['norm']
        if t == 'bn':
            rm, rv = bn[nm]
            return F.batch_norm(x, rm, rv, P[nm + '.gain'], P[nm + '.bias'], training=train, momentum=0.1, eps=1e-5)
        if t == 'ln':
            return F.layer_norm(x, (x.shape[1],), P[nm + '.gain'], P[nm + '.bias'], eps=1e-5)
        return F.rms_norm(x, (x.shape[1],), P[nm + '.gain'], eps=1e-6)
    for l in range(1, d + 1):
        first = l == 1
        has_norm = (not first) and cfg['norm'] != 'none'
        resid = (not first) and cfg['resid']
        def Fn(x):
            if cfg['act'] == 'swiglu':
                f = F.silu(F.linear(x, P[f'L{l}.gate.W'], P[f'L{l}.gate.b'])) * F.linear(x, P[f'L{l}.up.W'], P[f'L{l}.up.b'])
            else:
                f = ACT[cfg['act']](F.linear(x, P[f'L{l}.W'], P[f'L{l}.b']))
            if train and cfg['drop'] > 0:
                f = f * T(masks[l - 1][step], f.shape) / (1 - cfg['drop'])
            return f
        if has_norm and cfg['place'] == 'pre':
            f = Fn(norm(h, f'L{l}.norm')); h = h + f if resid else f
        elif has_norm:
            f = Fn(h); h = norm(h + f if resid else f, f'L{l}.norm')
        else:
            f = Fn(h); h = h + f if resid else f
    if cfg['norm'] != 'none' and cfg['place'] == 'pre' and d > 1:
        h = norm(h, 'final.norm')
    return F.linear(h, P['head.W'], P['head.b'])


def loss_fn(kind, z, y):
    if kind == 'ce':
        return F.cross_entropy(z, y)
    if kind == 'ls':
        return F.cross_entropy(z, y, label_smoothing=0.1)
    if kind == 'focal':
        lpt = F.log_softmax(z, 1).gather(1, y[:, None])[:, 0]
        return (-(1 - lpt.exp()) ** 2 * lpt).mean()
    return F.mse_loss(F.softmax(z, 1), F.one_hot(y, z.shape[1]).double())


def bn_state(cfg, P):
    if cfg['norm'] != 'bn':
        return None
    return {k[:-5]: (torch.zeros(v.shape[0]), torch.ones(v.shape[0])) for k, v in P.items() if k.endswith('.gain')}


def rel(a, b):
    a, b = torch.as_tensor(a).flatten(), torch.as_tensor(b).flatten()
    return float((a - b).abs().max() / max(1e-12, float(b.abs().max())))


# ---------------- 1. gradients ----------------
cases = json.loads((HERE / 'grad_cases.json').read_text())
worst = {'loss': 0, 'logits': 0, 'grad': 0}
fails = []
for c in cases:
    cfg = c['cfg']; P = build(c['params'])
    X = T(c['X'], (-1, 2)); y = torch.tensor(c['y'])
    z = forward(cfg, P, X, True, c['masks'], 0, bn_state(cfg, P))
    L = loss_fn(cfg['loss'], z, y); L.backward()
    e = {'loss': abs(L.item() - c['loss']) / max(1e-12, abs(L.item())), 'logits': rel(c['logits'], z.detach()),
         'grad': max(rel(c['grads'][n], P[n].grad) for n in P)}
    for k in e: worst[k] = max(worst[k], e[k])
    if max(e.values()) > 1e-9:
        fails.append({'cfg': cfg, **e})
print(f'gradients: {len(cases)} configurations, worst relative error loss {worst["loss"]:.1e}, logits {worst["logits"]:.1e}, gradients {worst["grad"]:.1e}, failures {len(fails)}')


# ---------------- 2. training steps ----------------
def lr_mult(sched, t, Tn, wf):
    W = math.floor(wf * Tn + 0.5)
    if t < W: return (t + 1) / W
    if sched == 'step': return 0.01 if t >= 0.75 * Tn else 0.1 if t >= 0.5 * Tn else 1
    if sched == 'cosine': return 0.5 * (1 + math.cos(math.pi * (t - W) / max(1, Tn - W)))
    if sched == 'wsd':
        D = math.floor(0.2 * Tn + 0.5)
        return 1 if t < Tn - D else max(0, (Tn - t) / D)
    return 1


def ns_f64(grad, ns_coefficients, ns_steps, eps):
    """PyTorch's _zeropower_via_newtonschulz, line for line, without the cast to bfloat16."""
    a, b, c = ns_coefficients
    o = grad.clone()
    if grad.size(0) > grad.size(1): o = o.T
    o = o / o.norm().clamp(min=eps)
    for _ in range(ns_steps):
        g = o @ o.T
        gu = torch.addmm(g, g, g, beta=b, alpha=c)
        o = torch.addmm(o, gu, o, beta=a)
    if grad.size(0) > grad.size(1): o = o.T
    return o


def make_opt(cfg, P, meta):
    lam, o = cfg['wd'], cfg['opt']
    Ws = [P[m['name']] for m in meta if m['kind'] == 'W']
    rest = [P[m['name']] for m in meta if m['kind'] != 'W']
    if o in ('sgd', 'momentum'):
        mom = 0.9 if o == 'momentum' else 0
        l2 = lam if cfg['wdMode'] == 'l2' else 0
        return [torch.optim.SGD([{'params': Ws, 'weight_decay': l2}, {'params': rest, 'weight_decay': 0}], lr=cfg['lr'], momentum=mom)], cfg['wdMode'] == 'wd'
    if o == 'adam':
        return [torch.optim.Adam([{'params': Ws, 'weight_decay': lam}, {'params': rest, 'weight_decay': 0}], lr=cfg['lr'])], False
    if o == 'adamw':
        return [torch.optim.AdamW([{'params': Ws, 'weight_decay': lam}, {'params': rest, 'weight_decay': 0}], lr=cfg['lr'])], False
    mu = [P[m['name']] for m in meta if m['kind'] == 'W' and m['shape'][0] == m['shape'][1] and 1 < m['layer'] <= cfg['depth']]
    ids = {id(p) for p in mu}
    Wr = [p for p in Ws if id(p) not in ids]
    return [torch.optim.Muon(mu, lr=cfg['lr'], weight_decay=lam, momentum=0.95, nesterov=True, adjust_lr_fn='match_rms_adamw'),
            torch.optim.AdamW([{'params': Wr, 'weight_decay': lam}, {'params': rest, 'weight_decay': 0}], lr=cfg['lr'])], False


def train(case, ns):
    tmuon._zeropower_via_newtonschulz = ns
    cfg = case['cfg']; P = build(case['init']); bn = bn_state(cfg, P)
    X = T(case['X'], (-1, 2)); y = torch.tensor(case['y'])
    opts, manual_wd = make_opt(cfg, P, case['init'])
    losses, lr_err = [], 0
    for t in range(case['steps']):
        lr = cfg['lr'] * lr_mult(cfg['sched'], t, case['steps'], cfg['warm'])
        lr_err = max(lr_err, abs(lr - case['lr'][t]))
        for o in opts:
            for g in o.param_groups: g['lr'] = lr
        idx = torch.tensor(case['idx'][t])
        for o in opts: o.zero_grad()
        z = forward(cfg, P, X[idx], True, case['masks'], t, bn)
        L = loss_fn(cfg['loss'], z, y[idx]); L.backward(); losses.append(float(L))
        if manual_wd:
            with torch.no_grad():
                for m in case['init']:
                    if m['kind'] == 'W': P[m['name']].mul_(1 - lr * cfg['wd'])
        for o in opts: o.step()
    with torch.no_grad():
        zv = forward(cfg, P, T(case['Xva'], (-1, 2)), False, bn=bn)
        vl = float(F.cross_entropy(zv, torch.tensor(case['yva'])))
    return P, bn, losses, vl, lr_err


e2e = json.loads((HERE / 'e2e_cases.json').read_text())
rows = []
orig_ns = tmuon._zeropower_via_newtonschulz
for case in e2e:
    cfg = case['cfg']
    P, bn, losses, vl, lr_err = train(case, ns_f64)
    w_err = max(rel(m['w'], P[m['name']].detach()) for m in case['final'])
    l_err = max(abs(a - b) / max(1e-12, abs(b)) for a, b in zip(case['loss'], losses))
    bn_err = 0
    for s in case['bn']:
        rm, rv = bn[f"L{s['layer']}.norm"]
        bn_err = max(bn_err, rel(s['rm'], rm), rel(s['rv'], rv))
    row = {'opt': cfg['opt'], 'wdMode': cfg['wdMode'], 'wd': cfg['wd'], 'norm': cfg['norm'], 'act': cfg['act'], 'loss': cfg['loss'], 'sched': cfg['sched'], 'drop': cfg['drop'],
           'step_loss_rel_err': l_err, 'final_weight_rel_err': w_err, 'bn_running_rel_err': bn_err, 'val_nll_rel_err': abs(vl - case['valNLL']) / vl, 'lr_abs_err': lr_err}
    if cfg['opt'] == 'muon':
        Pb, _, _, vlb, _ = train(case, orig_ns)
        row['bf16_newton_schulz_weight_rel_diff'] = max(rel(m['w'], Pb[m['name']].detach()) for m in case['final'])
        row['bf16_val_nll'] = vlb; row['f64_val_nll'] = vl
    rows.append(row)
    print(f"{cfg['opt']:8s} wd={cfg['wdMode']}:{cfg['wd']:<5} norm={cfg['norm']:4s} {cfg['act']:6s} {cfg['loss']:5s} {cfg['sched']:8s} drop={cfg['drop']}: "
          f"step losses {l_err:.1e}, final weights {w_err:.1e}, BN stats {bn_err:.1e}, val NLL {row['val_nll_rel_err']:.1e}"
          + (f"; bf16 Newton-Schulz would move weights by {row['bf16_newton_schulz_weight_rel_diff']:.1e}" if 'bf16_newton_schulz_weight_rel_diff' in row else ''))
tmuon._zeropower_via_newtonschulz = orig_ns

ok = not fails and all(r['final_weight_rel_err'] < 1e-8 and r['step_loss_rel_err'] < 1e-8 for r in rows)
out = {'torch': torch.__version__, 'gradient_cases': len(cases), 'gradient_worst': worst, 'gradient_failures': fails, 'training': rows, 'pass': ok}
(HERE / 'check_grad_result.json').write_text(json.dumps(out, indent=1))
print('PASS' if ok else 'FAIL')
