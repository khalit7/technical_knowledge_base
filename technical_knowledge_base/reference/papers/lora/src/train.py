"""Toy LoRA experiments for the LoRA paper page.

The toy (see README "Run a LoRA"): a one-block Transformer read out at position 0, pretrained to COUNT how
often the query symbol x0 occurs in a 10-symbol sequence. Each downstream task is a TEACHER: the same base model
with one weight matrix edited by a known matrix dW* of known rank k, and the label of a sequence is the
teacher's answer. So the update the adaptation has to find is known exactly:
  v1 (Wv edited, rank 1), v4 (Wv, rank 4), v32 (Wv, a dense full-rank edit, "a new language"),
  mlp4 (W1 of the MLP edited, rank 4). The edit's size is set so the base model agrees with the teacher
  on 40% of sequences.

  uv run --with torch --with numpy python train.py pre        # pretrain the base model (about 2 min)
  uv run --with torch --with numpy python train.py lrsweep    # choose the learning rates
  uv run --with torch --with numpy python train.py sweep      # every adaptation run (resumable)
  uv run --with torch --with numpy python train.py export     # writes parts/20_model_data.js

torch is never added to pyproject.toml. Threads are capped at 2 (other builders share the CPU).
"""
import json, math, os, sys, time
import numpy as np
import torch

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, 'model')
os.makedirs(MD, exist_ok=True)

V, L, D, NH, DFF, NC = 16, 10, 32, 2, 128, 11      # symbols, sequence length, width, heads, MLP width, classes (counts 0..10)
BOS = V                                              # token id of the sink token at position 1
NT = L + 2                                           # positions: x0, BOS, x1..x10
TASKS = {'pre': None, 'v1': ('Wv', 1), 'v4': ('Wv', 4), 'v32': ('Wv', 32), 'mlp4': ('W1', 4)}
TARGET_AGREE = 0.75


def gen_pre(n, rng):
    """n pretraining sequences: query x0 uniform over the 16 symbols, its count c uniform over 0..10."""
    X = np.zeros((n, NT), dtype=np.int64)
    y = np.zeros(n, dtype=np.int64)
    for i in range(n):
        x0 = int(rng.integers(V)); c = int(rng.integers(L + 1))
        seq = np.empty(L, dtype=np.int64)
        pos = rng.permutation(L)
        others = [s for s in range(V) if s != x0]
        seq[pos[:c]] = x0
        seq[pos[c:]] = np.array(others)[rng.integers(len(others), size=L - c)]
        X[i, 0] = x0; X[i, 1] = BOS; X[i, 2:] = seq
        y[i] = c
    return X, y


_TEACH = {}


def teacher(task):
    """The edit dW* = c * U V^T (U, V random orthonormal, k columns) of one matrix, c calibrated once so the base
    agrees with the teacher on TARGET_AGREE of evaluation sequences. Saved to model/teachers.pt."""
    if task in _TEACH:
        return _TEACH[task]
    path = os.path.join(MD, 'teachers.pt')
    T = torch.load(path) if os.path.exists(path) else {}
    if task not in T:
        k, r = TASKS[task]
        g = torch.Generator().manual_seed(500 + list(TASKS).index(task))
        dout, din = SHAPES[k]
        U = torch.linalg.qr(torch.randn(dout, r, generator=g))[0]
        Vm = torch.linalg.qr(torch.randn(din, r, generator=g))[0]
        B0 = load(os.path.join(MD, 'base_q.pt'))
        X, _ = gen_pre(4000, np.random.default_rng(777))
        Xt = torch.tensor(X)
        with torch.no_grad():
            yb = forward(B0, Xt).argmax(-1)
            lo, hi = 0.0, 50.0
            for _ in range(40):
                c = (lo + hi) / 2
                ag = float((forward(B0, Xt, {k: (Vm.T.contiguous(), U * c, 1.0)}).argmax(-1) == yb).float().mean())
                if ag > TARGET_AGREE: lo = c
                else: hi = c
        T[task] = {'k': k, 'r': r, 'A': Vm.T.contiguous(), 'B': (U * c).contiguous(), 'c': c}
        torch.save(T, path)
    _TEACH[task] = T[task]
    return T[task]


def gen(task, n, rng, base=None):
    """Sequences from the pretraining distribution, labelled by the task's teacher.
    Returns X, y and `changed` (the teacher's answer differs from the base model's)."""
    X, yc = gen_pre(n, rng)
    if task == 'pre':
        return X, yc, np.zeros(n, dtype=bool)
    X, y, ch, _ = gen_soft(task, n, rng, base, X)
    return X, y, ch


def gen_soft(task, n, rng, base=None, X=None):
    """As gen, plus the teacher's output distribution (the training target: soft cross-entropy, i.e. distillation)."""
    if X is None:
        X, _ = gen_pre(n, rng)
    t = teacher(task)
    B0 = base if base is not None else load(os.path.join(MD, 'base_q.pt'))
    with torch.no_grad():
        Xt = torch.tensor(X)
        lt = forward(B0, Xt, {t['k']: (t['A'], t['B'], 1.0)})
        y = lt.argmax(-1).numpy()
        yb = forward(B0, Xt).argmax(-1).numpy()
    return X, y, y != yb, torch.softmax(lt, -1)


NAMES = ['E', 'P', 'Wq', 'Wk', 'Wv', 'Wo', 'W1', 'b1', 'W2', 'b2', 'Wh', 'bh']
SHAPES = {'E': (V + 1, D), 'P': (NT, D), 'Wq': (D, D), 'Wk': (D, D), 'Wv': (D, D), 'Wo': (D, D),
          'W1': (DFF, D), 'b1': (DFF,), 'W2': (D, DFF), 'b2': (D,), 'Wh': (NC, D), 'bh': (NC,)}
LORA_TARGETS = ['Wq', 'Wk', 'Wv', 'Wo', 'W1', 'W2']


def init_base(seed=0, dtype=torch.float32):
    g = torch.Generator().manual_seed(seed)
    P = {}
    for k in NAMES:
        s = SHAPES[k]
        if k.startswith('b'):
            P[k] = torch.zeros(s, dtype=dtype)
        elif k in ('E', 'P'):
            P[k] = torch.randn(s, generator=g, dtype=dtype) * 0.5
        else:
            P[k] = torch.randn(s, generator=g, dtype=dtype) / math.sqrt(s[1])
    return P


def forward(P, X, lora=None):
    """P: dict of weights (out x in convention, h = W x). lora: {name: (A, B, s)} adds s * B @ A to W."""
    def W(k):
        w = P[k]
        if lora and k in lora:
            A, B, s = lora[k]
            w = w + s * (B @ A)
        return w
    H = P['E'][X] + P['P'][None]                      # n x NT x D
    h0 = H[:, 0]
    q = h0 @ W('Wq').T                                # n x D
    K = H[:, 1:] @ W('Wk').T                          # n x (L+1) x D
    Vv = H[:, 1:] @ W('Wv').T
    dh = D // NH
    qh = q.view(-1, NH, dh)
    Kh = K.view(K.shape[0], K.shape[1], NH, dh)
    Vh = Vv.view(Vv.shape[0], Vv.shape[1], NH, dh)
    sc = torch.einsum('nhd,nthd->nht', qh, Kh) / math.sqrt(dh)
    a = torch.softmax(sc, dim=-1)
    o = torch.einsum('nht,nthd->nhd', a, Vh).reshape(-1, D)
    h1 = h0 + o @ W('Wo').T
    z = torch.relu(h1 @ W('W1').T + P['b1'])
    h2 = h1 + z @ W('W2').T + P['b2']
    return h2 @ P['Wh'].T + P['bh']


def lr_at(step, steps, lr, warm):
    if step < warm:
        return lr * (step + 1) / warm
    return lr * max(0.0, (steps - step) / max(1, steps - warm))


def evaluate(P, task, lora=None, n=4000, split='test'):
    X, y, mv = gen(task, n, np.random.default_rng((10_000 if split == 'test' else 20_000) + list(TASKS).index(task)))
    with torch.no_grad():
        pr = forward(P, torch.tensor(X), lora).argmax(-1).numpy()
    ok = pr == y
    return {'acc': float(ok.mean()), 'changed': float(ok[mv].mean()) if mv.any() else None,
            'kept': float(ok[~mv].mean()) if (~mv).any() else None}


def save(P, path):
    torch.save({k: v.clone() for k, v in P.items()}, path)


def load(path):
    return torch.load(path)


# ---------------- pretraining ----------------
def pretrain(steps=6000, batch=256, lr=3e-3, seed=0):
    P = init_base(seed)
    for v in P.values():
        v.requires_grad_(True)
    opt = torch.optim.AdamW(P.values(), lr=lr, weight_decay=0.01)
    rng = np.random.default_rng(seed)
    log = open(os.path.join(MD, 'train_pre.log'), 'w')
    t0 = time.time()
    for st in range(steps):
        for gq in opt.param_groups:
            gq['lr'] = lr_at(st, steps, lr, 200)
        X, y = gen_pre(batch, rng)
        loss = torch.nn.functional.cross_entropy(forward(P, torch.tensor(X)), torch.tensor(y), label_smoothing=0.1)
        opt.zero_grad(); loss.backward(); opt.step()
        if st % 250 == 0 or st == steps - 1:
            e = evaluate({k: v.detach() for k, v in P.items()}, 'pre', n=2000)
            print('step %d loss %.4f acc %.4f t %.0fs' % (st, loss.item(), e['acc'], time.time() - t0), file=log, flush=True)
    P = {k: v.detach() for k, v in P.items()}
    save(P, os.path.join(MD, 'base_float.pt'))
    # 8-bit quantisation per tensor; the dequantised weights ARE the base model used everywhere after this
    Q, scales = {}, {}
    for k, v in P.items():
        sc = float(v.abs().max()) / 127 if float(v.abs().max()) > 0 else 1.0
        q = torch.round(v / sc).clamp(-127, 127)
        Q[k] = (q * sc).to(torch.float32); scales[k] = sc
    save(Q, os.path.join(MD, 'base_q.pt'))
    rep = {'label_smoothing': 0.1, 'float': evaluate(P, 'pre'), 'quantised': evaluate(Q, 'pre'), 'steps': steps, 'batch': batch, 'lr': lr,
           'params': int(sum(v.numel() for v in P.values()))}

    json.dump(rep, open(os.path.join(MD, 'pretrain_report.json'), 'w'), indent=1)
    print(json.dumps(rep, indent=1), file=log, flush=True)


# ---------------- adaptation ----------------
def adapt(task, method, targets=(), r=0, alpha=8.0, scaling='r', seed=0, steps=2000, lr=None, batch=64, keep=False, logevery=50):
    """method 'ft' trains every weight; 'lora' trains A, B on `targets` with the base frozen."""
    B0 = load(os.path.join(MD, 'base_q.pt'))
    g = torch.Generator().manual_seed(1000 + seed)
    rng = np.random.default_rng(2000 + seed)
    if method == 'ft':
        P = {k: v.clone().requires_grad_(True) for k, v in B0.items()}
        params = list(P.values()); lora = None
    else:
        P = B0
        lora = {}
        s = alpha / r if scaling == 'r' else alpha / math.sqrt(r)
        params = []
        for k in targets:
            dout, din = SHAPES[k]
            A = (torch.randn(r, din, generator=g) / math.sqrt(din)).requires_grad_(True)
            Bm = torch.zeros(dout, r, requires_grad=True)
            lora[k] = (A, Bm, s); params += [A, Bm]
    ntrain = int(sum(p.numel() for p in params))
    opt = torch.optim.Adam(params, lr=lr)
    curve = []
    for st in range(steps):
        for gq in opt.param_groups:
            gq['lr'] = lr_at(st, steps, lr, 50)
        X, _, _, pt = gen_soft(task, batch, rng, B0)
        loss = -(pt * torch.log_softmax(forward(P, torch.tensor(X), lora), -1)).sum(-1).mean()
        opt.zero_grad(); loss.backward(); opt.step()
        if st % logevery == 0 or st == steps - 1:
            curve.append([st, round(loss.item(), 4)])
    Pd = {k: v.detach() for k, v in P.items()}
    ld = {k: (a.detach(), b.detach(), s) for k, (a, b, s) in lora.items()} if lora else None
    out = {'task': task, 'method': method, 'targets': list(targets), 'r': r, 'alpha': alpha, 'scaling': scaling, 'seed': seed,
           'steps': steps, 'lr': lr, 'batch': batch, 'trainable': ntrain, 'curve': curve}
    out['val'] = evaluate(Pd, task, ld, n=2000, split='val')['acc']
    out.update(evaluate(Pd, task, ld))
    out['pre_after'] = evaluate(Pd, 'pre', ld)['acc']       # how much of the pretraining task survives
    if keep:
        if ld:
            out['AB'] = {k: [a.tolist(), b.tolist()] for k, (a, b, s) in ld.items()}
        else:
            out['dW'] = {k: (Pd[k] - B0[k]).tolist() for k in LORA_TARGETS}
    return out


def load_runs():
    """runs.jsonl, with the heavy fields (adapter matrices AB, full fine-tuning dW) merged back from runs_heavy.jsonl.gz."""
    import gzip
    runs = [json.loads(l) for l in open(runs_path())] if os.path.exists(runs_path()) else []
    hp = os.path.join(MD, 'runs_heavy.jsonl.gz')
    if os.path.exists(hp):
        H = {}
        for l in gzip.open(hp, 'rt'):
            o = json.loads(l); H[o['key']] = o
        for o in runs:
            h = H.get(key(o))
            if h:
                o.update({k: v for k, v in h.items() if k != 'key'})
    return runs


def compact():
    """Move AB and dW out of runs.jsonl into runs_heavy.jsonl.gz (rounded to 6 significant digits) so the text log stays small."""
    import gzip
    runs = load_runs()
    rnd = lambda x: [rnd(v) for v in x] if isinstance(x, list) else float('%.6g' % x)
    with gzip.open(os.path.join(MD, 'runs_heavy.jsonl.gz'), 'wt') as g, open(runs_path() + '.tmp', 'w') as f:
        for o in runs:
            h = {k: o.pop(k) for k in ('AB', 'dW') if k in o}
            if h:
                g.write(json.dumps({'key': key(o), **{k: {m: rnd(x) for m, x in v.items()} for k, v in h.items()}}) + '\n')
            f.write(json.dumps(o) + '\n')
    os.replace(runs_path() + '.tmp', runs_path())


def runs_path():
    return os.path.join(MD, 'runs.jsonl')


def done_keys():
    ks = set()
    if os.path.exists(runs_path()):
        for line in open(runs_path()):
            o = json.loads(line); ks.add(key(o))
    return ks


def key(o):
    return '%s|%s|%s|%s|%s|%s|%s|%s' % (o['task'], o['method'], '+'.join(o['targets']), o['r'], o['scaling'], o['seed'], o['steps'], o.get('lr'))


STEPS = 2000
LRS = {'ft': (1e-3, 3e-3, 1e-2), 'lora': (3e-3, 1e-2, 3e-2)}
ALL6 = ('Wq', 'Wk', 'Wv', 'Wo', 'W1', 'W2')


def configs():
    """(task, method, targets, r, scaling, tuned): tuned configs pick their LR on a validation set with seed 0,
    then run seeds 1 and 2 at that LR; 'fixedlr' configs run three seeds at LR 1e-2 (the scaling comparison)."""
    C = []
    for t in ('v1', 'v4', 'v32', 'mlp4'):
        C.append((t, 'ft', (), 0, 'r', 'tuned'))
        sets = {'v1': (('Wq',), ('Wv',), ('Wq', 'Wv'), ALL6), 'v4': (('Wq',), ('Wv',), ('Wq', 'Wv'), ALL6), 'v32': (('Wq', 'Wv'), ALL6), 'mlp4': (('Wq', 'Wv'), ALL6)}[t]
        for tg in sets:
            for r in (1, 2, 4, 8, 16, 32):
                C.append((t, 'lora', tg, r, 'r', 'tuned'))
        for tg, r in ((('Wk',), 8), (('Wo',), 8), (('Wq', 'Wk'), 4), (('Wv', 'Wo'), 4), (('Wq', 'Wk', 'Wv', 'Wo'), 2), (('W1', 'W2'), 2)):
            C.append((t, 'lora', tg, r, 'r', 'tuned'))
        if t in ('v4', 'v32'):
            for sc in ('r', 'sqrt'):
                for r in (1, 2, 4, 8, 16, 32):
                    C.append((t, 'lora', ('Wq', 'Wv'), r, sc, 'fixedlr'))
    seen, out = set(), []
    for c in C:
        if c not in seen:
            seen.add(c); out.append(c)
    return out


def sweep():
    dk = done_keys()
    log = open(os.path.join(MD, 'sweep.log'), 'a')
    t0 = time.time(); n = 0; C = configs()
    print('configs', len(C), file=log, flush=True)
    def do(task, method, tg, r, sc, seed, lr, keep):
        probe = {'task': task, 'method': method, 'targets': list(tg), 'r': r, 'scaling': sc, 'seed': seed, 'steps': STEPS, 'lr': lr}
        if key(probe) in dk:
            return [json.loads(l) for l in open(runs_path()) if key(json.loads(l)) == key(probe)][0]
        o = adapt(task, method, tg, r, 8.0, sc, seed, STEPS, lr, keep=keep)
        with open(runs_path(), 'a') as f:
            f.write(json.dumps(o) + '\n')
        dk.add(key(o))
        print('%s %s %s r=%s %s seed=%d lr=%g val=%.4f acc=%.4f changed=%s  %.0fs' % (task, method, '+'.join(tg), r, sc, seed, lr, o['val'], o['acc'], o['changed'], time.time() - t0), file=log, flush=True)
        return o
    for ci, (task, method, tg, r, sc, mode) in enumerate(C):
        keep = (method == 'lora' and tuple(tg) == ('Wq', 'Wv') and r in (4, 16) and sc == 'r' and task in ('v1', 'v4', 'v32')) or method == 'ft'
        if mode == 'fixedlr':
            for sd in range(3):
                do(task, method, tg, r, sc, sd, 1e-2, False)
            continue
        cand = [do(task, method, tg, r, sc, 0, lr, keep) for lr in LRS[method]]
        best = max(cand, key=lambda o: o['val'])
        for sd in (1, 2):
            do(task, method, tg, r, sc, sd, best['lr'], keep)
        print('config %d/%d done' % (ci + 1, len(C)), file=log, flush=True)
    print('sweep complete %.0fs' % (time.time() - t0), file=log, flush=True)


def lrsweep():
    res = []
    log = open(os.path.join(MD, 'lrsweep.log'), 'w')
    for t in ('swap2', 'shift'):
        for lr in (3e-4, 1e-3, 3e-3):
            o = adapt(t, 'ft', (), 0, seed=0, steps=STEPS, lr=lr)
            res.append({k: o[k] for k in ('task', 'method', 'lr', 'acc', 'moved', 'kept', 'pre_after')}); print(res[-1], file=log, flush=True)
        for lr in (3e-3, 1e-2, 3e-2):
            for tg, r in ((('Wq', 'Wv'), 8), (('Wq', 'Wv'), 1)):
                o = adapt(t, 'lora', tg, r, seed=0, steps=STEPS, lr=lr)
                res.append({k: o[k] for k in ('task', 'method', 'targets', 'r', 'lr', 'acc', 'moved', 'kept', 'pre_after')}); print(res[-1], file=log, flush=True)
    json.dump(res, open(os.path.join(MD, 'lrsweep.json'), 'w'), indent=1)


B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def enc12(x, scale=None):
    """12 bits per number, two base64 characters; value = (code - 2048) * scale."""
    x = np.asarray(x, dtype=np.float64).ravel()
    if scale is None:
        m = float(np.abs(x).max()) if x.size else 0.0
        scale = m / 2047 if m > 0 else 1.0
    q = np.clip(np.round(x / scale), -2047, 2047).astype(int) + 2048
    return ''.join(B64[v >> 6] + B64[v & 63] for v in q), scale


def enc24(x):
    x = np.asarray(x, dtype=np.float64).ravel()
    m = float(np.abs(x).max()) if x.size else 0.0
    scale = m / 8388607 if m > 0 else 1.0
    q = np.clip(np.round(x / scale), -8388607, 8388607).astype(int) + 8388608
    return ''.join(B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63] for v in q), scale


def export():
    Q = load(os.path.join(MD, 'base_q.pt'))
    base = {'w': {}, 's': {}}
    for k in NAMES:
        v = Q[k].double().numpy()
        sc = float(np.abs(v).max()) / 127 if float(np.abs(v).max()) > 0 else 1.0
        code = np.round(v / sc)
        assert np.abs(code * sc - v).max() < 1e-6, k
        base['w'][k], base['s'][k] = enc12(code * sc, sc)
    rep = json.load(open(os.path.join(MD, 'pretrain_report.json')))
    pre_curve = []
    for line in open(os.path.join(MD, 'train_pre.log')):
        if line.startswith('step'):
            p = line.split(); pre_curve.append([int(p[1]), float(p[3]), float(p[5])])
    runs = load_runs()
    by = {}
    for o in runs:
        by.setdefault((o['task'], o['method'], '+'.join(o['targets']), o['r'], o['scaling']), []).append(o)
    def agg(L_, mode):
        a = np.array([o['acc'] for o in L_]); m = np.array([o['changed'] for o in L_]); kp = [o['kept'] for o in L_ if o['kept'] is not None]
        o0 = L_[0]
        return {'task': o0['task'], 'method': o0['method'], 'targets': '+'.join(o0['targets']), 'r': o0['r'], 'scaling': o0['scaling'], 'mode': mode,
                'trainable': o0['trainable'], 'lr': o0['lr'],
                'acc': round(float(a.mean()), 4), 'accs': [round(float(x), 3) for x in a],
                'changed': round(float(m.mean()), 4), 'changeds': [round(float(x), 3) for x in m],
                'kept': round(float(np.mean(kp)), 4) if kp else None, 'kepts': [round(float(x), 3) for x in kp]}
    summary = []
    for g, L_ in sorted(by.items()):
        s0 = [o for o in L_ if o['seed'] == 0 and o['lr'] in LRS[o['method']]]
        if len(s0) >= len(LRS[g[1]]):
            best = max(s0, key=lambda o: o['val'])
            T_ = sorted([o for o in L_ if o['lr'] == best['lr']], key=lambda o: o['seed'])
            seen = set(); T_ = [o for o in T_ if not (o['seed'] in seen or seen.add(o['seed']))]
            if len(T_) == 3:
                x = agg(T_, 'tuned'); summary.append(x)
        F_ = sorted([o for o in L_ if o['lr'] == 1e-2], key=lambda o: o['seed'])
        seen = set(); F_ = [o for o in F_ if not (o['seed'] in seen or seen.add(o['seed']))]
        if g[2] == 'Wq+Wv' and g[0] in ('v4', 'v32') and len(F_) == 3:
            summary.append(agg(F_, 'fixedlr'))
    adapters = {}
    for o in runs:
        if 'AB' in o and o['task'] in ('v1', 'v4', 'v32') and o['r'] in (4, 16) and o['seed'] in (1, 2):
            d = adapters.setdefault(o['task'], {}).setdefault(str(o['seed']), {}).setdefault(str(o['r']), {})
            for k, (A, Bm) in o['AB'].items():
                ea, sa = enc12(A); eb, sb = enc12(Bm)
                d[k] = {'A': ea, 'sA': sa, 'B': eb, 'sB': sb, 's': 8.0 / o['r']}
    spectra = {}
    for o in runs:
        if 'dW' in o and o['seed'] == 1:
            spectra[o['task']] = {k: [float('%.3g' % x) for x in np.linalg.svd(np.array(o['dW'][k]), compute_uv=False)] for k in LORA_TARGETS}
    curves = {}
    for o in runs:
        if o['seed'] == 1 and o['scaling'] == 'r' and (o['method'] == 'ft' or o['targets'] == ['Wq', 'Wv']):
            curves.setdefault(o['task'], {})['ft' if o['method'] == 'ft' else 'r%d' % o['r']] = o['curve']
    teachers = {}
    for t in TASKS:
        if t == 'pre':
            continue
        T_ = teacher(t)
        ea, sa = enc24(T_['A'].numpy()); eb, sb = enc24(T_['B'].numpy())
        teachers[t] = {'k': T_['k'], 'r': T_['r'], 'A': ea, 'sA': sa, 'B': eb, 'sB': sb, 'c': T_['c'],
                       'ratio': float(T_['B'].norm() / Q[T_['k']].norm()), 'base_agree': evaluate(Q, t)['acc']}
    # overlap between the held-out test sequences and one run's training stream (seed 1: 2,000 steps x 64)
    Xtr, _ = gen_pre(STEPS * 64, np.random.default_rng(2001))
    tr = set(map(bytes, Xtr.astype(np.int8)))
    Xte, _ = gen_pre(4000, np.random.default_rng(10_001))
    _, yte = gen_pre(4000, np.random.default_rng(10_001))
    hit = np.array([bytes(x) in tr for x in Xte.astype(np.int8)])
    overlap = {'train': len(Xtr), 'test': len(Xte), 'test_in_train': int(hit.sum()),
               'by_count': {int(c): [int(hit[yte == c].sum()), int((yte == c).sum())] for c in range(L + 1)}}
    ce = json.load(open(os.path.join(MD, 'check_engine.json'))) if os.path.exists(os.path.join(MD, 'check_engine.json')) else {}
    check = {k: ce.get(k) for k in ('forward_max_logit_diff', 'forward_same_argmax', 'forward_n', 'js_merged_vs_unmerged_max_diff', 'teacher_labels_same', 'svd_max_singular_value_diff', 'verdict')}
    if ce:
        check['train_max_loss_diff'] = max(t['max_loss_diff'] for t in ce['traces']); check['train_max_weight_diff'] = max(t['max_weight_diff'] for t in ce['traces'])
        check['traces'] = [t['config'] for t in ce['traces']]
    data = {'overlap': overlap, 'check': check, 'teachers': teachers, 'cfg': {'V': V, 'L': L, 'D': D, 'NH': NH, 'DFF': DFF, 'NC': NC, 'steps': STEPS, 'lrs': LRS, 'batch': 64, 'alpha': 8.0, 'params': rep['params']},
            'base': base, 'pre': {k: rep[k] for k in ('float', 'quantised', 'label_smoothing')}, 'summary': summary, 'adapters': adapters, 'spectra': spectra}
    s = '// Generated by train.py export: the 8-bit base model (12-bit codes), the sweep summary, kept adapters and spectra.\nwindow.LORA_DATA=' + json.dumps(data, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(s)
    print('export: %d bytes, %d runs, %d groups' % (len(s), len(runs), len(summary)))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'pre'
    if cmd == 'pre':
        pretrain()
    elif cmd == 'lrsweep':
        lrsweep()
    elif cmd == 'sweep':
        sweep()
    elif cmd == 'export':
        export()
    elif cmd == 'compact':
        compact()
    else:
        raise SystemExit('unknown command')
