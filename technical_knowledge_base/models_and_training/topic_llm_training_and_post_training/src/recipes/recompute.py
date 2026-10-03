#!/usr/bin/env python3
"""Recompute every derived number of the Open recipes compared tab from its published inputs.

Run: python3 src/recipes/recompute.py   (exits 1 on any mismatch over 1.5%)
Each check: (row id, column, field, value recomputed here). Then the compute stories (sums and shares
the animation and the share bars print) and the stage totals quoted in the prose.
"""
import json, os, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(HERE, 'data', 'recipes.json'), encoding='utf-8'))
row = {r['id']: r for r in d['rows']}
T, B = 1e12, 1e9
CHECKS = [
    # 6 x active parameters x pretraining tokens
    ('instructgpt', 'c6nd', 'n', 6 * 174.6 * B * 300 * B),
    ('llama2', 'c6nd', 'n', 6 * 70 * B * 2 * T),
    ('dsmath', 'c6nd', 'n', 6 * 6.9 * B * 500 * B),
    ('llama31', 'c6nd', 'n', 6 * 405 * B * 15.6 * T),
    ('tulu3', 'c6nd', 'n', 6 * 70.6 * B * 15.6 * T),
    ('olmo2', 'c6nd', 'n', 6 * 7.30 * B * 4.05 * T),
    ('phi4', 'c6nd', 'n', 6 * 14.7 * B * 10 * T),
    ('dsv3', 'c6nd', 'n', 6 * 37 * B * 14.8 * T),
    ('dsr1', 'c6nd', 'n', 6 * 37 * B * 14.8 * T),
    ('gemma3', 'c6nd', 'n', 6 * 27 * B * 14 * T),
    ('dapo', 'c6nd', 'n', 6 * 32.5 * B * 18 * T),
    ('qwen3', 'c6nd', 'n', 6 * 22 * B * 36 * T),
    ('smollm3', 'c6nd', 'n', 6 * 3.08 * B * 11.2 * T),
    ('kimik2', 'c6nd', 'n', 6 * 32.6 * B * 15.5 * T),
    ('apertus', 'c6nd', 'n', 6 * 70 * B * 15 * T),
    ('olmo3', 'c6nd', 'n', 6 * 32.2 * B * 5.5 * T),
    ('k2h', 'c6nd', 'n', 6 * 23 * B * 15.13 * T),
    ('mimo26', 'c6nd', 'n', 6 * 42 * B * 30 * T),
    # sums and products of published inputs
    ('tulu3', 'compute', 'n', 64 * 50 + 64 * 19 + 48 * 60),
    ('phi4', 'pref', 'n', 250297 + 841842),
    ('phi4', 'compute', 'n', 1920 * 21 * 24),
    ('smollm3', 'compute', 'n', 384 * 24 * 24),
    ('smollm3', 'mid_tokens', 'n', 35 * B * 4),
    ('smollm3', 'ctx', 'tok', 2 * 50 * B),
    ('dsv3', 'ctx', 'tok', 1000 * 1920 * 32768 + 1000 * 480 * 131072),
    ('dsr1', 'sft', 'tok', 804745 * 5355),
    ('dsr1', 'sft', 'n', 395285 + 211129 + 10124 + 10395 + 177812),
    ('dsr1', 'rl', 'n', 26e3 + 17e3 + 22e3 + 15e3),
    ('apertus', 'ctx', 'tok', (78.55 + 58.29 + 58.88 + 29.28) * B),
    ('apertus', 'pref', 'n', 380537 + 72698),
    ('olmo3', 'compute', 'n', 1024 * 56 * 24),
    ('k2h', 'pt_tokens', 'n', (7.08 + 8.05) * T),
    ('k2h', 'mid_tokens', 'n', (1.09 + 0.503 + 0.117 + 0.201) * T),
    ('k2h', 'sft', 'tok', (81 + 201 + 50) * B),
    ('instructgpt', 'sft', 'n', 11295 + 1430),
    ('instructgpt', 'pref', 'n', 6623 + 26584),
    ('tulu3', 'rl', 'n', 7473 + 7500 + 14973),
    ('olmo2', 'pt_tokens', 'n', 928646 * 1024 * 4096),
]
bad = 0
for rid, col, fld, v in CHECKS:
    have = row[rid]['cells'][col].get(fld)
    ok = have is not None and abs(have - v) / v < 0.015
    bad += not ok
    print('%-4s %-12s %-10s %-4s data %-12.4g recomputed %-12.4g' % ('ok' if ok else 'BAD', rid, col, fld, have or 0, v))

print('\ncompute stories (animation and share bars)')
POST = lambda s: s[0] not in ('pt', 'mid', 'lc')
EXPECT = {'InstructGPT': 1.75, 'DeepSeek-V3 (chat)': 0.18, 'DeepSeek-R1': 5.02, 'Olmo 3 Think': 17.56, 'Olmo 3.1 Think': 24.34}
for s in d['stories']:
    for b in s['branches']:
        st = s['shared'] + b['stages']
        tot = sum(x[2] for x in st); post = sum(x[2] for x in st if POST(x))
        share = 100 * post / tot
        ok = abs(share - EXPECT[b['name']]) < 0.02
        bad += not ok
        print('%-4s %-22s total %10.3f  post %8.3f  share %6.2f%%  (%s)' % ('ok' if ok else 'BAD', b['name'], tot * s['scale'], post * s['scale'], share, s['unit']))
# the stage figures behind the stories
assert 2664 + 119 + 5 == 2788, 'V3 Table 1'
assert 101 + 5 + 41 == 147, 'R1 Table 7'
assert 9.5 * 512 + 35 * 1024 == 40704 and 1.5 * 1024 == 1536 and 9 * 1024 == 2048 + 2048 + 5120 and 21 * 224 == 4704, 'Olmo 3 GPU-days'
print('ok   story inputs: V3 2,788K = 2,664K + 119K + 5K; R1 147K = 101K + 5K + 41K; Olmo 3 GPU-days')
print('\npretraining over SFT tokens:')
for rid in ('phi4', 'dsr1', 'smollm3', 'k2h'):
    c = row[rid]['cells']
    print('  %-8s %8.0fx' % (rid, c['pt_tokens']['n'] / c['sft']['tok']))
sys.exit(1 if bad else 0)
