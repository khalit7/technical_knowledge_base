"""A toy-scale scaling-law sweep in the style of Kaplan et al. 2020, run on a laptop CPU.

  uv run --no-project --with pyarrow python prep_data.py      # WikiText-2 raw -> data/*.u8 (outside git)
  uv run --no-project --with torch --with numpy python train.py bench
  uv run --no-project --with torch --with numpy python train.py sweep   # every run in RUNS, skipping finished ones

What is copied from the paper (https://arxiv.org/html/2001.08361v1):
  * decoder-only Transformer, d_attn = d_model, d_ff = 4 d_model, learned positional embeddings (S2, S2.T1);
  * N = 12 n_layer d_model^2 non-embedding parameters (Eq. 2.1), C = 6 N tokens (S2.SS1);
  * Adam, 0.1 dropout is NOT used (the paper uses dropout only in the finite-data runs of S4; here every
    run sees each token at most once, so there is nothing to regularise);
  * learning rate from the paper's rule of thumb LR(N) = 0.003239 - 0.0001395 log N (Eq. D.1);
  * linear warmup then cosine decay to zero (S2.SS2); the paper warms up for 3000 of 250k steps (1.2%),
    here 1.2% of the planned steps, at least 20;
  * test loss in nats per token on held-out text, evaluated at log-spaced steps.
What differs (toy scale): byte-level ASCII tokens (vocabulary 96) instead of BPE 50257, WikiText-2 raw
(10.9M characters) instead of WebText2 (22.9B tokens), context 64 instead of 1024, batch 32 x 64 = 2048
tokens instead of 2^19, models of 1.5k to 2.7M non-embedding parameters instead of 768 to 1.5B.

Two families of runs:
  K (Kaplan-style): one long run per model size, cosine schedule to zero at the full budget of 2^23 tokens;
    the compute frontier is read off intermediate checkpoints, as the paper does (S3.SS3, S6.SS1).
  M (matched schedule, Chinchilla-style), every size but the largest: extra runs whose cosine schedule ends exactly at a shorter
    budget (1/4 and 1/16 of the full one); only their final losses are used.
  S2: three K runs repeated with a second seed (initialisation and data order) to measure run-to-run noise.
  X3: two M4 runs at 3x the Eq. D.1 learning rate, to test whether the matched runs are held back by the rate.
"""
import json, math, os, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('SL_DATA', os.path.join(HERE, 'data'))
OUT = os.path.join(HERE, 'model')
CTX, BATCH, VOCAB = 64, 32, 96
FULL = 2 ** 23                      # tokens in a full run (8.39M, 0.77 epochs of WikiText-2 train: no token seen twice)
SHAPES = [(2, 8), (2, 16), (2, 32), (3, 48), (4, 64), (4, 96), (6, 128), (6, 192)]  # (n_layer, d_model)
EVAL_TOK = 2 ** 17                  # held-out tokens per evaluation (fixed slice of the validation split)


def runs():
    r = []
    for nl, d in SHAPES:
        r.append(dict(name='K_%d_%d' % (nl, d), nl=nl, d=d, budget=FULL))
    for nl, d in SHAPES[:-1]:                          # (6, 192) skipped: CPU budget (it alone takes about 20 min)
        for f in (4, 16):
            r.append(dict(name='M%d_%d_%d' % (f, nl, d), nl=nl, d=d, budget=FULL // f))
    for nl, d in [(2, 16), (3, 48), (4, 96)]:          # second seed (init and data order) to measure run-to-run noise
        r.append(dict(name='S2_%d_%d' % (nl, d), nl=nl, d=d, budget=FULL, seed=2))
    for nl, d in [(3, 48), (4, 96)]:                   # learning-rate probe: matched 1/4 runs at 3x the Eq. D.1 rate
        r.append(dict(name='X3_M4_%d_%d' % (nl, d), nl=nl, d=d, budget=FULL // 4, lrx=3.0))
    return r


class Block(nn.Module):
    def __init__(s, d, h):
        super().__init__(); s.h = h
        s.n1 = nn.LayerNorm(d); s.qkv = nn.Linear(d, 3 * d); s.o = nn.Linear(d, d)
        s.n2 = nn.LayerNorm(d); s.f1 = nn.Linear(d, 4 * d); s.f2 = nn.Linear(4 * d, d)

    def forward(s, x):
        B, T, D = x.shape
        q, k, v = s.qkv(s.n1(x)).view(B, T, 3, s.h, D // s.h).permute(2, 0, 3, 1, 4)
        a = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        x = x + s.o(a.transpose(1, 2).reshape(B, T, D))
        return x + s.f2(F.gelu(s.f1(s.n2(x))))


class GPT(nn.Module):
    def __init__(s, nl, d):
        super().__init__()
        s.tok = nn.Embedding(VOCAB, d); s.pos = nn.Embedding(CTX, d)
        s.blocks = nn.ModuleList(Block(d, max(1, d // 16)) for _ in range(nl))
        s.nf = nn.LayerNorm(d); s.head = nn.Linear(d, VOCAB, bias=False)

    def forward(s, idx):
        x = s.tok(idx) + s.pos.weight[:idx.shape[1]]
        for b in s.blocks: x = b(x)
        return s.head(s.nf(x))


def counts(nl, d):
    """Non-embedding parameters as the paper counts them (Eq. 2.1) and the exact counts of this model."""
    m = GPT(nl, d)
    tot = sum(p.numel() for p in m.parameters())
    emb = m.tok.weight.numel() + m.pos.weight.numel()
    return dict(N_eq21=12 * nl * d * d, N_nonemb=tot - emb - m.head.weight.numel(), N_head=m.head.weight.numel(), N_emb=emb, N_total=tot)


def load():
    tr = np.fromfile(os.path.join(DATA, 'train.u8'), dtype=np.uint8)
    va = np.fromfile(os.path.join(DATA, 'valid.u8'), dtype=np.uint8)
    return torch.from_numpy(tr.astype(np.int64)), torch.from_numpy(va[:EVAL_TOK + 1].astype(np.int64))


def batches(tr, seed):
    """Every run reads the same random permutation of disjoint 65-token windows: no window twice."""
    g = torch.Generator().manual_seed(seed)
    nwin = (len(tr) - 1) // CTX
    perm = torch.randperm(nwin, generator=g)
    i = 0
    while True:
        w = perm[i:i + BATCH] * CTX; i += BATCH
        ix = w[:, None] + torch.arange(CTX + 1)[None]
        yield tr[ix]


@torch.no_grad()
def evaluate(m, va):
    m.eval(); tot = 0.0; n = 0
    x = va[:EVAL_TOK].view(-1, CTX); y = va[1:EVAL_TOK + 1].view(-1, CTX)
    for i in range(0, len(x), 256):
        lo = m(x[i:i + 256]); tot += F.cross_entropy(lo.reshape(-1, VOCAB), y[i:i + 256].reshape(-1), reduction='sum').item(); n += y[i:i + 256].numel()
    m.train(); return tot / n


def run(cfg, tr, va):
    path = os.path.join(OUT, cfg['name'] + '.json')
    if os.path.exists(path): print('skip', cfg['name'], flush=True); return
    seed = cfg.get('seed', 1); torch.manual_seed(1233 + seed)
    nl, d = cfg['nl'], cfg['d']; m = GPT(nl, d); c = counts(nl, d)
    steps = cfg['budget'] // (BATCH * CTX); warm = max(20, round(0.012 * steps))
    lr = (0.003239 - 0.0001395 * math.log(c['N_eq21'])) * cfg.get('lrx', 1.0)
    opt = torch.optim.Adam(m.parameters(), lr=lr, betas=(0.9, 0.95))
    sched = lambda s: (s + 1) / warm if s < warm else 0.5 * (1 + math.cos(math.pi * (s - warm) / max(1, steps - warm)))
    evals = sorted(set([int(round(x)) for x in np.geomspace(16, steps, 28)]) | {steps})
    log = []; t0 = time.time(); it = batches(tr, 98 + seed); lossacc = 0.0; nacc = 0
    for s in range(1, steps + 1):
        for g in opt.param_groups: g['lr'] = lr * sched(s - 1)
        b = next(it); lo = m(b[:, :-1])
        loss = F.cross_entropy(lo.reshape(-1, VOCAB), b[:, 1:].reshape(-1))
        opt.zero_grad(set_to_none=True); loss.backward(); opt.step()
        lossacc += loss.item(); nacc += 1
        if s in evals:
            te = evaluate(m, va)
            log.append(dict(step=s, tokens=s * BATCH * CTX, train=round(lossacc / nacc, 5), test=round(te, 5), sec=round(time.time() - t0, 1)))
            lossacc = 0.0; nacc = 0
            print(cfg['name'], json.dumps(log[-1]), flush=True)
    res = dict(cfg, **c, lr=lr, warmup=warm, steps=steps, batch_tokens=BATCH * CTX, ctx=CTX, log=log, seconds=round(time.time() - t0, 1))
    json.dump(res, open(path, 'w'), indent=0)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    tr, va = load()
    if sys.argv[1] == 'bench':
        for nl, d in SHAPES:
            m = GPT(nl, d); opt = torch.optim.Adam(m.parameters(), 1e-3); it = batches(tr, 1)
            for k in range(3): b = next(it); F.cross_entropy(m(b[:, :-1]).reshape(-1, VOCAB), b[:, 1:].reshape(-1)).backward(); opt.step()
            t = time.time()
            for k in range(10):
                b = next(it); loss = F.cross_entropy(m(b[:, :-1]).reshape(-1, VOCAB), b[:, 1:].reshape(-1)); opt.zero_grad(); loss.backward(); opt.step()
            dt = (time.time() - t) / 10
            print(nl, d, counts(nl, d), 'sec/step %.4f' % dt, 'full run min %.1f' % (dt * FULL / (BATCH * CTX) / 60), flush=True)
    elif sys.argv[1] == 'sweep':
        only = sys.argv[2] if len(sys.argv) > 2 else ''
        for cfg in runs():
            if cfg['name'].startswith(only): run(cfg, tr, va)
