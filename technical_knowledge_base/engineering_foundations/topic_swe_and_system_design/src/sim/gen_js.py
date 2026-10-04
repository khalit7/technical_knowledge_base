"""Write parts/31_js_sim_model.js from model_tmpl.js with defaults.json embedded (so JS and Python read the same numbers)."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(H, 'defaults.json')))
t = open(os.path.join(H, 'model_tmpl.js')).read().replace('/*DEFAULTS*/', json.dumps(d, separators=(',', ':')))
open(os.path.join(H, '..', 'parts', '31_js_sim_model.js'), 'w').write(t)
print('wrote', len(t), 'bytes')
