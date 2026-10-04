"""Write parts/22_js_data.js (window.CA) from the measured inputs/*.json and the dated price table in inputs/prices.json.
Run after any measurement: python3 build_data.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, 'inputs')


def load(n):
    p = os.path.join(I, n)
    return json.load(open(p)) if os.path.exists(p) else None


r4 = lambda x: None if x is None else round(x, 4)
CA = {}
sk = load('skew.json')
CA['skew'] = {k: sk[k] for k in ('pages', 'views', 'once', 'share_top', 'zipf_alpha_fit', 'rank_views', 'ideal_hit', 'top', 'hour', 'trace')}
CA['skew']['s01'] = sk['share_top']['0.1%']
CA['skew']['once_share'] = sk['once'] / sk['pages']
CA['skew']['n_top01'] = int(sk['pages'] * 0.001)
# share-of-views curve for the Lorenz-style chart: (share of pages, share of views), from the rank-views points is not enough;
# recompute from the ideal-hit points plus the published shares
CA['skew']['lorenz'] = [[0, 0]] + [[k / sk['pages'], v] for k, v in sk['ideal_hit']] + \
    [[f, sk['share_top'][k]] for k, f in (('0.1%', .001), ('1%', .01), ('10%', .1), ('20%', .2), ('50%', .5))] + [[1, 1]]
CA['skew']['lorenz'] += [[1 / sk['pages'], sk['top'][0]['views'] / sk['views']], [10 / sk['pages'], sum(t['views'] for t in sk['top']) / sk['views']]]
CA['skew']['lorenz'].sort()
s6 = load('skew6.json')
CA['skew6'] = {'hours': s6['hours'], 'overlap_mean': sum(h['top10k_overlap'] for h in s6['hours'][1:]) / (len(s6['hours']) - 1),
               'distinct_keys': s6['distinct_keys']}
ly = load('layers.json')
CA['layers'] = {'dict_ns': ly['dict_get_ns'], 'lru_ns': ly['lru_cache_hit_ns'], 'pagecache_us': ly['pagecache_pread_8k_ns'] / 1000}

ev = load('evict.json')
CA['ev'] = {'bytes_per_key': ev['bytes_per_key'], 'base_bytes': ev['base_bytes'], 'redis': ev['redis'],
            'runs': [[x['work'], x['policy'], x['cap_keys'], x['samples'], x['ttl'] or 0, r4(x['hit']), r4(x['hit_cheap']), r4(x['hit_exp']),
                      r4(x['exp_share']), x['keys_held'], x['maxmemory_mb'], x['set_errors'], x['evicted']] for x in ev['runs']],
            'cols': ['work', 'policy', 'cap', 'samples', 'ttl', 'hit', 'hit_cheap', 'hit_exp', 'exp_share', 'keys_held', 'mb', 'set_errors', 'evicted']}
sim = load('sim.json')
CA['sim'] = {'costs_ms': sim['costs_ms'], 'runs': [[x['work'], x['policy'], x['cap_keys'], r4(x['hit']), r4(x['hit_cheap']), r4(x['hit_exp']), r4(x['exp_share'])] for x in sim['runs']]} if sim else None


def ev_hit(work, pol, cap, samples=5, ttl=0):
    for x in CA['ev']['runs']:
        if x[0] == work and x[1] == pol and x[2] == cap and x[3] == samples and x[4] == ttl:
            return x
    return None


lru, lfu = ev_hit('wiki', 'allkeys-lru', 50000), ev_hit('wiki', 'allkeys-lfu', 50000)
noev = ev_hit('wiki', 'noeviction', 200000)
vol0 = [x for x in CA['ev']['runs'] if x[1] == 'volatile-lru' and x[4] == 0]
vol1 = [x for x in CA['ev']['runs'] if x[1] == 'volatile-lru' and x[4] == 3600]
CA['ev_note'] = {'lfu_gain_50k': round((lfu[5] - lru[5]) * 100, 1), 'noev_err_200k': noev[11],
                 'vol_nottl_err': vol0[0][11] if vol0 else None, 'vol_ttl_err': vol1[0][11] if vol1 else None}

pg = load('pg.json')
CA['pg'] = pg
CA['pg_note'] = {'read_us': round(pg['warm']['after_restart']['read_ms'] / pg['warm']['after_restart']['blks_read'] * 1000),
                 'mv_speedup': round(pg['mv']['raw_query']['median_ms'] / pg['mv']['mv_query']['median_ms']),
                 'memo_ratio': pg['memo']['planner_default']['ms_median'] / pg['memo']['nested_loop_memoize']['ms_median'],
                 'agg_over_get': round(pg['costs']['usage_aggregate']['median_ms'] / pg['costs']['redis_get']['median_ms'])}
race = load('race.json')
CA['race'] = race
sem = load('sem.json')
if sem:
    T = sem['thresholds']
    ms = {'mini': sem['models']['sentence-transformers/all-MiniLM-L6-v2'], 'bge': sem['models']['BAAI/bge-small-en-v1.5']}
    CA['sem'] = {'thresholds': T, 'qqp_pairs': sem['qqp_pairs'], 'qqp_dup_share': sem['qqp_dup_share'], 'paws_pairs': sem['paws_pairs'],
                 'paws_para_share': sem['paws_para_share'], 'hand_pairs': sem['hand_pairs'],
                 'paws_examples': [e for e in sem['paws_examples'] if e['a'] != e['b']][:4]}
    for k, m in ms.items():
        CA['sem'][k] = {'params': m['params'], 'dim': m['dim'], 'ms_per_query_single': m['ms_per_query_single'],
                        'qqp': {'tpr': [r4(v) for v in m['qqp_pairs']['tpr']], 'fpr': [r4(v) for v in m['qqp_pairs']['fpr']]},
                        'paws': {'tpr': [r4(v) for v in m['paws_pairs']['tpr']], 'fpr': [r4(v) for v in m['paws_pairs']['fpr']]},
                        'nn': {k2: [r4(v) for v in m['nearest'][k2]] for k2 in ('served', 'right', 'wrong_labelled', 'other_unlabelled')},
                        'nn_examples': m['nearest']['other_examples'][:6]}
    i90, i95 = T.index(0.9), T.index(0.95)
    CA['sem_note'] = {'mini_tpr90': ms['mini']['qqp_pairs']['tpr'][i90], 'mini_fpr90': ms['mini']['qqp_pairs']['fpr'][i90],
                      'mini_tpr95': ms['mini']['qqp_pairs']['tpr'][i95], 'mini_fpr95': ms['mini']['qqp_pairs']['fpr'][i95],
                      'bge_fpr90': ms['bge']['qqp_pairs']['fpr'][i90], 'mini_paws_fpr95': ms['mini']['paws_pairs']['fpr'][i95],
                      'nn_served90': ms['mini']['nearest']['served'][i90], 'nn_right90': ms['mini']['nearest']['right'][i90],
                      'nn_wrong90': ms['mini']['nearest']['wrong_labelled'][i90], 'nn_other90': ms['mini']['nearest']['other_unlabelled'][i90]}
CA['prices'] = load('prices.json')
CA['kv'] = load('kv.json')
js = '// generated by build_data.py from inputs/*.json: do not edit\nwindow.CA=' + json.dumps(CA, separators=(',', ':')) + ';\n'
open(os.path.join(H, 'parts', '22_js_data.js'), 'w').write(js)
print('22_js_data.js', len(js), 'bytes')
