"""Encoder pass over the same sets as measure_sets.py, CPU only (4 threads, low priority).
Model: HuggingFaceFW/fineweb-edu-classifier (Snowflake arctic-embed-m encoder with a regression head; FineWeb-Edu froze
the encoder, so the [CLS] vector is arctic-embed-m's own embedding). For the first 300 documents of each set:
  edu score       the classifier's 0-5 educational-value score; share with score >= 3 (FineWeb-Edu's threshold)
  homogeneity     mean pairwise cosine similarity of normalised [CLS] embeddings (higher = documents more alike)
usage: DC_SCRATCH=<scratch>/dc OMP_NUM_THREADS=4 python -I embed_sets.py <out.json>
"""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from measure_sets import SETS
torch.set_num_threads(4)
M = os.path.join(os.environ['DC_SCRATCH'], 'data', 'models', 'fineweb-edu-classifier')
tok = AutoTokenizer.from_pretrained(M); model = AutoModelForSequenceClassification.from_pretrained(M).eval()
N = 300; out = {'model': 'HuggingFaceFW/fineweb-edu-classifier', 'docs_per_set': N, 'max_tokens': 512, 'sets': []}
if os.path.exists(sys.argv[1]): out = json.load(open(sys.argv[1]))
done = {s['key'] for s in out['sets']}
for key, label, grp, load in SETS:
    if key in done: continue
    docs = load()[:N]; t0 = time.time(); scores, embs = [], []
    with torch.no_grad():
        for i in range(0, len(docs), 16):
            b = tok(docs[i:i + 16], truncation=True, max_length=512, padding=True, return_tensors='pt')
            o = model(**b, output_hidden_states=True)
            scores += o.logits.squeeze(-1).tolist()
            e = o.hidden_states[-1][:, 0]; embs.append(torch.nn.functional.normalize(e, dim=-1))
    E = torch.cat(embs); S = E @ E.T; n = len(E)
    hom = ((S.sum() - n) / (n * (n - 1))).item()
    sc = sorted(scores)
    r = dict(key=key, label=label, group=grp, n=n, edu_mean=round(sum(sc) / n, 3), edu_median=round(sc[n // 2], 3),
             edu_ge3=round(sum(1 for x in sc if x >= 2.5) / n, 4),  # int_score = round(score) >= 3  <=>  score >= 2.5
             edu_hist=[sum(1 for x in sc if round(max(0, min(5, x))) == k) for k in range(6)],
             homogeneity=round(hom, 4), seconds=round(time.time() - t0, 1))
    out['sets'].append(r); print(r, flush=True)
    json.dump(out, open(sys.argv[1], 'w'), indent=0)
