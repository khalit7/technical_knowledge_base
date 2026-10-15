"""Pending GPU run: Gerstgrasser et al.'s TinyStories experiment at toy scale, replace against accumulate.
A small word-level GPT (2 layers, d=256, 8k-word vocabulary, 3.66M parameters with the tied embedding) is trained from scratch for one
epoch on 2M real TinyStories tokens; each iteration samples a fresh corpus of the same size at temperature 1.0 and
trains a NEW model on either that corpus only (replace) or on everything so far, real included (accumulate).
Measured: cross-entropy on held-out real TinyStories after each iteration (their Table 2's quantity).
usage: python -I collapse_gpt.py <tinystories.parquet> <out.json> [iterations=5] [device=mps] [train_tokens=2000000] [max_steps=0]
max_steps > 0 is the CPU smoke test (stops each training after that many steps).
"""
import sys, json, math, re, random, time
from collections import Counter
import torch, torch.nn as nn, torch.nn.functional as F
import pyarrow.parquet as pq

src, out = sys.argv[1], sys.argv[2]
IT = int(sys.argv[3]) if len(sys.argv) > 3 else 5; dev = sys.argv[4] if len(sys.argv) > 4 else 'mps'
NTOK = int(sys.argv[5]) if len(sys.argv) > 5 else 2_000_000; MAXS = int(sys.argv[6]) if len(sys.argv) > 6 else 0
torch.manual_seed(0); random.seed(0); torch.set_num_threads(4)
TOK = re.compile(r"[a-z]+(?:'[a-z]+)?|[0-9]+|[.,!?;:\"]")
stories = [TOK.findall(t.lower()) for t in pq.read_table(src, columns=['text']).column('text').to_pylist() if t]
random.Random(0).shuffle(stories)
cnt = Counter(w for s in stories for w in s); itos = ['<pad>', '<unk>', '<eos>'] + [w for w, _ in cnt.most_common(8000 - 3)]
stoi = {w: i for i, w in enumerate(itos)}; V = len(itos)
enc = lambda s: [stoi.get(w, 1) for w in s] + [2]
def take(ss, n):
    o, c = [], 0
    for s in ss:
        if c >= n: break
        e = enc(s); o.append(e); c += len(e)
    return o
real = take(stories, NTOK); test = take(stories[len(real):], NTOK // 20)
CTX = 128

class GPT(nn.Module):
    def __init__(s, d=256, L=2, H=4):
        super().__init__(); s.emb = nn.Embedding(V, d); s.pos = nn.Embedding(CTX, d)
        s.blocks = nn.ModuleList([nn.TransformerEncoderLayer(d, H, 4 * d, 0.0, batch_first=True, norm_first=True) for _ in range(L)])
        s.ln = nn.LayerNorm(d); s.head = nn.Linear(d, V, bias=False); s.head.weight = s.emb.weight; nn.init.normal_(s.emb.weight, std=0.02)
    def forward(s, x):
        T = x.shape[1]; m = torch.triu(torch.full((T, T), float('-inf'), device=x.device), 1)
        h = s.emb(x) + s.pos(torch.arange(T, device=x.device))
        for b in s.blocks: h = b(h, src_mask=m, is_causal=True)
        return s.head(s.ln(h))

def batches(docs, bs=32):
    flat = [t for d in docs for t in d]; n = (len(flat) - 1) // CTX
    idx = list(range(n)); random.shuffle(idx)
    for i in range(0, n - bs + 1, bs):
        rows = [flat[j * CTX:(j + 1) * CTX + 1] for j in idx[i:i + bs]]
        t = torch.tensor(rows, device=dev); yield t[:, :-1], t[:, 1:]

def train(docs):
    m = GPT().to(dev); opt = torch.optim.AdamW(m.parameters(), 1e-3, weight_decay=0.1); step = 0
    for x, y in batches(docs):
        loss = F.cross_entropy(m(x).reshape(-1, V), y.reshape(-1)); opt.zero_grad(); loss.backward(); opt.step(); step += 1
        if MAXS and step >= MAXS: break
    return m

@torch.no_grad()
def evaluate(m):
    m.eval(); tot, n = 0.0, 0
    for x, y in batches(test, 16):
        tot += F.cross_entropy(m(x).reshape(-1, V), y.reshape(-1), reduction='sum').item(); n += y.numel()
    return tot / n

@torch.no_grad()
def sample(m, ntok, bs=64):
    m.eval(); docs, c = [], 0
    while c < ntok:
        x = torch.full((bs, 1), 2, device=dev); seqs = [[] for _ in range(bs)]; alive = [True] * bs
        for _ in range(CTX - 1):
            p = F.softmax(m(x[:, -CTX:])[:, -1], -1); nx = torch.multinomial(p, 1); x = torch.cat([x, nx], 1)
            for i, t in enumerate(nx.squeeze(1).tolist()):
                if alive[i]:
                    if t == 2: alive[i] = False
                    else: seqs[i].append(t)
            if not any(alive): break
        for s in seqs:
            if s: docs.append(s + [2]); c += len(s) + 1
    return docs

print("params", sum(p.numel() for p in GPT().parameters()), flush=True)
res = {'params': dict(vocab=V, ctx=CTX, d=256, layers=2, train_tokens=NTOK, iterations=IT, device=dev, max_steps=MAXS), 'replace': [], 'accumulate': []}
t0 = time.time(); m0 = train(real); ce0 = evaluate(m0); print('iter 1 (real)', ce0, round(time.time() - t0), flush=True)
for mode in ('replace', 'accumulate'):
    m, pool = m0, list(real); res[mode].append(dict(it=1, test_ce=round(ce0, 4)))
    for it in range(2, IT + 1):
        syn = sample(m, NTOK if not MAXS else 20000)
        data = syn if mode == 'replace' else (pool := pool + syn)
        m = train(data); ce = evaluate(m); res[mode].append(dict(it=it, test_ce=round(ce, 4)))
        print(mode, it, round(ce, 4), round(time.time() - t0), flush=True)
        json.dump(res, open(out, 'w'), indent=0)
json.dump(res, open(out, 'w'), indent=0)
