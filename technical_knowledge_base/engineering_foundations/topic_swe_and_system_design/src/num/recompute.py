"""Recompute every number the Numbers to know tab derives, independently of the page's JavaScript, and compare.
1. Rebuilds the calculator's results for each drill from num_data.json with the same formulas, written out here
   in Python, and compares them with what the page computed (test_out.json, written by test_tab.mjs).
2. Recomputes the time-budget totals, the availability chain, the nines table and Little's law checks.
3. Checks the defaults that reproduce published figures (Twitter average and peak, Stack Overflow servers,
   Google's 250 errors and 26/27 minutes, SRE's 52.56 minutes) and prints which are independent.
Run: python3 build_data.py && (run test_tab.mjs) && python3 recompute.py"""
import json, math, os, sys
H = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(H, 'num_data.json')))
fails = []
def close(a, b, tol=1e-6, what=''):
    ok = (a == b) or (b != 0 and abs(a - b) / abs(b) < tol) or abs(a - b) < 1e-9
    if not ok: fails.append(f'{what}: {a} != {b}')
    return ok

def egress(gb):
    rest, prev, c = max(0, gb - 100), 0, 0.0
    for end, p in D['egress']['tiers']:
        cap = math.inf if end is None else end - prev
        take = min(rest, cap); c += take * p; rest -= take; prev = end
        if rest <= 0: break
    return c

def model(v):
    Hm = D['hours_month']; r = {}
    r['daily'] = v['dau'] * v['per']; r['avg'] = r['daily'] / 86400; r['peak'] = r['avg'] * v['peak']
    r['servers'] = math.ceil(r['peak'] / v['srv']) if v['srv'] > 0 else 0; r['srvCost'] = r['servers'] * v['srvp'] * Hm
    r['storeYr'] = v['dau'] * v['per'] * v['wfrac'] * v['wbytes'] * 365 * v['rep']
    r['bwAvg'] = r['avg'] * v['resp'] * 1000 * 8; r['gbMonth'] = r['avg'] * v['resp'] * 1000 * 86400 * 30 / 1e9; r['egress'] = egress(r['gbMonth'])
    r['outDay'] = v['dau'] * v['msgs'] * v['outtok']; r['outAvg'] = r['outDay'] / 86400; r['outPeak'] = r['outAvg'] * v['peak']
    r['perGpu'] = v['gtok'] * v['derate']; r['gpus'] = math.ceil(r['outPeak'] / r['perGpu']) if v['msgs'] > 0 and r['perGpu'] > 0 else 0
    r['gpuCost'] = r['gpus'] * v['gpup'] * Hm; r['outMonthM'] = r['outDay'] * Hm / 24 / 1e6
    r['costPerM'] = r['gpuCost'] / r['outMonthM'] if r['outMonthM'] > 0 else 0
    r['costPerMFull'] = v['gpup'] / (v['gtok'] * 3600) * 1e6 if v['gtok'] > 0 else 0
    r['total'] = r['srvCost'] + r['egress'] + r['gpuCost']; return r

exp = {}
for d in D['drills']:
    v = dict(D['defaults']); v.update(d['set']); exp[d['id']] = model(v)
print('Drills (recomputed):')
for k, r in exp.items():
    print(f"  {k:6s} avg {r['avg']:,.1f}/s peak {r['peak']:,.0f}/s servers {r['servers']} store {r['storeYr']/1e12:.2f} TB/yr "
          f"egress ${r['egress']:,.0f} gpus {r['gpus']} gpu ${r['gpuCost']:,.0f} $/M {r['costPerM']:.2f} (full {r['costPerMFull']:.2f}) total ${r['total']:,.0f}")

# published figures the drills check against
tw, so = exp['tw'], exp['so']
print('\nReproductions:')
print(f"  Twitter average {tw['avg']:,.0f}/s vs 'about 5,700' -> {tw['avg']/5700:.3f}x (independent)")
print(f"  Twitter peak {tw['peak']:,.0f}/s vs record 143,199 -> {tw['peak']/143199:.3f}x (by construction: peak factor 25 from the same post)")
print(f"  Stack Overflow servers {so['servers']} vs 9 (by construction: 539 req/s per server and peak factor 2 are back-solved)")
api = D['api']; ch = exp['chat']
print(f"  Chat $/M output tokens {ch['costPerM']:.2f} provisioned, {ch['costPerMFull']:.2f} fully busy; API range {api['out_lo']}-{api['out_hi']} "
      f"-> provisioned {'inside' if api['out_lo'] <= ch['costPerM'] <= api['out_hi'] else 'outside'}, fully busy {'inside' if api['out_lo'] <= ch['costPerMFull'] <= api['out_hi'] else 'outside'}")

# the chat drill's GPU throughput is the per-GPU 70B FP8 H100 figure (repo commit 8a9c66c), not the docs v0.21 total
row = next(g for g in D['thr']['gpu'] if g['lab'].startswith('Llama 3.3 70B FP8, 2 x H100'))
close(row['per'], 2209, what='70B FP8 H100 per GPU'); close(D['defaults']['gtok'], row['per'], what='calculator default = per-GPU figure')
close(next(d for d in D['drills'] if d['id'] == 'chat')['set']['gtok'], row['per'], what='chat drill = per-GPU figure')
close(D['defaults']['peak'], 2, what='peak factor 2 (Reading and simulator)')
print(f"  70B FP8 2xH100: {row['per']}/GPU (8a9c66c); docs v0.21 total 4,181.06 = {4181.06/2:.0f}/GPU; always-busy cost at $3.99 = ${3.99/(row['per']*3600)*1e6:.2f}/M")

# availability
Y = 525600
close(round((1 - 0.9999) * Y, 2), 52.56, what='SRE 99.99% minutes/year')
A = D['avail']; close(A['sre']['req_day'] * (1 - A['sre']['slo']), A['sre']['errors'], 1e-9, 'SRE 250 errors')
x9 = A['extra9']; deps = x9['deps'] * (1 - x9['dep_a']) * Y
close(round(deps), 26, what='extra-9 dependency minutes'); close(round((1 - x9['slo']) * Y - deps), 26, what='extra-9 remaining minutes (unrounded inputs)'); close(round((1 - x9['slo']) * Y) - round(deps), 27, what='extra-9 remaining, article rounding 53 - 26')
chain = math.prod(c['a'] for c in A['chain']); chain2 = math.prod(1 - (1 - c['a']) ** 2 for c in A['chain']); chain2n = math.prod(1 - (1 - c['a']) ** 2 for c in A['chain'][:4])
print(f"\nAvailability chain: {chain:.6f} ({(1-chain)*Y/1440:.2f} days/yr); all with 2 copies {chain2:.8f}; without model API {chain2n:.8f}")
print('  five parts at 99.9%:', round(0.999 ** 5 * 100, 2), '% (text says 99.5%)')

# Little's law on the local Postgres runs
pg = json.load(open(os.path.join(H, 'inputs', 'pg_local.json')))
for key, conc in (('select_only_1client', 1), ('select_only_8clients', 8)):
    pred = conc / (pg[key]['latency_ms'] / 1000); close(pred, pg[key]['tps'], 0.02, f"Little's law {key}")
    print(f"  Little's law {key}: {conc} / {pg[key]['latency_ms']} ms = {pred:,.0f}/s vs measured {pg[key]['tps']:,}")

# time budgets
def lay(lst):
    return sum(s['v'] for s in lst if s['lane'] != 'bg')
bud = {b['id']: (round(lay(b['before']), 2), round(lay(b['after']), 2)) for b in D['budget']}
print('\nTime budgets (before, after, ms):', bud)

# ladder derived values
dv = D['derived']
close(dv['decode_ms'], round(1000 / 267.81, 3), what='decode ms'); close(dv['prefill512_ms'], round(512 / 9918.34 * 1000, 2), what='prefill ms')
close(dv['decode_floor_ms'], round(3825807040 / 3.35e12 * 1000, 3), what='decode floor')
print(f"  decode floor {dv['decode_floor_ms']} ms, measured {dv['decode_ms']} ms ({dv['decode_floor_ms']/dv['decode_ms']*100:.0f}% of peak bandwidth); "
      f"Virginia-London {dv['km_va_lon']} km -> floor {dv['rtt_floor_va_lon_ms']} ms vs 78 measured")
print(f"  8B FP8 single-stream bound 3.35e12/8.03e9 = {3.35e12/8.03e9:.0f} tok/s; TRT-LLM 14,991.62 is {14991.62/(3.35e12/8.03e9):.1f}x")
print(f"  slow start: IW10 = {10*1460/1000:.1f} KB; 3 RTTs carry {10*1460*(1+2+4)/1000:.1f} KB")

# compare with the page
tp = os.path.join(H, 'test_out.json')
if os.path.exists(tp):
    T = json.load(open(tp))
    for k, r in exp.items():
        js = T['drills'].get(k)
        if not js: fails.append('no page result for drill ' + k); continue
        for key, val in r.items(): close(js[key], val, 1e-9, f'drill {k} {key}')
    for k, (b, a) in bud.items():
        close(T['budget'][k]['before'], b, 1e-6, f'budget {k} before'); close(T['budget'][k]['after'], a, 1e-6, f'budget {k} after')
    close(T['chain']['default'], chain, 1e-9, 'chain default'); close(T['chain']['all2'], chain2, 1e-9, 'chain 2 copies'); close(T['chain']['all2_noapi'], chain2n, 1e-9, 'chain no api')
    print('\nPage results compared with this recompute:', 'all match' if not fails else 'MISMATCHES')
else:
    print('\n(no test_out.json yet: run test_tab.mjs to compare with the page)')
for f in fails: print('FAIL', f)
sys.exit(1 if fails else 0)
