"""LLM Modules at toy scale: a frozen "large" model, a trainable "small" model, joined by the paper's
Enhanced Cross-Attention exactly as the released model.py builds it, plus the controls the paper never ran.

  uv run --with torch --with numpy python train.py pretrain        # the frozen knowledge source
  uv run --with torch --with numpy python train.py lr              # LR grid per variant, seed 0, picked on the validation facts
  uv run --with torch --with numpy python train.py finetune [names]# every variant x 3 seeds at its picked LR
  uv run --with torch --with numpy python train.py export          # parts/20_model_data.js and model/q_*.pt

The toy world (arithmetic, like the paper's two test prompts "sum of 5 and 5" and "remainder of 7 by 4"):
 - 560 facts: a + b for a, b in 0..19 (400) and a % b for a in 0..19, b in 2..9 (160).
 - The "large" model (Qwen2-1.5B's role) is pretrained on every fact in a brief format, packed after a random
   prefix so it knows them at any position:  <bos> 7 T 3 + 4 = 7 ; 9 % 4 = 1 ; ...
   It answers correctly but never "reasons" (the paper's Table 1 row for Qwen2: brief answer, no reasoning).
 - The finetuning data (Bespoke-Stratos-17k's role) are reasoning traces for 25% of the facts:
     <bos> Q sum 3 4 T 3 + 4 = 7 ; 7 - 4 = 3 ok A 7 <eos>
     <bos> Q rem 9 4 T 9 % 4 = 1 ; 1 < 4 ok A 1 <eos>
   Validation facts (10%) pick the learning rate; test facts (65%) are never seen in any trace.
   The only step that needs knowledge is the token after the first "="; every later token copies.

Variants (the released model.py, and what the paper did not compare):
 released  frozen model -> pre_proj, proj, intermediate FFN, 2 EnhancedCrossAttentionLayers (projections, adapter,
           sigmoid gate) -> small GPT-Neo-style decoder with zeroed positional embeddings and a new LM head.
           The cross-attention masks padding only, as in model.py: a position can read the frozen model's states
           of LATER tokens, including the token it is trained to predict.
 causal    the same with a causal mask in the cross-attention (the fix).
 plain     causal, and plain cross-attention without the adapter and gate (is "Enhanced" needed?).
 small     the small decoder alone with its own embeddings, trained on the traces (GPT-Neo-125M-clean's role).
 bigft     the large model itself fully finetuned on the traces (the like-for-like distillation control:
           DeepSeek-R1-Distill-Qwen-1.5B is a Qwen finetuned on R1 traces).
 head      the frozen large model with only a new linear LM head trained (the smallest possible adapter).
Loss on every non-pad token, prompt included, as model.py computes it. AdamW, gradient clipping 1.0, adapter
learning rate twice the small model's (model.py: 1e-4 and 5e-5), batch 32, 2,500 steps.
"""
import json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, 'model')
os.makedirs(MD, exist_ok=True)

SPECIAL = ['<pad>', '<bos>', '<eos>', 'Q', 'sum', 'rem', 'T', '+', '%', '=', ';', '-', '<', 'ok', 'A']
NMAX = 40
VOCAB = SPECIAL + [str(n) for n in range(NMAX)]
IDX = {w: i for i, w in enumerate(VOCAB)}
PAD, BOS, EOS = 0, 1, 2
N0 = len(SPECIAL)
num = lambda n: N0 + n
TLEN = 24
BIG = dict(d=48, h=4, L=2, dff=192)                 # the frozen "large" model (Qwen2-1.5B: d 1536, 28 layers)
SMALL = dict(d=32, h=4, L=2, dff=128)               # the trainable "small" model (GPT-Neo-125M: d 768, 12 layers)
ADAPTER_DIM = 12                                    # model.py: 256 for d 768 (one third); here about a third of 32
XHEADS = 4                                          # model.py: 8 heads in the cross-attention

FACTS = [('sum', a, b, a + b) for a in range(20) for b in range(20)] + [('rem', a, b, a % b) for a in range(20) for b in range(2, 10)]


def split(seed=2025):
    r = random.Random(seed); idx = list(range(len(FACTS))); r.shuffle(idx)
    n_tr, n_va = round(0.25 * len(FACTS)), round(0.10 * len(FACTS))
    return sorted(idx[:n_tr]), sorted(idx[n_tr:n_tr + n_va]), sorted(idx[n_tr + n_va:])
TRAIN, VAL, TEST = split()


def fact_tokens(f):
    op, a, b, c = f
    return [num(a), IDX['+' if op == 'sum' else '%'], num(b), IDX['='], num(c)]


def trace(f):
    op, a, b, c = f
    pr = [BOS, IDX['Q'], IDX[op], num(a), num(b), IDX['T']]
    body = fact_tokens(f) + [IDX[';']]
    body += [num(c), IDX['-'], num(b), IDX['='], num(a)] if op == 'sum' else [num(c), IDX['<'], num(b)]
    body += [IDX['ok'], IDX['A'], num(c), EOS]
    return pr, body
EQ_POS = 9          # index of the first "=" in a trace; the next token is the answer that needs knowledge
PROMPT_LEN = 6


def pretrain_seq(rng):
    """<bos> + 0..5 random tokens + facts '; '-separated until 24 tokens. Loss on fact tokens only."""
    x = [BOS]; keep = [0]
    for _ in range(rng.randint(0, 5)): x.append(rng.randrange(3, len(VOCAB))); keep.append(0)
    while True:
        f = fact_tokens(FACTS[rng.randrange(len(FACTS))]) + [IDX[';']]
        if len(x) + len(f) > TLEN: break
        x += f; keep += [1] * len(f)
    x += [PAD] * (TLEN - len(x)); keep += [0] * (TLEN - len(keep))
    return x, keep


def gelu_new(x):     # GPT-Neo's activation (the tanh approximation)
    return 0.5 * x * (1.0 + torch.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * x ** 3)))


class Block(nn.Module):
    """Pre-norm decoder block. scale=True for the large model; GPT-Neo does not scale attention scores by 1/sqrt(d_k)."""
    def __init__(s, c, scale=True, act='gelu'):
        super().__init__(); d = c['d']; s.h = c['h']; s.dk = d // c['h']; s.scale = scale; s.act = act
        s.n1 = nn.LayerNorm(d); s.n2 = nn.LayerNorm(d)
        s.q = nn.Linear(d, d, bias=scale); s.k = nn.Linear(d, d, bias=scale); s.v = nn.Linear(d, d, bias=scale)
        s.o = nn.Linear(d, d); s.f1 = nn.Linear(d, c['dff']); s.f2 = nn.Linear(c['dff'], d)

    def forward(s, x, allow, keep=None):
        z = s.n1(x); B, T, D = z.shape
        q, k, v = (m(z).view(B, T, s.h, s.dk).transpose(1, 2) for m in (s.q, s.k, s.v))
        a = q @ k.transpose(-1, -2)
        if s.scale: a = a / math.sqrt(s.dk)
        a = a.masked_fill(~allow, float('-inf')).softmax(-1)
        if keep is not None: keep.append(a.detach())
        x = x + s.o((a @ v).transpose(1, 2).reshape(B, T, D))
        z = s.n2(x)
        return x + s.f2(gelu_new(s.f1(z)) if s.act == 'gelu_new' else F.gelu(s.f1(z)))


def causal(T):
    return torch.tril(torch.ones(T, T, dtype=torch.bool))[None, None]


class Big(nn.Module):
    """The frozen knowledge source: embeddings, blocks, final norm, tied LM head. states() = hidden_states[-1]
    (after the final norm, as Hugging Face's Qwen2 returns it)."""
    def __init__(s, c=BIG):
        super().__init__(); s.c = c
        s.emb = nn.Embedding(len(VOCAB), c['d']); s.pos = nn.Embedding(TLEN, c['d'])
        s.blocks = nn.ModuleList(Block(c) for _ in range(c['L'])); s.nf = nn.LayerNorm(c['d'])

    def states(s, ids, keep=None):
        B, T = ids.shape; x = s.emb(ids) + s.pos(torch.arange(T))[None]; al = causal(T)
        for b in s.blocks: x = b(x, al, keep)
        return s.nf(x)

    def forward(s, ids, keep=None):
        return s.states(ids, keep) @ s.emb.weight.t()


class CrossAttentionLayer(nn.Module):
    """model.py CrossAttentionLayer: LayerNorm both inputs, Q from the small-model stream, K and V from the large
    model's states projected down, attention masked for padding only (or causally when causal=True)."""
    def __init__(s, qd, gd, heads):
        super().__init__(); s.h = heads; s.hd = gd // heads; s.gd = gd
        s.q_proj = nn.Linear(gd, gd); s.k_proj = nn.Linear(qd, gd); s.v_proj = nn.Linear(qd, gd); s.out_proj = nn.Linear(gd, gd)
        s.norm1 = nn.LayerNorm(qd); s.norm2 = nn.LayerNorm(gd); s.drop = nn.Dropout(0.1)

    def forward(s, big, g, allow, keep=None):
        B, T, _ = g.shape; big = s.norm1(big); g = s.norm2(g)
        q = s.q_proj(g).view(B, T, s.h, s.hd).transpose(1, 2)
        k = s.k_proj(big).view(B, T, s.h, s.hd).transpose(1, 2); v = s.v_proj(big).view(B, T, s.h, s.hd).transpose(1, 2)
        a = (q @ k.transpose(-1, -2)) / math.sqrt(s.hd)
        a = a.masked_fill(~allow, float('-inf')).softmax(-1)
        if keep is not None: keep.append(a.detach())
        a = s.drop(a)
        return s.out_proj((a @ v).transpose(1, 2).reshape(B, T, s.gd))


class Adapter(nn.Module):
    def __init__(s, d, ad):
        super().__init__(); s.fc1 = nn.Linear(d, ad); s.fc2 = nn.Linear(ad, d); s.norm = nn.LayerNorm(d)

    def forward(s, x):
        return s.norm(s.fc2(F.gelu(s.fc1(x)))) + x


class Enhanced(nn.Module):
    """model.py EnhancedCrossAttentionLayer: cross-attention, adapter, then a sigmoid gate over [g, attn_out]:
    out = gate * attn_out + (1 - gate) * g."""
    def __init__(s, qd, gd, heads, ad, plain=False):
        super().__init__(); s.plain = plain; s.cross_attn = CrossAttentionLayer(qd, gd, heads)
        if not plain: s.adapter = Adapter(gd, ad); s.gate = nn.Linear(2 * gd, gd)

    def forward(s, big, g, allow, keep=None, gates=None):
        o = s.cross_attn(big, g, allow, keep)
        if s.plain: return o
        o = s.adapter(o); gt = torch.sigmoid(s.gate(torch.cat([g, o], -1)))
        if gates is not None: gates.append(gt.detach())
        return gt * o + (1 - gt) * g


class Small(nn.Module):
    """GPT-Neo-style decoder: inputs_embeds + wpe (zeroed at the start, as model.py does), blocks without attention
    scaling, final norm, a new LM head over the large model's vocabulary (here the same toy vocabulary)."""
    def __init__(s, c=SMALL, own_emb=False):
        super().__init__(); s.c = c
        s.wte = nn.Embedding(len(VOCAB), c['d']) if own_emb else None
        s.wpe = nn.Embedding(TLEN, c['d'])
        if not own_emb:
            with torch.no_grad(): s.wpe.weight.zero_()
        s.blocks = nn.ModuleList(Block(c, scale=False, act='gelu_new') for _ in range(c['L'])); s.ln_f = nn.LayerNorm(c['d'])
        s.head = nn.Linear(c['d'], len(VOCAB), bias=False)

    def forward(s, x, keep=None):
        if s.wte is not None: x = s.wte(x)
        B, T, _ = x.shape; x = x + s.wpe(torch.arange(T))[None]; al = causal(T)
        for b in s.blocks: x = b(x, al, keep)
        return s.head(s.ln_f(x))


class Combined(nn.Module):
    """model.py ModifiedQwenWithCrossAttention + ModifiedGptNeo + CombinedModel."""
    def __init__(s, big, causal_x=False, plain=False):
        super().__init__(); qd, gd = BIG['d'], SMALL['d']; s.causal_x = causal_x
        s.big = big
        for p in s.big.parameters(): p.requires_grad = False
        s.pre_proj = nn.Linear(qd, qd); s.proj = nn.Linear(qd, gd)
        mid = (qd + gd) // 2
        s.intermediate = nn.Sequential(nn.Linear(qd, mid), nn.LayerNorm(mid), nn.GELU(), nn.Linear(mid, gd), nn.LayerNorm(gd))
        s.xlayers = nn.ModuleList(Enhanced(qd, gd, XHEADS, ADAPTER_DIM, plain) for _ in range(2))
        s.small = Small()

    def bridge(s, ids, keep=None, gates=None):
        with torch.no_grad(): h = s.big.states(ids)
        pre = s.pre_proj(h); projected = s.proj(pre); g = s.intermediate(pre)
        B, T = ids.shape; real = (ids != PAD)[:, None, None, :]
        allow = real & causal(T) if s.causal_x else real.expand(B, 1, T, T)
        for l in s.xlayers: g = g + l(pre, g, allow, keep, gates)
        return g + projected

    def forward(s, ids, keep=None, gates=None):
        return s.small(s.bridge(ids, keep, gates))


class Head(nn.Module):
    def __init__(s, big):
        super().__init__(); s.big = big
        for p in s.big.parameters(): p.requires_grad = False
        s.head = nn.Linear(BIG['d'], len(VOCAB))

    def forward(s, ids, keep=None, gates=None):
        with torch.no_grad(): h = s.big.states(ids)
        return s.head(h)


class SmallOnly(nn.Module):
    def __init__(s):
        super().__init__(); s.small = Small(own_emb=True)

    def forward(s, ids, keep=None, gates=None):
        return s.small(ids, keep)


class BigFT(nn.Module):
    def __init__(s, big):
        super().__init__(); s.big = big

    def forward(s, ids, keep=None, gates=None):
        return s.big(ids, keep)


VARIANTS = ['released', 'causal', 'plain', 'small', 'bigft', 'head']
LR_GRID = [1e-4, 3e-4, 1e-3, 3e-3]   # 1e-4 is model.py's own bridge learning rate
STEPS, BATCH = 2500, 32


def load_big():
    b = Big(); b.load_state_dict(torch.load(os.path.join(MD, 'big.pt'))); return b


def build(name, seed):
    torch.manual_seed(1000 + seed)
    if name in ('released', 'causal', 'plain'): return Combined(load_big(), causal_x=name != 'released', plain=name == 'plain')
    if name == 'small': return SmallOnly()
    if name == 'bigft': return BigFT(load_big())
    if name == 'head': return Head(load_big())


def param_groups(m, name, lr):
    if name in ('released', 'causal', 'plain'):
        ad = [p for n, p in m.named_parameters() if p.requires_grad and not n.startswith('small.')]
        return [{'params': ad, 'lr': lr}, {'params': list(m.small.parameters()), 'lr': lr / 2}]
    return [{'params': [p for p in m.parameters() if p.requires_grad], 'lr': lr}]


def batch_of(facts):
    ids = torch.full((len(facts), TLEN), PAD, dtype=torch.long)
    for i, f in enumerate(facts):
        p, b = trace(FACTS[f]); s = p + b; ids[i, :len(s)] = torch.tensor(s)
    return ids


def lm_loss(lg, ids):
    """model.py: labels = input_ids, shift by one, pad ignored; every token counts, prompt included."""
    y = ids[:, 1:].clone(); y[y == PAD] = -100
    return F.cross_entropy(lg[:, :-1].reshape(-1, lg.shape[-1]), y.reshape(-1), ignore_index=-100)


@torch.no_grad()
def generate(m, facts, maxnew=TLEN - PROMPT_LEN):
    """Free-running greedy decoding from the prompt, recomputing the whole prefix every step (as model.py's
    generate_response does). Returns token lists."""
    seqs = [trace(FACTS[f])[0][:] for f in facts]; done = [False] * len(seqs)
    for _ in range(maxnew):
        T = len(seqs[0]); ids = torch.tensor(seqs)
        nxt = m(ids)[:, -1].argmax(-1).tolist()
        for i, t in enumerate(nxt):
            seqs[i].append(EOS if done[i] else t)
            if t == EOS: done[i] = True
        if all(done) or T + 1 >= TLEN: break
    return seqs


def answer_of(seq):
    """The number after 'A' (the final answer), or None."""
    for i in range(PROMPT_LEN, len(seq) - 1):
        if seq[i] == IDX['A']: return seq[i + 1] - N0 if seq[i + 1] >= N0 else None
    return None


@torch.no_grad()
def evaluate(m, facts, rng_seed=7):
    m.eval(); ids = batch_of(facts); lg = m(ids)
    loss = float(lm_loss(lg, ids))
    truth = torch.tensor([num(FACTS[f][3]) for f in facts])
    tf_eq = float((lg[:, EQ_POS].argmax(-1) == truth).float().mean())
    # the leak probe: replace every token after the "=" with a random number, keep the prompt and the "=".
    g = torch.Generator().manual_seed(rng_seed); scr = ids.clone()
    rnd = torch.randint(N0, N0 + NMAX, scr.shape, generator=g)
    after = torch.arange(TLEN)[None] > EQ_POS
    scr = torch.where(after & (scr != PAD), rnd, scr)
    tf_eq_scr = float((m(scr)[:, EQ_POS].argmax(-1) == truth).float().mean())
    seqs = generate(m, facts)
    ans = [answer_of(s) for s in seqs]
    gen_acc = float(np.mean([a == FACTS[f][3] for a, f in zip(ans, facts)]))
    exact = float(np.mean([s[:len(trace(FACTS[f])[0]) + len(trace(FACTS[f])[1])] == trace(FACTS[f])[0] + trace(FACTS[f])[1] for s, f in zip(seqs, facts)]))
    eq_gen = float(np.mean([len(s) > EQ_POS + 1 and s[EQ_POS + 1] == num(FACTS[f][3]) for s, f in zip(seqs, facts)]))
    m.train()
    return dict(loss=round(loss, 4), tf_eq=round(tf_eq, 4), tf_eq_scrambled=round(tf_eq_scr, 4), gen_acc=round(gen_acc, 4),
                gen_eq=round(eq_gen, 4), gen_exact=round(exact, 4))


def pretrain(steps=6000, seed=0):
    torch.manual_seed(seed); rng = random.Random(seed)
    m = Big(); opt = torch.optim.AdamW(m.parameters(), lr=3e-3, weight_decay=0.01)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, 3e-3, total_steps=steps, pct_start=0.05)
    log = open(os.path.join(MD, 'pretrain.log'), 'w'); t0 = time.time()
    for st in range(steps):
        xs = [pretrain_seq(rng) for _ in range(128)]
        x = torch.tensor([a for a, _ in xs]); k = torch.tensor([b for _, b in xs])
        lg = m(x); y = x[:, 1:].clone(); y[k[:, 1:] == 0] = -100
        loss = F.cross_entropy(lg[:, :-1].reshape(-1, lg.shape[-1]), y.reshape(-1), ignore_index=-100)
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
        if st % 500 == 0 or st == steps - 1:
            print(f'{st} loss {loss.item():.4f} facts {fact_acc(m):.4f} in_trace {trace_fact_acc(m):.4f} {time.time()-t0:.0f}s', file=log, flush=True)
    torch.save(m.state_dict(), os.path.join(MD, 'big.pt'))
    return m


@torch.no_grad()
def fact_acc(m, offsets=(0, 3, 6, 9)):
    """Answer accuracy over all 560 facts after a random prefix of each length in offsets."""
    m.eval(); r = random.Random(3); ok = n = 0
    for off in offsets:
        x = []
        for f in FACTS:
            s = [BOS] + [r.randrange(3, len(VOCAB)) for _ in range(off)] + fact_tokens(f)[:4]; x.append(s)
        lg = m(torch.tensor(x))[:, -1]
        ok += int((lg.argmax(-1) == torch.tensor([num(f[3]) for f in FACTS])).sum()); n += len(FACTS)
    m.train(); return ok / n


@torch.no_grad()
def trace_fact_acc(m, facts=None):
    """The frozen model's own answer at the '=' of a reasoning trace it never saw (its knowledge in context)."""
    facts = facts or list(range(len(FACTS))); m.eval(); ids = batch_of(facts)
    a = float((m(ids)[:, EQ_POS].argmax(-1) == torch.tensor([num(FACTS[f][3]) for f in facts])).float().mean()); m.train(); return a


def finetune(name, seed, lr, steps=STEPS, log=None, save=True, evalset=None):
    m = build(name, seed); rng = random.Random(seed)
    opt = torch.optim.AdamW(param_groups(m, name, lr))
    curve = []; t0 = time.time(); evalset = evalset or VAL
    for st in range(steps):
        ids = batch_of([rng.choice(TRAIN) for _ in range(BATCH)])
        loss = lm_loss(m(ids), ids)
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_([p for p in m.parameters() if p.requires_grad], 1.0); opt.step()
        if st % 250 == 0 or st == steps - 1:
            ev = evaluate(m, evalset)
            curve.append([st, round(loss.item(), 4), ev['loss'], ev['tf_eq'], ev['gen_acc']])
            if log: print(f'{name} s{seed} lr{lr} {st} train {loss.item():.4f} val {ev} {time.time()-t0:.0f}s', file=log, flush=True)
    out = dict(curve=curve, secs=round(time.time() - t0, 1), lr=lr)
    if save:
        out['test'] = evaluate(m, TEST); out['train'] = evaluate(m, TRAIN); out['val'] = evaluate(m, VAL)
        torch.save({k: v for k, v in m.state_dict().items() if name == 'bigft' or not k.startswith('big.')}, os.path.join(MD, f'ft_{name}_s{seed}.pt'))
        if name in ('released', 'causal'):
            out['leak'] = leak_stats(m)
    return out


@torch.no_grad()
def leak_stats(m):
    """Share of the cross-attention weight that each query puts on LATER positions (test facts, teacher-forced),
    for the query at the first '=' and averaged over all real positions; plus the mean gate value."""
    m.eval(); ids = batch_of(TEST); keep, gates = [], []; m(ids, keep=keep, gates=gates)
    T = ids.shape[1]; fut = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)
    real = (ids != PAD)
    res = {}
    for l, a in enumerate(keep[:2]):     # the two cross-attention layers come first (the bridge runs before the small model)
        fm = (a * fut).sum(-1).mean(1)                       # [B, T] future mass, averaged over heads
        res[f'layer{l}_future_mass_at_eq'] = round(float(fm[:, EQ_POS].mean()), 4)
        res[f'layer{l}_future_mass_all'] = round(float(fm[real].mean()), 4)
        res[f'layer{l}_mass_on_answer_at_eq'] = round(float(a[:, :, EQ_POS, EQ_POS + 1].mean()), 4)
    if gates: res['gate_mean'] = [round(float(g[real].mean()), 4) for g in gates]
    m.train(); return res


B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
SHIP = ['released', 'causal']


def q6(t):
    """6 bits per weight (one base64 character), per-row scale as a power of 2^(1/8) below the tensor max (one character)."""
    if t.dim() == 2 and t.shape[1] < t.shape[0]:
        o, d = q6(t.t()); o['t'] = 1; o['shape'] = list(t.shape); return o, d.t().contiguous()
    t = t.detach().double(); mx = float('%.9g' % (float(t.abs().max()) or 1e-12)); rows, s, out = [], [], torch.empty_like(t)
    for i in range(t.shape[0]):
        rm = float(t[i].abs().max()) or mx * 2 ** -7.875
        e = min(63, max(0, int(math.floor(-8 * math.log2(rm / mx))))); sc = mx * 2 ** (-e / 8) / 31
        q = torch.clamp(torch.round(t[i] / sc), -31, 31); out[i] = q * sc
        s.append(B64[e]); rows.append(''.join(B64[int(v) + 32] for v in q))
    return dict(shape=list(t.shape), mx=mx, s=''.join(s), q=''.join(rows)), out


def qvec(t):
    """Vectors (biases, norm gains) at 12 bits: two base64 characters each, one scale per vector."""
    t = t.detach().double(); mx = float('%.9g' % (float(t.abs().max()) or 1e-12))
    q = torch.clamp(torch.round(t / mx * 2047), -2047, 2047)
    code = ''.join(B64[(int(c) + 2048) >> 6] + B64[(int(c) + 2048) & 63] for c in q)
    return dict(vx=mx, vq=code), q * mx / 2047


def pack(sd, skip=()):
    js, deq = {}, {}
    for k, v in sd.items():
        if any(k.startswith(p) for p in skip): continue
        o, d = (q6 if v.dim() == 2 else qvec)(v); js[k] = o; deq[k] = d
    return js, deq


def export():
    """Quantise the frozen model and seed 0 of each shipped variant; write parts/20_model_data.js and model/q_<name>.pt
    (the dequantised float64 weights, so check_forward.py compares the browser and PyTorch on identical numbers)."""
    res = json.load(open(os.path.join(MD, 'results.json')))
    bjs, bdq = pack(torch.load(os.path.join(MD, 'big.pt')))
    torch.save(bdq, os.path.join(MD, 'q_big.pt'))
    W = dict(vocab=VOCAB, big=BIG, small=SMALL, xheads=XHEADS, adapter_dim=ADAPTER_DIM, tlen=TLEN, eq_pos=EQ_POS, prompt_len=PROMPT_LEN,
             split=dict(train=TRAIN, val=VAL, test=TEST), bigw=bjs, variants={})     # FACTS are rebuilt in the browser by the same rule
    for nm in SHIP:
        sd = torch.load(os.path.join(MD, f'ft_{nm}_s0.pt'))
        vjs, vdq = pack(sd); W['variants'][nm] = vjs
        torch.save(vdq, os.path.join(MD, f'q_{nm}.pt'))
        m = build(nm, 0).double(); full = dict(vdq); full.update({'big.' + k: v for k, v in bdq.items()}); m.load_state_dict(full)
        res[f'{nm}_s0']['test_quantised'] = evaluate(m, TEST)
    b = Big().double(); b.load_state_dict(bdq); res['big_quantised'] = dict(facts=fact_acc(b), in_trace=trace_fact_acc(b))
    json.dump(res, open(os.path.join(MD, 'results.json'), 'w'), indent=1)
    js = '// Generated by train.py export: the frozen toy "large" model and seed 0 of two trained bridges + small models, 6-bit.\nwindow.LMW=' + json.dumps(W, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    print('wrote', len(js), 'bytes')


def results_path():
    return os.path.join(MD, 'results.json')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'export': export()
    elif cmd == 'pretrain':
        m = pretrain()
        r = json.load(open(results_path())) if os.path.exists(results_path()) else {}
        r['big'] = dict(facts=fact_acc(m), in_trace=trace_fact_acc(m), in_trace_test=trace_fact_acc(m, TEST))
        json.dump(r, open(results_path(), 'w'), indent=1)
    elif cmd == 'lr':
        names = sys.argv[2:] or VARIANTS
        log = open(os.path.join(MD, 'lr.log'), 'a'); p = os.path.join(MD, 'lr.json')
        res = json.load(open(p)) if os.path.exists(p) else {}
        for nm in names:
            for lr in LR_GRID:
                key = f'{nm}|{lr}'
                if key in res: continue
                r = finetune(nm, 0, lr, log=log, save=False)
                res[key] = dict(val_gen_acc=r['curve'][-1][4], val_loss=r['curve'][-1][2], secs=r['secs'])
                json.dump(res, open(p, 'w'), indent=1)
    elif cmd == 'finetune':
        lrs = json.load(open(os.path.join(MD, 'lr.json')))
        names = sys.argv[2:] or VARIANTS
        log = open(os.path.join(MD, 'finetune.log'), 'a')
        res = json.load(open(results_path())) if os.path.exists(results_path()) else {}
        for nm in names:
            cand = {float(k.split('|')[1]): v for k, v in lrs.items() if k.split('|')[0] == nm}
            best = max(cand, key=lambda l: (cand[l]['val_gen_acc'], -cand[l]['val_loss']))
            for seed in (0, 1, 2):
                key = f'{nm}_s{seed}'
                if key in res: continue
                res[key] = finetune(nm, seed, best, log=log)
                json.dump(res, open(results_path(), 'w'), indent=1)
                print(key, res[key]['test'], file=log, flush=True)
    elif cmd == 'extras':
        # how much of its knowledge the fully fine-tuned frozen model keeps: brief-format answers on the test facts
        res = json.load(open(results_path()))
        @torch.no_grad()
        def brief(m, facts):
            m.eval(); x = torch.tensor([[BOS] + fact_tokens(FACTS[f])[:4] for f in facts])
            return float((m(x)[:, -1].argmax(-1) == torch.tensor([num(FACTS[f][3]) for f in facts])).float().mean())
        res['big']['brief_test'] = brief(load_big(), TEST)
        for s in (0, 1, 2):
            k = f'bigft_s{s}'
            if k not in res: continue
            m = BigFT(Big()); m.load_state_dict(torch.load(os.path.join(MD, f'ft_bigft_s{s}.pt'))); res[k]['brief_test'] = brief(m.big, TEST)
        json.dump(res, open(results_path(), 'w'), indent=1)
        print('brief', res['big']['brief_test'], [res.get(f'bigft_s{s}', {}).get('brief_test') for s in range(3)])
