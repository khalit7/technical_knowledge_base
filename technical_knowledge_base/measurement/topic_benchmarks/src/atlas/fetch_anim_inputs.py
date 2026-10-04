"""Inputs for the contamination animation, fetched 2026-10-04:
- SWE-bench Verified: created_at of each of the 500 issues (Hugging Face datasets-server rows API), counted by quarter.
- LiveCodeBench: problems per release window from the official README (cumulative counts and end months).
Writes inputs/anim_inputs.json."""
import json, urllib.request, collections, pathlib, re
here = pathlib.Path(__file__).parent
dates = []
for o in range(0, 500, 100):
    u = 'https://datasets-server.huggingface.co/rows?dataset=princeton-nlp/SWE-bench_Verified&config=default&split=test&offset=%d&length=100' % o
    j = json.load(urllib.request.urlopen(u, timeout=60))
    dates += [r['row']['created_at'][:7] for r in j['rows']]
q = collections.Counter(d[:4] + '-Q' + str((int(d[5:7]) - 1) // 3 + 1) for d in dates)
readme = urllib.request.urlopen('https://raw.githubusercontent.com/LiveCodeBench/LiveCodeBench/main/README.md', timeout=60).read().decode()
rel = re.findall(r'`(release_v\d)`: .*?between May 2023 and (\w+ \d{4}) containing (\d+) problems', readme)
out = {'swebench_verified': {'source': 'https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified (created_at of the issue; read via datasets-server)', 'read': '2026-10-04',
                              'n': len(dates), 'by_quarter': dict(sorted(q.items()))},
       'livecodebench': {'source': 'https://github.com/LiveCodeBench/LiveCodeBench (README release list)', 'read': '2026-10-04',
                         'releases': [{'v': v, 'end': e, 'cum': int(n)} for v, e, n in rel]}}
(here / 'inputs' / 'anim_inputs.json').write_text(json.dumps(out, indent=1))
print(out['swebench_verified']['n'], len(out['swebench_verified']['by_quarter']), out['livecodebench']['releases'])
