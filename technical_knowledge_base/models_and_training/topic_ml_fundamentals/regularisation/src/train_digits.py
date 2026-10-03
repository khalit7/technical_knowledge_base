"""Dropout on a real dataset: an MLP 64-96-96-10 on scikit-learn's 8x8 digits (1,797 images, the UCI optical
digits test set), trained with Srivastava et al.'s (2014) recipe of retention 0.8 on the inputs and 0.5 on the
hidden units (inverted dropout, as torch.nn.Dropout). Writes:
  inputs/digits_mlp.json   seed-0 weights (int8, one scale per output unit), test digits, recorded measures
  parts/30_js_digits.js    the same, for the page
Measures: test error with and without dropout over 5 seeds; Monte Carlo model averaging against weight scaling
(Srivastava et al. section 7.5, Figure 11) over k = 1..200 thinned networks, 20 repeats; the most ambiguous digits.
Run (background, 2 threads): OMP_NUM_THREADS=2 uv run --with torch --with scikit-learn --with numpy python train_digits.py"""
import json, base64, numpy as np, torch, torch.nn as nn
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
torch.set_num_threads(2)
d = load_digits(); X = d.data / 16.0; y = d.target
Xtr, Xte, ytr, yte, itr, ite = train_test_split(X, y, np.arange(len(y)), test_size=360, random_state=0, stratify=y)
H = 96; KEEP = [0.8, 0.5, 0.5]
def net(drop):
    L = [nn.Dropout(1 - KEEP[0])] if drop else []
    L += [nn.Linear(64, H), nn.ReLU()] + ([nn.Dropout(1 - KEEP[1])] if drop else [])
    L += [nn.Linear(H, H), nn.ReLU()] + ([nn.Dropout(1 - KEEP[2])] if drop else [])
    L += [nn.Linear(H, 10)]
    return nn.Sequential(*L)
def train(drop, seed, epochs=300):
    torch.manual_seed(seed); m = net(drop); opt = torch.optim.Adam(m.parameters(), lr=1e-3)
    xt = torch.tensor(Xtr, dtype=torch.float32); yt = torch.tensor(ytr)
    g = torch.Generator().manual_seed(seed); curve = []
    for ep in range(epochs):
        m.train(); perm = torch.randperm(len(yt), generator=g)
        for i in range(0, len(yt), 64):
            b = perm[i:i + 64]; opt.zero_grad(); loss = nn.functional.cross_entropy(m(xt[b]), yt[b]); loss.backward(); opt.step()
        if ep % 10 == 9 or ep == 0:
            m.eval()
            with torch.no_grad():
                ltr = nn.functional.cross_entropy(m(xt), yt).item(); lte = nn.functional.cross_entropy(m(torch.tensor(Xte, dtype=torch.float32)), torch.tensor(yte)).item()
            curve.append([ep + 1, round(ltr, 4), round(lte, 4)])
    m.eval(); return m, curve
def err(m):
    with torch.no_grad(): return float((m(torch.tensor(Xte, dtype=torch.float32)).argmax(1).numpy() != yte).mean())
res = {'seeds': {}}
models = {}
for drop in [True, False]:
    errs = []; curves = []
    for s in range(5):
        m, c = train(drop, s); errs.append(err(m)); curves.append(c)
        if s == 0: models[drop] = m
    res['seeds']['dropout' if drop else 'none'] = {'test_err': errs, 'curve_seed0': curves[0]}
    print('dropout' if drop else 'none', [round(e * 100, 2) for e in errs])
m = models[True]
lin = [l for l in m if isinstance(l, nn.Linear)]
Wq, sc, bs, Wd = [], [], [], []
for l in lin:
    W = l.weight.detach().numpy().astype(np.float64); s = np.abs(W).max(1) / 127.0; q = np.round(W / s[:, None]).astype(np.int8)
    Wq.append(base64.b64encode(q.tobytes()).decode()); sc.append([float('%.6g' % v) for v in s]); bs.append([float('%.6g' % v) for v in l.bias.detach().numpy()])
    Wd.append(q.astype(np.float64) * np.array(sc[-1])[:, None])
B = [np.array(b) for b in bs]
def fwd(x, masks=None):
    h = x
    for li in range(3):
        if masks is not None: h = h * masks[li] / KEEP[li]
        z = h @ Wd[li].T + B[li]
        h = np.maximum(z, 0) if li < 2 else z
    z = h - h.max(-1, keepdims=True); e = np.exp(z); return e / e.sum(-1, keepdims=True)
P_ws = fwd(Xte); ws_err = float((P_ws.argmax(1) != yte).mean())
res['quantised_weight_scaling_err'] = ws_err
print('quantised net, weight scaling, test error', ws_err)
# Monte Carlo model averaging against weight scaling (Srivastava et al. 7.5)
rng = np.random.default_rng(1); Ks = [1, 2, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200]; R = 20
mc = {k: [] for k in Ks}; mcg = {k: [] for k in Ks}
for rep in range(R):
    acc = np.zeros((len(yte), 10)); lacc = np.zeros((len(yte), 10)); k0 = 0
    for k in Ks:
        for _ in range(k - k0):
            masks = [rng.random((len(yte), n)) < p for n, p in zip([64, H, H], KEEP)]
            P = fwd(Xte, masks); acc += P; lacc += np.log(P + 1e-300)
        k0 = k
        mc[k].append(float((acc.argmax(1) != yte).mean())); mcg[k].append(float((lacc.argmax(1) != yte).mean()))
res['mc'] = {'k': Ks, 'arith_mean': [float(np.mean(mc[k])) for k in Ks], 'arith_min': [float(np.min(mc[k])) for k in Ks], 'arith_max': [float(np.max(mc[k])) for k in Ks],
             'geo_mean': [float(np.mean(mcg[k])) for k in Ks], 'repeats': R, 'weight_scaling': ws_err}
for k in Ks: print(k, round(np.mean(mc[k]) * 100, 2), round(np.mean(mcg[k]) * 100, 2))
# ambiguity: disagreement among 200 thinned nets per test digit
votes = np.zeros((len(yte), 10)); acc = np.zeros((len(yte), 10))
for _ in range(200):
    masks = [rng.random((len(yte), n)) < p for n, p in zip([64, H, H], KEEP)]
    P = fwd(Xte, masks); votes[np.arange(len(yte)), P.argmax(1)] += 1; acc += P
agree = votes.max(1) / 200
order = np.argsort(agree)
res['ambiguous'] = [int(i) for i in order[:12]]
res['clear'] = [int(i) for i in np.where((agree == 1) & (P_ws.argmax(1) == yte))[0][:12]]
res['agree'] = [round(float(a), 3) for a in agree]
res['ws_pred'] = [int(v) for v in P_ws.argmax(1)]
enc = '0123456789abcdefg'
digs = ''.join(enc[int(v)] for v in (Xte * 16).round().astype(int).ravel())
M = {'sizes': [64, H, H, 10], 'keep': KEEP, 'W': Wq, 'sc': sc, 'b': bs}
out = {'model': M, 'digits': digs, 'labels': ''.join(str(v) for v in yte), 'uci_index': [int(i) for i in ite], 'measures': res}
json.dump(out, open('inputs/digits_mlp.json', 'w'))
open('parts/30_js_digits.js', 'w').write('// generated by train_digits.py: MLP 64-96-96-10 trained with dropout (keep 0.8 inputs, 0.5 hidden) on scikit-learn digits; 360 test digits\nwindow.DIG=' + json.dumps(out, separators=(',', ':')) + ';\n')
print('done')
