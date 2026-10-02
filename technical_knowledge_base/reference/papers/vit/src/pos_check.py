"""Position embeddings of the shipped toy models: grid score (correlation of cosine similarity with minus grid distance)
for float and quantised weights, and the mean norm against its value at initialisation (0.02 x sqrt(D) in expectation).
  DATA=$DATA uv run --with torch --with numpy python pos_check.py   -> model/pos_check.json"""
import json, os, sys
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train as T
def gs(p):
    p = p[1:]; n = p / np.linalg.norm(p, axis=1, keepdims=True); S = n @ n.T; a, b = [], []
    for i in range(49):
        for j in range(i + 1, 49): a.append(S[i, j]); b.append(-np.hypot(i // 7 - j // 7, i % 7 - j % 7))
    return float(np.corrcoef(a, b)[0, 1])
out = {}
for key, run in (('vit', 'vit_n64000_s0'), ('vit_small', 'vit_n2000_s0')):
    fl = torch.load(os.path.join(T.CK, run + '.pt'), weights_only=False)['state']['pos'].numpy()
    q = torch.load(os.path.join(T.HERE, 'model', run + '_q.pt'), weights_only=False)['state']['pos'].numpy()
    torch.manual_seed(0); init = (torch.randn(50, T.VIT['D']) * 0.02).numpy()
    out[key] = dict(run=run, grid_float=round(gs(fl), 3), grid_q=round(gs(q), 3), grid_random_init=round(gs(init), 3),
                    norm=round(float(np.linalg.norm(fl, axis=1).mean()), 3), norm_init=round(float(np.linalg.norm(init, axis=1).mean()), 3))
    print(key, out[key])
json.dump(out, open(os.path.join(T.HERE, 'model', 'pos_check.json'), 'w'), indent=1)
