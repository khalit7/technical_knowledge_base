"""Every derived number on the page, recomputed from tables.json, inputs/figures.json and inputs/replay_stats.json.
Writes inputs/recompute.json (the checks table and the noise table on the page). Run from src/: python3 recompute.py"""
import json, math, re

T = json.load(open('tables.json'))
F = json.load(open('inputs/figures.json'))
RS = json.load(open('inputs/replay_stats.json'))
TXT = open('inputs/paper_v1.txt').read() + open('inputs/tables_v1.txt').read()
num = lambda s: float(str(s).replace(',', '').replace('%', '').replace('*', '').replace('k', ''))
checks, noise = [], []


def chk(claim, printed, got, ok, where, note=''):
    checks.append({'claim': claim, 'printed': printed, 'got': got, 'ok': ok, 'where': where, 'note': note})


# 0. every transcribed number occurs in the extracted paper text (provenance of tables.json)
miss = []
for k, t in T.items():
    if not isinstance(t, dict) or 'rows' not in t:
        continue
    for r in t['rows']:
        for c in r:
            for x in re.findall(r'\d[\d,]*\.?\d*', str(c)):
                if x not in TXT:
                    miss.append((k, x))
    for r in t.get('sd', []):
        for c in r:
            if c and c not in TXT:
                miss.append((k, c))
chk('Every number in tables.json appears in the extracted arXiv text', 'all', '%d missing' % len(miss), not miss, 'tables.json', str(miss[:5]))

# 1. the funnel (Table 12, Table 2, Table 14, the pipeline figure)
t12 = T['t12']['rows'][:-1]
traj = sum(num(r[3]) for r in t12); env = sum(num(r[4]) for r in t12)
chk('Source trajectories, Table 12 total', '359,593', '%d' % traj, traj == 359593, 'A1.T12')
chk('Reconstructed environments, Table 12 total', '68,263', '%d' % env, env == 68263, 'A1.T12')
chk('Dropped at replay ("insufficient replay complexity", pipeline figure)', '291,330', '%d' % (traj - env), traj - env == 291330, 'A1.F7')
ev = 38294 + 1900
chk('Retained after decontamination and repo deduplication = Table 2 pools', '40,194', '%d' % ev, ev == 40194, 'S4.T2')
chk('Removed by contamination filter and deduplication', '28,069', '%d' % (env - ev), env - ev == 28069, 'A1.F7')
t14 = T['t14']['rows']
tn = sum(num(r[1]) for r in t14 if r[4] == 'Terminal'); sn = sum(num(r[1]) for r in t14 if r[4] == 'SWE')
ts = sum(num(r[2]) for r in t14 if r[4] == 'Terminal'); ss = sum(num(r[2]) for r in t14 if r[4] == 'SWE')
chk('Table 14 terminal sources sum to Table 2 terminal pool', '38,294', '%d' % tn, tn == 38294, 'A2.T14')
chk('Table 14 SWE sources sum to Table 2 SWE pool', '1,900', '%d' % sn, sn == 1900, 'A2.T14')
chk('Terminal sufficiency after completion', '93.5%', '%.2f%% (%d of %d)' % (100 * ts / tn, ts, tn), round(100 * ts / tn, 1) == 93.5, 'S4.T2')
chk('SWE sufficiency after completion', '77.1%', '%.2f%% (%d of %d)' % (100 * ss / sn, ss, sn), round(100 * ss / sn, 1) == 77.1, 'S4.T2')
chk('SWE sufficient repositories (text of §6.7)', '1,464', '%d' % ss, ss == 1464, 'S6.SS7')
chk('Task-sufficient environments', '37,273 (abstract: 37.3k)', '%d' % (ts + ss), ts + ss == 37273, 'S4.SS2')
chk('Insufficient at the judge', '2,921', '%d' % (ev - ts - ss), ev - ts - ss == 2921, 'A1.F7')
chk('Terminal sufficient = Intent Recovery records = replay-only instances', '35,809', '%d' % ts, ts == 35809, 'S6.SS2')
for r in t14:
    p = 100 * num(r[2]) / num(r[1])
    chk('%s sufficiency' % r[0], r[3] + '%', '%.2f%%' % p, round(p, 1) == num(r[3]), 'A2.T14')
lfm_share = 34467 / 35809
chk('Share of sufficient terminal environments that come from LFM2-Terminal', '(not stated)', '%.1f%%' % (100 * lfm_share), True, 'A2.T14', 'derived')
# post-replay sufficiency in counts
chk('Terminal workspaces sufficient after replay alone', '40.2% of 38,294', 'about %d' % round(0.402 * 38294), True, 'S4.T2', 'derived')

# 2. the SFT corpus
c = 25386 + 3512 + 3079
chk('Full Mixture records = Single-WS + Cross-WS + Multi-Round', '31,977 (32.0k)', '%d' % c, c == 31977, 'S4.SS3')
chk('Single-WS environments with an accepted task', '25,386 of 35,809 terminal environments', '%.1f%%' % (100 * 25386 / 35809), True, 'S4.SS3', 'derived: one task launched per environment')
chk('Single-WS verifier keeps 25.4k of 35.1k records (Table 6)', '25.4k / 35.1k', '%.1f%%' % (100 * 25.4 / 35.1), True, 'S6.T6', 'derived')
chk('Cross-WS verifier keeps 3.5k of 7.1k records (Table 6)', '3.5k / 7.1k', '%.1f%%' % (100 * 3.5 / 7.1), True, 'S6.T6', 'derived')

# 3. headline deltas (Table 3, Table 4, Table 11)
t3 = {r[0]: r for r in T['t3']['rows']}
b, o = t3['Qwen3.5-27B'], t3['Terminal-Universe-27B']
for i, nm, pr in ((4, 'TB2.0', '+11.2'), (5, 'TB2.1', '+11.9'), (6, 'MT@4', '+13.8'), (7, 'Case score', '+8.3')):
    d = num(o[i]) - num(b[i])
    chk('%s gain over base' % nm, pr, '%+.1f' % d, abs(d - num(pr)) < 1e-9, 'S5.T3', '' if nm != 'Case score' else 'stated as 67.8 to 76.1')
chk('Claude Code gain on TB2.1 (58.2 vs base 47.8 in Table 4)', '+10.4', '%+.1f' % (58.2 - 47.8), round(58.2 - 47.8, 1) == 10.4, 'S5.SS2')
for tk in ('t4', 't11'):
    for r in T[tk]['rows']:
        a = (num(r[2]) + num(r[3])) / 2
        chk('%s %s average of the two scaffolds' % (T[tk]['title'].split(':')[0], r[0]), r[4], '%.2f' % a, abs(round(a + 1e-9, 1) - num(r[4])) < 1e-9, T[tk]['at'])
chk('Teacher gap: Qwen3.7-Max minus Terminal-Universe-27B on TB2.1', '(not stated)', '%.1f points' % (74.5 - 58.1), True, 'S5.T3', 'derived')
chk('Share of the base-to-teacher TB2.1 gap closed', '(not stated)', '%.0f%% (11.9 of %.1f)' % (100 * 11.9 / (74.5 - 46.2), 74.5 - 46.2), True, 'S5.T3', 'derived')
chk('Share of a completed terminal workspace written by the completion agent (means)', '(not stated)', '%.0f%% of files, %.0f%% of text lines' % (100 * (1 - 2.9 / 22.4), 100 * (1 - 90 / 5761)), True, 'A1.T13', 'derived: 1 - replayed/completed')
chk('Full Mixture against its parts on TB2.1', '58.1 vs Single+Cross 58.4', '%+.1f' % (58.1 - 58.4), True, 'S6.T7', 'Multi-Round adds nothing measurable on TB2.1')
chk('Full Mixture against Single-WS + Multi-Round on EvoCode MT@4', '20.1 vs 21.0', '%+.1f' % (20.1 - 21.0), True, 'S6.T9', 'Cross-WS adds nothing measurable on EvoCode')
chk('Share of the MT@4 gain already reached by Single-WS alone', '6.3 to 18.4 of 6.3 to 21.0', '%.0f%%' % (100 * (18.4 - 6.3) / (21.0 - 6.3)), True, 'S6.T9', 'derived')

# 4. Table 8 ratios, Figure 4 multipliers, Figure 5, Figure 6
for nm, a, bb, pr in (('assistant turns', 23, 14, '1.6×'), ('tool calls', 38, 20, '1.9×'), ('tokens per record', 46.5, 30.4, '1.5×')):
    chk('Cross-WS over Single-WS median %s' % nm, pr, '%.2f×' % (a / bb), round(a / bb, 1) == num(pr.replace('×', '')), 'S6.T8')
for nm, a, bb, pr in (('Terminal files', 22.4, 2.9, 7.7), ('SWE files', 37.9, 5.6, 6.8), ('Terminal text lines', 5761, 90, 64.0), ('SWE text lines', 6622, 595, 11.1), ('Terminal code lines', 503, 43, 11.7), ('SWE code lines', 6302, 487, 12.9)):
    chk('Figure 4 multiplier, %s (mean completed / mean replayed)' % nm, 'x%.1f' % pr, 'x%.2f' % (a / bb), round(a / bb, 1) == pr, 'S4.F4')
dom = F['fig5_domain']
top3 = sum(x['pct'] for x in dom[:3])
chk('Data processing + DevOps + Security domains ("over 80%")', '> 80%', '%.1f%%' % top3, top3 > 80, 'S4.F5')
f6 = F['fig6']
ncat = sum(x['n'] for x in f6[1:])
chk('Figure 6 categories shown (single-task categories omitted)', 'n=89 in all', '%d shown, so %d single-task categories omitted' % (ncat, 89 - ncat), True, 'S6.F6', 'derived')
gran = []
for x in f6[1:]:
    step = 100 / (6 * x['n'])
    k = x['delta'] / step
    gran.append((x['cat'], x['n'], x['delta'], round(k, 2)))
off = [g for g in gran if abs(g[3] - round(g[3])) > 0.06]
chk('Figure 6 deltas are whole task-runs (6 runs per task)?', 'implied', '%d of %d categories are not whole multiples of 100/(6n)' % (len(off), len(gran)), True, 'S6.F6', '; '.join('%s %+.1f = %.2f runs' % (g[0], g[2], g[3]) for g in off))

# 5. Figure 3 against the text
sh = {x['shape']: x['share'] for x in F['fig3']['shapes']}
kept = 100 - sh['Trailing failures, discarded (fewer than 2 passing rounds)']
chk('Figure 3 shares sum to 100%', '100%', '%.1f%%' % sum(sh.values()), abs(sum(sh.values()) - 100) < 0.05, 'S3.F3')
chk('Sessions kept by the round-level rule (Figure 3) against records retained (text)', '3,079 of 4,563 (67.5%)', '%.1f%% kept, about %d sessions' % (kept, round(kept / 100 * 4563)), False, 'S3.F3',
    'does not reproduce: 407 more sessions pass the rule than are retained; Appendix F mentions "length filtering", which may account for the gap, but the paper does not say')
rec = sh['One failure episode, recovered'] + sh['Multiple failure episodes, recovered']
chk('Retained sessions that contain a repaired failure', '69.6%', 'at least %.1f%% of kept sessions (recovered shapes only); 69.6%% needs most "trailing failure" sessions to also contain an earlier repair' % (100 * rec / kept), True, 'S3.F3', 'cannot be checked from the figure')

# 6. score granularity: TB scores are means over 89 tasks x 6 runs = 534 trials
reach = lambda v: any(round(100 * k / 534 + 1e-9, 1) == v for k in range(535))
tbv = sorted({num(x) for tk, cols in (('t4', (2, 3)), ('t5', (2,)), ('t6', (2,)), ('t7', (2,)), ('t10', (5,)), ('t11', (2, 3))) for r in T[tk]['rows'] for i in cols for x in [r[i]]} | {58.1, 52.8, 41.6})
bad = [v for v in tbv if not reach(v)]
chk('TB2.x scores are whole trials out of 534 (89 tasks × 6 runs)?', 'implied by §5.1', '%d of %d printed scores are not k/534' % (len(bad), len(tbv)), True, 'S5.SS1', 'unreachable: ' + ', '.join('%.1f' % v for v in bad) + '. Some trials are probably dropped (errors, timeouts); the paper does not say how they are counted')

# 7. our replay of LFM2-Terminal against Table 13
chk('Replayed terminal workspace, files (median / mean)', '2 / 2.9 (Table 13)', '%s / %s on %d seed-passing sampled trajectories (our replay.py)' % (RS['seed']['e0_files']['median'], RS['seed']['e0_files']['mean'], RS['seed_pass']), RS['seed']['e0_files']['median'] == 2, 'A1.T13', 'the median reproduces independently; the mean is lower. Our mapping of shell commands to reads is ours, the paper\'s is unreleased')
chk('Replayed terminal workspace, text lines (median / mean)', '60 / 90 (Table 13)', '%s / %s' % (RS['seed']['e0_lines']['median'], RS['seed']['e0_lines']['mean']), False, 'A1.T13', 'fewer lines: our replay misses reads done through pipes, editors or scripts')
chk('Seed filter pass rate on LFM2-Terminal', '46,037 environments from 139,841 (32.9%)', '%d of %d sampled (%.1f%%)' % (RS['seed_pass'], RS['n'], 100 * RS['seed_pass'] / RS['n']), False, 'A1.T12', 'close but lower; Table 12 may also count environments after other steps')

# 8. noise: differences in units of their standard error (sd = printed run-to-run spread; 6 TB runs, 4 EvoCode runs)
def z(name, a, sa, bb, sb, runs, where, paper):
    se = math.sqrt(sa ** 2 + sb ** 2) / math.sqrt(runs)
    noise.append({'cmp': name, 'a': a, 'b': bb, 'd': round(a - bb, 1), 'se': round(se, 2), 'z': round((a - bb) / se, 1), 'where': where, 'paper': paper})
z('Intent Recovery vs source trajectories (Terminus2-XML)', 52.9, 1.4, 40.3, 2.1, 6, 'S6.T4', 're-solving far outperforms imitating')
z('Source trajectories vs base (Terminus2-XML)', 40.3, 2.1, 46.2, 3.9, 6, 'S6.T4', 'not discussed: source SFT is worse than no SFT')
z('Source trajectories vs base (Claude Code)', 33.0, 3.9, 47.8, 2.0, 6, 'S6.T4', 'not discussed')
z('Replay + completion vs replay only', 52.9, 1.4, 48.7, 3.5, 6, 'S6.T5', 'agentic completion helps (+4.2)')
z('Replay only vs base', 48.7, 3.5, 46.2, 3.9, 6, 'S6.T5', 'replay-only still improves (+2.5)')
z('Single-WS with vs without verifier', 56.4, 2.6, 56.0, 3.3, 6, 'S6.T6', 'similar with fewer records')
z('Cross-WS with vs without verifier', 55.4, 2.7, 53.2, 2.1, 6, 'S6.T6', 'verifier filtering matters more for harder tasks')
z('Single-WS + Cross-WS vs Single-WS', 58.4, 2.1, 56.4, 2.6, 6, 'S6.T7', 'cross-workspace data adds useful supervision')
z('Environment vs query expansion', 56.0, 3.3, 53.8, 3.3, 6, 'S6.T10', 'environments produce the largest movement')
z('Environment expansion vs base pool', 56.0, 3.3, 53.2, 4.1, 6, 'S6.T10', 'from 53.2 to 56.0')
z('Query expansion vs base pool', 53.8, 3.3, 53.2, 4.1, 6, 'S6.T10', 'essentially unchanged')
z('SWE Intent Recovery vs base (Terminus2-XML)', 49.4, 1.6, 46.2, 3.9, 6, 'S6.T11', 'transfer from SWE to terminal')
z('SWE Intent Recovery vs base (Claude Code)', 50.6, 0.9, 47.8, 2.0, 6, 'S6.T11', 'both scaffolds move the same way')
z('Single-WS + Multi-Round vs Single-WS (Case score)', 76.9, 1.4, 71.9, 3.5, 4, 'S6.T9', 'multi-round data improves depth')
z('With vs without round verifier (Case score)', 76.9, 1.4, 73.2, 2.6, 4, 'S6.T9', 'round-level verification matters (-3.7)')
z('Full Mixture vs base, TB2.1 (Full Mixture spread not printed; base spread 3.9 used for both)', 58.1, 3.9, 46.2, 3.9, 6, 'S5.T3', '+11.9')

json.dump({'checks': checks, 'noise': noise, 'replay': RS}, open('inputs/recompute.json', 'w'), indent=1)
for c in checks:
    print(('OK  ' if c['ok'] else 'NO  ') + c['claim'] + ' | ' + c['printed'] + ' | ' + c['got'] + (' | ' + c['note'] if c['note'] else ''))
for n in noise:
    print('z %5.1f  d %+5.1f  se %.2f  %s' % (n['z'], n['d'], n['se'], n['cmp']))
