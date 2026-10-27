"""A toy Qwen3: thinking mode fusion and the thinking budget, tested at toy scale.

  uv run --with torch --with numpy python train.py [variant ...]   # trains model/<variant>.pt (default: all)
  uv run --with torch --with numpy python train.py eval            # budget sweep -> model/results.json
  uv run --with torch --with numpy python train.py export          # 6-bit export -> parts/20_model_data.js

The task. A question is a list of n digits (n = 1 to 12); the answer is their sum mod 10. Thinking writes the
running sum after each digit (n tokens), so every step is one small addition; answering directly needs the
whole sum in one forward pass, which a small model does badly for long lists. Same shape as the report's
claim: thinking helps on hard problems and costs tokens.

The format follows Table 9 of the report (https://arxiv.org/html/2505.09388v1#S4.T9):
  thinking:      <u> d1 .. dn [/think] <a> <think> p1 .. pn </think> answer <e>
  non-thinking:  <u> d1 .. dn /no_think <a> <think> </think> answer <e>
The /think flag may be omitted ("by default, the model operates in thinking mode", §4.3), so a quarter of the
thinking samples carry no flag. The empty think block is kept in non-thinking samples, as in the report.

The model is a tiny Qwen3 decoder (§2): pre-norm RMSNorm, grouped-query attention (4 query heads sharing
2 key-value heads), QK-Norm, rotary position embeddings, SwiGLU, no QKV bias, tied embeddings (as Qwen3-0.6B,
1.7B and 4B, Table 1).

Variants, identical except for the training mix (same steps, seed, optimiser):
  fused     thinking and non-thinking samples, half each (Thinking Mode Fusion, §4.3)
  think     thinking samples only (the stage-2 model before fusion)
  budget    fused plus a quarter of samples whose thinking is cut at a random step, followed by </think>
            and the correct answer: explicit training for the budget, which the report says it did NOT need

The budget (§4.3): when the thinking reaches b tokens, generation is halted and </think> is inserted (the
report inserts a sentence ending in </think>; the toy has no words, so it inserts the closing tag alone).
"""
import base64, json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(HERE, 'model'), exist_ok=True)
VOCAB = [str(i) for i in range(10)] + ['<u>', '<a>', '/think', '/no_think', '<think>', '</think>', '<e>', '<pad>']
IDX = {w: i for i, w in enumerate(VOCAB)}
U, A, FT, FN, TH, ETH, EOS, PAD = (IDX[w] for w in ['<u>', '<a>', '/think', '/no_think', '<think>', '</think>', '<e>', '<pad>'])
NMAX = 12
MAXLEN = 2 * NMAX + 8
CFG = dict(d=32, hq=4, hkv=2, hd=8, L=3, ff=64, rope=10000.0, steps=6000, batch=256, lr=3e-3, warmup=300, wd=0.01, seed=11)
VARIANTS = {'fused': dict(think=0.5, cut=0.0), 'think': dict(think=1.0, cut=0.0), 'budget': dict(think=0.5, cut=0.25)}


def psums(ds):
    out, s = [], 0
    for d in ds: s = (s + d) % 10; out.append(s)
    return out


def sample(rng, kind, n=None, cut=None):
    """kind: 'think', 'nothink' or 'cut'. Returns (tokens, first index that carries loss)."""
    n = n or rng.randint(1, NMAX)
    ds = [rng.randrange(10) for _ in range(n)]
    p = psums(ds)
    q = [U] + ds
    if kind == 'nothink':
        q += [FN, A]; r = [TH, ETH, p[-1], EOS]
    else:
        q += ([FT] if rng.random() < 0.75 else []) + [A]
        k = n if kind == 'think' else (cut if cut is not None else rng.randint(0, n - 1))
        r = [TH] + p[:k] + [ETH, p[-1], EOS]
    return q + r, len(q)


class RMS(nn.Module):
    def __init__(s, d):
        super().__init__(); s.weight = nn.Parameter(torch.ones(d))
    def forward(s, x):
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + 1e-6) * s.weight


def rope(x, base):
    """x: (B, H, T, hd). Rotates pairs (i, i + hd/2), as Hugging Face's Qwen3 does (rotate_half)."""
    T, hd = x.shape[-2], x.shape[-1]
    inv = 1.0 / (base ** (torch.arange(0, hd, 2, dtype=torch.float64) / hd))
    ang = torch.arange(T, dtype=torch.float64)[:, None] * inv[None, :]
    cos = torch.cat([ang.cos(), ang.cos()], -1).float(); sin = torch.cat([ang.sin(), ang.sin()], -1).float()
    x1, x2 = x[..., :hd // 2], x[..., hd // 2:]
    return x * cos + torch.cat([-x2, x1], -1) * sin


class Block(nn.Module):
    def __init__(s, c):
        super().__init__(); d, hq, hkv, hd, ff = c['d'], c['hq'], c['hkv'], c['hd'], c['ff']
        s.c = c; s.n1 = RMS(d); s.n2 = RMS(d)
        s.q = nn.Linear(d, hq * hd, bias=False); s.k = nn.Linear(d, hkv * hd, bias=False)
        s.v = nn.Linear(d, hkv * hd, bias=False); s.o = nn.Linear(hq * hd, d, bias=False)
        s.qn = RMS(hd); s.kn = RMS(hd)
        s.g = nn.Linear(d, ff, bias=False); s.up = nn.Linear(d, ff, bias=False); s.dn = nn.Linear(ff, d, bias=False)
    def forward(s, x, keep=None):
        c = s.c; B, T, _ = x.shape; hq, hkv, hd = c['hq'], c['hkv'], c['hd']
        h = s.n1(x)
        q = s.qn(s.q(h).view(B, T, hq, hd)).transpose(1, 2)
        k = s.kn(s.k(h).view(B, T, hkv, hd)).transpose(1, 2)
        v = s.v(h).view(B, T, hkv, hd).transpose(1, 2)
        q, k = rope(q, c['rope']), rope(k, c['rope'])
        k = k.repeat_interleave(hq // hkv, 1); v = v.repeat_interleave(hq // hkv, 1)
        att = (q @ k.transpose(-1, -2)) / math.sqrt(hd)
        att = att.masked_fill(torch.triu(torch.ones(T, T, dtype=torch.bool), 1), float('-inf')).softmax(-1)
        if keep is not None: keep.append(att.detach())
        x = x + s.o((att @ v).transpose(1, 2).reshape(B, T, hq * hd))
        h = s.n2(x)
        return x + s.dn(F.silu(s.g(h)) * s.up(h))


class TinyQwen(nn.Module):
    def __init__(s, c):
        super().__init__(); s.c = c
        s.emb = nn.Embedding(len(VOCAB), c['d']); s.blocks = nn.ModuleList(Block(c) for _ in range(c['L'])); s.nf = RMS(c['d'])
        nn.init.normal_(s.emb.weight, std=0.5)
    def forward(s, ids, keep=None):
        x = s.emb(ids)
        for b in s.blocks: x = b(x, keep)
        return s.nf(x) @ s.emb.weight.t()  # tied embeddings


def nparams(m): return sum(p.numel() for p in m.parameters())


def make_batch(rng, mix, B):
    seqs, starts = [], []
    for _ in range(B):
        r = rng.random()
        kind = 'cut' if r < mix['cut'] else ('think' if r < mix['cut'] + (1 - mix['cut']) * mix['think'] else 'nothink')
        t, st = sample(rng, kind); seqs.append(t); starts.append(st)
    T = max(len(t) for t in seqs)
    x = torch.full((B, T), PAD); y = torch.full((B, T), -100)
    for i, (t, st) in enumerate(zip(seqs, starts)):
        x[i, :len(t)] = torch.tensor(t)
        for j in range(st, len(t)): y[i, j - 1] = t[j]  # predict every assistant token
    return x, y, seqs


def lr_at(step, c):
    if step < c['warmup']: return c['lr'] * (step + 1) / c['warmup']
    return c['lr'] * 0.5 * (1 + math.cos(math.pi * (step - c['warmup']) / (c['steps'] - c['warmup'])))


TEST_SEED = 99991


def test_set(per_n=200):
    """Held-out problems drawn uniformly per length with their own seed; overlap with training is measured."""
    rng = random.Random(TEST_SEED)
    return [[rng.randrange(10) for _ in range(n)] for n in range(1, NMAX + 1) for _ in range(per_n)]


@torch.no_grad()
def decode_one(m, q, mode, budget=None, temp=0.0, gen=None):
    """Unbatched reference decoder (one question); batched_decode must agree with it."""
    flag = [FT] if mode == 'think' else ([FN] if mode == 'nothink' else [])
    seq = [U] + q + flag + [A]
    out = dict(think=[], cut=False, ans=None, bad=None, closed=False)
    stage = 'open'
    for _ in range(NMAX + 6):
        if stage == 'thinking' and budget is not None and len(out['think']) >= budget:
            seq.append(ETH); out['cut'] = True; stage = 'answer'; continue
        logits = m(torch.tensor([seq]))[0, -1]
        t = int(torch.multinomial((logits / temp).softmax(-1), 1, generator=gen)) if temp > 0 else int(logits.argmax())
        seq.append(t)
        if stage == 'open':
            if t != TH: out['bad'] = 'no <think>'; break
            stage = 'thinking'
        elif stage == 'thinking':
            if t == ETH: stage = 'answer'; out['closed'] = True
            elif t < 10: out['think'].append(t)
            else: out['bad'] = 'bad token in thinking'; break
        elif stage == 'answer':
            out['ans'] = t if t < 10 else None; break
    return out


@torch.no_grad()
def batched_decode(m, qs, mode, budget=None, temp=0.0, gen=None):
    """Same rules as decode_one, batched over questions of one length n (all rows stay aligned because every row
    writes exactly one token per step until it finishes; a cut row writes </think> as its token for that step)."""
    n = len(qs[0]); B = len(qs)
    flag = [FT] if mode == 'think' else ([FN] if mode == 'nothink' else [])
    x = torch.tensor([[U] + q + flag + [A] for q in qs])
    outs = [dict(think=[], cut=False, ans=None, bad=None, closed=False, toks=[]) for _ in qs]
    stage = ['open'] * B
    for _ in range(NMAX + 6):
        if all(s == 'done' for s in stage): break
        logits = m(x)[:, -1, :]
        if temp > 0: nxt = torch.multinomial((logits / temp).softmax(-1), 1, generator=gen)[:, 0].tolist()
        else: nxt = logits.argmax(-1).tolist()
        col = []
        for i in range(B):
            o, s = outs[i], stage[i]
            if s == 'done': col.append(PAD); continue
            if s == 'thinking' and budget is not None and len(o['think']) >= budget:
                o['cut'] = True; stage[i] = 'answer'; col.append(ETH); o['toks'].append(ETH); continue
            t = nxt[i]; col.append(t); o['toks'].append(t)
            if s == 'open':
                if t != TH: o['bad'] = 'no <think>'; stage[i] = 'done'
                else: stage[i] = 'thinking'
            elif s == 'thinking':
                if t == ETH: stage[i] = 'answer'; o['closed'] = True
                elif t < 10: o['think'].append(t)
                else: o['bad'] = 'bad token in thinking'; stage[i] = 'done'
            elif s == 'answer':
                o['ans'] = t if t < 10 else None; stage[i] = 'done'
        x = torch.cat([x, torch.tensor(col)[:, None]], 1)
    return outs


def quick_acc(m, per_n=60, seed=5):
    rng = random.Random(seed); res = {}
    for mode in ('think', 'nothink'):
        ok = 0; tot = 0
        for n in range(1, NMAX + 1):
            qs = [[rng.randrange(10) for _ in range(n)] for _ in range(per_n)]
            outs = batched_decode(m, qs, mode)
            ok += sum(o['ans'] == psums(q)[-1] for o, q in zip(outs, qs)); tot += len(qs)
        res[mode] = ok / tot
    return res


def train(name):
    c = dict(CFG); mix = VARIANTS[name]
    torch.manual_seed(c['seed']); rng = random.Random(c['seed'] * 1000 + 1)
    m = TinyQwen(c); opt = torch.optim.AdamW(m.parameters(), lr=c['lr'], betas=(0.9, 0.95), weight_decay=c['wd'])
    test = set(tuple(q) for q in test_set()); seen = set(); log = []; t0 = time.time()
    logf = open(os.path.join(HERE, 'model', name + '.log'), 'w')
    for step in range(c['steps']):
        for g in opt.param_groups: g['lr'] = lr_at(step, c)
        x, y, seqs = make_batch(rng, mix, c['batch'])
        for t in seqs:
            q = tuple(t[1:t.index(A)]); q = q[:-1] if q and q[-1] in (FT, FN) else q
            if q in test: seen.add(q)
        loss = F.cross_entropy(m(x).reshape(-1, len(VOCAB)), y.reshape(-1), ignore_index=-100)
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        if step % 250 == 0 or step == c['steps'] - 1:
            m.eval(); qa = quick_acc(m, per_n=30) if step % 1000 == 0 or step == c['steps'] - 1 else None; m.train()
            rec = dict(step=step, loss=round(float(loss), 4), t=round(time.time() - t0, 1))
            if qa: rec.update(think=round(qa['think'], 3), nothink=round(qa['nothink'], 3))
            log.append(rec); print(name, rec, file=logf, flush=True)
    m.eval()
    tq = test_set()
    ck = dict(cfg=c, mix=mix, state=m.state_dict(), log=log, params=nparams(m),
              test_overlap=dict(seen=len(seen), test_unique=len(set(tuple(q) for q in tq)), test_total=len(tq),
                                seen_items=sum(tuple(q) in seen for q in tq)))
    torch.save(ck, os.path.join(HERE, 'model', name + '.pt'))
    print(name, 'done', nparams(m), 'params', round(time.time() - t0), 's', file=logf, flush=True)


if __name__ == '__main__':
    torch.set_num_threads(2)
    args = sys.argv[1:]
    if args and args[0] in ('eval', 'export'):
        import evaluate as E
        E.main(args[0])
    else:
        for n in (args or list(VARIANTS)):
            train(n)
