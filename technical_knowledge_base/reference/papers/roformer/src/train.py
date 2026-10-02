"""Train the page's toy models: one causal attention layer whose only difference between variants is how
position enters, trained at length 32 and tested up to length 128.

Task (illustrative, built to make relative position the whole job): a stream of random digits 0-9; at every
position t >= 4 the model must output (x[t-1] + x[t-4]) mod 10. Solving it needs one head to look exactly 1 back
and one exactly 4 back, whatever t is, so it is a pure relative-offset task, the case RoPE is designed for (§3.1).

Variants (identical except for position):
  rope      RoPE on q and k (§3.2, Equation 34 realisation, interleaved pairs, theta_i = 10000^(-2(i-1)/d_head))
  sin       the sinusoidal absolute encoding of Vaswani et al. added to the input (Equation 4), the baseline RoPE replaced
  learned   a learned absolute table of 128 rows added to the input (BERT's choice); rows past 31 never get a gradient
  nope      no position at all (the causal mask is the only order signal)
  lin_rope  linear attention, elu(x)+1 feature map, RoPE on the numerator only (Equation 19)
  lin_nope  the same linear attention with no position

Model: d = 32, 4 heads of 8 (4 rotation pairs per head), one pre-LN block (attention + ReLU MLP of 128), final LN, linear readout; biases on.
Training: Adam (0.9, 0.98, eps 1e-9) with linear warmup then inverse square root decay (the schedule of §4.1.2),
batch 64, length 32, fixed seed per variant. Fresh random sequences every step, so the test set (seeded separately)
cannot overlap the training stream except by chance, which overlap() measures.

usage:  uv run --with torch --with numpy python train.py [variant ...]   (all variants, one after another)
        uv run --with torch --with numpy python train.py export          (quantise, write parts/20_model_data.js)
"""
import base64, json, math, os, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
V, LAGS, TRAIN_LEN, MAXLEN = 10, (1, 4), 32, 128
CFG = dict(d=32, h=int(os.environ.get('HEADS', 4)), dff=128, steps=int(os.environ.get('STEPS', 6000)), batch=64, warmup=400,
           peak=float(os.environ.get('PEAK', 3e-3)))
TAG = os.environ.get('TAG', '')
VARIANTS = ['rope', 'sin', 'learned', 'nope', 'lin_rope', 'lin_nope']
START = max(LAGS)
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def targets(x):
    y = torch.full_like(x, -100)
    y[:, START:] = (x[:, START - LAGS[0]:x.shape[1] - LAGS[0]] + x[:, START - LAGS[1]:x.shape[1] - LAGS[1]]) % V
    return y


def sinusoid(n, d):
    pos = torch.arange(n, dtype=torch.float64)[:, None]
    j = torch.arange(d)[None, :]
    div = torch.pow(10000.0, (j - j % 2).double() / d)
    return torch.where(j % 2 == 0, torch.sin(pos / div), torch.cos(pos / div)).float()


def rope_cos_sin(n, dh, base=10000.0, pos_scale=1.0):
    i = torch.arange(dh // 2, dtype=torch.float64)
    theta = base ** (-2 * i / dh)                      # theta_1..theta_{d/2} = 10000^(-2(i-1)/d), i from 1
    ang = (torch.arange(n, dtype=torch.float64) * pos_scale)[:, None] * theta[None, :]
    return torch.cos(ang).repeat_interleave(2, -1).float(), torch.sin(ang).repeat_interleave(2, -1).float()


def rotate(x, cos, sin):
    """Equation 34: R x = x * cos + (-x2, x1, -x4, x3, ...) * sin, on the last dimension."""
    x2 = torch.stack((-x[..., 1::2], x[..., 0::2]), -1).flatten(-2)
    return x * cos + x2 * sin


class Model(nn.Module):
    def __init__(self, kind, c):
        super().__init__()
        d, h, dff = c['d'], c['h'], c['dff']
        self.kind, self.d, self.h, self.dh = kind, d, h, d // h
        self.window, self.pi = None, 1.0   # test-time options: attend only to the last `window` keys; scale positions by pi
        self.emb = nn.Embedding(V, d)
        if kind == 'learned':
            self.pos = nn.Parameter(torch.randn(MAXLEN, d) * 0.02)
        self.n1, self.n2, self.nf = nn.LayerNorm(d), nn.LayerNorm(d), nn.LayerNorm(d)
        self.q, self.k, self.v, self.o = (nn.Linear(d, d) for _ in range(4))
        self.w1, self.w2 = nn.Linear(d, dff), nn.Linear(dff, d)
        self.out = nn.Linear(d, V)
        self.register_buffer('pe', sinusoid(MAXLEN, d), persistent=False)
        cs, sn = rope_cos_sin(MAXLEN, self.dh)
        self.register_buffer('cos', cs, persistent=False)
        self.register_buffer('sin', sn, persistent=False)

    def attend(self, x, want=False):
        B, T, _ = x.shape
        sp = lambda t: t.view(B, T, self.h, self.dh).transpose(1, 2)
        q, k, v = sp(self.q(x)), sp(self.k(x)), sp(self.v(x))
        if self.pi != 1.0:
            cos, sin = rope_cos_sin(T, self.dh, pos_scale=self.pi)
        else:
            cos, sin = self.cos[:T], self.sin[:T]
        mask = torch.ones(T, T, dtype=torch.bool, device=x.device).tril()
        if self.window:
            mask = mask & ~torch.ones(T, T, dtype=torch.bool, device=x.device).tril(-self.window)
        if self.kind.startswith('lin'):
            fq, fk = F.elu(q) + 1, F.elu(k) + 1
            den = (fq @ fk.transpose(-1, -2)).masked_fill(~mask, 0).sum(-1, keepdim=True)
            if self.kind == 'lin_rope':
                fq, fk = rotate(fq, cos, sin), rotate(fk, cos, sin)
            a = (fq @ fk.transpose(-1, -2)).masked_fill(~mask, 0) / den   # Equation 19: rotated numerator, plain denominator
        else:
            if self.kind == 'rope':
                q, k = rotate(q, cos, sin), rotate(k, cos, sin)
            s = (q @ k.transpose(-1, -2)) / math.sqrt(self.dh)
            a = s.masked_fill(~mask, float('-inf')).softmax(-1)
        o = (a @ v).transpose(1, 2).reshape(B, T, self.d)
        return (self.o(o), a) if want else self.o(o)

    def forward(self, ids, want=False):
        T = ids.shape[1]
        x = self.emb(ids)
        if self.kind == 'sin':
            x = x + self.pe[:T]
        elif self.kind == 'learned':
            x = x + self.pos[:T]
        at = self.attend(self.n1(x), want)
        if want: at, a = at
        x = x + at
        x = x + self.w2(F.relu(self.w1(self.n2(x))))
        lg = self.out(self.nf(x))
        return (lg, a) if want else lg


def batch(g, n, T):
    return torch.randint(0, V, (n, T), generator=g)


@torch.no_grad()
def per_position(m, test):
    """test: (n, T) digits. Returns accuracy at each position t >= START (list) and overall."""
    y = targets(test)
    p = m(test).argmax(-1)
    ok = (p == y).float()
    return ok[:, START:].mean(0).tolist(), ok[:, START:].mean().item()


def make_test(T, n=500, seed=12345):
    g = torch.Generator().manual_seed(seed + T)
    return batch(g, n, T)


def train(name):
    torch.manual_seed(0)
    c = dict(CFG)
    m = Model(name, c)
    opt = torch.optim.Adam(m.parameters(), lr=c['peak'], betas=(0.9, 0.98), eps=1e-9)
    sched = lambda s: min((s + 1) / c['warmup'], math.sqrt(c['warmup'] / (s + 1)))
    g = torch.Generator().manual_seed(1000 + VARIANTS.index(name))
    log, t0 = [], time.time()
    logf = open(os.path.join(HERE, 'model', 'train_%s%s.log' % (name, TAG)), 'w')
    test32 = make_test(TRAIN_LEN)
    hashes = set()
    for step in range(c['steps']):
        for pg in opt.param_groups: pg['lr'] = c['peak'] * sched(step)
        x = batch(g, c['batch'], TRAIN_LEN)
        if step < 2000:  # sample of the training stream for the overlap measure
            hashes.update(hash(r.numpy().tobytes()) for r in x[:8])
        lg = m(x)
        loss = F.cross_entropy(lg.reshape(-1, V), targets(x).reshape(-1), ignore_index=-100)
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 100 == 0 or step == c['steps'] - 1:
            m.eval(); _, acc = per_position(m, test32); m.train()
            log.append([step, round(loss.item(), 4), round(acc, 4)])
            line = '%s step %d loss %.4f heldout@32 %.4f  %.0fs' % (name, step, loss.item(), acc, time.time() - t0)
            print(line, file=logf, flush=True)
    m.eval()
    res = {}
    for T in (32, 48, 64, 96, 128):
        pp, acc = per_position(m, make_test(T))
        res[T] = dict(acc=acc, per_pos=[round(v, 4) for v in pp])
    test_h = set(hash(r.numpy().tobytes()) for r in make_test(TRAIN_LEN))
    params = sum(p.numel() for n_, p in m.named_parameters())
    ck = dict(cfg=c, kind=name, state=m.state_dict(), log=log, res=res, params=params,
              overlap=len(test_h & hashes), seconds=round(time.time() - t0))
    torch.save(ck, os.path.join(HERE, 'model', name + TAG + '.pt'))
    print('%s done %ds params %d acc32 %.4f acc128 %.4f' % (name, time.time() - t0, params, res[32]['acc'], res[128]['acc']), file=logf, flush=True)


def tensor_order(kind):
    names = ['emb.weight'] + (['pos'] if kind == 'learned' else [])
    names += [x + '.' + y for x in 'qkvo' for y in ('weight', 'bias')]
    names += ['w1.weight', 'w1.bias', 'w2.weight', 'w2.bias', 'out.weight', 'out.bias']
    names += [n + '.' + y for n in ('n1', 'n2', 'nf') for y in ('weight', 'bias')]
    return names


def quantise(state, kind):
    """6-bit matrices (one base64 char per weight, one scale char per row), float16 vectors (as the Transformer page)."""
    mq, sq, vb, tmax, deq = [], [], bytearray(), [], {}
    for n in tensor_order(kind):
        w = state[n].float().numpy()
        if w.ndim == 2:
            amax = float(np.abs(w).max()); tm = float('%.5g' % (amax * 1.0001)); tmax.append(tm)
            rows = []
            for row in w:
                ra = max(float(np.abs(row).max()), 1e-12)
                code = min(63, max(0, int(math.floor(-8 * math.log2(ra / tm)))))
                while code > 0 and tm * 2 ** (-code / 8) < ra: code -= 1
                s = tm * 2 ** (-code / 8) / 31
                q = np.clip(np.round(row / s), -31, 31).astype(int)
                sq.append(B64[code]); mq.append(''.join(B64[v + 32] for v in q))
                rows.append(q * s)
            deq[n] = torch.tensor(np.array(rows), dtype=torch.float32)
        else:
            h = w.astype(np.float16); vb += h.tobytes()
            deq[n] = torch.tensor(h.astype(np.float32))
    return ''.join(mq), ''.join(sq), base64.b64encode(bytes(vb)).decode(), tmax, deq


def export():
    out = {'cfg': {k: CFG[k] for k in ('d', 'h', 'dff')}, 'V': V, 'lags': LAGS, 'train_len': TRAIN_LEN, 'maxlen': MAXLEN, 'variants': {}}
    report = {}
    for name in VARIANTS:
        ck = torch.load(os.path.join(HERE, 'model', name + '.pt'), weights_only=False)
        m = Model(name, ck['cfg']); m.load_state_dict(ck['state']); m.eval()
        mq, sq, vb, tmax, deq = quantise(ck['state'], name)
        mqm = Model(name, ck['cfg']); sd = dict(ck['state']); sd.update(deq); mqm.load_state_dict(sd); mqm.eval()
        resq, resw = {}, {}
        for T in (32, 48, 64, 96, 128):
            pp, acc = per_position(mqm, make_test(T))
            resq[T] = dict(acc=round(acc, 4), per_pos=[round(v, 4) for v in pp])
        mqm.window = TRAIN_LEN   # test-time sliding window: only offsets 0..31 ever seen
        pp, acc = per_position(mqm, make_test(128)); resw = dict(acc=round(acc, 4), per_pos=[round(v, 4) for v in pp])
        mqm.window = None
        respi = None
        if name in ('rope', 'lin_rope'):   # Position Interpolation at test time, no fine-tuning: positions times 32/128
            mqm.pi = TRAIN_LEN / 128
            pp, acc = per_position(mqm, make_test(128)); respi = dict(acc=round(acc, 4), per_pos=[round(v, 4) for v in pp])
            mqm.pi = 1.0
        torch.save({'cfg': ck['cfg'], 'kind': name, 'state': mqm.state_dict()}, os.path.join(HERE, 'model', name + '_q.pt'))
        out['variants'][name] = {'tmax': tmax, 'm': mq, 's': sq, 'v': vb, 'res': resq, 'win': resw, 'pi': respi,
                                 'res_float': {T: round(r['acc'], 4) for T, r in ck['res'].items()}, 'log': ck['log']}
        report[name] = dict(params=ck['params'], seconds=ck['seconds'], overlap_test_vs_train_sample=ck['overlap'],
                            acc_float={T: round(r['acc'], 4) for T, r in ck['res'].items()},
                            acc_q={T: r['acc'] for T, r in resq.items()}, acc_q_window32_at128=resw['acc'],
                            acc_q_pi_at128=respi and respi['acc'], log_tail=ck['log'][-1], chars=len(mq) + len(sq) + len(vb))
        print(name, report[name])
    js = '// Generated by train.py export: the toy models\' configuration, weights and measured accuracies.\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.RFW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    json.dump(report, open(os.path.join(HERE, 'model', 'report.json'), 'w'), indent=1)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


if __name__ == '__main__':
    torch.set_num_threads(2)
    if len(sys.argv) > 1 and sys.argv[1] == 'export':
        export()
    else:
        for n in (sys.argv[1:] or VARIANTS):
            train(n)
