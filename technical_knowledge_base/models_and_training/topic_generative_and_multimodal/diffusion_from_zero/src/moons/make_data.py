# The two tiny two-moons networks (moved here from the Variational inference maths page, 2026-10-26).
# Packs dm_w64.json (written by diffusion.py 64 30000) into parts/20_js_dz_1moons.js (window.DZMN): int8 weights as base64.
# Run from anywhere: python3 moons/make_data.py
import base64, json, os
H = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(H, 'dm_w64.json')))
dm = {'W': d['W'], 'steps': d['steps'], 'torch': d['torch']}
for k in ['eps', 'flow']:
    dm[k] = {'log': d[k]['log'], 'L': [{'o': l['out'], 'i': l['in'], 's': l['scale'], 'b': l['b'], 'q': base64.b64encode(bytes.fromhex(l['q'])).decode()} for l in d[k]['layers']]}
P = os.path.join(H, '..', 'parts', '20_js_dz_1moons.js')
open(P, 'w').write('// The two-moons networks (src/moons/make_data.py; do not edit)\nwindow.DZMN=' + json.dumps(dm, separators=(',', ':')) + ';\n')
print(P, os.path.getsize(P))
