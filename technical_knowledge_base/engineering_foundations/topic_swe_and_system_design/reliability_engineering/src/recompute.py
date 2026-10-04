"""Recompute every number the page's JavaScript shows; writes recompute_out.json.

Sections: engine presets and 30 random lab settings (engine.py, the Python port of
parts/22_js_engine.js), nines and error budgets, burn-rate alerts, retry amplification,
fan-out tail, rate limiter comparison. check_engine.mjs runs the page's JS on the same
inputs and compares every number. Run: python3 recompute.py && node check_engine.mjs
"""
import json, math, random
import engine

PRESETS = {
    'm_none': {'att': 1, 'Ld': 28, 'Ls': 103},
    'm_naive': {'back': 'none', 'Ld': 28, 'Ls': 103},
    'm_backoff': {'back': 'full', 'Ld': 28, 'Ls': 103},
    'm_budget': {'back': 'full', 'budget': 1, 'Ld': 28, 'Ls': 103},
    'm_deadline': {'back': 'none', 'drop': 1, 'Ld': 28, 'Ls': 103},
    'm_shed': {'back': 'none', 'dmaxQ': 8, 'Ld': 28, 'Ls': 103},
    'before': dict(rate=100, pA=0.5, W=20, own=5, Tu=2000, Kd=1000, Ld=25, Ls=3000, Td=0, att=1, back='none', brk=0, fb=0, maxQ=0),
    'after': dict(rate=100, pA=0.5, W=20, own=5, Tu=2000, Kd=1000, Ld=25, Ls=3000, Td=100, att=1, back='none', brk=1, brkN=20, brkF=50, brkOpen=2000, brkHalf=5, fb=1, maxQ=40),
}
out = {'presets': PRESETS, 'engine': {}, 'random': []}
for k, c in PRESETS.items():
    out['engine'][k] = engine.sim(c)
R = random.Random(7)
for i in range(30):
    c = dict(seed=R.randint(1, 9), rate=R.choice([50, 100, 150, 250]), pA=R.choice([0.3, 0.5, 1]),
             W=R.choice([0, 10, 20, 50]), own=R.choice([0, 2, 5]), maxQ=R.choice([0, 20, 100]),
             Tu=R.choice([0, 1000, 3000]), Kd=R.choice([2, 4, 8, 1000]), dmaxQ=R.choice([0, 0, 8, 30]),
             Ld=R.choice([10, 25, 40]), Ls=R.choice([100, 400, 3000]), Td=R.choice([0, 50, 100, 300]),
             att=R.choice([1, 2, 3, 4]), back=R.choice(['none', 'full']), base=R.choice([25, 100]),
             budget=R.choice([0, 1]), brk=R.choice([0, 1]), brkN=R.choice([10, 20, 50]), brkF=R.choice([25, 50, 80]),
             brkOpen=R.choice([1000, 5000]), brkHalf=R.choice([3, 5]), fb=R.choice([0, 1]), drop=R.choice([0, 1]),
             slowTo=R.choice([12000, 15000, 25000]), T=20000 + 1000 * R.randint(0, 20))
    out['random'].append({'cfg': c, 'res': engine.sim(c)})

# ---- availability: downtime per year and per 30-day month (SRE book Appendix A uses 365 d and 30 d)
NINES = [0.99, 0.995, 0.999, 0.9995, 0.9999, 0.99999]
out['nines'] = [{'a': a, 'yr_min': round((1 - a) * 365 * 24 * 60, 2), 'mo_min': round((1 - a) * 30 * 24 * 60, 2),
                 'wk_min': round((1 - a) * 7 * 24 * 60, 2)} for a in NINES]
# chat product: 10M messages/day (root Step 6 estimate), SLO 99.9%, 30 days
out['budget_chat'] = {'per_day': round(10_000_000 * (1 - 0.999)), 'per_30d': round(10_000_000 * 30 * (1 - 0.999))}
# SRE book ch.3: 2.5M requests/day at 99.99% -> 250 errors
out['sre_250'] = round(2_500_000 * (1 - 0.9999))
# serial dependencies multiply: chain of the root's Numbers tab
chain = [0.9999, 0.999, 0.9995, 0.999, 0.995]
p = 1
for a in chain:
    p *= a
out['chain'] = round(p, 6)
# burn rate alerts (SRE workbook ch.5): budget share consumed = burn * window / period
WIN = 30 * 24
out['burn'] = [{'share': s, 'hours': h, 'burn': round(s * WIN / h, 2)} for s, h in [(0.02, 1), (0.05, 6), (0.10, 72)]]
# time to exhaust the whole budget at burn rate b: period / b
out['exhaust_h'] = {str(b): round(WIN / b, 1) for b in (1, 6, 14.4, 36)}
# retry amplification: each of n layers tries k times
out['amp'] = {'3^5': 3 ** 5, '4^3': 4 ** 3}
# fan-out tail (Dean and Barroso): 1 in 100 slow, 100 servers
out['fanout'] = round(1 - 0.99 ** 100, 4)

# ---- rate limiter comparison (parts/26_js_rd_rl.js)
def rl_trace():
    a = [100 + 200 * k for k in range(14)] + [2900 + 10 * k for k in range(10)] + [3000 + 10 * k for k in range(10)]
    a += [3300 + 200 * k for k in range(6)] + [4500 + 10 * k for k in range(25)] + [5000 + 200 * k for k in range(10)]
    return a


def rl_run(alg, L=10, WIN=1000):
    T = rl_trace(); acc = []; tokens = L; last = 0; lastRel = -1e9; cnt = {}; outs = []
    for t in T:
        ok = False; rel = t
        if alg == 'fixed':
            w = t // WIN; cnt[w] = cnt.get(w, 0)
            if cnt[w] < L:
                cnt[w] += 1; ok = True
        elif alg == 'log':
            ok = sum(1 for x in acc if x > t - WIN) < L
        elif alg == 'slide':
            w = t // WIN; cur = cnt.get(w, 0); prev = cnt.get(w - 1, 0)
            est = prev * (WIN - (t - w * WIN)) / WIN + cur
            if est < L:
                cnt[w] = cur + 1; ok = True
        elif alg == 'token':
            tokens = min(L, tokens + (t - last) * L / WIN); last = t
            if tokens >= 1:
                tokens -= 1; ok = True
        elif alg == 'leaky':
            waiting = sum(1 for x in acc if x > t)
            if waiting < L:
                rel = max(t, lastRel + WIN / L); lastRel = rel; ok = True
        if ok:
            acc.append(rel)
        outs.append((t, ok, rel))
    r = sorted(acc); mx = 0
    for i in range(len(r)):
        j = i
        while j < len(r) and r[j] < r[i] + WIN:
            j += 1
        mx = max(mx, j - i)
    mw = max([o[2] - o[0] for o in outs if o[1]] + [0])
    return {'accepted': len(acc), 'rejected': len(T) - len(acc), 'busiest': mx, 'maxWait': mw}


out['rl'] = {a: rl_run(a) for a in ('fixed', 'log', 'slide', 'token', 'leaky')}
# illustrative postmortem: 23 min, 31% failing, 10M messages/day, budget 300,000 per 30 days
pm_failed = 10_000_000 / 1440 * 23 * 0.31
out['pm'] = {'failed': round(pm_failed), 'budget_share': round(pm_failed / 300000, 3)}

# ---- Error budget and alerts tab (parts/32_js_slo.js SLOC.run)
AL = [(14.4, 60, 5), (6, 360, 30), (1, 4320, 360)]


def slo_run(slo, rpd, e0, e, d, DAYS=28):
    M = DAYS * 1440; START = 14 * 1440; rpm = rpd / 1440; bud = (1 - slo) * rpd * DAYS
    pre = [0.0] * (M + 1)
    for t in range(M):
        pre[t + 1] = pre[t] + (e if START <= t < START + d else e0)

    def avg(t, w):
        a = max(0, t + 1 - w)
        return (pre[t + 1] - pre[a]) / (t + 1 - a)
    alerts = []
    for B, L, S in AL:
        th = B * (1 - slo); fire = None; reset = None
        for t in range(START, M):
            on = avg(t, L) >= th - 1e-12 and avg(t, S) >= th - 1e-12
            if fire is None:
                if on:
                    fire = t - START + 1
            elif not on:
                reset = t - START + 1
                break
        alerts.append({'fire': fire, 'reset': reset})
    spentInc = min(d, M - START) * e * rpm
    return {'budget': bud, 'burn': e / (1 - slo), 'spentInc': spentInc, 'incShare': spentInc / bud,
            'left': bud - pre[M] * rpm, 'alerts': alerts, 'formula14': (1 - slo) / e * 60 * 14.4 if e > 0 else None}


SLO_CASES = [(0.999, 1e7, 0.0002, 0.1, 5), (0.999, 1e7, 0.0002, 1.0, 30), (0.999, 1e7, 0.0002, 0.05, 180),
             (0.999, 1e7, 0.0002, 0.002, 5760), (0.9999, 1e7, 0.0002, 1.0, 30), (0.99, 1e6, 0.001, 0.1, 360)]
out['slo'] = [{'in': list(c), 'res': slo_run(*c)} for c in SLO_CASES]
json.dump(out, open('recompute_out.json', 'w'), separators=(',', ':'))
print('presets', {k: (round(v['tot']['success'], 4), v['tot']['recovery']) for k, v in out['engine'].items()})
print('nines', out['nines'])
print('slo', [(x['in'][3], x['in'][4], round(x['res']['incShare'], 4), [a['fire'] for a in x['res']['alerts']]) for x in out['slo']])
print('rl', out['rl'], 'pm', out['pm'])
print('budget', out['budget_chat'], 'chain', out['chain'], 'burn', out['burn'], 'exhaust', out['exhaust_h'], 'fanout', out['fanout'])
