"""Reference implementation of the page's FP8 simulator (parts/12_js_fp8core.js is a line-by-line port).
It runs the two numerical ideas of the report's §3.3.2 on toy inputs:
  1. scaling granularity: one scale per tensor against one per 1x128 activation tile (and 128x128 weight block),
     quantising to E4M3 or E5M2 with round-to-nearest-even, then a GEMM against a float64 reference;
  2. accumulation precision: FP8 products summed the way §3.5.2 describes the Hopper tensor core
     (32 products aligned to the largest exponent, 14 bits kept, truncated), with and without promotion
     of the partial sum to an FP32 register every N_c elements.
Everything uses exact double arithmetic (no log, exp or trig), so Python and JavaScript agree bit for bit.
usage: python3 fp8_sim.py   (writes inputs/fp8_sim.json; check_fp8.mjs compares the JS port with it)"""
import json, math

def mulberry32(a):
    a &= 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (1 | t)) & 0xFFFFFFFF
        t = (t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) & 0xFFFFFFFF ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt

def gauss(r):  # Irwin-Hall: sum of 12 uniforms minus 6, mean 0, variance 1, exact in doubles
    s = 0.0
    for _ in range(12): s += r()
    return s - 6

def expo(a):  # floor(log2(a)) for a > 0, exactly
    e = math.floor(math.log2(a))
    if 2.0 ** e > a: e -= 1
    if 2.0 ** (e + 1) <= a: e += 1
    return e

def rhe(x):  # round half to even, x >= 0
    f = math.floor(x); d = x - f
    if d > 0.5: return f + 1
    if d < 0.5: return f
    return f if f % 2 == 0 else f + 1

FMT = {'e4m3': {'man': 3, 'emin': -6, 'max': 448.0}, 'e5m2': {'man': 2, 'emin': -14, 'max': 57344.0}}

def q8(x, fmt):
    """Round x to the nearest value of the FP8 format (saturating at its maximum)."""
    if x == 0: return 0.0
    F = FMT[fmt]; s = -1.0 if x < 0 else 1.0; a = abs(x)
    if a >= F['max']: return s * F['max']
    e = max(expo(a), F['emin'])
    ulp = 2.0 ** (e - F['man'])
    return s * min(rhe(a / ulp) * ulp, F['max'])

def make_x(seed, T, K, kind, mag):
    """Activations T x K: unit Gaussian, with outliers of size mag in two channels or two tokens."""
    r = mulberry32(seed); X = [[gauss(r) for _ in range(K)] for _ in range(T)]
    if kind == 'channels':
        for t in range(T):
            for c in (37, 300): X[t][c] *= mag
    elif kind == 'tokens':
        for t in (5, 21):
            for c in range(K): X[t][c] *= mag
    return X

def quant(M, fmt, gr, gc):
    """Quantise matrix M with one scale per gr x gc group (gr, gc = 0 means the whole dimension).
    Returns the dequantised matrix, the count of nonzero values that became zero, and the count that landed
    below the format's smallest normal number (subnormals: fewer mantissa bits)."""
    R, C = len(M), len(M[0]); gr = gr or R; gc = gc or C; F = FMT[fmt]; FM = F['max']; tiny = 2.0 ** F['emin']
    out = [[0.0] * C for _ in range(R)]; zeros = sub = 0
    for i0 in range(0, R, gr):
        for j0 in range(0, C, gc):
            amax = 0.0
            for i in range(i0, min(R, i0 + gr)):
                for j in range(j0, min(C, j0 + gc)): amax = max(amax, abs(M[i][j]))
            sc = amax / FM if amax > 0 else 1.0
            for i in range(i0, min(R, i0 + gr)):
                for j in range(j0, min(C, j0 + gc)):
                    v = M[i][j] / sc; q = q8(v, fmt); out[i][j] = q * sc
                    if q == 0 and M[i][j] != 0: zeros += 1
                    elif q != 0 and abs(q) < tiny: sub += 1
    return out, zeros, sub

def scaling_run(seed=1, kind='channels', mag=100.0, fmt='e4m3', mode='tile', T=32, K=512):
    """Quantise one activation matrix; report zeros, subnormals and the relative error of every value."""
    X = make_x(seed, T, K, kind, mag)
    g = {'tensor': (0, 0), 'tile': (1, 128), 'block': (128, 128)}[mode]
    Xq, z, sub = quant(X, fmt, *g)
    rel = sorted(abs(Xq[t][c] - X[t][c]) / abs(X[t][c]) for t in range(T) for c in range(K) if X[t][c] != 0)
    return {'zeros': z, 'sub': sub, 'median_rel': rel[len(rel) // 2], 'p90_rel': rel[int(len(rel) * 0.9)], 'n': len(rel)}

def trunc(x, g):  # toward zero onto the grid of multiples of g
    return math.trunc(x / g) * g

def accumulate(p, reading, nc, bits=14):
    """Sum products p in groups of 32 as one tensor-core MMA would. reading 'A': the running sum joins the
    alignment, every operand keeps only the bits above 2^(emax - bits + 1); reading 'B': the 32 products are
    aligned among themselves, summed, then added into a register that keeps 14 significant bits.
    nc > 0: every nc elements the partial sum is added into an exact (FP32-class) register and restarted."""
    acc = 0.0; hi = 0.0; n = 0
    for i in range(0, len(p), 32):
        ch = p[i:i + 32]
        if reading == 'A':
            em = max([expo(abs(v)) for v in ch if v != 0] + ([expo(abs(acc))] if acc != 0 else []))
            g = 2.0 ** (em - bits + 1)
            s = trunc(acc, g)
            for v in ch: s += trunc(v, g)
            acc = s
        else:
            em = max(expo(abs(v)) for v in ch if v != 0)
            g = 2.0 ** (em - bits + 1); s = 0.0
            for v in ch: s += trunc(v, g)
            t = acc + s
            acc = trunc(t, 2.0 ** (expo(abs(t)) - bits + 1)) if t != 0 else 0.0
        n += len(ch)
        if nc and n % nc == 0: hi += acc; acc = 0.0
    return hi + acc

def dot_inputs(seed, K, dist, fmt='e4m3'):
    r = mulberry32(seed); a = []; b = []
    for _ in range(K):
        if dist == 'uniform': a.append(q8(r(), fmt)); b.append(q8(r(), fmt))
        else: a.append(q8(gauss(r), fmt)); b.append(q8(gauss(r), fmt))
    return [x * y for x, y in zip(a, b)]  # FP8 x FP8 products are exact in doubles

def acc_run(seed, K, dist, reading, nc, cols=16):
    """Max relative error over `cols` dot products of length K (uniform inputs), or the normwise error
    sqrt(sum err^2 / sum exact^2) (Gaussian inputs, whose sums can sit near zero)."""
    worst = 0.0; num = den = 0.0
    for c in range(cols):
        p = dot_inputs(seed * 1000 + c, K, dist)
        ex = math.fsum(p); got = accumulate(p, reading, nc)
        num += (got - ex) ** 2; den += ex * ex
        if ex != 0: worst = max(worst, abs(got - ex) / abs(ex))
    return worst if dist == 'uniform' else math.sqrt(num / den)

if __name__ == '__main__':
    out = {'scaling': {}, 'acc': {}}
    for kind in ('channels', 'tokens', 'none'):
        for mode in ('tensor', 'tile', 'block'):
            for fmt in ('e4m3', 'e5m2'):
                for mag in (10.0, 1000.0, 100000.0):
                    if kind == 'none' and mag != 10.0: continue
                    out['scaling']['%s|%s|%s|%g' % (kind, mode, fmt, mag)] = scaling_run(1, kind, mag, fmt, mode)
    for dist in ('uniform', 'gauss'):
        for reading in ('A', 'B'):
            for nc in (0, 128):
                for K in (256, 512, 1024, 2048, 4096, 8192):
                    out['acc']['%s|%s|%d|%d' % (dist, reading, nc, K)] = acc_run(1, K, dist, reading, nc)
    # one dot product, step by step, for the animation check
    p = dot_inputs(1, 4096, 'uniform')
    out['dot'] = {'exact': math.fsum(p), 'A0': accumulate(p, 'A', 0), 'A128': accumulate(p, 'A', 128), 'B0': accumulate(p, 'B', 0), 'B128': accumulate(p, 'B', 128)}
    out['q8_samples'] = {str(x): [q8(x, 'e4m3'), q8(x, 'e5m2')] for x in (0.0009, 0.001953125, 0.0137, 0.3, 1.0625, 1.1875, 300.0, 449.0, 5e4, 6e4)}
    json.dump(out, open('inputs/fp8_sim.json', 'w'), indent=1)
    for k, v in out['scaling'].items():
        print(k, {a: round(b, 5) if isinstance(b, float) else b for a, b in v.items()})
    for k, v in out['acc'].items(): print(k, '%.5f%%' % (100 * v))
    print(out['dot'])
