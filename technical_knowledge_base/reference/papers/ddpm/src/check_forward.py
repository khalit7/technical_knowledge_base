"""Check the page's JS DDPM against PyTorch, through an independent float64 NumPy reference.

  uv run --with torch --with numpy python check_forward.py    then    node check_forward.mjs

1. Decodes the weights from parts/20_model_data.js exactly as the JS does (no torch), runs the
   network in float64 NumPy, and compares it with the dequantised PyTorch model (float32) on 400
   random (x_t, t) inputs per variant.
2. Runs Algorithm 2 in NumPy with the page's random stream (toy.gauss_stream, mulberry32 + Box-Muller)
   for 40 points, seed 5, every variant and both sigma choices, and writes model/check_ref.json
   (inputs, outputs and the final samples) for check_forward.mjs to compare with the JS.
"""
import base64, json, math, os
import numpy as np
import torch
import toy as Y
import export as EX

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'parts', '20_model_data.js')).read()
WD = json.loads(src[src.index('window.DDPM_W=') + 14:src.rindex(';')])
q = 2 ** (WD['bits'] - 1) - 1


def dec(e):
    raw = np.frombuffer(base64.b64decode(e['q']), dtype=np.uint8 if WD['bits'] <= 8 else '<u2').astype(np.float64)
    sc = np.frombuffer(base64.b64decode(e['scale']), dtype='<f4').astype(np.float64)
    sh = e['shape']
    return ((raw.reshape(sh[0] if len(sh) > 1 else 1, -1) - q) * sc[:, None]).reshape(sh)


T = WD['T']
beta = np.concatenate([[0], np.linspace(1e-4, 0.02, T)])
# the JS builds beta as b0 + (b1 - b0) (t - 1) / (T - 1); numpy linspace agrees to ~1e-18
alpha = 1 - beta; abar = np.cumprod(np.concatenate([[1], alpha[1:]])); btil = np.zeros(T + 1)
btil[1:] = (1 - abar[:-1]) / (1 - abar[1:]) * beta[1:]
half = WD['TE'] // 2
freq = np.exp(-math.log(10000) * np.arange(half) / (half - 1))


def fwd(Wt, x, t):
    e = np.concatenate([np.sin(t[:, None] * freq), np.cos(t[:, None] * freq)], 1)
    s = lambda v: v / (1 + np.exp(-v))
    h = s(x @ Wt['l1.weight'].T + Wt['l1.bias'] + e @ Wt['p1.weight'].T)
    h = s(h @ Wt['l2.weight'].T + Wt['l2.bias'] + e @ Wt['p2.weight'].T)
    h = s(h @ Wt['l3.weight'].T + Wt['l3.bias'] + e @ Wt['p3.weight'].T)
    return h @ Wt['lo.weight'].T + Wt['lo.bias']


def sample(Wt, kind, n, seed, sig):
    g = Y.gauss_stream(seed)
    x = np.array([g() for _ in range(2 * n)]).reshape(n, 2)
    for t in range(T, 0, -1):
        out = fwd(Wt, x, np.full(n, float(t)))
        if kind.startswith('eps'): mu = (x - beta[t] / math.sqrt(1 - abar[t]) * out) / math.sqrt(alpha[t])
        else: mu = out
        if t > 1:
            sd = math.sqrt(btil[t] if sig == 'btilde' else beta[t])
            z = np.array([g() for _ in range(2 * n)]).reshape(n, 2)
            x = mu + sd * z
        else:
            x = mu
    return x


ref = {'variants': {}}
rng = np.random.default_rng(0)
X = rng.uniform(-1.3, 1.3, (400, 2)); TT = rng.integers(1, T + 1, 400).astype(np.float64)
for kind, V in WD['variants'].items():
    Wt = {n: dec(e) for n, e in V.items()}
    ck = torch.load(os.path.join(HERE, 'model', kind + '.pt'))
    _, deq = EX.quantise(ck['ema'], WD['bits'])
    tn = Y.Net(); tn.load_state_dict(deq); tn.eval()
    with torch.no_grad(): pt = tn(torch.tensor(X, dtype=torch.float32), torch.tensor(TT, dtype=torch.long)).numpy()
    npo = fwd(Wt, X, TT)
    d_torch = float(np.abs(npo - pt).max())
    fin = {s: sample(Wt, kind, 40, 5, s).tolist() for s in ('beta', 'btilde')}
    ref['variants'][kind] = {'x': X.tolist(), 't': TT.tolist(), 'out': npo.tolist(), 'max_abs_numpy_vs_torch': d_torch, 'samples_seed5_n40': fin}
    print(kind, 'numpy float64 vs torch float32 (dequantised), max |diff| of network output:', '%.2e' % d_torch)
# Eq. 4 and the gaussian stream itself
g = Y.gauss_stream(3); ref['gauss_seed3'] = [g() for _ in range(10)]
json.dump(ref, open(os.path.join(HERE, 'model', 'check_ref.json'), 'w'))
print('wrote model/check_ref.json')
