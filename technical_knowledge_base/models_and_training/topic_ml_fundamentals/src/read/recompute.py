"""Independent recomputation of every number the Reading tab's engine (parts/22_js_rd_engine.js) produces.

Run: uv run --with torch --with numpy python src/read/recompute.py   (writes src/read/expected.json)
Then: node src/read/check_engine.mjs   (runs the page's engine in Node and compares)

The network forward and backward pass is done by PyTorch autograd in float64, so the page's hand-written backward
pass is checked against an independent implementation, not against a copy of itself. Seeded inputs come from the
same mulberry32 generator and Box-Muller draws as the page, reproduced bit for bit below.
"""
import json, math, os
import numpy as np
import torch

torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)
HERE = os.path.dirname(os.path.abspath(__file__))
U32 = 0xFFFFFFFF


def rng(seed):
    a = seed & U32
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & U32
        t = ((a ^ (a >> 15)) * (1 | a)) & U32
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & U32)) & U32) ^ t
        return ((t ^ (t >> 14)) & U32) / 4294967296
    return nxt


def gauss(r):
    u1 = 1 - r(); u2 = r()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def fill(r, n, s):
    return [gauss(r) * s for _ in range(n)]


B, D, K, L, F, HB = 32, 64, 10, 16, 176, 256
EPS_BN, EPS_RMS = 1e-5, 1e-6
MODES = ['sig', 'small', 'he', 'bn', 'pre']
INIT = {'sig': math.sqrt(2 / (D + D)), 'small': math.sqrt(1 / D), 'he': math.sqrt(2 / D), 'bn': math.sqrt(2 / D), 'pre': math.sqrt(1 / D)}


def T(lst, r, c):
    return torch.tensor(lst).reshape(r, c)


r = rng(20261003)
X = T(fill(r, B * D, 1), B, D)
XH = T(fill(r, HB * D, 1), HB, D)
TE = T(fill(r, K * D, 1), K, D)
y = (X @ TE.T).argmax(1)
yh = (XH @ TE.T).argmax(1)


def weights(mi):
    md = MODES[mi]; r = rng(1000 + mi); W = []
    for _ in range(L):
        if md == 'pre':
            W.append({'W1': T(fill(r, D * F, math.sqrt(1 / D)), D, F), 'W3': T(fill(r, D * F, math.sqrt(1 / D)), D, F),
                      'W2': T(fill(r, F * D, math.sqrt(1 / F) / math.sqrt(L)), F, D)})
        else:
            W.append({'W': T(fill(r, D * D, INIT[md]), D, D)})
    Wo = T(fill(r, D * K, math.sqrt(1 / D)), D, K)
    for o in W:
        for k in o: o[k].requires_grad_(True)
    Wo.requires_grad_(True)
    return W, Wo


def rms(h):
    return h / torch.sqrt((h * h).mean(1, keepdim=True) + EPS_RMS)


def forward(md, W, Wo, Xb, yb):
    h = Xb; acts = []
    for l in range(L):
        w = W[l]
        if md == 'pre':
            u = rms(h); a = u @ w['W1']; b = u @ w['W3']
            h = h + (torch.nn.functional.silu(a) * b) @ w['W2']
        else:
            z = h @ w['W']
            if md == 'sig': h = torch.sigmoid(z)
            elif md == 'bn':
                m = z.mean(0, keepdim=True); v = ((z - m) ** 2).mean(0, keepdim=True)
                h = torch.relu(h + (z - m) / torch.sqrt(v + EPS_BN))
            else: h = torch.relu(z)
        acts.append(h.detach().std(unbiased=False).item())
    hf = rms(h) if md == 'pre' else h
    logits = hf @ Wo
    loss = torch.nn.functional.cross_entropy(logits, yb)
    acc = (logits.argmax(1) == yb).double().mean().item()
    return loss, acc, acts


out = {'stats': [], 'step': {}}
for mi, md in enumerate(MODES):
    W, Wo = weights(mi)
    loss, acc, acts = forward(md, W, Wo, X, y)
    loss.backward()
    grads = [math.sqrt(sum((o[k].grad ** 2).sum().item() for k in o)) for o in W]
    out['stats'].append({'mode': md, 'acts': acts, 'grads': grads, 'loss': loss.item(), 'head': Wo.grad.norm().item()})

# one training step under the two recipes
REC = {'classic': dict(mode=3, opt='sgd', lr=0.1, mom=0.9, wd=1e-4, clip=0),
       'modern': dict(mode=4, opt='adamw', lr=3e-3, b1=0.9, b2=0.95, eps=1e-8, wd=0.1, clip=1.0)}
for name, R in REC.items():
    md = MODES[R['mode']]; W, Wo = weights(R['mode'])
    params = [o[k] for o in W for k in sorted(o)] + [Wo]
    loss0, acc0, acts0 = forward(md, W, Wo, X, y)
    with torch.no_grad():
        hl0, ha0, _ = forward(md, W, Wo, XH, yh)
    loss0.backward()
    gn = math.sqrt(sum((p.grad ** 2).sum().item() for p in params))
    pn = math.sqrt(sum((p.detach() ** 2).sum().item() for p in params))
    first = math.sqrt(sum((W[0][k].grad ** 2).sum().item() for k in W[0]))
    last = math.sqrt(sum((W[-1][k].grad ** 2).sum().item() for k in W[-1]))
    # the optimiser step, by torch.optim itself
    if R['clip']:
        torch.nn.utils.clip_grad_norm_(params, R['clip'])
    before = [p.detach().clone() for p in params]
    if R['opt'] == 'sgd':
        opt = torch.optim.SGD(params, lr=R['lr'], momentum=R['mom'], weight_decay=R['wd'])
    else:
        opt = torch.optim.AdamW(params, lr=R['lr'], betas=(R['b1'], R['b2']), eps=R['eps'], weight_decay=R['wd'])
    opt.step()
    un = math.sqrt(sum(((p.detach() - b) ** 2).sum().item() for p, b in zip(params, before)))
    wdn = math.sqrt(sum(((R['lr'] * R['wd'] * b) ** 2).sum().item() for b in before))
    with torch.no_grad():
        loss1, acc1, _ = forward(md, W, Wo, X, y)
        hl1, ha1, _ = forward(md, W, Wo, XH, yh)
    out['step'][name] = dict(loss0=loss0.item(), loss1=loss1.item(), acc0=acc0, acc1=acc1, hl0=hl0.item(), hl1=hl1.item(), ha0=ha0, ha1=ha1,
                             gnorm=gn, pnorm=pn, unorm=un, wdnorm=wdn, act=acts0[-1], first=first, last=last,
                             nparams=sum(p.numel() for p in params))

# update geometry: layer 8's W1 gradient in the pre-norm SwiGLU network
W, Wo = weights(4)
loss, _, _ = forward('pre', W, Wo, X, y); loss.backward()
G = W[7]['W1'].grad.numpy().copy()
sv = lambda M: np.linalg.svd(M, compute_uv=False)
unitn = lambda s: s / np.sqrt((s ** 2).sum())
NS = (3.4445, -4.7750, 2.0315)
Xn = G / (np.linalg.norm(G) + 1e-7); iters = [sv(Xn).tolist()]
for _ in range(5):
    A = Xn @ Xn.T; Bm = NS[1] * A + NS[2] * (A @ A); Xn = NS[0] * Xn + Bm @ Xn; iters.append(sv(Xn).tolist())
S = G / (np.abs(G) + 1e-8); Uu, ss, _ = np.linalg.svd(G); rank = int((ss > 1e-9 * ss[0]).sum()); Qb = Uu[:, :rank]
adam_out = 1 - (np.linalg.norm(Qb.T @ S) ** 2) / (np.linalg.norm(S) ** 2)
out['geometry'] = dict(rank=rank, adamOut=adam_out, sgd=unitn(sv(G)).tolist(), adam=unitn(sv(G / (np.abs(G) + 1e-8))).tolist(), muon=unitn(np.array(iters[5])).tolist(), iters=iters)

# learning-rate schedules at a few points
def sched(name, t, c=None):
    if name == 'step': return 1 if t < 1 / 3 else (0.1 if t < 2 / 3 else 0.01)
    if name == 'isqrt': w = 0.04; return 0 if t <= 0 else min(t / w, math.sqrt(w / t))
    if name == 'cosine':
        w = 0.02
        if t < w: return t / w
        q = (t - w) / (1 - w); return 0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * q))
    if name == 'wsd':
        w = 0.02; E = 1 if c is None else c; s = 0.8 * E
        if t < w: return t / w
        if t < s: return 1
        return 1 - math.sqrt(min(1, (t - s) / (E - s)))
TS = [0, 0.01, 0.02, 0.04, 0.1, 0.3, 0.5, 0.7, 0.85, 0.9, 1.0]
out['sched'] = {n: [sched(n, t) for t in TS] for n in ['step', 'isqrt', 'cosine', 'wsd']}
out['sched']['ts'] = TS

# Adam with L2 in the loss against AdamW, six parameters with different gradient noise
SIG = [1e-4, 1e-3, 1e-2, 1e-1, 1, 10]
N, lr, lam, b1, b2, eps = 3000, 1e-3, 0.1, 0.9, 0.999, 1e-8
r = rng(77)
xis = [[gauss(r) * s for s in SIG] for _ in range(N)]
res = {}
for kind in ['l2', 'adamw']:
    w = torch.ones(len(SIG), requires_grad=True)
    opt = torch.optim.Adam([w], lr=lr, betas=(b1, b2), eps=eps) if kind == 'l2' else torch.optim.AdamW([w], lr=lr, betas=(b1, b2), eps=eps, weight_decay=lam)
    frames = [[1.0] * len(SIG)]
    for t in range(N):
        opt.zero_grad()
        xi = torch.tensor(xis[t])
        w.grad = xi + (lam * w.detach() if kind == 'l2' else 0)
        opt.step()
        if (t + 1) % 100 == 0: frames.append(w.detach().tolist())
    res[kind] = frames
out['wd'] = res

# BPTT: scalar tanh RNN and LSTM cell path
r = rng(424242); XS = [0.5 * gauss(r) for _ in range(60)]
def bptt(w, bf):
    a = 0; fac = []; ff = []
    for t in range(60):
        a = math.tanh(w * a + XS[t]); fac.append(math.log10(abs(w * (1 - a * a)))); ff.append(math.log10(1 / (1 + math.exp(-(bf + XS[t])))))
    rn = [0]; ls = [0]
    for k in range(1, 61): rn.append(rn[-1] + fac[60 - k]); ls.append(ls[-1] + ff[60 - k])
    return dict(rnn=rn, lstm=ls)
out['bptt'] = {f'{w}_{bf}': bptt(w, bf) for w, bf in [(1.0, 1.0), (2.5, 3.0), (0.6, 0.0), (1.4, 5.0)]}

# ROC and PR under the binormal model
Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))
def curves(dp, prev):
    au = 0; lastR = 0
    for i in range(401):
        th = 8 - i * (16 / 400); tpr = 1 - Phi(th - dp); fpr = 1 - Phi(th)
        den = tpr * prev + fpr * (1 - prev); prec = tpr * prev / den if den > 0 else 1
        au += (tpr - lastR) * prec; lastR = tpr
    return dict(auc=Phi(dp / math.sqrt(2)), auprc=au)
out['roc'] = {f'{dp}_{p}': curves(dp, p) for dp, p in [(1.5, 0.5), (1.5, 0.01), (2.0, 0.001), (3.0, 0.1)]}
out['erf'] = {str(x): math.erf(x) for x in [-3, -1.2, -0.3, 0, 0.2, 0.49, 0.5, 0.7, 1.5, 2.5, 4, 6]}

# losses
def losses(p, K, e, g):
    q = (1 - p) / (K - 1); tl = 1 - e + e / K; ol = e / K
    z = torch.tensor([math.log(p)] + [math.log(q)] * (K - 1), requires_grad=True)
    tgt = torch.tensor([tl] + [ol] * (K - 1))
    ce = -torch.log_softmax(z, 0)[0]; ls = -(tgt * torch.log_softmax(z, 0)).sum()
    pt = torch.softmax(z, 0)[0]; fo = -(1 - pt) ** g * torch.log(pt)
    gr = []
    for v in (ce, ls, fo):
        z.grad = None; v.backward(retain_graph=True); gr.append(z.grad[0].item())
    return dict(ce=ce.item(), ls=ls.item(), focal=fo.item(), gce=gr[0], gls=gr[1], gfocal=gr[2])
out['losses'] = {f'{p}_{g}': losses(p, 10, 0.1, g) for p, g in [(0.05, 2), (0.5, 2), (0.91, 1), (0.99, 5)]}

json.dump(out, open(os.path.join(HERE, 'expected.json'), 'w'), indent=0)
for s in out['stats']:
    print(s['mode'], 'loss %.4f' % s['loss'], 'act L1 %.3g L16 %.3g' % (s['acts'][0], s['acts'][-1]), 'grad L1 %.3g L16 %.3g' % (s['grads'][0], s['grads'][-1]))
for k, v in out['step'].items():
    print(k, {a: round(b, 5) if isinstance(b, float) else b for a, b in v.items()})
print('wd final l2', [round(x, 4) for x in out['wd']['l2'][-1]], 'adamw', [round(x, 4) for x in out['wd']['adamw'][-1]])
print('roc', out['roc'])
