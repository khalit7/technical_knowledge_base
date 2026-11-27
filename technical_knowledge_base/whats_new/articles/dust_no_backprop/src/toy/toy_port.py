"""An independent Python port of the page's toy (parts/22_js_du_toy_core.js), to check the JS arithmetic.

usage (from this src/ folder): nice -n 15 python3 -I toy/toy_port.py      (about 30 s; needs numpy: the repo's .venv has it)
Recomputes seed 1 at widths 8 and 32 with the same generator (mulberry32 plus Box-Muller, written here from its definition)
and compares every cosine, and token 0's estimate, with toy/out/toy.json (written by the JS code in node). Prints the largest
difference and exits 1 above 2e-6 (the recorded values are rounded to 1e-6).
"""
import json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DIN, C, T, SIG = 16, 8, 64, 0.01
KS = [2 ** i for i in range(13)]
M32 = 0xFFFFFFFF


def imul(a, b):
    r = (a * b) & M32
    return r


class Rng:
    def __init__(self, seed):
        self.a = seed & M32

    def u(self):
        self.a = (self.a + 0x6D2B79F5) & M32
        a = self.a
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296

    def n(self):
        u1 = 1 - self.u(); u2 = self.u()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def losses(W1, W2, X, Y):
    """per-token cross-entropy for pre-activations H = X W1^T (rows are tokens)"""
    return lossH(X @ W1.T, W2, Y)


def lossH(Hm, W2, Y):
    Z = np.tanh(Hm) @ W2.T
    m = Z.max(axis=1, keepdims=True)
    return (m[:, 0] + np.log(np.exp(Z - m).sum(axis=1))) - Z[np.arange(len(Y)), Y]


def run(H, seed):
    r = Rng(seed * 1000 + H)
    X = np.zeros((T, DIN)); Y = np.zeros(T, dtype=int)
    for t in range(T):
        for i in range(DIN): X[t, i] = r.n()
        Y[t] = math.floor(r.u() * C)
    W1 = np.array([[r.n() / math.sqrt(DIN) for _ in range(DIN)] for _ in range(H)])
    W2 = np.array([[r.n() / math.sqrt(H) for _ in range(H)] for _ in range(C)])
    Hs = X @ W1.T
    L0 = lossH(Hs, W2, Y)
    A = np.tanh(Hs); Z = A @ W2.T; P = np.exp(Z - Z.max(axis=1, keepdims=True)); P /= P.sum(axis=1, keepdims=True)
    dZ = P.copy(); dZ[np.arange(T), Y] -= 1
    dH = (dZ @ W2) * (1 - A * A)
    G = dH.T @ X                                    # exact dL/dW1, shape H x DIN
    r = Rng(seed * 7919 + H * 31 + 1)
    accW = np.zeros((H, DIN)); acc1 = np.zeros((T, H)); accT = np.zeros((T, H))
    cos = {'w': [], 'a1': [], 'at': []}; tok = []
    c = lambda a, b: float((a * b).sum() / math.sqrt((a * a).sum() * (b * b).sum()))
    for k in range(1, KS[-1] + 1):
        E = np.array([r.n() for _ in range(H * DIN)]).reshape(H, DIN)
        rw = losses(W1 + SIG * E, W2, X, Y).sum() - L0.sum()
        accW += rw * E
        Am = np.array([r.n() for _ in range(T * H)]).reshape(T, H)
        dl = lossH(Hs + SIG * Am, W2, Y) - L0
        acc1 += dl.sum() * Am; accT += dl[:, None] * Am
        if k in KS:
            f = 1 / (k * SIG)
            cos['w'].append(c(accW * f, G)); cos['a1'].append(c((acc1 * f).T @ X, G)); cos['at'].append(c((accT * f).T @ X, G))
            tok.append(list(accT[0, :4] * f))
    g0 = list(dH[0, :4])
    return cos, {'exact': g0, 'est': tok}


if __name__ == '__main__':
    rec = json.load(open(os.path.join(HERE, 'out', 'toy.json')))
    worst = 0
    for H in (8, 32):
        cos, tok = run(H, 1)
        for m in ('w', 'a1', 'at'):
            for a, b in zip(cos[m], rec['widths'][str(H)]['seed1'][m]): worst = max(worst, abs(a - b))
        if H == 32:
            for a, b in zip(tok['exact'], rec['tok0']['exact']): worst = max(worst, abs(a - b))
            for ra, rb in zip(tok['est'], rec['tok0']['est']):
                for a, b in zip(ra, rb): worst = max(worst, abs(a - b))
        print('H', H, 'seed 1 checked; at K=64: w %.6f a1 %.6f at %.6f' % (cos['w'][6], cos['a1'][6], cos['at'][6]))
    print('largest difference from the JS-recorded values: %.2e' % worst)
    sys.exit(0 if worst <= 2e-6 else 1)
