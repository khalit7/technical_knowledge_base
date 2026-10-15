"""Model collapse with a real (tiny) language model on real text: a word bigram model, refit on its own samples.
It mirrors the two settings of Shumailov et al. (Nature 2024) and the accumulate workflow of Gerstgrasser et al. (2024):
  replace     each generation trains only on text sampled from the previous generation's model
  keep10      each generation trains on 90% sampled text plus a fresh random 10% of the original training text
  accumulate  each generation trains on the original text plus all sampled text so far
Measured per generation: vocabulary and distinct bigrams in the training data, perplexity of held-out REAL text
(the generation's bigram interpolated with a smoothed unigram, so unseen words stay finite), and the perplexity of the
generation's own sampled sentences under the generation-0 model (Shumailov's histogram). Pure Python, CPU, seconds.
usage: python3 -I collapse_bigram.py <text.jsonl|parquet> <text column> <out.json> [train_tokens] [generations]
"""
import json, math, random, re, sys
from collections import Counter, defaultdict

src, col, out = sys.argv[1], sys.argv[2], sys.argv[3]
NTRAIN = int(sys.argv[4]) if len(sys.argv) > 4 else 200000
G = int(sys.argv[5]) if len(sys.argv) > 5 else 10
TOK = re.compile(r"[a-z]+(?:'[a-z]+)?|[0-9]+|[.,!?;:]")

def texts():
    if src.endswith('.parquet'):
        import pyarrow.parquet as pq
        return [t for t in pq.read_table(src, columns=[col]).column(col).to_pylist() if t]
    return [json.loads(l)[col] for l in open(src)]

def sentences(docs):
    out = []
    for d in docs:
        for s in re.split(r'(?<=[.!?])\s+', d.replace('\n', ' ')):
            w = TOK.findall(s.lower())
            if 3 <= len(w) <= 60: out.append(w)
    return out

sents = sentences(texts())
rng0 = random.Random(0); rng0.shuffle(sents)
def take(ss, n):
    o, c = [], 0
    for s in ss:
        if c >= n: break
        o.append(s); c += len(s)
    return o
train = take(sents, NTRAIN); rest = sents[len(train):]
test = take(rest, NTRAIN // 10)

class Bigram:
    def __init__(self, ss):
        self.big = defaultdict(Counter); self.uni = Counter()
        for s in ss:
            w = ['<s>'] + s + ['</s>']
            for a, b in zip(w, w[1:]): self.big[a][b] += 1
            self.uni.update(s + ['</s>'])
        self.tab = {a: (list(c.keys()), list(_cum(c.values()))) for a, c in self.big.items()}
    def sample(self, rnd, n_tokens):
        o, c = [], 0
        while c < n_tokens:
            a, s = '<s>', []
            while len(s) < 80:
                ks, cw = self.tab[a]; u = rnd.random() * cw[-1]
                lo, hi = 0, len(cw) - 1
                while lo < hi:
                    m = (lo + hi) >> 1
                    if cw[m] > u: hi = m
                    else: lo = m + 1
                b = ks[lo]
                if b == '</s>': break
                s.append(b); a = b
            if s: o.append(s); c += len(s)
        return o

def _cum(v):
    t = 0
    for x in v: t += x; yield t

def ppl(model, ss, V, lam=0.9, k=0.1):
    """interpolated bigram/add-k unigram over a fixed vocabulary of V types (+1 unknown); per-token perplexity."""
    N = sum(model.uni.values()); lp = 0.0; n = 0
    for s in ss:
        w = ['<s>'] + s + ['</s>']
        for a, b in zip(w, w[1:]):
            pu = (model.uni.get(b, 0) + k) / (N + k * (V + 1))
            c = model.big.get(a); pb = (c[b] / sum(c.values())) if c and b in c else 0.0
            lp += math.log(lam * pb + (1 - lam) * pu); n += 1
    return math.exp(-lp / n)

def _hist(v, lo=1.0, hi=10000.0, nb=32):
    """counts in nb log-spaced bins between lo and hi (values outside are clipped into the end bins)"""
    h = [0] * nb; r = math.log(hi / lo)
    for x in v: h[min(nb - 1, max(0, int(math.log(max(x, lo) / lo) / r * nb)))] += 1
    return h

def sent_ppl(model0, s, V):
    return ppl(model0, [s], V)

V = len(set(w for s in train + test for w in s))
m0 = Bigram(train)
res = {'params': dict(source=src.rsplit('/', 1)[-1], train_tokens=sum(map(len, train)), test_tokens=sum(map(len, test)),
                      generations=G, vocab_fixed=V, interp_lambda=0.9, add_k=0.1, seed=1), 'modes': {}}
for mode in ('replace', 'keep10', 'accumulate'):
    rnd = random.Random(1); data = train; model = m0; pool = list(train); rows = []
    for g in range(G + 1):
        gen = model.sample(rnd, NTRAIN)
        sp = sorted(sent_ppl(m0, s, V) for s in gen[:600])
        rows.append(dict(g=g, vocab=len(set(w for s in data for w in s)),
                         bigrams=sum(len(c) for c in Bigram(data).big.values()) if g else sum(len(c) for c in m0.big.values()),
                         test_ppl=round(ppl(model, test, V), 2),
                         gen_ppl_q=[round(sp[int(q * (len(sp) - 1))], 2) for q in (0.05, 0.25, 0.5, 0.75, 0.95)],
                         gen_ppl_hist=_hist(sp),
                         examples=[' '.join(s) for s in gen[:3]]))
        if g == G: break
        if mode == 'replace': data = gen
        elif mode == 'keep10':
            k = rnd.sample(train, len(train) // 10)
            data = take(gen, int(NTRAIN * 0.9)) + k
        else:
            pool = pool + gen; data = pool
        model = Bigram(data)
    res['modes'][mode] = rows
    print(mode, [(r['g'], r['vocab'], r['test_ppl'], r['gen_ppl_q'][2]) for r in rows], flush=True)
json.dump(res, open(out, 'w'), indent=0)
