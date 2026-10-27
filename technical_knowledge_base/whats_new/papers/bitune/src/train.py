"""Bitune at toy scale: pretrain a tiny causal decoder, then finetune it with every method of the
paper's Table 5 (and Table 8's anti-causal mask, and a rank-matched LoRA like LoRA16), 3 seeds each.

  uv run --with torch --with numpy python train.py pretrain        # the causal "pretrained model"
  uv run --with torch --with numpy python train.py lr               # LR sweep on the LoRA baseline only (paper Sec. 3.1)
  uv run --with torch --with numpy python train.py finetune [names] # every variant x 3 seeds at that LR
  uv run --with torch --with numpy python train.py export           # parts/20_model_data.js, model/q_*.pt, test_quantised in results.json

The task ("clubs"). 48 people, 32 clubs, a fixed random membership table F[club][person] (25% density).
 - Pretraining (causal language modelling), half of each kind of sequence: facts stated club first
     <bos> chess Ada yes  choir Ben no  ...
   and the question asked BEFORE the list:  <bos> ? chess Ada Ben Cy : Ben <eos>
   so the pretrained model applies its knowledge at a person's token only when the club came before it.
   (A first design that pretrained on facts alone failed for a reason unrelated to the paper: no finetuning
   method, even full-rank LoRA, learned to copy a name; its logs are in model/design1/.)
 - The instruction task asks the question AFTER the list, as a document followed by a question does:
     prompt  <bos> Ada Ben Cy Dee ? chess        answer  : Ben <eos>
   exactly one listed person is in the club. Under causal attention no person token can see "chess";
   with a bidirectional pass over the prompt every person token can.
 - Control: the same task with the question first (<bos> ? chess Ada Ben Cy Dee  : Ben <eos>), LoRA only.

Bitune follows the paper (Sec. 2, Algorithm 1, Eqs. 1 to 8) and the authors' code (passes.py,
PassScale variant 607): two passes over the prompt with two adapters ("prefill" with the bidirectional
mask, "default" with the causal mask, the default one also generates the answer), the K and V of every
block mixed as K = Kc (1 - a) + Kb a with a = |theta| / (theta_init + |theta|), one theta for K and one for
V per block, theta initialised to theta_init = 0.01 (so a starts at 0.5), mixing in float32; the last
prompt token (":") is moved to the start of the answer, as in the paper's Sec. 3.1.
LoRA on every linear layer of attention and MLP (paper Table 12), rank 4, scale alpha/r = 1.
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

NAMES = ('Ada Ben Cy Dee Eve Fay Gus Hal Ivy Jo Kai Lea Max Ned Oz Pia Quin Ray Sam Tia Uma Val Wes Xan '
         'Yan Zoe Abe Bea Cal Dot Eli Flo Gil Hen Ida Jay Kit Lou Mo Nia Otto Pam Rex Sue Ted Una Vic Wyn').split()
CLUBS = ('chess choir drama robots hiking poetry rowing tennis judo baking jazz film radio debate climbing '
         'origami sailing fencing pottery astronomy cycling garden karate ballet coding birding knitting '
         'rugby salsa trivia yoga quiz').split()
SPECIAL = ['<pad>', '<bos>', '<eos>', '?', ':', 'yes', 'no']
VOCAB = SPECIAL + NAMES + CLUBS
IDX = {w: i for i, w in enumerate(VOCAB)}
PAD, BOS, EOS, QM, COLON, YES, NO = range(7)
NP, NC = len(NAMES), len(CLUBS)
P0, C0 = len(SPECIAL), len(SPECIAL) + NP
CFG = dict(d=32, h=4, L=3, dff=128, maxlen=16, rank=4)
KMIN, KMAX = 3, 6


def table(seed=1234):
    r = np.random.RandomState(seed)
    Fm = (r.rand(NC, NP) < 0.25).astype(np.int64)
    for c in range(NC):          # every club needs members and non-members
        if Fm[c].sum() < 4: Fm[c, r.choice(NP, 4, replace=False)] = 1
    return Fm
FM = table()
MEMB = [np.nonzero(FM[c])[0] for c in range(NC)]
NONM = [np.nonzero(1 - FM[c])[0] for c in range(NC)]


def pretrain_batch(rng, B):
    """16 tokens, half of each kind:
    facts:      <bos> club person yes|no  x5 (50% yes)
    questions:  <bos> ? club p1 .. pk : member <eos> <pad>.. (the question FIRST, as pretraining text would put it)"""
    x = np.full((B, 16), PAD, np.int64); x[:, 0] = BOS
    for b in range(B):
        if b % 2 == 0:
            for f in range(5):
                c = rng.randrange(NC); y = rng.random() < 0.5
                p = rng.choice(MEMB[c] if y else NONM[c])
                x[b, 1 + 3 * f:4 + 3 * f] = (C0 + c, P0 + p, YES if y else NO)
        else:
            pr, an = task_example(rng, qfirst=True); seq = pr + an; x[b, :len(seq)] = seq
    return torch.tensor(x)


def task_example(rng, qfirst=False):
    k = rng.randint(KMIN, KMAX); c = rng.randrange(NC)
    m = int(rng.choice(MEMB[c])); others = rng.sample(list(NONM[c]), k - 1)
    ppl = others[:]; ppl.insert(rng.randrange(k), m)
    names = [P0 + int(p) for p in ppl]
    prompt = [BOS, QM, C0 + c] + names if qfirst else [BOS] + names + [QM, C0 + c]
    return prompt, [COLON, P0 + m, EOS]


def task_batch(rng, B, qfirst=False):
    ex = [task_example(rng, qfirst) for _ in range(B)]
    return collate(ex)


def collate(ex):
    """Left-pad prompts so every prompt ends at the same column; answers follow."""
    T = max(len(p) for p, _ in ex)
    pr = np.full((len(ex), T), PAD, np.int64); an = np.array([a for _, a in ex], np.int64)
    for i, (p, _) in enumerate(ex): pr[i, T - len(p):] = p
    return torch.tensor(pr), torch.tensor(an)


class Lin(nn.Module):
    """A linear layer with any number of named LoRA adapters; one is active at a time."""
    def __init__(s, i, o):
        super().__init__(); s.base = nn.Linear(i, o); s.A = nn.ParameterDict(); s.B = nn.ParameterDict(); s.act = None

    def add(s, name, r):
        s.A[name] = nn.Parameter(torch.empty(r, s.base.in_features)); nn.init.kaiming_uniform_(s.A[name], a=math.sqrt(5))
        s.B[name] = nn.Parameter(torch.zeros(s.base.out_features, r))

    def forward(s, x):
        y = s.base(x)
        if s.act is not None and s.act in s.A: y = y + (x @ s.A[s.act].t()) @ s.B[s.act].t()   # scale alpha/r = 1
        return y


class Block(nn.Module):
    def __init__(s, c):
        super().__init__(); d = c['d']; s.h = c['h']; s.dk = d // c['h']
        s.q, s.k, s.v, s.o = (Lin(d, d) for _ in range(4)); s.f1 = Lin(d, c['dff']); s.f2 = Lin(c['dff'], d)
        s.n1 = nn.LayerNorm(d); s.n2 = nn.LayerNorm(d)

    def kv(s, x):
        z = s.n1(x); B, T, D = z.shape
        return (s.k(z).view(B, T, s.h, s.dk).transpose(1, 2), s.v(z).view(B, T, s.h, s.dk).transpose(1, 2))

    def forward(s, x, allow, past=None, keep=None):
        """allow: bool [T, S] (query t may see key s), S = len(past) + T. Returns new x and this pass's (K, V)."""
        z = s.n1(x); B, T, D = z.shape
        q = s.q(z).view(B, T, s.h, s.dk).transpose(1, 2)
        k = s.k(z).view(B, T, s.h, s.dk).transpose(1, 2); v = s.v(z).view(B, T, s.h, s.dk).transpose(1, 2)
        K, V = (k, v) if past is None else (torch.cat([past[0], k], 2), torch.cat([past[1], v], 2))
        a = (q @ K.transpose(-1, -2)) / math.sqrt(s.dk)
        a = a.masked_fill(~allow, float('-inf')).softmax(-1)
        if keep is not None: keep.append(a.detach())
        x = x + s.o((a @ V).transpose(1, 2).reshape(B, T, D))
        x = x + s.f2(F.gelu(s.f1(s.n2(x))))
        return x, (k, v)


class Toy(nn.Module):
    def __init__(s, c=CFG):
        super().__init__(); s.c = c
        s.emb = nn.Embedding(len(VOCAB), c['d']); s.pos = nn.Embedding(c['maxlen'], c['d'])
        s.blocks = nn.ModuleList(Block(c) for _ in range(c['L'])); s.nf = nn.LayerNorm(c['d'])
        s.theta_k = nn.Parameter(torch.zeros(c['L'])); s.theta_v = nn.Parameter(torch.zeros(c['L']))

    def lins(s):
        return [m for m in s.modules() if isinstance(m, Lin)]

    def set_adapter(s, name):
        for m in s.lins(): m.act = name

    def run(s, ids, pos, allow, past=None, keep=None):
        x = s.emb(ids) + s.pos(pos); kvs = []
        for i, b in enumerate(s.blocks):
            x, kv = b(x, allow, None if past is None else past[i], keep)
            kvs.append(kv if past is None else (torch.cat([past[i][0], kv[0]], 2), torch.cat([past[i][1], kv[1]], 2)))
        return s.nf(x) @ s.emb.weight.t(), kvs


def masks(pr, kind):
    """Prompt self-attention mask [B,1,T,T] for a left-padded prompt; pads are never attended (except a pad to itself)."""
    B, T = pr.shape; real = pr != PAD
    i = torch.arange(T)
    base = {'causal': i[None, :] <= i[:, None], 'bidir': torch.ones(T, T, dtype=torch.bool),
            'anti': i[None, :] >= i[:, None]}[kind]
    m = base[None] & real[:, None, :]
    m = m | torch.eye(T, dtype=torch.bool)[None]          # keeps pad rows finite; pads are never keys of real tokens
    return m[:, None]


def positions(pr):
    real = (pr != PAD).long(); return (real.cumsum(1) - 1).clamp(min=0)


# Every finetuning method of the paper's Table 5 and 8, as (prompt passes, mixing):
#   pass = (mask, adapter); one pass and no mixing means the answer reads that pass's K and V directly.
METHODS = {
    'lora':      dict(passes=[('causal', 'default')], rank=4),
    'lora_2r':   dict(passes=[('causal', 'default')], rank=8),      # like LoRA16: matches Bitune's parameter count
    'naive':     dict(passes=[('bidir', 'default')], rank=4),        # Naive Bidir.: prefix-LM mask, one adapter
    'nomix':     dict(passes=[('bidir', 'prefill')], rank=4),        # No Mixing: bidirectional features only, own adapter
    'onlycausal': dict(passes=[('causal', 'default'), ('causal', 'prefill')], rank=4),
    'shared':    dict(passes=[('causal', 'default'), ('bidir', 'default')], rank=4),
    'anti':      dict(passes=[('causal', 'default'), ('anti', 'prefill')], rank=4),
    'bitune':    dict(passes=[('causal', 'default'), ('bidir', 'prefill')], rank=4),
    'lora_qfirst': dict(passes=[('causal', 'default')], rank=4, qfirst=True),
}
THETA_INIT = 0.01


def alpha(th):
    return th.abs() / (THETA_INIT + th.abs())          # Eq. 8


def prefill(model, meth, pr, keep=None):
    pos = positions(pr); outs = []
    for mk, ad in meth['passes']:
        model.set_adapter(ad); _, kvs = model.run(pr, pos, masks(pr, mk), keep=keep); outs.append(kvs)
    if len(outs) == 1: return outs[0], None
    dt = torch.float64 if outs[0][0][0].dtype == torch.float64 else torch.float32     # mixing in (at least) float32, as the paper
    ak, av = alpha(model.theta_k.to(dt)), alpha(model.theta_v.to(dt))
    mixed = [(kc.to(dt) * (1 - ak[i]) + kb.to(dt) * ak[i], vc.to(dt) * (1 - av[i]) + vb.to(dt) * av[i])   # Eqs. 6, 7
             for i, ((kc, vc), (kb, vb)) in enumerate(zip(outs[0], outs[1]))]
    return mixed, (ak, av)


def answer_logits(model, meth, pr, ans_in, keep=None):
    """Teacher-forced answer pass with the default adapter, causal, over the mixed prompt K/V."""
    past, _ = prefill(model, meth, pr, keep)
    B, T = pr.shape; A = ans_in.shape[1]
    pos = positions(pr)[:, -1:] + 1 + torch.arange(A)[None]
    real = pr != PAD
    allow = torch.cat([real[:, None, :].expand(B, A, T), torch.tril(torch.ones(A, A, dtype=torch.bool))[None].expand(B, A, A)], 2)[:, None]
    model.set_adapter('default'); lg, _ = model.run(ans_in, pos, allow, past=past, keep=keep)
    return lg


def pretrain(steps=12000, seed=0):
    torch.manual_seed(seed); rng = random.Random(seed)
    m = Toy(); opt = torch.optim.AdamW(m.parameters(), lr=3e-3, weight_decay=0.01)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, 3e-3, total_steps=steps, pct_start=0.05)
    T = 16; allow = (torch.arange(T)[None, :] <= torch.arange(T)[:, None])[None, None]
    pos = torch.arange(T)[None]; log = open(os.path.join(MD, 'pretrain.log'), 'w'); t0 = time.time()
    for st in range(steps):
        x = pretrain_batch(rng, 128)
        lg, _ = m.run(x, pos.expand(x.shape[0], T), allow)
        loss = F.cross_entropy(lg[:, :-1].reshape(-1, lg.shape[-1]), x[:, 1:].reshape(-1), ignore_index=PAD)
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
        if st % 500 == 0 or st == steps - 1:
            acc = fact_acc(m); qa = qfirst_acc(m)
            print(f'{st} loss {loss.item():.4f} fact_acc {acc:.4f} qfirst_task_acc {qa:.4f} {time.time()-t0:.0f}s', file=log, flush=True)
    torch.save(m.state_dict(), os.path.join(MD, 'pretrained.pt'))
    return m


@torch.no_grad()
def fact_acc(m):
    """Yes/no accuracy over the whole table, club before person (the pretraining order)."""
    x = []
    for c in range(NC):
        for p in range(NP): x.append([BOS, C0 + c, P0 + p])
    x = torch.tensor(x); T = 3
    lg, _ = m.run(x, torch.arange(T)[None].expand(len(x), T), (torch.arange(T)[None, :] <= torch.arange(T)[:, None])[None, None])
    pred = (lg[:, -1, YES] > lg[:, -1, NO]).long().numpy()
    return float((pred == FM.reshape(-1)).mean())


@torch.no_grad()
def qfirst_acc(m, n=1000):
    """The pretrained model on question-first prompts (no finetuning)."""
    m.set_adapter(None); return evaluate(m, METHODS['lora_qfirst'], n=n, seed=5)


def build(meth, seed):
    torch.manual_seed(1000 + seed)
    m = Toy(); m.load_state_dict(torch.load(os.path.join(MD, 'pretrained.pt')), strict=False)
    ads = sorted({ad for _, ad in meth['passes']} | {'default'})
    for l in m.lins():
        for ad in ads: l.add(ad, meth['rank'])
    with torch.no_grad(): m.theta_k.fill_(THETA_INIT); m.theta_v.fill_(THETA_INIT)
    for n, p in m.named_parameters():
        p.requires_grad = ('.A.' in n or '.B.' in n or (n.startswith('theta') and len(meth['passes']) == 2))
    return m


@torch.no_grad()
def evaluate(m, meth, n=2000, seed=99, batch=500):
    rng = random.Random(seed); ok = 0
    for i in range(0, n, batch):
        pr, an = task_batch(rng, batch, meth.get('qfirst', False))
        lg = answer_logits(m, meth, pr, an[:, :1])
        pred = lg[:, 0, P0:C0].argmax(-1) + P0          # the answer is one of the 48 names
        ok += int((pred == an[:, 1]).sum())
    return ok / n


def finetune(name, seed, lr, steps=3000, B=32, log=None, save=True):
    meth = METHODS[name]; m = build(meth, seed); rng = random.Random(seed)
    ps = [p for p in m.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(ps, lr=lr, weight_decay=0.0)               # paper Table 9: AdamW, linear, no weight decay, 10% warmup
    warm = steps // 10
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: (s + 1) / warm if s < warm else max(0.0, (steps - s) / (steps - warm)))
    curve = []; t0 = time.time()
    for st in range(steps):
        pr, an = task_batch(rng, B, meth.get('qfirst', False))
        lg = answer_logits(m, meth, pr, an[:, :2])
        loss = F.cross_entropy(lg.reshape(-1, lg.shape[-1]), an[:, 1:3].reshape(-1))   # loss on the name and <eos>
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
        if st % 250 == 0 or st == steps - 1:
            acc = evaluate(m, meth, n=500, seed=7)
            curve.append([st, round(loss.item(), 4), acc])
            if log: print(f'{name} s{seed} lr{lr} {st} loss {loss.item():.4f} val {acc:.3f} {time.time()-t0:.0f}s', file=log, flush=True)
    test = evaluate(m, meth)
    if save: torch.save({k: v for k, v in m.state_dict().items() if '.A.' in k or '.B.' in k or k.startswith('theta')},
                        os.path.join(MD, f'ft_{name}_s{seed}.pt'))
    a = None
    if len(meth['passes']) == 2: a = [alpha(m.theta_k).tolist(), alpha(m.theta_v).tolist()]
    return dict(test=test, curve=curve, alpha=a, secs=round(time.time() - t0, 1))


B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
SHIP = ['lora', 'naive', 'onlycausal', 'bitune', 'lora_qfirst']


def q6(t):
    """6 bits per weight (one base64 character), per-row scale as a power of 2^(1/8) below the tensor max (one character)."""
    if t.shape[1] < t.shape[0]:      # tall and thin (LoRA's B): store the transpose, so one scale serves a long row
        o, d = q6(t.t()); o['t'] = 1; o['shape'] = list(t.shape); return o, d.t().contiguous()
    t = t.detach().double(); mx = float('%.9g' % (float(t.abs().max()) or 1e-12)); rows, s, out = [], [], torch.empty_like(t)
    for i in range(t.shape[0]):
        rm = float(t[i].abs().max()) or mx * 2 ** -7.875
        e = min(63, max(0, int(math.floor(-8 * math.log2(rm / mx))))); sc = mx * 2 ** (-e / 8) / 31
        q = torch.clamp(torch.round(t[i] / sc), -31, 31); out[i] = q * sc
        s.append(B64[e]); rows.append(''.join(B64[int(v) + 32] for v in q))
    return dict(shape=list(t.shape), mx=mx, s=''.join(s), q=''.join(rows)), out


def qvec(t):
    v = [float('%.5g' % x) for x in t.detach().double().tolist()]; return dict(v=v), torch.tensor(v, dtype=torch.float64)


def base_names(L=CFG['L']):
    n = [('emb', 'emb.weight'), ('pos', 'pos.weight')]
    for l in range(L):
        for x in ('q', 'k', 'v', 'o', 'f1', 'f2'): n += [(f'b{l}.{x}.w', f'blocks.{l}.{x}.base.weight'), (f'b{l}.{x}.b', f'blocks.{l}.{x}.base.bias')]
        for x in ('n1', 'n2'): n += [(f'b{l}.{x}.w', f'blocks.{l}.{x}.weight'), (f'b{l}.{x}.b', f'blocks.{l}.{x}.bias')]
    return n + [('nf.w', 'nf.weight'), ('nf.b', 'nf.bias')]


def export():
    """Quantise the pretrained base and seed 0 of every shipped variant; write parts/20_model_data.js and model/q_<name>.pt
    (the dequantised weights, so check_forward.py compares the browser and PyTorch on identical numbers)."""
    sd = torch.load(os.path.join(MD, 'pretrained.pt')); base, qsd = {}, {}
    for js, pt in base_names():
        o, deqt = (q6 if sd[pt].dim() == 2 else qvec)(sd[pt]); base[js] = o; qsd[pt] = deqt.double()
    variants = {}; res = json.load(open(os.path.join(MD, 'results.json')))
    for nm in SHIP:
        meth = METHODS[nm]; ft = torch.load(os.path.join(MD, f'ft_{nm}_s0.pt')); ads = {}; qft = {}
        for k, v in ft.items():
            if k.startswith('theta'): continue
            parts = k.split('.')   # blocks.l.x.A.name
            l, x, AB, ad = parts[1], parts[2], parts[3], parts[4]
            o, deqt = q6(v); ads.setdefault(ad, {})[f'b{l}.{x}.{AB}'] = o; qft[k] = deqt.double()
        al = None
        if len(meth['passes']) == 2:
            al = [alpha(ft['theta_k'].double()).tolist(), alpha(ft['theta_v'].double()).tolist()]   # full precision: the browser mixes with these
            qft['theta_k'] = ft['theta_k'].double(); qft['theta_v'] = ft['theta_v'].double()
        variants[nm] = dict(meth=dict(passes=meth['passes'], qfirst=meth.get('qfirst', False)), adapters=ads, alpha=al)
        sdq = dict(qsd); sdq.update(qft)
        torch.save(sdq, os.path.join(MD, f'q_{nm}.pt'))            # exactly the browser's numbers, float64
        m = build(meth, 0); m.load_state_dict(sdq, strict=False)
        res[f'{nm}_s0']['test_quantised'] = evaluate(m, meth)
    json.dump(res, open(os.path.join(MD, 'results.json'), 'w'), indent=1)
    W = dict(cfg=CFG, vocab=VOCAB, p0=P0, c0=C0, kmin=KMIN, kmax=KMAX, theta_init=THETA_INIT,
             table=[''.join(str(int(v)) for v in FM[c]) for c in range(NC)], base=base, variants=variants)
    js = '// Generated by train.py export: the toy decoder (pretrained base) and seed 0 of each finetuned variant, 6-bit.\nwindow.BTW=' + json.dumps(W, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    print('wrote', len(js), 'bytes')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'export': export()
    if cmd == 'pretrain':
        pretrain()
    elif cmd == 'lr':
        log = open(os.path.join(MD, 'lr.log'), 'a'); res = {}
        for lr in (1e-3, 3e-3, 1e-2):
            r = finetune('lora', 0, lr, log=log, save=False); res[str(lr)] = r['test']
            print('lr', lr, r['test'], file=log, flush=True)
        json.dump(res, open(os.path.join(MD, 'lr.json'), 'w'), indent=1)
    elif cmd == 'finetune':
        lr = json.load(open(os.path.join(MD, 'lr.json'))); best = float(max(lr, key=lambda k: lr[k]))
        names = sys.argv[2:] or list(METHODS)
        log = open(os.path.join(MD, 'finetune.log'), 'a')
        path = os.path.join(MD, 'results.json'); res = json.load(open(path)) if os.path.exists(path) else {}
        for nm in names:
            for seed in (0, 1, 2):
                key = f'{nm}_s{seed}'
                if key in res: continue
                res[key] = finetune(nm, seed, best, log=log); res[key]['lr'] = best
                json.dump(res, open(path, 'w'), indent=1)
                print(key, res[key]['test'], file=log, flush=True)
