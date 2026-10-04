"""Extract peak requests/s per framework from TechEmpower Framework Benchmarks Round 23 (physical hardware).
Input: results JSON downloaded from https://www.techempower.com/benchmarks/results/round23/ph.json (5 MB, not committed).
Peak = max over concurrency levels of totalRequests / duration (15 s). Output: inputs/te_r23.json
Run: python3 extract_te_r23.py /path/to/ph.json"""
import json, sys
d = json.load(open(sys.argv[1]))
keep = ['aspnetcore', 'gin', 'spring', 'fastapi', 'express', 'express-postgres', 'django', 'django-postgresql', 'rails', 'fastify', 'fastify-postgres', 'laravel']
out = {'source': 'https://www.techempower.com/benchmarks/#section=data-r23', 'run': d['name'], 'run_uuid': d['uuid'],
       'hardware': 'Intel Xeon Gold 6330 @ 2.0 GHz (56 cores), ConnectX-6 40 Gbps (TechEmpower Round 23 announcement, 2025-03-17)', 'duration_s': d['duration'], 'tests': {}}
for t in ['json', 'db', 'fortune']:
    out['tests'][t] = {}
    for fw in keep:
        arr = d['rawData'].get(t, {}).get(fw)
        if arr: out['tests'][t][fw] = round(max(x.get('totalRequests', 0) for x in arr if isinstance(x, dict)) / d['duration'])
json.dump(out, open('inputs/te_r23.json', 'w'), indent=1); print(json.dumps(out['tests'], indent=1))
