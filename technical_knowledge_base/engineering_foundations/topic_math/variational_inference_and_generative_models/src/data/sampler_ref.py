# Reference samples from data/sampler.py (NumPy float64) for check_js.mjs; also the measured table quoted on the page.
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H); os.chdir(H)
from sampler import load, sample, score
Le = load('dm_w64.json', 'eps'); Lf = load('dm_w64.json', 'flow')
ref = []
for (m, s, S, c, w) in [('ddpm', 'linear', 1000, 2, 0), ('ddpm', 'cosine', 50, 0, 2), ('ddim', 'linear', 20, 1, 0), ('ddim', 'cosine', 10, 2, 0), ('flow', '-', 20, 0, 3)]:
    x, _ = sample(Le, Lf, m, s if s != '-' else 'linear', S, c, w, 40, 5)
    ref.append({'method': m, 'sched': s if s != '-' else 'linear', 'S': S, 'c': c, 'w': w, 'n': 40, 'seed': 5, 'X': [round(float(v), 10) for v in x.reshape(-1)]})
tab = []
for (m, s, S) in [('ddpm', 'linear', 1000), ('ddpm', 'linear', 100), ('ddpm', 'linear', 20), ('ddim', 'linear', 100), ('ddim', 'linear', 20), ('ddim', 'linear', 5), ('flow', 'linear', 100), ('flow', 'linear', 20), ('flow', 'linear', 5), ('ddim', 'cosine', 20), ('ddim', 'cosine', 5)]:
    for c, w in [(2, 0), (0, 0), (0, 1), (0, 4)]:
        x, _ = sample(Le, Lf, m, s, S, c, w, 600, 11)
        on, mt = score(x, c); tab.append({'m': m, 's': s, 'S': S, 'c': c, 'w': w, 'on': round(on, 3), 'match': mt and round(mt, 3), 'sd': [round(float(v), 3) for v in x.std(0)]})
        print(tab[-1], flush=True)
x, _ = sample(Le, Lf, 'ddim', 'cosine', 20, 2, 0, 600, 11, clip=False)
noclip = {'on': round(score(x, 2)[0], 4)}; print('noclip', noclip)
json.dump({'ref': ref, 'table': tab, 'noclip_ddim_cosine20': noclip}, open(os.path.join(H, '..', 'inputs', 'sampler_ref.json'), 'w'))
