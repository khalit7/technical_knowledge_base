"""The page embeds exactly the recorded data, and every number written in the prose (<span data-f>) agrees with it.
usage: python3 -I check_data.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'sim'))
from autoscale import run, DEFAULT, TARGETS  # noqa: E402

html = open(os.path.join(HERE, '..', 'index.html')).read()
page = json.loads(re.search(r'window\.PRD=(\{.*?\});\n', html, re.S).group(1))
M = json.load(open(os.path.join(HERE, 'exp', 'out', 'measured.json')))
RS = json.load(open(os.path.join(HERE, 'exp', 'out', 'route_sim.json')))
bad = 0
for k, v in M.items():
    if page.get(k) != v:
        print('EMBED MISMATCH', k); bad += 1
if page.get('route_sim') != RS:
    print('EMBED MISMATCH route_sim'); bad += 1
spans = dict(re.findall(r'<span data-f="(\w+)">(.*?)</span>', html, re.S))

R = M['route']; C = R['conv']; L = M['lora']; V = M['vllm']; CO = M['co']['runs']
rng = lambda xs, d, u='': (f'{min(xs):.{d}f}{u}' if f'{min(xs):.{d}f}' == f'{max(xs):.{d}f}' else f'{min(xs):.{d}f} to {max(xs):.{d}f}{u}')
two = lambda xs, d, u='': ' and '.join(f'{x:.{d}f}' for x in xs) + u
nf = lambda x: f'{x:,.0f}'
pc = lambda x: f'{100 * x:.1f}%'
cold = {(r['model'], r['mode']): r for r in M['cold']}
c4, w4 = cold[('Qwen3-4B-Q4_K_M.gguf', 'cold')], cold[('Qwen3-4B-Q4_K_M.gguf', 'warm')]
extra = c4['ready'][1] - w4['ready'][1]; bw = c4['bytes'] / 1e9 / extra
sc = lambda m, c: run(dict(DEFAULT, metric=m, target=TARGETS[m], cold=c))
q44, q6, u44 = sc('queue', 44.5), sc('queue', 6.0), sc('util', 44.5)
lr = lambda k, f: [f(x) for x in L[k]]
want = {
    'r8_rr': nf(R['root8']['rr'][0]['computed']), 'r8_reps': str(len(R['root8']['rr'])),
    'r8_pa_small': nf(R['root8']['ca'][0]['computed']), 'r8_pa_big': nf(R['root8big']['ca'][0]['computed']),
    'r8b_rr': nf(R['root8burst']['rr'][0]['computed']), 'r8b_ca': nf(R['root8burst']['ca'][0]['computed']),
    'r8b_wt': nf(R['root8burst']['wt'][0]['computed']),
    'r8b_ca_ttft': rng([r['ttft_mean'] for r in R['root8burst']['ca'] + R['root8burst']['hash2']], 1, ' s'),
    'r8b_wt_ttft': rng([r['ttft_mean'] for r in R['root8burst']['wt']], 2, ' s'),
    'tr_req': str(M['trace']['requests']), 'tr_conv': str(M['trace']['conversations']), 'tr_rate': f"{M['trace']['rate_per_s']:.1f}",
    'tr_ideal': pc(M['trace']['ideal_hit_one_replica']), 'tr_ideal2': pc(M['trace']['ideal_hit_one_replica']),
    'cv_wt_p50': rng([r['ttft_p50'] for r in C['wt']], 2, ' s'), 'cv_wt_p90': rng([r['ttft_p90'] for r in C['wt']], 2, ' s'),
    'cv_rr_p50': rng([r['ttft_p50'] for r in C['rr']], 2, ' s'), 'cv_rr_p90': rng([r['ttft_p90'] for r in C['rr']], 2, ' s'),
    'cv_wt_p99': rng([r['ttft_p99'] for r in C['wt']], 1, ' s'), 'cv_ll_p99': rng([r['ttft_p99'] for r in C['ll']], 1, ' s'),
    'cv_ca_p99': rng([r['ttft_p99'] for r in C['ca']], 1, ' s'),
    'cv_pa_hit': rng([100 * r['hit'] for p in ('hash2', 'ca', 'wt') for r in C[p]], 0, '%'),
    'cv_rr_hit': rng([100 * r['hit'] for p in ('rr', 'll') for r in C[p]], 0, '%'),
    'cv_h1_n': str(C['hash1'][0]['per_replica'][1]['req'] + C['hash1'][0]['per_replica'][0]['req'] + C['hash1'][0]['per_replica'][2]['req']),
    'cv_h1_hit': pc(C['hash1'][0]['hit']), 'cv_h1_p50': f"{C['hash1'][0]['ttft_p50']:.1f} s",
    'cv_ca_cache': str(C['ca'][0]['modes']['cache']), 'cv_ca_maxload': str(max(r['maxload'] for r in C['ca'])),
    'sc_util_rh': f"{u44['replica_hours']:.2f}", 'sc_queue_rh': f"{q44['replica_hours']:.2f}", 'sc_queue_p99': f"{q44['ttft_p99']:.1f} s",
    'sc_queue_slo': pc(q44['slo_ok']), 'sc_queue6_slo': pc(q6['slo_ok']),
    'cold_extra_4b': f'{extra:.2f} s', 'cold_bw': f'{bw:.1f} GB/s', 'cold_70b': f'{72.66 / bw:.0f} s', 'cold_ft4b': f"{1000 * c4['first_token'][1]:.0f} ms",
    'vl_reps': str(len(V['start'])), 'vl_ready': two([s['healthy_s'] for s in V['start']], 0, ' s'),
    'vl_weights': two([s['phases']['weights_s'] for s in V['start']], 1, ' s'), 'vl_ckpt': f"{V['start'][0]['phases']['checkpoint_gib']:.2f} GiB",
    'vl_init': two([s['phases']['engine_init_s'] for s in V['start']], 2, ' s'),
    'vl_kv': ' and '.join(nf(s['phases']['kv_tokens']) for s in V['start']),
    'vl_same': two(sorted(r['out_tok_per_s'] for r in V['runs']['vllm_lora_same_c8']), 1),
    'vl_d4': two(sorted(r['out_tok_per_s'] for r in V['runs']['vllm_lora_distinct4_c8']), 1),
    'vl_d8': two(sorted(r['out_tok_per_s'] for r in V['runs']['vllm_lora_distinct8_c8']), 1),
    'vl_base': two(sorted(r['out_tok_per_s'] for r in V['runs']['vllm_lora_base_c8']), 1),
    'vl_so_schema': two([r['ms_per_tok_median'] for r in V['runs']['vllm_so_schema_c4']], 0),
    'vl_so_free': two([r['ms_per_tok_median'] for r in V['runs']['vllm_so_free_c4']], 0),
    'lo_same': two(sorted(round(x) for x in lr('lora_same_c8', lambda r: r['out_tok_per_s'])), 0),
    'lo_none': rng(lr('noadapters_c8', lambda r: r['out_tok_per_s']), 0), 'lo_d2': rng(lr('lora_distinct2_c8', lambda r: r['out_tok_per_s']), 0),
    'lo_d48': rng(lr('lora_distinct4_c8', lambda r: r['out_tok_per_s']) + lr('lora_distinct8_c8', lambda r: r['out_tok_per_s']), 0),
    'lo_c1': rng(lr('lora_same_c1', lambda r: r['out_tok_per_s']), 0),
    'lo_base': two(sorted(round(x) for x in lr('lora_base_c8', lambda r: r['out_tok_per_s'])), 0),
    'lo_zero': two(sorted(round(x) for x in lr('lora_zero_c8', lambda r: r['out_tok_per_s'])), 0),
    'so_c1_schema': two(lr('so_schema_c1', lambda r: r['ms_per_tok_median']), 1, ' ms'), 'so_c1_free': two(lr('so_free_c1', lambda r: r['ms_per_tok_median']), 1, ' ms'),
    'so_c4_schema': two(lr('so_schema_c4', lambda r: r['ms_per_tok_median']), 1, ' ms'), 'so_c4_free': two(lr('so_free_c4', lambda r: r['ms_per_tok_median']), 1, ' ms'),
    'so_free_strict': f"{sum(r['valid'] for k in ('so_free_c1', 'so_free_c4') for r in L[k])} of {sum(r['reqs'] for k in ('so_free_c1', 'so_free_c4') for r in L[k])}",
    'so_schema_valid': f"{sum(r['valid'] for k in ('so_schema_c1', 'so_schema_c4') for r in L[k])} of {sum(r['reqs'] for k in ('so_schema_c1', 'so_schema_c4') for r in L[k])}",
    'co_open_over1': two([r['over1s'] for r in CO['poisson_yes']], 0), 'co_closed_over1': two([r['over1s'] for r in CO['closed_yes']], 0),
    'co_closed_p50': two([r['e2e_p50'] for r in CO['closed_yes']], 2, ' s'), 'co_open_p50': two([r['e2e_p50'] for r in CO['poisson_yes']], 2, ' s'),
    'co_closed_p90': two([r['e2e_p90'] for r in CO['closed_yes']], 2, ' s'), 'co_corr_p90': two([r['corr']['p90'] for r in CO['closed_yes']], 2, ' s'),
    'hq_n': str(page['hq']['n']), 'hq_exact': f"{page['hq']['exact_p99']:.2f} s", 'hq_hist': f"{page['hq']['hist_p99']:.2f} s",
    'lc_metric_names': ', '.join(n.replace('llamacpp:', '') for n in M['lc_metrics']),
}
for k, txt in spans.items():
    if k not in want:
        print('NO CHECK FOR', k, txt); bad += 1
    elif re.sub(r'<[^>]+>', '', txt) != want[k]:
        print('PROSE MISMATCH', k, repr(txt), 'want', repr(want[k])); bad += 1
for k in want:
    if k not in spans:
        print('UNUSED CHECK', k)
# the parent's toy figure, the Router lab's "within about 2 points" claim
r1 = {p: C[p][0]['hit'] for p in RS['pol']}
gap = max(abs(RS['hit'][f'{p}_3_128'] - r1[p]) for p in RS['pol'])
print('route_sim 2,048-token cache vs measured repeat 1: max gap %.1f points' % (100 * gap))
if gap > 0.021:
    print('CLAIM FAILS: within about 2 points'); bad += 1
print(len(spans), 'prose numbers checked;', 'OK' if not bad else 'FAIL %d' % bad)
sys.exit(1 if bad else 0)
