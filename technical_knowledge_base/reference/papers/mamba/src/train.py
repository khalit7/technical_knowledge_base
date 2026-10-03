"""Toy Mamba models for the paper page, trained on the paper's two synthetic tasks (Section 4.1) at toy scale.

Tasks (generated fresh every step, as Appendix E.1 does):
  sc  Selective Copying: K=6 data tokens (vocabulary 1..8) scattered at random positions among CTX=48 noise
      tokens (0), then K marker tokens (9); the model must output the data tokens in order at the markers.
      Paper: length 4096, 16 data tokens, vocabulary 16.
  ih  Induction Heads: random tokens 0..14, a trigger token 15 placed once at a random position and followed by
      the answer token, and the trigger again as the last token; the model must output the answer.
      Trained at length 64 (paper: 256), tested up to 2^20 (as the paper).

Variants (every model has 2 layers, d_model 32, as the paper's 2-layer synthetic models):
  s6    the Mamba block with its selective SSM (Algorithm 2): Delta, B, C computed from the input
  s4    the same block with an LTI SSM (Algorithm 1): Delta, B, C fixed parameters (S4D-Real), the paper's "Mamba / S4" row
  attn  (ih only) a 2-layer Transformer with RoPE, RMSNorm and SwiGLU, 4 heads, the paper's MHA-RoPE baseline

  uv run --with torch --with numpy python train.py [sc_s6 sc_s4 ih_s6 ih_s4 ih_attn]   (train; default all)
  uv run --with torch --with numpy python train.py export                              (quantise, write parts/20_model_data.js)
  uv run --with torch --with numpy python train.py extrap                              (ih test accuracy up to 2^20, model/extrap.json)
"""
import base64, hashlib, json, math, os, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
D, E, N, KC = 32, 2, 16, 4          # d_model, expansion, state size, conv width
DI = E * D                           # 64
R = math.ceil(D / 16)                # dt_rank, as the released code: ceil(d_model / 16) = 2
LAYERS = 2
TASK = {'sc': dict(V=10, K=6, CTX=48, NOISE=0, MARK=9), 'ih': dict(V=16, TRIG=15, L=64)}
VARIANTS = ['sc_s6', 'sc_s4', 'ih_s6', 'ih_s4', 'ih_attn']
STEPS = {'sc': 8000, 'ih': 8000}     # at most; stops early once 500 held-out sequences are all right at 3 checks running
BATCH, LR = 32, 1e-3
# overrides for the long runs: MAMBA_STEPS=20000 MAMBA_NOSTOP=1 MAMBA_OUT=long python train.py ih_s6 ih_s4 ih_attn
OUT = os.environ.get('MAMBA_OUT', '')
NOSTOP = bool(os.environ.get('MAMBA_NOSTOP'))
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


# ---------------------------------------------------------------- data
def make_sc(n, g, ctx=None):
    t = TASK['sc']; ctx = ctx or t['CTX']; K = t['K']
    x = torch.zeros(n, ctx + K, dtype=torch.long); y = torch.full((n, ctx + K), -100, dtype=torch.long)
    for i in range(n):
        pos = torch.randperm(ctx, generator=g)[:K].sort().values
        tok = torch.randint(1, 9, (K,), generator=g)
        x[i, pos] = tok; x[i, ctx:] = t['MARK']; y[i, ctx:] = tok
    return x, y


def make_ih(n, g, L=None):
    t = TASK['ih']; L = L or t['L']
    x = torch.randint(0, 15, (n, L), generator=g)
    p = torch.randint(0, L - 2, (n,), generator=g)
    ans = torch.randint(0, 15, (n,), generator=g)
    x[torch.arange(n), p] = t['TRIG']; x[torch.arange(n), p + 1] = ans; x[:, -1] = t['TRIG']
    y = torch.full((n, L), -100, dtype=torch.long); y[:, -1] = ans
    return x, y


def make(task, n, g, L=None):
    return make_sc(n, g, L) if task == 'sc' else make_ih(n, g, L)


# ---------------------------------------------------------------- models
class RMSNorm(nn.Module):
    def __init__(self, d):
        super().__init__(); self.weight = nn.Parameter(torch.ones(d))

    def forward(self, x):
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + 1e-5) * self.weight


def inv_softplus(v):
    return v + torch.log(-torch.expm1(-v))


def scan_ref(a, b):
    """Parallel scan of h_t = a_t * h_(t-1) + b_t along dim 1 (Hillis-Steele doubling: log2 L steps). The pair (a, b)
    composes associatively: (a1, b1) then (a2, b2) = (a1 a2, a2 b1 + b2), which is why the time-varying recurrence can
    still be parallelised (Section 3.3.2). Used to check ScanFn."""
    L, k = a.shape[1], 1
    while k < L:
        b = torch.cat([b[:, :k], b[:, k:] + a[:, k:] * b[:, :-k]], 1)
        a = torch.cat([a[:, :k], a[:, k:] * a[:, :-k]], 1)
        k *= 2
    return b


class ScanFn(torch.autograd.Function):
    """h_t = a_t h_(t-1) + b_t with a hand-written backward (itself a reverse scan): g_t = dL/dh_t + a_(t+1) g_(t+1),
    dL/db_t = g_t, dL/da_t = g_t h_(t-1). Same maths as autograd, about 10 times faster on CPU for these shapes."""
    @staticmethod
    def forward(ctx, a, b):
        h = torch.empty_like(b); cur = torch.zeros_like(b[:, 0])
        for t in range(b.shape[1]):
            cur = a[:, t] * cur + b[:, t]; h[:, t] = cur
        ctx.save_for_backward(a, h)
        return h

    @staticmethod
    def backward(ctx, gh):
        a, h = ctx.saved_tensors; L = a.shape[1]
        gb = torch.empty_like(gh); cur = torch.zeros_like(gh[:, 0])
        for t in range(L - 1, -1, -1):
            cur = gh[:, t] + (a[:, t + 1] * cur if t + 1 < L else 0); gb[:, t] = cur
        ga = torch.zeros_like(a); ga[:, 1:] = gb[:, 1:] * h[:, :-1]
        return ga, gb


def scan(a, b):
    return ScanFn.apply(a, b)


def causal_conv(x, w, bias):
    """Depthwise causal conv1d (kernel KC) written as KC shifted multiplies: the same result as nn.Conv1d(groups=DI,
    padding=KC-1)[..., :L], much faster to differentiate on CPU. x (B, L, DI), w (DI, 1, KC)."""
    L = x.shape[1]; xp = F.pad(x, (0, 0, KC - 1, 0)); y = bias
    for k in range(KC):
        y = y + xp[:, k:k + L] * w[:, 0, k]
    return y


class MambaBlock(nn.Module):
    """As mamba_simple.py in state-spaces/mamba: in_proj -> (x, z); x: causal depthwise conv, SiLU, SSM; y * SiLU(z); out_proj."""

    def __init__(self, selective, g):
        super().__init__()
        self.sel = selective
        self.in_proj = nn.Linear(D, 2 * DI, bias=False)
        self.conv = nn.Conv1d(DI, DI, KC, groups=DI, padding=KC - 1, bias=True)
        dt = torch.exp(torch.rand(DI, generator=g) * (math.log(0.1) - math.log(0.001)) + math.log(0.001))
        if selective:
            self.x_proj = nn.Linear(DI, R + 2 * N, bias=False)
            self.dt_proj = nn.Linear(R, DI, bias=True)
            nn.init.uniform_(self.dt_proj.weight, -R ** -0.5, R ** -0.5)
            with torch.no_grad(): self.dt_proj.bias.copy_(inv_softplus(dt))   # tau_Delta^-1(Uniform[0.001, 0.1]), Section 3.6
        else:
            self.dt_bias = nn.Parameter(inv_softplus(dt))
            self.Bp = nn.Parameter(torch.randn(DI, N, generator=g) * 0.5)
            self.Cp = nn.Parameter(torch.randn(DI, N, generator=g) * 0.5)
        self.A_log = nn.Parameter(torch.log(torch.arange(1, N + 1, dtype=torch.float32)).repeat(DI, 1))  # S4D-Real: A_n = -(n+1)
        self.Dskip = nn.Parameter(torch.ones(DI))
        self.out_proj = nn.Linear(DI, D, bias=False)

    def forward(self, u, want=False):
        Bsz, L, _ = u.shape
        xz = self.in_proj(u); x, z = xz.chunk(2, -1)
        x = F.silu(causal_conv(x, self.conv.weight, self.conv.bias))           # (B, L, DI)
        A = -torch.exp(self.A_log)                                              # (DI, N)
        if self.sel:
            dbc = self.x_proj(x); dt, Bm, Cm = dbc.split([R, N, N], -1)
            delta = F.softplus(self.dt_proj(dt))                                # (B, L, DI)
        else:
            delta = F.softplus(self.dt_bias).expand(Bsz, L, DI)
            Bm = Cm = None
        dA = torch.exp(delta[..., None] * A)                                   # Abar = exp(Delta A), (B, L, DI, N)
        if self.sel:
            dBx = delta[..., None] * Bm[:, :, None, :] * x[..., None]            # Bbar x = Delta B x (as the released selective_scan_ref)
        else:
            dBx = delta[..., None] * self.Bp * x[..., None]
        h = scan(dA, dBx)                                                       # h_t = Abar_t h_(t-1) + Bbar_t x_t, all t at once
        y = (h * (Cm[:, :, None, :] if self.sel else self.Cp)).sum(-1) + x * self.Dskip
        out = self.out_proj(y * F.silu(z))
        return (out, delta) if want else out


class Mamba(nn.Module):
    def __init__(self, V, selective, seed=0):
        super().__init__(); g = torch.Generator().manual_seed(seed)
        self.emb = nn.Embedding(V, D)
        self.blocks = nn.ModuleList([MambaBlock(selective, g) for _ in range(LAYERS)])
        self.norms = nn.ModuleList([RMSNorm(D) for _ in range(LAYERS)])
        self.nf = RMSNorm(D)

    def forward(self, ids, want=False):
        h = self.emb(ids); deltas = []
        for n, b in zip(self.norms, self.blocks):
            o = b(n(h), want)
            if want: o, dl = o; deltas.append(dl)
            h = h + o
        lg = self.nf(h) @ self.emb.weight.T                                     # tied head, as the released models
        return (lg, deltas) if want else lg


def rope(x, base=10000.0):
    T, dh = x.shape[-2], x.shape[-1]
    inv = base ** (-torch.arange(0, dh, 2, dtype=torch.float32) / dh)
    a = torch.arange(T, dtype=torch.float32)[:, None] * inv[None]
    c, s = a.cos(), a.sin(); x1, x2 = x[..., 0::2], x[..., 1::2]
    return torch.stack([x1 * c - x2 * s, x2 * c + x1 * s], -1).flatten(-2)


class Attn(nn.Module):
    """2-layer pre-norm Transformer: RMSNorm, causal multi-head attention with RoPE (4 heads), SwiGLU MLP (hidden 64), no biases."""
    H, FF = 4, 64

    def __init__(self, V, seed=0):
        super().__init__(); torch.manual_seed(seed)
        self.emb = nn.Embedding(V, D)
        self.qkv = nn.ModuleList([nn.Linear(D, 3 * D, bias=False) for _ in range(LAYERS)])
        self.o = nn.ModuleList([nn.Linear(D, D, bias=False) for _ in range(LAYERS)])
        self.w12 = nn.ModuleList([nn.Linear(D, 2 * self.FF, bias=False) for _ in range(LAYERS)])
        self.w3 = nn.ModuleList([nn.Linear(self.FF, D, bias=False) for _ in range(LAYERS)])
        self.n1 = nn.ModuleList([RMSNorm(D) for _ in range(LAYERS)])
        self.n2 = nn.ModuleList([RMSNorm(D) for _ in range(LAYERS)])
        self.nf = RMSNorm(D)

    def forward(self, ids, want=False):
        Bsz, T = ids.shape; h = self.emb(ids); dh = D // self.H; atts = []
        mask = torch.ones(T, T, dtype=torch.bool).tril()
        for l in range(LAYERS):
            q, k, v = self.qkv[l](self.n1[l](h)).view(Bsz, T, 3, self.H, dh).permute(2, 0, 3, 1, 4)
            q, k = rope(q), rope(k)
            s = (q @ k.transpose(-1, -2)) / math.sqrt(dh)
            a = s.masked_fill(~mask, float('-inf')).softmax(-1)
            if want: atts.append(a)
            h = h + self.o[l]((a @ v).transpose(1, 2).reshape(Bsz, T, D))
            g1, g2 = self.w12[l](self.n2[l](h)).chunk(2, -1)
            h = h + self.w3[l](F.silu(g1) * g2)
        lg = self.nf(h) @ self.emb.weight.T
        return (lg, atts) if want else lg


def build(name):
    task, kind = name.split('_'); V = TASK[task]['V']
    return Attn(V) if kind == 'attn' else Mamba(V, kind == 's6')


def nparams(m):
    return sum(p.numel() for p in m.parameters())


def accuracy(m, x, y, bs=256):
    """Share of target positions predicted exactly, and share of sequences with every target right."""
    tok = seq = tot = 0
    with torch.no_grad():
        for i in range(0, len(x), bs):
            lg = m(x[i:i + bs]); yy = y[i:i + bs]; ok = (lg.argmax(-1) == yy) | (yy < 0)
            tok += ((lg.argmax(-1) == yy) & (yy >= 0)).sum().item(); tot += (yy >= 0).sum().item(); seq += ok.all(-1).sum().item()
    return tok / tot, seq / len(x)


def test_set(task, L=None, n=1000, seed=999):
    return make(task, n, torch.Generator().manual_seed(seed + (L or 0)), L)


def hashes(x):
    return {hashlib.md5(r.numpy().tobytes()).hexdigest() for r in x}


def train(name):
    task = name.split('_')[0]; torch.manual_seed(1)
    m = build(name); opt = torch.optim.AdamW(m.parameters(), lr=LR, weight_decay=0.0, betas=(0.9, 0.95))
    g = torch.Generator().manual_seed(2024); xt, yt = test_set(task); seen = set(); log = []; t0 = time.time()
    test_h = hashes(xt)
    steps = int(os.environ.get('MAMBA_STEPS', STEPS[task])); streak = 0
    os.makedirs(os.path.join(HERE, 'model', OUT), exist_ok=True)
    logf = open(os.path.join(HERE, 'model', OUT, 'train_%s.log' % name), 'w')
    for step in range(1, steps + 1):
        lr = LR * min(1.0, step / 200)                                          # constant LR after a short warmup (paper: constant LR)
        for pg in opt.param_groups: pg['lr'] = lr
        x, y = make(task, BATCH, g); seen |= hashes(x) & test_h
        lg = m(x); loss = F.cross_entropy(lg.reshape(-1, lg.shape[-1]), y.reshape(-1), ignore_index=-100)
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        if step % 250 == 0 or step == 1:
            m.eval(); ta, sa = accuracy(m, xt[:500], yt[:500]); m.train()
            rec = dict(step=step, loss=round(loss.item(), 4), tok=round(ta, 4), seq=round(sa, 4), s=round(time.time() - t0, 1))
            log.append(rec); print(name, rec, file=logf, flush=True)
            streak = streak + 1 if sa == 1.0 else 0
            if streak >= 3 and not NOSTOP: break
    m.eval(); ta, sa = accuracy(m, xt, yt)
    res = dict(tok=round(ta, 4), seq=round(sa, 4), n=len(xt))
    torch.save({'name': name, 'state': m.state_dict(), 'log': log, 'res': res, 'params': nparams(m), 'seconds': round(time.time() - t0),
                'test_seen_in_training': len(seen), 'train_sequences': step * BATCH, 'steps': step}, os.path.join(HERE, 'model', OUT, name + '.pt'))
    print(name, 'done', res, 'params', nparams(m), 'test seqs also drawn in training:', len(seen), file=logf, flush=True)


# ---------------------------------------------------------------- export (as the Transformer and RoFormer pages)
def tensor_names(m):
    return [n for n, _ in m.named_parameters()]


def quantise(state, names):
    """6-bit matrices (one base64 char per weight, one scale char per row), float16 vectors. conv weights stay float16."""
    mq, sq, vb, tmax, deq, kinds = [], [], bytearray(), [], {}, []
    for n in names:
        w = state[n].float().numpy()
        mat = w.ndim == 2
        kinds.append('m' if mat else 'v')
        if mat:
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
    out = {'cfg': dict(D=D, E=E, N=N, KC=KC, R=R, LAYERS=LAYERS, H=Attn.H, FF=Attn.FF), 'task': TASK, 'variants': {}}
    report = {}
    for name in VARIANTS:
        ck = torch.load(os.path.join(HERE, 'model', name + '.pt'), weights_only=False)
        m = build(name); m.load_state_dict(ck['state']); m.eval(); names = tensor_names(m)
        shapes = {n: list(ck['state'][n].shape) for n in names}
        mq, sq, vb, tmax, deq = quantise(ck['state'], names)
        mqm = build(name); sd = dict(ck['state']); sd.update(deq); mqm.load_state_dict(sd); mqm.eval()
        task = name.split('_')[0]; xt, yt = test_set(task); ta, sa = accuracy(mqm, xt, yt)
        torch.save({'name': name, 'state': mqm.state_dict()}, os.path.join(HERE, 'model', name + '_q.pt'))
        out['variants'][name] = {'names': names, 'shapes': shapes, 'tmax': tmax, 'm': mq, 's': sq, 'v': vb,
                                 'params': ck['params'], 'res_float': ck['res'], 'res_q': dict(tok=round(ta, 4), seq=round(sa, 4)),
                                 'log': [[r['step'], r['loss'], r['tok']] for r in ck['log']]}
        report[name] = dict(params=ck['params'], seconds=ck['seconds'], res_float=ck['res'], res_q=dict(tok=round(ta, 4), seq=round(sa, 4)),
                            test_seen_in_training=ck['test_seen_in_training'], train_sequences=ck['train_sequences'],
                            chars=len(mq) + len(sq) + len(vb), log_tail=ck['log'][-1])
        print(name, report[name])
    ex = os.path.join(HERE, 'model', 'extrap.json')
    if os.path.exists(ex): out['extrap'] = json.load(open(ex))
    js = '// Generated by train.py export: the toy models\' configuration, weights, logs and measured accuracies.\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors (and conv weights) are float16.\n' \
         'window.MBW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    json.dump(report, open(os.path.join(HERE, 'model', 'report.json'), 'w'), indent=1)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


def mamba_long(m, ids, chunk=2048):
    """Last-position logits of a Mamba model on very long sequences: the same maths as Mamba.forward, run chunk by
    chunk with the SSM state and the conv inputs carried across chunks (memory stays bounded at 2^20 tokens)."""
    Bsz, L = ids.shape
    with torch.no_grad():
        carry = [dict(h=torch.zeros(Bsz, DI, N), xin=torch.zeros(Bsz, KC - 1, DI)) for _ in m.blocks]
        for s0 in range(0, L, chunk):
            h = m.emb(ids[:, s0:s0 + chunk]); Lc = h.shape[1]
            for li, (nm, b) in enumerate(zip(m.norms, m.blocks)):
                u = nm(h); xz = b.in_proj(u); x, z = xz.chunk(2, -1)
                xc = torch.cat([carry[li]['xin'], x], 1); carry[li]['xin'] = xc[:, -(KC - 1):]
                y = b.conv.bias
                for k in range(KC): y = y + xc[:, k:k + Lc] * b.conv.weight[:, 0, k]
                x = F.silu(y); A = -torch.exp(b.A_log)
                if b.sel:
                    dt, Bm, Cm = b.x_proj(x).split([R, N, N], -1); delta = F.softplus(b.dt_proj(dt))
                else:
                    delta = F.softplus(b.dt_bias).expand(Bsz, Lc, DI)
                dA = torch.exp(delta[..., None] * A)
                dBx = delta[..., None] * (Bm[:, :, None, :] if b.sel else b.Bp) * x[..., None]
                dBx[:, 0] = dBx[:, 0] + dA[:, 0] * carry[li]['h']
                hs = ScanFn.apply(dA, dBx); carry[li]['h'] = hs[:, -1]
                yy = (hs * (Cm[:, :, None, :] if b.sel else b.Cp)).sum(-1) + x * b.Dskip
                h = h + b.out_proj(yy * F.silu(z))
        return m.nf(h[:, -1]) @ m.emb.weight.T


def attn_long(m, ids, qchunk=1024):
    """Last-position logits of the attention model, queries processed in blocks so a 2^14 x 2^14 score matrix never exists."""
    Bsz, T = ids.shape; dh = D // m.H
    with torch.no_grad():
        h = m.emb(ids)
        for l in range(LAYERS):
            q, k, v = m.qkv[l](m.n1[l](h)).view(Bsz, T, 3, m.H, dh).permute(2, 0, 3, 1, 4)
            q, k = rope(q), rope(k)
            rows = range(T - 1, T) if l == LAYERS - 1 else range(0, T)
            starts = [T - 1] if l == LAYERS - 1 else list(range(0, T, qchunk))
            outs = []
            for s0 in starts:
                e = min(T, s0 + (1 if l == LAYERS - 1 else qchunk))
                sc = (q[:, :, s0:e] @ k.transpose(-1, -2)) / math.sqrt(dh)
                mask = torch.arange(T)[None, :] <= torch.arange(s0, e)[:, None]
                outs.append(sc.masked_fill(~mask, float('-inf')).softmax(-1) @ v)
            o = torch.cat(outs, 2).transpose(1, 2).reshape(Bsz, -1, D)
            hh = h[:, -1:] if l == LAYERS - 1 else h
            hh = hh + m.o[l](o)
            g1, g2 = m.w12[l](m.n2[l](hh)).chunk(2, -1)
            hh = hh + m.w3[l](F.silu(g1) * g2)
            h = hh
        return m.nf(h[:, -1]) @ m.emb.weight.T


def extrap():
    """Induction-heads accuracy at test lengths 2^6 .. 2^20 (quantised weights; attention only to 2^13 here, the paper went to 2^14)."""
    path = os.path.join(HERE, 'model', 'extrap.json')
    res = json.load(open(path)) if os.path.exists(path) else {}
    for name in ('ih_s6', 'ih_s4', 'ih_attn'):
        m = build(name); m.load_state_dict(torch.load(os.path.join(HERE, 'model', name + '_q.pt'), weights_only=False)['state']); m.eval()
        res.setdefault(name, {})
        for k in range(6, 21):
            if name == 'ih_attn' and k > 13: break   # 2^13 already took 12 minutes on a shared CPU; the paper stopped at 2^14
            if str(k) in res[name]: continue
            L = 2 ** k; n = 200 if k <= 12 else (64 if k <= 16 else 16)
            x, y = test_set('ih', L, n=n); t0 = time.time(); ok = 0
            for i in range(0, n, 8):
                lg = (attn_long if name == 'ih_attn' else mamba_long)(m, x[i:i + 8])
                ok += (lg.argmax(-1) == y[i:i + 8, -1]).sum().item()
            res[name][str(k)] = dict(acc=round(ok / n, 4), n=n)
            print(name, L, res[name][str(k)], round(time.time() - t0, 1), 's', flush=True)
            json.dump(res, open(path, 'w'), indent=1)


if __name__ == '__main__':
    torch.set_num_threads(2)
    os.makedirs(os.path.join(HERE, 'model'), exist_ok=True)
    if sys.argv[1:2] == ['export']: export()
    elif sys.argv[1:2] == ['extrap']: extrap()
    else:
        for n in (sys.argv[1:] or VARIANTS): train(n)
