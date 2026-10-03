"""Loss spikes at toy scale: the small-scale proxy of Wortsman et al. 2023 (arXiv 2309.14322), run here.

A 2-layer character-level Transformer (d = 128, 4 heads, context 64, pre-norm, learned positions, about 0.4M
parameters) on Tiny Shakespeare (Karpathy's char-rnn input.txt, 1,115,394 characters; first 90% train, last 10%
validation), AdamW (0.9, 0.95), no weight decay, batch 32, linear warmup then cosine to 10% of peak, torch threads 2.
Variants: baseline; QK-norm (RMSNorm on queries and keys, as OLMo 2 after Dehghani et al. 2023); z-loss
(1e-4 * log^2 Z added to the loss, as PaLM); both. Recorded per step: training loss, gradient L2 norm (before
clipping), the largest attention logit in the batch, the mean log Z of the output softmax.

usage: uv run --with torch python runs_spike.py <text file> [main|sweep|all]
"""
import json, math, os, sys, time
import torch, torch.nn as nn, torch.nn.functional as F

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
text = open(sys.argv[1]).read()
chars = sorted(set(text)); V = len(chars); stoi = {c: i for i, c in enumerate(chars)}
data = torch.tensor([stoi[c] for c in text], dtype=torch.long)
n = int(0.9 * len(data)); dtr, dva = data[:n], data[n:]
CTX, BS, D, NH, NL = 64, 32, 128, 4, 2


class RMS(nn.Module):
    def __init__(s, d):
        super().__init__(); s.g = nn.Parameter(torch.ones(d))

    def forward(s, x):
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + 1e-6) * s.g


class Block(nn.Module):
    def __init__(s, qk):
        super().__init__()
        s.n1, s.n2 = nn.LayerNorm(D), nn.LayerNorm(D)
        s.qkv, s.o = nn.Linear(D, 3 * D), nn.Linear(D, D)
        s.ff = nn.Sequential(nn.Linear(D, 4 * D), nn.GELU(), nn.Linear(4 * D, D))
        s.qk = qk
        if qk:
            s.qn, s.kn = RMS(D // NH), RMS(D // NH)
        s.maxlogit = 0.0

    def forward(s, x):
        B, Tn, _ = x.shape
        q, k, v = s.qkv(s.n1(x)).split(D, -1)
        q, k, v = [t.view(B, Tn, NH, D // NH).transpose(1, 2) for t in (q, k, v)]
        if s.qk:
            q, k = s.qn(q), s.kn(k)
        att = q @ k.transpose(-1, -2) / math.sqrt(D // NH)
        s.maxlogit = att.detach().abs().max().item()
        att = att.masked_fill(torch.triu(torch.ones(Tn, Tn, dtype=torch.bool), 1), float('-inf')).softmax(-1)
        x = x + s.o((att @ v).transpose(1, 2).reshape(B, Tn, D))
        return x + s.ff(s.n2(x))


class GPT(nn.Module):
    def __init__(s, qk):
        super().__init__()
        s.emb, s.pos = nn.Embedding(V, D), nn.Embedding(CTX, D)
        s.blocks = nn.ModuleList([Block(qk) for _ in range(NL)])
        s.nf, s.head = nn.LayerNorm(D), nn.Linear(D, V)

    def forward(s, idx):
        x = s.emb(idx) + s.pos(torch.arange(idx.shape[1]))
        for b in s.blocks:
            x = b(x)
        return s.head(s.nf(x))


def batch(src, g):
    ix = torch.randint(len(src) - CTX - 1, (BS,), generator=g)
    return torch.stack([src[i:i + CTX] for i in ix]), torch.stack([src[i + 1:i + CTX + 1] for i in ix])


def r(v, p=4):
    return float(f'{v:.{p}g}') if math.isfinite(v) else None


def train(lr, qk=False, z=False, steps=1500, warm=50, clip=None, seed=1, keep=True):
    torch.manual_seed(seed); g = torch.Generator().manual_seed(seed); gv = torch.Generator().manual_seed(99)
    m = GPT(qk); opt = torch.optim.AdamW(m.parameters(), lr=lr, betas=(0.9, 0.95), weight_decay=0.0)
    out = {'lr': lr, 'qk': qk, 'z': z, 'clip': clip, 'loss': [], 'gnorm': [], 'maxlogit': [], 'logz': [], 'val': []}
    vb = [batch(dva, gv) for _ in range(8)]
    t0 = time.time()
    for s in range(1, steps + 1):
        f = s / warm if s <= warm else 0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * (s - warm) / (steps - warm)))
        for pg in opt.param_groups:
            pg['lr'] = lr * f
        x, y = batch(dtr, g)
        logits = m(x)
        ce = F.cross_entropy(logits.view(-1, V), y.view(-1))
        logz = torch.logsumexp(logits, -1)
        loss = ce + (1e-4 * (logz ** 2).mean() if z else 0)
        opt.zero_grad(); loss.backward()
        gn = torch.sqrt(sum((p.grad ** 2).sum() for p in m.parameters())).item()
        if clip:
            torch.nn.utils.clip_grad_norm_(m.parameters(), clip)
        opt.step()
        out['loss'].append(r(ce.item())); out['gnorm'].append(r(gn, 3))
        out['maxlogit'].append(r(max(b.maxlogit for b in m.blocks), 3)); out['logz'].append(r(logz.mean().item(), 3))
        if s % 100 == 0 or s == steps or not math.isfinite(ce.item()):
            with torch.no_grad():
                vl = sum(F.cross_entropy(m(a).view(-1, V), b.view(-1)).item() for a, b in vb) / len(vb)
            out['val'].append([s, r(vl)])
        if not math.isfinite(ce.item()):
            out['diverged_at'] = s; break
    out['final_val'] = out['val'][-1][1]; out['secs'] = round(time.time() - t0, 1)
    print(f"lr {lr:g} qk {qk} z {z} clip {clip}: final val {out['final_val']} max logit {max(v for v in out['maxlogit'] if v is not None):.1f} secs {out['secs']}", flush=True)
    if not keep:
        for k in ('loss', 'gnorm', 'maxlogit', 'logz'):
            out[k] = out[k][::10]
    return out


if __name__ == '__main__':
    what = sys.argv[2] if len(sys.argv) > 2 else 'all'
    path = os.path.join(HERE, 'runs_spike.json')
    res = json.load(open(path)) if os.path.exists(path) else {}
    res['_meta'] = {'_doc': __doc__.strip(), 'torch': torch.__version__, 'vocab': V, 'params': sum(p.numel() for p in GPT(False).parameters())}
    if what in ('probe',):
        for lr in [float(a) for a in sys.argv[3:]]:
            train(lr, steps=600, keep=False)
            train(lr, qk=True, z=True, steps=600, keep=False)
        sys.exit()
    if what in ('main', 'all'):
        LR = float(os.environ.get('SPIKE_LR', '1e-2'))
        res['main'] = {k: train(LR, qk=q, z=zz) for k, q, zz in
                       [('base', False, False), ('qk', True, False), ('z', False, True), ('both', True, True)]}
        res['main']['base_clip'] = train(LR, clip=1.0)
    if what in ('sweep', 'all'):
        res['sweep'] = [train(lr, qk=q, z=q, steps=1500, keep=False) for lr in [1e-3, 3e-3, 1e-2, 3e-2, 1e-1] for q in (False, True)]
    json.dump(res, open(path, 'w'), separators=(',', ':'))
    print('wrote', path, os.path.getsize(path))
