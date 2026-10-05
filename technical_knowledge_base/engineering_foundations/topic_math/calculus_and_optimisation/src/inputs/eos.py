# Edge of stability on a small real problem: full-batch gradient descent on a tanh MLP,
# sklearn's bundled digits (8x8 images, 10 classes), MSE on one-hot targets (as Cohen et al. 2021 Fig. 1 / 3).
# Sharpness = top eigenvalue of the training-loss Hessian, by power iteration with Hessian-vector products.
# usage: uv run --no-project --with torch --with scikit-learn python eos.py [quick]
import sys, json, time, math
import torch
from sklearn.datasets import load_digits
torch.set_num_threads(2)
torch.set_default_dtype(torch.float64)

X, y = load_digits(return_X_y=True)
n = 1000
X = torch.tensor(X[:n] / 16.0)
X = (X - X.mean(0)) / (X.std(0) + 1e-8)   # constant pixels stay 0
Y = torch.nn.functional.one_hot(torch.tensor(y[:n]), 10).double()

def make(seed, width=64):
    g = torch.Generator().manual_seed(seed)
    def lin(i, o):
        W = torch.randn(o, i, generator=g) * math.sqrt(1.0 / i)
        b = torch.zeros(o)
        return [W.requires_grad_(), b.requires_grad_()]
    return lin(64, width) + lin(width, width) + lin(width, 10)

def forward(ps, X):
    h = torch.tanh(X @ ps[0].T + ps[1])
    h = torch.tanh(h @ ps[2].T + ps[3])
    return h @ ps[4].T + ps[5]

def loss_fn(ps):
    out = forward(ps, X)
    return 0.5 * ((out - Y) ** 2).sum(1).mean()   # 1/2 squared error summed over classes, mean over examples

def acc(ps):
    with torch.no_grad():
        return (forward(ps, X).argmax(1) == Y.argmax(1)).double().mean().item()

def sharpness(ps, iters=30, v0=None):
    L = loss_fn(ps)
    gs = torch.autograd.grad(L, ps, create_graph=True)
    v = [torch.randn_like(p) for p in ps] if v0 is None else v0
    nv = math.sqrt(sum((a * a).sum() for a in v)); v = [a / nv for a in v]
    lam = 0.0
    for _ in range(iters):
        Hv = torch.autograd.grad(gs, ps, grad_outputs=v, retain_graph=True)
        lam = sum((a * b).sum() for a, b in zip(Hv, v)).item()   # Rayleigh quotient
        nv = math.sqrt(sum((a * a).sum() for a in Hv))
        v = [a / nv for a in Hv]
    return lam, [a.detach() for a in v]

def run(eta, steps, every, seed=0):
    ps = make(seed)
    rec = []
    losses = []
    v = None
    t0 = time.time()
    for t in range(steps + 1):
        if t % every == 0:
            lam, v = sharpness(ps, iters=20 if v is not None else 50, v0=v)
            L = loss_fn(ps).item()
            rec.append({'step': t, 'loss': round(L, 6), 'sharp': round(lam, 4), 'acc': round(acc(ps), 4)})
            if t % (every * 10) == 0:
                print(f'eta {eta} step {t} loss {L:.5f} sharp {lam:.3f} 2/eta {2/eta:.2f} acc {rec[-1]["acc"]:.3f} {time.time()-t0:.0f}s', flush=True)
        L = loss_fn(ps)
        losses.append(L.item())
        gs = torch.autograd.grad(L, ps)
        with torch.no_grad():
            for p, g in zip(ps, gs):
                p -= eta * g
        if not math.isfinite(L.item()):
            break
    # per-step losses (cheap) for the oscillation picture
    return {'every': every, 'rec': rec, 'loss_each_step': [float('%.6g' % l) for l in losses]}

if __name__ == '__main__':
    quick = len(sys.argv) > 1 and sys.argv[1] == 'quick'
    out = {}
    cfgs = [(0.02, 6000, 25), (0.05, 6000, 25), (0.1, 6000, 25), (0.2, 6000, 25), (0.3, 6000, 25)] if not quick else [(0.1, 200, 20)]
    for eta, steps, every in cfgs:
        out[str(eta)] = run(eta, steps, every)
    json.dump({'setup': 'digits n=1000 standardised, MLP 64-64-64-10 tanh, LeCun-normal init seed 0, float64, loss 1/2 sum sq / n, full-batch GD', 'runs': out}, open('eos_out.json' if not quick else 'eos_quick.json', 'w'))
