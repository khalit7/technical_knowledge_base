"""Record the loss-curve pathologies of the "When training goes wrong" tab on a real dataset.

Data: scikit-learn's bundled 8x8 handwritten digits (1,797 images, 64 pixels valued 0..16, 10 classes; no download),
split once with seed 0 into 1,200 train and 597 validation images. Every run is a small MLP trained on CPU with
torch threads capped at 2, seed 1 unless stated. Each run is one deliberate bug (or bad setting) and, where the tab
pairs it, the same run with the fix. Output: runs_digits.json (curves rounded and thinned; see thin()).

usage: uv run --with torch --with scikit-learn python runs_digits.py [name ...]   (no names: all runs)
"""
import json, math, sys, os
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from sklearn.datasets import load_digits

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))

d = load_digits()
X_raw = d.data.astype(np.float32); Y = d.target.astype(np.int64)
perm = np.random.RandomState(0).permutation(len(Y))
tr, va = perm[:1200], perm[1200:]
mu, sd = X_raw[tr].mean(0), X_raw[tr].std(0)
X_std = (X_raw - mu) / np.where(sd < 1e-3, 1.0, sd)   # pixels constant in the training split are left unscaled
X_badscale = (X_raw - mu) / (sd + 1e-6)               # the bug: a constant pixel gets sd 1e-6, so any nonzero value
                                                      # in validation becomes about 1e6 standard deviations


def T(a, dt=torch.float32):
    return torch.tensor(a, dtype=dt)


def mlp(sizes, act='relu', init=None, final_softmax=False, dropout=0.0, norm=False):
    layers = []
    for i in range(len(sizes) - 1):
        lin = nn.Linear(sizes[i], sizes[i + 1])
        if init is not None:
            init(lin, i)
        layers.append(lin)
        if i < len(sizes) - 2:
            if norm:
                layers.append(nn.LayerNorm(sizes[i + 1]))
            layers.append({'relu': nn.ReLU(), 'sigmoid': nn.Sigmoid(), 'tanh': nn.Tanh()}[act])
            if dropout:
                layers.append(nn.Dropout(dropout))
    if final_softmax:
        layers.append(nn.Softmax(dim=-1))
    return nn.Sequential(*layers)


def linears(m):
    return [l for l in m.modules() if isinstance(l, nn.Linear)]


def thin(xs, n=240):
    """Keep at most n points: every k-th value plus each block's extreme (so a single-step spike survives)."""
    if len(xs) <= n:
        return xs
    k = math.ceil(len(xs) / n); out = []
    for i in range(0, len(xs), k):
        blk = [v for v in xs[i:i + k] if isinstance(v[1], float) and math.isfinite(v[1])]
        if not blk:
            out.append(xs[i]); continue
        out.append(max(blk, key=lambda v: abs(v[1])) if len(blk) else xs[i])
    return out


def r(v, p=4):
    if v is None or not math.isfinite(v):
        return None if v is None else ('nan' if math.isnan(v) else ('inf' if v > 0 else '-inf'))
    return float(f'{v:.{p}g}')


def run(name, model, opt, steps=600, bs=64, X=X_std, y_tr=None, loss='ce', sched=None, clip=None,
        eval_every=10, layer_every=None, tr_idx=tr, va_idx=va, record_dead=False, seed=1, weight=None,
        manual_log=False, sampler=None):
    torch.manual_seed(seed)
    g = np.random.RandomState(seed)
    Xt, Xv = T(X[tr_idx]), T(X[va_idx])
    yt = T(Y[tr_idx] if y_tr is None else y_tr, torch.int64); yv = T(Y[va_idx], torch.int64)
    out = {'name': name, 'train': [], 'val': [], 'acc': [], 'gnorm': [], 'lr': [], 'layers': [], 'dead': [], 'wnorm': []}
    lin = linears(model)

    def lossf(logits, yy):
        if loss == 'ce':
            if manual_log:   # the bug: probabilities first, log afterwards; softmax underflows to 0, log(0) = -inf
                p = torch.softmax(logits, -1)
                return -torch.log(p[torch.arange(len(yy)), yy]).mean()
            return F.cross_entropy(logits, yy, weight=weight)
        raise ValueError(loss)

    def evaluate(step):
        model.eval()
        with torch.no_grad():
            lv = model(Xv); l = lossf(lv, yv).item(); a = (lv.argmax(-1) == yv).float().mean().item()
        model.train()
        out['val'].append([step, r(l)]); out['acc'].append([step, r(a, 3)])

    evaluate(0)
    first = None
    for step in range(1, steps + 1):
        idx = sampler(g, bs) if sampler else g.randint(0, len(yt), bs)
        xb, yb = Xt[idx], yt[idx]
        if sched:
            for pg in opt.param_groups:
                pg['lr'] = sched(step)
        opt.zero_grad()
        logits = model(xb)
        l = lossf(logits, yb)
        if first is None:
            first = l.item()
        l.backward()
        gn = torch.sqrt(sum((p.grad.float() ** 2).sum() for p in model.parameters() if p.grad is not None)).item()
        if layer_every and (step == 1 or step % layer_every == 0):
            out['layers'].append([step] + [r(li.weight.grad.norm().item(), 3) if li.weight.grad is not None else None for li in lin])
        if record_dead and (step == 1 or step % eval_every == 0):
            with torch.no_grad():
                h = Xt; fr = []
                for m in model:
                    h = m(h)
                    if isinstance(m, nn.ReLU):
                        fr.append(r((h.max(0).values <= 0).float().mean().item(), 3))  # units dead on every train image
                out['dead'].append([step] + fr)
        if clip:
            torch.nn.utils.clip_grad_norm_(model.parameters(), clip)
        opt.step()
        out['train'].append([step, r(l.item())]); out['gnorm'].append([step, r(gn, 3)])
        out['lr'].append([step, r(opt.param_groups[0]['lr'], 3)])
        if step % eval_every == 0:
            evaluate(step)
            out['wnorm'].append([step, r(torch.sqrt(sum((p.detach() ** 2).sum() for p in model.parameters())).item())])
        if not math.isfinite(l.item()):
            out['diverged_at'] = step
            evaluate(step)
            break
    out['init_loss'] = r(first)
    best = min((v for v in out['val'] if isinstance(v[1], float)), key=lambda v: v[1], default=None)
    out['best_val'] = best
    out['final'] = {'train': out['train'][-1][1], 'val': out['val'][-1][1], 'acc': out['acc'][-1][1]}
    for k in ('train', 'gnorm', 'lr'):
        out[k] = thin(out[k])
    print(name, 'init', out['init_loss'], 'final', out['final'], 'best', best, 'div', out.get('diverged_at'), flush=True)
    return out


def adam(m, lr=1e-3, wd=0.0):
    return torch.optim.AdamW(m.parameters(), lr=lr, weight_decay=wd) if wd else torch.optim.Adam(m.parameters(), lr=lr)


def sgd(m, lr, mom=0.0):
    return torch.optim.SGD(m.parameters(), lr=lr, momentum=mom)


def he(lin, i):
    nn.init.kaiming_normal_(lin.weight, nonlinearity='relu'); nn.init.zeros_(lin.bias)


def normal(std):
    def f(lin, i):
        nn.init.normal_(lin.weight, 0, std); nn.init.zeros_(lin.bias)
    return f


def seeded(fn):
    def w(*a, **k):
        torch.manual_seed(1)
        return fn(*a, **k)
    return w


@seeded
def M(*a, **k):
    return mlp(*a, **k)


RUNS = {}


def reg(f):
    RUNS[f.__name__] = f
    return f


H = [64, 128, 128, 10]

# --- healthy reference -------------------------------------------------------------------------------------------
@reg
def healthy():
    m = M(H); return run('healthy', m, adam(m))

# --- loss is NaN or inf ---------------------------------------------------------------------------------------------
@reg
def nan_lr():  # SGD at 3.0 with momentum 0.9: no NaN here; the first steps kill every ReLU and the loss settles at ln 10
    m = M(H); return run('nan_lr', m, sgd(m, 3.0, 0.9))

@reg
def nan_lr_fix():  # same run, clipping at 1.0 plus 50 warmup steps to a 30x lower rate
    m = M(H); return run('nan_lr_fix', m, sgd(m, 0.1, 0.9), clip=1.0, sched=lambda s: 0.1 * min(1, s / 50))

@reg
def nan_log():  # loss written as log(softmax(z)): finite for a while, then a probability underflows to 0
    m = M(H); return run('nan_log', m, sgd(m, 0.2, 0.9), manual_log=True)

@reg
def nan_log_fix():  # identical except F.cross_entropy (log-softmax inside, never forms the 0)
    m = M(H); return run('nan_log_fix', m, sgd(m, 0.2, 0.9))

# --- loss flat from the start ---------------------------------------------------------------------------------------
@reg
def flat_lowlr():
    m = M(H); return run('flat_lowlr', m, adam(m, 1e-6))

@reg
def flat_stale_opt():  # the optimiser was built for an earlier copy of the model: gradients exist, weights never move
    old = M(H); opt = adam(old); m = M(H); m.load_state_dict(old.state_dict())
    return run('flat_stale_opt', m, opt)

@reg
def flat_double_softmax():  # model ends in Softmax and the loss is cross_entropy, which applies log-softmax again
    m = M(H, final_softmax=True); return run('flat_double_softmax', m, adam(m))

@reg
def flat_shuffled_labels():  # labels misaligned with images (shuffled once): nothing to learn but memorisation
    m = M(H); y = Y[tr].copy(); np.random.RandomState(5).shuffle(y)
    return run('flat_shuffled_labels', m, adam(m), y_tr=y)

@reg
def overfit_one_batch_ok():  # Karpathy's check on the healthy code: 8 images, should reach about 0
    m = M(H); return run('overfit_one_batch_ok', m, adam(m), steps=200, bs=8, tr_idx=tr[:8], eval_every=10)

@reg
def overfit_one_batch_stale():  # the same check on the stale-optimiser bug: cannot fit even 8 images
    old = M(H); opt = adam(old); m = M(H); m.load_state_dict(old.state_dict())
    return run('overfit_one_batch_stale', m, opt, steps=200, bs=8, tr_idx=tr[:8], eval_every=10)

@reg
def overfit_one_batch_shuffled():  # shuffled labels still fit one batch: the check passes, so the bug is in the data
    m = M(H); y = Y[tr[:8]].copy(); np.random.RandomState(5).shuffle(y)
    return run('overfit_one_batch_shuffled', m, adam(m), steps=200, bs=8, tr_idx=tr[:8], y_tr=y, eval_every=10)

# --- loss oscillates ------------------------------------------------------------------------------------------------
@reg
def osc_lr():
    m = M(H); return run('osc_lr', m, adam(m, 0.03))

@reg
def osc_lr_fix():
    m = M(H); return run('osc_lr_fix', m, adam(m, 1e-3))

@reg
def osc_bs():  # batch of 2: very noisy gradient estimates
    m = M(H); return run('osc_bs', m, adam(m), bs=2)

@reg
def osc_unscaled():  # raw pixels 0..16 (no standardisation), plain SGD at a rate tuned for standardised inputs
    m = M(H); return run('osc_unscaled', m, sgd(m, 0.05, 0.9), X=X_raw)

# --- plateau --------------------------------------------------------------------------------------------------------
@reg
def plateau_dead():  # ReLU units pushed dead: bias initialised at -3, so most units never fire on any image
    def f(lin, i):
        nn.init.kaiming_normal_(lin.weight, nonlinearity='relu'); nn.init.constant_(lin.bias, -3.0 if i < 2 else 0.0)
    m = M(H, init=f); return run('plateau_dead', m, adam(m), record_dead=True)

@reg
def plateau_dead_fix():
    m = M(H, init=he); return run('plateau_dead_fix', m, adam(m), record_dead=True)

@reg
def plateau_decay():  # cosine schedule sized in epochs (19 steps per epoch) but read as steps: lr reaches 0 at step 30
    m = M(H); return run('plateau_decay', m, adam(m, 3e-4), sched=lambda s: 3e-4 * 0.5 * (1 + math.cos(math.pi * min(s, 30) / 30)))

@reg
def plateau_decay_fix():
    m = M(H); return run('plateau_decay_fix', m, adam(m, 3e-4), sched=lambda s: 3e-4 * 0.5 * (1 + math.cos(math.pi * s / 600)))

# --- vanishing and exploding gradients (20 hidden layers of 64, SGD momentum 0.9, so Adam does not rescale) ----------
DEEP = [64] + [64] * 20 + [10]

@reg
def vanish_sigmoid():
    m = M(DEEP, act='sigmoid'); return run('vanish_sigmoid', m, sgd(m, 0.1, 0.9), layer_every=10)

@reg
def vanish_fix_relu_he():
    m = M(DEEP, act='relu', init=he); return run('vanish_fix_relu_he', m, sgd(m, 0.01, 0.9), layer_every=10, clip=1.0)

@reg
def explode_init():  # weights drawn N(0, 1): each layer multiplies the signal by about sqrt(64/2) = 5.7
    m = M(DEEP, act='relu', init=normal(1.0)); return run('explode_init', m, sgd(m, 0.01, 0.9), layer_every=1, steps=60, eval_every=1)

@reg
def explode_fix_he():
    m = M(DEEP, act='relu', init=he); return run('explode_fix_he', m, sgd(m, 0.01, 0.9), layer_every=1, steps=60, eval_every=1, clip=1.0)

@reg
def val_scaler_bug():  # the healthy run, standardised with the buggy scaler above
    m = M(H); return run('val_scaler_bug', m, adam(m), X=X_badscale)

# --- train falls, validation rises: 300 training images with 30% of their labels replaced at random (seed 7) -------
NOISY = Y[tr].copy()
_g = np.random.RandomState(7); _flip = _g.rand(len(NOISY)) < 0.3; NOISY[_flip] = _g.randint(0, 10, _flip.sum())
W = [64, 512, 512, 10]

@reg
def overfit():  # a wide model memorises the wrong labels: training loss to about 0, validation loss climbs
    m = M(W); return run('overfit', m, adam(m), steps=2000, bs=32, tr_idx=tr[:300], y_tr=NOISY[:300], eval_every=10)

@reg
def overfit_fix_reg():  # same data, dropout 0.5 and decoupled weight decay 0.5
    m = M(W, dropout=0.5); return run('overfit_fix_reg', m, adam(m, 1e-3, wd=0.5), steps=2000, bs=32, tr_idx=tr[:300], y_tr=NOISY[:300], eval_every=10)

@reg
def overfit_fix_data():  # same noise rate, four times the images (all 1,200)
    m = M(W); return run('overfit_fix_data', m, adam(m), steps=2000, bs=32, y_tr=NOISY, eval_every=10)

# --- both high (underfitting) ---------------------------------------------------------------------------------------
@reg
def underfit_tiny():  # a bottleneck of 2 units cannot separate 10 classes
    m = M([64, 2, 10]); return run('underfit_tiny', m, adam(m, 3e-3), steps=1500)

@reg
def underfit_wd():  # the healthy model under weight decay 30 (AdamW, decoupled): the weights are held near 0
    m = M(H); return run('underfit_wd', m, adam(m, 1e-3, wd=30.0), steps=1500)

@reg
def underfit_fix():
    m = M(H); return run('underfit_fix', m, adam(m, 3e-3), steps=1500)


if __name__ == "__main__" and sys.argv[1:2] != ["none"]:
    names = sys.argv[1:] or list(RUNS)
    path = os.path.join(HERE, 'runs_digits.json')
    res = json.load(open(path)) if os.path.exists(path) and sys.argv[1:] else {}
    for n in names:
        res[n] = RUNS[n]()
    meta = {'_doc': __doc__.strip(), 'torch': torch.__version__, 'ln10': math.log(10)}
    res['_meta'] = meta
    json.dump(res, open(path, 'w'), separators=(',', ':'))
    print('wrote', path, os.path.getsize(path), 'bytes')
