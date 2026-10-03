"""Toy Mixtral: a small decoder-only transformer whose every feed-forward block is an 8-expert, top-2
sparse MoE layer exactly as in the paper's Section 2.1, trained on four text domains so that its
router can be analysed the way Section 5 analyses Mixtral's (analyse.py).

  uv run --with torch --with tokenizers python train.py tok          # byte-level BPE on the train split
  uv run --with torch --with tokenizers python train.py main         # aux load-balancing loss 0.02
  uv run --with torch --with tokenizers python train.py noaux        # no auxiliary loss at all

What is Mixtral's and what is ours:
  Mixtral's: every FFN replaced by an MoE layer (not every other one as in GShard), n = 8 experts,
    K = 2, gate = Softmax(Top2(x . W_g)) (softmax over the two kept logits only), SwiGLU experts,
    RMSNorm, rotary positions, grouped-query attention, decoder-only, untied output head.
  Ours (toy scale): width 128, 4 layers, 4 query heads sharing 2 key-value heads, expert inner width
    256, a 2,048-token byte-level BPE vocabulary, 256-token context, AdamW with cosine decay.
  The paper says nothing about an auxiliary load-balancing loss. Hugging Face's Mixtral config ships
    router_aux_loss_coef = 0.02 (the Switch-style loss, used when fine-tuning with output_router_logits);
    "main" uses it, "noaux" trains with none, so the analysis can show what depends on it.
Checkpoints go to model/ck/ (not committed: about 14 MB each); logs to model/train_<variant>.log.
"""
import json, math, os, random, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'model', 'data')
CK = os.path.join(HERE, 'model', 'ck')
DOMAINS = ['github', 'gutenberg', 'wikipedia', 'dm_math']
CFG = dict(vocab=2048, dim=128, n_layers=4, n_heads=4, n_kv_heads=2, hidden=256, n_experts=8, top_k=2,
           ctx=256, batch=32, steps=1800, lr=2e-3, warmup=100, wd=0.1, seed=0)


def train_tokenizer():
    from tokenizers import Tokenizer, models, pre_tokenizers, decoders, trainers
    tok = Tokenizer(models.BPE())
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tok.decoder = decoders.ByteLevel()
    tr = trainers.BpeTrainer(vocab_size=CFG['vocab'], special_tokens=['<doc>'], initial_alphabet=pre_tokenizers.ByteLevel.alphabet())
    def it():
        for d in DOMAINS:
            for doc in json.load(open(os.path.join(DATA, d + '.json')))['train']: yield doc
    tok.train_from_iterator(it(), tr)
    tok.save(os.path.join(HERE, 'model', 'tokenizer.json'))
    print('tokenizer saved, vocab', tok.get_vocab_size())


def encode_all():
    """Token ids per domain and split, cached in model/data/ids.pt."""
    import torch
    from tokenizers import Tokenizer
    p = os.path.join(DATA, 'ids.pt')
    if os.path.exists(p): return torch.load(p)
    tok = Tokenizer.from_file(os.path.join(HERE, 'model', 'tokenizer.json'))
    out = {}
    for d in DOMAINS:
        j = json.load(open(os.path.join(DATA, d + '.json')))
        for split in ('train', 'test'):
            ids = []
            for doc in j[split]: ids += [0] + tok.encode(doc).ids
            out[(d, split)] = torch.tensor(ids, dtype=torch.long)
    torch.save(out, p)
    return out


def build_model():
    import torch, torch.nn as nn, torch.nn.functional as F
    C = CFG

    class RMSNorm(nn.Module):
        def __init__(s, d): super().__init__(); s.w = nn.Parameter(torch.ones(d))
        def forward(s, x): return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + 1e-5) * s.w

    def rope(x, pos):  # x: B,H,T,hd
        hd = x.shape[-1]
        inv = 1.0 / (10000 ** (torch.arange(0, hd, 2, dtype=torch.float32) / hd))
        f = pos[:, None].float() * inv[None]
        cos, sin = f.cos()[None, None], f.sin()[None, None]
        x1, x2 = x[..., 0::2], x[..., 1::2]
        return torch.stack([x1 * cos - x2 * sin, x1 * sin + x2 * cos], -1).flatten(-2)

    class Attn(nn.Module):
        def __init__(s):
            super().__init__(); d = C['dim']; s.hd = d // C['n_heads']
            s.q = nn.Linear(d, d, bias=False); s.k = nn.Linear(d, s.hd * C['n_kv_heads'], bias=False)
            s.v = nn.Linear(d, s.hd * C['n_kv_heads'], bias=False); s.o = nn.Linear(d, d, bias=False)
        def forward(s, x):
            B, T, _ = x.shape; H, KV = C['n_heads'], C['n_kv_heads']; pos = torch.arange(T)
            q = rope(s.q(x).view(B, T, H, s.hd).transpose(1, 2), pos)
            k = rope(s.k(x).view(B, T, KV, s.hd).transpose(1, 2), pos)
            v = s.v(x).view(B, T, KV, s.hd).transpose(1, 2)
            k = k.repeat_interleave(H // KV, 1); v = v.repeat_interleave(H // KV, 1)
            y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
            return s.o(y.transpose(1, 2).reshape(B, T, -1))

    class MoE(nn.Module):
        """y = sum_i Softmax(Top2(x . W_g))_i * SwiGLU_i(x)   (paper, Section 2.1)"""
        def __init__(s):
            super().__init__(); d, h, n = C['dim'], C['hidden'], C['n_experts']
            s.gate = nn.Linear(d, n, bias=False)
            s.w1 = nn.Parameter(torch.randn(n, d, h) * d ** -0.5)   # gate projection
            s.w3 = nn.Parameter(torch.randn(n, d, h) * d ** -0.5)   # up projection
            s.w2 = nn.Parameter(torch.randn(n, h, d) * h ** -0.5)   # down projection
        def forward(s, x):
            B, T, d = x.shape; xf = x.reshape(-1, d)
            logits = s.gate(xf)                                    # (N, 8)
            top, idx = logits.topk(C['top_k'], -1)                 # Top2
            w = F.softmax(top, -1)                                 # softmax over the kept two only
            y = torch.zeros_like(xf)
            for e in range(C['n_experts']):
                tok, slot = (idx == e).nonzero(as_tuple=True)
                if tok.numel() == 0: continue
                xe = xf[tok]
                he = F.silu(xe @ s.w1[e]) * (xe @ s.w3[e])
                y.index_add_(0, tok, (he @ s.w2[e]) * w[tok, slot, None])
            s.last = (logits, idx, w)
            return y.view(B, T, d)

    class Block(nn.Module):
        def __init__(s):
            super().__init__(); s.n1 = RMSNorm(C['dim']); s.a = Attn(); s.n2 = RMSNorm(C['dim']); s.m = MoE()
        def forward(s, x):
            x = x + s.a(s.n1(x)); return x + s.m(s.n2(x))

    class LM(nn.Module):
        def __init__(s):
            super().__init__()
            s.emb = nn.Embedding(C['vocab'], C['dim']); s.blocks = nn.ModuleList(Block() for _ in range(C['n_layers']))
            s.norm = RMSNorm(C['dim']); s.head = nn.Linear(C['dim'], C['vocab'], bias=False)
            nn.init.normal_(s.emb.weight, std=0.02)
        def forward(s, ids):
            x = s.emb(ids)
            for b in s.blocks: x = b(x)
            return s.head(s.norm(x))
        def routes(s):
            return [b.m.last for b in s.blocks]
    return LM()


def aux_loss(model):
    """Switch-style load-balancing loss as in Hugging Face's Mixtral (load_balancing_loss_func):
    n * sum_i f_i * P_i with f_i the share of top-k slots given to expert i and P_i its mean router
    probability (softmax over all n logits), averaged over layers."""
    import torch, torch.nn.functional as F
    n = CFG['n_experts']; tot = 0
    for logits, idx, _ in model.routes():
        p = F.softmax(logits, -1)
        f = F.one_hot(idx, n).float().mean((0, 1))          # share of slots per expert
        tot = tot + n * (f * p.mean(0)).sum()
    return tot / CFG['n_layers']


def batches(ids, R, split='train'):
    import torch
    C = CFG; per = C['batch'] // len(DOMAINS)
    xs = []
    for d in DOMAINS:
        t = ids[(d, split)]
        for _ in range(per):
            i = R.randrange(0, len(t) - C['ctx'] - 1); xs.append(t[i:i + C['ctx'] + 1])
    x = torch.stack(xs); return x[:, :-1], x[:, 1:]


def evaluate(model, ids, n=8):
    import torch, torch.nn.functional as F
    R = random.Random(123); out = {}
    model.eval()
    with torch.no_grad():
        for d in DOMAINS:
            t = ids[(d, 'test')]; L = 0
            for k in range(n):
                i = (k * 7919 * 31) % (len(t) - CFG['ctx'] - 1)
                x = t[i:i + CFG['ctx'] + 1][None]
                L += F.cross_entropy(model(x[:, :-1]).flatten(0, 1), x[:, 1:].flatten()).item()
            out[d] = round(L / n, 4)
    model.train(); return out


def train(variant):
    import torch, torch.nn.functional as F
    torch.set_num_threads(2); torch.manual_seed(CFG['seed']); R = random.Random(CFG['seed'])
    coef = {'main': 0.02, 'noaux': 0.0}[variant]
    ids = encode_all(); model = build_model()
    os.makedirs(CK, exist_ok=True)
    nparam = sum(p.numel() for p in model.parameters())
    opt = torch.optim.AdamW(model.parameters(), lr=CFG['lr'], betas=(0.9, 0.95), weight_decay=CFG['wd'])
    log = open(os.path.join(HERE, 'model', 'train_%s.log' % variant), 'w')
    def P(*a):
        s = ' '.join(str(x) for x in a); print(s); log.write(s + '\n'); log.flush()
    P('variant', variant, 'aux_coef', coef, 'params', nparam, json.dumps(CFG))
    t0 = time.time(); S = CFG['steps']
    for step in range(1, S + 1):
        lr = CFG['lr'] * min(1, step / CFG['warmup']) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * step / S)))
        for g in opt.param_groups: g['lr'] = lr
        x, y = batches(ids, R)
        ce = F.cross_entropy(model(x).flatten(0, 1), y.flatten())
        al = aux_loss(model)
        loss = ce + coef * al
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); opt.step()
        if step % 25 == 0 or step == 1:
            load = [round(float(v), 3) for v in torch.bincount(model.routes()[-1][1].flatten(), minlength=8).float() / model.routes()[-1][1].numel()]
            P('step', step, 'ce', round(ce.item(), 4), 'aux', round(al.item(), 4), 'lr', round(lr, 6), 'load_last', load, 'sec', round(time.time() - t0))
        if step % 300 == 0 or step == S:
            P('eval', step, json.dumps(evaluate(model, ids)))
            torch.save({'cfg': CFG, 'variant': variant, 'step': step, 'state': model.state_dict()}, os.path.join(CK, variant + '.pt'))
    P('done', round(time.time() - t0), 'sec')


if __name__ == '__main__':
    a = sys.argv[1]
    if a == 'tok': train_tokenizer()
    else: train(a)
