"""Real sentence embeddings before and after contrastive training, same backbone.

Before: bert-base-uncased (masked-LM pretraining only), pooled as "first-last avg" (the BERT baseline of
SimCSE, Gao et al. 2021, Table 5) and as the last layer's [CLS].
After:  princeton-nlp/unsup-simcse-bert-base-uncased (the same BERT, further trained with unsupervised
SimCSE: InfoNCE where the positive is the same sentence with a different dropout mask), pooled as the
last layer's [CLS] without the MLP ("cls_before_pooler", the SimCSE repository's choice for unsupervised
models).

Data: STS benchmark test split (sentence-transformers/stsb on Hugging Face; 1,379 pairs, gold score 0-1,
i.e. the 0-5 human rating divided by 5).

Outputs inputs/real_batch.json:
  - Spearman correlation x 100 of cosine against gold on the whole test split, per model and pooling
  - alignment over pairs with gold >= 0.8 (4 of 5), uniformity over all test sentences, mean cosine of
    random different sentences (anisotropy), following SimCSE section 5 / Wang and Isola 2020
  - a batch of 48 pairs (gold >= 0.9, 6 to 22 words, seeded draw) with their 48 x 48 cosine matrices
    (anchor = sentence1, candidates = every sentence2), rounded to 3 decimals

Run: OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 uv run --with torch --with transformers --with pandas --with pyarrow python real_embeddings.py
"""
import glob, json, os, random
import numpy as np, pandas as pd, torch
from transformers import AutoTokenizer, AutoModel

torch.set_num_threads(2)
hub = os.path.expanduser('~/.cache/huggingface/hub/datasets--sentence-transformers--stsb')
f = [p for p in glob.glob(hub + '/snapshots/*/**/*', recursive=True) if 'test' in os.path.basename(p) and os.path.isfile(p)]
print('test file', f)
p = f[0]
df = pd.read_parquet(p) if p.endswith('.parquet') else pd.read_csv(p)
s1, s2, gold = df['sentence1'].tolist(), df['sentence2'].tolist(), df['score'].to_numpy(float)
print(len(df), 'pairs')


def embed(name, pool):
    tok = AutoTokenizer.from_pretrained(name); m = AutoModel.from_pretrained(name, output_hidden_states=True).eval()
    def enc(sents):
        out = []
        for i in range(0, len(sents), 64):
            b = tok(sents[i:i + 64], padding=True, truncation=True, max_length=64, return_tensors='pt')
            with torch.no_grad():
                h = m(**b).hidden_states
            mask = b['attention_mask'].unsqueeze(-1).float()
            res = {}
            res['cls'] = h[-1][:, 0]
            avg = lambda x: (x * mask).sum(1) / mask.sum(1)
            res['first_last_avg'] = (avg(h[1]) + avg(h[-1])) / 2  # SimCSE's first-last: embedding output excluded
            res['mean_last'] = avg(h[-1])
            res['emb_last_avg'] = (avg(h[0]) + avg(h[-1])) / 2  # embedding output + last layer (what SimCSE's Table 5 baseline appears to use; tested)
            out.append({k: v.numpy() for k, v in res.items()})
        return {k: np.concatenate([o[k] for o in out]) for k in out[0]}
    return enc(s1), enc(s2)


def spearman(a, b):
    ra = pd.Series(a).rank().to_numpy(); rb = pd.Series(b).rank().to_numpy()
    return float(np.corrcoef(ra, rb)[0, 1])


def norm(x): return x / np.linalg.norm(x, axis=1, keepdims=True)


rs = random.Random(0)
cand = [i for i in range(len(df)) if gold[i] >= 0.9 and 6 <= len(s1[i].split()) <= 22 and 6 <= len(s2[i].split()) <= 22 and s1[i].strip().lower() != s2[i].strip().lower()]
seen, pick = set(), []
rs.shuffle(cand)
for i in cand:
    k = s1[i].lower()[:25]
    if k in seen: continue
    seen.add(k); pick.append(i)
    if len(pick) == 48: break
print(len(cand), 'candidates')

res = dict(source='sentence-transformers/stsb test split', n_pairs=len(df), batch_idx=pick,
           batch_s1=[s1[i] for i in pick], batch_s2=[s2[i] for i in pick], batch_gold=[round(gold[i], 3) for i in pick], models={})
for name, label, pools in [('google-bert/bert-base-uncased', 'bert', ['first_last_avg', 'cls', 'mean_last', 'emb_last_avg']),
                           ('princeton-nlp/unsup-simcse-bert-base-uncased', 'simcse', ['cls', 'first_last_avg', 'mean_last'])]:
    e1, e2 = embed(name, None)
    for pool in pools:
        a, b = norm(e1[pool]), norm(e2[pool])
        cos = (a * b).sum(1)
        sp = spearman(cos, gold)
        hi = gold >= 0.8
        align = float(((a[hi] - b[hi]) ** 2).sum(1).mean())
        allz = np.concatenate([a, b]); rr = np.random.RandomState(1)
        i1 = rr.randint(0, len(allz), 20000); i2 = rr.randint(0, len(allz), 20000); ok = i1 != i2
        d2 = ((allz[i1[ok]] - allz[i2[ok]]) ** 2).sum(1)
        unif = float(np.log(np.exp(-2 * d2).mean()))
        aniso = float((allz[i1[ok]] * allz[i2[ok]]).sum(1).mean())
        M = a[pick] @ b[pick].T
        res['models'][label + ':' + pool] = dict(model=name, pool=pool, spearman_x100=round(100 * sp, 2), align=round(align, 4),
                                                 unif=round(unif, 4), mean_cos_random=round(aniso, 4),
                                                 batch_cos=[[round(float(v), 3) for v in row] for row in M])
        print(label, pool, 'spearman', round(100 * sp, 2), 'align', round(align, 3), 'unif', round(unif, 3), 'aniso', round(aniso, 3),
              'diag', round(float(np.diag(M).mean()), 3), 'off', round(float((M.sum() - np.trace(M)) / (48 * 47)), 3), flush=True)

json.dump(res, open('inputs/real_batch.json', 'w'), separators=(',', ':'))
