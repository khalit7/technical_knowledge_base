"""Recompute every default the HTML reproduces. Run: python3 recompute.py
Sources: Anthropic pricing page (src/about-claude_pricing.md), page worked example (live.md),
AA snapshot (../../src/data/aa_snapshot.json, Intelligence Index v4.3), METR raw data (src/metr.yaml)."""
import json, math, datetime, yaml

# Prices: input, output, cache read, 5m write (= 1.25 x input), 1h write (= 2 x input). $/MTok. Pricing page, read 2026-10-01.
PR = {
 'Fable 5.1': (10, 50, 0.25), 'Fable 5': (10, 50, 1.00), 'Opus 5.5': (4, 20, 0.20), 'Opus 5': (5, 25, 0.50),
 'Sonnet 5.5': (2, 10, 0.20), 'Sonnet 4.6': (3, 15, 0.30), 'Haiku 4.5': (1, 5, 0.10), 'Opus 4.1': (15, 75, 1.50),
}

def fixed(m, P=100_000, T=50, N=5_000, O=2_000, cache=True):
    i, o, c = PR[m]; w = 1.25 * i
    if not cache:
        return T * ((P + N) * i + O * o) / 1e6
    return (P * w + T * (P * c + N * i + O * o)) / 1e6

print('== Fixed prefix (page worked example) ==')
for m in ['Fable 5.1', 'Fable 5', 'Opus 5.5', 'Opus 5', 'Sonnet 5.5', 'Haiku 4.5']:
    print(f'{m:11s} ${fixed(m):.4f}')
print('Fable 5.1 no cache', fixed('Fable 5.1', cache=False))
print('saving 5 -> 5.1', 1 - fixed('Fable 5.1') / fixed('Fable 5'))
print('Opus 5.5 vs Opus 5 same tokens', 1 - fixed('Opus 5.5') / fixed('Opus 5'))
i, o, c = PR['Fable 5']; print('Fable 5 per-turn cache share', 0.1 * c / (0.1 * c + 0.005 * i + 0.002 * o))
i, o, c = PR['Fable 5.1']; tt = 0.1 * c + 0.005 * i + 0.002 * o; print('Fable 5.1 cache share', 0.1 * c / tt, 'output share', 0.002 * o / tt)

def growing(m, P=100_000, T=50, N=5_000, O=2_000, win=1_000_000):
    """Automatic caching: each request writes what is new since the last request (previous output + new input)
    at the 5-minute write price and reads the rest. Output (thinking included) stays in context (keep-all models)."""
    i, o, c = PR[m]; w = 1.25 * i; tot = 0; full = None
    for t in range(1, T + 1):
        ctx = P + (t - 1) * (N + O) + N
        if ctx > win and full is None: full = t
        if t == 1: tot += (P + N) * w
        else: tot += (P + (t - 2) * (N + O) + N) * c + (O + N) * w
        tot += O * o
    return tot / 1e6, full

print('== Growing context ==')
for m in PR:
    print(f'{m:11s}', growing(m), 'window 200K:', growing(m, win=200_000)[1])

# Pricing page Managed Agents example: Opus 5, 50,000 in (40,000 cache reads), 15,000 out.
print('Managed agents example', (10_000 * 5 + 40_000 * 0.5 + 15_000 * 25) / 1e6, '+0.08 runtime')
# Break-even reads: write multiplier W, read multiplier r: W + r n < 1 + n
for W, r in [(1.25, .1), (2, .1), (1.25, .025), (2, .025), (1.25, .05)]:
    print('break-even', W, r, math.floor((W - 1) / (1 - r)) + 1)
# 45% saving: cached share s of Fable 5 cost that gives saving 0.75 s = 0.45
print('cache share of Fable 5 bill needed for 45%:', 0.45 / 0.75, 'for 25%:', 0.25 / 0.75)

print('== AA v4.3 ==')
d = json.load(open('../../src/data/aa_snapshot.json'))
rows = {r['aa_short_name']: r for r in d['rows']}
def split(r):
    I, O, C = r['index_tokens_input'], r['index_tokens_output'], r['cost_to_run_index']
    pi, po, pc = r['price_in'], r['price_out'], r['price_cached']
    outc = O * po / 1e6; inc = C - outc; f = (pi - inc * 1e6 / I) / (pi - pc)
    return outc, inc, f
for k, r in rows.items():
    if r['lab'] != 'Anthropic' and k not in ('GPT-6 Astra (max)', 'GPT-6.1 Sol (max)', 'Gemini 4 Argon (high)'): continue
    oc, ic, f = split(r)
    print(f"{k:40s} idx {r['aa_index']} cpt {r['aa_cost_per_index_task']} run {r['cost_to_run_index']} out$ {oc:.0f} ({oc/r['cost_to_run_index']:.0%}) in$ {ic:.0f} f {f:.3f}")
a = rows['Claude Opus 5.5 (medium with fallback)']; b = rows['GPT-6 Astra (max)']
print('Opus5.5 med / Astra max cost', a['aa_cost_per_index_task'] / b['aa_cost_per_index_task'], 'points', b['aa_index'] - a['aa_index'])
s, op = rows['Claude Sonnet 5.5 (max with fallback)'], rows['Claude Opus 5.5 (max with fallback)']
print('Sonnet max / Opus max: out tok', s['index_tokens_output'] / op['index_tokens_output'], 'in tok', s['index_tokens_input'] / op['index_tokens_input'], 'cost/task', s['aa_cost_per_index_task'] / op['aa_cost_per_index_task'])
for k in ['Claude Opus 5.5 (medium with fallback)', 'Claude Opus 5.5 (xhigh with fallback)', 'Claude Opus 5.5 (max with fallback)']:
    r = rows[k]; print(k, 'cpt x vs medium', r['aa_cost_per_index_task'] / a['aa_cost_per_index_task'], 'out tok x', r['index_tokens_output'] / a['index_tokens_output'])
sm = rows['Claude Sonnet 5.5 (medium with fallback)']
print('Sonnet max/medium cpt', s['aa_cost_per_index_task'] / sm['aa_cost_per_index_task'], 'pts', s['aa_index'] - sm['aa_index'])
# Fable 5.1 run re-priced with Fable 5's $1.00 cache read (same fitted cached share)
fr = rows['Claude Fable 5.1 (max with fallback)']; oc, ic, f = split(fr)
cached = fr['index_tokens_input'] * f
alt = fr['cost_to_run_index'] + cached * (1.00 - 0.25) / 1e6
print('Fable 5.1 run at Fable 5 cache price', alt, 'saving', 1 - fr['cost_to_run_index'] / alt)
# Price swap: Sonnet 5.5 max tokens at Opus 5.5 prices, keeping Sonnet's fitted cached share
oc, ic, f = split(s); I, O = s['index_tokens_input'], s['index_tokens_output']
sw = (O * 20 + I * ((1 - f) * 4 + f * 0.2)) / 1e6
print('Sonnet max tokens at Opus 5.5 prices: run', sw, 'x', sw / s['cost_to_run_index'])

print('== METR ==')
m = yaml.safe_load(open('inputs/metr.yaml'))
pts = []
for k, v in m['results'].items():
    pts.append((k, datetime.date.fromisoformat(str(v['release_date'])), v['metrics']['p50_horizon_length']['estimate'], v['metrics'].get('is_sota')))
def fit(sel):
    xs = [(dt - datetime.date(2019, 1, 1)).days for _, dt, _, _ in sel]; ys = [math.log2(p) for *_, p, _ in [(a, b, c, d) for a, b, c, d in sel]]
    ys = [math.log2(p) for _, _, p, _ in sel]
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    return 1 / (sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)), n
print('SOTA 2023+ <=16h', fit([p for p in pts if p[3] and p[1].year >= 2023 and p[2] <= 960]), 'METR 128.744')
print('SOTA all <=16h', fit([p for p in pts if p[3] and p[2] <= 960]), 'METR 187.778')
print('Claude only <=16h', fit([p for p in pts if 'claude' in p[0] and p[2] <= 960]))
print('Sonnet 4.5 notice days', (datetime.date(2026, 11, 30) - datetime.date(2026, 9, 30)).days)
