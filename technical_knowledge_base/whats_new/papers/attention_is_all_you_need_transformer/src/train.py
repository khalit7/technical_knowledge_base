"""Train the page's toy Transformer, built exactly like the paper's base model at toy scale, and
export its weights for the browser.

  uv run --with torch python train.py            # trains every variant, writes ../src/model/*.pt
  uv run --with torch python train.py export     # quantises and writes parts/20_model_data.js

The architecture follows Vaswani et al. 2017, section 3 (https://arxiv.org/html/1706.03762v7#S3):
post-LN residual blocks LayerNorm(x + Dropout(Sublayer(x))), sinusoidal positional encoding added
to embeddings scaled by sqrt(d_model), multi-head scaled dot-product attention, ReLU FFN with
d_ff = 4 d_model, masked decoder self-attention, cross-attention to the encoder output, and one
embedding matrix shared by the encoder input, the decoder input and the pre-softmax projection.
Training follows section 5: Adam beta1 0.9, beta2 0.98, eps 1e-9, the warmup then inverse square
root schedule, residual dropout 0.1, label smoothing 0.1. Greedy decoding replaces beam search.

Variants (same size, same data, same seed): full; nope (no positional encoding); h1 (one head).
"""
import base64, json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import grammar as G

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = dict(d=24, h=4, N=2, dff=96, drop=0.1, ls=0.1, warmup=4000, steps=16000, batch=128, seed=7)
VARIANTS = {'full': {}, 'nope': {'pe': False}, 'h1': {'h': 1}}
VOCAB = G.vocab(); IDX = {w: i for i, w in enumerate(VOCAB)}
PAD, BOS, EOS = 0, 1, 2
MAXLEN = 20


def pe_table(n, d):
    """PE(pos, 2i) = sin(pos / 10000^(2i/d)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d)) (section 3.5)."""
    pe = np.zeros((n, d))
    pos = np.arange(n)[:, None]
    div = 10000 ** (np.arange(0, d, 2) / d)
    pe[:, 0::2] = np.sin(pos / div)
    pe[:, 1::2] = np.cos(pos / div)
    return torch.tensor(pe, dtype=torch.float32)


class MHA(nn.Module):
    def __init__(s, d, h):
        super().__init__(); s.h = h; s.dk = d // h
        s.q, s.k, s.v, s.o = (nn.Linear(d, d) for _ in range(4))

    def forward(s, x, m, mask, keep=None):
        B, T, D = x.shape; S = m.shape[1]
        q = s.q(x).view(B, T, s.h, s.dk).transpose(1, 2)
        k = s.k(m).view(B, S, s.h, s.dk).transpose(1, 2)
        v = s.v(m).view(B, S, s.h, s.dk).transpose(1, 2)
        a = q @ k.transpose(-1, -2) / math.sqrt(s.dk)       # equation 1
        a = a.masked_fill(~mask, float('-inf')).softmax(-1)
        if keep is not None: keep.append(a.detach())
        return s.o((a @ v).transpose(1, 2).reshape(B, T, D))


class FFN(nn.Module):
    def __init__(s, d, dff):
        super().__init__(); s.w1 = nn.Linear(d, dff); s.w2 = nn.Linear(dff, d)

    def forward(s, x):
        return s.w2(F.relu(s.w1(x)))                       # equation 2


class EncLayer(nn.Module):
    def __init__(s, c):
        super().__init__(); s.att = MHA(c['d'], c['h']); s.ffn = FFN(c['d'], c['dff'])
        s.n1 = nn.LayerNorm(c['d']); s.n2 = nn.LayerNorm(c['d']); s.dr = nn.Dropout(c['drop'])

    def forward(s, x, mask, keep=None):
        x = s.n1(x + s.dr(s.att(x, x, mask, keep)))
        return s.n2(x + s.dr(s.ffn(x)))


class DecLayer(nn.Module):
    def __init__(s, c):
        super().__init__(); s.att = MHA(c['d'], c['h']); s.crs = MHA(c['d'], c['h']); s.ffn = FFN(c['d'], c['dff'])
        s.n1, s.n2, s.n3 = (nn.LayerNorm(c['d']) for _ in range(3)); s.dr = nn.Dropout(c['drop'])

    def forward(s, y, mem, smask, tmask, keep=None, keepc=None):
        y = s.n1(y + s.dr(s.att(y, y, tmask, keep)))
        y = s.n2(y + s.dr(s.crs(y, mem, smask, keepc)))
        return s.n3(y + s.dr(s.ffn(y)))


class Transformer(nn.Module):
    def __init__(s, c):
        super().__init__(); s.c = c
        s.emb = nn.Embedding(len(VOCAB), c['d'])
        nn.init.normal_(s.emb.weight, 0, c['d'] ** -0.5)
        s.enc = nn.ModuleList(EncLayer(c) for _ in range(c['N']))
        s.dec = nn.ModuleList(DecLayer(c) for _ in range(c['N']))
        s.register_buffer('pe', pe_table(MAXLEN + 2, c['d']))
        s.dr = nn.Dropout(c['drop'])

    def embed(s, ids):
        x = s.emb(ids) * math.sqrt(s.c['d'])              # section 3.4: weights multiplied by sqrt(d_model)
        if s.c.get('pe', True): x = x + s.pe[:ids.shape[1]]
        return s.dr(x)

    def encode(s, src, keep=None):
        smask = (src != PAD)[:, None, None, :]
        x = s.embed(src)
        for i, L in enumerate(s.enc):
            k = [] if keep is not None else None
            x = L(x, smask, k)
            if keep is not None: keep['enc'].append(k[0])
        return x, smask

    def decode(s, tgt, mem, smask, keep=None):
        T = tgt.shape[1]
        tmask = torch.tril(torch.ones(T, T, dtype=torch.bool))[None, None] & (tgt != PAD)[:, None, None, :]
        y = s.embed(tgt)
        for L in s.dec:
            k, kc = ([], []) if keep is not None else (None, None)
            y = L(y, mem, smask, tmask, k, kc)
            if keep is not None: keep['dec'].append(k[0]); keep['crs'].append(kc[0])
        return y @ s.emb.weight.T                           # shared pre-softmax projection, no bias

    def forward(s, src, tgt):
        mem, smask = s.encode(src)
        return s.decode(tgt, mem, smask)

    @torch.no_grad()
    def greedy(s, src):
        mem, smask = s.encode(src)
        B = src.shape[0]
        out = torch.full((B, 1), BOS, dtype=torch.long)
        done = torch.zeros(B, dtype=torch.bool)
        for _ in range(MAXLEN):
            nxt = s.decode(out, mem, smask)[:, -1].argmax(-1)
            nxt = torch.where(done, torch.full_like(nxt, PAD), nxt)
            out = torch.cat([out, nxt[:, None]], 1)
            done |= nxt == EOS
            if done.all(): break
        return out[:, 1:]


def enc(words, n):
    ids = [IDX[w] for w in words]
    return ids + [PAD] * (n - len(ids))


def batch(sents):
    S = max(len(s) for s in sents)
    tg = [G.translate(s) for s in sents]
    T = max(len(t) for t in tg) + 1
    src = torch.tensor([enc(s, S) for s in sents])
    tin = torch.tensor([[BOS] + enc(t, T - 1) for t in tg])
    tout = torch.tensor([enc(t + ['</s>'], T) for t in tg])
    return src, tin, tout


def lrate(step, c):
    """Equation 3 (section 5.3): d_model^-0.5 * min(step^-0.5, step * warmup^-1.5)."""
    step = max(step, 1)
    return c['d'] ** -0.5 * min(step ** -0.5, step * c['warmup'] ** -1.5)


def test_set(n=2000, seed=12345, exclude=()):
    r = random.Random(seed); out = []; seen = set(exclude)
    while len(out) < n:
        s = tuple(G.sample(r))
        if s in seen: continue
        seen.add(s); out.append(list(s))
    return out


def accuracy(model, sents, bs=500):
    model.eval(); ok = tok = ntok = 0
    for i in range(0, len(sents), bs):
        chunk = sents[i:i + bs]
        src = torch.tensor([enc(s, max(len(x) for x in chunk)) for s in chunk])
        hyp = model.greedy(src)
        for s, hrow in zip(chunk, hyp.tolist()):
            ref = G.translate(s) + ['</s>']
            got = [VOCAB[j] for j in hrow][:len(ref)]
            got = got + ['<pad>'] * (len(ref) - len(got))
            ok += got == ref
            tok += sum(a == b for a, b in zip(got, ref)); ntok += len(ref)
    return ok / len(sents), tok / ntok


def train(name):
    c = dict(CFG, **VARIANTS[name])
    torch.manual_seed(c['seed']); r = random.Random(c['seed'])
    m = Transformer(c)
    opt = torch.optim.Adam(m.parameters(), lr=1.0, betas=(0.9, 0.98), eps=1e-9)
    sch = torch.optim.lr_scheduler.LambdaLR(opt, lambda st: lrate(st + 1, c))
    seen = set(); t0 = time.time(); log = []
    for step in range(1, c['steps'] + 1):
        m.train()
        sents = [G.sample(r) for _ in range(c['batch'])]
        for s in sents: seen.add(tuple(s))
        src, tin, tout = batch(sents)
        logits = m(src, tin)
        loss = F.cross_entropy(logits.reshape(-1, logits.shape[-1]), tout.reshape(-1), ignore_index=PAD, label_smoothing=c['ls'])
        opt.zero_grad(); loss.backward(); opt.step(); sch.step()
        if step % 1000 == 0:
            log.append((step, round(loss.item(), 4)))
            print(name, step, round(loss.item(), 4), round(time.time() - t0), 's', flush=True)
    os.makedirs(os.path.join(HERE, 'model'), exist_ok=True)
    test = test_set(exclude=seen)
    acc, tacc = accuracy(m, test)
    print(name, 'test sentence accuracy', acc, 'token accuracy', tacc)
    torch.save({'cfg': c, 'state': m.state_dict(), 'log': log, 'test': test, 'acc': acc, 'tacc': tacc,
                'n_train_unique': len(seen), 'params': sum(p.numel() for p in m.parameters())},
               os.path.join(HERE, 'model', name + '.pt'))


# ---- export: matrices 6-bit per row (one base64 character per weight), vectors float16 ----
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def tensor_order(c):
    """The order in which the browser reads the tensors (parts/22_js_model.js mirrors it)."""
    names = ['emb.weight']
    for i in range(c['N']):
        p = 'enc.%d.' % i
        names += [p + 'att.' + x + '.' + y for x in 'qkvo' for y in ('weight', 'bias')]
        names += [p + 'ffn.w1.weight', p + 'ffn.w1.bias', p + 'ffn.w2.weight', p + 'ffn.w2.bias']
        names += [p + n + '.' + y for n in ('n1', 'n2') for y in ('weight', 'bias')]
    for i in range(c['N']):
        p = 'dec.%d.' % i
        names += [p + a + '.' + x + '.' + y for a in ('att', 'crs') for x in 'qkvo' for y in ('weight', 'bias')]
        names += [p + 'ffn.w1.weight', p + 'ffn.w1.bias', p + 'ffn.w2.weight', p + 'ffn.w2.bias']
        names += [p + n + '.' + y for n in ('n1', 'n2', 'n3') for y in ('weight', 'bias')]
    return names


def quantise(state, c):
    """Returns (matrix chars, row scale chars, float16 vector bytes, tensor max list) and the dequantised state."""
    mq, sq, vb, tmax, deq = [], [], bytearray(), [], {}
    for n in tensor_order(c):
        w = state[n].float().numpy()
        if w.ndim == 2:
            amax = float(np.abs(w).max()); tm = float('%.5g' % (amax * 1.0001)); tmax.append(tm)
            rows = []
            for row in w:
                ra = max(float(np.abs(row).max()), 1e-12)
                code = min(63, max(0, int(math.floor(-8 * math.log2(ra / tm)))))  # row scale tm * 2^(-code/8) >= ra
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
    out = {'vocab': VOCAB, 'cfg': {k: CFG[k] for k in ('d', 'h', 'N', 'dff')}, 'maxlen': MAXLEN, 'variants': {}}
    report = {}
    for name in VARIANTS:
        ck = torch.load(os.path.join(HERE, 'model', name + '.pt'), weights_only=False)
        c = ck['cfg']; m = Transformer(c); m.load_state_dict(ck['state'])
        mq, sq, vb, tmax, deq = quantise(ck['state'], c)
        mq_model = Transformer(c); sd = dict(ck['state']); sd.update(deq); mq_model.load_state_dict(sd)
        test = ck['test']  # held out: no test sentence occurs in that variant's training stream
        acc_q, tacc_q = accuracy(mq_model, test)
        torch.save({'cfg': c, 'state': mq_model.state_dict()}, os.path.join(HERE, 'model', name + '_q.pt'))
        out['variants'][name] = {'h': c['h'], 'pe': c.get('pe', True), 'tmax': tmax, 'm': mq, 's': sq, 'v': vb,
                                 'acc': round(acc_q, 4), 'tacc': round(tacc_q, 4), 'acc_float': round(ck['acc'], 4),
                                 'log': ck['log']}
        report[name] = dict(params=ck['params'], acc_float=ck['acc'], tacc_float=ck['tacc'], acc_q=acc_q, tacc_q=tacc_q,
                            chars=len(mq) + len(sq) + len(vb), n_train_unique=ck['n_train_unique'])
        print(name, report[name])
    js = '// Generated by train.py export: the toy Transformer\'s vocabulary, configuration and weights.\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.TMW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    json.dump(report, open(os.path.join(HERE, 'model', 'report.json'), 'w'), indent=1)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


if __name__ == '__main__':
    torch.set_num_threads(3)
    if len(sys.argv) > 1 and sys.argv[1] == 'export':
        export()
    else:
        for n in (sys.argv[1:] or VARIANTS):
            train(n)
