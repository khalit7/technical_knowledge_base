"""Recompute every derived number the paper prints, and the page's own derived numbers, from tables.json.
Writes inputs/recompute.json (read by mk_paper.py into the page) and prints a check line per claim.
usage: python3 recompute.py   (build.sh runs it after mk_tables.py)"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
T = json.load(open('tables.json'))
def row(tab, ex, m, cur=None):
    for r in T[tab]['rows']:
        if r.get('exec') == ex and r['method'] == m and (cur is None or r.get('curator') == cur): return r['v']
    raise KeyError((tab, ex, m, cur))
Q, GM, GP = 'Qwen3-8B', 'Gemini-2.5-Pro', 'GPT-5.4'
COL = {'alf': 0, 'wss': 1, 'ws': 2}
claims = []
def claim(name, printed, value, where, tol=0.051):
    ok = abs(printed - value) <= tol
    claims.append({'claim': name, 'printed': printed, 'recomputed': round(value, 2), 'ok': ok, 'at': where})
def best_baseline(ex, c):
    bs = [r for r in T['t1']['rows'] if r['exec'] == ex and not r['method'].startswith('JitMem')]
    b = max(bs, key=lambda r: r['v'][c][0]); return b['v'][c][0], b['method'] + (' (' + b['curator'] + ')' if b['curator'] else '')
gains = {}
for ex in (Q, GM, GP):
    for k, c in COL.items():
        bv, bn = best_baseline(ex, c); jm = row('t1', ex, 'JitMem')[c][0]
        gains[ex + ' ' + k] = {'jitmem': jm, 'best': bv, 'best_name': bn, 'gain': round(jm - bv, 1)}
claim('ALFWorld gain over strongest baseline, Qwen3-8B executor', 16.2, gains[Q + ' alf']['gain'], 'S4.T1')
claim('WebShop SR gain, Qwen3-8B executor', 16.3, gains[Q + ' ws']['gain'], 'S4.T1')
claim('WebShop score gain, Qwen3-8B executor', 20.5, gains[Q + ' wss']['gain'], 'S4.T1')
claim('ALFWorld gain, Gemini executor', 6.0, gains[GM + ' alf']['gain'], 'S4.T1')
claim('WebShop score gain, Gemini executor', 5.0, gains[GM + ' wss']['gain'], 'S4.T1')
claim('WebShop SR gain, Gemini executor', 9.2, gains[GM + ' ws']['gain'], 'S4.T1')
claim('ALFWorld gain, GPT-5.4 executor', 8.8, gains[GP + ' alf']['gain'], 'S4.T1')
claim('WebShop score gain, GPT-5.4 executor', 10.7, gains[GP + ' wss']['gain'], 'S4.T1')
claim('WebShop SR gain, GPT-5.4 executor', 10.9, gains[GP + ' ws']['gain'], 'S4.T1')
t2 = {r['method'] + '|' + r['curator']: r['v'] for r in T['t2']['rows']}
best2 = max((v[4][0], k) for k, v in t2.items() if not k.startswith('JitMem'))
claim('tau2-bench micro gain over strongest baseline', 3.9, t2['JitMem-gpt|GPT-5.4'][4][0] - best2[0], 'S4.T2')
best2m = max(v[3][0] for k, v in t2.items() if not k.startswith('JitMem'))
claim('tau2-bench macro gain', 3.0, t2['JitMem-gpt|GPT-5.4'][3][0] - best2m, 'S4.T2')
best_tel = max(v[2][0] for k, v in t2.items() if not k.startswith('JitMem'))
claim('Telecom gain (+11.0)', 11.0, t2['JitMem-gpt|GPT-5.4'][2][0] - best_tel, 'S4.SS1')
# tau2 macro and micro averages from the per-domain SRs; tau2-bench task counts: airline 50, retail 114, telecom 114
N2 = (50, 114, 114); avg_chk = []
for k, v in t2.items():
    mac = sum(x[0] for x in v[:3]) / 3; mic = sum(n * x[0] for n, x in zip(N2, v[:3])) / sum(N2)
    avg_chk.append({'row': k, 'macro_printed': v[3][0], 'macro': round(mac, 2), 'micro_printed': v[4][0], 'micro': round(mic, 2)})
    lab = k.split('|')[0] + (' (' + k.split('|')[1] + ' curator)' if k.split('|')[1] else '')
    claim('tau2 macro average, ' + lab, v[3][0], mac, 'S4.T2', 0.06); claim('tau2 micro average (50/114/114 tasks), ' + lab, v[4][0], mic, 'S4.T2', 0.06)
# efficiency, Table 4
t4 = {r['method']: r['v'] for r in T['t4']['rows']}
red = lambda a, b: 100 * (1 - a / b)
claim('input tokens cut vs ReasoningBank (50.3%)', 50.3, red(t4['JitMem'][0], t4['ReasoningBank'][0]), 'S1')
claim('input tokens cut vs SkillOS-base (56.3%)', 56.3, red(t4['JitMem'][0], t4['SkillOS-base'][0]), 'S1')
claim('steps cut vs ReasoningBank (28.4%)', 28.4, red(t4['JitMem'][2], t4['ReasoningBank'][2]), 'S1')
claim('steps cut vs SkillOS-base (31.4%)', 31.4, red(t4['JitMem'][2], t4['SkillOS-base'][2]), 'S1')
claim('JitMem-base input tokens over no memory (1.9K)', 1.9, t4['JitMem-base'][0] - t4['No Memory'][0], 'S4.T4')
claim('ReasoningBank input tokens over no memory (10.7K)', 10.7, t4['ReasoningBank'][0] - t4['No Memory'][0], 'S4.T4')
claim('SkillOS-base input tokens over no memory (13.4K)', 13.4, t4['SkillOS-base'][0] - t4['No Memory'][0], 'S4.T4')
claim('JitMem-base steps cut vs ReasoningBank (18.5%)', 18.5, red(t4['JitMem-base'][2], t4['ReasoningBank'][2]), 'S4.T4')
claim('JitMem-base steps cut vs SkillOS-base (21.9%)', 21.9, red(t4['JitMem-base'][2], t4['SkillOS-base'][2]), 'S4.T4')
claim('RL: input tokens cut over JitMem-base (10.1%)', 10.1, red(t4['JitMem'][0], t4['JitMem-base'][0]), 'S4.T4')
claim('RL: output tokens cut (13.0%)', 13.0, red(t4['JitMem'][1], t4['JitMem-base'][1]), 'S4.T4')
claim('RL: steps cut (12.1%)', 12.1, red(t4['JitMem'][2], t4['JitMem-base'][2]), 'S4.T4')
# transfer
claim('transfer: trained over base, ALFWorld, Gemini (+6.2)', 6.2, row('t1', GM, 'JitMem')[0][0] - row('t1', GM, 'JitMem-base')[0][0], 'S4.SS1')
claim('transfer: trained over base, ALFWorld, GPT-5.4 (+7.4)', 7.4, row('t1', GP, 'JitMem')[0][0] - row('t1', GP, 'JitMem-base')[0][0], 'S4.SS1')
claim('transfer: trained over base, WebShop SR, Gemini (+6.1)', 6.1, row('t1', GM, 'JitMem')[2][0] - row('t1', GM, 'JitMem-base')[2][0], 'S4.SS1')
claim('transfer: trained over base, WebShop SR, GPT-5.4 (+6.1)', 6.1, row('t1', GP, 'JitMem')[2][0] - row('t1', GP, 'JitMem-base')[2][0], 'S4.SS1')
claim('transfer gap (1.4)', 1.4, 88.1 - row('t1', GP, 'JitMem')[0][0], 'S4.T3')
claim('untrained JitMem-gemini WebShop SR (61.0)', 61.0, row('t1', GM, 'JitMem-gemini')[2][0], 'S1')
claim('SkillOS-gemini WebShop SR (41.0)', 41.0, row('t1', GM, 'SkillOS-gemini')[2][0], 'S1')
# ablations, Table 9: drops of each ablation from its parent, per executor
def t9(ex, m, cur=None):
    out = []
    for r in T['t9']['rows']:
        if r['exec'] == ex and r['method'] == m: out.append(r)
    return out
abl = {}
for ex in (Q, GM, GP):
    rows = [r for r in T['t9']['rows'] if r['exec'] == ex]
    parent = None
    for r in rows:
        if r['method'] in ('JitMem-base', 'JitMem'): parent = r; continue
        if r['method'].startswith('w/') and parent:
            key = parent['method'] + ' ' + r['method']
            d = [None if (a is None or b is None) else round(b[0] - a[0], 1) for a, b in zip(r['v'], parent['v'])]
            abl.setdefault(key, {})[ex] = d
def rng(key, c):
    xs = [v[c] for v in abl[key].values() if v[c] is not None]; return min(xs), max(xs)
for key, c, lo, hi, label in [('JitMem-base w/o task adaptivity', 0, None, 3.1, 'up to 3.1 ALFWorld'), ('JitMem-base w/o task adaptivity', 2, None, 4.6, 'up to 4.6 WebShop'),
                              ('JitMem w/o task adaptivity', 0, None, 11.4, 'up to 11.4 ALFWorld'), ('JitMem w/o task adaptivity', 2, None, 10.4, 'up to 10.4 WebShop'),
                              ('JitMem-base w/o successful traj. filtering', 0, 1.5, 2.9, '1.5 to 2.9 ALFWorld'), ('JitMem-base w/o successful traj. filtering', 2, 2.3, 3.4, '2.3 to 3.4 WebShop'),
                              ('JitMem-base w/o raw traj.', 0, 1.7, 2.9, '1.7 to 2.9 ALFWorld'), ('JitMem-base w/o raw traj.', 2, 6.8, 8.2, '6.8 to 8.2 WebShop'),
                              ('JitMem w/o retrieved traj.', 0, None, 14.8, 'up to 14.8 ALFWorld'), ('JitMem w/o retrieved traj.', 2, None, 15.2, 'up to 15.2 WebShop')]:
    a, b = rng(key, c)
    claim('ablation %s: %s (max drop)' % (key, label), hi, b, 'S4.SS2')
    if lo is not None: claim('ablation %s: %s (min drop)' % (key, label), lo, a, 'S4.SS2')
t5 = {(r['exec'], r['method']): r['v'] for r in T['t5']['rows']}
claim('staged refresh SR, Qwen3-8B (+2.8)', 2.8, t5[(Q, 'w/ staged bank refresh')][1][0] - t5[(Q, 'JitMem')][1][0], 'S4.T5')
claim('staged refresh SR, GPT-5.4 (+0.9)', 0.9, t5[(GP, 'w/ staged bank refresh')][1][0] - t5[(GP, 'JitMem')][1][0], 'S4.T5')
claim('warm start: largest SR change (at most 1.3)', 1.3, max(abs(t5[(e, 'w/ test bank warm-starting')][1][0] - t5[(e, 'JitMem')][1][0]) for e in (Q, GM, GP)), 'S4.T5')
t8 = {(r['exec'], r['method']): r['v'] for r in T['t8']['rows']}
kmax = max(abs(t8[(e, 'k = 5')][1][0] - t8[(e, 'k = 3')][1][0]) for e in (Q, GM, GP))
claim('k = 3 against k = 5: largest SR change (under 2)', 1.9, kmax, 'A2.T8', 0.1)
# SkillOS's own claims reused in the text: 61.2 vs 55.7 etc. are table lookups; Table 1 and Table 9 must agree
mism = []
for r in T['t1']['rows']:
    m = [x for x in T['t9']['rows'] if x['exec'] == r['exec'] and x['method'] == r['method'] and x['curator'] == r['curator']]
    if m and m[0]['v'] != r['v']: mism.append(r['method'])
# --- the page's own derived numbers ---
def se_gap(a, b, na=3, nb=3): return math.sqrt(a[1] ** 2 / na + b[1] ** 2 / nb)
sig = []
for ex, c, cname in [(Q, 0, 'ALFWorld SR'), (Q, 2, 'WebShop SR'), (GM, 0, 'ALFWorld SR'), (GM, 2, 'WebShop SR'), (GP, 0, 'ALFWorld SR'), (GP, 2, 'WebShop SR')]:
    j = row('t1', ex, 'JitMem')[c]; g = gains[ex + ' ' + {0: 'alf', 2: 'ws'}[c]]
    b = [r for r in T['t1']['rows'] if r['exec'] == ex and not r['method'].startswith('JitMem') and r['v'][c][0] == g['best']][0]['v'][c]
    s = se_gap(j, b); sig.append({'exec': ex, 'metric': cname, 'gap': g['gain'], 'vs': g['best_name'], 'se': round(s, 2), 'z': round(g['gain'] / s, 1)})
j, b = t2['JitMem-gpt|GPT-5.4'][4], t2[best2[1]][4]; s = se_gap(j, b, 4, 4)
sig.append({'exec': GP, 'metric': 'tau2 micro SR', 'gap': round(j[0] - b[0], 1), 'vs': best2[1].replace('|', ' (') + ')', 'se': round(s, 2), 'z': round((j[0] - b[0]) / s, 1)})
# decomposition of the headline cells: no memory -> untrained read-time -> RL without retrieval -> RL with retrieval
dec = {}
for ex in (Q, GM, GP):
    for c, k in ((0, 'alf'), (2, 'ws'), (1, 'wss')):
        nm = row('t1', ex, 'No Memory')[c][0]; base = row('t1', ex, 'JitMem-base')[c][0]; full = row('t1', ex, 'JitMem')[c][0]
        nr = [r for r in T['t9']['rows'] if r['exec'] == ex and r['method'] == 'w/o retrieved traj.'][0]['v'][c][0]
        sk = [r for r in T['t1']['rows'] if r['exec'] == ex and r['method'] == 'SkillOS']
        dec[ex + ' ' + k] = {'no_memory': nm, 'base': base, 'rl_no_retrieval': nr, 'full': full, 'skillos': sk[0]['v'][c][0] if sk else None,
                             'read_time_untrained': round(base - nm, 1), 'rl': round(full - base, 1), 'share_rl': round((full - base) / (full - nm), 3)}
# untrained read-time against untrained write-time with the same curator model
cells = []
for ex in (Q, GM, GP):
    for cur, jm in ((Q, 'JitMem-base'), (GM, 'JitMem-gemini'), (GP, 'JitMem-gpt')):
        jr = [r for r in T['t1']['rows'] if r['exec'] == ex and r['method'] == jm]
        if not jr: continue
        ws = [r for r in T['t1']['rows'] if r['exec'] == ex and not r['method'].startswith('JitMem') and r['curator'] == cur and not r['trained']]
        for c, k in ((0, 'ALFWorld SR'), (1, 'WebShop score'), (2, 'WebShop SR')):
            best = max(ws, key=lambda r: r['v'][c][0])
            cells.append({'exec': ex, 'curator': cur, 'metric': k, 'read': jr[0]['v'][c][0], 'write_best': best['v'][c][0], 'write_name': best['method'], 'n_write': len(ws),
                          'nomem': row('t1', ex, 'No Memory')[c][0], 'win': jr[0]['v'][c][0] > best['v'][c][0]})
for cur, jm in ((Q, 'JitMem-base'), (GP, 'JitMem-gpt')):
    ws = [(k, v) for k, v in t2.items() if k.endswith('|' + cur) and not k.startswith('JitMem')]
    bk, bv = max(ws, key=lambda kv: kv[1][4][0])
    cells.append({'exec': GP, 'curator': cur, 'metric': 'tau2 micro SR', 'read': t2[jm + '|' + cur][4][0], 'write_best': bv[4][0], 'write_name': bk.split('|')[0], 'n_write': len(ws), 'nomem': t2['No Memory|'][4][0], 'win': t2[jm + '|' + cur][4][0] > bv[4][0]})
# validation curves: size of the validation sets from score granularity
fig = T['fig']['series']
alf = fig['alfworld: Validation Success Rate']['values']; wsv = fig['webshop: Validation Success Rate']['values']
gran = {'alfworld_x140_max_offset': round(max(abs(v * 140 - round(v * 140)) for v in alf), 3), 'webshop_x100_max_offset': round(max(abs(v * 100 - round(v * 100)) for v in wsv), 3),
        'alfworld_x134_max_offset': round(max(abs(v * 134 - round(v * 134)) for v in alf), 3),
        'alf_first_last_peak': [alf[0], alf[-1], max(alf)], 'ws_first_last_peak': [wsv[0], wsv[-1], max(wsv), wsv.index(max(wsv)) * 5]}
# training budget
budget = {'episodes_per_run': 100 * 32 * 8, 'gpu_hours_alfworld': 21 * 8, 'gpu_hours_webshop': 27 * 8, 'alfworld_tasks_per_point': round(100 / 140, 3), 'webshop_tasks_per_point': 5}
copied = sum(c == 'skillos' for r in T['t1']['rows'] for c in r['src']); base_cells = sum(len(r['v']) for r in T['t1']['rows'] if not r['method'].startswith('JitMem'))
out = {'claims': claims, 'n_ok': sum(c['ok'] for c in claims), 'n': len(claims), 'gains': gains, 'tau2_avgs': avg_chk, 'ablations': abl, 'sig': sig, 'decomp': dec,
       'untrained': cells, 'untrained_wins': sum(c['win'] for c in cells), 'untrained_n': len(cells), 'val': gran, 'budget': budget,
       'copied_cells': copied, 'baseline_cells': base_cells, 't1_t9_mismatch': mism}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
for c in claims:
    if not c['ok']: print('MISMATCH', c)
print('claims reproduced %d of %d; Table 1/9 mismatches %s; untrained read-time wins %d of %d; copied cells %d of %d' % (out['n_ok'], out['n'], mism, out['untrained_wins'], out['untrained_n'], copied, base_cells))
for s in sig: print('sig', s)
for k, v in dec.items(): print('dec', k, v)
print('val', gran)
for c in cells:
    if not c['win']: print('loss', c)
