"""Semantic cache threshold sweep on real labelled question pairs, with small sentence-embedding models on CPU.
Data (downloaded to the scratch directory, not committed):
  QQP: GLUE Quora Question Pairs validation split, 40,430 pairs labelled duplicate or not
       https://huggingface.co/datasets/nyu-mll/glue (qqp/validation-00000-of-00001.parquet)
  PAWS: labeled_final test split, 8,000 pairs built by swapping words, labelled paraphrase or not
       https://huggingface.co/datasets/google-research-datasets/paws (labeled_final/test-00000-of-00001.parquet)
Models: sentence-transformers/all-MiniLM-L6-v2 (22.7M parameters) and BAAI/bge-small-en-v1.5 (33.4M), torch threads 2.
Two views of a cache:
  pairs    the cache holds question1, the query is question2: a hit if cosine >= t; a hit is right only if the pair is a duplicate.
           True-hit rate (share of duplicates served) and false-hit rate (share of non-duplicates served) for every t.
  nearest  10,000 QQP pairs: every question1 is stored; each question2 is looked up against all of them (top 1).
           Served from cache if the best cosine >= t; right if the best match is its own partner and the pair is a duplicate;
           a best match that is another stored question has no label (counted separately).
Writes inputs/sem.json.
"""
import os, sys, time, json
import numpy as np, pandas as pd, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine
from sentence_transformers import SentenceTransformer
torch.set_num_threads(2)

qqp = pd.read_parquet(os.path.join(S, 'qqp_val.parquet'))
paws = pd.read_parquet(os.path.join(S, 'paws_test.parquet'))
TS = [round(x, 2) for x in np.arange(0.50, 1.0001, 0.01)]
out = {**machine(), 'qqp_pairs': len(qqp), 'qqp_dup_share': float(qqp.label.mean()),
       'paws_pairs': len(paws), 'paws_para_share': float(paws.label.mean()), 'thresholds': TS, 'models': {}}

# a few PAWS examples to show on the page (non-paraphrases with high overlap)
ex = paws[paws.label == 0].head(400)


def curves(sim, lab):
    pos, neg = sim[lab == 1], sim[lab == 0]
    return {'tpr': [float((pos >= t).mean()) for t in TS], 'fpr': [float((neg >= t).mean()) for t in TS],
            'sim_hist_pos': np.histogram(pos, bins=50, range=(0, 1))[0].tolist(),
            'sim_hist_neg': np.histogram(neg, bins=50, range=(0, 1))[0].tolist()}


for name in ('sentence-transformers/all-MiniLM-L6-v2', 'BAAI/bge-small-en-v1.5'):
    m = SentenceTransformer(name, device='cpu')
    enc = lambda xs: m.encode(list(xs), batch_size=128, normalize_embeddings=True, convert_to_numpy=True)
    t0 = time.time()
    a, b = enc(qqp.question1), enc(qqp.question2)
    t_qqp = time.time() - t0
    sim = (a * b).sum(1)
    res = {'params': sum(p.numel() for p in m.parameters()), 'dim': int(a.shape[1]),
           'encode_s_qqp': round(t_qqp, 1), 'ms_per_sentence_batched': round(t_qqp / (2 * len(qqp)) * 1000, 3)}
    # one query at a time, as a cache lookup would embed it
    qs = list(qqp.question2[:200]); t0 = time.time()
    for q in qs: m.encode([q], normalize_embeddings=True)
    res['ms_per_query_single'] = round((time.time() - t0) / len(qs) * 1000, 2)
    res['qqp_pairs'] = curves(sim, qqp.label.values)
    pa, pb = enc(paws.sentence1), enc(paws.sentence2)
    psim = (pa * pb).sum(1)
    res['paws_pairs'] = curves(psim, paws.label.values)
    # nearest-neighbour cache over 10,000 pairs
    rng = np.random.default_rng(3); idx = rng.choice(len(qqp), 10000, replace=False)
    A, Bq, lab = a[idx], b[idx], qqp.label.values[idx]
    best_sim = np.empty(len(idx)); best = np.empty(len(idx), dtype=int)
    for s in range(0, len(idx), 2000):
        M = Bq[s:s + 2000] @ A.T
        best[s:s + 2000] = M.argmax(1); best_sim[s:s + 2000] = M.max(1)
    own = best == np.arange(len(idx))
    nn = {'n': len(idx), 'dup_share': float(lab.mean()), 'served': [], 'right': [], 'wrong_labelled': [], 'other_unlabelled': []}
    for t in TS:
        h = best_sim >= t
        nn['served'].append(float(h.mean()))
        nn['right'].append(float((h & own & (lab == 1)).mean()))
        nn['wrong_labelled'].append(float((h & own & (lab == 0)).mean()))
        nn['other_unlabelled'].append(float((h & ~own).mean()))
    # examples of other-question matches at high similarity, to judge by eye
    oth = np.where(~own & (best_sim >= 0.9))[0][:12]
    nn['other_examples'] = [{'query': qqp.question2.values[idx[i]], 'matched': qqp.question1.values[idx[best[i]]], 'sim': round(float(best_sim[i]), 3)} for i in oth]
    res['nearest'] = nn
    if 'MiniLM' in name:
        es = (enc(ex.sentence1) * enc(ex.sentence2)).sum(1)
        top = np.argsort(-es)[:8]
        out['paws_examples'] = [{'a': ex.sentence1.values[i], 'b': ex.sentence2.values[i], 'sim': round(float(es[i]), 3)} for i in top]
        trick = [('Is this medicine safe for children?', 'Is this medicine unsafe for children?'),
                 ('Can I cancel my order?', 'Can I cancel my order after it has shipped?'),
                 ('Flights from New York to Paris', 'Flights from Paris to New York'),
                 ('Hotels under 100 dollars in Rome', 'Hotels over 100 dollars in Rome'),
                 ('What is your refund policy?', 'How do refunds work?'),
                 ('How do I reset my password?', 'I forgot my password, how can I change it?')]
        ta, tb = enc([x for x, _ in trick]), enc([y for _, y in trick])
        out['hand_pairs'] = [{'a': x, 'b': y, 'sim': round(float(s), 3), 'same_answer': i >= 4} for i, ((x, y), s) in enumerate(zip(trick, (ta * tb).sum(1)))]
    out['models'][name] = res
    print(name, json.dumps({k: v for k, v in res.items() if k not in ('qqp_pairs', 'paws_pairs', 'nearest')}), flush=True)
    save('sem.json', out)
print(json.dumps(out.get('hand_pairs'), indent=1))
