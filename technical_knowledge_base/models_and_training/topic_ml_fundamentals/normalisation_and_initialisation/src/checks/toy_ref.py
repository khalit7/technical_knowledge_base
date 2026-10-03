"""Reference for parts/21_js_toy.js: the same seeded weights, built with torch, gradients by autograd.

Run from src/: OMP_NUM_THREADS=2 uv run --with torch --with numpy python checks/toy_ref.py
Compares against checks/toy_js.json written by `node checks/run_toy.mjs`, and checks Xiong et al.'s Lemma 2.
"""
import json, math, os
import numpy as np
import torch

torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)
HERE = os.path.dirname(os.path.abspath(__file__))


class Rng:  # mulberry32 + Box-Muller, identical to the page
    def __init__(self, seed):
        self.a = seed & 0xFFFFFFFF

    def u(self):
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.a

        def imul(x, y):
            return (x * y) & 0xFFFFFFFF

        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    def nrm(self):
        u1 = 1 - self.u()
        u2 = self.u()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

    def fill(self, shape, std):
        n = int(np.prod(shape))
        return torch.tensor([self.nrm() * std for _ in range(n)]).reshape(shape)


def ln(x):
    return torch.nn.functional.layer_norm(x, (x.shape[-1],), eps=1e-5)


def toy(place, L, init='xavier', d=64, n=16, K=10, seed=1):
    r = Rng(seed)
    deep = place == 'deep'
    post = place in ('post', 'deep')
    alpha = (2 * L) ** 0.25 if deep else 1.0
    beta = (8 * L) ** -0.25 if deep else (1 / math.sqrt(2 * L) if init == 'gpt2' else 1.0)
    sd = math.sqrt(2 / (d + d))
    X0 = r.fill((n, d), 1)
    Ws = []
    for _ in range(L):
        V = r.fill((d, d), sd * beta).requires_grad_()
        W1 = r.fill((d, d), sd).requires_grad_()
        W2 = r.fill((d, d), sd * beta).requires_grad_()
        Ws.append((V, W1, W2))
    Wo = r.fill((d, K), math.sqrt(2 / (d + K)))
    lab = torch.tensor([min(K - 1, int(math.floor(r.u() * K))) for _ in range(n)])

    def att(h, V):
        return h.mean(0, keepdim=True).expand(n, d) @ V

    def ffn(h, W1, W2):
        return torch.relu(h @ W1) @ W2

    def sub(x, f):
        if post:
            s = alpha * x + f(x)
            return ln(s), torch.sqrt((s ** 2).mean()).item()
        h = ln(x) if place in ('pre', 'peri') else x
        o = f(h)
        if place in ('peri', 'out'):
            o = ln(o)
        return x + o, None

    x = X0
    stream = [torch.sqrt((x ** 2).mean()).item()]
    sums = []
    for V, W1, W2 in Ws:
        x, _ = sub(x, lambda h: att(h, V))
        x, s = sub(x, lambda h: ffn(h, W1, W2))
        stream.append(torch.sqrt((x ** 2).mean()).item())
        sums.append(s)
    y = ln(x) if place in ('pre', 'peri', 'out') else x
    loss = torch.nn.functional.cross_entropy(y @ Wo, lab)
    loss.backward()
    return dict(stream=stream, sum=sums, loss=loss.item(),
                g2=[W2.grad.norm().item() for _, _, W2 in Ws],
                g1=[W1.grad.norm().item() for _, W1, _ in Ws],
                gV=[V.grad.norm().item() for V, _, _ in Ws])


def main():
    js = json.load(open(os.path.join(HERE, 'toy_js.json')))
    worst = 0.0
    for case in js:
        ref = toy(case['place'], case['L'], case['init'], seed=case['seed'])
        for k in ('stream', 'g2', 'g1', 'gV'):
            a, b = np.array(case['out'][k]), np.array(ref[k])
            worst = max(worst, float(np.max(np.abs(a - b) / np.maximum(1e-12, np.abs(b)))))
        worst = max(worst, abs(case['out']['loss'] - ref['loss']) / ref['loss'])
    print('cases', len(js), 'worst relative difference JS vs torch autograd', '%.2e' % worst)
    # Lemma 2 (Xiong et al. 2020): post-LN E||x^{post,5}||^2 = 3/2 d; pre-LN (1 + l/2) d <= E||x_l||^2 <= (1 + 3l/2) d
    d = 64
    res = {}
    for place in ('post', 'pre'):
        acc = None
        for seed in range(1, 21):
            o = toy(place, 12, seed=seed)
            v = np.array(o['sum'] if place == 'post' else o['stream'][1:]) ** 2
            acc = v if acc is None else acc + v
        res[place] = (acc / 20).tolist()
    print('post-LN mean squared RMS of the sum before the last LN, per layer (theory 1.5):', ['%.2f' % v for v in res['post']])
    print('pre-LN mean squared RMS of the stream after layer l, with bounds 1+l/2 .. 1+3l/2 (input RMS^2 = 1 counts as the l=0 term):')
    for l, v in enumerate(res['pre'], 1):
        print('  l=%2d  %.2f   [%.1f, %.1f]' % (l, v, 1 + l / 2, 1 + 3 * l / 2))
    json.dump(dict(worst=worst, lemma2=res), open(os.path.join(HERE, 'toy_ref_result.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
