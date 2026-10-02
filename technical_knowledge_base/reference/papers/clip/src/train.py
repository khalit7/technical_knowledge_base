"""Toy CLIP and its baselines on the toy web of (image, caption) pairs (parts/21_js_gen.js).

  node gen_data.js $DATA 120000                                          (the data, from the page's own generator)
  DATA=$DATA uv run --with torch --with numpy python train.py run clip      (one run; names in RUNS_DEF)
  DATA=$DATA uv run --with torch --with numpy python train.py sweep         (every run in SWEEP one after another; skips finished ones)
  DATA=$DATA uv run --with torch --with numpy python train.py export        (quantise the shipped model, write parts/20_model_data.js)
  DATA=$DATA uv run --with torch --with numpy python train.py probe         (few-shot and full linear probes on the shipped model's features)

Every model shares one image encoder, a small ViT built as the paper's section 2.4 says (patches, a class token, learned
position embeddings, an extra LayerNorm on the combined patch and position embeddings before the transformer, pre-LN
blocks, LayerNorm on the class token output, a linear projection). The runs differ only in the training objective,
as the paper's Figure 2 does:
  clip      contrastive, text Transformer (causal mask, feature at [EOS], LayerNorm, linear projection), the paper's model
  bowcon    contrastive, bag-of-words text encoder (the mean of word embeddings, then a linear projection): Figure 2's green line
  bowpred   predict the bag of words of the caption (a softmax over the vocabulary against the normalised word counts): orange line
  lm        predict the caption word by word (the image projected into four prefix tokens for a causal Transformer, as
            the paper's CLIP-AR in Appendix A.2): blue line
  sup       a supervised 36-way (colour, shape) classifier on the photo stream: the "trained on ImageNet" baseline
  clipphoto the clip run on the photo stream only (no drawings in its web): which half of the robustness comes from data
Contrastive loss: Figure 3's pseudocode (L2-normalised projections, cosine similarities times exp(t), symmetric cross
entropy). t is learned, initialised to log(1/0.07) and clipped at log(100) (section 2.5). Optimiser: AdamW, beta2 0.98,
eps 1e-6, weight decay 0.2 on matrices only, linear warm-up then cosine decay (Table 18). Batch 256, not 32,768.
"""
import base64, json, math, os, sys, time
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('DATA', os.path.join(HERE, 'data'))
RUNS = os.path.join(HERE, 'model', 'runs')
CK = os.path.join(HERE, 'model', 'ck')
META = json.load(open(os.path.join(DATA, 'meta.json')))
S, LMAX, V = META['S'], META['LMAX'], len(META['VOCAB'])
VOCAB = META['VOCAB']; W2I = {w: i for i, w in enumerate(VOCAB)}
P = 4; NP = (S // P) ** 2
CFG = dict(D=32, L=2, H=4, M=64, E=32)
BATCH, WARM = 256, 200
IMAGES = int(os.environ.get('IMAGES', 1_200_000))          # images processed per run
EVAL_AT = [10_000, 25_000, 50_000, 100_000, 200_000, 400_000, 600_000, 800_000, 1_000_000, 1_200_000]
LR = {'clip': 2e-3, 'bowcon': 2e-3, 'bowpred': 2e-3, 'lm': 2e-3, 'sup': 2e-3, 'clipphoto': 2e-3}
RUNS_DEF = {'clip': 'web', 'bowcon': 'web', 'bowpred': 'web', 'lm': 'web', 'sup': 'photo', 'clipphoto': 'photo'}
SWEEP = ['clip', 'bowcon', 'bowpred', 'lm', 'sup', 'clipphoto']
TEMPLATES = ['a photo of a {}', 'a drawing of a {}', 'look at this {}', 'my {}', 'i found a {} today', 'nice {} #art']
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
torch.set_num_threads(int(os.environ.get('THREADS', 2)))


def load(name):
    a = np.memmap(os.path.join(DATA, name), dtype=np.uint8, mode='r').reshape(-1, META['R'])
    return a


def batch_of(a, idx):
    r = torch.from_numpy(np.asarray(a[np.sort(idx)]).astype(np.int64))
    attrs, toks = r[:, :5], r[:, 5:5 + LMAX]
    img = r[:, 5 + LMAX:].float().div_(255.).view(-1, S, S, 3)
    return img, toks, attrs


def tok(s):
    ids = [1] + [W2I.get(w, 3) for w in s.split()]
    ids = ids[:LMAX - 1] + [2]
    return ids + [0] * (LMAX - len(ids))


def class_names():  # the 36 (colour, shape) classes, in the order label = colour * 6 + shape
    return ['%s %s' % (c, s) for c in META['COLOURS'] for s in META['SHAPES']]


class Block(nn.Module):
    def __init__(self, D, H, M):
        super().__init__(); self.H = H
        self.n1 = nn.LayerNorm(D); self.qkv = nn.Linear(D, 3 * D); self.o = nn.Linear(D, D)
        self.n2 = nn.LayerNorm(D); self.m1 = nn.Linear(D, M); self.m2 = nn.Linear(M, D)

    def forward(self, z, mask=None, keep=None):
        B, T, D = z.shape; H = self.H; dh = D // H
        q, k, v = self.qkv(self.n1(z)).view(B, T, 3, H, dh).permute(2, 0, 3, 1, 4)
        s = q @ k.transpose(-1, -2) / math.sqrt(dh)
        if mask is not None: s = s.masked_fill(mask, float('-inf'))
        a = torch.softmax(s, -1)
        if keep is not None: keep.append(a.detach())
        z = z + self.o((a @ v).transpose(1, 2).reshape(B, T, D))
        return z + self.m2(F.gelu(self.m1(self.n2(z)), approximate='tanh'))


class ImageEnc(nn.Module):
    def __init__(self, c):
        super().__init__(); D = c['D']
        self.patch = nn.Linear(P * P * 3, D)
        self.cls = nn.Parameter(torch.randn(D) * 0.02)
        self.pos = nn.Parameter(torch.randn(NP + 1, D) * 0.02)
        self.lnpre = nn.LayerNorm(D)
        self.blocks = nn.ModuleList([Block(D, c['H'], c['M']) for _ in range(c['L'])])
        self.lnpost = nn.LayerNorm(D)

    @staticmethod
    def patches(x):  # (B,24,24,3) -> (B,36,48): raster order of patches, each patch row by row, RGB interleaved
        B = x.shape[0]; g = S // P
        return x.view(B, g, P, g, P, 3).permute(0, 1, 3, 2, 4, 5).reshape(B, g * g, P * P * 3)

    def forward(self, x, keep=None, all_tokens=False):
        B = x.shape[0]; D = self.cls.shape[0]
        z = torch.cat([self.cls.view(1, 1, D).expand(B, 1, D), self.patch(self.patches(x))], 1) + self.pos
        z = self.lnpre(z)
        for b in self.blocks: z = b(z, keep=keep)
        return self.lnpost(z if all_tokens else z[:, 0])


class TextEnc(nn.Module):
    def __init__(self, c):
        super().__init__(); D = c['D']
        self.emb = nn.Embedding(V, D); self.pos = nn.Parameter(torch.randn(LMAX, D) * 0.01)
        self.blocks = nn.ModuleList([Block(D, c['H'], c['M']) for _ in range(c['L'])])
        self.lnf = nn.LayerNorm(D)
        nn.init.normal_(self.emb.weight, std=0.02)

    def forward(self, t, keep=None):
        B, T = t.shape
        z = self.emb(t) + self.pos[:T]
        mask = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)
        for b in self.blocks: z = b(z, mask=mask, keep=keep)
        z = self.lnf(z)
        eos = (t == 2).float().argmax(1)                                    # the [EOS] position
        return z[torch.arange(B), eos]


class BowEnc(nn.Module):  # CBOW text encoder: the mean of word embeddings (no order)
    def __init__(self, c):
        super().__init__(); self.emb = nn.Embedding(V, c['D']); self.ln = nn.LayerNorm(c['D'])

    def forward(self, t):
        m = (t > 2).float().unsqueeze(-1)
        return self.ln((self.emb(t) * m).sum(1) / m.sum(1).clamp(min=1))


class Contrastive(nn.Module):
    def __init__(self, c, text='transformer'):
        super().__init__(); D, E = c['D'], c['E']
        self.img = ImageEnc(c); self.txt = TextEnc(c) if text == 'transformer' else BowEnc(c)
        self.wi = nn.Linear(D, E, bias=False); self.wt = nn.Linear(D, E, bias=False)
        self.t = nn.Parameter(torch.tensor(math.log(1 / 0.07)))

    def embed_image(self, x): return F.normalize(self.wi(self.img(x)), dim=-1)
    def embed_text(self, t): return F.normalize(self.wt(self.txt(t)), dim=-1)

    def loss(self, x, t, attrs):
        ie, te = self.embed_image(x), self.embed_text(t)
        logits = ie @ te.T * self.t.clamp(max=math.log(100)).exp()      # scaled pairwise cosine similarities [n, n]
        lab = torch.arange(x.shape[0])
        return (F.cross_entropy(logits, lab) + F.cross_entropy(logits.T, lab)) / 2

    @torch.no_grad()
    def scores(self, x, prompts):  # prompts: list of lists of strings (one list per class: an ensemble)
        ie = self.embed_image(x)
        W = torch.stack([F.normalize(self.embed_text(torch.tensor([tok(p) for p in ps])).mean(0), dim=-1) for ps in prompts])
        return ie @ W.T


class BowPred(nn.Module):
    def __init__(self, c):
        super().__init__(); self.img = ImageEnc(c); self.head = nn.Linear(c['D'], V)

    def loss(self, x, t, attrs):
        cnt = F.one_hot(t, V).float().sum(1); cnt[:, :3] = 0
        tgt = cnt / cnt.sum(1, keepdim=True).clamp(min=1)
        return -(tgt * F.log_softmax(self.head(self.img(x)), -1)).sum(1).mean()

    @torch.no_grad()
    def scores(self, x, prompts):
        lp = F.log_softmax(self.head(self.img(x)), -1)
        out = []
        for ps in prompts:
            s = []
            for p in ps:
                ids = [i for i in tok(p) if i > 2]
                s.append(lp[:, ids].sum(1))
            out.append(torch.stack(s, 1).mean(1))
        return torch.stack(out, 1)


class LM(nn.Module):  # CLIP-AR: the image as four prefix tokens for a causal Transformer that writes the caption
    def __init__(self, c):
        super().__init__(); D = c['D']; self.D = D
        self.img = ImageEnc(c); self.pre = nn.Linear(D, 4 * D)
        self.emb = nn.Embedding(V, D); self.pos = nn.Parameter(torch.randn(4 + LMAX, D) * 0.01)
        self.blocks = nn.ModuleList([Block(D, c['H'], c['M']) for _ in range(c['L'])])
        self.lnf = nn.LayerNorm(D); self.out = nn.Linear(D, V)

    def logp(self, x_feat, t):  # log p(t[1:] | image, t[:k]) summed over each caption's real tokens
        B, T = t.shape
        z = torch.cat([self.pre(x_feat).view(B, 4, self.D), self.emb(t)], 1) + self.pos[:4 + T]
        n = 4 + T; mask = torch.triu(torch.ones(n, n, dtype=torch.bool), 1)
        for b in self.blocks: z = b(z, mask=mask)
        lg = F.log_softmax(self.out(self.lnf(z[:, 4:-1])), -1)          # predicts t[1:]
        tgt = t[:, 1:]; m = (tgt > 0).float()
        return (lg.gather(-1, tgt.unsqueeze(-1)).squeeze(-1) * m).sum(1), m.sum(1)

    def loss(self, x, t, attrs):
        s, n = self.logp(self.img(x), t)
        return -(s.sum() / n.sum())

    @torch.no_grad()
    def scores(self, x, prompts):
        f = self.img(x); B = x.shape[0]; out = []
        for ps in prompts:
            s = []
            for p in ps:
                tt = torch.tensor([tok(p)]).expand(B, LMAX)
                s.append(self.logp(f, tt)[0])
            out.append(torch.stack(s, 1).mean(1))
        return torch.stack(out, 1)


class Sup(nn.Module):
    def __init__(self, c):
        super().__init__(); self.img = ImageEnc(c); self.head = nn.Linear(c['D'], 36)

    def loss(self, x, t, attrs):
        return F.cross_entropy(self.head(self.img(x)), attrs[:, 1] * 6 + attrs[:, 0])

    @torch.no_grad()
    def scores(self, x, prompts=None):
        return self.head(self.img(x))


def make(name):
    if name in ('clip', 'clipphoto'): return Contrastive(CFG)
    if name == 'bowcon': return Contrastive(CFG, text='bow')
    if name == 'bowpred': return BowPred(CFG)
    if name == 'lm': return LM(CFG)
    if name == 'sup': return Sup(CFG)
    raise SystemExit('unknown run ' + name)


def prompts_for(mode, names=None):
    names = names or class_names()
    if mode == 'bare': return [[n] for n in names]
    if mode == 'photo': return [['a photo of a ' + n] for n in names]
    if mode == 'drawing': return [['a drawing of a ' + n] for n in names]
    if mode == 'ensemble': return [[t.format(n) for t in TEMPLATES] for n in names]
    raise ValueError(mode)


@torch.no_grad()
def zero_shot(m, a, mode='photo', n=None):
    m.eval(); idx = np.arange(len(a) if n is None else min(n, len(a))); correct = 0
    for c in range(0, len(idx), 500):
        x, t, at = batch_of(a, idx[c:c + 500])
        sc = m.scores(x, prompts_for(mode))
        correct += (sc.argmax(1) == at[:, 1] * 6 + at[:, 0]).sum().item()
    m.train(); return correct / len(idx)


def param_count(m): return sum(p.numel() for p in m.parameters())


def run(name):
    os.makedirs(RUNS, exist_ok=True); os.makedirs(CK, exist_ok=True)
    path = os.path.join(RUNS, name + '.json')
    if os.path.exists(path): print('done already:', name); return
    torch.manual_seed(0); np.random.seed(0)
    tr = load(RUNS_DEF[name] + '.u8'); va = load('val.u8')
    m = make(name)
    decay = [p for n, p in m.named_parameters() if p.ndim == 2 and 'pos' not in n]
    rest = [p for n, p in m.named_parameters() if not (p.ndim == 2 and 'pos' not in n)]
    opt = torch.optim.AdamW([{'params': decay, 'weight_decay': 0.2}, {'params': rest, 'weight_decay': 0.0}], lr=LR[name], betas=(0.9, 0.98), eps=1e-6)
    steps = IMAGES // BATCH
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1, (s + 1) / WARM) * 0.5 * (1 + math.cos(math.pi * min(1, s / steps))))
    rng = np.random.default_rng(0); perm = rng.permutation(len(tr)); pi = 0
    log = {'name': name, 'data': RUNS_DEF[name], 'params': param_count(m), 'batch': BATCH, 'images': IMAGES, 'lr': LR[name], 'curve': [], 'loss': []}
    t0 = time.time(); seen = 0; ev = list(EVAL_AT); run_loss = []
    for step in range(steps):
        if pi + BATCH > len(perm): perm = rng.permutation(len(tr)); pi = 0
        x, t, at = batch_of(tr, perm[pi:pi + BATCH]); pi += BATCH
        loss = m.loss(x, t, at)
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
        seen += BATCH; run_loss.append(loss.item())
        if (step + 1) % 50 == 0:
            log['loss'].append([seen, round(float(np.mean(run_loss)), 4)]); run_loss = []
        if ev and seen >= ev[0]:
            ev.pop(0)
            acc = zero_shot(m, va, 'photo') if name != 'sup' else zero_shot(m, va)
            rec = [seen, round(acc, 4)]
            if hasattr(m, 't'): rec.append(round(float(m.t.exp()), 2))
            log['curve'].append(rec)
            print(name, 'images', seen, 'val zero-shot', round(acc, 4), 'loss', log['loss'][-1][1] if log['loss'] else None, 'secs', round(time.time() - t0), flush=True)
    log['secs'] = round(time.time() - t0)
    te_p, te_d = load('test_photo.u8'), load('test_drawing.u8')
    res = {}
    modes = ['bare', 'photo', 'drawing', 'ensemble'] if name != 'sup' else ['label']
    for mode in modes:
        res[mode] = {'photo': round(zero_shot(m, te_p, mode if mode != 'label' else 'photo'), 4), 'drawing': round(zero_shot(m, te_d, mode if mode != 'label' else 'photo'), 4)}
    log['test'] = res
    if hasattr(m, 't'): log['logit_scale'] = round(float(m.t.clamp(max=math.log(100)).exp()), 3)
    torch.save({'name': name, 'state': m.state_dict()}, os.path.join(CK, name + '.pt'))
    json.dump(log, open(path, 'w'))
    print(name, 'params', log['params'], 'test', res, 'secs', log['secs'], flush=True)


# ---------------------------------------------------------------- export
def order(m):
    """Every tensor the page needs, in the order 23_js_clip.js reads them."""
    out = ['img.patch.weight', 'img.patch.bias', 'img.cls', 'img.pos', 'img.lnpre.weight', 'img.lnpre.bias']
    for i in range(CFG['L']):
        out += ['img.blocks.%d.%s' % (i, k) for k in ('n1.weight', 'n1.bias', 'qkv.weight', 'qkv.bias', 'o.weight', 'o.bias', 'n2.weight', 'n2.bias', 'm1.weight', 'm1.bias', 'm2.weight', 'm2.bias')]
    out += ['img.lnpost.weight', 'img.lnpost.bias', 'wi.weight', 'txt.emb.weight', 'txt.pos']
    for i in range(CFG['L']):
        out += ['txt.blocks.%d.%s' % (i, k) for k in ('n1.weight', 'n1.bias', 'qkv.weight', 'qkv.bias', 'o.weight', 'o.bias', 'n2.weight', 'n2.bias', 'm1.weight', 'm1.bias', 'm2.weight', 'm2.bias')]
    out += ['txt.lnf.weight', 'txt.lnf.bias', 'wt.weight', 't']
    return out


def quantise(state, names):
    """6-bit matrices (one base64 character per weight, one scale character per row, as the Transformer page); float16 vectors."""
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
            h = w.reshape(-1).astype(np.float16); vb += h.tobytes(); deq[n] = torch.tensor(h.astype(np.float32)).view(state[n].shape)
    return ''.join(mq), ''.join(sq), base64.b64encode(bytes(vb)).decode(), tmax, deq


def export():
    ck = torch.load(os.path.join(CK, 'clip.pt'), weights_only=False)
    m = make('clip'); m.load_state_dict(ck['state']); sd = m.state_dict(); names = order(m)
    assert set(names) == set(sd.keys()), set(sd.keys()) ^ set(names)
    shapes = [[n] + list(sd[n].shape) for n in names]
    mq, sq, vb, tmax, deq = quantise(sd, names)
    mq_m = make('clip'); s2 = dict(sd); s2.update(deq); mq_m.load_state_dict(s2)
    torch.save({'name': 'clip_q', 'state': mq_m.state_dict()}, os.path.join(HERE, 'model', 'clip_q.pt'))
    te_p, te_d = load('test_photo.u8'), load('test_drawing.u8')
    rep = {'params': param_count(m), 'float': json.load(open(os.path.join(RUNS, 'clip.json')))['test'], 'quantised': {}}
    for mode in ('bare', 'photo', 'drawing', 'ensemble'):
        rep['quantised'][mode] = {'photo': round(zero_shot(mq_m, te_p, mode), 4), 'drawing': round(zero_shot(mq_m, te_d, mode), 4)}
    out = {'cfg': dict(CFG, S=S, P=P, LMAX=LMAX, V=V), 'shapes': shapes, 'tmax': tmax, 'm': mq, 's': sq, 'v': vb, 'templates': TEMPLATES}
    js = '// Generated by train.py export: the toy CLIP (configuration and weights).\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.CLIPW=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    rep['chars'] = len(js)
    json.dump(rep, open(os.path.join(HERE, 'model', 'report.json'), 'w'), indent=1)
    print(json.dumps(rep, indent=1))


@torch.no_grad()
def feats(m, a, n=None):
    idx = np.arange(len(a) if n is None else n); F_, Y = [], []
    for c in range(0, len(idx), 1000):
        x, t, at = batch_of(a, idx[c:c + 1000])
        F_.append(m.img(x) if not hasattr(m, 'wi') else m.img(x)); Y.append(at[:, 1] * 6 + at[:, 0])
    return torch.cat(F_), torch.cat(Y)


def logreg(Xtr, Ytr, Xte, lam, iters=300):
    W = torch.zeros(Xtr.shape[1], 36, requires_grad=True); b = torch.zeros(36, requires_grad=True)
    opt = torch.optim.LBFGS([W, b], max_iter=iters, line_search_fn='strong_wolfe')
    def closure():
        opt.zero_grad(); l = F.cross_entropy(Xtr @ W + b, Ytr) + lam * (W ** 2).sum(); l.backward(); return l
    opt.step(closure)
    return (Xte @ W + b).argmax(1)


def probe():
    """Linear probes on the toy CLIP's image features (before the projection, as the paper's I_f), fitted on photo
    labels only: k = 1, 2, 4, 8, 16 examples per class and the full photo stream (the paper's Figures 6, 7 and 14).
    The L2 strength is chosen on a held-out slice of the photo stream for each k, as Appendix A.3 does on validation splits."""
    m = make('clip'); m.load_state_dict(torch.load(os.path.join(HERE, 'model', 'clip_q.pt'), weights_only=False)['state']); m.eval()
    ph = load('photo.u8'); te_p, te_d = load('test_photo.u8'), load('test_drawing.u8')
    Xp, Yp = feats(m, ph, 40000); Xt, Yt = feats(m, te_p); Xd, Yd = feats(m, te_d)
    mu, sd = Xp.mean(0), Xp.std(0) + 1e-6
    Xp, Xt, Xd = (Xp - mu) / sd, (Xt - mu) / sd, (Xd - mu) / sd
    Xh, Yh = Xp[30000:], Yp[30000:]; Xp, Yp = Xp[:30000], Yp[:30000]
    res = {'k': {}, 'seeds': 5}
    for k in (1, 2, 4, 8, 16, 'full'):
        accs_p, accs_d = [], []
        for seed in range(5 if k != 'full' else 1):
            g = torch.Generator().manual_seed(seed)
            if k == 'full': sel = torch.arange(len(Yp))
            else: sel = torch.cat([torch.nonzero(Yp == c).squeeze(1)[torch.randperm(int((Yp == c).sum()), generator=g)[:k]] for c in range(36)])
            best = None
            for lam in (1e-4, 1e-3, 1e-2, 1e-1):
                h = (logreg(Xp[sel], Yp[sel], Xh, lam) == Yh).float().mean().item()
                if best is None or h > best[0]: best = (h, lam)
            lam = best[1]
            accs_p.append((logreg(Xp[sel], Yp[sel], Xt, lam) == Yt).float().mean().item())
            accs_d.append((logreg(Xp[sel], Yp[sel], Xd, lam) == Yd).float().mean().item())
        res['k'][str(k)] = {'photo': [round(v, 4) for v in accs_p], 'drawing': [round(v, 4) for v in accs_d], 'lam': lam}
        print(k, np.mean(accs_p), np.mean(accs_d), flush=True)
    json.dump(res, open(os.path.join(HERE, 'model', 'probe.json'), 'w'), indent=1)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'run': run(sys.argv[2])
    elif cmd == 'sweep':
        for n in SWEEP: run(n)
    elif cmd == 'export': export()
    elif cmd == 'probe': probe()
