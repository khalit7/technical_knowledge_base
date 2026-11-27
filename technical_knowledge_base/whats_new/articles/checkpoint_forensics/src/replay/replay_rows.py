"""Our own CPU replay of the article's core test, written for this page (not the author's code).

PyTorch's CUDA normal_ (aten/src/ATen/native/cuda/DistributionTemplates.h) launches G = 2048 x SMs threads for a
large tensor; thread t uses Philox4x32-10 subsequence t, and its k-th value lands at position t + k*G
(4 values per Philox call, Box-Muller on word pairs: sin for even lanes, cos for odd).
So element i holds value(seed, thread = i mod G, k = i div G): the seed fixes the numbers, G fixes where they go.

usage (from the repo root; rows come from the released repository github.com/macrogrants/checkpoint-forensics,
MIT, cloned to scratch, never committed in full):
  python3 -I src/replay/replay_rows.py <clone>/rows <clone>/models.json
writes src/replay/out/replay.json (r for every SM count 100..160 on DeepSeek-V3, DeepSeek-V4-Flash and Kimi K3)
and src/replay/out/rows_slice.json (the slices the page's in-browser replay ships, plus reference values for the
JS generator check in check_page.mjs).
"""
import json, os, sys
import numpy as np

M0, M1 = np.uint64(0xD2511F53), np.uint64(0xCD9E8D57)
W0, W1 = 0x9E3779B9, 0xBB67AE85
LO, S32 = np.uint64(0xFFFFFFFF), np.uint64(32)
KAT = [((0, 0, 0, 0), (0, 0), (0x6627e8d5, 0xe169c58d, 0xbc57ac4c, 0x9b00dbd8)),          # Random123 known answers
       ((0xffffffff,) * 4, (0xffffffff,) * 2, (0x408f276d, 0x41c83b0e, 0xa20bc7c6, 0x6d5451fd)),
       ((0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344), (0xa4093822, 0x299f31d0), (0xd16cfe09, 0x94fdcceb, 0x5001e420, 0x24126ea1))]


def philox(c, k):
    c0, c1, c2, c3 = (np.asarray(x, np.uint64) & LO for x in c)
    k0, k1 = int(k[0]) & 0xFFFFFFFF, int(k[1]) & 0xFFFFFFFF
    for _ in range(10):
        p0, p1 = M0 * c0, M1 * c2
        c0, c1, c2, c3 = (p1 >> S32) ^ c1 ^ np.uint64(k0), p1 & LO, (p0 >> S32) ^ c3 ^ np.uint64(k1), p0 & LO
        k0, k1 = (k0 + W0) & 0xFFFFFFFF, (k1 + W1) & 0xFFFFFFFF
    return c0, c1, c2, c3


def normal_at(pos, G, seed, offset=0):
    p, G = np.asarray(pos, np.uint64), np.uint64(G)
    t = p % G
    k = p // G
    lane = (k % np.uint64(4)).astype(np.int64)
    call = np.uint64(offset // 4) + k // np.uint64(4)
    w = np.stack(philox((call & LO, call >> S32, t & LO, t >> S32), (seed & 0xFFFFFFFF, seed >> 32))).astype(np.float64)
    i, inv = np.arange(p.size), np.float32(2.0 ** -32)
    x = w[np.where(lane < 2, 0, 2), i].astype(np.float32)
    y = w[np.where(lane < 2, 1, 3), i].astype(np.float32)
    u = x * inv + inv / np.float32(2)
    tp = inv * np.float32(6.2831855)
    v = y * tp + tp / np.float32(2)
    s = np.sqrt(np.float32(-2) * np.log(u))
    return np.where(lane % 2 == 0, np.sin(v) * s, np.cos(v) * s).astype(np.float64)


def corr(a, b):
    a, b = a - a.mean(), b - b.mean()
    return float(a @ b / np.sqrt((a @ a) * (b @ b)))


for c, k, want in KAT:
    assert tuple(map(int, philox(c, k))) == want

rows_dir, models = sys.argv[1], json.load(open(sys.argv[2]))
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, 'out'), exist_ok=True)
USE = {'DeepSeek-V3-Base': 'DeepSeek-V3', 'DeepSeek-V4-Flash': 'DeepSeek-V4-Flash', 'Kimi-K3': 'Kimi K3'}
N_SLICE = 1024  # values per row the page ships (the first 1,024 of the row)
out, sl = {'sms': list(range(100, 161)), 'models': []}, {'models': []}
for m in models:
    if m['name'] not in USE:
        continue
    bits = np.load(os.path.join(rows_dir, m['name'] + '.npy'))
    Y = (bits.astype(np.uint32) << 16).view(np.float32).astype(np.float64)
    V, d = m['shape']
    off = m.get('cpu_offset', 0)
    pick = list(range(min(4, len(m['rows']))))  # the first four rows the author lists
    rs = []
    for sms in out['sms']:
        rs.append(round(float(np.median([corr(Y[j], normal_at(np.uint64(m['rows'][j] * d) + np.arange(d, dtype=np.uint64), sms * 2048, m['seed'], off)) for j in pick])), 4))
    best = out['sms'][int(np.argmax(rs))]
    # full rows at the best layout, and the seed+1 control, over every row the author lists
    full = [corr(Y[j], normal_at(np.uint64(r * d) + np.arange(d, dtype=np.uint64), best * 2048, m['seed'], off)) for j, r in enumerate(m['rows'])]
    ctl = [corr(Y[j], normal_at(np.uint64(r * d) + np.arange(d, dtype=np.uint64), best * 2048, m['seed'] + 1, off)) for j, r in enumerate(m['rows'])]
    full, ctl = np.array(full), np.array(ctl)
    out['models'].append({'name': USE[m['name']], 'seed': m['seed'], 'offset': off, 'd': d, 'rows_scanned': len(pick), 'r': rs, 'best': best,
                          'rows_total': len(full), 'rows_over_099': int((full > 0.99).sum()), 'median_r_best': round(float(np.median(full)), 6),
                          'median_r_seed_plus_1': round(float(np.median(ctl)), 4), 'rows_over_099_seed_plus_1': int((ctl > 0.99).sum())})
    # page slice: one row, first N_SLICE values, as bf16 bit patterns
    j = 0
    pos = np.uint64(m['rows'][j] * d) + np.arange(N_SLICE, dtype=np.uint64)
    ref = {str(s): [round(float(v), 7) for v in normal_at(pos[:8], s * 2048, m['seed'], off)] for s in (132, 148, 152)}
    sl['models'].append({'name': USE[m['name']], 'seed': m['seed'], 'offset': off, 'row': m['rows'][j], 'd': d, 'std': m.get('std'),
                         'bits': [int(b) for b in bits[j][:N_SLICE]], 'ref8': ref,
                         'repo': m['repo'], 'revision': m['revision'], 'tensor': m['tensor']})
    print(m['name'], 'best', best, 'r', max(rs), 'rows', int((full > 0.99).sum()), '/', len(full), 'seed+1 median', round(float(np.median(ctl)), 4))
json.dump(out, open(os.path.join(here, 'out', 'replay.json'), 'w'), indent=1)
json.dump(sl, open(os.path.join(here, 'out', 'rows_slice.json'), 'w'))
