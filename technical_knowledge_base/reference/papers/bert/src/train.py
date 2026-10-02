"""Pretrain and fine-tune the page's toy BERT, built as the paper's section 3 says at toy scale, and
export its weights for the browser.

  uv run --with torch --with numpy python train.py pretrain   # bert, nonsp, ltr  -> model/<v>.pt (+ checkpoints)
  uv run --with torch --with numpy python train.py finetune   # the fine-tuning sweep -> model/finetune.json, model/<v>_tag.pt
  uv run --with torch --with numpy python train.py export     # quantise, measure, write parts/20_model_data.js

Architecture (Devlin et al. 2018, section 3, https://arxiv.org/html/1810.04805v2#S3, and the released
modeling.py): input = token + learned position + segment embeddings, then LayerNorm and dropout; L
post-LN Transformer encoder layers (LayerNorm(x + Dropout(Sublayer(x)))) with GELU (the tanh form used
by the released code) and a 4H feed-forward; the masked-LM head is dense + GELU + LayerNorm, then the
token embedding matrix (tied) plus a bias; the NSP head is a tanh pooler on [CLS] then a 2-way layer.
Pretraining (section 3.1, appendix A.2): 15% of WordPiece positions chosen (never [CLS] or [SEP]),
80% [MASK], 10% random word, 10% unchanged; NSP with 50% IsNext; loss = mean MLM + mean NSP; Adam
(decoupled weight decay 0.01), beta 0.9/0.999, warmup then linear decay, dropout 0.1.

Variants, same size, data, seed and steps:
  bert   MLM + NSP (the paper's BERT)
  nonsp  MLM only (Table 5 "No NSP")
  ltr    left-to-right LM, causal mask, no NSP (Table 5 "LTR & No NSP"); the causal mask is kept at fine-tuning
Fine-tuning adds, from random initialisation:
  scratch  the same bidirectional encoder with no pretraining
  ltr_bi   ltr plus one fresh bidirectional encoder layer on top (stands in for Table 5's "+ BiLSTM")
"""
import base64, json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import grammar as G

HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, 'model')
CFG = dict(H=24, A=4, L=2, ff=96, drop=0.1, maxpos=24, steps=20000, batch=128, lr=1e-3, warmup=500, wd=0.01, seed=7)
CKPTS = [500, 1000, 2000, 5000, 10000, 20000]
VOCAB = G.vocab(); IDX = {w: i for i, w in enumerate(VOCAB)}
PAD, CLS, SEP, MASK = 0, 1, 2, 3
NSPECIAL = len(G.SPECIAL)
TAGI = {t: i for i, t in enumerate(G.TAGS)}


def gelu(x):  # the released BERT code's gelu: 0.5 x (1 + tanh(sqrt(2/pi) (x + 0.044715 x^3)))
    return F.gelu(x, approximate='tanh')


class Layer(nn.Module):
    def __init__(s, c):
        super().__init__(); H = c['H']; s.A = c['A']; s.dk = H // c['A']
        s.q, s.k, s.v, s.o = (nn.Linear(H, H) for _ in range(4))
        s.n1 = nn.LayerNorm(H, eps=1e-12); s.f1 = nn.Linear(H, c['ff']); s.f2 = nn.Linear(c['ff'], H); s.n2 = nn.LayerNorm(H, eps=1e-12)
        s.dr = nn.Dropout(c['drop'])

    def forward(s, x, mask, keep=None):
        B, T, H = x.shape
        q = s.q(x).view(B, T, s.A, s.dk).transpose(1, 2)
        k = s.k(x).view(B, T, s.A, s.dk).transpose(1, 2)
        v = s.v(x).view(B, T, s.A, s.dk).transpose(1, 2)
        a = (q @ k.transpose(-1, -2) / math.sqrt(s.dk)).masked_fill(~mask, float('-inf')).softmax(-1)
        if keep is not None: keep.append(a.detach())
        a = s.dr(a)
        x = s.n1(x + s.dr(s.o((a @ v).transpose(1, 2).reshape(B, T, H))))
        return s.n2(x + s.dr(s.f2(gelu(s.f1(x)))))


class Bert(nn.Module):
    def __init__(s, c, causal=False):
        super().__init__(); H = c['H']; s.c = c; s.causal = causal
        s.tok = nn.Embedding(len(VOCAB), H); s.pos = nn.Embedding(c['maxpos'], H); s.seg = nn.Embedding(2, H)
        s.eln = nn.LayerNorm(H, eps=1e-12); s.dr = nn.Dropout(c['drop'])
        s.layers = nn.ModuleList(Layer(c) for _ in range(c['L']))
        s.mt = nn.Linear(H, H); s.mln = nn.LayerNorm(H, eps=1e-12); s.mb = nn.Parameter(torch.zeros(len(VOCAB)))  # MLM / LM head
        s.pool = nn.Linear(H, H); s.nsp = nn.Linear(H, 2)
        s.apply(s._init)

    @staticmethod
    def _init(m):  # initializer_range 0.02, as the released configs
        if isinstance(m, (nn.Linear, nn.Embedding)):
            nn.init.normal_(m.weight, 0, 0.02)
            if isinstance(m, nn.Linear) and m.bias is not None: nn.init.zeros_(m.bias)

    def mask_of(s, ids):
        T = ids.shape[1]; m = (ids != PAD)[:, None, None, :]
        if s.causal: m = m & torch.tril(torch.ones(T, T, dtype=torch.bool))[None, None]
        return m

    def forward(s, ids, segs, keep=None):
        T = ids.shape[1]
        x = s.dr(s.eln(s.tok(ids) + s.pos(torch.arange(T))[None] + s.seg(segs)))
        m = s.mask_of(ids)
        for L in s.layers: x = L(x, m, keep)
        return x

    def lm_logits(s, h):
        return s.mln(gelu(s.mt(h))) @ s.tok.weight.T + s.mb

    def nsp_logits(s, h):
        return s.nsp(torch.tanh(s.pool(h[:, 0])))


class Tagger(nn.Module):
    """A fine-tuning model: a (pretrained or fresh) backbone plus one output layer, as section 3.2.
    task 'tok': a K=3 layer on every token's final state T_i. task 'sent': a K=2 layer on the pooled [CLS]
    (bidirectional) or on the final [SEP] state (left-to-right, the only position that has read everything).
    extra: one fresh bidirectional layer between backbone and head (ltr_bi)."""
    def __init__(s, backbone, task, extra=False):
        super().__init__(); H = backbone.c['H']; s.b = backbone; s.task = task
        s.extra = Layer(backbone.c) if extra else None
        if extra: Bert._init(s.extra.q); [Bert._init(m) for m in s.extra.modules()]
        s.head = nn.Linear(H, 3 if task == 'tok' else 2); Bert._init(s.head)

    def forward(s, ids, segs, keep=None):
        h = s.b(ids, segs, keep)
        if s.extra is not None: h = s.extra(h, (ids != PAD)[:, None, None, :], keep)
        if s.task == 'tok': return s.head(h)
        if s.b.causal:
            last = (ids != PAD).sum(1) - 1
            return s.head(torch.tanh(s.b.pool(h[torch.arange(len(ids)), last])))
        return s.head(torch.tanh(s.b.pool(h[:, 0])))


# ---- data ----
def pack(a, b=None):
    ids = [CLS] + [IDX[w] for w in a] + [SEP]; seg = [0] * len(ids)
    if b is not None:
        ids += [IDX[w] for w in b] + [SEP]; seg += [1] * (len(b) + 1)
    return ids, seg


def mask_example(ids, r):
    """Section 3.1 and appendix A.1: choose 15% of the positions (at least one, never [CLS]/[SEP]); replace
    80% with [MASK], 10% with a random word, keep 10%. Returns (input ids, targets with -100 elsewhere, kinds)."""
    cand = [i for i, t in enumerate(ids) if t not in (CLS, SEP)]
    n = max(1, int(round(len(cand) * 0.15)))      # create_pretraining_data.py: max(1, round(len * masked_lm_prob))
    pick = sorted(r.sample(cand, n)); x = list(ids); y = [-100] * len(ids); kinds = {}
    for i in pick:
        y[i] = ids[i]; u = r.random()
        if u < 0.8: x[i] = MASK; kinds[i] = 'mask'
        elif u < 0.9: x[i] = r.randrange(NSPECIAL, len(VOCAB)); kinds[i] = 'random'
        else: kinds[i] = 'same'
    return x, y, kinds


def pad(rows, v=PAD):
    T = max(len(x) for x in rows)
    return torch.tensor([x + [v] * (T - len(x)) for x in rows])


def lr_lambda(warm, total):
    return lambda st: min((st + 1) / warm, max(0.0, (total - st) / max(1, total - warm)))


def pretrain(name, seed=None, out=None):
    """seed/out: a repeat of the same variant with another pretraining seed (the 'seed2' command), saved as model/<out>.pt."""
    c = dict(CFG)
    if seed is not None: c['seed'] = seed
    torch.manual_seed(c['seed']); r = random.Random(c['seed'])
    m = Bert(c, causal=(name == 'ltr'))
    opt = torch.optim.AdamW(m.parameters(), lr=c['lr'], betas=(0.9, 0.999), eps=1e-6, weight_decay=c['wd'])
    sch = torch.optim.lr_scheduler.LambdaLR(opt, lr_lambda(c['warmup'], c['steps']))
    log = []; t0 = time.time(); seen = set()
    for step in range(1, c['steps'] + 1):
        m.train(); X, S, Y, NY = [], [], [], []
        for _ in range(c['batch']):
            a, b, nx = G.pretrain_pair(r); seen.add(tuple(a)); seen.add(tuple(b))
            ids, seg = pack(a, b)
            if name == 'ltr': X.append(ids); Y.append(ids[1:] + [-100])
            else:
                x, y, _ = mask_example(ids, r); X.append(x); Y.append(y)
            S.append(seg); NY.append(nx)
        X, S, Y = pad(X), pad(S, 0), pad(Y, -100)
        h = m(X, S); lg = m.lm_logits(h)
        lm = F.cross_entropy(lg.reshape(-1, lg.shape[-1]), Y.reshape(-1), ignore_index=-100)
        loss = lm
        if name == 'bert':
            ns = F.cross_entropy(m.nsp_logits(h), torch.tensor(NY)); loss = lm + ns
        opt.zero_grad(); loss.backward(); opt.step(); sch.step()
        if step % 250 == 0:
            log.append([step, round(lm.item(), 4), round(ns.item(), 4) if name == 'bert' else None])
        if step % 2000 == 0: print(name, step, log[-1], round(time.time() - t0), 's', flush=True)
        if step in CKPTS and out is None:
            torch.save({'cfg': c, 'state': m.state_dict()}, os.path.join(MD, 'ckpt_%s_%d.pt' % (name, step)))
    ev = eval_pretrain(m, name)
    print(name, ev)
    torch.save({'cfg': c, 'causal': name == 'ltr', 'state': m.state_dict(), 'log': log, 'eval': ev, 'seconds': round(time.time() - t0),
                'params': sum(p.numel() for p in m.parameters()), 'unique_sentences_seen': len(seen)}, os.path.join(MD, (out or name) + '.pt'))


@torch.no_grad()
def eval_pretrain(m, name, n=4000):
    """Held-out pretraining metrics on fresh pairs (seed 999): masked-word accuracy, NSP accuracy, and the
    animal word read from the right: 'the [adj]* [MASK] barked ...' (bidirectional) against the
    next-word prediction at that position from the left only (ltr)."""
    m.eval(); r = random.Random(999); ok = tot = nok = 0
    for _ in range(n // 200):
        X, S, Y, NY = [], [], [], []
        for _ in range(200):
            a, b, nx = G.pretrain_pair(r); ids, seg = pack(a, b)
            if name == 'ltr': X.append(ids); Y.append(ids[1:] + [-100])
            else: x, y, _ = mask_example(ids, r); X.append(x); Y.append(y)
            S.append(seg); NY.append(nx)
        X, S, Y = pad(X), pad(S, 0), pad(Y, -100); h = m(X, S); p = m.lm_logits(h).argmax(-1)
        ok += int(((p == Y) & (Y != -100)).sum()); tot += int((Y != -100).sum())
        if name == 'bert': nok += int((m.nsp_logits(h).argmax(-1) == torch.tensor(NY)).sum())
    out = {'lm_accuracy': ok / tot, 'nsp_accuracy': nok / n if name == 'bert' else None}
    # the animal noun, cue to its right
    hit = 0; N = 1000
    for i in range(N):
        a = r.choice(list(G.ANIMALS)); w = G.animal_sentence(r, a)
        while w[1] in G.PEOPLE: w = G.animal_sentence(r, a)
        j = w.index(a) + 1  # position in [CLS] + words
        ids, seg = pack(w); x = list(ids)
        if name == 'ltr':
            pr = m.lm_logits(m(torch.tensor([x]), torch.tensor([seg])))[0, j - 1]
        else:
            x[j] = MASK; pr = m.lm_logits(m(torch.tensor([x]), torch.tensor([seg])))[0, j]
        hit += VOCAB[int(pr.argmax())] == a
    out['animal_from_right'] = hit / N
    return out


def load_backbone(name, ckpt=None):
    c = dict(CFG)
    if name == 'scratch':
        torch.manual_seed(c['seed']); return Bert(c, causal=False)
    src = 'ltr' if name in ('ltr', 'ltr_bi') else name
    if name.endswith('_s2'): src = name; b = Bert(c, causal=False); b.load_state_dict(torch.load(os.path.join(MD, name + '.pt'), weights_only=False)['state']); return b
    ck = torch.load(os.path.join(MD, ('ckpt_%s_%d.pt' % (src, ckpt)) if ckpt else src + '.pt'), weights_only=False)
    b = Bert(c, causal=(src == 'ltr')); b.load_state_dict(ck['state']); return b


def make_split(n, seed, seen=True, task='tok'):
    r = random.Random(seed); out = []
    while len(out) < n:
        w, tags, lab, info = G.labelled(r, seen=seen)
        if task == 'sent' and lab is None: continue
        out.append((w, tags, lab, info))
    return out


TEST = {}
def test_sets():
    """2,000 test sentences drawn from the whole grammar (every cue item, seen in the labels or not), seed 4242,
    plus a dev set of 500 from the labelled distribution (seen cues only), seed 4343."""
    if not TEST:
        for task in ('tok', 'sent'):
            TEST[task] = make_split(2000, 4242, seen=None, task=task)
            TEST[task + '_dev'] = make_split(500, 4343, seen=True, task=task)
    return TEST


def batchify(ex, task):
    X, S, Y = [], [], []
    for w, tags, lab, info in ex:
        ids, seg = pack(w); X.append(ids); S.append(seg)
        if task == 'tok': Y.append([-100] + [TAGI[t] for t in tags] + [-100])
        else: Y.append(0 if lab == 'PER' else 1)
    return pad(X), pad(S, 0), (pad(Y, -100) if task == 'tok' else torch.tensor(Y))


@torch.no_grad()
def evaluate(model, ex, task):
    """tok: accuracy on the name tokens (entity accuracy); sent: sentence accuracy. Both split by where the
    cue is (L before the name, R after) and whether the cue item occurred in the labelled data."""
    model.eval(); res = {}; X, S, Y = batchify(ex, task); out = model(X, S)
    for k, (w, tags, lab, info) in enumerate(ex):
        if info is None: continue
        if task == 'tok':
            j = info['name_at'] + 1; ok = int(out[k, j].argmax()) == TAGI[lab]
        else: ok = int(out[k].argmax()) == (0 if lab == 'PER' else 1)
        seen = info['cue'] < (G.SEEN_R if info['side'] == 'R' else G.SEEN_L)
        for key in ('all', info['side'], info['side'] + ('_seen' if seen else '_unseen')):
            a = res.setdefault(key, [0, 0]); a[0] += ok; a[1] += 1
    return {k: v[0] / v[1] for k, v in res.items()}


def finetune(variant, task, n, seed, lr, ckpt=None, steps=400, bs=32):
    torch.manual_seed(1000 + seed); r = random.Random(1000 + seed)
    train = make_split(n, 5000 + seed, seen=True, task=task)
    model = Tagger(load_backbone(variant, ckpt), task, extra=(variant == 'ltr_bi'))
    opt = torch.optim.AdamW(model.parameters(), lr=lr, betas=(0.9, 0.999), eps=1e-6, weight_decay=0.01)
    sch = torch.optim.lr_scheduler.LambdaLR(opt, lr_lambda(steps // 10, steps))
    for st in range(steps):
        model.train(); ex = [train[r.randrange(len(train))] for _ in range(bs)]
        X, S, Y = batchify(ex, task); out = model(X, S)
        loss = F.cross_entropy(out.reshape(-1, out.shape[-1]), Y.reshape(-1), ignore_index=-100) if task == 'tok' else F.cross_entropy(out, Y)
        opt.zero_grad(); loss.backward(); opt.step(); sch.step()
    T = test_sets()
    return model, evaluate(model, T[task + '_dev'], task)['all'], evaluate(model, T[task], task), train


LRS = [3e-4, 1e-3, 3e-3]
SIZES = [32, 128, 512, 2048]
SEEDS = [0, 1, 2]


def best_of_lrs(variant, task, n, seed, ckpt=None):
    """The paper's protocol (section 4.1): pick the fine-tuning learning rate on the dev set."""
    best = None
    for lr in LRS:
        model, dev, test, train = finetune(variant, task, n, seed, lr, ckpt)
        if best is None or dev > best[1]: best = (model, dev, test, lr, train)
    return best


def sweep():
    t0 = time.time(); res = {'sizes': SIZES, 'seeds': SEEDS, 'lrs': LRS, 'runs': []}
    for task, variants in (('tok', ['bert', 'nonsp', 'ltr', 'ltr_bi', 'scratch']), ('sent', ['bert', 'nonsp', 'ltr', 'scratch'])):
        for v in variants:
            for n in SIZES:
                for sd in SEEDS:
                    model, dev, test, lr, train = best_of_lrs(v, task, n, sd)
                    res['runs'].append({'task': task, 'variant': v, 'n': n, 'seed': sd, 'lr': lr, 'dev': dev, 'test': test})
                    print(task, v, n, sd, lr, round(dev, 3), {k: round(x, 3) for k, x in test.items()}, round(time.time() - t0), 's', flush=True)
                    if task == 'tok' and v in ('bert', 'ltr', 'scratch') and n == 128 and sd == 0:
                        torch.save({'variant': v, 'lr': lr, 'state': model.state_dict(), 'test': test, 'train': train}, os.path.join(MD, v + '_tag.pt'))
    # Figure 5 at toy scale: fine-tune from checkpoints along pretraining
    res['fig5'] = []
    for v in ('bert', 'ltr'):
        for k in CKPTS:
            accs = [best_of_lrs(v, 'tok', 128, sd, ckpt=k)[2] for sd in SEEDS]
            row = {'variant': v, 'step': k, 'test': {key: sum(a[key] for a in accs) / len(accs) for key in accs[0]}}
            res['fig5'].append(row); print('fig5', row, flush=True)
    res['seconds'] = round(time.time() - t0)
    json.dump(res, open(os.path.join(MD, 'finetune.json'), 'w'), indent=1)


def seed2():
    """Is the toy's NSP effect real or pretraining-seed noise? Pretrain bert and nonsp again with seed 8
    (everything else identical), then fine-tune the tagging task exactly as the sweep does at 128 and 512
    labelled sentences, both tasks, 3 fine-tuning seeds each. Writes model/seed2.json."""
    t0 = time.time()
    for v in ('bert', 'nonsp'):
        if not os.path.exists(os.path.join(MD, v + '_s2.pt')): pretrain(v, seed=8, out=v + '_s2')
    res = {'pretrain_seed': 8, 'runs': []}
    for v in ('bert_s2', 'nonsp_s2'):
        ev = torch.load(os.path.join(MD, v + '.pt'), weights_only=False)['eval']; res[v + '_eval'] = ev
        for task in ('tok', 'sent'):
          for n in (128, 512):
            for sd in SEEDS:
                model, dev, test, lr, train = best_of_lrs(v, task, n, sd)
                res['runs'].append({'task': task, 'variant': v, 'n': n, 'seed': sd, 'lr': lr, 'dev': dev, 'test': test})
                print('seed2', v, n, sd, lr, {k: round(x, 3) for k, x in test.items()}, round(time.time() - t0), 's', flush=True)
    res['seconds'] = round(time.time() - t0)
    json.dump(res, open(os.path.join(MD, 'seed2.json'), 'w'), indent=1)


# ---- export: matrices 6-bit per row (one base64 character per weight), vectors float16 (as the Transformer page) ----
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def tensor_order(c, kind):
    """The order the browser reads tensors in (parts/22_js_model.js mirrors it). kind: 'pre' or 'tag'."""
    p = 'b.' if kind == 'tag' else ''
    names = [p + 'tok.weight', p + 'pos.weight', p + 'seg.weight', p + 'eln.weight', p + 'eln.bias']
    for i in range(c['L']):
        q = p + 'layers.%d.' % i
        names += [q + x + '.' + y for x in 'qkvo' for y in ('weight', 'bias')]
        names += [q + 'n1.weight', q + 'n1.bias', q + 'f1.weight', q + 'f1.bias', q + 'f2.weight', q + 'f2.bias', q + 'n2.weight', q + 'n2.bias']
    if kind == 'pre': names += ['mt.weight', 'mt.bias', 'mln.weight', 'mln.bias', 'mb', 'pool.weight', 'pool.bias', 'nsp.weight', 'nsp.bias']
    else: names += ['head.weight', 'head.bias']
    return names


def quantise(state, names):
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


EXPORT = {'bert': 'pre', 'ltr': 'pre', 'bert_tag': 'tag', 'ltr_tag': 'tag'}


def export():
    c = dict(CFG); out = {'vocab': VOCAB, 'tags': G.TAGS, 'cfg': {k: c[k] for k in ('H', 'A', 'L', 'ff', 'maxpos')}, 'models': {}}
    report = {}
    for name, kind in EXPORT.items():
        if kind == 'pre':
            ck = torch.load(os.path.join(MD, name + '.pt'), weights_only=False)
            m = Bert(c, causal=ck['causal']); state = ck['state']
        else:
            v = name[:-4]; ck = torch.load(os.path.join(MD, name + '.pt'), weights_only=False)
            m = Tagger(Bert(c, causal=(v == 'ltr')), 'tok'); state = ck['state']
        m.load_state_dict(state)
        names = tensor_order(c, kind)
        assert set(names) <= set(state.keys()), (set(names) - set(state))
        mq, sq, vb, tmax, deq = quantise(state, names)
        sd = dict(state); sd.update(deq); m.load_state_dict(sd); m.eval()
        torch.save({'kind': kind, 'state': m.state_dict(), 'causal': m.causal if kind == 'pre' else (name == 'ltr_tag')}, os.path.join(MD, name + '_q.pt'))
        entry = {'kind': kind, 'causal': name.startswith('ltr'), 'tmax': tmax, 'm': mq, 's': sq, 'v': vb}
        if kind == 'pre':
            evq = eval_pretrain(m, name)
            entry.update({'eval_float': ck['eval'], 'eval_q': evq, 'log': ck['log']}); report[name] = {'float': ck['eval'], 'quantised': evq}
        else:
            T = test_sets(); tq = evaluate(m, T['tok'], 'tok')
            entry.update({'test_float': ck['test'], 'test_q': tq, 'lr': ck['lr']}); report[name] = {'float': ck['test'], 'quantised': tq, 'lr': ck['lr']}
        entry['params'] = sum(p.numel() for p in m.parameters())
        report[name]['chars'] = len(mq) + len(sq) + len(vb); report[name]['params'] = entry['params']
        out['models'][name] = entry; print(name, report[name])
    js = '// Generated by train.py export: the toy BERT\'s vocabulary, configuration and weights.\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.BW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    json.dump(report, open(os.path.join(MD, 'report.json'), 'w'), indent=1)
    lg = {'cfg': {k: c[k] for k in ('steps', 'batch', 'lr', 'warmup', 'H', 'L', 'A')}, 'seconds': {}}
    for v in ('bert', 'nonsp', 'ltr'):
        ck = torch.load(os.path.join(MD, v + '.pt'), weights_only=False); lg[v] = ck['log']; lg['seconds'][v] = ck['seconds']
        if v == 'nonsp': lg['nonsp_eval'] = ck['eval']
    json.dump(lg, open(os.path.join(MD, 'logs.json'), 'w'))
    print('wrote parts/20_model_data.js', len(js), 'bytes')


if __name__ == '__main__':
    torch.set_num_threads(2); os.makedirs(MD, exist_ok=True)
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'pretrain':
        for n in (sys.argv[2:] or ['bert', 'nonsp', 'ltr']): pretrain(n)
    elif cmd == 'finetune': sweep()
    elif cmd == 'seed2': seed2()
    elif cmd == 'export': export()
    else: print(__doc__)
