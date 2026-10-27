"""Train the page's toy Ettin suite: paired encoders and decoders built and trained identically, then
cross-objective continued training in both directions, then the downstream tasks.

  uv run --with torch --with numpy python train.py bench                 # seconds per step for each size
  uv run --with torch --with numpy python train.py pretrain <size>       # enc and dec of one size -> model/<size>_{enc,dec}.pt
  uv run --with torch --with numpy python train.py cross <size> <frac>   # efd and dfe at a budget (fraction of pretraining tokens)
  uv run --with torch --with numpy python train.py evalgen               # generate / choose for every model -> model/gen.json
  uv run --with torch --with numpy python train.py finetune              # classify sweep for every model -> model/cls.json
  uv run --with torch --with numpy python train.py export                # 6-bit weights of the shipped models -> parts/20_model_data.js

What is copied from the paper (Weller et al. 2025, https://arxiv.org/html/2507.11412v2):
  - One architecture for both members of a pair, differing only in the attention mask (bidirectional or
    causal) and the objective (MLM or CLM) (section 3.3, Table 1 caption).
  - The ModernBERT-style block of Table 12: pre-norm, LayerNorm without bias, no biases in attention or
    MLP, a GLU feed-forward with GELU, rotary positions and no position embeddings, an embedding norm,
    the first layer's pre-norm skipped, a final norm, a prediction head (dense, GELU, norm) tied to the
    token embeddings with an output bias. Same head for both members of a pair.
  - Same data and the same data order for both: the documents of step s are drawn from one seeded stream;
    masking uses its own stream, so it never changes which documents a model sees (section 3.1).
  - Trapezoidal schedule: linear warmup, a stable phase, then a decay phase over the last 10% of steps to
    0.02 of the peak (section 3.3; the paper's decay phase is 50B of 2T tokens; its mid-training phase,
    which exists to extend context to 8k, has no toy counterpart because toy documents are 33 tokens).
  - MLM masks 30% of tokens during the stable phase and 15% during the decay phase (footnote 6), with the
    usual 80% [MASK], 10% random, 10% unchanged.
  - Cross-objective training (section 3.5): start from the final model, train on the reverse objective with
    a new trapezoidal schedule (warmup 3/50 and decay 10/50 of the budget, the paper's 3B and 10B of 50B),
    on the decay-phase data (here the same stream, with a different seed). Encoder-from-decoder: bidirectional
    attention, MNTP at 15% masking (the masked token is predicted from the previous position's output, as
    LLM2Vec). Decoder-from-encoder: causal attention, CLM. The paper's budget is 50B / 2T = 2.5% of
    pretraining; the toy also runs 10% and 25% to ask what the paper could not afford.
What is not copied: sizes (toy), sliding-window attention (documents are shorter than any window),
dropout (0), the tokenizer (one word per token), batch-size warmup.
"""
import base64, json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import grammar as G

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.environ.get('MODEL_DIR') or os.path.join(HERE, 'model')
os.makedirs(MD, exist_ok=True)
VOCAB = G.vocab(); IDX = {w: i for i, w in enumerate(VOCAB)}; V = len(VOCAB)
PAD, BOS, EOS, MASK = G.PAD, G.BOS, G.EOS, G.MASK
NSPEC = len(G.SPECIAL)
# toy sizes: deep-and-thin in the spirit of section 3.2; GLU width 1.5 x hidden as Ettin-150m (1152 / 768)
SIZES = {
    's': dict(d=32, L=2, h=4, I=48, lr=3e-3),
    'm': dict(d=48, L=3, h=4, I=72, lr=3e-3),
    'l': dict(d=64, L=4, h=4, I=96, lr=2e-3),
}
STEPS = int(os.environ.get('STEPS', 8000)); BATCH = 128; WARM = 0.04; DECAY = 0.10; WD = 1e-4
DATA_SEED = 7


# ---------------- model ----------------
class LN(nn.Module):  # LayerNorm without bias (Table 12: Norm Bias false)
    def __init__(s, d):
        super().__init__(); s.w = nn.Parameter(torch.ones(d))

    def forward(s, x):
        return F.layer_norm(x, (x.shape[-1],), s.w, None, 1e-5)


def rope(x):  # x: B, h, T, dk ; rotate-half form (non-interleaved, Table 12), base 10,000
    B, H, T, D = x.shape; half = D // 2
    inv = 1.0 / (10000 ** (torch.arange(half, dtype=torch.float32) / half))
    ang = torch.arange(T, dtype=torch.float32)[:, None] * inv[None]
    cos, sin = ang.cos(), ang.sin()
    x1, x2 = x[..., :half], x[..., half:]
    return torch.cat([x1 * cos - x2 * sin, x2 * cos + x1 * sin], -1)


class Block(nn.Module):
    def __init__(s, c, first):
        super().__init__(); d = c['d']; s.h = c['h']; s.dk = d // c['h']
        s.n1 = None if first else LN(d)            # Skip First PreNorm: true
        s.qkv = nn.Linear(d, 3 * d, bias=False); s.o = nn.Linear(d, d, bias=False)
        s.n2 = LN(d); s.wi = nn.Linear(d, 2 * c['I'], bias=False); s.wo = nn.Linear(c['I'], d, bias=False)

    def forward(s, x, mask, keep=None):
        B, T, d = x.shape
        a = x if s.n1 is None else s.n1(x)
        q, k, v = s.qkv(a).view(B, T, 3, s.h, s.dk).permute(2, 0, 3, 1, 4)
        q, k = rope(q), rope(k)
        att = (q @ k.transpose(-1, -2) / math.sqrt(s.dk)).masked_fill(~mask, float('-inf')).softmax(-1)
        if keep is not None: keep.append(att.detach())
        x = x + s.o((att @ v).transpose(1, 2).reshape(B, T, d))
        g, u = s.wi(s.n2(x)).chunk(2, -1)
        return x + s.wo(F.gelu(g) * u)            # GLU with GELU (Table 12)


class Toy(nn.Module):
    def __init__(s, c):
        super().__init__(); d = c['d']; s.c = c
        s.tok = nn.Embedding(V, d); s.en = LN(d)
        s.blocks = nn.ModuleList(Block(c, i == 0) for i in range(c['L']))
        s.fn = LN(d)
        s.hd = nn.Linear(d, d, bias=False); s.hn = LN(d); s.hb = nn.Parameter(torch.zeros(V))
        for m in s.modules():
            if isinstance(m, (nn.Linear, nn.Embedding)): nn.init.trunc_normal_(m.weight, 0, 0.02, -0.04, 0.04)

    def hidden(s, ids, causal, keep=None):
        T = ids.shape[1]
        mask = (ids != PAD)[:, None, None, :]
        if causal: mask = mask & torch.tril(torch.ones(T, T, dtype=torch.bool))[None, None]
        mask = mask | torch.eye(T, dtype=torch.bool)[None, None]  # a padded query attends to itself (no NaN)
        x = s.en(s.tok(ids))
        for b in s.blocks: x = b(x, mask, keep)
        return s.fn(x)

    def logits(s, h):
        return s.hn(F.gelu(s.hd(h))) @ s.tok.weight.T + s.hb


def nparams(m):
    return sum(p.numel() for p in m.parameters())


# ---------------- objectives ----------------
def enc(words):
    return [BOS] + [IDX[w] for w in words] + [EOS]


def batch_docs(r, n):
    """30% of the documents are cut at a random point, as packed pretraining sequences are cut at the context
    boundary; so [EOS] can follow any token, and an encoder cannot read the answer's length from where [EOS]
    sits (which the three-mask generation method of Samuel 2024 relies on)."""
    out = []
    for _ in range(n):
        d = enc(G.document(r))
        if r.random() < 0.3:
            cut = r.randint(8, len(d) - 2); d = d[:cut] + [EOS]
        out.append(d)
    return out


def padt(rows, v=PAD):
    T = max(len(x) for x in rows)
    return torch.tensor([x + [v] * (T - len(x)) for x in rows])


def mlm_batch(docs, rm, ratio, shift=False):
    """MLM (shift=False) or MNTP (shift=True: the target of masked position i is read at position i-1).
    BOS and EOS are never masked; MNTP never masks position 1's predecessor-less BOS."""
    X, Y = [], []
    for ids in docs:
        cand = [i for i in range(1, len(ids) - 1)]
        n = max(1, int(round(len(cand) * ratio)))
        pick = rm.sample(cand, n); x = list(ids); y = [-100] * len(ids)
        for i in pick:
            if shift: y[i - 1] = ids[i]
            else: y[i] = ids[i]
            u = rm.random()
            if u < 0.8: x[i] = MASK
            elif u < 0.9: x[i] = rm.randrange(NSPEC, V)
        X.append(x); Y.append(y)
    return padt(X), padt(Y, -100)


def clm_batch(docs):
    return padt(docs), padt([d[1:] + [-100] for d in docs], -100)


@torch.no_grad()
def probe(m, obj, n=200):
    """Share of held-out prompts whose restated colour the model gets right, read the way it is being trained:
    CLM at the previous position (causal), MLM at the masked colour itself, MNTP one position earlier."""
    was = m.training; m.eval(); r = random.Random(4242)
    X, pos, gold = [], [], []
    for _ in range(n):
        p, a, _ = G.generate_example(r); ids = [BOS] + [IDX[w] for w in p]; full = ids + [IDX[w] for w in a] + [EOS]
        if obj == 'clm': X.append(ids); pos.append(len(ids) - 1)
        else:
            x = list(full); x[len(ids)] = MASK; X.append(x); pos.append(len(ids) - (1 if obj == 'mntp' else 0))
        gold.append(full[len(ids)])
    h = m.hidden(padt(X), obj == 'clm'); lg = m.logits(h[torch.arange(n), torch.tensor(pos)])
    ok = (lg.argmax(-1) == torch.tensor(gold)).float().mean().item()
    m.train(was)
    return round(ok, 3)


def lr_at(step, total, peak, warm, decay_start):
    if step < warm: return peak * (step + 1) / warm
    if step < decay_start: return peak
    p = (step - decay_start) / max(1, total - decay_start)
    return peak * (0.02 + 0.98 * (1 - math.sqrt(p)))


def run(m, obj, steps, peak, warm, decay_start, data_seed, mask_seed, log_name, decay_ratio=None):
    """obj: mlm | clm | mntp. Returns log rows [step, loss, lr]."""
    opt = torch.optim.AdamW(m.parameters(), lr=peak, betas=(0.9, 0.98), eps=1e-6, weight_decay=WD)
    r = random.Random(data_seed); rm = random.Random(mask_seed)
    causal = obj == 'clm'; log = []; t0 = time.time(); acc = 0.0
    for st in range(steps):
        lr = lr_at(st, steps, peak, warm, decay_start)
        for g in opt.param_groups: g['lr'] = lr
        docs = batch_docs(r, BATCH)
        if obj == 'clm': X, Y = clm_batch(docs)
        elif obj == 'mlm': X, Y = mlm_batch(docs, rm, 0.30 if st < decay_start else (decay_ratio or 0.15))
        else: X, Y = mlm_batch(docs, rm, 0.15, shift=True)
        lg = m.logits(m.hidden(X, causal))
        loss = F.cross_entropy(lg.reshape(-1, V), Y.reshape(-1), ignore_index=-100)
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        acc += loss.item()
        if (st + 1) % 100 == 0:
            log.append([st + 1, round(acc / 100, 4), lr]); acc = 0.0
        if (st + 1) % 500 == 0:
            pr = probe(m, obj)
            log[-1].append(pr)
            print(log_name, st + 1, log[-1][1], 'probe', pr, '%.0fs' % (time.time() - t0), flush=True)
    return log, round(time.time() - t0)


def pretrain(size):
    c = SIZES[size]
    for kind, obj in (('dec', 'clm'), ('enc', 'mlm')):
        path = os.path.join(MD, '%s_%s.pt' % (size, kind))
        if os.path.exists(path): print('exists', path); continue
        torch.manual_seed(1)  # identical initial weights for both members of a pair
        m = Toy(c)
        log, secs = run(m, obj, STEPS, c['lr'], int(WARM * STEPS), int((1 - DECAY) * STEPS), DATA_SEED, 11, size + '_' + kind)
        torch.save({'cfg': c, 'kind': kind, 'state': m.state_dict(), 'log': log, 'seconds': secs, 'params': nparams(m), 'steps': STEPS}, path)


def cross(size, frac):
    if frac > 0.05 and size != 'm':  # CPU budget: the 10% and 25% runs are done for the middle size only
        print('skip', size, frac); return
    c = SIZES[size]; n = max(10, int(round(frac * STEPS)))
    for src, kind, obj in (('dec', 'efd', 'mntp'), ('enc', 'dfe', 'clm')):
        path = os.path.join(MD, '%s_%s_%s.pt' % (size, kind, fmt(frac)))
        if os.path.exists(path): print('exists', path); continue
        ck = torch.load(os.path.join(MD, '%s_%s.pt' % (size, src)))
        m = Toy(c); m.load_state_dict(ck['state'])
        log, secs = run(m, obj, n, c['lr'], max(1, round(n * 3 / 50)), n - round(n * 10 / 50), 1000 + DATA_SEED, 21, '%s_%s_%s' % (size, kind, fmt(frac)))
        torch.save({'cfg': c, 'kind': kind, 'frac': frac, 'state': m.state_dict(), 'log': log, 'seconds': secs, 'params': nparams(m), 'steps': n}, path)


def fmt(f):
    return ('%g' % (f * 100)).replace('.', 'p')


# ---------------- using a model ----------------
def mode_of(kind):
    """How a model is used: decoders (dec, dfe) are causal and read the next token at the last position;
    encoders (enc) fill a [MASK]; encoders-from-decoders (efd) fill a [MASK] read one position earlier (MNTP)."""
    return {'dec': ('causal', 0), 'dfe': ('causal', 0), 'enc': ('mask', 0), 'efd': ('mask', 1)}[kind]


@torch.no_grad()
def next_logprobs(m, kind, prefixes):
    """Log-probabilities of the next token after each prefix (list of id lists). Encoders use the method of
    Samuel (2024) that the paper follows (appendix B): prefix + three [MASK] + [EOS], read the first mask."""
    how, shift = mode_of(kind)
    if how == 'causal':
        X = padt(prefixes); h = m.hidden(X, True)
        pos = torch.tensor([len(p) - 1 for p in prefixes])
    else:
        X = padt([p + [MASK, MASK, MASK, EOS] for p in prefixes]); h = m.hidden(X, False)
        pos = torch.tensor([len(p) - shift for p in prefixes])
    lg = m.logits(h[torch.arange(len(prefixes)), pos])
    return lg.log_softmax(-1)


def load(size, kind, frac=None):
    name = '%s_%s' % (size, kind) + ('' if frac is None else '_' + fmt(frac))
    ck = torch.load(os.path.join(MD, name + '.pt'))
    m = Toy(ck['cfg']); m.load_state_dict(ck['state']); m.eval()
    return m, ck


FRACS = [0.025, 0.1, 0.25]


def models_list():
    out = []
    for s in SIZES:
        for k in ('enc', 'dec'):
            if os.path.exists(os.path.join(MD, '%s_%s.pt' % (s, k))): out.append((s, k, None))
        for f in FRACS:
            for k in ('efd', 'dfe'):
                if os.path.exists(os.path.join(MD, '%s_%s_%s.pt' % (s, k, fmt(f)))): out.append((s, k, f))
    return out


@torch.no_grad()
def eval_gen(m, kind, n=1000, seed=999):
    """generate: greedy 3 tokens, exact match. choose: four candidates scored by summed log-probability."""
    r = random.Random(seed); ok = 0; tok_ok = 0
    P, A = [], []
    for _ in range(n):
        p, a, _ = G.generate_example(r); P.append([BOS] + [IDX[w] for w in p]); A.append([IDX[w] for w in a])
    cur = [list(p) for p in P]; outs = [[] for _ in P]
    for j in range(3):
        lp = next_logprobs(m, kind, cur); nxt = lp.argmax(-1).tolist()
        for i in range(n): cur[i].append(nxt[i]); outs[i].append(nxt[i])
    for i in range(n):
        ok += outs[i] == A[i]; tok_ok += outs[i][0] == A[i][0]
    r = random.Random(seed + 1); cok = 0
    rows = []
    for _ in range(n):
        p, cands, gold = G.choose_example(r); rows.append(([BOS] + [IDX[w] for w in p], [[IDX[c], IDX[o]] for c, o in cands], gold))
    # score: sum over the two tokens of log p(token | prefix + earlier candidate tokens), batched
    for i0 in range(0, n, 100):
        chunk = rows[i0:i0 + 100]
        pre1 = [p for p, cands, _ in chunk for _c in cands]
        pre2 = [p + [c[0]] for p, cands, _ in chunk for c in cands]
        t1 = [c[0] for _, cands, _ in chunk for c in cands]; t2 = [c[1] for _, cands, _ in chunk for c in cands]
        lp1 = next_logprobs(m, kind, pre1); lp2 = next_logprobs(m, kind, pre2)
        sc = (lp1[torch.arange(len(t1)), torch.tensor(t1)] + lp2[torch.arange(len(t2)), torch.tensor(t2)]).view(len(chunk), 4)
        cok += int((sc.argmax(-1) == torch.tensor([g for _, _, g in chunk])).sum())
    return {'generate': round(ok / n, 4), 'first_token': round(tok_ok / n, 4), 'choose': round(cok / n, 4), 'n': n}


def evalgen():
    out = {}
    for s, k, f in models_list():
        m, ck = load(s, k, f)
        e = eval_gen(m, k); e['params'] = ck['params']; e['seconds'] = ck['seconds']; e['steps'] = ck['steps']
        key = '%s_%s' % (s, k) + ('' if f is None else '_' + fmt(f))
        out[key] = e; print(key, e, flush=True)
    json.dump(out, open(os.path.join(MD, 'gen.json'), 'w'), indent=1)
    logs = {}
    for s, k, f in models_list():
        _, ck = load(s, k, f)
        logs['%s_%s' % (s, k) + ('' if f is None else '_' + fmt(f))] = {'log': ck['log'], 'seconds': ck['seconds'], 'steps': ck['steps'], 'params': ck['params']}
    json.dump(logs, open(os.path.join(MD, 'logs.json'), 'w'))


# ---------------- fine-tuning: classify ----------------
POOL = {}  # override pooling for the robustness check: {'dec': 'mean'}


class Classifier(nn.Module):
    """ModernBERT-style classification head: pool, dense, GELU, norm, linear. Encoders pool by mean over
    tokens (the Ettin encoders' config: classifier_pooling 'mean'); decoders by the last token, the only
    position that has read the whole input (the pooling the Ettin retrieval script uses for decoders)."""
    def __init__(s, m, kind):
        super().__init__(); d = m.c['d']; s.m = m; s.kind = kind
        s.causal = mode_of(kind)[0] == 'causal'; s.pool = POOL.get(kind, 'last' if s.causal else 'mean')
        s.dense = nn.Linear(d, d, bias=False); s.norm = LN(d); s.out = nn.Linear(d, 2)
        for x in (s.dense, s.out): nn.init.trunc_normal_(x.weight, 0, 0.02, -0.04, 0.04)

    def forward(s, X):
        h = s.m.hidden(X, s.causal); valid = (X != PAD).float()
        if s.pool == 'last': z = h[torch.arange(len(X)), valid.sum(1).long() - 1]
        else: z = (h * valid[..., None]).sum(1) / valid.sum(1, keepdim=True)
        return s.out(s.norm(F.gelu(s.dense(z))))


def cls_data(seed, n):
    r = random.Random(seed); X, Y = [], []
    for _ in range(n):
        w, y = G.classify_example(r); X.append(enc(w)); Y.append(y)
    return X, Y


@torch.no_grad()
def cls_acc(c, X, Y):
    c.eval(); ok = 0
    for i in range(0, len(X), 500):
        ok += (c(padt(X[i:i + 500])).argmax(-1) == torch.tensor(Y[i:i + 500])).sum().item()
    return ok / len(X)


NLAB = [256, 2048]; LRS = [1e-3, 3e-3]; SEEDS = [0, 1, 2]; EPOCHS_STEPS = 300


def finetune_one(s, k, f, nlab, lr, seed, tr, dev, steps=None):
    m, _ = load(s, k, f); torch.manual_seed(seed)
    c = Classifier(m, k); opt = torch.optim.AdamW(c.parameters(), lr=lr, weight_decay=0.01)
    X, Y = tr[0][:nlab], tr[1][:nlab]; r = random.Random(seed)
    S = steps or EPOCHS_STEPS
    for st in range(S):
        c.train(); idx = [r.randrange(nlab) for _ in range(32)]
        for g in opt.param_groups: g['lr'] = lr * min(1, (st + 1) / 30) * (1 - st / S)
        loss = F.cross_entropy(c(padt([X[i] for i in idx])), torch.tensor([Y[i] for i in idx]))
        opt.zero_grad(); loss.backward(); opt.step()
    return c


def finetune():
    path = os.path.join(MD, 'cls.json')
    out = json.load(open(path)) if os.path.exists(path) else {}
    tr = cls_data(101, max(NLAB)); dev = cls_data(202, 1000); te = cls_data(303, 3000)
    for s, k, f in models_list():
        key = '%s_%s' % (s, k) + ('' if f is None else '_' + fmt(f))
        for nlab in NLAB:
            kk = '%s@%d' % (key, nlab)
            if kk in out: continue
            t0 = time.time()
            best = None
            for lr in LRS:  # learning rate picked on dev with seed 0, as GLUE sweeps pick on dev
                c = finetune_one(s, k, f, nlab, lr, 0, tr, dev); a = cls_acc(c, *dev)
                if best is None or a > best[0]: best = (a, lr)
            accs = []
            for sd in SEEDS:
                c = finetune_one(s, k, f, nlab, best[1], sd, tr, dev); accs.append(cls_acc(c, *te))
            out[kk] = {'lr': best[1], 'dev': round(best[0], 4), 'test': [round(a, 4) for a in accs], 'mean': round(float(np.mean(accs)), 4), 'sd': round(float(np.std(accs)), 4)}
            print(kk, out[kk], '%.0fs' % (time.time() - t0), flush=True)
            json.dump(out, open(path, 'w'), indent=1)


def cls_check():
    """Is the decoder's classification failure about pooling or fine-tuning length? The middle pair at 2,048
    labels: decoder with mean pooling (causal states averaged), decoder and encoder fine-tuned 5x longer."""
    tr = cls_data(101, max(NLAB)); dev = cls_data(202, 1000); te = cls_data(303, 3000); out = {}
    for name, k, pool, steps in (('dec_mean_pool', 'dec', 'mean', None), ('dec_5x_steps', 'dec', None, 1500), ('enc_5x_steps', 'enc', None, 1500), ('dec_mean_pool_5x', 'dec', 'mean', 1500)):
        POOL.clear()
        if pool: POOL[k] = pool
        best = None
        for lr in LRS:
            c = finetune_one('m', k, None, 2048, lr, 0, tr, dev, steps); a = cls_acc(c, *dev)
            if best is None or a > best[0]: best = (a, lr)
        accs = [cls_acc(finetune_one('m', k, None, 2048, best[1], sd, tr, dev, steps), *te) for sd in SEEDS]
        out[name] = {'lr': best[1], 'mean': round(float(np.mean(accs)), 4), 'sd': round(float(np.std(accs)), 4), 'test': [round(a, 4) for a in accs]}
        print(name, out[name], flush=True)
    POOL.clear()
    json.dump(out, open(os.path.join(MD, 'cls_check.json'), 'w'), indent=1)


def cls_lowlr():
    """The sweep's learning rates (1e-3, 3e-3) might be too high for the decoder: try 1e-4 and 3e-4 with 5x steps,
    last-token pooling, middle decoder, 2,048 labels; appended to model/cls_check.json."""
    tr = cls_data(101, max(NLAB)); dev = cls_data(202, 1000); te = cls_data(303, 3000)
    path = os.path.join(MD, 'cls_check.json'); out = json.load(open(path))
    for lr in (1e-4, 3e-4):
        accs = [cls_acc(finetune_one('m', 'dec', None, 2048, lr, sd, tr, dev, 1500), *te) for sd in SEEDS]
        out['dec_lr_%g_5x' % lr] = {'lr': lr, 'mean': round(float(np.mean(accs)), 4), 'sd': round(float(np.std(accs)), 4), 'test': [round(a, 4) for a in accs]}
        print('dec_lr_%g_5x' % lr, out['dec_lr_%g_5x' % lr], flush=True)
    json.dump(out, open(path, 'w'), indent=1)


# ---------------- export ----------------
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def tensor_order(c):
    """The order the browser reads tensors in (parts/22_js_model.js mirrors it)."""
    names = ['tok.weight', 'en.w']
    for i in range(c['L']):
        q = 'blocks.%d.' % i
        if i > 0: names.append(q + 'n1.w')
        names += [q + 'qkv.weight', q + 'o.weight', q + 'n2.w', q + 'wi.weight', q + 'wo.weight']
    return names + ['fn.w', 'hd.weight', 'hn.w', 'hb']


def quantise(state, names):
    """6-bit matrices (one base64 character per weight, one scale character per row, as the BERT page),
    float16 vectors."""
    mq, sq, vb, tmax, deq = [], [], bytearray(), [], {}
    for n in names:
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


SHIP_SIZE = os.environ.get('SHIP_SIZE', 's')


def export():
    """Quantise the four models of one size (enc, dec, efd and dfe at the paper's 2.5% budget), measure what
    quantisation costs on generate/choose, and write parts/20_model_data.js."""
    out = {'vocab': VOCAB, 'cfg': {SHIP_SIZE: {k: SIZES[SHIP_SIZE][k] for k in ('d', 'L', 'h', 'I')}}, 'models': {}}
    report = {}
    for kind, f in (('enc', None), ('dec', None), ('efd', 0.025), ('dfe', 0.025)):
        m, ck = load(SHIP_SIZE, kind, f)
        names = tensor_order(m.c); state = m.state_dict()
        assert set(names) == set(state.keys()), set(state.keys()) ^ set(names)
        mq, sq, vb, tmax, deq = quantise(state, names)
        sd = dict(state); sd.update(deq); m.load_state_dict(sd); m.eval()
        key = kind
        torch.save({'cfg': m.c, 'kind': kind, 'state': m.state_dict()}, os.path.join(MD, 'ship_%s_q.pt' % key))
        evq = eval_gen(m, kind)
        out['models'][key] = {'kind': kind, 'size': SHIP_SIZE, 'frac': f, 'tmax': tmax, 'm': mq, 's': sq, 'v': vb}
        report[key] = {'quantised': evq, 'chars': len(mq) + len(sq) + len(vb), 'params': nparams(m)}
        print(key, report[key], flush=True)
    js = "// Generated by train.py export: the toy suite's vocabulary, configuration and weights (one size, four models).\n" \
         "// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n" \
         'window.EW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    json.dump(report, open(os.path.join(MD, 'report.json'), 'w'), indent=1)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


# ---------------- bench ----------------
def bench():
    for s, c in SIZES.items():
        torch.manual_seed(1); m = Toy(c)
        t0 = time.time(); run(m, 'mlm', 30, c['lr'], 3, 27, 1, 1, 'bench'); t = (time.time() - t0) / 30
        print(s, nparams(m), 'params', '%.3f s/step' % t, 'pretrain of %d steps: %.1f min' % (STEPS, t * STEPS / 60), flush=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'bench': bench()
    elif cmd == 'pretrain': pretrain(sys.argv[2])
    elif cmd == 'cross': cross(sys.argv[2], float(sys.argv[3]))
    elif cmd == 'evalgen': evalgen()
    elif cmd == 'finetune': finetune()
    elif cmd == 'export': export()
    elif cmd == 'cls_check': cls_check()
    elif cmd == 'cls_lowlr': cls_lowlr()
    else: raise SystemExit('unknown command ' + cmd)
