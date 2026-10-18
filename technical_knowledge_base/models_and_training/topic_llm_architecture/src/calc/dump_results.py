"""Write out/py_results.json: calc.py's parameters, FLOPs and cache for every config at several contexts.
check_js_equals_py.mjs compares the page's JavaScript port against this file."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import calc  # noqa: E402
CTX = [1, 1024, 4096, 32768, 131072]
CFG = os.path.join(HERE, '..', 'data', 'configs')
res = {}
for f in sorted(os.listdir(CFG)):
    if not f.endswith('.json') or f == 'manifest.json': continue
    s = calc.normalise(json.load(open(os.path.join(CFG, f))))
    res[f[:-5]] = {'params': calc.params(s), 'flops': {str(L): calc.flops(s, L) for L in CTX},
                   'cache': {str(L): calc.cache(s, L) for L in CTX}, 'notes': s['notes']}
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(res, open(os.path.join(HERE, 'out', 'py_results.json'), 'w'), indent=0, sort_keys=True)
print(len(res), 'configs')
