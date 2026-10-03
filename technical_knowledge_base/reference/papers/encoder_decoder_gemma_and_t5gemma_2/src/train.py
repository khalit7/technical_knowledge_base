"""Toy replication of the T5Gemma adaptation recipe (arXiv 2504.06225, Sections 3 and 6) at toy scale.

  OMP_NUM_THREADS=2 uv run --with torch python train.py           (all runs, one after another; log in model/train.log)
  OMP_NUM_THREADS=2 uv run --with torch python train.py <run>     (one run)

The task: the input is 12 digits followed by one operation token, the output is the 12 digits transformed by that
operation: add k (mod 10), optionally after reversing, for k = 0..4 (10 operations). Chosen by three pilots of the
small decoder-only model alone, before any adaptation run (logs in model/pilot1/): 10 digits and 4 operations was
solved within 300 steps (too easy to separate anything), 16 digits and 20 operations stayed at chance for 800 steps
(too hard for the budget), 12 digits and 10 operations is learned at about step 600 of 1500.
The operation comes LAST, so in a causal stack no input digit "knows" the operation; a bidirectional encoder lets
every digit see it. That is the property the paper credits for its gains (bidirectional attention, Section 6).

Runs (every number reported on the page comes from model/report.json):
  pre_small   decoder-only, d=64, 2 layers, causal LM over "x op | y", PRE steps   (the "Gemma 2 2B" of the toy)
  pre_big     decoder-only, d=128, 3 layers, same data, PRE steps                  (the "Gemma 2 9B")
  then ADAPT steps each, all starting from the checkpoints above:
  dec_cont    pre_small trained ADAPT more steps as a decoder-only model           (the "extra compute" ablation)
  ad_bi       small-small encoder-decoder adapted from pre_small, bidirectional encoder, cross-attn copied from self-attn
  ad_causal   same, encoder kept causal                                            (the "causal encoder" ablation, 4.1/4.7 points)
  scratch     small-small encoder-decoder from random init, ADAPT steps            (Table 4, same adaptation budget)
  scratch2x   same, PRE + ADAPT steps                                              (Table 4, more tokens than adaptation)
  big_small_w0    big-small: encoder from pre_big, decoder from pre_small, random cross-attn, no warmup
  big_small_w100  same with 100 steps of cross-attention-only warmup                (the paper's K, Section 3.2)
  big_small_w500  same with 500 steps of warmup (half the adaptation budget)
Held-out: 2000 inputs drawn uniformly with a separate seed; overlap with the training stream is measured.

Positions: the toy uses learned absolute position embeddings, the paper's models use RoPE. A first full run had the
encoder-decoder's decoder restart its positions at 0, so every copied decoder weight met position vectors it was
never trained with (the target sat at positions 13 to 25 in the decoder-only model). That is a flaw of the toy, not
something the paper's RoPE models face, so the adaptation runs were repeated with the decoder's positions continuing
from 13 (DEC_POS0); scratch runs use the same layout. The first run's log and report are kept in model/pilot2_pos0/.
"""
import json, math, os, random, sys, time
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'model')
os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, 'train.log'), 'a')

N = 12                       # digits per input
OPS = ['add%d' % k for k in range(5)] + ['rev_add%d' % k for k in range(5)]   # 10 operations
DIG = list(range(10))
BOS, SEP, EOS = 10 + len(OPS), 11 + len(OPS), 12 + len(OPS)
VOCAB = 13 + len(OPS)
PRE, ADAPT, BATCH, LR = 1500, 1000, 64, 2e-3
DEC_POS0 = N + 1   # the decoder's positions continue after the encoder's, as in the decoder-only layout (see below)


def log(*a):
    s = ' '.join(str(x) for x in a)
    print(s, flush=True); LOG.write(s + '\n'); LOG.flush()


def apply(op, x):
    k = int(op[-1])
    if op.startswith('rev'): x = x[::-1]
    return [(v + k) % 10 for v in x]


def sample(rng):
    x = [rng.randrange(10) for _ in range(N)]
    o = rng.randrange(len(OPS))
    return x, o, apply(OPS[o], x)


def batch(rng, n=BATCH):
    xs, os_, ys = zip(*[sample(rng) for _ in range(n)])
    src = torch.tensor([list(x) + [10 + o] for x, o in zip(xs, os_)])          # encoder input: digits then op
    tgt = torch.tensor([[BOS] + list(y) for y in ys])                           # decoder input
    lab = torch.tensor([list(y) + [EOS] for y in ys])                           # decoder labels
    return src, tgt, lab


# ---------------------------------------------------------------- model
class Attn(nn.Module):
    def __init__(self, dq, dkv, h, hd):
        super().__init__()
        self.h, self.hd = h, hd
        self.q = nn.Linear(dq, h * hd, bias=False); self.k = nn.Linear(dkv, h * hd, bias=False)
        self.v = nn.Linear(dkv, h * hd, bias=False); self.o = nn.Linear(h * hd, dq, bias=False)

    def forward(self, x, kv, mask):
        B, T, _ = x.shape; S = kv.shape[1]
        q = self.q(x).view(B, T, self.h, self.hd).transpose(1, 2)
        k = self.k(kv).view(B, S, self.h, self.hd).transpose(1, 2)
        v = self.v(kv).view(B, S, self.h, self.hd).transpose(1, 2)
        a = (q @ k.transpose(-1, -2)) / math.sqrt(self.hd)
        if mask is not None: a = a.masked_fill(~mask, float('-inf'))
        return self.o((a.softmax(-1) @ v).transpose(1, 2).reshape(B, T, -1))


class Block(nn.Module):
    """Pre-norm block. cross=None for a decoder-only or encoder block."""
    def __init__(self, d, h, ff, cross_from=None):
        super().__init__()
        self.n1 = nn.LayerNorm(d); self.att = Attn(d, d, h, d // h)
        self.n2 = nn.LayerNorm(d); self.ff = nn.Sequential(nn.Linear(d, ff), nn.GELU(), nn.Linear(ff, d))
        self.cross = None
        if cross_from is not None:
            self.nc = nn.LayerNorm(d); self.cross = Attn(d, cross_from, h, d // h)

    def forward(self, x, mask, mem=None):
        x = x + self.att(self.n1(x), self.n1(x), mask)
        if self.cross is not None: x = x + self.cross(self.nc(x), mem, None)
        return x + self.ff(self.n2(x))


class Stack(nn.Module):
    def __init__(self, d, L, h, ff, maxlen=40, cross_from=None):
        super().__init__()
        self.emb = nn.Embedding(VOCAB, d); self.pos = nn.Embedding(maxlen, d)
        self.blocks = nn.ModuleList([Block(d, h, ff, cross_from) for _ in range(L)])
        self.nf = nn.LayerNorm(d)

    def forward(self, ids, causal, mem=None, pos0=0):
        T = ids.shape[1]
        x = self.emb(ids) + self.pos(torch.arange(pos0, pos0 + T))
        mask = torch.ones(T, T, dtype=torch.bool).tril() if causal else None
        for b in self.blocks: x = b(x, mask, mem)
        return self.nf(x)


SIZES = {'small': dict(d=64, L=2, h=4, ff=256), 'big': dict(d=128, L=3, h=4, ff=512)}


class DecOnly(nn.Module):
    def __init__(self, size):
        super().__init__(); c = SIZES[size]
        self.st = Stack(c['d'], c['L'], c['h'], c['ff'])
        self.head = nn.Linear(c['d'], VOCAB, bias=False)

    def loss(self, src, tgt, lab):
        seq = torch.cat([src, tgt], 1)                              # x op BOS y: causal LM over the whole sequence
        logits = self.head(self.st(seq, causal=True))
        full = torch.cat([src[:, 1:], tgt[:, :1], lab], 1)          # next token at every position, ending with EOS
        return F.cross_entropy(logits.reshape(-1, VOCAB), full.reshape(-1))

    @torch.no_grad()
    def generate(self, src):
        seq = torch.cat([src, torch.full((src.shape[0], 1), BOS)], 1)
        for _ in range(N):
            nxt = self.head(self.st(seq, causal=True))[:, -1].argmax(-1, keepdim=True)
            seq = torch.cat([seq, nxt], 1)
        return seq[:, -N:]


class EncDec(nn.Module):
    def __init__(self, esize, dsize, enc_causal=False):
        super().__init__(); ce, cd = SIZES[esize], SIZES[dsize]
        self.enc = Stack(ce['d'], ce['L'], ce['h'], ce['ff'])
        self.dec = Stack(cd['d'], cd['L'], cd['h'], cd['ff'], cross_from=ce['d'])
        self.head = nn.Linear(cd['d'], VOCAB, bias=False)
        self.enc_causal = enc_causal

    def loss(self, src, tgt, lab):
        mem = self.enc(src, causal=self.enc_causal)
        return F.cross_entropy(self.head(self.dec(tgt, causal=True, mem=mem, pos0=DEC_POS0)).reshape(-1, VOCAB), lab.reshape(-1))

    @torch.no_grad()
    def generate(self, src):
        mem = self.enc(src, causal=self.enc_causal)
        seq = torch.full((src.shape[0], 1), BOS)
        for _ in range(N):
            nxt = self.head(self.dec(seq, causal=True, mem=mem, pos0=DEC_POS0))[:, -1].argmax(-1, keepdim=True)
            seq = torch.cat([seq, nxt], 1)
        return seq[:, 1:]


def adapt_from(dec_ck_enc, dec_ck_dec, model, copy_cross):
    """The paper's initialisation (Section 3.2): encoder = the decoder-only stack (no new weights), decoder self-attn
    and FFN = the decoder-only stack, cross-attention copied from self-attention (balanced) or left random (unbalanced)."""
    model.enc.load_state_dict(dec_ck_enc.st.state_dict())
    sd = dec_ck_dec.st.state_dict()
    missing = model.dec.load_state_dict(sd, strict=False)
    assert all('cross' in k or '.nc.' in k for k in missing.missing_keys), missing
    if copy_cross:
        for b, src in zip(model.dec.blocks, dec_ck_dec.st.blocks):
            b.cross.load_state_dict(src.att.state_dict()); b.nc.load_state_dict(src.n1.state_dict())
    model.head.load_state_dict(dec_ck_dec.head.state_dict())


# ---------------------------------------------------------------- training and evaluation
HELD = None


def held_out():
    global HELD
    if HELD is None:
        rng = random.Random(12345)
        xs, os_, ys = zip(*[sample(rng) for _ in range(2000)])
        HELD = (torch.tensor([list(x) + [10 + o] for x, o in zip(xs, os_)]), torch.tensor([list(y) for y in ys]), [OPS[o] for o in os_])
    return HELD


@torch.no_grad()
def evaluate(model):
    model.eval()
    src, y, ops = held_out()
    out = torch.cat([model.generate(src[i:i + 500]) for i in range(0, len(src), 500)])
    model.train()
    exact = (out == y).all(1).float()
    by = {o: round(exact[[i for i, p in enumerate(ops) if p == o]].mean().item() * 100, 2) for o in OPS}
    return round(exact.mean().item() * 100, 2), round((out == y).float().mean().item() * 100, 2), by


def train(name, model, steps, seed, lossfn, warm=0, params_for_warm=None, every=25):
    rng = random.Random(seed); torch.manual_seed(seed)
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    if warm:
        wopt = torch.optim.AdamW(params_for_warm, lr=LR, weight_decay=0.01)
    curve = []
    t0 = time.time()
    em, tok, by = evaluate(model)
    curve.append([0, None, em, tok]); log(name, 'step 0 exact', em, 'token', tok, by)
    run_loss = 0
    for s in range(1, steps + 1):
        lr = LR * min(1, s / 100) * (0.5 * (1 + math.cos(math.pi * s / steps)) * 0.9 + 0.1)
        o = wopt if s <= warm else opt
        for g in o.param_groups: g['lr'] = lr
        src, tgt, lab = batch(rng)
        loss = lossfn(model, src, tgt, lab)
        o.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); o.step()
        run_loss += loss.item()
        if s % every == 0:
            em, tok, by = evaluate(model)
            curve.append([s, round(run_loss / every, 4), em, tok]); run_loss = 0
            log(name, 'step', s, 'loss', curve[-1][1], 'exact', em, 'token', tok, by, '%.0fs' % (time.time() - t0))
    return curve, by


def run(name):
    R = json.load(open(os.path.join(OUT, 'report.json'))) if os.path.exists(os.path.join(OUT, 'report.json')) else {}
    lm = lambda m, s, t, l: m.loss(s, t, l)
    if name in ('pre_small', 'pre_big'):
        torch.manual_seed(1)
        m = DecOnly(name[4:])
        curve, by = train(name, m, PRE, 1, lm)
        torch.save(m.state_dict(), os.path.join(OUT, name + '.pt'))
    else:
        def load(size):
            m = DecOnly(size); m.load_state_dict(torch.load(os.path.join(OUT, 'pre_' + size + '.pt'))); return m
        torch.manual_seed(2)
        warm, wp = 0, None
        if name == 'dec_cont':
            m = load('small'); fn = lm
        elif name in ('ad_bi', 'ad_causal'):
            m = EncDec('small', 'small', enc_causal=(name == 'ad_causal')); adapt_from(load('small'), load('small'), m, True); fn = lm
        elif name in ('scratch', 'scratch2x'):
            m = EncDec('small', 'small'); fn = lm
        elif name.startswith('big_small_w'):
            m = EncDec('big', 'small'); adapt_from(load('big'), load('small'), m, False); fn = lm
            warm = int(name[len('big_small_w'):])
            wp = [p for n, p in m.named_parameters() if '.cross.' in n or '.nc.' in n]
        steps = PRE + ADAPT if name == 'scratch2x' else ADAPT
        curve, by = train(name, m, steps, 2, fn, warm=warm, params_for_warm=wp)
    R[name] = {'curve': curve, 'final_exact': curve[-1][2], 'final_token': curve[-1][3], 'by_op': by,
               'params': sum(p.numel() for p in m.parameters())}
    json.dump(R, open(os.path.join(OUT, 'report.json'), 'w'), indent=0)


def overlap():
    """How many held-out inputs also occur in the training stream (seeds 1 and 2, all runs' steps)."""
    src, _, _ = held_out()
    held = {tuple(r) for r in src.tolist()}
    seen = 0; total = 0
    for seed, steps in ((1, PRE), (2, PRE + ADAPT)):
        rng = random.Random(seed)
        for _ in range(steps):
            for x, o, _ in [sample(rng) for _ in range(BATCH)]:
                total += 1; seen += tuple(x + [10 + o]) in held
    return {'held_out': len(held), 'training_samples_checked': total, 'held_out_hits': seen}


ORDER = ['pre_small', 'pre_big', 'dec_cont', 'ad_bi', 'ad_causal', 'scratch', 'scratch2x', 'big_small_w0', 'big_small_w100', 'big_small_w500']

if __name__ == '__main__':
    todo = sys.argv[1:] or ORDER
    if todo == ['adapt']: todo = ORDER[2:]
    for r in todo:
        if r == 'overlap':
            R = json.load(open(os.path.join(OUT, 'report.json'))); R['overlap'] = overlap(); json.dump(R, open(os.path.join(OUT, 'report.json'), 'w'), indent=0); log('overlap', R['overlap']); continue
        log('=== run', r); run(r)
    log('done', todo)
