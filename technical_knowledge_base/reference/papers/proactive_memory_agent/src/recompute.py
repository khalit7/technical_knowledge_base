"""Recompute every derived number on the page from tables.json and inputs/traces.json; write inputs/recompute.json.
usage: python3 recompute.py   (build.sh runs it)"""
import json, math, os, statistics
from collections import Counter
os.chdir(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open('tables.json'))
TR = json.load(open('inputs/traces.json'))['tasks']
LB = json.load(open('inputs/injection_labels.json'))
R = {}

def count(p, n):
    """the whole number of tasks k whose share 100k/n prints as p (one decimal); and whether p is rounded or truncated."""
    ks = [k for k in range(n + 1) if abs(100 * k / n - p) < 0.1]
    assert len(ks) == 1, (p, n, ks)
    k = ks[0]; v = 100 * k / n
    rule = 'exact' if abs(v - p) < 1e-9 else ('rounded' if round(v + 1e-9, 1) == p else 'truncated')
    return k, rule

# Table 1: counts, deltas, task-weighted averages
t1 = []
for b, s, a, n, base, mem, d in T['T1']['rows']:
    if 'avg' in s: continue
    kb, rb = count(base, n); km, rm = count(mem, n)
    t1.append({'bench': b, 'split': s, 'actor': a, 'n': n, 'kb': kb, 'km': km, 'rb': rb, 'rm': rm, 'net': km - kb,
               'd_printed': d, 'd_counts': round(100 * (km - kb) / n, 2)})
R['t1'] = t1
for actor in ('Sonnet 4.5', 'Opus 4.6'):
    rows = [r for r in t1 if r['bench'] == 'τ²-Bench' and r['actor'] == actor]
    kb = sum(r['kb'] for r in rows); km = sum(r['km'] for r in rows)
    R['tau_avg_' + actor.split()[0]] = {'kb': kb, 'km': km, 'n': 278, 'base': 100 * kb / 278, 'mem': 100 * km / 278, 'net': km - kb}

# Table 2: counts, macro and micro recomputed
n2 = T['T2']['n']; t2 = []
for row in T['T2']['rows']:
    name, ks = row[0], [count(p, n) for p, n in zip(row[3:6], n2)]
    k = [x[0] for x in ks]
    micro = 100 * sum(k) / 278; macro = sum(100 * kk / nn for kk, nn in zip(k, n2)) / 3
    t2.append({'v': name, 'k': k, 'rules': [x[1] for x in ks], 'micro': micro, 'macro': macro, 'micro_p': row[7], 'macro_p': row[6], 'solved': sum(k)})
R['t2'] = t2
full2 = t2[1]['k']; full1 = [r['km'] for r in t1 if r['bench'] == 'τ²-Bench' and r['actor'] == 'Sonnet 4.5']
R['full_t1_vs_t2'] = {'t1': full1, 't2': full2, 'solved_t1': sum(full1), 'solved_t2': sum(full2), 'always': sum(t2[3]['k'])}

# Terminal-Bench and Qwen transfer
kq0, _ = count(37.6, 85); kq1, rq1 = count(41.1, 85)
R['qwen_tb'] = {'kb': kq0, 'km': kq1, 'rule': rq1, 'exact': 100 * kq1 / 85}

# noise: unpaired standard error of a difference; exact sign test (McNemar) bounds for a paired net gain
def se_diff(k1, k2, n):
    p1, p2 = k1 / n, k2 / n
    return 100 * math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n)
def mcnemar_p(w, l):
    D = w + l
    if D == 0: return 1.0
    tail = sum(math.comb(D, i) for i in range(max(w, l), D + 1)) / 2 ** D
    return min(1.0, 2 * tail)
def max_discordant(net):
    best = None
    for D in range(net, 400, 2):
        w = (D + net) // 2; l = D - w
        if mcnemar_p(w, l) < 0.05: best = D
    return best
noise = []
for lab, kb, km, n in [('TB Sonnet', 32, 39, 85), ('TB Opus', 37, 39, 85), ('TB Qwen (trained memory)', kq0, kq1, 85),
                       ('τ² Sonnet', R['tau_avg_Sonnet']['kb'], R['tau_avg_Sonnet']['km'], 278), ('τ² Opus', R['tau_avg_Opus']['kb'], R['tau_avg_Opus']['km'], 278)]:
    net = km - kb; se = se_diff(kb, km, n)
    noise.append({'k': lab, 'n': n, 'net': net, 'd': 100 * net / n, 'se': se, 'z': (100 * net / n) / se,
                  'p_best': mcnemar_p(net, 0), 'max_disc': max_discordant(net) if net > 0 else None})
R['noise'] = noise
# the same configuration run twice (Table 1 against Table 2): 172 against 170 solved
R['rerun_gap'] = sum(full1) - sum(full2)

# Sonnet with an Opus memory agent against Opus alone
R['sonnet_mem_vs_opus'] = {'tb': [45.9, 43.5], 'tau': [61.8, 66.2]}

# SETA: if reward were binary, how many validation tasks would each row imply?
R['seta_implied_n'] = [round(s / r, 1) for _, r, s, _ in T['T5']['rows']]

# ---- traces ----
cpt_samples = []
for t, v in TR.items():
    for run in ('base', 'mem'):
        cpt_samples.append(v[run]['first_user_chars'] / v[run]['turns'][0]['p'])
CPT = statistics.median(cpt_samples)
R['chars_per_token'] = {'median': CPT, 'min': min(cpt_samples), 'max': max(cpt_samples), 'n': len(cpt_samples)}
PRICE = {'sonnet_in': 3, 'sonnet_out': 15, 'opus_in': 5, 'opus_out': 25}  # USD per million tokens
tasks = {}
tot = Counter()
for t, v in TR.items():
    ma = v['ma']; inj = [x for x in ma['trig'] if x['inj']]
    mem_in = 2 * sum(x['pc'] for x in ma['trig']) / CPT          # Phase 1 and Phase 2 each send the bank plus the window
    mem_out = (sum(len(o[1]) for x in ma['trig'] for o in x['ops']) + sum(len(x['ctx'] or '<no_intervention/>') for x in ma['trig'])) / CPT
    base_cost = (v['base']['prompt'] * PRICE['sonnet_in'] + v['base']['completion'] * PRICE['sonnet_out']) / 1e6
    act_cost = (v['mem']['prompt'] * PRICE['sonnet_in'] + v['mem']['completion'] * PRICE['sonnet_out']) / 1e6
    mem_cost = (mem_in * PRICE['opus_in'] + mem_out * PRICE['opus_out']) / 1e6
    inj_tokens = sum(len(x['ctx']) for x in inj) / CPT
    labs = Counter(LB[t][str(x['s'])] for x in inj)
    assert len(LB[t]) == len(inj), t
    tasks[t] = {'base_turns': len(v['base']['turns']), 'mem_turns': len(v['mem']['turns']), 'base_prompt': v['base']['prompt'], 'mem_prompt': v['mem']['prompt'],
                'base_completion': v['base']['completion'], 'mem_completion': v['mem']['completion'],
                'max_ctx_mem': v['mem']['max_ctx'], 'max_ctx_base': max(x['p'] for x in v['base']['turns']),
                'triggers': len(ma['trig']), 'inject': len(inj), 'noop': len(ma['trig']) - len(inj), 'inj_rate': len(inj) / len(ma['trig']),
                'inj_chars_mean': (sum(len(x['ctx']) for x in inj) / len(inj)) if inj else 0, 'inj_tokens': inj_tokens,
                'mem_in_est': mem_in, 'mem_out_est': mem_out, 'base_cost': base_cost, 'act_cost': act_cost, 'mem_cost': mem_cost,
                'labels': dict(labs), 'bank_final': len(v['bank']['entries']),
                'edits': sum(1 for x in ma['trig'] for o in x['ops'] if o[0] in ('SAVE_KNOWLEDGE', 'SAVE_PROCEDURAL', 'DELETE', 'UPDATE_STATUS'))}
    for k in ('triggers', 'inject', 'noop', 'base_prompt', 'mem_prompt', 'mem_in_est', 'mem_out_est', 'base_cost', 'act_cost', 'mem_cost', 'inj_tokens', 'edits'):
        tot[k] += tasks[t][k]
    for k, c in labs.items(): tot['lab_' + k] += c
    tot['inj_chars'] += sum(len(x['ctx']) for x in inj)
R['traces'] = tasks
R['traces_total'] = dict(tot)
R['traces_total']['inj_rate'] = tot['inject'] / tot['triggers']
R['traces_total']['inj_chars_mean'] = tot['inj_chars'] / tot['inject']
R['traces_total']['mem_over_act_in'] = tot['mem_in_est'] / tot['mem_prompt']
R['traces_total']['cost_ratio'] = (tot['act_cost'] + tot['mem_cost']) / tot['base_cost']
R['traces_total']['mem_share_cost'] = tot['mem_cost'] / (tot['act_cost'] + tot['mem_cost'])
R['price'] = PRICE
json.dump(R, open('inputs/recompute.json', 'w'), indent=1, ensure_ascii=False)

if __name__ == '__main__':
    for r in t1: print('T1', r['bench'][:3], r['split'], r['actor'], r['kb'], '->', r['km'], r['rb'], r['rm'], 'Δ', r['d_printed'], r['d_counts'])
    print('tau avg', R['tau_avg_Sonnet'], R['tau_avg_Opus'])
    for r in t2: print('T2', r['v'], r['k'], r['rules'], 'micro %.2f (%s) macro %.2f (%s)' % (r['micro'], r['micro_p'], r['macro'], r['macro_p']), r['solved'])
    print('full T1 vs T2', R['full_t1_vs_t2'])
    print('qwen', R['qwen_tb'])
    for x in noise: print('noise', x)
    print('seta implied n', R['seta_implied_n'])
    print('cpt', R['chars_per_token'])
    for t, x in tasks.items(): print(t, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in x.items()})
    print('total', {k: (round(v, 3) if isinstance(v, float) else v) for k, v in R['traces_total'].items()})
