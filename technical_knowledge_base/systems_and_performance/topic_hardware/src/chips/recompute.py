# Python reference for every number the Chip atlas derives. Run: python3 recompute.py
# Writes expected.json; check_page.mjs compares the page's JavaScript against it.
import json, os
here = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(here, 'chips.json')))
C = {c['id']: c for c in D['chips']}
out = {}

# 1. Per-chip figures times the scale-up domain against the vendor's own rack or pod figure.
checks = []
for c in D['chips']:
    r = c.get('rack')
    if not r:
        continue
    n = c['dom'][1]
    for k, v in r.items():
        if k in ('mem',):
            mine = c['mem'] * n
        elif k == 'bw':
            mine = c['bw'] * n
        elif k == 'link':
            mine = (c['link'] or 0) * n
        else:
            mine = (c['peaks'].get(k) or 0) * n
        checks.append(dict(id=c['id'], field=k, n=n, per_chip_x_n=round(mine, 3), vendor=v, ratio=round(mine / v, 4)))
out['rack_checks'] = checks

# 2. Ridge point: dense peak FLOP/s divided by memory bandwidth, in FLOPs per byte.
ridge = {}
for c in D['chips']:
    row = {}
    for f in ('bf16', 'fp8', 'fp4', 'fp32'):
        p = c['peaks'].get(f)
        if p and c['bw']:
            row[f] = round(p * 1e12 / (c['bw'] * 1e12), 2)
    ridge[c['id']] = row
out['ridge'] = ridge

# 3. Peak dense BF16 PFLOP-hours per dollar from dated rental prices (peak, not achieved).
pp = {}
for c in D['chips']:
    for p in c.get('price', []):
        if p['unit'] in ('GPU-hour', 'chip-hour') and c['peaks'].get('bf16'):
            pp[c['id']] = round(c['peaks']['bf16'] / 1000 / p['usd'], 4)
out['pflop_hours_per_usd_bf16'] = pp

# 4. NVIDIA flagship generations relative to A100: compute (BF16 and lowest precision) against bandwidth.
gens = ['a100', 'h100', 'h200', 'b200', 'b300', 'rubin']
low = {}
for g in gens:
    pk = C[g]['peaks']
    lp = pk.get('fp4') or pk.get('fp8') or pk.get('bf16')
    low[g] = lp
out['gen_growth'] = [dict(id=g, bf16=round(C[g]['peaks']['bf16'] / C['a100']['peaks']['bf16'], 2),
                          low=round(low[g] / C['a100']['peaks']['bf16'], 2),
                          bw=round(C[g]['bw'] / C['a100']['bw'], 2),
                          mem=round(C[g]['mem'] / C['a100']['mem'], 2)) for g in gens]

# 5. The headline peel (before/after animation): vendor headline -> per chip -> dense -> BF16 dense.
def peel(head_tf, n, fmt, chip):
    # headline -> per chip -> the vendor's own dense figure in the headline format -> BF16 dense
    return dict(headline=head_tf, per_chip=round(head_tf / n, 2), dense=C[chip]['peaks'][fmt], bf16=C[chip]['peaks']['bf16'])
P = {
 'gb200_vs_h100': (peel(1440000, 72, 'fp4', 'gb200'), peel(3958, 1, 'fp8', 'h100')),
 'gb300_vs_dgxb200': (peel(1440000, 72, 'fp4', 'gb300'), peel(144000, 8, 'fp4', 'b200')),
 'v7pod_vs_gb300': (peel(42500000, 9216, 'fp8', 'tpu7x'), peel(1440000, 72, 'fp4', 'gb300')),
 'helios_vs_vr': (peel(2900000, 72, 'fp4', 'mi455x'), peel(3600000, 72, 'fp4', 'rubin')),
}
out['peel'] = {k: dict(a=a, b=b, headline_ratio=round(a['headline'] / b['headline'], 2), bf16_ratio=round(a['bf16'] / b['bf16'], 3)) for k, (a, b) in P.items()}

# 6. Chips needed just to hold the weights (and 16 bytes/parameter for mixed-precision Adam training state).
need = {}
for m in D['models']:
    for bpp in (2, 1, 0.5, 16):
        for cid in ('h100', 'h200', 'b200', 'b300', 'mi355x', 'tpuv6e', 'tpu7x', 'rtx5090'):
            gb = m['p'] * bpp
            need[f"{m['name']}|{bpp}|{cid}"] = -(-gb // C[cid]['mem'])
out['chips_for_weights'] = need

def AI(M, K, N, s):
    return 2 * M * K * N / (s * (M * K + K * N + M * N))
out['ai_lines'] = {f: [round(AI(1, 8192, 8192, s), 4), round(AI(64, 8192, 8192, s), 3), round(AI(4096, 4096, 4096, s), 2)] for f, s in (('bf16', 2), ('fp8', 1), ('fp4', 0.5))}
json.dump(out, open(os.path.join(here, 'expected.json'), 'w'), indent=1)
bad = [c for c in checks if abs(c['ratio'] - 1) > 0.02]
print('rack checks:', len(checks), 'off by more than 2%:', bad)
for k, v in out['peel'].items():
    print(k, 'headline ratio', v['headline_ratio'], 'BF16 dense ratio', v['bf16_ratio'])
for g in out['gen_growth']:
    print(g)
print('ridge bf16:', {k: v.get('bf16') for k, v in ridge.items()})
print('PFLOP-h per $:', pp)
