#!/usr/bin/env python3
"""Checks for the Reading tab: (1) the built page embeds exactly out/expected.json as window.RDH;
(2) every hand-written number in the Reading prose that comes from a computation matches the reference.
Run: python3 src/read/check/check_prose.py (after recompute.py and build.sh)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
READ = os.path.dirname(HERE)
page = open(os.path.join(READ, '..', '..', 'index.html'), encoding='utf-8').read()
E = json.load(open(os.path.join(READ, 'out', 'expected.json')))
m = re.search(r'window\.RDH=(\{.*?\});\n', page)
emb = json.loads(m.group(1))
ok = emb == E
print('embedded data equals expected.json:', ok)
bad = 0 if ok else 1
read = page[page.index('id="t-read"'):page.index('id="t-chips"')]
s, a, mem = E['step'], E['ar'], {x['id']: x for x in E['mem']}
U = {u['id']: u for u in E['tile']['units']}
R = {(r['name'], r['fmt']): r['ridge'] for r in E['ridge']}
P = {p['name']: p for p in E['price']}
ft = E['ft']['runs']
checks = [  # (text that must appear in the Reading tab, value it states, reference value, tolerance as a fraction)
    ('8,030,261,248 parameters', 8030261248, E['model']['N'], 0),
    ('524,288 tokens in all', 524288, s['tokens'], 0),
    ('2.53 &times; 10<sup>16</sup> FLOPs', 2.53e16, s['flops_6nd'], .003),
    ('128.5 GB of state', 128.5e9, s['states'], .001),
    ('16.06 GB of gradients', 16.06e9, s['bytes_bf16'], .001),
    ('take 64 seconds per step', 64, s['step_1gpu'], .01),
    ('8.0 s on 8 and 1.0 s on 64', 8.0, s['step_8gpu'], .01),
    ('8.0 s on 8 and 1.0 s on 64', 1.0, s['step_64gpu'], .01),
    ('about 102 GFLOP/s at 3.2 GHz', 102, U['cpu']['gflops_spec'], .01),
    ('measured 97.5 GFLOP/s', 97.5, U['cpu']['meas'], .001),
    ('5.01 TFLOP/s / 16 = 313 GFLOP/s', 313, U['m1g']['meas'], .002),
    ('a factor of 8.9', 8.9, E['m1']['gpu_peak'] / E['m1']['cpu_8'], .01),
    ('the 16 GPU cores at 5,008 GFLOP/s', 5008, E['m1']['gpu_peak'], .001),
    ('The H100 clock, 1.83 GHz', 1.83, E['tile']['h100_clock'], .002),
    ('about 3 times sooner', 3.24, U['cpu']['ns'] / U['m1g']['ns'], .01),
    ('4.8 ms, so at most about 209 tokens', 209, mem['h100']['tps'], .005),
    ('0.80 ms at batch 1, reading weights at 168 GB/s', 168, E['m1_linear']['b1_gbs'], .005),
    ('64 times the arithmetic took only 3.52 ms', 3.52, E['m1_linear']['b64_ms'], .003),
    ('1.07 GB', 1.07e9, 8192 * 131072, .005),
    ('ridge of 295', 295, R[('H100 SXM', 'BF16')], .005),
    ('A100 (153)', 153, R[('A100 SXM 80GB', 'BF16')], .005),
    ('B200 (281)', 281, R[('B200 (HGX)', 'BF16')], .005),
    ('FP8 is 562.5, at FP4 1,125', 562.5, R[('B200 (HGX)', 'FP8')], .001),
    ('announced Rubin falls further, to 182', 182, R[('Rubin (announced)', 'BF16')], .003),
    ('ridge 30.7', 30.7, R[('M1 Pro GPU (measured)', 'fp16')], .003),
    ('400 / 989.5 = 40.4%', .404, E['mfu_llama'], .002),
    ('13.9% <span class="der">derived</span>', .139, E['card']['implied_mfu'], .005),
    ('28.1 GB sent per GPU', 28.1e9, a['ring_factor'] * a['S'], .002),
    ('even the InfiniBand all-reduce (0.56 s)', .56, a['t']['ib'], .01),
    ('(62.5 ms on NVLink 4)', .0625, a['t']['nvlink'], .002),
    ('that is 255 ms', .255, a['pcie_2gpu'], .002),
    ('about 466,000', 466000, E['ladder']['gw_gpus'], .002),
    ('about 1,050 EF', 1050, E['ladder']['gw_ef'], .002),
    ('8 H100s at 40% MFU: 4.2 hours', 4.2, ft['H100 SXM']['hours'], .01),
    ('On 8 B200s (2,250 TFLOPS dense each): 1.9 hours', 1.9, ft['B200 SXM']['hours'], .03),
    ('about $135 on H100s', 135, ft['H100 SXM']['usd'], .005),
    ('about $99 on B200s', 99, ft['B200 SXM']['usd'], .01),
    ('the tensor cores sit idle 99.7%', .997, 1 - 1 / R[('H100 SXM', 'BF16')], .001),
    ('2,500 times longer', 2500, 1 / mem['lpx']['ms'], .01),
]
for txt, said, ref, tol in checks:
    present = txt in read or txt in page  # captions written by the Reading scripts live in the script parts
    good = present and (abs(said - ref) <= tol * abs(ref) + 1e-12)
    if not good:
        bad += 1
    print(('OK  ' if good else 'BAD ') + txt + ('' if present else '   (text not found)') + '   stated %g, reference %g' % (said, ref))
print('FAIL' if bad else 'ALL OK', bad)
sys.exit(1 if bad else 0)
