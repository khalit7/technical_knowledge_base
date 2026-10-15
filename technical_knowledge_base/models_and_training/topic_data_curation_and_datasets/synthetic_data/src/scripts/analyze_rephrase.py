"""CPU analysis of rephrased documents (run_rephrase.py output): how much each style changes, keeps and adds.
Per style, over all documents:
  len_ratio      output words / source words (median)
  novel4         share of the output's word 4-grams that do not occur in the source (median): how much is rewritten
  num_kept       share of the source's numbers that reappear in the output (pooled): a cheap fidelity check
  names_kept     share of the source's capitalised mid-sentence words that reappear (pooled): names, places, products
  preamble       share of outputs opening with a chat preamble ("Here is", "Sure", "Certainly") that Nemotron-CC strips
  edu            FineWeb-Edu classifier score of source and output (mean; share >= 2.5, i.e. int_score >= 3)
usage: DC_SCRATCH=<scratch>/dc OMP_NUM_THREADS=4 python -I analyze_rephrase.py <rephrase.jsonl> <out.json>
"""
import os, sys, json, re, statistics
from collections import defaultdict
W = re.compile(r"[A-Za-z]+(?:'[a-z]+)?|[0-9]+(?:[.,][0-9]+)?")
NUM = re.compile(r"\b\d+(?:[.,]\d+)?\b"); CAP = re.compile(r"(?<=[a-z,;] )[A-Z][a-z]+")
PRE = re.compile(r"^\s*(here is|here's|sure|certainly|of course)", re.I)
rows = [json.loads(l) for l in open(sys.argv[1])]
by = defaultdict(list)
for r in rows: by[r['style']].append(r)

def grams(t, n=4):
    w = [x.lower() for x in W.findall(t)]; return [tuple(w[i:i + n]) for i in range(len(w) - n + 1)]

score = None
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    torch.set_num_threads(4)
    M = os.path.join(os.environ['DC_SCRATCH'], 'data', 'models', 'fineweb-edu-classifier')
    tok = AutoTokenizer.from_pretrained(M); mdl = AutoModelForSequenceClassification.from_pretrained(M).eval()
    def score(texts):
        out = []
        with torch.no_grad():
            for i in range(0, len(texts), 16):
                b = tok(texts[i:i + 16], truncation=True, max_length=512, padding=True, return_tensors='pt')
                out += mdl(**b).logits.squeeze(-1).tolist()
        return out
except Exception as e:
    print('no classifier:', e)

res = {'docs': len({r['id'] for r in rows}), 'model': rows[0]['model'] if rows else None, 'styles': {}}
src = {r['id']: r['source'] for r in rows}
if score:
    ids = sorted(src); s = score([src[i] for i in ids]); res['edu_source'] = dict(mean=round(statistics.mean(s), 3), ge3=round(sum(x >= 2.5 for x in s) / len(s), 4))
for st, rs in by.items():
    lr, nv, nk, nt, ck, ct, pre = [], [], 0, 0, 0, 0, 0
    for r in rs:
        sw, ow = len(W.findall(r['source'])), len(W.findall(r['output']))
        lr.append(ow / max(1, sw)); sg = set(grams(r['source'])); og = grams(r['output'])
        nv.append(sum(g not in sg for g in og) / max(1, len(og)))
        sn = set(NUM.findall(r['source'])); nt += len(sn); nk += sum(1 for x in sn if x in r['output'])
        sc = set(CAP.findall(r['source'])); ct += len(sc); ck += sum(1 for x in sc if x in r['output'])
        pre += bool(PRE.match(r['output']))
    d = dict(n=len(rs), len_ratio=round(statistics.median(lr), 3), novel4=round(statistics.median(nv), 3),
             num_kept=round(nk / max(1, nt), 3), names_kept=round(ck / max(1, ct), 3), preamble=round(pre / len(rs), 3),
             tokens_median=statistics.median([r.get('completion_tokens') or 0 for r in rs]))
    if score:
        s = score([r['output'] for r in rs]); d['edu_mean'] = round(statistics.mean(s), 3); d['edu_ge3'] = round(sum(x >= 2.5 for x in s) / len(s), 4)
    res['styles'][st] = d; print(st, d, flush=True)
json.dump(res, open(sys.argv[2], 'w'), indent=0)
