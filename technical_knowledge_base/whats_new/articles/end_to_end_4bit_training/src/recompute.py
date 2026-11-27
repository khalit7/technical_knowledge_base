"""Recompute every number the page's two widgets show, so the page's JavaScript can be checked against it.

  python3 src/recompute.py        (writes src/inputs/recompute.json; check_page.mjs compares the page with it)

1. The transpose toy (Reading, section 4): a 32 x 16 tile of illustrative activations x (32 tokens by 16 channels),
   quantised for the forward pass in NVFP4 with one scale per 1 x 16 row block (the reduction axis of y = x w^T),
   then turned into the backward pass's operand, whose blocks run down the columns (the reduction axis of dw = g^T x),
   five ways. For each, exact (analytic) statistics against the values the forward pass used:
     fwd_err   ||f - x|| / ||x||, what the forward quantisation itself lost
     fwd_zero  values of x that are non-zero but 0 in the forward pass
     bias      ||E[b] - f|| / ||f||, the error that does not average out (E over the stochastic rounding)
     noise     sqrt(sum Var[b]) / ||f||, the error of one draw around its expectation, which averages out
     avg1000   sqrt(bias^2 + noise^2 / 1000), the error left after 1,000 independent draws are averaged
     bwd_zero  expected number of values non-zero in f that the backward operand stores as 0
   Formats: NVFP4 = E2M1 values, one E4M3 scale per 16 values rounded to nearest (as the article's own Figure 1
   widget does: 593.7 becomes 96 x 6 = 576), saturating at 6, and one FP32 outer scale per tile, amax / (6 x 448);
   MXFP8 = E4M3 values with one power-of-two (E8M0) scale per 32 values, rounded up so nothing saturates.
   The data are illustrative (seeded), not Inkling 2 Small's; the arithmetic is exact.

2. The cost calculator (Reading, section 7): Amdahl's law and the article's compute-efficiency definition.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
E2M1 = [0, 0.5, 1, 1.5, 2, 3, 4, 6]
E4M3 = [0.0] + [k * 2.0 ** -9 for k in range(1, 8)] + [(1 + m / 8) * 2.0 ** (e - 7) for e in range(1, 16) for m in range(8) if not (e == 15 and m == 7)]
ROWS, COLS, SEED = 32, 16, 7


def mulberry32(a):
    """the same 32-bit generator as the page (so both draw the same illustrative tile)"""
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def gauss(r):
    u, v = r(), r()
    return math.sqrt(-2 * math.log(u + 1e-12)) * math.cos(2 * math.pi * v)


def tile(preset):
    r = mulberry32(SEED)
    x = [[gauss(r) for _ in range(COLS)] for _ in range(ROWS)]
    if preset == 'row':      # one token far larger than the rest (the article's Figure 2 has a full row of large values)
        x = [[v * (30 if i == 5 else 1) for v in row] for i, row in enumerate(x)]
    elif preset == 'outlier':  # one value of 40 among unit Gaussians (the article's Figure 3)
        x[9][6] = 40.0
    elif preset == 'channel':  # one channel 25 times larger: the outlier channels of LLM activations
        x = [[v * (25 if j == 3 else 1) for j, v in enumerate(row)] for row in x]
    return x


def lohi(grid, a):
    """the grid neighbours around a >= 0 (a at most the grid's maximum)"""
    for k in range(len(grid) - 1):
        if a <= grid[k + 1]:
            return grid[k], grid[k + 1], k
    return grid[-1], grid[-1], len(grid) - 1


def rtn(grid, a):
    """round a >= 0 to the nearest grid value, ties to the even index, saturating at the maximum"""
    if a >= grid[-1]: return grid[-1]
    lo, hi, k = lohi(grid, a)
    if a - lo < hi - a: return lo
    if a - lo > hi - a: return hi
    return lo if k % 2 == 0 else hi


def sr_moments(grid, a):
    """stochastic rounding of a >= 0: (expectation, variance, probability of 0)"""
    if a >= grid[-1]: return grid[-1], 0.0, 0.0
    lo, hi, _ = lohi(grid, a)
    if hi == lo: return lo, 0.0, 1.0 if lo == 0 else 0.0
    p = (a - lo) / (hi - lo)
    e = lo + p * (hi - lo)
    return e, (a - lo) * (hi - a), (1 - p) if lo == 0 else 0.0


def blocks(kind):
    """lists of (i, j) cells sharing one scale"""
    if kind == 'row16': return [[(i, j) for j in range(COLS)] for i in range(ROWS)]
    if kind == 'col16': return [[(i, j) for i in range(b, b + 16)] for j in range(COLS) for b in (0, 16)]
    if kind == 'col32': return [[(i, j) for i in range(ROWS)] for j in range(COLS)]
    if kind == 'tile16': return [[(i, j) for i in range(b, b + 16) for j in range(COLS)] for b in (0, 16)]


def quant(x, kind, fmt, mode):
    """returns (expectation, variance, p_zero) per cell; for mode 'rtn' the variance is 0 and the value is exact"""
    E = [[0.0] * COLS for _ in range(ROWS)]; V = [[0.0] * COLS for _ in range(ROWS)]; Z = [[0.0] * COLS for _ in range(ROWS)]
    amax_t = max(abs(v) for row in x for v in row)
    sg = amax_t / (6 * 448) if fmt == 'nvfp4' else 1.0
    for bl in blocks(kind):
        am = max(abs(x[i][j]) for i, j in bl)
        if am == 0: continue
        if fmt == 'nvfp4':
            sb = rtn(E4M3, min(448.0, am / 6 / sg)); s = sb * sg; grid = E2M1
        else:
            s = 2.0 ** math.ceil(math.log2(am / 448)); grid = E4M3
        if s == 0: continue
        for i, j in bl:
            a = abs(x[i][j]) / s; sgn = -1 if x[i][j] < 0 else 1
            if mode == 'rtn':
                q = rtn(grid, a); E[i][j] = sgn * q * s; Z[i][j] = 1.0 if q == 0 else 0.0
            else:
                e, var, pz = sr_moments(grid, a); E[i][j] = sgn * e * s; V[i][j] = var * s * s; Z[i][j] = pz
    return E, V, Z


OPTIONS = [  # id, label, forward tensor, backward operand
    ('naive', 'Quantise x again down the columns (NVFP4, nearest)'),
    ('tile', '16 x 16 tiles for both passes (NVIDIA\'s weight recipe)'),
    ('nvsr', 'Re-quantise f down the columns (NVFP4, stochastic)'),
    ('mxsr', 'Re-quantise f down the columns (MXFP8, stochastic): the article'),
    ('mxrtn', 'Re-quantise f down the columns (MXFP8, nearest)'),
]


def stats(preset):
    x = tile(preset)
    f = quant(x, 'row16', 'nvfp4', 'rtn')[0]
    out = {}
    for oid, _ in OPTIONS:
        ref = f
        if oid == 'naive': b = quant(x, 'col16', 'nvfp4', 'rtn')
        elif oid == 'tile': ref = quant(x, 'tile16', 'nvfp4', 'rtn')[0]; b = (ref, [[0.0] * COLS for _ in range(ROWS)], [[1.0 if v == 0 else 0.0 for v in r] for r in ref])
        elif oid == 'nvsr': b = quant(ref, 'col16', 'nvfp4', 'sr')
        elif oid == 'mxsr': b = quant(ref, 'col32', 'mxfp8', 'sr')
        else: b = quant(ref, 'col32', 'mxfp8', 'rtn')
        Eb, Vb, Zb = b
        cells = [(i, j) for i in range(ROWS) for j in range(COLS)]
        nx = math.sqrt(sum(x[i][j] ** 2 for i, j in cells)); nf = math.sqrt(sum(ref[i][j] ** 2 for i, j in cells))
        bias = math.sqrt(sum((Eb[i][j] - ref[i][j]) ** 2 for i, j in cells)) / nf
        noise = math.sqrt(sum(Vb[i][j] for i, j in cells)) / nf
        out[oid] = {
            'fwd_err': math.sqrt(sum((ref[i][j] - x[i][j]) ** 2 for i, j in cells)) / nx,
            'fwd_zero': sum(1 for i, j in cells if x[i][j] != 0 and ref[i][j] == 0),
            'bias': bias, 'noise': noise, 'avg1000': math.sqrt(bias ** 2 + noise ** 2 / 1000),
            'bwd_zero': sum(Zb[i][j] for i, j in cells if ref[i][j] != 0),
        }
    return out


def calc(speedup, ce_cost, r):
    """Amdahl: the share f of the MXFP8 step that ran r times faster; time to MXFP8's loss under the CE definition
    (the run reaches the loss MXFP8 would reach with (1 - c) of the FLOPs, so it needs 1 / (1 - c) as many)"""
    f = (1 - 1 / speedup) / (1 - 1 / r)
    return {'share': f, 'time_same_steps': 1 / speedup, 'time_same_loss': 1 / (1 - ce_cost) / speedup,
            'time_same_loss_if_less_time': (1 - (speedup - 1)) / (1 - ce_cost)}


if __name__ == '__main__':
    R = {'tiles': {p: stats(p) for p in ('gauss', 'row', 'outlier', 'channel')},
         'calc': {'pretrain_r3': calc(1.08, 0.02, 3.0), 'rl_r3': calc(1.20, 0.0, 3.0), 'rl_r183': calc(1.20, 0.0, 8.25 / 4.5)},
         'flop_per_byte': 15e15 / 900e9}
    json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
    for p, o in R['tiles'].items():
        print(p)
        for k, v in o.items():
            print('  %-6s fwd_err %.4f fwd_zero %3d  bias %.5f noise %.4f avg1000 %.5f bwd_zero %.2f' % (k, v['fwd_err'], v['fwd_zero'], v['bias'], v['noise'], v['avg1000'], v['bwd_zero']))
    print(json.dumps(R['calc'], indent=1), R['flop_per_byte'])
