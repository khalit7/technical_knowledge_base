"""Toy Vision Transformer against a small ResNet on the "which shape appears twice" task (parts/21_js_gen.js).

  node gen_data.js $DATA 64000                                  (the data, from the page's own generator)
  DATA=$DATA uv run --with torch --with numpy python train.py run vit 2000 0    (one run: arch, train size, seed)
  DATA=$DATA uv run --with torch --with numpy python train.py sweep            (every run in SWEEP, skips finished ones)
  DATA=$DATA uv run --with torch --with numpy python train.py export           (quantise the shipped models, write parts/20_model_data.js)

The ViT follows the paper's Eq. 1 to 4: non-overlapping P x P patches, one linear projection E, a learnable [class]
token, learnable 1D position embeddings, pre-LayerNorm encoder blocks (MSA then a 2-layer GELU MLP, residuals after
each), y = LN(z_L^0) and a linear head (the paper's fine-tuning head; it pre-trains with a one-hidden-layer MLP head).
The ResNet is BiT-style (GroupNorm instead of BatchNorm), as the paper's baselines. Every run uses the same
hyperparameters and step count whatever the training-set size, with early stopping on a fixed validation set, as the
paper's JFT-subset experiment does (paper section 4.3). Optimiser: Adam(W) b1 0.9, b2 0.999, weight decay 0.1, linear
warmup then linear decay (paper section 4.1 and Appendix B.1). Batch 128 here, not 4096.
"""
import base64, json, math, os, sys, time
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('DATA', os.path.join(HERE, 'data'))
RUNS = os.path.join(HERE, 'model', 'runs')
CK = os.environ.get('CK', os.path.join(DATA, 'ck'))
S, P, K = 28, 4, 5
VIT = dict(D=32, L=4, H=4, M=128, pe=True)
STEPS, BATCH, WARM, EVAL = 2000, 128, 100, 200
LR = {'vit': 1e-3, 'vitnopos': 1e-3, 'cnn': 2e-3}
SIZES = [500, 2000, 8000, 64000]
SWEEP = [('vit', 64000, 0)] + [(a, n, 0) for n in (500, 2000, 8000) for a in ('vit', 'cnn')] + [('cnn', 64000, 0)] + [('vitnopos', 64000, 0)]
SHIP = [('vit', 64000, 0), ('vit', 2000, 0)]  # the no-position model is reported by its accuracy only, to keep the page under 300 KB
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def load(name, n=None):
    a = np.fromfile(os.path.join(DATA, name), dtype=np.uint8).reshape(-1, 785)
    if n: a = a[:n]
    return torch.tensor(a[:, 1:].astype(np.float32) / 255.).view(-1, 1, S, S), torch.tensor(a[:, 0].astype(np.int64))


class ViT(nn.Module):
    def __init__(self, c):
        super().__init__(); D, M = c['D'], c['M']; self.c = c; N = (S // P) ** 2
        self.patch = nn.Linear(P * P, D)
        self.cls = nn.Parameter(torch.zeros(D))
        self.pos = nn.Parameter(torch.randn(N + 1, D) * 0.02) if c['pe'] else None
        self.blocks = nn.ModuleList()
        for _ in range(c['L']):
            b = nn.Module(); b.n1 = nn.LayerNorm(D); b.qkv = nn.Linear(D, 3 * D); b.o = nn.Linear(D, D)
            b.n2 = nn.LayerNorm(D); b.m1 = nn.Linear(D, M); b.m2 = nn.Linear(M, D); self.blocks.append(b)
        self.nf = nn.LayerNorm(D); self.head = nn.Linear(D, K)
        nn.init.zeros_(self.head.weight); nn.init.zeros_(self.head.bias)   # zero-initialised head, as the paper's fine-tuning head

    @staticmethod
    def patches(x):  # (B,1,28,28) -> (B,49,16), raster order, each patch flattened row by row
        B = x.shape[0]; g = S // P
        return x.view(B, g, P, g, P).permute(0, 1, 3, 2, 4).reshape(B, g * g, P * P)

    def forward(self, x, keep=False):
        c = self.c; B = x.shape[0]; D, H = c['D'], c['H']; dh = D // H
        z = self.patch(self.patches(x))                                     # Eq. 1: x_p^i E
        z = torch.cat([self.cls.view(1, 1, D).expand(B, 1, D), z], 1)       # prepend x_class
        if self.pos is not None: z = z + self.pos                           # + E_pos
        atts = []
        for b in self.blocks:
            h = b.n1(z); q, k, v = b.qkv(h).view(B, -1, 3, H, dh).permute(2, 0, 3, 1, 4)
            a = torch.softmax(q @ k.transpose(-1, -2) / math.sqrt(dh), -1)  # Eq. 6
            if keep: atts.append(a.detach())
            z = z + b.o((a @ v).transpose(1, 2).reshape(B, -1, D))          # Eq. 2 (MSA, Eq. 5 to 8)
            z = z + b.m2(F.gelu(b.m1(b.n2(z)), approximate='tanh'))          # Eq. 3
        y = self.nf(z[:, 0])                                                # Eq. 4
        out = self.head(y)
        return (out, atts) if keep else out

    def order(self):
        t = ['patch.weight', 'patch.bias', 'cls'] + (['pos'] if self.pos is not None else [])
        for i in range(self.c['L']):
            t += ['blocks.%d.%s' % (i, n) for n in ('n1.weight', 'n1.bias', 'qkv.weight', 'qkv.bias', 'o.weight', 'o.bias',
                                                     'n2.weight', 'n2.bias', 'm1.weight', 'm1.bias', 'm2.weight', 'm2.bias')]
        return t + ['nf.weight', 'nf.bias', 'head.weight', 'head.bias']


class Block(nn.Module):
    def __init__(self, ci, co, st):
        super().__init__()
        self.c1 = nn.Conv2d(ci, co, 3, st, 1, bias=False); self.g1 = nn.GroupNorm(8, co)
        self.c2 = nn.Conv2d(co, co, 3, 1, 1, bias=False); self.g2 = nn.GroupNorm(8, co)
        self.sc = None if (ci == co and st == 1) else nn.Sequential(nn.Conv2d(ci, co, 1, st, bias=False), nn.GroupNorm(8, co))

    def forward(self, x):
        y = self.g2(self.c2(F.relu(self.g1(self.c1(x)))))
        return F.relu(y + (x if self.sc is None else self.sc(x)))


class ResNet(nn.Module):
    """A small BiT-style ResNet matched to the toy ViT in parameters and compute: a stride-2 3x3 stem (BiT downsamples in its stem
    too), three residual blocks with GroupNorm (16 channels at 14x14, then 32 and 48 at 7x7), global average pool, linear head."""
    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(nn.Conv2d(1, 16, 3, 2, 1, bias=False), nn.GroupNorm(8, 16), nn.ReLU())
        self.body = nn.Sequential(Block(16, 16, 1), Block(16, 32, 2), Block(32, 48, 1))
        self.head = nn.Linear(48, K)

    def forward(self, x):
        return self.head(self.body(self.stem(x)).mean((2, 3)))


def make(arch):
    torch_model = ViT(dict(VIT, pe=(arch != 'vitnopos'))) if arch.startswith('vit') else ResNet()
    return torch_model


def macs(arch):
    """Multiply-accumulates of one forward pass, counted by formula (matrix multiplies and convolutions only)."""
    if arch.startswith('vit'):
        D, L, M = VIT['D'], VIT['L'], VIT['M']; T = (S // P) ** 2 + 1
        return (T - 1) * P * P * D + L * (T * (3 * D * D + D * D + 2 * D * M) + 2 * T * T * D) + D * K
    m = 14 * 14 * 9 * 16 + 14 * 14 * 9 * 16 * 16 * 2 + 7 * 7 * (9 * 16 * 32 + 9 * 32 * 32 + 16 * 32) + 7 * 7 * (9 * 32 * 48 + 9 * 48 * 48 + 32 * 48)
    return m + 48 * K


@torch.no_grad()
def accuracy(m, X, Y):
    m.eval(); ok = 0
    for i in range(0, len(X), 1000): ok += (m(X[i:i + 1000]).argmax(1) == Y[i:i + 1000]).sum().item()
    m.train(); return ok / len(X)


def run(arch, n, seed):
    os.makedirs(RUNS, exist_ok=True); os.makedirs(CK, exist_ok=True)
    name = '%s_n%d_s%d' % (arch, n, seed); path = os.path.join(RUNS, name + '.json')
    if os.path.exists(path): print('done already', name); return
    torch.manual_seed(seed); np.random.seed(seed)
    Xtr, Ytr = load('train.u8', n); Xva, Yva = load('val.u8'); Xte, Yte = load('test.u8')
    m = make(arch); params = sum(p.numel() for p in m.parameters())
    opt = torch.optim.AdamW(m.parameters(), lr=LR[arch], betas=(0.9, 0.999), weight_decay=0.1)
    sch = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: (s + 1) / WARM if s < WARM else max(0.0, (STEPS - s) / (STEPS - WARM)))
    g = torch.Generator().manual_seed(seed); best, best_state, best_step, log, t0, tl = -1, None, 0, [], time.time(), []
    for step in range(1, STEPS + 1):
        idx = torch.randint(0, n, (BATCH,), generator=g)
        loss = F.cross_entropy(m(Xtr[idx]), Ytr[idx])
        opt.zero_grad(); loss.backward(); opt.step(); sch.step(); tl.append(loss.item())
        if step % 50 == 0: print(name, 'step', step, 'loss %.3f' % loss.item(), 'secs %.0f' % (time.time() - t0), file=sys.stderr, flush=True)
        if step % EVAL == 0:
            va = accuracy(m, Xva, Yva); tr = accuracy(m, Xtr[:2000], Ytr[:2000])
            log.append([step, round(float(np.mean(tl)), 4), round(tr, 4), round(va, 4)]); tl = []
            if va > best: best, best_step, best_state = va, step, {k: v.clone() for k, v in m.state_dict().items()}
    m.load_state_dict(best_state); te = accuracy(m, Xte, Yte)
    rec = dict(arch=arch, n=n, seed=seed, params=params, macs=macs(arch), steps=STEPS, batch=BATCH, lr=LR[arch], best_step=best_step,
               val=round(best, 4), test=round(te, 4), epochs=round(STEPS * BATCH / n, 1), secs=round(time.time() - t0, 1), log=log)
    json.dump(rec, open(path, 'w'))
    if arch.startswith('vit'): torch.save({'arch': arch, 'state': best_state}, os.path.join(CK, name + '.pt'))
    print(name, 'params', params, 'val', best, 'test', te, 'at step', best_step, 'secs', rec['secs'], flush=True)


def quantise(state, order):
    """6-bit matrices (one base64 character per weight, one scale character per row, as the Transformer page); float16 vectors."""
    mq, sq, vb, tmax, deq = [], [], bytearray(), [], {}
    for n in order:
        w = state[n].float().numpy()
        if w.ndim == 2:
            amax = float(np.abs(w).max()); tm = float('%.5g' % (amax * 1.0001)); tmax.append(tm); rows = []
            for row in w:
                ra = max(float(np.abs(row).max()), 1e-12)
                code = min(63, max(0, int(math.floor(-8 * math.log2(ra / tm)))))
                while code > 0 and tm * 2 ** (-code / 8) < ra: code -= 1
                s = tm * 2 ** (-code / 8) / 31
                q = np.clip(np.round(row / s), -31, 31).astype(int)
                sq.append(B64[code]); mq.append(''.join(B64[v + 32] for v in q)); rows.append(q * s)
            deq[n] = torch.tensor(np.array(rows), dtype=torch.float32)
        else:
            h = w.astype(np.float16); vb += h.tobytes(); deq[n] = torch.tensor(h.astype(np.float32))
    return ''.join(mq), ''.join(sq), base64.b64encode(bytes(vb)).decode(), tmax, deq


def export():
    Xte, Yte = load('test.u8'); out = {'cfg': dict(VIT, S=S, P=P, K=K), 'models': {}}; report = {}
    for arch, n, seed in SHIP:
        name = '%s_n%d_s%d' % (arch, n, seed)
        if not os.path.exists(os.path.join(CK, name + '.pt')): print('not trained yet, skipped:', name); continue
        ck = torch.load(os.path.join(CK, name + '.pt'), weights_only=False)
        m = make(arch); m.load_state_dict(ck['state']); order = m.order()
        mq, sq, vb, tmax, deq = quantise(ck['state'], order)
        mq_model = make(arch); sd = dict(ck['state']); sd.update(deq); mq_model.load_state_dict(sd)
        rec = json.load(open(os.path.join(RUNS, name + '.json')))
        acc_q = accuracy(mq_model, Xte, Yte)
        os.makedirs(os.path.join(HERE, 'model'), exist_ok=True)
        torch.save({'arch': arch, 'state': mq_model.state_dict()}, os.path.join(HERE, 'model', name + '_q.pt'))
        key = arch + ('' if n == 64000 else '_small')
        out['models'][key] = {'run': name, 'pe': arch != 'vitnopos', 'n': n, 'tmax': tmax, 'm': mq, 's': sq, 'v': vb,
                              'test_float': rec['test'], 'test_q': round(acc_q, 4)}
        report[key] = dict(run=name, params=rec['params'], test_float=rec['test'], test_q=acc_q, chars=len(mq) + len(sq) + len(vb))
        print(key, report[key])
    js = '// Generated by train.py export: the toy ViT models (configuration and weights).\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.VITW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    json.dump(report, open(os.path.join(HERE, 'model', 'report.json'), 'w'), indent=1)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


if __name__ == '__main__':
    torch.set_num_threads(2)
    cmd = sys.argv[1]
    if cmd == 'run': run(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
    elif cmd == 'sweep':
        for a, n, s in SWEEP: run(a, n, s)
    elif cmd == 'export': export()
