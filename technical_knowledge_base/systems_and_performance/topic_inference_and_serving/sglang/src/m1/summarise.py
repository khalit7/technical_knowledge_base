"""Summarise the M1 runs (results/*.json written by exp.py, plus the bug reproductions) into out/m1.json for the page."""
import glob, json, os, statistics as st
H = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(H, 'results')


def load(pat):
    return [json.load(open(f)) for f in sorted(glob.glob(os.path.join(R, pat)))]


def mm(v):
    return {'mean': st.mean(v), 'min': min(v), 'max': max(v), 'n': len(v)}


out = {'loads': []}
sched = {}
for pol in ['fcfs', 'lpm', 'dfs-weight', 'random']:
    runs = load(f'sched_{pol}_*.json')
    if not runs:
        continue
    cp = [100 * sum(r['cached_tokens'] for r in x['requests']) / sum(r['prompt_tokens'] for r in x['requests']) for x in runs]
    ms = [x['makespan'] for x in runs]
    tt = [st.mean(r['ttft'] for r in x['requests']) for x in runs]
    out['loads'] += [x['load_before'][0] for x in runs]
    sched[pol] = {'cached_pct': st.mean(cp), 'cached_min': min(cp), 'cached_max': max(cp), 'makespan': st.mean(ms),
                  'makespan_min': min(ms), 'makespan_max': max(ms), 'ttft_mean': st.mean(tt), 'reps': len(runs)}
out['sched'] = sched or None
mt = {}
for mode in ['radix_on', 'radix_off']:
    runs = load(f'multiturn_{mode}_*.json')
    if not runs:
        continue
    by_turn = []
    for t in range(4):
        v = [st.mean(r['ttft'] for r in x['requests'] if r['turn'] == t) for x in runs]
        c = [st.mean(r['cached_tokens'] for r in x['requests'] if r['turn'] == t) for x in runs]
        p = [st.mean(r['prompt_tokens'] for r in x['requests'] if r['turn'] == t) for x in runs]
        by_turn.append({'turn': t + 1, 'ttft': mm(v), 'cached': st.mean(c), 'prompt': st.mean(p)})
    allt = [st.mean(r['ttft'] for r in x['requests']) for x in runs]
    tpot = [st.mean(1000 * (r['e2e'] - r['ttft']) / (r['completion_tokens'] - 1) for r in x['requests']) for x in runs]
    out['loads'] += [x['load_before'][0] for x in runs]
    mt[mode] = {'by_turn': by_turn, 'ttft_all': mm(allt), 'tpot_ms': mm(tpot), 'makespan': mm([x['makespan'] for x in runs]), 'reps': len(runs)}
out['multiturn'] = mt or None
ov = {}
for mode in ['on', 'off']:
    runs = load(f'overlap_{mode}_*.json')
    if not runs:
        continue
    ov[mode] = {}
    for conc in ['1', '4', '8']:
        tps = [sum(r['completion_tokens'] for r in x[conc]['requests']) / x[conc]['makespan'] for x in runs]
        mpt = [st.mean(1000 * (r['e2e'] - r['ttft']) / (r['completion_tokens'] - 1) for r in x[conc]['requests']) for x in runs]
        ov[mode][conc] = {'tok_s': st.mean(tps), 'tok_s_min': min(tps), 'tok_s_max': max(tps), 'ms_per_token': st.mean(mpt), 'reps': len(runs)}
    out['loads'] += [x['load_before'][0] for x in runs]
out['overlap'] = ov or None
js = {}
runs = load('json_xgrammar_*.json')
if runs:
    for mode in ['free', 'schema']:
        rows = [r for x in runs for passrows in x[mode] for r in passrows]
        tpot = [1000 * (r['e2e'] - r['ttft']) / (r['completion_tokens'] - 1) for r in rows if r['completion_tokens'] > 1]
        js[mode] = {'tpot_ms_median': st.median(tpot), 'ttft_ms_median': 1000 * st.median(r['ttft'] for r in rows),
                    'valid': sum(r['valid_json'] for r in rows), 'n': len(rows), 'tokens_mean': st.mean(r['completion_tokens'] for r in rows)}
    firsts = [1000 * x['schema'][0][0]['ttft'] for x in runs]
    js['schema_first_ttft_ms'] = firsts
    js['example'] = runs[0]['schema'][0][0]['text']
    js['example_free'] = runs[0]['free'][0][0]['text']
    js['loads'] = [x['load_before'] for x in runs]
p = os.path.join(R, 'json_without_mlx_sampling.json')
if os.path.exists(p):
    x = json.load(open(p))
    rows = [r for passrows in x['schema'] for r in passrows]
    js['no_sampling'] = {'n': len(rows), 'valid': sum(r['valid_json'] for r in rows), 'tokens_mean': st.mean(r['completion_tokens'] for r in rows), 'example': rows[0]['text']}
    out['loads'] += [x['load_before'][0] for x in runs]
out['json'] = js or None
rep = {}
for name in ['repro_overlap_on', 'repro_pr42542_overlap_on']:
    p = os.path.join(R, name + '.json')
    if os.path.exists(p):
        rep[name] = json.load(open(p))
p = os.path.join(R, 'split_prefill_mlxlm.json')
if os.path.exists(p):
    rep['split'] = json.load(open(p))
out['repro'] = rep
out['load_range'] = [min(out['loads']), max(out['loads'])] if out['loads'] else None
json.dump(out, open(os.path.join(H, 'out', 'm1.json'), 'w'), indent=1)
print(json.dumps({k: (v if k in ('sched', 'load_range') else '...') for k, v in out.items()}, indent=1)[:1500])
