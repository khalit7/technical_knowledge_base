"""Reference outputs for check_js.mjs: the shipped rows quantised block by block with qformats.py.
  uv run --with numpy python check_ref.py   (writes check_ref.json to the system temp folder)"""
import json, re, base64, os, numpy as np
import qformats as qf
HERE = os.path.dirname(os.path.abspath(__file__))
js = open(os.path.join(HERE, 'parts', '21_js_qdata.js')).read()
D = json.loads(js[js.index('window.QD=') + 10:].rstrip().rstrip(';'))
u = np.frombuffer(base64.b64decode(D['rows_bf16']), dtype='<u2').astype(np.uint32) << 16
R = u.view(np.float32).astype(np.float64).reshape(len(D['rows']), D['K'])
out = {}
for kind, g in (('int4', 32), ('nf4', 32), ('mxfp4', 32), ('mxfp8', 32), ('nvfp4', 16), ('e4m3', 32)):
    res = []
    for r in R:
        G = r.reshape(-1, g)
        if kind == 'int4': q = qf.q_int(G, 4, g)
        elif kind == 'nvfp4':
            st = D['w_absmax'] / (448 * 6); am = np.abs(G).max(1, keepdims=True)
            sb = qf.round_float(am / 6 / st, 'e4m3'); sb[sb == 0] = 1; q = qf.round_float(G / (sb * st), 'e2m1') * sb * st
        else:
            W = r.reshape(1, -1); qf.SCHEMES['_t'] = dict(kind=kind, g=g, bpw=0); q = qf.quantise(W, '_t')
        res.append(np.asarray(q).ravel().tolist())
    out[kind] = res
# float rounding spot checks
xs = [0.1, 1 / 3, 448, 500, 65504, 70000, 1e-5, 1e-8, 1.00390625, 3.14159265, -0.0009, 5.0, 0.75]
out['round'] = {f: qf.round_float(xs, f).tolist() for f in ('fp16', 'bf16', 'e4m3', 'e5m2', 'e2m1')}
out['xs'] = xs
json.dump(out, open(os.path.join(__import__('tempfile').gettempdir(), 'quant_check_ref.json'), 'w'))
print('ok')
