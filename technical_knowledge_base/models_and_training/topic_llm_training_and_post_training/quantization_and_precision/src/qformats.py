"""Number formats and quantisers used by the page, in NumPy. The page's JS (parts/2*_js_q*.js) ports these exactly;
check_js.mjs compares the two on the shipped data. Every format is defined from its spec:
  minifloats: OCP 8-bit FP spec (E4M3 max 448, E5M2 max 57344), OCP MX spec v1.0 (E2M1 max 6, E8M0 scale, blocks of 32),
  NVIDIA NVFP4 (E2M1, E4M3 scale per 16, FP32 per-tensor scale), QLoRA Appendix E (NF4), IEEE 754 (fp16), bf16."""
import numpy as np

NF4 = np.array([-1.0, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453, -0.28444138169288635,
    -0.18477343022823334, -0.09105003625154495, 0.0, 0.07958029955625534, 0.16093020141124725, 0.24611230194568634,
    0.33791524171829224, 0.44070982933044434, 0.5626170039176941, 0.7229568362236023, 1.0])

# name: (exponent bits, mantissa bits, bias, max finite)
FLOATS = {'fp16': (5, 10, 15, 65504.0), 'bf16': (8, 7, 127, 3.3895313892515355e38), 'e4m3': (4, 3, 7, 448.0),
          'e5m2': (5, 2, 15, 57344.0), 'e2m1': (2, 1, 1, 6.0), 'tf32': (8, 10, 127, 3.4011621342146535e38)}

def round_float(x, fmt):
    """Round to nearest (ties to even) in a sign-magnitude minifloat with subnormals; saturate at max finite."""
    e, m, bias, mx = FLOATS[fmt]
    x = np.asarray(x, dtype=np.float64)
    a = np.abs(x)
    emin = 1 - bias
    ex = np.floor(np.log2(np.where(a > 0, a, 1.0)))
    ex = np.maximum(ex, emin)
    step = 2.0 ** (ex - m)
    q = np.round(a / step) * step  # np.round is ties-to-even
    q = np.minimum(q, mx)
    return np.sign(x) * q

def e8m0(x):
    """Power-of-two scale (OCP MX E8M0)."""
    return 2.0 ** np.clip(np.floor(np.log2(x)), -127, 127)

def q_int(w, bits, axis_groups, sym=True):
    """Absmax (sym) or min-max (asym) integer quantisation over groups. w is reshaped (G, n) by the caller."""
    if sym:
        qmax = 2 ** (bits - 1) - 1
        s = np.abs(w).max(1, keepdims=True) / qmax
        s[s == 0] = 1
        return np.clip(np.round(w / s), -qmax, qmax) * s
    qmax = 2 ** bits - 1
    lo = np.minimum(w.min(1, keepdims=True), 0); hi = np.maximum(w.max(1, keepdims=True), 0)
    s = (hi - lo) / qmax; s[s == 0] = 1
    z = np.round(-lo / s)
    return (np.clip(np.round(w / s) + z, 0, qmax) - z) * s

def groups(W, g):
    """(N, K) -> (N*K/g, g) groups along the input dimension; g = 0 means whole row, -1 whole tensor."""
    N, K = W.shape
    if g == -1: return W.reshape(1, -1)
    if g == 0: return W.reshape(N, K)
    return W.reshape(N * K // g, g)

def quantise(W, scheme):
    """Weight quantisation by scheme name. Returns dequantised weights (same shape)."""
    N, K = W.shape
    kind, g = SCHEMES[scheme]['kind'], SCHEMES[scheme]['g']
    G = groups(W, g)
    if kind == 'int8': out = q_int(G, 8, g)
    elif kind == 'int4': out = q_int(G, 4, g)
    elif kind == 'int4a': out = q_int(G, 4, g, sym=False)
    elif kind in ('e4m3', 'e5m2'):
        mx = FLOATS[kind][3]; s = np.abs(G).max(1, keepdims=True) / mx; s[s == 0] = 1
        out = round_float(G / s, kind) * s
    elif kind == 'nf4':
        s = np.abs(G).max(1, keepdims=True); s[s == 0] = 1
        out = NF4[np.abs((G / s)[..., None] - NF4).argmin(-1)] * s
    elif kind in ('mxfp4', 'mxfp8'):
        el = 'e2m1' if kind == 'mxfp4' else 'e4m3'
        emax = {'e2m1': 2, 'e4m3': 8}[el]
        amax = np.abs(G).max(1, keepdims=True); amax[amax == 0] = 2.0 ** -127
        X = 2.0 ** (np.floor(np.log2(amax)) - emax)
        out = round_float(G / X, el) * X
    elif kind == 'nvfp4':
        st = np.abs(W).max() / (448.0 * 6.0)
        amax = np.abs(G).max(1, keepdims=True)
        sb = round_float(amax / 6.0 / st, 'e4m3'); sb[sb == 0] = 1
        out = round_float(G / (sb * st), 'e2m1') * sb * st
    elif kind == 'q4k':
        out = q4k_simple(W)
    else: raise ValueError(kind)
    return out.reshape(N, K)

def q4k_simple(W):
    """Simplified llama.cpp Q4_K: super-blocks of 256 = 8 blocks of 32; per block a scale and a min (asymmetric 4-bit),
    the 8 scales and 8 mins quantised to 6 bits against one fp16 super-scale and super-min. (llama.cpp also searches
    for the best scale and min per block; this uses plain min-max, labelled simplified on the page.)"""
    G = W.reshape(-1, 8, 32)
    lo = np.minimum(G.min(2), 0); hi = G.max(2)
    sc = (hi - lo) / 15; mn = -lo
    d = sc.max(1, keepdims=True) / 63; dm = mn.max(1, keepdims=True) / 63
    d[d == 0] = 1; dm[dm == 0] = 1
    d = round_float(d, 'fp16'); dm = round_float(dm, 'fp16')
    qs = np.clip(np.round(sc / d), 0, 63) * d; qm = np.clip(np.round(mn / dm), 0, 63) * dm
    qs[qs == 0] = 1e-30
    q = np.clip(np.round((G + qm[..., None]) / qs[..., None]), 0, 15)
    return (q * qs[..., None] - qm[..., None]).reshape(W.shape)

# bits per weight: element bits + scale bits / group (scale sizes from each format's definition)
SCHEMES = {
    'int8_tensor':  dict(kind='int8', g=-1, bpw=8, label='INT8, one scale per tensor'),
    'int8_channel': dict(kind='int8', g=0, bpw=8 + 16 / 896, label='INT8, one scale per output channel'),
    'fp8_tensor':   dict(kind='e4m3', g=-1, bpw=8, label='FP8 E4M3, per tensor'),
    'fp8_channel':  dict(kind='e4m3', g=0, bpw=8 + 32 / 896, label='FP8 E4M3, per channel (FP8-dynamic weights)'),
    'mxfp8':        dict(kind='mxfp8', g=32, bpw=8 + 8 / 32, label='MXFP8 (E4M3 + E8M0 per 32)'),
    'int4_tensor':  dict(kind='int4', g=-1, bpw=4, label='INT4, per tensor'),
    'int4_channel': dict(kind='int4', g=0, bpw=4 + 16 / 896, label='INT4, per channel'),
    'int4_g128':    dict(kind='int4a', g=128, bpw=4 + 32 / 128, label='INT4 g128, scale + zero (GPTQ/AWQ format, RTN)'),
    'int4_g32':     dict(kind='int4', g=32, bpw=4 + 16 / 32, label='INT4, fp16 scale per 32 (like Q4_0)'),
    'q4k':          dict(kind='q4k', g=256, bpw=4.5, label='Q4_K (simplified): 2-level scales per 256'),
    'nf4_b64':      dict(kind='nf4', g=64, bpw=4 + 32 / 64, label='NF4, fp32 absmax per 64'),
    'nf4_dq':       dict(kind='nf4', g=64, bpw=4 + 8 / 64 + 32 / (64 * 256), label='NF4 + double quant (QLoRA)'),
    'mxfp4':        dict(kind='mxfp4', g=32, bpw=4 + 8 / 32, label='MXFP4 (E2M1 + E8M0 per 32)'),
    'nvfp4':        dict(kind='nvfp4', g=16, bpw=4 + 8 / 16, label='NVFP4 (E2M1 + E4M3 per 16 + FP32 per tensor)'),
}
