"""After stage_a.py: per-text noise of the 200-text evaluator, and the data for the page's token replay.

1. Bits for every predicted token under: uniform, unigram anchor u, the factorized bigram (1 and 28 contexts,
   rank 671, T = 1 and the paper's temperatures), the unfactorized 28-context table, and GPT-2 with full context.
   Bootstrap over the 200 texts (2,000 resamples, seed 0) gives the standard error of a 200-text bpb and the
   paired standard error of the difference between two models scored on the same texts.
2. A replay passage: the first 40 tokens of text 0, with each model's bits per token and top-3 predictions,
   and the factorized model's bits at every rank of the page's slider.
usage:  OMP_NUM_THREADS=3 uv run --with torch --with transformers python stage_a_demo.py
Writes model/noise.json and model/demo.json."""
import json, math, os
import numpy as np
import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

torch.set_num_threads(int(os.environ.get('OMP_NUM_THREADS', '3')))
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.environ.get('AGORA_DATA', os.path.expanduser('~/.cache/agora_toy'))
V = 50257
T_B, T_U = 0.9314, 1.00459
RANKS = [1, 4, 16, 64, 256, 671]
tok = GPT2TokenizerFast.from_pretrained('openai-community/gpt2')
model = GPT2LMHeadModel.from_pretrained('openai-community/gpt2').eval()
texts = json.load(open(os.path.join(D, 'eval_texts.json')))
sample = json.load(open(os.path.join(HERE, 'inputs', 'eval_sample.json')))

# chunks exactly as stage_a.py, remembering which text each predicted token belongs to
chunks, owner = [], []
for i, t in enumerate(texts):
    ids = tok.encode(t)
    for a in range(0, len(ids), 512):
        c = ids[a:a + 512]
        if len(c) >= 2: chunks.append(c); owner.append(i)
prev = np.concatenate([np.array(c[:-1]) for c in chunks]); nxt = np.concatenate([np.array(c[1:]) for c in chunks])
tid = np.concatenate([np.full(len(c) - 1, owner[k]) for k, c in enumerate(chunks)])
tbytes = np.array([len(t.encode('utf-8')) for t in texts], float)

z = {n: np.load(os.path.join(D, 'M_%s.done.npz' % n)) for n in ('c1', 'c28')}
svd = {n: np.load(os.path.join(D, 'svd_%s.npz' % n)) for n in ('c1', 'c28')}
M28 = np.load(os.path.join(D, 'M_c28.f32.npy'), mmap_mode='r')


def fact_logits(n, vs, k, tb, tu):
    u = z[n]['u']; U, S, Vt = svd[n]['U'], svd[n]['S'], svd[n]['Vt']
    return u[None, :] / tu + ((U[vs, :k] * S[:k]) @ Vt[:k]) / tb


def bits_rows(fn, B=1024):
    uniq, inv = np.unique(prev, return_inverse=True); bits = np.zeros(len(prev))
    for a in range(0, len(uniq), B):
        L = torch.log_softmax(torch.from_numpy(fn(uniq[a:a + B])).double(), -1).numpy()
        sel = np.where((inv >= a) & (inv < a + B))[0]
        bits[sel] = -L[inv[sel] - a, nxt[sel]] / math.log(2)
    return bits


@torch.no_grad()
def bits_gpt2():
    out = []
    for c in chunks:
        ids = torch.tensor([c]); lg = model(input_ids=ids).logits[0, :-1].double()
        out.append((-torch.log_softmax(lg, -1).gather(1, ids[0, 1:, None])[:, 0] / math.log(2)).numpy())
    return np.concatenate(out)


models = {
    'uniform': np.full(len(prev), math.log2(V)),
    'unigram_c28': bits_rows(lambda vs: np.tile(z['c28']['u'], (len(vs), 1))),
    'c1_r671_T1': bits_rows(lambda vs: fact_logits('c1', vs, 671, 1, 1)),
    'c28_r256_T1': bits_rows(lambda vs: fact_logits('c28', vs, 256, 1, 1)),
    'c28_r671_T1': bits_rows(lambda vs: fact_logits('c28', vs, 671, 1, 1)),
    'c28_r671_Tpaper': bits_rows(lambda vs: fact_logits('c28', vs, 671, T_B, T_U)),
    'c28_full': bits_rows(lambda vs: np.ascontiguousarray(M28[vs])),
    'gpt2': bits_gpt2(),
}
per_text = {k: np.bincount(tid, weights=b, minlength=200) for k, b in models.items()}
rng = np.random.default_rng(0)
idx = rng.integers(0, 200, size=(2000, 200))
def bpb(k, I): return per_text[k][I].sum(-1) / tbytes[I].sum(-1)
noise = {'resamples': 2000, 'texts': 200, 'bpb': {}, 'se': {}, 'pairs': {}}
for k in models:
    noise['bpb'][k] = float(per_text[k].sum() / tbytes.sum()); noise['se'][k] = float(bpb(k, idx).std())
for a, b in (('c28_r671_T1', 'c28_r256_T1'), ('c28_r671_Tpaper', 'c28_r671_T1'), ('c28_r671_T1', 'c1_r671_T1'),
             ('c28_full', 'c28_r671_T1'), ('unigram_c28', 'uniform'), ('c28_r671_T1', 'unigram_c28')):
    d = bpb(a, idx) - bpb(b, idx)
    noise['pairs'][a + ' - ' + b] = {'diff': noise['bpb'][a] - noise['bpb'][b], 'se': float(d.std())}
# split the 200 texts in two halves (100 each): how much does the bpb of one model move between halves?
h1, h2 = np.arange(100), np.arange(100, 200)
noise['halves'] = {k: [float(per_text[k][h].sum() / tbytes[h].sum()) for h in (h1, h2)] for k in models}
json.dump(noise, open(os.path.join(HERE, 'model', 'noise.json'), 'w'), indent=1)
print(json.dumps(noise, indent=1)[:3000])

# replay passage: first 40 tokens of text 0
ids = tok.encode(texts[0])[:41]
P, X = np.array(ids[:-1]), np.array(ids[1:])
import codecs
def _bytes_to_unicode():                                # GPT-2's byte-level alphabet (as in its tokenizer)
    bs = list(range(ord('!'), ord('~') + 1)) + list(range(ord('\u00a1'), ord('\u00ac') + 1)) + list(range(ord('\u00ae'), ord('\u00ff') + 1))
    cs = bs[:]; n = 0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256 + n); n += 1
    return dict(zip(bs, [chr(c) for c in cs]))
bdec = {v: k for k, v in _bytes_to_unicode().items()}
tbytes_of = lambda t: bytes(bdec[c] for c in tok.convert_ids_to_tokens(int(t)))
nb = [len(tbytes_of(t)) for t in ids]                 # exact bytes per token (a character can span two tokens)
dec = codecs.getincrementaldecoder('utf-8')()
shown = [dec.decode(tbytes_of(t)) or '·' for t in ids]   # a token holding only part of a character shows as a dot
show1 = lambda t: tbytes_of(t).decode('utf-8', errors='replace').replace('�', '·')


def top3(L):
    o = np.argsort(-L)[:3]; p = np.exp(L[o])
    return [[show1(i), round(float(q), 3)] for i, q in zip(o, p)]


def rowwise(fn):
    L = torch.log_softmax(torch.from_numpy(fn(P)).double(), -1).numpy()
    return [round(float(-L[i, X[i]] / math.log(2)), 3) for i in range(len(P))], [top3(L[i]) for i in range(len(P))]


demo = {'source': {'dataset': 'HuggingFaceFW/fineweb-edu sample-10BT, train row 0', 'id': sample['ids'][0],
                   'url': 'https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu', 'note': 'tokens holding only part of a UTF-8 character are shown as a dot; the character appears on the token that completes it'},
        'tokens': shown, 'bytes': nb, 'models': {}, 'rank_bits': {}}
demo['models']['uniform'] = {'bits': [round(math.log2(V), 3)] * len(P), 'top': [[] for _ in P]}
b, t = rowwise(lambda vs: np.tile(z['c28']['u'], (len(vs), 1))); demo['models']['unigram'] = {'bits': b, 'top': t}
b, t = rowwise(lambda vs: fact_logits('c28', vs, 671, T_B, T_U)); demo['models']['stage_a'] = {'bits': b, 'top': t}
with torch.no_grad():
    L = torch.log_softmax(model(input_ids=torch.tensor([ids])).logits[0, :-1].double(), -1).numpy()
demo['models']['gpt2'] = {'bits': [round(float(-L[i, X[i]] / math.log(2)), 3) for i in range(len(P))], 'top': [top3(L[i]) for i in range(len(P))]}
for k in RANKS:
    demo['rank_bits'][str(k)] = rowwise(lambda vs: fact_logits('c28', vs, k, T_B, T_U))[0]
demo['rank_bits']['full'] = rowwise(lambda vs: np.ascontiguousarray(M28[vs]))[0]
json.dump(demo, open(os.path.join(HERE, 'model', 'demo.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('demo tokens', len(P), 'passage bpb', {k: sum(v['bits']) / sum(nb[1:]) for k, v in demo['models'].items()})
