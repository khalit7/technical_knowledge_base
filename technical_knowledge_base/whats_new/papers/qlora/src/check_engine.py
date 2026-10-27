"""Reference values for check_engine.mjs: the browser engine (parts/22_js_engine.js) against Python.

  uv run --with numpy python check_engine.py      writes model/check_engine_ref.json
then
  node check_engine.mjs                           compares and writes model/check_engine.json
Checks: blockwise quantisation of the shipped LLaMA samples with every type and three block sizes (relative squared
error, code indices), double quantisation of the shipped constants, and the Elo pass in a fixed (file) order for all
three tournaments, plus Table 6 order columns.
"""
import base64, json, os
import numpy as np
from dtypes import TYPES, dynamic_map
import recompute_eval as RE

HERE = os.path.dirname(os.path.abspath(__file__))
W = json.load(open(os.path.join(HERE, 'inputs', 'weights_sample.json')))


def nearest(x, code):
    code = np.array(sorted(code)); mids = (code[1:] + code[:-1]) / 2
    i = np.searchsorted(mids, x, side='left')  # ties go to the lower value, as the JS (<=)
    return code[i], i


out = {'quant': [], 'dq': [], 'elo_fixed': {}, 'relative': {}}
for t in W['tensors']:
    w = np.frombuffer(base64.b64decode(t['w']), dtype='<f2').astype(np.float64)
    am_all = np.frombuffer(base64.b64decode(t['absmax']), dtype='<f4').astype(np.float64)
    for B in (16, 64, 256):
        x = w.reshape(-1, B); am = np.abs(x).max(1)
        for k, code in TYPES.items():
            q, i = nearest(x / am[:, None], code)
            err = ((q * am[:, None] - x) ** 2).sum() / (x ** 2).sum()
            out['quant'].append({'tensor': t['name'], 'B': B, 'type': k, 'relmse': float(err), 'idx_sum': int(i.sum())})
    off = am_all.mean(); a = (am_all - off).reshape(-1, 256); c2 = np.abs(a).max(1)
    qa = (nearest(a / c2[:, None], dynamic_map())[0] * c2[:, None]).reshape(-1) + off
    out['dq'].append({'tensor': t['name'], 'mean_rel_err': float((np.abs(qa - am_all) / am_all).mean())})
for key, ms in (('gpt4_vicuna', RE.matches_gpt4('vicuna')), ('gpt4_oa', RE.matches_gpt4('oa')), ('human_vicuna', RE.matches_human())):
    R = {}
    ms = sorted(ms, key=lambda m: (m[1], m[2], m[0]))
    for _, a, b, s in ms:
        ra, rb = R.get(a, 1000.0), R.get(b, 1000.0); ea = 1 / (1 + 10 ** ((rb - ra) / 400)); R[a] = ra + 32 * (s - ea); R[b] = rb - 32 * (s - ea)
    out['elo_fixed'][key] = {'n': len(ms), 'R': R}
rel = RE.relative()
out['relative'] = {k: {o: v[o] for o in ('chatgpt_first', 'system_first', 'mean_pooled') if o in v} for k, v in rel.items()}
json.dump(out, open(os.path.join(HERE, 'model', 'check_engine_ref.json'), 'w'))
print('reference written:', len(out['quant']), 'quantisations')
