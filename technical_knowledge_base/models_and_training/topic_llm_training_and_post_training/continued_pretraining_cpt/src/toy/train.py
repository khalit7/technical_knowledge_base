# Toy continued pretraining, at character level, on CPU.
# Question it answers at toy scale: when a finished base model is continually pretrained on a new
# domain, how much general ability does it lose, and how do replay and the re-warmed learning-rate
# peak change that? (Ibrahim et al. 2024 study the same two levers on 405M and 10B models, with
# English Pile -> German Common Crawl as their "strong shift".)
#
# Domains: "general" = six English Project Gutenberg books (the pretraining corpus of the sibling
# Pretraining page's toy); "domain" = six German Gutenberg books (umlauts written ae, oe, ue, ss so the
# character vocabulary is shared: no tokenizer extension needed).
# 1. Pretrain on English only: warmup, then cosine from PEAK to 10% of PEAK (a finished base model).
# 2. From that base (fresh AdamW state, as with a released checkpoint), nine CPT runs of equal length:
#    re-warmed peak in {1x, 0.33x, 0.1x} of the pretraining peak, crossed with replay of English in
#    {0%, 5%, 25%} of sequences. Each: linear warmup over 1% of steps, cosine to 10% of its own peak.
# 3. A reference: the same model trained from scratch on the union (English + German, the same total
#    number of steps, German share equal to the CPT runs' German share with no replay).
# Every CPT run sees the same data order for its domain part (same RNG state).
#
# Run:  OMP_NUM_THREADS=2 uv run --with torch python train.py   (writes runs/seed<k>.json)
import copy, json, math, os, random, re, time
import torch, torch.nn as nn, torch.nn.functional as F

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
SEEDS = [int(s) for s in os.environ.get('SEEDS', '1,2,3').split(',')]

CTX = 96; BATCH = 32; D = 128; LAYERS = 4; HEADS = 4
PEAK_LR = 3e-3; WARMUP = 150; FLOOR = 0.1
PT_STEPS = int(os.environ.get('PT_STEPS', 5000)); CPT_STEPS = int(os.environ.get('CPT_STEPS', 1500))
PEAKS = [1.0, 0.33, 0.1]; REPLAYS = [0.0, 0.05, 0.25]
PT_EVAL = 250; CPT_EVAL = 50

EN = ['pg1342.txt', 'pg11.txt', 'pg1661.txt', 'pg84.txt', 'pg98.txt', 'pg2701.txt']
DE = ['pg2229.txt', 'pg22367.txt', 'pg5323.txt', 'pg2403.txt', 'pg69327.txt', 'pg34811.txt']
ALLOWED = "abcdefghijklmnopqrstuvwxyz .,;:!?'\"-()\n"
def clean(t):
    s = t.find('*** START'); e = t.find('*** END')
    t = t[t.find('\n', s) + 1:e] if s >= 0 and e > s else t
    t = t.lower().replace('\r', '').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    t = t.replace('„', '"').replace('“', '"').replace('»', '"').replace('«', '"').replace('—', '-').replace('–', '-').replace('_', '')
    for a, b in (('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss'), ('é', 'e'), ('è', 'e'), ('à', 'a')):
        t = t.replace(a, b)
    t = re.sub(r'[0-9]', '', t)
    t = ''.join(c for c in t if c in ALLOWED)
    t = re.sub(r'\n{3,}', '\n\n', t); t = re.sub(r' {2,}', ' ', t)
    return t
VOCAB = sorted(set(ALLOWED)); stoi = {c: i for i, c in enumerate(VOCAB)}; V = len(VOCAB)
enc = lambda s: [stoi[c] for c in s]
def load(names, sub):
    texts = [clean(open(os.path.join(HERE, 'corpus', sub, b), encoding='utf-8', errors='ignore').read()) for b in names]
    tr = ''.join(t[:int(len(t) * 0.95)] for t in texts); he = ''.join(t[int(len(t) * 0.95):] for t in texts)
    return torch.tensor(enc(tr)), torch.tensor(enc(he)), texts
en_tr, en_he, en_texts = load(EN, 'en')
de_tr, de_he, de_texts = load(DE, 'de')

def batch(rng, p_de):
    xs = []
    for _ in range(BATCH):
        src = de_tr if rng.random() < p_de else en_tr
        i = rng.randrange(0, len(src) - CTX - 1); xs.append(src[i:i + CTX + 1])
    xs = torch.stack(xs); return xs[:, :-1], xs[:, 1:]

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

LN2 = math.log(2)
er = random.Random(123)
EV_EN = torch.stack([en_he[i:i + CTX + 1] for i in [er.randrange(0, len(en_he) - CTX - 1) for _ in range(128)]])
EV_DE = torch.stack([de_he[i:i + CTX + 1] for i in [er.randrange(0, len(de_he) - CTX - 1) for _ in range(128)]])

@torch.no_grad()
def evaluate(m):
    m.eval(); out = {}
    for k, X in (('en', EV_EN), ('de', EV_DE)):
        out[k] = round(F.cross_entropy(m(X[:, :-1]).reshape(-1, V), X[:, 1:].reshape(-1)).item() / LN2, 4)
    m.train(); return out

@torch.no_grad()
def sample(m, seed, prompt, n=90, temp=0.7):
    m.eval(); g = torch.Generator().manual_seed(seed); x = torch.tensor(enc(prompt))[None]
    for _ in range(n):
        p = F.softmax(m(x[:, -CTX:])[0, -1] / temp, -1)
        x = torch.cat([x, torch.multinomial(p, 1, generator=g)[None]], 1)
    m.train(); return ''.join(VOCAB[i] for i in x[0].tolist())

def cos_lr(step, total, peak, warm):
    if step < warm: return peak * (step + 1) / warm
    p = (step - warm) / max(1, total - warm)
    return peak * (FLOOR + (1 - FLOOR) * 0.5 * (1 + math.cos(math.pi * p)))

def train(m, opt, rng, steps, peak, warm, p_de, every, tag, step0=0):
    lst = [dict(evaluate(m), step=step0, lr=0.0)]; ema = None
    for step in range(steps):
        lr = cos_lr(step, steps, peak, warm)
        for g in opt.param_groups: g['lr'] = lr
        x, y = batch(rng, p_de)
        loss = F.cross_entropy(m(x).reshape(-1, V), y.reshape(-1))
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        ema = loss.item() if ema is None else 0.95 * ema + 0.05 * loss.item()
        if (step + 1) % every == 0:
            e = evaluate(m); e.update(step=step0 + step + 1, lr=lr, train=round(ema / LN2, 4)); lst.append(e)
            print(tag, step + 1, f"{time.time() - T0:.0f}s", e, flush=True)
    return lst

PROMPTS = {'en': 'it was a ', 'de': 'es war ein '}
def run(seed):
    global T0; T0 = t0 = time.time(); torch.manual_seed(seed); rng = random.Random(seed)
    m = GPT(); nparam = sum(p.numel() for p in m.parameters())
    opt = torch.optim.AdamW(m.parameters(), lr=PEAK_LR, betas=(0.9, 0.95), weight_decay=0.1)
    log = {'seed': seed, 'params': nparam, 'cpt': {}, 'samples': {}}
    log['pt'] = train(m, opt, rng, PT_STEPS, PEAK_LR, WARMUP, 0.0, PT_EVAL, f's{seed} pt', 0)
    log['samples']['base'] = {k: sample(m, seed, p) for k, p in PROMPTS.items()}
    base = copy.deepcopy(m.state_dict()); rs = rng.getstate()
    for pk in PEAKS:
        for rp in REPLAYS:
            name = f"p{pk}_r{rp}"
            m.load_state_dict(base); rng.setstate(rs)
            opt = torch.optim.AdamW(m.parameters(), lr=PEAK_LR * pk, betas=(0.9, 0.95), weight_decay=0.1)
            log['cpt'][name] = train(m, opt, rng, CPT_STEPS, PEAK_LR * pk, max(1, CPT_STEPS // 100), 1.0 - rp, CPT_EVAL, f's{seed} {name}', PT_STEPS)
            log['samples'][name] = {k: sample(m, seed, p) for k, p in PROMPTS.items()}
    # reference: from scratch on the union, same total steps, same German share as CPT with no replay
    torch.manual_seed(seed + 100); rng = random.Random(seed + 100); m = GPT()
    opt = torch.optim.AdamW(m.parameters(), lr=PEAK_LR, betas=(0.9, 0.95), weight_decay=0.1)
    tot = PT_STEPS + CPT_STEPS
    log['union'] = train(m, opt, rng, tot, PEAK_LR, WARMUP, CPT_STEPS / tot, PT_EVAL, f's{seed} union', 0)
    log['samples']['union'] = {k: sample(m, seed, p) for k, p in PROMPTS.items()}
    log['seconds'] = round(time.time() - t0)
    return log

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'runs'), exist_ok=True)
    meta = {'vocab': ''.join(VOCAB), 'ctx': CTX, 'batch': BATCH, 'd': D, 'layers': LAYERS, 'heads': HEADS,
            'peak_lr': PEAK_LR, 'warmup': WARMUP, 'floor': FLOOR, 'pt_steps': PT_STEPS, 'cpt_steps': CPT_STEPS,
            'peaks': PEAKS, 'replays': REPLAYS, 'en_books': EN, 'de_books': DE,
            'en_train_chars': len(en_tr), 'de_train_chars': len(de_tr), 'en_held_chars': len(en_he), 'de_held_chars': len(de_he),
            'eval_seqs': 128}
    json.dump(meta, open(os.path.join(HERE, 'runs', 'meta.json'), 'w'), indent=1)
    for s in SEEDS:
        json.dump(run(s), open(os.path.join(HERE, 'runs', f'seed{s}.json'), 'w'))
