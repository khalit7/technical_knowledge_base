"""Recompute every number this page derives, and the toy's reference outputs.

  python3 recompute.py        (from src/; writes inputs/recompute.json, which check_page.mjs compares with the page)

1. The RAM toy (Reading, section 2): one Gated DeltaNet head with an 8 x 8 state, rows = addresses, columns = the bits
   of a byte. Update (row convention, as in the article's Figure 2): S <- alpha*S; S <- S + beta * k (v - S^T k)^T;
   read o = S^T q. The program: write 0x2A at address 3, write 0xC5 at address 4, overwrite address 3 with 0x71,
   then 40 tokens with no write (beta = 0, the gate still applies), then read addresses 3 and 4 with their keys.
   check_page.mjs runs the page's JavaScript on the same presets and requires the same numbers to 1e-9.
2. The benchmark rows: counts out of 40 (docs/rv32.md, P3 gate results) and Wilson 95% intervals, so the page can say
   which gaps a 40-problem set can resolve. Exact decimals for the printed percentages (writing rules: no float round()).
"""
import json, math, os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
D = 8
PROG = [('w', 3, 0x2A), ('w', 4, 0xC5), ('w', 3, 0x71), ('idle', 40), ('r',)]
OVERLAP = 0.4  # the "overlapping keys" mode: key r = normalise(e_r + 0.4 e_(r+1 mod 8))


def bits(b):
    return [(b >> (7 - i)) & 1 for i in range(8)]


def key(r, mode):
    k = [0.0] * D
    k[r] = 1.0
    if mode == 'overlap':
        k[(r + 1) % D] = OVERLAP
        n = math.sqrt(1 + OVERLAP ** 2)
        k = [x / n for x in k]
    return k


def run(alpha, beta, mode):
    S = [[0.0] * D for _ in range(D)]
    def step(a, b, k, v):
        for i in range(D):
            for j in range(D):
                S[i][j] *= a
        if b == 0:
            return
        sk = [sum(S[i][j] * k[i] for i in range(D)) for j in range(D)]  # S^T k, what the key reads now
        for i in range(D):
            for j in range(D):
                S[i][j] += b * k[i] * (v[j] - sk[j])
    for op in PROG:
        if op[0] == 'w':
            step(alpha, beta, key(op[1], mode), [float(x) for x in bits(op[2])])
        elif op[0] == 'idle':
            for _ in range(op[1]):
                step(alpha, 0, None, None)
    out = {}
    for r, want in ((3, 0x71), (4, 0xC5)):
        q = key(r, mode)
        o = [sum(S[i][j] * q[i] for i in range(D)) for j in range(D)]
        dec = sum((1 if x >= 0.5 else 0) << (7 - j) for j, x in enumerate(o))
        out[str(r)] = {'raw': o, 'decoded': dec, 'want': want, 'exact': all(abs(x - y) < 1e-12 for x, y in zip(o, bits(want)))}
    return out


PRESETS = [(1, 1, 'onehot'), (1, 0.9, 'onehot'), (0.98, 1, 'onehot'), (0.99, 1, 'onehot'), (1, 1, 'overlap'), (0.995, 0.95, 'overlap')]


def wilson(k, n, z=1.959964):
    p = k / n
    c = (p + z * z / (2 * n)) / (1 + z * z / n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return [round(100 * (c - h), 1), round(100 * (c + h), 1)]


def pct(k, n):
    return float((Decimal(k) * 100 / Decimal(n)).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))


# docs/rv32.md P3 (commit 0cab570): rv1 = Qwenputer, pytool = base Qwen with the same calc tool answered on the host,
# base = base Qwen told to do every step exactly. div_big and mul_div_multiple_longer: the calc v2 re-run (A10G);
# the base column: the matched re-run of 21 October (README commit 94fbfab), as the blog's chart prints it.
ROWS = [
    ('Synthetic integer arithmetic (not in the blog)', 30, 39, 39),
    ('DeepMind mul_big', 22, 39, 40),
    ('DeepMind div_big', 29, 39, 38),
    ('DeepMind add_or_sub_big', 35, 39, 39),
    ('DeepMind mul_div_multiple_longer', 36, 40, 39),
]
bench = [{'set': s, 'n': 40, 'base': b, 'qp': q, 'py': p,
          'pct': [pct(b, 40), pct(q, 40), pct(p, 40)],
          'ci': [wilson(b, 40), wilson(q, 40), wilson(p, 40)]} for s, b, q, p in ROWS]

out = {'toy': {'%s|%s|%s' % p: run(*p) for p in PRESETS}, 'bench': bench,
       'nupa_chip8': {'n': 576, 'base': 48.6, 'qp': 100.0, 'py': 100.0},
       'decay_40': {str(a): round(a ** 40, 4) for a in (0.98, 0.99, 0.995)}}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for p in PRESETS:
    r = out['toy']['%s|%s|%s' % p]
    print(p, {a: (hex(v['decoded']), v['exact'], [round(x, 3) for x in v['raw']]) for a, v in r.items()})
for b in bench:
    print(b['set'], b['pct'], b['ci'])
print('alpha^40', out['decay_40'])
