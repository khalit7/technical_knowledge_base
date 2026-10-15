"""Tiny-proxy mixing experiment for the running example (data mixing child page, prefix mx2).

One script, four commands, designed so the parent topic's Mixing lab can reuse it unchanged:

  prep    tokenize per-domain JSONL files into uint16 token streams (train and held-out val)
  train   train one tiny GPT on a fixed mixture and write per-domain held-out losses
  sweep   RegMix-style: train many tiny GPTs on Dirichlet-sampled mixtures (one JSON per run)
  doremi  DoReMi step 2 (Algorithm 1 of arXiv 2305.10429): proxy trained with Group DRO
          against a reference run, returns the averaged domain weights

Paths: everything lives under $MX2_WORK (default $DC_SCRATCH/mix2). Domains are read from
$MX2_WORK/domains.json: {"web": "<jsonl path>", ...}. Device: --device cpu|mps|cuda.
CPU smoke test (what this page ran): see run_pending.sh, section 0.
"""
import argparse, json, math, os, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

WORK = os.environ.get('MX2_WORK') or os.path.join(os.environ.get('DC_SCRATCH', '.'), 'mix2')


# ---------------------------------------------------------------- data
def prep(args):
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(args.tokenizer)
    eot = tok.token_to_id('<|endoftext|>')
    doms = json.load(open(os.path.join(WORK, 'domains.json')))
    os.makedirs(os.path.join(WORK, 'tok'), exist_ok=True)
    stats = {}
    for name, path in doms.items():
        docs = [json.loads(l)['text'] for l in open(path)]
        cut = int(len(docs) * (1 - args.val_frac))
        for split, part in (('train', docs[:cut]), ('val', docs[cut:])):
            ids = []
            for enc in tok.encode_batch(part):
                ids.extend(enc.ids); ids.append(eot)
            arr = np.array(ids, dtype=np.uint16)
            arr.tofile(os.path.join(WORK, 'tok', f'{name}.{split}.bin'))
            stats.setdefault(name, {})[split] = int(arr.size)
    json.dump(stats, open(os.path.join(WORK, 'tok', 'stats.json'), 'w'), indent=1)
    print(json.dumps(stats))


class Streams:
    """Per-domain token streams; a batch row is a random window from one domain."""
    def __init__(self, names, split, ctx, rng):
        self.names, self.ctx, self.rng = names, ctx, rng
        self.data = [np.memmap(os.path.join(WORK, 'tok', f'{n}.{split}.bin'), dtype=np.uint16, mode='r') for n in names]

    def batch(self, dom_ids, device):
        x = np.empty((len(dom_ids), self.ctx + 1), dtype=np.int64)
        for r, d in enumerate(dom_ids):
            a = self.data[d]; s = self.rng.integers(0, a.size - self.ctx - 1)
            x[r] = a[s:s + self.ctx + 1]
        x = torch.from_numpy(x).to(device)
        return x[:, :-1], x[:, 1:]


# ---------------------------------------------------------------- model (nanoGPT-style, pre-norm)
class Block(nn.Module):
    def __init__(self, d, h):
        super().__init__()
        self.h = h; self.ln1 = nn.LayerNorm(d); self.qkv = nn.Linear(d, 3 * d); self.o = nn.Linear(d, d)
        self.ln2 = nn.LayerNorm(d); self.fc = nn.Linear(d, 4 * d); self.pr = nn.Linear(4 * d, d)

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(self.ln1(x)).split(C, dim=2)
        q, k, v = (t.view(B, T, self.h, C // self.h).transpose(1, 2) for t in (q, k, v))
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True).transpose(1, 2).reshape(B, T, C)
        x = x + self.o(y)
        return x + self.pr(F.gelu(self.fc(self.ln2(x))))


class GPT(nn.Module):
    def __init__(self, vocab, ctx, d, layers, heads):
        super().__init__()
        self.tok = nn.Embedding(vocab, d); self.pos = nn.Embedding(ctx, d)
        self.blocks = nn.ModuleList(Block(d, heads) for _ in range(layers)); self.ln = nn.LayerNorm(d)
        self.head = nn.Linear(d, vocab, bias=False); self.head.weight = self.tok.weight  # tied
        for m in self.modules():  # GPT-2 style init (std 0.02); PyTorch's default N(0, 1) embedding blows up tied logits
            if isinstance(m, (nn.Linear, nn.Embedding)):
                nn.init.normal_(m.weight, mean=0.0, std=0.02)
                if isinstance(m, nn.Linear) and m.bias is not None: nn.init.zeros_(m.bias)

    def forward(self, idx):
        x = self.tok(idx) + self.pos(torch.arange(idx.shape[1], device=idx.device))
        for b in self.blocks: x = b(x)
        return self.head(self.ln(x))

    def n_params(self, non_embedding=True):
        n = sum(p.numel() for p in self.parameters())
        return n - (self.tok.weight.numel() + self.pos.weight.numel() if non_embedding else 0)


def token_losses(model, x, y):
    logits = model(x)
    return F.cross_entropy(logits.reshape(-1, logits.shape[-1]), y.reshape(-1), reduction='none').view(y.shape)


@torch.no_grad()
def evaluate(model, names, ctx, device, n_batches, bs, seed=1234):
    model.eval(); val = Streams(names, 'val', ctx, np.random.default_rng(seed)); out = {}
    for d, n in enumerate(names):
        tot = 0.0
        for _ in range(n_batches):
            x, y = val.batch([d] * bs, device); tot += token_losses(model, x, y).mean().item()
        out[n] = tot / n_batches
    model.train(); return out


def lr_at(step, steps, peak, warm):
    if step < warm: return peak * (step + 1) / warm
    return peak * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * (step - warm) / max(1, steps - warm))))


def build(args, device):
    torch.manual_seed(args.seed)
    m = GPT(args.vocab, args.ctx, args.d, args.layers, args.heads).to(device)
    opt = torch.optim.AdamW(m.parameters(), lr=args.lr, weight_decay=0.1, betas=(0.9, 0.95))
    return m, opt


def train_one(args, weights, tag):
    names = list(json.load(open(os.path.join(WORK, 'domains.json'))))
    w = np.array([weights[n] for n in names], dtype=float); w = w / w.sum()
    device = torch.device(args.device); rng = np.random.default_rng(args.seed)
    m, opt = build(args, device); tr = Streams(names, 'train', args.ctx, rng)
    t0 = time.time(); seen = 0
    for step in range(args.steps):
        for g in opt.param_groups: g['lr'] = lr_at(step, args.steps, args.lr, args.warmup)
        x, y = tr.batch(rng.choice(len(names), size=args.bs, p=w), device)
        loss = token_losses(m, x, y).mean(); opt.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); seen += x.numel()
    if device.type == 'mps': torch.mps.synchronize()
    secs = time.time() - t0
    res = {'tag': tag, 'weights': dict(zip(names, w.round(6).tolist())), 'val_loss': evaluate(m, names, args.ctx, device, args.eval_batches, args.bs),
           'tokens': seen, 'seconds': round(secs, 1), 'tokens_per_s': round(seen / secs), 'device': args.device,
           'params_non_embedding': m.n_params(), 'params_total': m.n_params(False), 'config': {k: getattr(args, k) for k in ('d', 'layers', 'heads', 'ctx', 'bs', 'steps', 'lr', 'seed', 'vocab')}}
    os.makedirs(os.path.join(WORK, 'runs'), exist_ok=True)
    json.dump(res, open(os.path.join(WORK, 'runs', f'{tag}.json'), 'w'), indent=1)
    print(tag, json.dumps({k: res[k] for k in ('val_loss', 'tokens_per_s', 'params_non_embedding')}))
    return m


def sweep(args):
    names = list(json.load(open(os.path.join(WORK, 'domains.json'))))
    stats = json.load(open(os.path.join(WORK, 'tok', 'stats.json')))
    prior = np.array([stats[n]['train'] for n in names], float); prior /= prior.sum()
    rng = np.random.default_rng(args.sweep_seed)
    for i in range(args.n_runs):
        # RegMix section 3.1: Dirichlet with alpha = token distribution x a scale drawn from 0.1 to 5.0
        alpha = prior * rng.uniform(0.1, 5.0)
        w = rng.dirichlet(np.maximum(alpha, 1e-3))
        tag = f'sweep_{args.sweep_seed}_{i:03d}'
        if os.path.exists(os.path.join(WORK, 'runs', f'{tag}.json')): continue
        train_one(args, dict(zip(names, w)), tag)


def doremi(args):
    """Algorithm 1 of arXiv 2305.10429: step size eta, smoothing c, uniform batches, per-token excess loss clipped at 0."""
    names = list(json.load(open(os.path.join(WORK, 'domains.json')))); k = len(names)
    device = torch.device(args.device); rng = np.random.default_rng(args.seed)
    ref_w = json.load(open(args.ref_weights)) if args.ref_weights else {n: 1 / k for n in names}
    ref = train_one(args, ref_w, f'doremi_ref_{args.seed}'); ref.eval()
    for p in ref.parameters(): p.requires_grad_(False)
    m, opt = build(args, device); tr = Streams(names, 'train', args.ctx, rng)
    u = np.full(k, 1 / k); alpha = u.copy(); hist = []
    per = max(1, args.bs // k)
    for step in range(args.steps):
        for g in opt.param_groups: g['lr'] = lr_at(step, args.steps, args.lr, args.warmup)
        dom = np.repeat(np.arange(k), per)                      # uniform minibatch over domains
        x, y = tr.batch(dom, device)
        lp = token_losses(m, x, y)
        with torch.no_grad():
            lr_ = token_losses(ref, x, y)
            exc = (lp - lr_).clamp_min(0).view(k, per, -1).mean(dim=(1, 2)).cpu().numpy()
        alpha = alpha * np.exp(args.eta * exc); alpha = (1 - args.c) * alpha / alpha.sum() + args.c * u
        hist.append(alpha.copy())
        wt = torch.tensor(alpha, dtype=lp.dtype, device=device)
        loss = (lp.view(k, per, -1).mean(dim=(1, 2)) * wt).sum()
        opt.zero_grad(set_to_none=True); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
    avg = np.mean(hist, axis=0)
    res = {'names': names, 'eta': args.eta, 'c': args.c, 'ref_weights': ref_w, 'avg_weights': dict(zip(names, avg.round(5).tolist())),
           'trajectory': np.array(hist)[:: max(1, len(hist) // 100)].round(5).tolist(), 'config': {k_: getattr(args, k_) for k_ in ('d', 'layers', 'heads', 'ctx', 'bs', 'steps', 'lr', 'seed')}}
    json.dump(res, open(os.path.join(WORK, 'runs', f'doremi_proxy_{args.seed}.json'), 'w'), indent=1)
    print('doremi weights', res['avg_weights'])


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['prep', 'train', 'sweep', 'doremi'])
    ap.add_argument('--tokenizer'); ap.add_argument('--val_frac', type=float, default=0.05)
    ap.add_argument('--weights', help='JSON file {domain: weight} for train'); ap.add_argument('--tag', default='run')
    ap.add_argument('--device', default='cpu'); ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--vocab', type=int, default=50257); ap.add_argument('--ctx', type=int, default=256)
    ap.add_argument('--d', type=int, default=128); ap.add_argument('--layers', type=int, default=4); ap.add_argument('--heads', type=int, default=4)
    ap.add_argument('--bs', type=int, default=32); ap.add_argument('--steps', type=int, default=2000)
    ap.add_argument('--lr', type=float, default=3e-3); ap.add_argument('--warmup', type=int, default=100)
    ap.add_argument('--eval_batches', type=int, default=8)
    ap.add_argument('--n_runs', type=int, default=64); ap.add_argument('--sweep_seed', type=int, default=0)
    ap.add_argument('--eta', type=float, default=1.0); ap.add_argument('--c', type=float, default=1e-3); ap.add_argument('--ref_weights')
    a = ap.parse_args()
    torch.set_num_threads(int(os.environ.get('OMP_NUM_THREADS', '4')))
    if a.cmd == 'prep': prep(a)
    elif a.cmd == 'train': train_one(a, json.load(open(a.weights)), a.tag)
    elif a.cmd == 'sweep': sweep(a)
    else: doremi(a)
