"""For every completed data-poisoning account-day in the GPT-5.3 single-day corpus: where the first trigger string
('canary') first appears in that day's audit-event arguments, against the semantic monitor's 600-character clip
(Appendix F.5), and whether the day has more than 400 events (the audit rendering keeps the first 400).
usage: uv run --with pandas --with pyarrow python clip_check.py $SCRATCH/hf   (writes inputs/clip_check.json)"""
import json, sys, os
import pandas as pd, pyarrow.parquet as pq
H = sys.argv[1]
F = json.load(open('inputs/features_gpt53_single_day.json'))
days = sorted({r[1] for r in F['rows']}); test = set(days[15:])
keys = [(a, d) for a, d, sc, o in F['labels'] if sc == '08_data_poisoning' and o == 'executed']
au = pq.read_table(os.path.join(H, 'audit_gpt53_single_day.parquet'), filters=[('account', 'in', sorted({a for a, d in keys}))],
                   columns=['ts', 'account', 'service', 'action', 'args']).to_pandas()
res = []
for a, d in keys:
    ev = au[(au.account == a) & (au.ts.str[:10] == d)]
    first = None
    for r in ev.itertuples():
        t = json.dumps(json.loads(r.args), default=str, ensure_ascii=False) if r.args else ''
        i = t.find('canary')
        if i >= 0 and (first is None or i < first[0]): first = (i, r.service + '.' + r.action, len(t))
    res.append({'account': a, 'date': d, 'test': d in test, 'n_events': len(ev), 'first_canary_offset': first[0] if first else None,
                'call': first[1] if first else None, 'arg_len': first[2] if first else None})
json.dump(res, open('inputs/clip_check.json', 'w'), indent=0)
for r in res: print(r)
