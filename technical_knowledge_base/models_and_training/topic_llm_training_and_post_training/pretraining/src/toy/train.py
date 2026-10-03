# Toy pretraining run with an anneal, at character level, on CPU.
# Question it answers at toy scale: of what an anneal buys, how much is the learning-rate decay
# and how much is the data switch? (The OLMo 2 paper's Table 11 separates the two for a 7B model.)
#
# Two domains: "web" (six public-domain books from Project Gutenberg, lower-cased) and "maths"
# (two-digit addition lines like "47+38=85"). Stage 1 trains on 3% maths sequences at constant LR
# after warmup (the stable phase of a WSD schedule). From the end of stage 1, four branches of equal
# length: LR held constant or decayed linearly to zero, crossed with the same mix or a maths-heavy mix
# (25% maths sequences). Every branch sees the same number of tokens.
#
# Run:  OMP_NUM_THREADS=2 uv run --with torch python train.py  (writes runs/seed<k>.json)
import json, math, os, random, re, sys, time
import torch, torch.nn as nn, torch.nn.functional as F

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
SEEDS = [int(s) for s in os.environ.get('SEEDS', '1,2,3').split(',')]

# ---------------- hyperparameters ----------------
CTX = 96; BATCH = 32; D = 128; LAYERS = 4; HEADS = 4
PEAK_LR = 3e-3; WARMUP = 150
STAGE1 = int(os.environ.get("STAGE1", 6000)); BRANCH = int(os.environ.get("BRANCH", 1200))
P_MATH_PT = 0.03; P_MATH_ANNEAL = 0.25
EVAL_EVERY = 100

# ---------------- data ----------------
BOOKS = ['pg1342.txt', 'pg11.txt', 'pg1661.txt', 'pg84.txt', 'pg98.txt', 'pg2701.txt']
ALLOWED = "abcdefghijklmnopqrstuvwxyz0123456789 .,;:!?'\"-()\n+="
def clean(t):
    s = t.find('*** START'); e = t.find('*** END')
    t = t[t.find('\n', s) + 1:e] if s >= 0 and e > s else t
    t = t.lower().replace('\r', '').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('—', '-').replace('_', '')
    t = re.sub(r'[0-9+=]', '', t)            # digits, + and = belong to the maths domain only
    t = ''.join(c for c in t if c in ALLOWED)
    t = re.sub(r'\n{3,}', '\n\n', t); t = re.sub(r' {2,}', ' ', t)
    return t
texts = [clean(open(os.path.join(HERE, 'corpus', b), encoding='utf-8', errors='ignore').read()) for b in BOOKS]
train_txt = ''.join(t[:int(len(t) * 0.95)] for t in texts)
held_txt = ''.join(t[int(len(t) * 0.95):] for t in texts)
VOCAB = sorted(set(ALLOWED)); stoi = {c: i for i, c in enumerate(VOCAB)}; V = len(VOCAB)
enc = lambda s: [stoi[c] for c in s]
train_ids = torch.tensor(enc(train_txt), dtype=torch.long)
held_ids = torch.tensor(enc(held_txt), dtype=torch.long)

# maths: all pairs 10..99; a fixed 20% of pairs held out (never trained on)
pairs = [(a, b) for a in range(10, 100) for b in range(10, 100)]
rng0 = random.Random(0); rng0.shuffle(pairs)
HELD_PAIRS = pairs[:len(pairs) // 5]; TRAIN_PAIRS = pairs[len(pairs) // 5:]
line = lambda a, b: f"{a}+{b}={a + b}\n"

def maths_seq(rng, n, pool):
    s = ''
    while len(s) < n + 1:
        s += line(*rng.choice(pool))
    off = rng.randrange(0, 9)
    s = s[off:] + line(*rng.choice(pool)) * 2
    return enc(s[:n + 1])

def batch(rng, p_math):
    xs = []
    for _ in range(BATCH):
        if rng.random() < p_math:
            xs.append(torch.tensor(maths_seq(rng, CTX, TRAIN_PAIRS)))
        else:
            i = rng.randrange(0, len(train_ids) - CTX - 1)
            xs.append(train_ids[i:i + CTX + 1])
    xs = torch.stack(xs)
    return xs[:, :-1], xs[:, 1:]

# ---------------- model: a small GPT (pre-norm, learned positions, GELU) ----------------
class Block(nn.Module):
    def __init__(s):
        super().__init__(); s.ln1 = nn.LayerNorm(D); s.att = nn.Linear(D, 3 * D); s.proj = nn.Linear(D, D)
        s.ln2 = nn.LayerNorm(D); s.fc = nn.Linear(D, 4 * D); s.fc2 = nn.Linear(4 * D, D)
    def forward(s, x):
        B, T, C = x.shape
        q, k, v = s.att(s.ln1(x)).split(D, 2)
        q, k, v = [t.view(B, T, HEADS, C // HEADS).transpose(1, 2) for t in (q, k, v)]
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True).transpose(1, 2).reshape(B, T, C)
        x = x + s.proj(y)
        return x + s.fc2(F.gelu(s.fc(s.ln2(x))))
class GPT(nn.Module):
    def __init__(s):
        super().__init__(); s.tok = nn.Embedding(V, D); s.pos = nn.Embedding(CTX, D)
        s.blocks = nn.ModuleList([Block() for _ in range(LAYERS)]); s.ln = nn.LayerNorm(D); s.head = nn.Linear(D, V, bias=False)
    def forward(s, idx):
        x = s.tok(idx) + s.pos(torch.arange(idx.shape[1]))
        for b in s.blocks: x = b(x)
        return s.head(s.ln(x))

# ---------------- evaluation ----------------
LN2 = math.log(2)
def cat_text(prev, c):
    if c.isalpha(): return 'start' if not prev.isalpha() else 'inside'
    return 'space'
# fixed evaluation sets (same for every run)
er = random.Random(123)
EV_TXT = [held_ids[i:i + CTX + 1] for i in [er.randrange(0, len(held_ids) - CTX - 1) for _ in range(96)]]
EV_MATH = [torch.tensor(maths_seq(er, CTX, HELD_PAIRS)) for _ in range(48)]
DISPLAY_TXT = None
def display_passage():
    # a fixed held-out passage (from the end of Pride and Prejudice) plus three held-out sums
    t = clean(open(os.path.join(HERE, 'corpus', 'pg1342.txt'), encoding='utf-8', errors='ignore').read())
    t = t[int(len(t) * 0.95):]
    i = t.find('elizabeth', 2000); seg = t[i:i + 70]
    seg = seg[:seg.rfind(' ')] + '\n'
    sums = ''.join(line(a, b) for a, b in HELD_PAIRS[:3])
    return seg + sums
DISPLAY = display_passage()[:CTX]

@torch.no_grad()
def evaluate(m):
    m.eval(); out = {}
    X = torch.stack(EV_TXT); logits = m(X[:, :-1]); lp = F.log_softmax(logits, -1)
    nll = -lp.gather(2, X[:, 1:].unsqueeze(-1)).squeeze(-1)  # nats
    acc = {'start': [], 'inside': [], 'space': []}
    for r in range(X.shape[0]):
        s = ''.join(VOCAB[i] for i in X[r].tolist())
        for t in range(1, len(s)):
            acc[cat_text(s[t - 1], s[t])].append(nll[r, t - 1].item())
    out['text'] = nll.mean().item() / LN2
    for k, v in acc.items(): out['t_' + k] = sum(v) / len(v) / LN2
    X = torch.stack(EV_MATH); logits = m(X[:, :-1]); lp = F.log_softmax(logits, -1)
    nll = -lp.gather(2, X[:, 1:].unsqueeze(-1)).squeeze(-1)
    acc = {'operand': [], 'answer': [], 'symbol': []}
    for r in range(X.shape[0]):
        s = ''.join(VOCAB[i] for i in X[r].tolist())
        seen_eq = False; first = True
        for t in range(1, len(s)):
            c, prev = s[t], s[t - 1]
            if prev == '\n': seen_eq = False; first = False
            if first: continue  # partial first line: role unknown
            if c == '=': seen_eq = True
            k = 'symbol' if c in '+=\n' else ('answer' if seen_eq else 'operand')
            acc[k].append(nll[r, t - 1].item())
    for k, v in acc.items(): out['m_' + k] = sum(v) / len(v) / LN2
    # greedy exact match on 300 held-out sums, with a few training lines as context
    ok = 0; probs = HELD_PAIRS[:300]
    ctxs = [''.join(line(*TRAIN_PAIRS[(7 * j + q) % len(TRAIN_PAIRS)]) for q in range(5)) + f"{a}+{b}=" for j, (a, b) in enumerate(probs)]
    gen = [''] * len(probs); cur = [torch.tensor(enc(c)) for c in ctxs]
    L = max(len(c) for c in cur)
    for step in range(4):
        X = torch.stack([F.pad(c, (L + step - len(c), 0), value=stoi['\n']) for c in cur])
        nxt = m(X[:, -CTX:])[:, -1].argmax(-1)
        cur = [torch.cat([c, nxt[i:i + 1]]) for i, c in enumerate(cur)]
        for i in range(len(probs)): gen[i] += VOCAB[nxt[i].item()]
    for (a, b), g in zip(probs, gen):
        if g.split('\n')[0] == str(a + b): ok += 1
    out['acc'] = ok / len(probs)
    m.train(); return out

@torch.no_grad()
def per_char(m):
    m.eval(); x = torch.tensor(enc(DISPLAY))
    lp = F.log_softmax(m(x[None, :-1])[0], -1)
    nll = (-lp.gather(1, x[1:, None]).squeeze(1) / LN2).tolist()
    m.train(); return [round(v, 2) for v in nll]

@torch.no_grad()
def sample(m, seed, prompt='it was ', n=120, temp=0.8):
    m.eval(); g = torch.Generator().manual_seed(seed); x = torch.tensor(enc(prompt))[None]
    for _ in range(n):
        p = F.softmax(m(x[:, -CTX:])[0, -1] / temp, -1)
        x = torch.cat([x, torch.multinomial(p, 1, generator=g)[None]], 1)
    m.train(); return ''.join(VOCAB[i] for i in x[0].tolist())

# ---------------- training ----------------
def lr_at(step, phase, decay):
    if phase == 'pt': return PEAK_LR * min(1.0, (step + 1) / WARMUP)
    return PEAK_LR * (1 - (step + 1) / BRANCH) if decay else PEAK_LR

def run(seed):
    torch.manual_seed(seed); rng = random.Random(seed)
    m = GPT(); opt = torch.optim.AdamW(m.parameters(), lr=PEAK_LR, betas=(0.9, 0.95), weight_decay=0.1)
    nparam = sum(p.numel() for p in m.parameters())
    log = {'seed': seed, 'params': nparam, 'pt': [], 'branches': {}, 'heat': {}, 'samples': {}}
    t0 = time.time()
    def rec(lst, step, lr, loss):
        e = evaluate(m); e.update(step=step, lr=lr, train=round(loss, 4)); lst.append(e)
        print(seed, step, f"{time.time() - t0:.0f}s", {k: round(v, 3) if isinstance(v, float) else v for k, v in e.items()}, flush=True)
    rec(log['pt'], 0, 0.0, float('nan')); log['heat']['0'] = per_char(m); log['samples']['0'] = sample(m, seed)
    ema = None
    for step in range(STAGE1):
        lr = lr_at(step, 'pt', False)
        for g in opt.param_groups: g['lr'] = lr
        x, y = batch(rng, P_MATH_PT)
        loss = F.cross_entropy(m(x).reshape(-1, V), y.reshape(-1))
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        ema = loss.item() if ema is None else 0.95 * ema + 0.05 * loss.item()
        if (step + 1) % EVAL_EVERY == 0:
            rec(log['pt'], step + 1, lr, ema / LN2)
        if (step + 1) in (STAGE1 // 10, STAGE1 // 3, STAGE1):
            log['heat'][str(step + 1)] = per_char(m); log['samples'][str(step + 1)] = sample(m, seed)
    base_m = {k: v.clone() for k, v in m.state_dict().items()}; base_o = opt.state_dict()
    import copy; base_o = copy.deepcopy(base_o); rng_state = rng.getstate()
    for name, decay, pm in [('const_same', False, P_MATH_PT), ('decay_same', True, P_MATH_PT),
                            ('const_maths', False, P_MATH_ANNEAL), ('decay_maths', True, P_MATH_ANNEAL)]:
        m.load_state_dict(base_m); opt.load_state_dict(copy.deepcopy(base_o)); rng.setstate(rng_state)
        lst = []; ema = None
        for step in range(BRANCH):
            lr = lr_at(step, 'br', decay)
            for g in opt.param_groups: g['lr'] = lr
            x, y = batch(rng, pm)
            loss = F.cross_entropy(m(x).reshape(-1, V), y.reshape(-1))
            opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
            ema = loss.item() if ema is None else 0.95 * ema + 0.05 * loss.item()
            if (step + 1) % EVAL_EVERY == 0 or step + 1 == BRANCH:
                rec(lst, STAGE1 + step + 1, lr, ema / LN2)
        log['branches'][name] = lst
        log['heat'][name] = per_char(m); log['samples'][name] = sample(m, seed)
    log['seconds'] = round(time.time() - t0)
    return log

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'runs'), exist_ok=True)
    meta = {'vocab': ''.join(VOCAB), 'ctx': CTX, 'batch': BATCH, 'd': D, 'layers': LAYERS, 'heads': HEADS,
            'peak_lr': PEAK_LR, 'warmup': WARMUP, 'stage1': STAGE1, 'branch': BRANCH,
            'p_math_pt': P_MATH_PT, 'p_math_anneal': P_MATH_ANNEAL, 'display': DISPLAY,
            'train_chars': len(train_ids), 'held_chars': len(held_ids), 'books': BOOKS,
            'held_pairs': len(HELD_PAIRS), 'train_pairs': len(TRAIN_PAIRS)}
    json.dump(meta, open(os.path.join(HERE, 'runs', 'meta.json'), 'w'), indent=1)
    for s in SEEDS:
        json.dump(run(s), open(os.path.join(HERE, 'runs', f'seed{s}.json'), 'w'))
