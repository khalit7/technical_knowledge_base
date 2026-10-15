"""Diversity and hygiene measures for synthetic and real text sets, on CPU (no model; the encoder pass is embed_sets.py).
For each set: the first 1000 documents of its sample. Measures:
  words        median document length in words
  distinct-n   unique / total word n-grams (n = 1, 2, 4) over a FIXED budget of the first 100,000 words, because
               distinct-n falls as a sample grows: comparing sets of different sizes is the classic mistake
  gzip ratio   raw bytes / gzip bytes of the same 100,000-word text (higher = more redundant; Shaib et al. 2024)
  openings     share of documents whose first three words are one of the set's ten most common openings
  neardup      share of documents in a MinHash pair with estimated Jaccard >= 0.8 (5-word shingles, 128 permutations)
  bench13      share of documents sharing at least one 13-word sequence with MMLU, ARC, HellaSwag or GSM8K test items
  llm_phr      FineWeb blog's proxy phrases for model-written text, per 10,000 words
usage: DC_SCRATCH=<scratch>/dc python -I measure_sets.py <out.json>
"""
import os, sys, json, re, gzip, statistics
from collections import Counter
import pyarrow.parquet as pq
from datasketch import MinHash, MinHashLSH

D = os.path.join(os.environ['DC_SCRATCH'], 'data'); SY = os.path.join(D, 'syn')
N_DOCS, BUDGET = 1000, 100_000
W = re.compile(r"[A-Za-z]+(?:'[a-z]+)?|[0-9]+")

def pqtext(path, col='text', n=N_DOCS): return [t for t in pq.read_table(path, columns=[col]).column(col).to_pylist()[:n] if t]
def jl(path, n=N_DOCS, col='text'):
    out = []
    for l in open(path):
        out.append(json.loads(l)[col])
        if len(out) >= n: break
    return out
S = f'{SY}/samples'; NM = f'{SY}/nemo'
SETS = [  # key, label, group, loader
    ('fineweb', 'FineWeb (CC-MAIN-2024-30)', 'real', lambda: pqtext(f'{D}/curated/fineweb_2024-30_rand50k.parquet')),
    ('fineweb_edu', 'FineWeb-Edu (CC-MAIN-2024-30)', 'real', lambda: pqtext(f'{D}/curated/fineweb_edu_2024-30_rand50k.parquet')),
    ('dclm', 'DCLM-baseline', 'real', lambda: pqtext(f'{D}/curated/dclm_baseline_first50k.parquet')),
    ('wikipedia', 'Wikipedia (en, 2023-11)', 'real', lambda: jl(f'{D}/pc/samples/wikipedia_en.jsonl')),
    ('nemo_hq_real', 'Nemotron-CC high, real', 'real', lambda: jl(f'{NM}/high__actual__part00000.jsonl')),
    ('nemo_lq_real', 'Nemotron-CC low, real', 'real', lambda: jl(f'{NM}/low__actual__part00000.jsonl')),
    ('nemo_lq_wiki', 'Nemotron-CC low, Wikipedia-style rephrase', 'rephrased', lambda: jl(f'{NM}/low__wrap_medium__part00000.jsonl')),
    ('nemo_hq_wiki', 'Nemotron-CC high, Wikipedia-style rephrase', 'rephrased', lambda: jl(f'{NM}/high__wrap_medium__part00000.jsonl')),
    ('nemo_qa', 'Nemotron-CC high, diverse QA', 'rephrased', lambda: jl(f'{NM}/high__diverse_qa_pairs__part00000.jsonl')),
    ('nemo_distill', 'Nemotron-CC high, distill', 'rephrased', lambda: jl(f'{NM}/high__distill__part00000.jsonl')),
    ('nemo_extract', 'Nemotron-CC high, extract knowledge', 'rephrased', lambda: jl(f'{NM}/high__extract_knowledge__part00000.jsonl')),
    ('nemo_klist', 'Nemotron-CC high, knowledge list', 'rephrased', lambda: jl(f'{NM}/high__knowledge_list__part00000.jsonl')),
    ('cosmo_web_v1', 'Cosmopedia web_samples_v1', 'generated', lambda: pqtext(f'{S}/cosmo_web_v1.parquet')),
    ('cosmo_web_v2', 'Cosmopedia web_samples_v2', 'generated', lambda: pqtext(f'{S}/cosmo_web_v2.parquet')),
    ('cosmo_stanford', 'Cosmopedia stanford', 'generated', lambda: pqtext(f'{S}/cosmo_stanford.parquet')),
    ('cosmo_stories', 'Cosmopedia stories', 'generated', lambda: pqtext(f'{S}/cosmo_stories.parquet')),
    ('cosmo_wikihow', 'Cosmopedia wikihow', 'generated', lambda: pqtext(f'{S}/cosmo_wikihow.parquet')),
    ('cosmo_openstax', 'Cosmopedia openstax', 'generated', lambda: pqtext(f'{S}/cosmo_openstax.parquet')),
    ('cosmo_khan', 'Cosmopedia khanacademy', 'generated', lambda: pqtext(f'{S}/cosmo_khanacademy.parquet')),
    ('cosmo_math', 'Cosmopedia auto_math_text', 'generated', lambda: pqtext(f'{S}/cosmo_auto_math.parquet')),
    ('cosmo_v2', 'Cosmopedia v2', 'generated', lambda: pqtext(f'{S}/cosmo_v2.parquet')),
    ('tinystories', 'TinyStories', 'generated', lambda: pqtext(f'{S}/tinystories.parquet')),
    ('megamath_qa', 'MegaMath QA (Llama-3.3)', 'rephrased', lambda: pqtext(f'{S}/megamath_qa_llama.parquet')),
    ('megamath_tcb', 'MegaMath text and code blocks', 'generated', lambda: pqtext(f'{S}/megamath_text_code.parquet')),
]
PHRASES = ['delve', 'as a large language model', "it's important to note", 'rich tapestry', 'intertwined', 'certainly!', 'dive into']

def bench_grams():
    import pandas as pd
    B = f'{D}/bench'; texts = []
    m = pd.read_parquet(f'{B}/mmlu_test.parquet'); texts += [q + ' ' + ' '.join(c) for q, c in zip(m.question, m.choices)]
    for f in ('arc_challenge_test', 'arc_easy_test'):
        a = pd.read_parquet(f'{B}/{f}.parquet'); texts += list(a.question)
    h = pd.read_parquet(f'{B}/hellaswag_validation.parquet'); texts += [c + ' ' + ' '.join(e) for c, e in zip(h.ctx, h.endings)]
    g = pd.read_parquet(f'{B}/gsm8k_test.parquet'); texts += list(g.question)
    grams = set()
    for t in texts:
        w = [x.lower() for x in W.findall(t)]
        grams.update(' '.join(w[i:i + 13]) for i in range(len(w) - 12))
    return grams

def measure(docs, BG):
    words = [[x.lower() for x in W.findall(d)] for d in docs]
    out = {'docs': len(docs), 'words_median': int(statistics.median(len(w) for w in words))}
    flat, txt = [], []
    for d, w in zip(docs, words):
        if len(flat) >= BUDGET: break
        flat += w; txt.append(d)
    flat = flat[:BUDGET]; out['budget_words'] = len(flat)
    for n in (1, 2, 4):
        g = [tuple(flat[i:i + n]) for i in range(len(flat) - n + 1)]
        out[f'distinct{n}'] = round(len(set(g)) / len(g), 4)
    raw = '\n'.join(txt).encode(); out['gzip_ratio'] = round(len(raw) / len(gzip.compress(raw, 9)), 3)
    op = Counter(' '.join(w[:3]) for w in words if len(w) >= 3); top = op.most_common(10)
    out['openings_top10_share'] = round(sum(c for _, c in top) / max(1, sum(op.values())), 4)
    out['openings_top3'] = [[k, c] for k, c in top[:3]]
    lsh = MinHashLSH(threshold=0.8, num_perm=128); mh = []
    for i, w in enumerate(words):
        m = MinHash(num_perm=128, seed=1)
        for j in range(max(1, len(w) - 4)): m.update(' '.join(w[j:j + 5]).encode())
        lsh.insert(str(i), m); mh.append(m)
    dup = sum(1 for i, m in enumerate(mh) if len(lsh.query(m)) > 1)
    out['neardup_share'] = round(dup / len(mh), 4)
    out['bench13_share'] = round(sum(1 for w in words if any(' '.join(w[i:i + 13]) in BG for i in range(len(w) - 12))) / len(words), 4)
    low = '\n'.join(docs).lower(); nw = sum(len(w) for w in words)
    out['llm_phrases_per10k'] = round(sum(low.count(p) for p in PHRASES) / nw * 10000, 3)
    out['delve_per10k'] = round(low.count('delve') / nw * 10000, 3)
    return out

if __name__ == '__main__':
    BG = bench_grams(); print('bench 13-grams', len(BG), flush=True); res = {'bench_13grams': len(BG), 'sets': []}
    only = set(sys.argv[2:])
    for key, label, grp, load in SETS:
        if only and key not in only: continue
        r = measure(load(), BG); r.update(key=key, label=label, group=grp); res['sets'].append(r); print(r, flush=True)
    json.dump(res, open(sys.argv[1], 'w'), indent=0)
