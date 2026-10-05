# Reference sampler in NumPy float64 with the exported int8 weights: the page's JavaScript must reproduce it exactly.
# Same RNG as the page: mulberry32 uniforms, Box-Muller normals (one normal per two uniforms, cos branch).
import json, math, sys
import numpy as np
T = 1000
def mulberry32(seed):
    s = [seed & 0xffffffff]
    def r():
        s[0] = (s[0] + 0x6D2B79F5) & 0xffffffff; t = s[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return r
def gauss(r):
    u = 1 - r(); v = r(); return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)
def abar(kind):
    if kind == 'linear':
        b = np.linspace(1e-4, 0.02, T); return np.cumprod(1 - b)
    t = np.arange(T + 1); s = 0.008; f = np.cos((t / T + s) / (1 + s) * math.pi / 2) ** 2
    ab = f / f[0]; beta = np.clip(1 - ab[1:] / ab[:-1], 0, 0.999); return np.cumprod(1 - beta)
NF = 8
FREQ = np.array([2.0 ** k for k in range(NF)]) * math.pi
def load(path, kind):
    d = json.load(open(path))[kind]['layers']; L = []
    for l in d:
        q = np.frombuffer(bytes.fromhex(l['q']), np.int8).astype(np.float64).reshape(l['out'], l['in'])
        L.append((q * np.array(l['scale'])[:, None], np.array(l['b'], dtype=np.float64)))
    return L
def silu(h): return h / (1 + np.exp(-h))
def net(L, x, lev, c):  # x [n,2], lev scalar, c int
    a = lev * FREQ / 16; e = np.concatenate([np.sin(a), np.cos(a)])
    oh = np.zeros(3); oh[c] = 1
    h = np.concatenate([x, np.tile(np.concatenate([e, oh]), (x.shape[0], 1))], 1)
    for i, (w, b) in enumerate(L):
        h = h @ w.T + b
        if i < 3: h = silu(h)
    return h
def guided(L, x, lev, c, w):
    if c == 2: return net(L, x, lev, 2)
    if w == 0: return net(L, x, lev, c)
    return (1 + w) * net(L, x, lev, c) - w * net(L, x, lev, 2)
def tsteps(S): return [int(round(1 + (T - 1) * i / (S - 1))) for i in range(S)] if S > 1 else [T]
def sample(Le, Lf, method, sched, S, c, w, n, seed, keep=False, clip=True):
    r = mulberry32(seed)
    x = np.array([[gauss(r), gauss(r)] for _ in range(n)])
    path = [x.copy()]
    if method == 'flow':
        for k in range(S):
            t = 1 - k / S
            v = guided(Lf, x, 2 * t - 1, c, w); x = x - v / S
            path.append(x.copy())
        return x, path
    ab = abar(sched); ts = tsteps(S)
    for k in range(S - 1, -1, -1):
        t = ts[k]; a_t = ab[t - 1]; a_p = ab[ts[k - 1] - 1] if k > 0 else 1.0
        eps = guided(Le, x, math.log(a_t / (1 - a_t)) / 12, c, w)
        if method == 'ddim':
            x0 = (x - math.sqrt(1 - a_t) * eps) / math.sqrt(a_t)
            if clip:  # clip the denoised guess to the data range, then re-derive the noise from it
                x0 = np.clip(x0, -3, 3); eps = (x - math.sqrt(a_t) * x0) / math.sqrt(1 - a_t)  # re-derive the noise from the clipped x0 (GLIDE; diffusers use_clipped_model_output)
            x = math.sqrt(a_p) * x0 + math.sqrt(1 - a_p) * eps
        else:
            al = a_t / a_p; be = 1 - al
            if clip:  # Ho et al.'s code: clip the predicted x0, then take the posterior mean (Eq. 7) of q(x_{t-1} | x_t, x0)
                x0 = np.clip((x - math.sqrt(1 - a_t) * eps) / math.sqrt(a_t), -3, 3)
                mean = math.sqrt(a_p) * be / (1 - a_t) * x0 + math.sqrt(al) * (1 - a_p) / (1 - a_t) * x
            else:
                mean = (x - be / math.sqrt(1 - a_t) * eps) / math.sqrt(al)
            if k > 0:
                sig = math.sqrt((1 - a_p) / (1 - a_t) * be)
                z = np.array([[gauss(r), gauss(r)] for _ in range(n)])
                x = mean + sig * z
            else: x = mean
        path.append(x.copy())
    return x, path
# ---- evaluation: distance to the noiseless moon arcs (standardised units) ----
th = np.linspace(0, math.pi, 4000)
ARC = [(np.stack([np.cos(th), np.sin(th)], 1) - [0.5, 0.25]) / 0.7, (np.stack([1 - np.cos(th), 0.5 - np.sin(th)], 1) - [0.5, 0.25]) / 0.7]
def score(x, c, thr=0.2):
    d = np.stack([np.sqrt(((x[:, None, :] - A[None]) ** 2).sum(-1)).min(1) for A in ARC], 1)
    on = (d.min(1) < thr).mean(); cls = d.argmin(1)
    match = (cls == c).mean() if c < 2 else None
    return float(on), (float(match) if match is not None else None)
if __name__ == '__main__':
    W = sys.argv[1] if len(sys.argv) > 1 else '64'
    Le = load('dm_w%s.json' % W, 'eps'); Lf = load('dm_w%s.json' % W, 'flow')
    for (m, s, S) in [('ddpm', 'linear', 1000), ('ddpm', 'linear', 100), ('ddpm', 'cosine', 100), ('ddim', 'linear', 50), ('ddim', 'cosine', 20), ('ddim', 'linear', 10), ('flow', '-', 50), ('flow', '-', 10), ('flow', '-', 2)]:
        for c, w in [(2, 0), (0, 0), (0, 3)]:
            x, _ = sample(Le, Lf, m, s, S, c, w, 400, 1)
            print(W, m, s, S, 'class', c, 'w', w, 'on, match', score(x, c), flush=True)
