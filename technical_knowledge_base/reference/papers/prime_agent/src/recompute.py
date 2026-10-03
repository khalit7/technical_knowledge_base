"""Every derived number the page shows, and every check of the paper's numbers, recomputed from tables.json.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc). Plain Python, no dependencies.
usage: python3 recompute.py   (build.sh runs it after mk_tables.py)"""
import json, math

T = json.load(open('tables.json'))
R, CH = {}, []


def check(what, got, want, tol, where, note=''):
    ok = abs(got - want) <= tol
    CH.append({'what': what, 'got': got, 'want': want, 'ok': ok, 'where': where, 'note': note})
    return ok


# ---------- RHAE (ARC-AGI-3 paper, section 4.1) ----------
def level_score(a, h, cap=1.15, p=2, eq1=False):
    if a <= 0: return 0.0
    e = h / a
    return min(cap, e) ** p if eq1 else min(cap, e ** p)


def env_score(k, acts, base, cap=1.15, p=2, eq1=False, uniform=False):
    n = len(base)
    w = [1] * n if uniform else list(range(1, n + 1))
    s = [level_score(acts[i], base[i], cap, p, eq1) if i < k else 0.0 for i in range(n)]
    return min(sum(w[:k]) / sum(w), sum(wi * si for wi, si in zip(w, s)) / sum(w))


def total(card, **kw):
    return 100 * sum(env_score(g[0], g[1], b[1], **kw) for g, b in zip(card['g'], T['arc']['games'])) / len(T['arc']['games'])


games = T['arc']['games']
cards = T['arc']['cards']
R['arc_cards'] = []
for c in cards:
    t = total(c)
    check('RHAE recomputed for ' + c['name'], round(t, 4), c['printed'], 0.001, 'ARC scorecard ' + c['id'])
    per = [round(100 * env_score(g[0], g[1], b[1]), 4) for g, b in zip(c['g'], games)]
    assert all(abs(x - g[3]) < 1e-3 for x, g in zip(per, c['g'])), c['name']
    R['arc_cards'].append({'name': c['name'], 'rhae': round(t, 2), 'levels': sum(g[0] for g in c['g']),
                           'actions': sum(sum(g[1][:g[0] + (1 if g[0] < len(g[1]) else 0)]) for g in c['g']), 'actions_all': sum(sum(g[1]) for g in c['g'])})
prime = cards[0]
nlev = sum(len(b[1]) for b in games)
R['prime'] = {
    'rhae': round(total(prime), 2),
    'levels_done': sum(g[0] for g in prime['g']), 'levels_total': nlev,
    'games_done': sum(1 for g, b in zip(prime['g'], games) if g[0] == len(b[1])), 'games': len(games),
    'actions': sum(sum(g[1]) for g in prime['g']),
    'no_bonus': round(total(prime, cap=1.0), 2),
    'linear': round(total(prime, p=1), 2),
    'eq1_as_written': round(total(prime, eq1=True), 2),
    'uniform_weights': round(total(prime, uniform=True), 2),
    'at_cap': sum(1 for g, b in zip(prime['g'], games) for i in range(g[0]) if level_score(g[1][i], b[1][i]) >= 1.15 - 1e-9),
    'resets': sum(g[2] for g in prime['g']),
}
lf = [g for g, b in zip(prime['g'], games) if b[0] == 'lf52'][0]
R['prime']['lf52_l6'] = lf[1][5]
R['prime']['lf52_share'] = round(100 * lf[1][5] / R['prime']['actions'], 1)
check('Prime scorecard: 178 of 183 levels', R['prime']['levels_done'], 178, 0, 'scorecard total_levels_completed')
check('Prime scorecard: 11,245 actions', R['prime']['actions'], 11245, 0, 'scorecard total_actions')
# three runs reported in the blog
runs3 = [95.0, 95.2, 95.5]
R['three_runs'] = {'runs': runs3, 'mean': round(sum(runs3) / 3, 2), 'median': 95.2, 'best': 95.5}
check('Median of the three runs is the released card (95.2)', round(total(prime), 1), 95.2, 0.05, 'blog: "median score card ... (95.2%)"')
hum = [c for c in cards if c['name'].startswith('Human')][0]
check('"Human baseline 95.4%" is the Human Intelligence Harness card', round(total(hum), 2), 95.4, 0.06, 'Figure 5 legend; community leaderboard 95.35')
check('Figure 5 human line decoded', T['fig5']['refs']['Human baseline']['score'], 95.35, 0.02, 'Figure 5 vector line')
R['prime']['rank_on_board'] = 1 + sum(1 for c in cards[1:] if c['printed'] > 95.5)

# ---------- Figure 5 ----------
f5 = T['fig5']
def cross(series, y):
    for (x0, y0), (x1, y1) in zip(series, series[1:]):
        if y0 < y <= y1:
            return x0 if y1 == y0 else x0 * (x1 / x0) ** ((y - y0) / (y1 - y0))
    return None
op = f5['runs']['Prime Agent + Opus 5']
R['fig5'] = {
    'opus_end_tokens': round(op['tokens'][-1][0]), 'opus_end_cost': round(op['cost'][-1][0]),
    'opus_cross_30_tokens': round(cross(op['tokens'], 30.16)), 'opus_cross_30_cost': round(cross(op['cost'], 30.16)),
    'opus_ref_cost': f5['refs']['Opus 5, ARC harness']['cost'],
    'sol_end_tokens': round(f5['runs']['Prime Agent + GPT-5.6 Sol']['tokens'][-1][0]), 'sol_end_cost': round(f5['runs']['Prime Agent + GPT-5.6 Sol']['cost'][-1][0]),
    'sol_ref_cost': f5['refs']['GPT-5.6 Sol, ARC harness']['cost'],
    'hermes_end_cost': round(f5['runs']['Hermes Agent + GPT-5.6 Sol']['cost'][-1][0]),
    'sol_resp_end_tokens': f5['ref_token_points']['GPT-5.6 Sol, Responses API'][-1][0],
}
R['fig5']['opus_cost_ratio'] = round(R['fig5']['opus_ref_cost'] / R['fig5']['opus_end_cost'], 1)
R['fig5']['opus_x'] = round(95.5 / 30.2, 2)

# ---------- Table 1 ----------
rows = T['t1']['rows']
wins, small, per = 0, 0, {}
deltas = []
for name, _, _, v in rows:
    for m, (a, b) in enumerate([(0, 1), (2, 3), (4, 5)]):
        d = v[a] - v[b]
        deltas.append((name, m, round(d, 3)))
        per.setdefault(m, []).append(d)
        wins += d > 0
        small += abs(d) < 0.02
R['t1'] = {'pairs': len(deltas), 'wins': wins, 'within_002': small,
           'wins_by_model': [sum(1 for d in per[m] if d > 0) for m in range(3)],
           'mean_delta': [round(sum(per[m]) / len(per[m]), 3) for m in range(3)],
           'mean_delta_no_emu_no_oolong': [round(sum(per[m][i] for i in (1, 2, 3, 4, 5, 6, 7)) / 7, 3) for m in range(3)]}
check('Table 1: Prime ahead in 20 of 27 pairs', wins, 20, 0, 'Table 1 (this page counts)')
# LongBench v2: 503 questions (Bai et al. 2024); binomial SE of one score near 0.7, and of an unpaired difference
se = math.sqrt(0.7 * 0.3 / 503)
R['t1']['lbv2_se'] = round(se, 3); R['t1']['lbv2_se_diff'] = round(se * math.sqrt(2), 3)
blog = T['t1']['blog']
diff = [(r[0], i, r[3][i], blog[r[0]][i]) for r in rows for i in range(6) if abs(r[3][i] - blog[r[0]][i]) > 1e-9]
R['t1']['blog_diff'] = diff
check('Blog and paper Table 1 differ in exactly one cell (Codex, OOLONG)', len(diff), 1, 0, 'blog 5 Aug against arXiv 24 Aug')

# ---------- Figure 6 ----------
def binom_tail(k, n, p):
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))
f6 = T['fig6']
R['fig6'] = []
for x in f6:
    check('Figure 6 rate ' + x[0] + ' ' + x[1], round(100 * x[2] / x[3], 1), x[4], 0.051, 'Figure 6 label')
base = {}
for x in f6:
    if x[1] != 'Prime Agent':
        p = [y for y in f6 if y[0] == x[0] and y[1] == 'Prime Agent'][0]
        share = p[3] / (p[3] + x[3])
        pv = binom_tail(p[2], p[2] + x[2], share)
        R['fig6'].append({'model': x[0], 'vs': x[1], 'rate_ratio': round((p[2] / p[3]) / (x[2] / x[3]), 1), 'count_ratio': round(p[2] / x[2], 2), 'p_one_sided': round(pv, 4)})
check('"roughly six times more" (DeepSeek V4 Pro)', R['fig6'][0]['rate_ratio'], 6.3, 0.05, '§3.3, Figure 6')

# ---------- Figure 8 (PMPP-Hard) ----------
R['fig8'] = []
for i in (0, 2):
    a, b = T['fig8'][i], T['fig8'][i + 1]
    pa, pb = a[3] / 69, b[3] / 69
    se = math.sqrt(pa * (1 - pa) / 69 + pb * (1 - pb) / 69)
    R['fig8'].append({'model': a[0], 'diff_pts': round(100 * (pa - pb), 1), 'se_pts': round(100 * se, 1), 'tasks': a[3] - b[3]})
    check('Figure 8 percent ' + a[0] + ' Prime', round(100 * pa, 1), a[5], 0.051, 'Figure 8 label')
    check('Figure 8 percent ' + b[0] + ' ' + b[2], round(100 * pb, 1), b[5], 0.051, 'Figure 8 label')

# ---------- Figure 7 ----------
def reach(ser):
    top = ser[-1][1]
    for x, y in ser:
        if y >= top - 1e-9: return x, top
f7 = T['fig7']
R['fig7'] = {k: {n: reach(s) for n, s in v['series'].items()} for k, v in f7.items()}

# ---------- Figure 9 (Factorio) ----------
f9 = T['fig9']
act = f9['active']
area = sum((x1 - x0) * y0 for (x0, y0), (x1, _) in zip(act, act[1:]))
R['fig9'] = {'tokens_M': 23.4, 'reset_M': f9['reset_at_M'], 'techs': 24, 'subagents': 633, 'waves': 149,
             'per_wave': round(633 / 149, 2), 'mean_active': round(area / (act[-1][0] - act[0][0]), 2),
             'tokens_per_tech_M': round(23.4 / 24, 2),
             'tokens_per_subagent_k': round(23400 / 633, 1),
             'first_step_M': [x for x, v in f9['tech'] if v >= 5][0],
             'last_tech_M': f9['tech'][-1][0]}
check('633 subagents / 149 waves', R['fig9']['per_wave'], 4.25, 0.01, '§3.5')

# ---------- Figure 10 (MazeBench) at the $45 window ----------
def at45(ser):
    pts = [p for p in ser if p[0] <= 45.01]
    return pts[-1][1] if pts else None
R['fig10'] = {}
for pan, ss in T['fig10']['panels'].items():
    for k, s in ss.items():
        R['fig10'].setdefault(pan, {})[k] = {'at45': at45(s), 'last_x': s[-1][0], 'last_y': s[-1][1]}

R['checks'] = CH
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
bad = [c for c in CH if not c['ok']]
print('recompute: %d checks, %d fail' % (len(CH), len(bad)))
for c in bad: print('FAIL', c)
print(json.dumps({k: R[k] for k in ('prime', 'three_runs', 'fig5', 't1', 'fig6', 'fig8', 'fig7', 'fig9')}, indent=0)[:4000])
