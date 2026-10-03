"""Recompute every derived number the paper (and this page) states, from tables.json. Writes inputs/recompute.json.
Each check: claim, where, printed value, recomputed value, verdict (ok / differs / note)."""
import json, math
T = json.load(open('tables.json'))
C = []
def chk(claim, where, printed, got, tol=0.05, note=''):
    ok = (printed is None) or (isinstance(printed, (int, float)) and abs(printed - got) <= tol) or printed == got
    C.append({'claim': claim, 'where': where, 'printed': printed, 'got': got, 'ok': bool(ok), 'note': note})
    return got
r1 = lambda x: round(x + 1e-9, 1)
row = {r['model']: r['v'] for r in T['t2']}
cols = T['t2cols']
avg = lambda v: sum(v) / len(v)
G, GJ, F, FJ, PRO, GPT = row['GLM-5.2'], row['JIT-Agent + GLM-5.2'], row['DeepSeek-V4-Flash'], row['JIT-Agent + DeepSeek-V4-Flash'], row['DeepSeek-V4-Pro'], row['GPT-5.6']
chk('GLM-5.2 nine-benchmark average, vanilla', '§5.2', 74.1, r1(avg(G)))
chk('GLM-5.2 nine-benchmark average, with JIT-Agent', '§5.2', 81.8, r1(avg(GJ)))
chk('GLM-5.2 average gain', '§5.2', 7.7, r1(r1(avg(GJ)) - r1(avg(G))), note='difference of the rounded averages; from unrounded averages it is %.2f' % (avg(GJ) - avg(G)))
chk('DeepSeek-V4-Flash average, vanilla', '§5.2', 66.7, r1(avg(F)))
chk('DeepSeek-V4-Flash average, with JIT-Agent', '§5.2', 75.5, r1(avg(FJ)))
chk('DeepSeek-V4-Flash average gain', '§5.2', 8.8, r1(avg(FJ) - avg(F)))
gains = [b - a for a, b in zip(G, GJ)] + [b - a for a, b in zip(F, FJ)]
chk('All 18 matched pairs improve', '§5.2', 18, sum(g > 0 for g in gains))
lab = [('GLM-5.2', c) for c in cols] + [('DeepSeek-V4-Flash', c) for c in cols]
chk('Smallest of the 18 gains (points)', 'derived', None, r1(min(gains)), note='%s on %s' % lab[gains.index(min(gains))])
chk('DeepPlanning-Shopping gain, V4-Flash', '§5.2', 24.8, r1(FJ[5] - F[5]))
chk('DeepPlanning-Travel gain, GLM-5.2 ("up to +20.2")', 'abstract, §5.2', 20.2, r1(GJ[6] - G[6]))
chk('Largest GLM-5.2 gain is Travel', 'abstract', 20.2, r1(max(b - a for a, b in zip(G, GJ))))
chk('xBench-DS gain, V4-Flash', '§5.2', 11.9, r1(FJ[2] - F[2]))
chk('DeepSearchQA gain, V4-Flash', '§5.2', 8.9, r1(FJ[1] - F[1]))
chk('xBench-DS gain, GLM-5.2 (v1 only)', 'v1 §1', 12.0, r1(GJ[2] - G[2]))
chk('AgentIF gain, GLM-5.2 (v1 only)', 'v1 §1', 6.9, r1(GJ[3] - G[3]))
chk('V4-Flash + JIT over GPT-5.6, DeepSearchQA', 'abstract', 9.1, r1(FJ[1] - GPT[1]))
chk('V4-Flash + JIT over GPT-5.6, OdysseyBench', 'abstract', 4.3, r1(FJ[8] - GPT[8]))
chk('V4-Flash + JIT over GPT-5.6, PinchBench (v1 only)', 'v1 §1', 8.7, r1(FJ[4] - GPT[4]))
beats = [cols[i] for i in range(9) if FJ[i] > GPT[i]]
chk('Benchmarks where V4-Flash + JIT beats GPT-5.6', 'derived', None, len(beats), note=', '.join(beats) + '; it loses on ' + ', '.join(cols[i] for i in range(9) if FJ[i] <= GPT[i]))
chk('V4-Flash + JIT average against GPT-5.6 average', 'derived', None, r1(avg(FJ) - avg(GPT)), note='GPT-5.6 average %.1f' % avg(GPT))
lead = [max(T['t2'], key=lambda r: r['v'][i])['model'] for i in range(9)]
chk('Columns led by a JIT-equipped system', '§5.2', 8, sum(m.startswith('JIT') for m in lead))
chk('Columns led by JIT-Agent + GLM-5.2', '§5.2', 7, sum(m == 'JIT-Agent + GLM-5.2' for m in lead))
chk('DeepPlanning-Travel: JIT + GLM-5.2 behind GPT-5.6 by', '§5.2', 1.9, r1(GPT[6] - GJ[6]))
chk('V4-Flash + JIT beats V4-Pro on every benchmark', '§5.2', 9, sum(a > b for a, b in zip(FJ, PRO)))
chk('V4-Flash + JIT minus V4-Pro, average', '§5.2', 8.7, r1(avg(FJ) - avg(PRO)))
chk('Vanilla V4-Pro below vanilla V4-Flash on', 'derived', None, sum(a < b for a, b in zip(PRO, F)), note='benchmarks: ' + ', '.join(cols[i] for i in range(9) if PRO[i] < F[i]) + ' (PinchBench 61.1 against 81.7)')

# ---------- Table 3 ----------
t3 = T['t3']; benches = ['DSQA', 'xBench', 'AgentIF']
best_n = 0; margins = {}; cheap = {}; red = []
for bb in ('DeepSeek-V4-Flash', 'Qwen3.6-Flash'):
    rs = [r for r in t3 if r['backbone'] == bb]; jit = [r for r in rs if r['harness'] == 'JIT-Agent'][0]; fixed = [r for r in rs if r['harness'] != 'JIT-Agent']
    for b in benches:
        bf = max(fixed, key=lambda r: r[b][0]); margins[(bb, b)] = r1(jit[b][0] - bf[b][0])
        best_n += jit[b][0] > bf[b][0]
        cf = min(fixed, key=lambda r: r[b][2]); tf = min(fixed, key=lambda r: r[b][1])
        cheap[(bb, b)] = (jit[b][2] < cf[b][2], jit[b][1] < tf[b][1])
        red.append(100 * (1 - jit[b][2] / cf[b][2]))
chk('Settings where JIT-Agent has the best score', '§5.3', 4, best_n)
chk('Margin over best fixed harness, V4-Flash DeepSearchQA', '§5.3', 4.7, margins[('DeepSeek-V4-Flash', 'DSQA')])
chk('Margin, V4-Flash xBench-DS', '§5.3', 4.0, margins[('DeepSeek-V4-Flash', 'xBench')])
chk('Margin, Qwen3.6-Flash xBench-DS', '§5.3', 7.0, margins[('Qwen3.6-Flash', 'xBench')])
chk('Margin, Qwen3.6-Flash AgentIF', '§5.3', 2.9, margins[('Qwen3.6-Flash', 'AgentIF')])
chk('Behind the best, V4-Flash AgentIF (Claude Code)', '§5.3', -3.1, margins[('DeepSeek-V4-Flash', 'AgentIF')])
chk('Behind the best, Qwen3.6-Flash DeepSearchQA (NanoBot)', '§5.3', -3.9, margins[('Qwen3.6-Flash', 'DSQA')])
chk('Lowest cost and lowest tokens in all six settings', '§5.3', 6, sum(a and b for a, b in cheap.values()))
chk('Cost cut against the cheapest fixed harness, smallest', '§5.3', 14.9, r1(min(red)))
chk('Cost cut, largest', '§5.3', 54.1, r1(max(red)))
chk('Cost cut, average of six', '§5.3', 36.0, r1(avg(red)))
q = {r['harness']: r for r in t3 if r['backbone'] == 'Qwen3.6-Flash'}
chk('NanoBot behind JIT on Qwen3.6-Flash AgentIF (v1)', 'v1 §6.3', 14.8, r1(q['JIT-Agent']['AgentIF'][0] - q['NanoBot']['AgentIF'][0]))
d = {r['harness']: r for r in t3 if r['backbone'] == 'DeepSeek-V4-Flash'}
chk('Figure 3: cost cut against NanoBot, V4-Flash DeepSearchQA', '§5.4', 49.6, r1(100 * (1 - d['JIT-Agent']['DSQA'][2] / d['NanoBot']['DSQA'][2])))
chk('Figure 3: cost cut against NanoBot, Qwen3.6-Flash DeepSearchQA', '§5.4', 51.8, r1(100 * (1 - q['JIT-Agent']['DSQA'][2] / q['NanoBot']['DSQA'][2])))
chk('Figure 3: cost cut against Claude Code, V4-Flash AgentIF', '§5.4', 14.9, r1(100 * (1 - d['JIT-Agent']['AgentIF'][2] / d['Claude Code']['AgentIF'][2])))
# implied price per million tokens, per row
price = {}
for r in t3:
    for b in benches:
        price[r['backbone'] + '|' + r['harness'] + '|' + b] = round(r[b][2] / r[b][1] * 1000, 3)
for bb in ('DeepSeek-V4-Flash', 'Qwen3.6-Flash'):
    ps = [v for k, v in price.items() if k.startswith(bb)]
    jp = [v for k, v in price.items() if k.startswith(bb + '|JIT')]
    chk('Implied price per million tokens, %s: fixed harnesses range' % bb, 'derived (cost / tokens)', None, '%.3f to %.3f' % (min(v for k, v in price.items() if k.startswith(bb) and '|JIT' not in k), max(v for k, v in price.items() if k.startswith(bb) and '|JIT' not in k)), note='JIT-Agent rows: ' + ', '.join('%.3f' % v for v in jp))
# Pareto frontiers (global, both backbones) on DSQA and AgentIF, as in Figure 3
front = {}
for b in ('DSQA', 'AgentIF'):
    pts = [(r[b][2], r[b][0], r['backbone'] + ' + ' + r['harness']) for r in t3]
    f = [p for p in pts if not any((o[0] <= p[0] and o[1] >= p[1]) and (o[0] < p[0] or o[1] > p[1]) for o in pts)]
    front[b] = sorted(f)
    chk('Pareto-optimal pairs on %s (Figure 3)' % b, '§5.4', None, len(f), note='; '.join('%s (%.1f at $%.3f)' % (n, s, c) for c, s, n in sorted(f)))

# ---------- Figure 4 ----------
F4 = T['fig4']; allg = [r['gain'] for v in F4.values() for r in v]
chk('Figure 4: JIT beats ReAct in all 24 pairs', '§5.5', 24, sum(g > 0 for g in allg))
chk('Figure 4: average gain', '§5.5', 7.6, r1(avg(allg)))
fam = lambda pre: r1(avg([r['gain'] for v in F4.values() for r in v if r['backbone'].startswith(pre)]))
chk('Figure 4: DeepSeek V4 family average', '§5.5', 10.2, fam('DeepSeek'))
chk('Figure 4: Qwen3.6 family average', '§5.5', 4.0, fam('Qwen'))
chk('Figure 4: Mimo-V2.5 family average', '§5.5', 8.6, fam('Mimo'))
chk('Figure 4: DeepSearchQA average gain', '§5.5', 15.2, r1(avg([r['gain'] for r in F4['DeepSearchQA']])))
chk('Figure 4: Mimo-V2.5-Pro DeepSearchQA gain', '§5.5', 22.2, [r['gain'] for r in F4['DeepSearchQA'] if r['backbone'] == 'Mimo-V2.5-Pro'][0])
chk('Figure 4: V4-Flash DeepSearchQA gain', '§5.5', 19.0, [r['gain'] for r in F4['DeepSearchQA'] if r['backbone'] == 'DeepSeek-V4-Flash'][0])
chk('Figure 4: Shopping average gain (v1 only)', 'v1 §6.5', 7.5, r1(avg([r['gain'] for r in F4['DeepPlanning-Shopping']])))
chk('Figure 4: largest Shopping gain (V4-Flash)', '§5.5', 24.8, max(r['gain'] for r in F4['DeepPlanning-Shopping']))
chk('Figure 4: OfficeBench average gain', 'derived', None, r1(avg([r['gain'] for r in F4['OfficeBench']])))
chk('Figure 4: AgentIF average gain', 'derived', None, r1(avg([r['gain'] for r in F4['AgentIF-Oneday']])))
# V4-Flash row of Figure 4 against Table 2
f4v = {k: [r for r in v if r['backbone'] == 'DeepSeek-V4-Flash'][0] for k, v in F4.items()}
idx = {'DeepSearchQA': 1, 'AgentIF-Oneday': 3, 'DeepPlanning-Shopping': 5, 'OfficeBench': 7}
same_j = sum(f4v[k]['jit'] == FJ[i] for k, i in idx.items()); same_r = sum(f4v[k]['react'] == F[i] for k, i in idx.items())
chk('Figure 4 (subsets) V4-Flash JIT scores identical to Table 2', 'derived', None, same_j, note='of 4; ReAct scores identical to Table 2 vanilla on %d of 4 (DeepSearchQA: 66.1 in Figure 4, 76.2 in Table 2)' % same_r)
pv = {k: [r for r in v if r['backbone'] == 'DeepSeek-V4-Pro'][0] for k, v in F4.items()}
chk('Figure 4 V4-Pro ReAct against Table 2 vanilla V4-Pro', 'derived', None, ', '.join('%s %.1f vs %.1f' % (k.split('-')[0], pv[k]['react'], PRO[i]) for k, i in idx.items()))

# ---------- granularity: can a score be k/N on the released set sizes? ----------
def reach(v, n): return any(abs(round(100 * k / n, 1) - v) < 1e-9 for k in range(n + 1))
gran = []
for name, i, n in (('xBench-DS', 2, 100), ('OfficeBench', 7, 295), ('OdysseyBench', 8, 300)):
    bad = [(r['model'], r['v'][i]) for r in T['t2'] if not reach(r['v'][i], n)]
    gran.append({'bench': name, 'n': n, 'table': 'Table 2', 'cells': len(T['t2']), 'unreachable': bad})
    chk('Table 2 %s scores that are not k/%d (one run on the released set)' % (name, n), 'derived', None, len(bad), note=', '.join('%s %.1f' % b for b in bad) or 'none')
bad3 = [(r['backbone'] + ' ' + r['harness'], r['xBench'][0]) for r in t3 if not reach(r['xBench'][0], 100)]
chk('Table 3 xBench-DS scores that are not k/100', 'derived', None, len(bad3), note='none' if not bad3 else str(bad3))
bad4 = [(r['backbone'], s) for r in F4['OfficeBench'] for s in (r['react'], r['jit']) if not reach(s, 50)]
gran.append({'bench': 'OfficeBench subset', 'n': 50, 'table': 'Figure 4', 'cells': 12, 'unreachable': bad4})
chk('Figure 4 OfficeBench scores that are not k/50 (its caption: 50-example subset)', 'derived', None, len(bad4), note=', '.join('%s %.1f' % b for b in bad4))

# ---------- noise: binomial standard errors where the metric is a success rate ----------
se = lambda p, n: 100 * math.sqrt(p / 100 * (1 - p / 100) / n)
noise = []
def z(a, b, n, label):
    s = math.sqrt(se(a, n) ** 2 + se(b, n) ** 2); noise.append({'label': label, 'a': a, 'b': b, 'n': n, 'diff': r1(b - a), 'se': round(s, 1), 'z': round((b - a) / s, 2)})
z(d['NanoBot']['xBench'][0], d['JIT-Agent']['xBench'][0], 100, 'Table 3, V4-Flash xBench-DS: JIT against NanoBot')
z(q['NanoBot']['xBench'][0], q['JIT-Agent']['xBench'][0], 100, 'Table 3, Qwen3.6-Flash xBench-DS: JIT against NanoBot')
z(F[2], FJ[2], 100, 'Table 2, V4-Flash xBench-DS: vanilla against JIT')
z(G[2], GJ[2], 100, 'Table 2, GLM-5.2 xBench-DS: vanilla against JIT')
z(F[7], FJ[7], 295, 'Table 2, V4-Flash OfficeBench: vanilla against JIT')
z(G[7], GJ[7], 295, 'Table 2, GLM-5.2 OfficeBench: vanilla against JIT')
z(F[8], FJ[8], 300, 'Table 2, V4-Flash OdysseyBench: vanilla against JIT')
z(G[8], GJ[8], 300, 'Table 2, GLM-5.2 OdysseyBench: vanilla against JIT')
z(GPT[8], FJ[8], 300, 'Table 2, OdysseyBench: GPT-5.6 against V4-Flash + JIT')
for r in F4['OfficeBench']: z(r['react'], r['jit'], 50, 'Figure 4, OfficeBench (50 tasks), ' + r['backbone'])
chk('Unpaired z of the GPT-5.6 against V4-Flash + JIT OdysseyBench gap', 'derived', None, noise[8]['z'])

# ---------- Figure 6 ----------
F6 = T['fig6']; f6 = {}
for b, v in F6.items():
    ca = v['cumulative_accuracy']
    e = lambda c: [p[1] for p in c if p[1] is not None][-1]
    mean = lambda c: avg([p[1] for p in c if p[1] is not None])
    f6[b] = {'acc_static_end': round(e(ca['static']), 1), 'acc_stream_end': round(e(ca['streaming']), 1),
             'cost_static_mean': round(mean(v['cost_usd']['static']), 3), 'cost_stream_mean': round(mean(v['cost_usd']['streaming']), 3),
             'tools_static_mean': round(mean(v['tool_calls']['static']), 1), 'tools_stream_mean': round(mean(v['tool_calls']['streaming']), 1), 'n_tasks': int(ca['static'][-1][0])}
    chk('Figure 6 %s: streaming ends above static' % b, 'Appendix B.1', None, round(f6[b]['acc_stream_end'] - f6[b]['acc_static_end'], 1), note='static %.1f, streaming %.1f; mean cost per task $%.3f vs $%.3f; tool calls %.1f vs %.1f; %d tasks' % (f6[b]['acc_static_end'], f6[b]['acc_stream_end'], f6[b]['cost_static_mean'], f6[b]['cost_stream_mean'], f6[b]['tools_static_mean'], f6[b]['tools_stream_mean'], f6[b]['n_tasks']))

out = {'checks': C, 'noise': noise, 'granularity': gran, 'fig6': f6, 'front': front, 'price': price,
       'summary': {'n': len(C), 'printed': sum(c['printed'] is not None for c in C), 'ok': sum(c['ok'] for c in C if c['printed'] is not None)}}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
for c in C:
    print(('  ' if c['ok'] else '!!'), c['claim'], '|', c['printed'], '->', c['got'], '|', c['note'])
print(out['summary'])
for n in noise: print(n)
