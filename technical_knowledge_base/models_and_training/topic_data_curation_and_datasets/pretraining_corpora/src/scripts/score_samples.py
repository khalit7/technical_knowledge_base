"""Score corpus samples with the published FineWeb-Edu classifier on CPU (float32, 4 threads).

Same call as the classifier's own src/run_edu_bert.py (HuggingFaceFW/fineweb-edu-classifier @ 284663c, lines 18-24):
tokenizer(..., padding="longest", truncation=True) -> regression logit -> int_score = round(clip(score, 0, 5)).
Their production run used bfloat16 on GPU; this uses float32 on CPU, so scores can differ slightly: the FineWeb-Edu
sample carries the published scores, and the comparison is printed.

Usage: DC_SCRATCH=<scratch>/dc HF_HOME=$DC_SCRATCH/hf python -I score_samples.py [max docs per corpus, default 300]
Writes $DC_SCRATCH/data/pc/scores/<name>.json  {i: score}
"""
import json, os, sys, time
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

torch.set_num_threads(4)
SCR = os.environ['DC_SCRATCH']
SAMP = os.path.join(SCR, 'data', 'pc', 'samples')
OUT = os.path.join(SCR, 'data', 'pc', 'scores')
os.makedirs(OUT, exist_ok=True)
REV = '284663cbb2dabf9bda30d8f8cc49601251ee1631'
NMAX = int(sys.argv[1]) if len(sys.argv) > 1 else 300
ALL = {'fineweb', 'fineweb_edu'}  # score every document of the running example

tok = AutoTokenizer.from_pretrained('HuggingFaceFW/fineweb-edu-classifier', revision=REV)
model = AutoModelForSequenceClassification.from_pretrained('HuggingFaceFW/fineweb-edu-classifier', revision=REV).eval()
names = sorted(f[:-6] for f in os.listdir(SAMP) if f.endswith('.jsonl'))
for name in names:
    p = os.path.join(OUT, name + '.json')
    if os.path.exists(p):
        continue
    docs = [json.loads(l) for l in open(os.path.join(SAMP, name + '.jsonl'))]
    n = len(docs) if name in ALL else min(NMAX, len(docs))
    t0 = time.time()
    scores = {}
    order = sorted(range(n), key=lambda i: len(docs[i]['text']))  # similar lengths per batch: less padding
    for k in range(0, n, 16):
        idx = order[k:k + 16]
        inp = tok([docs[i]['text'] for i in idx], return_tensors='pt', padding='longest', truncation=True)
        with torch.no_grad():
            out = model(**inp).logits.squeeze(-1).float().numpy()
        for i, s in zip(idx, out.reshape(-1).tolist()):
            scores[i] = round(float(s), 4)
    json.dump(scores, open(p, 'w'))
    print(name, n, 'docs', round(time.time() - t0, 1), 's', flush=True)
