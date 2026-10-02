"""Train the page's toy RAG model, built as the paper's section 2 describes at toy scale, and export it.

  uv run --with torch python train.py pre            # 1. retriever pretraining (DPR stand-in) and generator pretraining (BART stand-in)
  uv run --with torch python train.py rag <variant> [seed]   # 2. RAG fine-tuning of one variant
  uv run --with torch python train.py export         # quantise, re-measure, write parts/20_model_data.js

The world (documents and questions) is world.py. What follows the paper (https://arxiv.org/html/2005.11401v4#S2):
- retriever p_eta(z|x) proportional to exp(d(z)^T q(x)) with separate query and document encoders (§2.2), top-k by
  maximum inner product over the whole index; the document encoder and the index are frozen during RAG training and
  only the query encoder and the generator are fine-tuned (§2.4);
- generator p_theta(y_i | x, z, y_1:i-1): an encoder-decoder Transformer reading the document and the question simply
  concatenated (§2.3), pretrained before RAG training (BART stand-in: salient-span denoising over every document);
- RAG-Sequence and RAG-Token losses, the negative marginal log-likelihood of the answer, Adam (§2.1, §2.4);
- decoding: RAG-Token greedy on the marginal per-token distribution; RAG-Sequence greedy per document, then
  "Thorough Decoding" (every hypothesis rescored under every document) (§2.5; the paper also used greedy for QA, App. A).
What is smaller: BERT-base encoders become a bag of tokens with one learned weight per token; BART-large (406M) becomes a
two-layer encoder-decoder with d = 32; 21M Wikipedia passages become 408 made-up documents; k = 5.

Variants: tok, seq (the method); tok_frozen, seq_frozen (query encoder frozen, Table 6 "Frozen"); tok_bm25, seq_bm25
(BM25 scores as the retrieval logits, Table 6 "BM25"); closed (the generator alone, no retrieval: the BART row);
tok_scratch (retriever weights left at 1, no retriever pretraining; the query weights still learn during RAG training).
"""
import base64, json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import world as Wd

HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, 'model')
VOCAB = Wd.VOCAB; IDX = {w: i for i, w in enumerate(VOCAB)}
PAD, BOS, EOS, MASK, SEP = 0, 1, 2, 3, IDX['//']
G = dict(d=32, h=4, N=2, dff=64, drop=0.1)
K = 5
MAXY = 9
W = Wd.build()
TRAIN = [q for q in W['qs'] if q['split'] == 'train']
TEST = [q for q in W['qs'] if q['split'] == 'test']
SUB = [q for t in Wd.TEMPLATES for q in [q for q in TEST if q['task'] == t][:25]]   # 25 held-out questions per task, in world order
ids = lambda toks: [IDX[t] for t in toks]


def pe_table(n, d):
    pe = np.zeros((n, d)); pos = np.arange(n)[:, None]; div = 10000 ** (np.arange(0, d, 2) / d)
    pe[:, 0::2] = np.sin(pos / div); pe[:, 1::2] = np.cos(pos / div)
    return torch.tensor(pe, dtype=torch.float32)


# ---------------- retriever (BERT_q and BERT_d stand-ins) ----------------
# A bag of tokens with one learned weight per vocabulary token, plus a bag of ordered syllable bigrams (two syllables
# in a row, so the parts of one name) with one shared learned weight; one set of weights for queries, one for documents:
#   q(x) = [w_q * unigram counts(x), b_q * bigram counts(x)] / sqrt(len x), likewise d(z); score = d(z)^T q(x).
# Plain unigrams cannot tell which name a syllable belongs to; a learned dense layer on top was tried and memorised the
# training entities (held-out recall@5 fell from 95% to about 40%), so the toy keeps only these per-token weights.
S0 = VOCAB.index(Wd.SYL[0]); NS = len(Wd.SYL)


class BagEnc(nn.Module):
    def __init__(s):
        super().__init__(); s.w = nn.Parameter(torch.ones(len(VOCAB))); s.b = nn.Parameter(torch.ones(1))

    def forward(s, x):  # x: B x T token ids, PAD = 0
        oh = F.one_hot(x, len(VOCAB)).float(); oh[..., PAD] = 0
        a, c = x[:, :-1] - S0, x[:, 1:] - S0
        ok = ((a >= 0) & (a < NS) & (c >= 0) & (c < NS)).float()
        bi = F.one_hot((a.clamp(0, NS - 1) * NS + c.clamp(0, NS - 1)), NS * NS).float() * ok[..., None]
        n = (x != PAD).sum(1, keepdim=True).float().sqrt()
        return torch.cat([oh.sum(1) * s.w, bi.sum(1) * s.b], -1) / n


# ---------------- generator: post-LN encoder-decoder Transformer (as the Attention Is All You Need page) ----------------
class MHA(nn.Module):
    def __init__(s, d, h):
        super().__init__(); s.h = h; s.dk = d // h; s.q, s.k, s.v, s.o = (nn.Linear(d, d) for _ in range(4))

    def forward(s, x, m, mask):
        B, T, D = x.shape; S = m.shape[1]
        q = s.q(x).view(B, T, s.h, s.dk).transpose(1, 2); k = s.k(m).view(B, S, s.h, s.dk).transpose(1, 2)
        v = s.v(m).view(B, S, s.h, s.dk).transpose(1, 2)
        a = (q @ k.transpose(-1, -2) / math.sqrt(s.dk)).masked_fill(~mask, float('-inf')).softmax(-1)
        return s.o((a @ v).transpose(1, 2).reshape(B, T, D))


class FFN(nn.Module):
    def __init__(s, d, dff):
        super().__init__(); s.w1 = nn.Linear(d, dff); s.w2 = nn.Linear(dff, d)

    def forward(s, x): return s.w2(F.relu(s.w1(x)))


class EncLayer(nn.Module):
    def __init__(s):
        super().__init__(); s.att = MHA(G['d'], G['h']); s.ffn = FFN(G['d'], G['dff'])
        s.n1 = nn.LayerNorm(G['d']); s.n2 = nn.LayerNorm(G['d']); s.dr = nn.Dropout(G['drop'])

    def forward(s, x, mask):
        x = s.n1(x + s.dr(s.att(x, x, mask))); return s.n2(x + s.dr(s.ffn(x)))


class DecLayer(nn.Module):
    def __init__(s):
        super().__init__(); s.att = MHA(G['d'], G['h']); s.crs = MHA(G['d'], G['h']); s.ffn = FFN(G['d'], G['dff'])
        s.n1, s.n2, s.n3 = (nn.LayerNorm(G['d']) for _ in range(3)); s.dr = nn.Dropout(G['drop'])

    def forward(s, y, mem, smask, tmask):
        y = s.n1(y + s.dr(s.att(y, y, tmask))); y = s.n2(y + s.dr(s.crs(y, mem, smask))); return s.n3(y + s.dr(s.ffn(y)))


class Gen(nn.Module):
    def __init__(s):
        super().__init__(); d = G['d']
        s.emb = nn.Embedding(len(VOCAB), d); nn.init.normal_(s.emb.weight, 0, d ** -0.5)
        s.enc = nn.ModuleList(EncLayer() for _ in range(G['N'])); s.dec = nn.ModuleList(DecLayer() for _ in range(G['N']))
        s.register_buffer('pe', pe_table(40, d)); s.dr = nn.Dropout(G['drop'])

    def embed(s, x): return s.dr(s.emb(x) * math.sqrt(G['d']) + s.pe[:x.shape[1]])

    def forward(s, src, tin):  # returns log-probabilities B x T x V
        smask = (src != PAD)[:, None, None, :]; x = s.embed(src)
        for L in s.enc: x = L(x, smask)
        T = tin.shape[1]; tmask = torch.tril(torch.ones(T, T, dtype=torch.bool))[None, None]
        y = s.embed(tin)
        for L in s.dec: y = L(y, x, smask, tmask)
        return F.log_softmax(y @ s.emb.weight.T, -1)


def pad(rows, n=None):
    n = n or max(len(r) for r in rows); return torch.tensor([r + [PAD] * (n - len(r)) for r in rows])


def gen_src(doc, x):  # "simply concatenate" (§2.3): document, separator, question
    return ids(doc) + [SEP] + ids(x) if doc is not None else ids(x)


# ---------------- BM25 over the index (Table 6 ablation): k1 = 1.2, b = 0.75 ----------------
def bm25_scores(index):
    N = len(index); df = {}
    for d in index:
        for t in set(d['toks']): df[t] = df.get(t, 0) + 1
    avg = sum(len(d['toks']) for d in index) / N
    memo = {}
    def score(x):
        key = tuple(x)
        if key in memo: return memo[key]
        out = memo[key] = np.zeros(N)
        for j, d in enumerate(index):
            L = len(d['toks'])
            for t in set(x):
                f = d['toks'].count(t)
                if f: out[j] += math.log(1 + (N - df[t] + .5) / (df[t] + .5)) * f * 2.2 / (f + 1.2 * (.25 + .75 * L / avg))
        return out
    return score


# ---------------- RAG: retrieve top-k, generator per document, the two marginalisations ----------------
class RAG:
    def __init__(s, gen, qenc, denc, index, mode, retr='dense'):
        s.gen, s.qenc, s.denc, s.mode, s.retr = gen, qenc, denc, mode, retr
        s.set_index(index)

    def set_index(s, index):
        s.index = index
        with torch.no_grad(): s.D = s.denc(pad([ids(d['toks']) for d in index]))  # frozen document embeddings
        if s.retr == 'bm25': s.bm = bm25_scores(index)

    def retrieve(s, xs, k=K):
        if s.retr == 'bm25':
            sc = torch.tensor(np.array([s.bm(x) for x in xs]), dtype=torch.float32)
        else:
            sc = s.qenc(pad([ids(x) for x in xs])) @ s.D.T  # d(z)^T q(x)
        top = sc.topk(k, -1)
        return top.indices, top.values.log_softmax(-1)  # log p_eta(z|x) over the top k

    def token_lp(s, xs, ys, top):
        """log p_theta(y_i | x, z, y_<i) for every question, retrieved document and answer token: B x k x T."""
        B, k = top.shape
        src = [gen_src(s.index[top[b, j].item()]['toks'], xs[b]) for b in range(B) for j in range(k)]
        yy = [ids(y) + [EOS] for y in ys for _ in range(k)]
        tin = pad([[BOS] + y[:-1] for y in yy]); tout = pad(yy)
        lp = s.gen(pad(src), tin).gather(-1, tout[..., None])[..., 0] * (tout != PAD)
        return lp.view(B, k, -1), (tout != PAD).view(B, k, -1)[:, 0]

    def loss(s, xs, ys):
        top, lpz = s.retrieve(xs)
        lp, m = s.token_lp(xs, ys, top)
        if s.mode == 'seq':   # one document for the whole answer: logsumexp_z [log p(z|x) + sum_i log p(y_i|x,z,y_<i)]
            return -torch.logsumexp(lpz + lp.sum(-1), -1).mean()
        tok = torch.logsumexp(lpz[..., None] + lp, 1)   # per token: logsumexp_z [log p(z|x) + log p(y_i|...)]
        return -(tok * m).sum(-1).mean()

    @torch.no_grad()
    def answer(s, xs, k=K):
        top, lpz = s.retrieve(xs, k); B = len(xs)
        if s.mode == 'tok':
            out = [[BOS] for _ in range(B)]
            src = pad([gen_src(s.index[top[b, j].item()]['toks'], xs[b]) for b in range(B) for j in range(k)])
            for _ in range(MAXY):
                tin = pad([o for o in out for _ in range(k)])
                l = s.gen(src, tin)[:, -1].view(B, k, -1)
                nxt = torch.logsumexp(lpz[..., None] + l, 1).argmax(-1)     # the transition probability of §2.5
                for b in range(B):
                    if out[b][-1] != EOS or len(out[b]) == 1: out[b].append(nxt[b].item())
            res = []
            for o in out:
                o = o[1:]; res.append([VOCAB[t] for t in (o[:o.index(EOS)] if EOS in o else o)])
            return res, top
        # seq: greedy per document, then Thorough Decoding
        src = pad([gen_src(s.index[top[b, j].item()]['toks'], xs[b]) for b in range(B) for j in range(k)])
        out = [[BOS] for _ in range(B * k)]
        for _ in range(MAXY):
            nxt = s.gen(src, pad(out))[:, -1].argmax(-1)
            for i, o in enumerate(out):
                if o[-1] != EOS or len(o) == 1: o.append(nxt[i].item())
        hyps = []
        for b in range(B):
            hs = []
            for j in range(k):
                o = out[b * k + j][1:]; o = o[:o.index(EOS)] if EOS in o else o
                if o and o not in hs: hs.append(o)
            hyps.append(hs or [[]])
        res = []
        for b in range(B):
            best, bs = None, -1e9
            for h in hyps[b]:
                lp, _ = s.token_lp([xs[b]], [[VOCAB[t] for t in h]], top[b:b + 1])
                sc = torch.logsumexp(lpz[b] + lp[0].sum(-1), -1).item()
                if sc > bs: best, bs = h, sc
            res.append([VOCAB[t] for t in best])
        return res, top


@torch.no_grad()
def closed_answer(gen, xs):
    src = pad([gen_src(None, x) for x in xs]); out = [[BOS] for _ in xs]
    for _ in range(MAXY):
        nxt = gen(src, pad(out))[:, -1].argmax(-1)
        for i, o in enumerate(out):
            if o[-1] != EOS or len(o) == 1: o.append(nxt[i].item())
    res = []
    for o in out:
        o = o[1:]; res.append([VOCAB[t] for t in (o[:o.index(EOS)] if EOS in o else o)])
    return res


def evaluate(model, qs, closed=False, bs=100):
    """Exact match per task, and retrieval recall (every gold document in the top k)."""
    em, n, rec = {}, {}, {}
    for i in range(0, len(qs), bs):
        ch = qs[i:i + bs]
        if closed: ans = closed_answer(model, [q['x'] for q in ch]); top = None
        else: ans, top = model.answer([q['x'] for q in ch])
        for b, q in enumerate(ch):
            t = q['task']; n[t] = n.get(t, 0) + 1; em[t] = em.get(t, 0) + (ans[b] == q['y'])
            if top is not None: rec[t] = rec.get(t, 0) + all(g in top[b].tolist() for g in q['gold'])
    out = {t: dict(n=n[t], em=round(em[t] / n[t], 4)) for t in n}
    if rec:
        for t in n: out[t]['recall'] = round(rec[t] / n[t], 4)
    tot = sum(n.values()); out['all'] = dict(n=tot, em=round(sum(em.values()) / tot, 4))
    return out


# ---------------- stage 1: pretraining ----------------
def pretrain(seed=0, parts=('dpr', 'bart')):
    torch.manual_seed(seed); r = random.Random(seed); os.makedirs(MD, exist_ok=True)
    idx18 = W['index']['2018']; log = {'dpr': [], 'bart': []}
    # (a) DPR stand-in: contrastive over the whole index, on train questions of the three single-document tasks
    if 'dpr' not in parts: return pretrain_bart(r, idx18, log)
    qenc, denc = BagEnc(), BagEnc()
    opt = torch.optim.Adam(list(qenc.parameters()) + list(denc.parameters()), lr=1e-2)
    dq = [q for q in TRAIN if q['task'] != 'novels']; D = pad([ids(d['toks']) for d in idx18]); t0 = time.time()
    for step in range(1, 1001):
        b = r.sample(dq, 64)
        sc = qenc(pad([ids(q['x']) for q in b])) @ denc(D).T
        loss = F.cross_entropy(sc, torch.tensor([q['gold'][0] for q in b]))
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 100 == 0: log['dpr'].append((step, round(loss.item(), 4))); print('dpr', step, round(loss.item(), 4), round(time.time() - t0), 's', flush=True)
    with torch.no_grad():
        Dv = denc(D); rec = {}
        for split, qs in (('train', TRAIN), ('test', TEST)):
            top = (qenc(pad([ids(q['x']) for q in qs])) @ Dv.T).topk(K, -1).indices.tolist()
            for t in Wd.TEMPLATES:
                sel = [(q, tp) for q, tp in zip(qs, top) if q['task'] == t]
                rec[split + '_' + t] = round(sum(all(g in tp for g in q['gold']) for q, tp in sel) / len(sel), 4)
    print('dpr recall@%d' % K, rec, flush=True)
    torch.save({'q': qenc.state_dict(), 'd': denc.state_dict(), 'log': log['dpr'], 'recall': rec}, os.path.join(MD, 'dpr.pt'))
    if 'bart' in parts: pretrain_bart(r, idx18, log)


def pretrain_bart(r, idx18, log):
    # (b) BART stand-in: salient span masking over every document of the 2018 index (the generator's parametric memory)
    gen = Gen(); opt = torch.optim.Adam(gen.parameters(), lr=1e-3); t0 = time.time()
    spans = []
    for d in idx18:
        t = d['toks']; ent = [i for i in range(len(t)) if t[i] in Wd.SYL]
        runs = [ent[i:i + 3] for i in range(0, len(ent), 3)]   # every name is three syllables
        for run in runs: spans.append((t[:run[0]] + ['<mask>'] + t[run[-1] + 1:], t))   # BART: reconstruct the whole document
    for step in range(1, 12001):
        gen.train(); b = r.sample(spans, 64)
        tin = pad([[BOS] + ids(y) for _, y in b]); tout = pad([ids(y) + [EOS] for _, y in b])
        lp = gen(pad([ids(x) for x, _ in b]), tin)
        loss = F.nll_loss(lp.reshape(-1, lp.shape[-1]), tout.reshape(-1), ignore_index=PAD)
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 1000 == 0:
            log['bart'].append((step, round(loss.item(), 4))); print('bart', step, round(loss.item(), 4), round(time.time() - t0), 's', flush=True)
    gen.eval(); ok = 0
    with torch.no_grad():
        for i in range(0, len(spans), 200):
            ch = spans[i:i + 200]; src = pad([ids(x) for x, _ in ch]); out = [[BOS] for _ in ch]
            for _ in range(15):
                nxt = gen(src, pad(out))[:, -1].argmax(-1)
                for j, o in enumerate(out): o.append(nxt[j].item())
            ok += sum(o[1:len(y) + 1] == ids(y) for o, (_, y) in zip(out, ch))
    print('bart document reconstruction (masked span filled from memory)', ok, '/', len(spans))
    torch.save({'g': gen.state_dict(), 'log': log['bart'], 'span_recall': ok / len(spans), 'n_spans': len(spans)}, os.path.join(MD, 'bart.pt'))


# ---------------- stage 2: RAG fine-tuning ----------------
STEPS = 6000


def finetune(variant, seed=0):
    torch.manual_seed(seed); r = random.Random(seed)
    gen = Gen(); gen.load_state_dict(torch.load(os.path.join(MD, 'bart.pt'))['g'])
    dp = torch.load(os.path.join(MD, 'dpr.pt')); qenc, denc = BagEnc(), BagEnc()
    if variant != 'tok_scratch': qenc.load_state_dict(dp['q']); denc.load_state_dict(dp['d'])
    for p in denc.parameters(): p.requires_grad_(False)
    mode = 'seq' if variant.startswith('seq') else 'tok'
    retr = 'bm25' if variant.endswith('bm25') else 'dense'
    params = list(gen.parameters())
    if variant in ('tok', 'seq', 'tok_scratch'): params += list(qenc.parameters())
    else:
        for p in qenc.parameters(): p.requires_grad_(False)
    qp = [p for p in qenc.parameters() if p.requires_grad and variant != 'closed']
    opt = torch.optim.Adam([dict(params=[p for p in gen.parameters()], lr=1e-3)] + ([dict(params=qp, lr=1e-2)] if qp else []))
    model = None if variant == 'closed' else RAG(gen, qenc, denc, W['index']['2018'], mode, retr)
    log = []; t0 = time.time()
    for step in range(1, STEPS + 1):
        gen.train(); b = r.sample(TRAIN, 32)
        if variant == 'closed':
            tin = pad([[BOS] + ids(q['y']) for q in b]); tout = pad([ids(q['y']) + [EOS] for q in b])
            lp = gen(pad([gen_src(None, q['x']) for q in b]), tin)
            loss = F.nll_loss(lp.reshape(-1, lp.shape[-1]), tout.reshape(-1), ignore_index=PAD)
        else:
            loss = model.loss([q['x'] for q in b], [q['y'] for q in b])
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 500 == 0:
            log.append((step, round(loss.item(), 4))); print(variant, seed, step, round(loss.item(), 4), round(time.time() - t0), 's', flush=True)
    gen.eval()
    res = dict(variant=variant, seed=seed, log=log, secs=round(time.time() - t0))
    if variant == 'closed':
        res['test'] = evaluate(gen, TEST, closed=True); res['train'] = evaluate(gen, TRAIN, closed=True)
    else:
        res['test'] = evaluate(model, TEST); res['train'] = evaluate(model, TRAIN)
        res['swap'] = hot_swap(model)
    print(variant, seed, 'test', json.dumps(res['test']), flush=True)
    torch.save({'g': gen.state_dict(), 'q': qenc.state_dict(), 'res': res}, os.path.join(MD, '%s_s%d.pt' % (variant, seed)))
    json.dump(res, open(os.path.join(MD, '%s_s%d.json' % (variant, seed)), 'w'), indent=1)


def hot_swap(model):
    """§4.5 Index hot-swapping: the presidents that changed between the two indexes, asked with each index."""
    out = {}
    for split in ('train', 'test', 'all'):
        ch = [i for i in W['changed'] if split == 'all' or (i in W['test_c']) == (split == 'test')]
        xs = [['who', 'is', 'the', 'president', 'of'] + list(W['countries'][i]) + ['?'] for i in ch]
        for yr in ('2016', '2018'):
            model.set_index(W['index'][yr]); ans, _ = model.answer(xs)
            for truth in ('2016', '2018'):
                gold = W['pres16'] if truth == '2016' else W['pres18']
                out['%s_index%s_leaders%s' % (split, yr, truth)] = round(sum(a == list(gold[i]) for a, i in zip(ans, ch)) / len(ch), 4)
        out[split + '_n'] = len(ch)
    model.set_index(W['index']['2018'])
    return out


# ---------------- export: matrices 6-bit per row (one base64 character per weight), vectors float16 ----------------
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def gen_order():
    names = ['emb.weight']
    for i in range(G['N']):
        p = 'enc.%d.' % i
        names += [p + 'att.' + x + '.' + y for x in 'qkvo' for y in ('weight', 'bias')]
        names += [p + 'ffn.w1.weight', p + 'ffn.w1.bias', p + 'ffn.w2.weight', p + 'ffn.w2.bias']
        names += [p + n + '.' + y for n in ('n1', 'n2') for y in ('weight', 'bias')]
    for i in range(G['N']):
        p = 'dec.%d.' % i
        names += [p + a + '.' + x + '.' + y for a in ('att', 'crs') for x in 'qkvo' for y in ('weight', 'bias')]
        names += [p + 'ffn.w1.weight', p + 'ffn.w1.bias', p + 'ffn.w2.weight', p + 'ffn.w2.bias']
        names += [p + n + '.' + y for n in ('n1', 'n2', 'n3') for y in ('weight', 'bias')]
    return names


BAG_ORDER = ['w', 'b']


def quantise(state, order):
    mq, sq, vb, tmax, deq = [], [], bytearray(), [], {}
    for n in order:
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
    return dict(m=''.join(mq), s=''.join(sq), v=base64.b64encode(bytes(vb)).decode(), tmax=tmax), deq


SHIP = ['tok', 'seq']   # the closed-book generator is measured (model/closed_s0.json) but not shipped: 50 KB for a model that guesses


def world_compact():
    """The toy world for the browser: every name as three characters (one per syllable, from SYLC), plus the splits.
    parts/21_js_world.js rebuilds the documents and questions from it exactly as world.py does."""
    SYLC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567'
    enc = lambda n: ''.join(SYLC[Wd.SYL.index(t)] for t in n)
    cap_of = {c: i for i, c in enumerate(W['capitals'])}
    return dict(sylc=SYLC, syl=Wd.SYL, countries=''.join(map(enc, W['countries'])), capitals=''.join(map(enc, W['capitals'])),
                pres18=''.join(map(enc, W['pres18'])), changed=W['changed'], pres16=''.join(enc(W['pres16'][i]) for i in W['changed']),
                authors=''.join(map(enc, W['authors'])), books=''.join(enc(b1) + enc(b2) for b1, b2 in W['books']),
                born=[cap_of[W['born'][p]] for p in W['people']], test_c=W['test_c'], test_a=W['test_a'], templates=Wd.TEMPLATES)


def export():
    dp = torch.load(os.path.join(MD, 'dpr.pt')); denc = BagEnc(); denc.load_state_dict(dp['d'])
    dq, ddeq = quantise(dp['d'], BAG_ORDER); sd = dict(dp['d']); sd.update(ddeq); denc_q = BagEnc(); denc_q.load_state_dict(sd)
    out = {'vocab': VOCAB, 'cfg': dict(G, k=K, maxy=MAXY), 'denc': dq, 'variants': {}, 'world': world_compact()}
    report = {}
    for v in SHIP:
        ck = torch.load(os.path.join(MD, v + '_s0.pt'), weights_only=False)
        gq, gdeq = quantise(ck['g'], gen_order()); gen = Gen(); s2 = dict(ck['g']); s2.update(gdeq); gen.load_state_dict(s2); gen.eval()
        ent = {'g': gq, 'mode': 'seq' if v == 'seq' else ('closed' if v == 'closed' else 'tok')}
        if v == 'closed':
            res_q = evaluate(gen, TEST, closed=True)
        else:
            qq, qdeq = quantise(ck['q'], BAG_ORDER); qenc = BagEnc(); s3 = dict(ck['q']); s3.update(qdeq); qenc.load_state_dict(s3)
            ent['q'] = qq
            model = RAG(gen, qenc, denc_q, W['index']['2018'], ent['mode'])
            res_q = evaluate(model, TEST); ent['swap_q'] = hot_swap(model)
            ent['test_sub_q'] = evaluate(model, SUB)   # the subset the page's in-browser test runs
            torch.save({'g': gen.state_dict(), 'q': qenc.state_dict(), 'd': denc_q.state_dict()}, os.path.join(MD, v + '_q.pt'))
        if v == 'closed': torch.save({'g': gen.state_dict()}, os.path.join(MD, v + '_q.pt'))
        ent['test_q'] = res_q; ent['test_float'] = ck['res']['test']; ent['log'] = ck['res']['log']
        out['variants'][v] = ent
        report[v] = dict(float=ck['res']['test']['all'], quant=res_q['all'], chars=sum(len(x[k]) for x in [gq] + ([ent['q']] if 'q' in ent else []) for k in 'msv'))
        print(v, report[v])
    # every trained variant's measured results (float weights, from its training run), for the page's tables
    res = {}
    for f in sorted(os.listdir(MD)):
        if f.endswith('.json') and '_s' in f and f[:-5].rsplit('_s', 1)[1].isdigit():
            r = json.load(open(os.path.join(MD, f))); res[f[:-5]] = {k: r[k] for k in ('test', 'swap', 'train') if k in r}
    bart = torch.load(os.path.join(MD, 'bart.pt'))
    out['results'] = res
    out['pre'] = dict(dpr_recall=dp.get('recall'), dpr_log=dp['log'], bart_log=bart['log'], bart_recall=round(bart['span_recall'], 4),
                      bart_n=bart['n_spans'], params=sum(p.numel() for p in Gen().parameters()), ndocs=len(W['index']['2018']))
    cf = os.path.join(MD, 'check_forward.json')
    out['check'] = json.load(open(cf)) if os.path.exists(cf) else None
    js = '// Generated by train.py export: the toy RAG model (vocabulary, configuration, weights).\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.RAGW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    json.dump(report, open(os.path.join(MD, 'report.json'), 'w'), indent=1)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


if __name__ == '__main__':
    torch.set_num_threads(2)
    a = sys.argv[1:]
    if a[0] == 'pre': pretrain()
    elif a[0] == 'dpr': pretrain(parts=('dpr',))
    elif a[0] == 'rag': finetune(a[1], int(a[2]) if len(a) > 2 else 0)
    elif a[0] == 'export': export()
