"""ABANDONED (not used by the page): the toy Latent Context Language Model (LCLM), built like the paper's Section 3
at toy scale. Eight pilot designs (logs in model/pilot/, configuration on each log's first line) never learned
key-value retrieval within the CPU budget, so nothing was exported. This file is the last design:
`uv run --with torch --with numpy python train.py pretrain` (toy decoder alone on raw context), then `train.py n16`.

  uv run --with torch python train.py <variant> [<variant> ...]   # trains, writes model/<variant>.pt and model/<variant>.log
  uv run --with torch python train.py export                     # quantises the shipped variants, writes parts/20_model_data.js
  uv run --with torch python train.py eval <variant>             # re-measures a saved variant on the held-out set

The architecture follows the paper (https://arxiv.org/html/2606.09659v1#S3 and Appendix D):
  an encoder reads the context in windows of W tokens (Eq. 1); a pooling operator turns each block of N
  encoder states into one latent (mean pooling, Eq. 4-5, or token pooling with appended pooling tokens,
  Eq. 2-3); an MLP adapter (RMSNorm, Linear, GELU, Linear; Eq. 7-8) maps latents into the decoder's width;
  the decoder reads the latents in place of the context, between memory tags, then the question.
Training is from scratch and end to end, as in the paper's architecture search (Section 5), with
AdamW (beta1 0.9, beta2 0.95), 5% warmup and cosine decay (Table 1). Loss is next-token prediction on
the uncompressed tokens only (Section 4.1), mixed with chunk reconstruction (the auxiliary task) and
with interleaved samples in which one chunk is given raw, which the EXPAND agent of Section 7 needs.

Toy-scale substitutions (said on the page): RoPE as in Qwen3 but no QK-norm, a GELU MLP
instead of SwiGLU, d = 32, two layers each side, a synthetic key-value context instead of web text.

The task: a context of 45 records "key value" (keys distinct, drawn from 60; values from 20 symbols) in
3 chunks of 32 tokens (a filler token, 15 records, a filler token), 96 tokens in all. Records start at odd
offsets and blocks are N tokens, so records straddle block boundaries. Questions: VAL k -> the value
(exact retrieval), WHERE k -> the chunk id or NONE. The decoder sees each chunk's id token before its
latents, as the paper's agent harness gives every chunk an integer id (Section 7).
"""
import base64, json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
# vocabulary
PAD = 0
NV = 16                                  # values A..P -> 1..16
NK = int(os.environ.get('LC_NK', 32))
KEY0 = 1 + NV                            # keys K00..K59 -> 21..80
NREC_CH, RLEN = int(os.environ.get('LC_RECCH', 7)), 2   # a chunk: filler, 7 records of 2 tokens, filler
CHUNK = 1 + NREC_CH * RLEN + 1           # 16 tokens
NCH = 3
NREC = NREC_CH * NCH                     # 21 records
T = CHUNK * NCH                          # 48 context tokens
CH0 = KEY0 + NK                          # chunk ids C0..C2
NONE, VAL, WHERE, REC, MS, ME, POOL, FILL = [CH0 + NCH + i for i in range(8)]
V = FILL + 1
REC_FRAC = float(os.environ.get('LC_REC', 0.15))
ALL = 99                                 # expand every chunk: the decoder reads the raw context (decoder pre-training)


def vocab():
    v = ['<pad>'] + [chr(65 + i) for i in range(NV)] + ['K%02d' % i for i in range(NK)] + ['C%d' % i for i in range(NCH)]
    return v + ['NONE', 'VAL', 'WHERE', 'REC', '<mem>', '</mem>', '<pool>', '·']


BASE = dict(d=48, h=4, Le=2, Ld=2, ff=96, dh=48, N=16, W=16, pool='mean', mask='causal',
            steps=8000, batch=128, lr=2e-3, seed=11, maxdec=80)
VARIANTS = {
    'n16': {}, 'n8': {'N': 8}, 'n4': {'N': 4},
    'n4_wn': {'N': 4, 'W': 4}, 'n4_eos': {'N': 4, 'pool': 'eos'}, 'n4_bidir': {'N': 4, 'mask': 'bidir'},
    'n4_concat': {'N': 4, 'pool': 'concat'},
}
SHIP = ['n16', 'n4']


def cfg_of(name):
    c = dict(BASE); c.update(VARIANTS[name]); c['name'] = name
    if os.environ.get('STEPS'): c['steps'] = int(os.environ['STEPS'])
    for k in ('d', 'lr', 'ff', 'dh', 'W', 'N', 'steps'):
        if os.environ.get('LC_' + k.upper()): c[k] = type(c[k])(os.environ['LC_' + k.upper()])
    return c


# ---------------- data ----------------
def make_context(rng):
    keys = rng.sample(range(NK), NREC)
    vals = [rng.randrange(NV) for _ in range(NREC)]
    toks = []
    for c in range(NCH):
        toks.append(FILL)
        for i in range(c * NREC_CH, (c + 1) * NREC_CH): toks += [KEY0 + keys[i], 1 + vals[i]]
        toks.append(FILL)
    return keys, vals, toks


def rec_pos(i):
    """Token position of record i's key."""
    return (i // NREC_CH) * CHUNK + 1 + (i % NREC_CH) * RLEN


def sample(rng, kind=None, expand=None, nq=None):
    """One training item: context tokens, the expanded chunk (or -1), the tail after </mem> (several questions with
    their answers, or one reconstruction request with the chunk), and the indices of the tail tokens that are answers.
    Several questions per context give dense supervision (as in multi-query associative recall); without it the toy
    does not learn retrieval within the CPU budget (see model/pilot/)."""
    keys, vals, toks = make_context(rng)
    if kind is None: kind = 'rec' if rng.random() < REC_FRAC else 'qa'
    if kind == 'rec':
        c = rng.randrange(NCH); tail = [REC, CH0 + c] + toks[c * CHUNK:(c + 1) * CHUNK]
        return toks, -1, tail, list(range(2, len(tail))), dict(kind=kind, chunk=c)
    nq = nq or int(os.environ.get('LC_NQ', 12))
    tail, ans, first = [], [], None; present = set(keys); absent = [k for k in range(NK) if k not in present]
    for _ in range(nq):
        if rng.random() < 0.55:
            i = rng.randrange(NREC); first = i if first is None else first
            tail += [VAL, KEY0 + keys[i], 1 + vals[i]]; ans += [len(tail) - 1]
        elif rng.random() < 0.75:
            i = rng.randrange(NREC); tail += [WHERE, KEY0 + keys[i], CH0 + i // NREC_CH]; ans += [len(tail) - 1]
        else:
            tail += [WHERE, KEY0 + rng.choice(absent), NONE]; ans += [len(tail) - 1]
    if expand is None:
        e = rng.random(); expand = -1 if e < 0.4 else ((first // NREC_CH) if (first is not None and e < 0.85) else rng.randrange(NCH))
    return toks, expand, tail, ans, dict(kind=kind)


# ---------------- model ----------------
class RMSNorm(nn.Module):
    def __init__(s, d):
        super().__init__(); s.weight = nn.Parameter(torch.ones(d))

    def forward(s, x):
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + 1e-6) * s.weight


def rope(x, base=10000.0):
    """Rotary position embedding (as in Qwen3), half-split form: pairs (i, i + dk/2) rotated by pos * base^(-2i/dk)."""
    L, dk = x.shape[-2], x.shape[-1]; half = dk // 2
    inv = base ** (-torch.arange(half, dtype=torch.float32) * 2 / dk)
    ang = torch.arange(L, dtype=torch.float32)[:, None] * inv[None]
    cos, sin = ang.cos(), ang.sin()
    a, b = x[..., :half], x[..., half:]
    return torch.cat([a * cos - b * sin, a * sin + b * cos], -1)


class Block(nn.Module):
    """Pre-norm Transformer block: x + Attn(RMSNorm(x)), then x + MLP(RMSNorm(x))."""
    def __init__(s, c):
        super().__init__(); d = c['d']; s.h = c['h']
        s.n1 = RMSNorm(d); s.qkv = nn.Linear(d, 3 * d); s.o = nn.Linear(d, d)
        s.n2 = RMSNorm(d); s.f1 = nn.Linear(d, c['ff']); s.f2 = nn.Linear(c['ff'], d)

    def forward(s, x, mask):
        B, L, D = x.shape; h = s.h; dk = D // h
        q, k, v = s.qkv(s.n1(x)).view(B, L, 3, h, dk).permute(2, 0, 3, 1, 4)
        q, k = rope(q), rope(k)
        a = (q @ k.transpose(-1, -2)) / math.sqrt(dk)
        a = a.masked_fill(~mask, -1e9).softmax(-1)
        x = x + s.o((a @ v).transpose(1, 2).reshape(B, L, D))
        return x + s.f2(F.gelu(s.f1(s.n2(x)), approximate='tanh'))


class LCLM(nn.Module):
    def __init__(s, c):
        super().__init__(); s.c = c; d = c['d']
        s.etok = nn.Embedding(V, d)
        s.enc = nn.ModuleList(Block(c) for _ in range(c['Le'])); s.enorm = RMSNorm(d)
        din = d * c['N'] if c['pool'] == 'concat' else d
        s.anorm = RMSNorm(din); s.a1 = nn.Linear(din, c['dh']); s.a2 = nn.Linear(c['dh'], d)   # Eq. 7-8
        s.dtok = nn.Embedding(V, d)
        s.dec = nn.ModuleList(Block(c) for _ in range(c['Ld'])); s.dnorm = RMSNorm(d)
        for e in (s.etok, s.dtok): nn.init.normal_(e.weight, std=0.02)   # GPT-2 style; N(0, 1) stalls training

    def encode(s, ctx):
        """ctx: (B, T) tokens -> latents (B, T/N, d_dec) after the adapter."""
        c = s.c; B = ctx.shape[0]; W, N = c['W'], c['N']; nw = T // W; m = W // N
        x = ctx.view(B * nw, W)
        if c['pool'] == 'eos':
            x = torch.cat([x, torch.full((B * nw, m), POOL, dtype=torch.long)], 1)
        L = x.shape[1]
        h = s.etok(x)
        if c['mask'] == 'causal': mask = torch.ones(L, L, dtype=torch.bool).tril()
        else: mask = torch.ones(L, L, dtype=torch.bool)
        if c['pool'] == 'eos':
            # pooling token j may read the context and itself only; context tokens never read pooling tokens
            mask = mask.clone(); mask[:W, W:] = False
            for j in range(m): mask[W + j, W:] = False; mask[W + j, W + j] = True
        for b in s.enc: h = b(h, mask[None, None])
        h = s.enorm(h)
        if c['pool'] == 'mean': z = h.view(B * nw, m, N, -1).mean(2)                 # Eq. 5
        elif c['pool'] == 'concat': z = h.reshape(B * nw, m, N * h.shape[-1])          # Eq. 6
        else: z = h[:, W:]                                                             # Eq. 3
        z = z.reshape(B, nw * m, -1)
        return s.a2(F.gelu(s.a1(s.anorm(z)), approximate='tanh'))                     # Eq. 7-8

    def decoder_inputs(s, lat, ctx, expand, q, a):
        """Build the decoder sequence: <mem> C0 latents C1 latents C2 latents </mem> then the tail q[b]
        (one chunk's latents replaced by its raw tokens if expanded).
        a[b] lists the tail positions that are answers. Returns embeddings (B, L, d), key mask (B, L) and
        the target ids (B, L), -100 except where the next token is an answer.
        Built by gathering rows from [latents | embedded context | embedded tail] with per-sample index lists."""
        c = s.c; B, M = lat.shape[0], lat.shape[1]; per = CHUNK // c['N']
        tails = [[MS, ME] + list(range(CH0, CH0 + NCH)) + q[b] for b in range(B)]
        Lt = max(len(t) for t in tails)
        tt = torch.tensor([t + [PAD] * (Lt - len(t)) for t in tails])
        E = s.dtok.weight
        src = torch.cat([lat, E[ctx], E[tt]], 1)                    # (B, M + T + Lt, d)
        idx, tgt = [], []
        for b in range(B):
            o = M + T
            ix = [o]                                                  # <mem>
            for ch in range(NCH):
                ix.append(o + 2 + ch)                                 # the chunk's id token, then its latents or raw tokens
                if ch == expand[b] or expand[b] == ALL: ix += list(range(M + ch * CHUNK, M + (ch + 1) * CHUNK))
                else: ix += list(range(ch * per, (ch + 1) * per))
            ix.append(o + 1)                                          # </mem>
            ix += list(range(o + 2 + NCH, o + len(tails[b])))         # the tail: questions and answers
            tg = [-100] * len(ix); n0 = len(ix) - len(q[b])             # q[b][j] sits at position n0 + j
            for j in a[b]: tg[n0 + j - 1] = q[b][j]                   # the position before an answer token predicts it
            idx.append(ix); tgt.append(tg)
        L = max(len(ix) for ix in idx)
        I = torch.zeros(B, L, dtype=torch.long); Y = torch.full((B, L), -100, dtype=torch.long); K = torch.zeros(B, L, dtype=torch.bool)
        for b in range(B):
            n = len(idx[b]); I[b, :n] = torch.tensor(idx[b]); Y[b, :n] = torch.tensor(tgt[b]); K[b, :n] = True
        X = torch.gather(src, 1, I[:, :, None].expand(B, L, src.shape[-1])) * K[:, :, None]
        return X, Y, K

    def decode(s, X, K):
        L = X.shape[1]
        h = X
        mask = torch.ones(L, L, dtype=torch.bool).tril()[None, None] & K[:, None, None, :]
        for b in s.dec: h = b(h, mask)
        return s.dnorm(h) @ s.dtok.weight.T                       # tied output embedding

    def forward(s, ctx, expand, q, a):
        lat = torch.zeros(ctx.shape[0], T // s.c['N'], s.c['d']) if all(e == ALL for e in expand) else s.encode(ctx)
        X, Y, K = s.decoder_inputs(lat, ctx, expand, q, a)
        return s.decode(X, K), Y


def batch(rng, n, **kw):
    items = [sample(rng, **kw) for _ in range(n)]
    ctx = torch.tensor([it[0] for it in items])
    return ctx, [it[1] for it in items], [it[2] for it in items], [it[3] for it in items], [it[4] for it in items]


@torch.no_grad()
def answer(m, ctx, expand, q, n_out):
    """Greedy decoding of n_out tokens after the question."""
    lat = m.encode(ctx); out = [[] for _ in range(ctx.shape[0])]
    for _ in range(n_out):
        X, Y, K = m.decoder_inputs(lat, ctx, expand, [q[b] + out[b] for b in range(len(q))], [[] for _ in q])
        lg = m.decode(X, K)
        last = K.sum(1) - 1
        nxt = lg[torch.arange(len(q)), last].argmax(-1)
        for b in range(len(q)): out[b].append(int(nxt[b]))
    return out


def test_set(seed=999, n=1000):
    """Held-out items from a different random stream (seed 999 against training seeds 11 and up); a context is
    45 distinct keys in order out of 60 and 45 values out of 20, so a repeat of a training context has
    probability around 10^-130 per pair."""
    rng = random.Random(seed); out = []
    for _ in range(n):
        keys, vals, toks = make_context(rng)
        i = rng.randrange(NREC)
        absent = [k for k in range(NK) if k not in set(keys)]
        out.append(dict(toks=toks, rec=i, key=keys[i], val=vals[i], chunk=i // NREC_CH, absent=rng.choice(absent)))
    return out


@torch.no_grad()
def evaluate(m, test, bs=250):
    m.eval(); r = dict(val=0, where=0, none=0, agent=0, oracle=0, rec_tok=0)
    for i in range(0, len(test), bs):
        tb = test[i:i + bs]; n = len(tb)
        ctx = torch.tensor([t['toks'] for t in tb])
        out = answer(m, ctx, [-1] * n, [[VAL, KEY0 + t['key']] for t in tb], 1)
        for t, o in zip(tb, out): r['val'] += o[0] == 1 + t['val']
        wo = answer(m, ctx, [-1] * n, [[WHERE, KEY0 + t['key']] for t in tb], 1)
        no = answer(m, ctx, [-1] * n, [[WHERE, KEY0 + t['absent']] for t in tb], 1)
        for t, o, o2 in zip(tb, wo, no):
            r['where'] += o[0] == CH0 + t['chunk']; r['none'] += o2[0] == NONE
        # agent: WHERE, then EXPAND the named chunk (if it names one), then VAL
        exp = [o[0] - CH0 if CH0 <= o[0] < CH0 + NCH else -1 for o in wo]
        ao = answer(m, ctx, exp, [[VAL, KEY0 + t['key']] for t in tb], 1)
        for t, o in zip(tb, ao): r['agent'] += o[0] == 1 + t['val']
        oo = answer(m, ctx, [t['chunk'] for t in tb], [[VAL, KEY0 + t['key']] for t in tb], 1)
        for t, o in zip(tb, oo): r['oracle'] += o[0] == 1 + t['val']
        q = [[REC, CH0 + t['chunk']] + t['toks'][t['chunk'] * CHUNK:(t['chunk'] + 1) * CHUNK] for t in tb]
        lg, Y = m(ctx, [-1] * n, q, [list(range(2, 2 + CHUNK))] * n)
        msk = Y != -100
        r['rec_tok'] += float((lg.argmax(-1)[msk] == Y[msk]).float().mean()) * n
    m.train()
    return {k: v / len(test) for k, v in r.items()}


DEC_KEYS = ('dtok.', 'dec.', 'dnorm.')


def pretrain_decoder(steps=4000):
    """Stand-in for the paper's pre-trained decoder (Qwen3-4B-Instruct): the toy decoder is first trained alone on
    raw contexts (every chunk expanded) with the same questions, so it can already retrieve before compression is
    introduced. Writes model/decoder_pre.pt and model/decoder_pre.log."""
    c = cfg_of('n16'); torch.manual_seed(5); rng = random.Random(5)
    m = LCLM(c); ps = [p for n, p in m.named_parameters() if n.startswith(DEC_KEYS)]
    opt = torch.optim.AdamW(ps, lr=float(os.environ.get('LC_PRELR', 3e-3)), betas=(0.9, 0.95), weight_decay=0.01)
    wu = int(0.05 * steps)
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: (s + 1) / wu if s < wu else 0.005 + 0.995 * 0.5 * (1 + math.cos(math.pi * (s - wu) / (steps - wu))))
    logf = open(os.path.join(HERE, 'model', 'decoder_pre.log'), 'w'); t0 = time.time(); run = 0; log = []
    for step in range(1, steps + 1):
        items = [sample(rng, kind='qa', expand=ALL) for _ in range(c['batch'])]   # questions per context: LC_NQ (default 12)
        ctx = torch.tensor([it[0] for it in items])
        lg, Y = m(ctx, [ALL] * len(items), [it[2] for it in items], [it[3] for it in items])
        loss = F.cross_entropy(lg.reshape(-1, V), Y.reshape(-1), ignore_index=-100)
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(ps, 1.0); opt.step(); sched.step()
        run = loss.item() if step == 1 else 0.98 * run + 0.02 * loss.item()
        if step % 100 == 0:
            log.append([step, round(run, 4)]); print('step', step, 'loss', round(run, 4), 's', int(time.time() - t0), file=logf, flush=True)
        if step % 1000 == 0:
            m.eval(); test = test_set()[:300]; ctx = torch.tensor([t['toks'] for t in test])
            o = answer(m, ctx, [ALL] * len(test), [[VAL, KEY0 + t['key']] for t in test], 1)
            w = answer(m, ctx, [ALL] * len(test), [[WHERE, KEY0 + t['key']] for t in test], 1); m.train()
            acc = sum(x[0] == 1 + t['val'] for x, t in zip(o, test)) / len(test); wacc = sum(x[0] == CH0 + t['chunk'] for x, t in zip(w, test)) / len(test)
            print('eval', step, json.dumps({'val_raw': round(acc, 4), 'where_raw': round(wacc, 4)}), file=logf, flush=True)
    torch.save({'state': {n: v for n, v in m.state_dict().items() if n.startswith(DEC_KEYS)}, 'log': log, 'secs': int(time.time() - t0)},
               os.path.join(HERE, 'model', 'decoder_pre.pt'))
    print('done', int(time.time() - t0), file=logf, flush=True)


STAGES = [(0.10, ('a',)), (0.40, ('a', 'e')), (0.50, ('a', 'e', 'd'))]   # share of steps, trainable parts (Section 4.2)
DEC_LR = 1 / 6                                                          # Table 1: decoder 1e-5 against 6e-5 in stage 2


def part_of(n):
    if n.startswith(DEC_KEYS): return 'd'
    if n.startswith(('etok.', 'enc.', 'enorm.')): return 'e'
    return 'a'


def train(name):
    c = cfg_of(name)
    torch.manual_seed(c['seed']); rng = random.Random(c['seed'])
    m = LCLM(c)
    pre = torch.load(os.path.join(HERE, 'model', 'decoder_pre.pt'), weights_only=False)
    m.load_state_dict(pre['state'], strict=False)
    groups = {k: [p for n, p in m.named_parameters() if part_of(n) == k] for k in 'aed'}
    opt = torch.optim.AdamW([{'params': groups[k], 'mult': DEC_LR if k == 'd' else 1.0} for k in 'aed'], lr=c['lr'], betas=(0.9, 0.95), weight_decay=0.01)
    S = c['steps']; bounds = []; acc = 0
    for share, parts in STAGES: bounds.append((acc, acc + int(share * S), parts)); acc += int(share * S)
    test = test_set()
    tag = name + os.environ.get('LC_TAG', '')
    logf = open(os.path.join(HERE, 'model', tag + '.log'), 'w')
    log = []; t0 = time.time(); run = 0
    nparam = sum(p.numel() for p in m.parameters())
    print(name, c, 'params', nparam, 'stages', bounds, file=logf, flush=True)
    for si, (s0, s1, parts) in enumerate(bounds):
        for k in 'aed':
            for p in groups[k]: p.requires_grad_(k in parts)
        n = s1 - s0; wu = max(1, int(0.05 * n))
        for step in range(s0 + 1, s1 + 1):
            j = step - s0
            f = j / wu if j < wu else 0.005 + 0.995 * 0.5 * (1 + math.cos(math.pi * (j - wu) / max(1, n - wu)))   # 5% warm-up, cosine (Table 1)
            for g in opt.param_groups: g['lr'] = c['lr'] * f * g['mult']
            ctx, ex, q, a, _ = batch(rng, c['batch'])
            lg, Y = m(ctx, ex, q, a)
            loss = F.cross_entropy(lg.reshape(-1, V), Y.reshape(-1), ignore_index=-100)
            opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
            run = loss.item() if step == 1 else 0.98 * run + 0.02 * loss.item()
            if step % 100 == 0:
                log.append([step, round(run, 4)])
                print('step', step, 'stage', si, 'loss', round(run, 4), 's', int(time.time() - t0), file=logf, flush=True)
        if si < len(bounds) - 1:
            ev = evaluate(m, test[:300])
            print('eval', s1, json.dumps({k: round(v, 4) for k, v in ev.items()}), file=logf, flush=True)
    ev = evaluate(m, test)
    print('eval', S, json.dumps({k: round(v, 4) for k, v in ev.items()}), file=logf, flush=True)
    torch.save({'cfg': c, 'state': m.state_dict(), 'log': log, 'eval': ev, 'params': nparam, 'secs': int(time.time() - t0), 'stages': bounds},
               os.path.join(HERE, 'model', tag + '.pt'))
    print('done', json.dumps(ev), 'secs', int(time.time() - t0), file=logf, flush=True)


# ---------------- export: matrices 6-bit per row (one base64 character per weight), vectors float16 ----------------
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def quantise(state):
    mq, sq, vb, tmax, deq, names = [], [], bytearray(), [], {}, []
    for n, w in state.items():
        w = w.float().numpy(); names.append([n, list(w.shape)])
        if w.ndim == 2:
            amax = float(np.abs(w).max()); tm = float('%.5g' % (amax * 1.0001)); tmax.append(tm)
            rows = []
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
    return ''.join(mq), ''.join(sq), base64.b64encode(bytes(vb)).decode(), tmax, deq, names


def export():
    out = {'vocab': vocab(), 'consts': dict(T=T, CHUNK=CHUNK, NCH=NCH, RLEN=RLEN, NREC=NREC, NREC_CH=NREC_CH, FILL=FILL, NK=NK, NV=NV, KEY0=KEY0, CH0=CH0, NONE=NONE, VAL=VAL,
                                              WHERE=WHERE, REC=REC, MS=MS, ME=ME, POOL=POOL), 'variants': {}, 'measured': {}}
    test = test_set()
    for name in VARIANTS:
        p = os.path.join(HERE, 'model', name + '.pt')
        if not os.path.exists(p): continue
        ck = torch.load(p, weights_only=False); c = ck['cfg']
        out['measured'][name] = dict(cfg={k: c[k] for k in ('N', 'W', 'pool', 'mask')}, params=ck['params'], secs=ck['secs'],
                                     eval={k: round(v, 4) for k, v in ck['eval'].items()}, log=ck['log'])
        if name not in SHIP: continue
        mq, sq, vb, tmax, deq, names = quantise(ck['state'])
        mm = LCLM(c); mm.load_state_dict(deq); evq = evaluate(mm, test)
        torch.save({'cfg': c, 'state': mm.state_dict()}, os.path.join(HERE, 'model', name + '_q.pt'))
        out['variants'][name] = dict(cfg={k: c[k] for k in ('d', 'h', 'Le', 'Ld', 'ff', 'dh', 'N', 'W', 'pool', 'mask', 'maxdec')},
                                     names=names, tmax=tmax, m=mq, s=sq, v=vb)
        out['measured'][name]['eval_q'] = {k: round(v, 4) for k, v in evq.items()}
        print(name, 'float', ck['eval'], 'quantised', evq)
    js = '// Generated by train.py export: the toy LCLM\'s vocabulary, configurations, measured results and shipped weights.\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.LCW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


if __name__ == '__main__':
    torch.set_num_threads(int(os.environ.get('THREADS', '2')))
    os.makedirs(os.path.join(HERE, 'model'), exist_ok=True)
    if sys.argv[1] == 'export': export()
    elif sys.argv[1] == 'pretrain': pretrain_decoder(int(os.environ.get('STEPS', 4000)))
    elif sys.argv[1] == 'eval':
        ck = torch.load(os.path.join(HERE, 'model', sys.argv[2] + '.pt'), weights_only=False)
        m = LCLM(ck['cfg']); m.load_state_dict(ck['state']); print(evaluate(m, test_set()))
    else:
        for n in sys.argv[1:]: train(n)
