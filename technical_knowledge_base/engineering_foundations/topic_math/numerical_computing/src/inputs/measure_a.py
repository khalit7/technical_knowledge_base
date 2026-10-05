# Numerical computing page: measurements on the laptop (Apple M1 Pro), part A.
# Bit patterns, format constants, summation error, non-associativity, reduction order.
# Run: uv run --no-project --with torch==2.14.1 --with numpy --with ml_dtypes python measure_a.py
import json, math, random, struct, sys, platform, time
import numpy as np, ml_dtypes as md, torch

torch.set_num_threads(2)
OUT = {"meta": {"python": sys.version.split()[0], "numpy": np.__version__, "ml_dtypes": md.__version__,
                "torch": torch.__version__, "machine": platform.machine(), "date": time.strftime("%Y-%m-%d")}}

FMT = {"fp64": np.float64, "fp32": np.float32, "fp16": np.float16, "bf16": md.bfloat16,
       "e4m3": md.float8_e4m3fn, "e5m2": md.float8_e5m2}
UINT = {64: np.uint64, 32: np.uint32, 16: np.uint16, 8: np.uint8}

def bits(x, f):
    dt = FMT[f]; a = np.array([x], dtype=np.float64).astype(dt)
    nb = md.finfo(dt).bits
    u = int(a.view(UINT[nb])[0])
    return {"value": float(a.astype(np.float64)[0]), "bits": format(u, "0%db" % nb), "hex": format(u, "0%dx" % (nb // 4))}

# 1. constants
OUT["constants"] = {}
for f, dt in FMT.items():
    fi = md.finfo(dt)
    OUT["constants"][f] = {"bits": fi.bits, "exp_bits": fi.nexp, "man_bits": fi.nmant, "eps": float(fi.eps),
                           "max": float(fi.max), "min_normal": float(fi.smallest_normal),
                           "min_subnormal": float(fi.smallest_subnormal), "ln_max": math.log(float(fi.max))}
# 2. bit patterns of chosen values (including the root's loss 2.4076 and logits)
loss = math.log(math.exp(2) + math.exp(1) + 1)  # root tiny model: z=(2,1,0), target sat (logit 0)
OUT["loss_exact"] = loss
vals = {"1": 1.0, "0.1": 0.1, "-2.5": -2.5, "loss": loss, "1000": 1000.0, "65504": 65504.0, "1e-8": 1e-8,
        "0": 0.0, "-0": -0.0, "inf": math.inf, "nan": math.nan, "448": 448.0, "3.0": 3.0}
OUT["bits"] = {k: {f: bits(v, f) for f in FMT} for k, v in vals.items()}
# struct cross-check for fp32 and fp64 (the standard library, not numpy)
OUT["struct_check"] = {"0.1_fp64": struct.pack(">d", 0.1).hex(), "0.1_fp32": struct.pack(">f", 0.1).hex(),
                       "loss_fp32": struct.pack(">f", loss).hex()}
OUT["exact_decimal"] = {"0.1_fp64": "%.60f" % 0.1, "0.1_fp32": "%.40f" % float(np.float32(0.1))}

# 3. classic one-liners
OUT["oneliners"] = {
    "0.1+0.2": repr(0.1 + 0.2), "(0.1+0.2)+0.3": repr((0.1 + 0.2) + 0.3), "0.1+(0.2+0.3)": repr(0.1 + (0.2 + 0.3)),
    "(1e16+1)-1e16": repr((1e16 + 1.0) - 1e16), "1e16+(1-1e16)": repr(1e16 + (1.0 - 1e16)),
    "fp16 1+2^-11": float(np.float16(1) + np.float16(2 ** -11)), "fp16 1+2^-10": float(np.float16(1) + np.float16(2 ** -10)),
    "fp16 1+3*2^-11": float(np.float16(1) + np.float16(3 * 2 ** -11)),
    "bf16 1+2^-8": float(md.bfloat16(1) + md.bfloat16(2 ** -8)), "bf16 1+3*2^-8": float(md.bfloat16(1) + md.bfloat16(3 * 2 ** -8)),
    "fp32 exp(88.72)": float(np.exp(np.float32(88.72))), "fp32 exp(88.73)": float(np.exp(np.float32(88.73))),
}
# stagnation: add 1 repeatedly until the sum stops changing
stag = {}
for f in ["fp16", "bf16", "fp32"]:
    dt = FMT[f]; s = dt(0); one = dt(1); n = 0
    while True:
        t = dt(s + one); n += 1
        if t == s: break
        s = t
        if n > 2 ** 25: break
    stag[f] = float(s)
OUT["stagnation_ones"] = stag

# 4. summation error: N uniform(0,1) numbers, rounded to the format first, so only the summation rounds
def naive(x, dt):
    s = dt(0)
    for v in x: s = dt(s + v)
    return s
def kahan(x, dt):
    s = dt(0); c = dt(0)
    for v in x:
        y = dt(v - c); t = dt(s + y); c = dt(dt(t - s) - y); s = t
    return s
def pairwise(x, dt):
    x = list(x)
    while len(x) > 1:
        nxt = [dt(x[i] + x[i + 1]) for i in range(0, len(x) - 1, 2)]
        if len(x) % 2: nxt.append(x[-1])
        x = nxt
    return x[0]
def acc32(x, dt):
    s = np.float32(0)
    for v in x: s = np.float32(s + np.float32(v))
    return s
rng = np.random.default_rng(0)
base = rng.random(10 ** 6)
summ = []
for f in ["fp16", "bf16", "fp32"]:
    dt = FMT[f]
    for N in [10, 100, 1000, 10 ** 4, 10 ** 5, 10 ** 6]:
        xr = base[:N].astype(dt)
        exact = math.fsum(float(v) for v in xr.astype(np.float64))
        xs = [dt(v) for v in xr]
        row = {"fmt": f, "N": N, "exact": exact}
        for name, fn in [("naive", naive), ("pairwise", pairwise), ("kahan", kahan)]:
            r = float(fn(xs, dt)); row[name] = r; row[name + "_relerr"] = abs(r - exact) / exact
        if f != "fp32":
            r = float(acc32(xs, dt)); row["acc32"] = r; row["acc32_relerr"] = abs(r - exact) / exact
        t = torch.from_numpy(xr.astype(np.float32)).to({"fp16": torch.float16, "bf16": torch.bfloat16, "fp32": torch.float32}[f])
        r = float(t.sum()); row["torch_sum"] = r; row["torch_sum_relerr"] = abs(r - exact) / exact
        r = float(np.sum(xr)) if f != "bf16" else float("nan"); row["numpy_sum"] = r
        row["numpy_sum_relerr"] = abs(r - exact) / exact if f != "bf16" else None
        summ.append(row); print(f, N, {k: v for k, v in row.items() if k.endswith("relerr")}, flush=True)
OUT["summation"] = summ

# 5. order dependence
# (a) Thinking Machines' snippet (10 Sep 2025): 8 numbers, 10,000 shuffles, seed 42
vals8 = [1e-10, 1e-5, 1e-2, 1]; vals8 = vals8 + [-v for v in vals8]
res_loop, res_sum = [], []
random.seed(42)
for _ in range(10000):
    random.shuffle(vals8)
    s = 0.0
    for v in vals8: s += v
    res_loop.append(s); res_sum.append(sum(vals8))
OUT["tm_snippet"] = {"unique_plain_loop": len(set(res_loop)), "unique_builtin_sum": len(set(res_sum)),
                     "min_loop": min(res_loop), "max_loop": max(res_loop), "python": sys.version.split()[0]}
# (b) 10^5 float32 values (normal), summed sequentially in fp32 in 20 random orders
x = rng.standard_normal(10 ** 5).astype(np.float32)
exact = math.fsum(float(v) for v in x)
orders = []
for k in range(20):
    p = np.random.default_rng(100 + k).permutation(len(x))
    orders.append(float(naive([np.float32(v) for v in x[p]], np.float32)))
OUT["order_fp32"] = {"N": len(x), "exact": exact, "results": orders, "unique": len(set(orders)),
                     "spread": max(orders) - min(orders)}
# (c) torch.sum on CPU with different thread counts, same tensor
t = torch.from_numpy(rng.standard_normal(10 ** 7).astype(np.float32))
thr = {}
for n in [1, 2, 4, 8]:
    torch.set_num_threads(n); thr[n] = [float(t.sum()) for _ in range(5)]
torch.set_num_threads(2)
OUT["torch_threads"] = {"N": t.numel(), "exact": math.fsum(t.double().tolist()), "by_threads": thr}
# (d) MPS: same reduction repeated, and index_add_ with many duplicate indices
if torch.backends.mps.is_available():
    tm = t.to("mps")
    OUT["mps_sum_unique_of_20"] = len(set(float(tm.sum()) for _ in range(20)))
    idx = torch.randint(0, 10, (10 ** 6,), generator=torch.Generator().manual_seed(0))
    src = torch.from_numpy(rng.standard_normal(10 ** 6).astype(np.float32))
    outs = set()
    for _ in range(20):
        o = torch.zeros(10, device="mps").index_add_(0, idx.to("mps"), src.to("mps"))
        outs.add(tuple(o.cpu().tolist()))
    OUT["mps_index_add_unique_of_20"] = len(outs)
    outs = set()
    for _ in range(20):
        o = torch.zeros(10).index_add_(0, idx, src); outs.add(tuple(o.tolist()))
    OUT["cpu_index_add_unique_of_20"] = len(outs)
json.dump(OUT, open("out_a.json", "w"), indent=1)
print("done")
