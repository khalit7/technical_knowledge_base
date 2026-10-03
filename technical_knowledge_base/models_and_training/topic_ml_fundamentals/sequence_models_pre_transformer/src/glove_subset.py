# Real GloVe vectors for the page: GloVe 6B, 50 dimensions (Wikipedia 2014 + Gigaword 5, 400,000 words;
# Pennington et al. 2014, https://nlp.stanford.edu/projects/glove/), read from the gensim-data mirror
# glove-wiki-gigaword-50 (https://github.com/RaRe-Technologies/gensim-data, the same file with a header line).
#
# 1. Analogy test (Mikolov et al. 2013's questions-words.txt, 19,544 questions) on the FULL vocabulary,
#    3CosAdd (argmax cos(b - a + c)), with and without excluding the three question words, and restricted
#    to the 30,000 most frequent words as word2vec's own evaluation does.
# 2. A subset of words shipped in the page (unit vectors, int8), plus full-vocabulary neighbours and
#    analogy answers for the preset examples, so the page can say where the subset differs from the full table.
#
# Run: python3 glove_subset.py <dir with glove50.gz and questions-words.txt>   (numpy needed: uv run --with numpy)
import sys, gzip, json, base64, os
import numpy as np

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
N_SHIP = int(os.environ.get('N_SHIP', 2000))

words, vecs = [], []
with gzip.open(os.path.join(D, 'glove50.gz'), 'rt', encoding='utf8') as f:
    n, d = map(int, f.readline().split())
    for line in f:
        p = line.rstrip('\n').split(' ')
        words.append(p[0]); vecs.append(np.array(p[1:], dtype=np.float32))
X = np.stack(vecs); X /= np.linalg.norm(X, axis=1, keepdims=True)
idx = {w: i for i, w in enumerate(words)}
print('vocab', len(words), 'dim', X.shape[1])

# --- analogy test
secs, qs = [], []
for line in open(os.path.join(D, 'questions-words.txt')):
    if line.startswith(':'):
        secs.append(line[1:].strip()); continue
    a, b, c, dd = line.lower().split()
    qs.append((len(secs) - 1, a, b, c, dd))
print('questions', len(qs))


def run_test(Xs, idxs, qlist, exclude):
    ok = np.zeros(len(qlist), bool); pred = []
    B = 512
    for s in range(0, len(qlist), B):
        chunk = qlist[s:s + B]
        A = np.stack([Xs[idxs[q[2]]] - Xs[idxs[q[1]]] + Xs[idxs[q[3]]] for q in chunk])
        sims = A @ Xs.T
        if exclude:
            for r, q in enumerate(chunk):
                for w in q[1:4]: sims[r, idxs[w]] = -9
        best = sims.argmax(1)
        for r, q in enumerate(chunk):
            ok[s + r] = best[r] == idxs[q[4]]
    return ok


def summarise(qlist, ok):
    sem = [i for i, q in enumerate(qlist) if not secs[q[0]].startswith('gram')]
    syn = [i for i, q in enumerate(qlist) if secs[q[0]].startswith('gram')]
    per = {}
    for si, s in enumerate(secs):
        ii = [i for i, q in enumerate(qlist) if q[0] == si]
        if ii: per[s] = [len(ii), round(float(ok[ii].mean()), 4)]
    return {'n': len(qlist), 'n_sem': len(sem), 'n_syn': len(syn), 'total': round(float(ok.mean()), 4),
            'semantic': round(float(ok[sem].mean()), 4), 'syntactic': round(float(ok[syn].mean()), 4), 'sections': per}


qfull = [q for q in qs if all(w in idx for w in q[1:])]
ev = {'source': 'GloVe 6B 50d, gensim-data glove-wiki-gigaword-50; questions-words.txt (word2vec repository)',
      'n_questions_file': len(qs), 'n_questions_covered': len(qfull)}
ev['full_exclude'] = summarise(qfull, run_test(X, idx, qfull, True))
ev['full_include'] = summarise(qfull, run_test(X, idx, qfull, False))
# word2vec's compute-accuracy restricts to the most frequent 30,000 words
X30 = X[:30000]; idx30 = {w: i for i, w in enumerate(words[:30000])}
q30 = [q for q in qs if all(w in idx30 for w in q[1:])]
ev['top30k_exclude'] = summarise(q30, run_test(X30, idx30, q30, True))
# Without exclusion, how often is the top answer one of the question words, and which one?
ok_inc = run_test(X, idx, qfull, False)
inp = {'a': 0, 'b': 0, 'c': 0, 'other_wrong': 0, 'right': 0}
B = 512
for s in range(0, len(qfull), B):
    chunk = qfull[s:s + B]
    A = np.stack([X[idx[q[2]]] - X[idx[q[1]]] + X[idx[q[3]]] for q in chunk])
    best = (A @ X.T).argmax(1)
    for r, q in enumerate(chunk):
        w = words[best[r]]
        if w == q[4]: inp['right'] += 1
        elif w == q[1]: inp['a'] += 1
        elif w == q[2]: inp['b'] += 1
        elif w == q[3]: inp['c'] += 1
        else: inp['other_wrong'] += 1
ev['include_top_answer'] = inp
for k in ['full_exclude', 'full_include', 'top30k_exclude']:
    print(k, ev[k]['total'], ev[k]['semantic'], ev[k]['syntactic'], ev[k]['n'])
print('top answer without exclusion', inp)

# --- the shipped subset
need = set()
for q in qfull: need.update(q[1:])
extra = """king queen man woman prince princess boy girl husband wife father mother son daughter brother sister uncle aunt
doctor nurse surgeon programmer homemaker engineer teacher scientist lawyer secretary receptionist architect
paris france tokyo japan rome italy berlin germany london england madrid spain moscow russia beijing china
walking walked swimming swam big bigger biggest small smaller smallest good better best bad worse worst
apple banana orange computer software internet music guitar piano football basketball cat dog horse
car train plane ship river mountain ocean city village frog toad lizard bank money river water ice steam
cold hot warm happy sad angry love hate night day sun moon star planet earth mars
language english french german spanish word sentence translation network neural learning memory""".split()
need.update(w for w in extra if w in idx)
ship = sorted(need, key=lambda w: idx[w])
for i, w in enumerate(words):
    if len(ship) >= N_SHIP: break
    if i < 150 or not w.isalpha() or len(w) < 3 or w in need: continue
    ship.append(w)
ship = sorted(set(ship), key=lambda w: idx[w])[:N_SHIP] if len(ship) > N_SHIP else sorted(ship, key=lambda w: idx[w])
assert need <= set(ship) or len(need) > N_SHIP, 'subset too small for the analogy words'
S = X[[idx[w] for w in ship]]
Q = np.clip(np.round(S * 127 / np.abs(S).max(axis=1, keepdims=True)), -127, 127).astype(np.int8)
# dequantised unit vectors (per-vector scale does not matter for cosine after renormalising)
Sq = Q.astype(np.float32); Sq /= np.linalg.norm(Sq, axis=1, keepdims=True)
cosdev = float(np.abs((Sq * S).sum(1) - 1).max())
sidx = {w: i for i, w in enumerate(ship)}
qsub = [q for q in qfull if all(w in sidx for w in q[1:])]
sub_ex = summarise(qsub, run_test(Sq, sidx, qsub, True))
sub_in = summarise(qsub, run_test(Sq, sidx, qsub, False))
ok_full_on_sub = run_test(X, idx, qsub, True)
ev['subset'] = {'n_words': len(ship), 'int8_max_cos_error': round(cosdev, 6), 'exclude': sub_ex, 'include': sub_in,
                'same_questions_full_vocab_exclude': round(float(ok_full_on_sub.mean()), 4)}
print('subset', len(ship), 'cos err', cosdev, 'acc excl', sub_ex['total'], 'incl', sub_in['total'],
      'same q on full vocab', ev['subset']['same_questions_full_vocab_exclude'])

# --- full-vocabulary answers for the page's presets
def nn_full(w, k=10):
    s = X @ X[idx[w]]; o = np.argsort(-s)[:k + 1]
    return [[words[i], round(float(s[i]), 3)] for i in o if words[i] != w][:k]


def analogy_full(a, b, c, k=5):
    v = X[idx[b]] - X[idx[a]] + X[idx[c]]; v /= np.linalg.norm(v)
    s = X @ v; o = np.argsort(-s)[:k + 3]
    return [[words[i], round(float(s[i]), 3)] for i in o][:k + 3]


presets_nn = ['frog', 'king', 'paris', 'computer', 'happy', 'bank', 'apple', 'cold', 'translation', 'memory', 'neural']
presets_an = [['man', 'king', 'woman'], ['france', 'paris', 'japan'], ['walking', 'walked', 'swimming'],
              ['big', 'bigger', 'small'], ['man', 'doctor', 'woman'], ['man', 'programmer', 'woman'],
              ['man', 'surgeon', 'woman'], ['good', 'better', 'bad']]
full = {'nn': {w: nn_full(w) for w in presets_nn if w in idx},
        'analogy': [{'q': q, 'top': analogy_full(*q)} for q in presets_an]}
ev['presets_full_vocab'] = full
for a in full['analogy']: print(a['q'], a['top'][:5])

blob = base64.b64encode(Q.tobytes()).decode()
os.makedirs(os.path.join(HERE, 'inputs'), exist_ok=True)
json.dump({'words': ship, 'dim': 50, 'int8_b64': blob,
           'note': 'GloVe 6B 50d unit vectors, int8 per vector (renormalise after decoding); words in frequency order'},
          open(os.path.join(HERE, 'inputs', 'glove_subset.json'), 'w'))
# the questions whose four words are all in the subset, for the in-browser test (section index, 4 word indices)
json.dump({'sections': secs, 'q': [[q[0]] + [sidx[w] for w in q[1:]] for q in qsub]},
          open(os.path.join(HERE, 'inputs', 'glove_questions_subset.json'), 'w'))
json.dump(ev, open(os.path.join(HERE, 'inputs', 'glove_eval.json'), 'w'), indent=1)
print('blob bytes', len(blob), 'questions in subset', len(qsub))
