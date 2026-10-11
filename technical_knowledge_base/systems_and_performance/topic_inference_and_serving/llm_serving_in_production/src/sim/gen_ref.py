"""Reference cases for check_sim.mjs: every metric x three cold starts x two seeds, full series. usage: python3 -I gen_ref.py out/ref.json"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from autoscale import run, DEFAULT, TARGETS
cases = []
for seed in (7, 11):
    for metric in ('util', 'queue', 'kv', 'ttft'):
        for cold in (6.0, 44.0, 85.0):
            p = dict(DEFAULT, seed=seed, metric=metric, target=TARGETS[metric], cold=cold)
            cases.append({'params': p, 'result': run(p)})
json.dump(cases, open(sys.argv[1], 'w'), separators=(',', ':'))
print(len(cases), 'cases')
