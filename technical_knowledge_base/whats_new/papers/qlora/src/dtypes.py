"""The 4-bit data types of QLoRA §3 and Table 2, built exactly as bitsandbytes builds them, plus the
paper's Eq. 4 read literally. Stdlib only (statistics.NormalDist for the normal quantile function).
Used by recompute.py, quant_ppl.py and check_quant.mjs (via inputs/dtypes.json).

  python3 dtypes.py      writes inputs/dtypes.json and prints the comparison with Appendix E
"""
import itertools, json, os
from statistics import NormalDist

Q = NormalDist().inv_cdf
HERE = os.path.dirname(os.path.abspath(__file__))

# Appendix E of the paper (arXiv v1), verbatim
APPENDIX_E = [-1.0, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453, -0.28444138169288635,
              -0.18477343022823334, -0.09105003625154495, 0.0, 0.07958029955625534, 0.16093020141124725,
              0.24611230194568634, 0.33791524171829224, 0.44070982933044434, 0.5626170039176941,
              0.7229568362236023, 1.0]


def linspace(a, b, n):
    return [a + (b - a) * i / (n - 1) for i in range(n)]


def nf4_code(offset=0.9677083):
    """bitsandbytes create_normal_map(offset, use_extra_value=True): 8 positive quantiles, 7 negative, one zero."""
    v1 = [Q(p) for p in linspace(offset, 0.5, 9)[:-1]]
    v3 = [-Q(p) for p in linspace(offset, 0.5, 8)[:-1]]
    v = sorted(v1 + [0.0] + v3)
    m = max(v)
    return [x / m for x in v]


def nf_eq4(k=4):
    """Eq. 4 read literally with the asymmetric recipe of §3: quantiles of 2^(k-1) (negative) and 2^(k-1)+1
    (positive) ranges, each value the mean of two neighbouring quantiles. The outermost quantile of each
    half is Q(0) or Q(1), which is infinite, so the literal recipe has no finite end points; we report that."""
    n = 2 ** k + 1
    try:
        return [0.5 * (Q(i / n) + Q((i + 1) / n)) for i in range(2 ** k)]
    except Exception as e:  # Q(0) raises
        return str(e)


def fp_code(e, p):
    """bitsandbytes create_fp8_map(signed=True, exponent_bits=e, precision_bits=p, total_bits=1+e+p)."""
    vals = []
    bias = 2 ** (e - 1)
    for ev in range(2 ** e):
        for bits in itertools.product([0, 1], repeat=p):
            v = 1 if ev != 0 else 0
            for i, b in enumerate(bits):
                v += b * 2 ** -(i + 1)
            v = v * 2 ** -bias if ev == 0 else v * 2 ** -(ev - bias - 1)
            vals += [v, -v]
    m = max(vals)
    return sorted(set(x / m for x in vals))


def int4_code():
    """bitsandbytes get_4bit_type('int4'): -7..7 over 7 (15 distinct values, zero twice)."""
    return [i / 7 for i in range(-7, 8)]


# bitsandbytes' FP4 (E2M1) as its CUDA kernel dequantises it (csrc/kernels.cu dDequantizeFP4Tree, 0.39.1):
# create_fp8_map(2, 1) gives the same grid except the subnormal (0.0208 there, 0.0052 in the kernel).
FP4_KERNEL = sorted(set([0.0, 5.208333333e-03, 0.16666667, 0.25, 0.33333333, 0.5, 0.66666667, 1.0] +
                        [-x for x in [5.208333333e-03, 0.16666667, 0.25, 0.33333333, 0.5, 0.66666667, 1.0]]))

AF4_64 = sorted([-1.0, -0.69441008, -0.51243739, -0.3736951, -0.25607552, -0.14982478, -0.04934812, 0.0,
                 0.04273164, 0.12934483, 0.21961274, 0.31675666, 0.42563882, 0.55496234, 0.72424863, 1.0])


def dynamic_map(signed=True, max_exponent_bits=7, total_bits=8):
    """bitsandbytes create_dynamic_map: the 8-bit code the released code uses for the second quantisation."""
    import math
    data = []
    non_sign_bits = total_bits - 1
    additional_items = 2 ** (non_sign_bits - max_exponent_bits) - 1
    for i in range(max_exponent_bits):
        fi = int(2 ** (i + non_sign_bits - max_exponent_bits) + 1 if signed else 2 ** (i + non_sign_bits - max_exponent_bits + 1) + 1)
        bnd = linspace(0.1, 1, fi)
        means = [(bnd[j] + bnd[j + 1]) / 2 for j in range(fi - 1)]
        data += [10 ** (-(max_exponent_bits - 1) + i) * m for m in means]
        if signed:
            data += [-(10 ** (-(max_exponent_bits - 1) + i)) * m for m in means]
    if additional_items > 0:
        bnd = linspace(0.1, 1, additional_items + 1)
        means = [(bnd[j] + bnd[j + 1]) / 2 for j in range(additional_items)]
        data += [10 ** (-(max_exponent_bits - 1) + i) * m for m in means]
        if signed:
            data += [-(10 ** (-(max_exponent_bits - 1) + i)) * m for m in means]
    data += [0.0, 1.0]
    assert len(data) == 2 ** total_bits
    return sorted(data)


def fp8_e4m3_code():
    """An OCP-style FP8 E4M3 grid (no NaN), the 'FP8' the paper's text names for the second quantisation."""
    vals = set()
    for ev in range(16):
        for m in range(8):
            if ev == 15 and m == 7: continue
            v = (m / 8) * 2 ** -6 if ev == 0 else (1 + m / 8) * 2 ** (ev - 7)
            vals.add(v); vals.add(-v)
    mx = max(vals)
    return sorted(x / mx for x in vals)


TYPES = {
    'int4': int4_code(),
    'fp4_e2m1': FP4_KERNEL,
    'fp4_e3m0': fp_code(3, 0),
    'nf4': nf4_code(),
    'af4': AF4_64,
}

if __name__ == '__main__':
    nf = nf4_code()
    dmax = max(abs(a - b) for a, b in zip(nf, APPENDIX_E))
    off = 1 - (1 / 64 + 1 / 60)
    out = {'types': TYPES, 'appendix_e': APPENDIX_E, 'nf4_vs_appendix_e_maxdiff': dmax,
           'offset': 0.9677083, 'offset_guess': off, 'offset_guess_note': '1 - (1/64 + 1/60) = mean of 1-1/32 and 1-1/30',
           'eq4_literal': nf_eq4() if isinstance(nf_eq4(), str) else 'finite',
           'dynamic8': dynamic_map(), 'fp8_e4m3': fp8_e4m3_code()}
    json.dump(out, open(os.path.join(HERE, 'inputs', 'dtypes.json'), 'w'), indent=1)
    print('NF4 from bitsandbytes recipe vs Appendix E: max |diff| =', dmax)
    print('offset 0.9677083 vs 1-(1/64+1/60) =', off)
    print('Eq. 4 literal:', out['eq4_literal'])
    for k, v in TYPES.items(): print(k, len(v), [round(x, 4) for x in v])
