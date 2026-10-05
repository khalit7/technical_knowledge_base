"""Reading tab, CUDA root: three measurements on the Apple M1 Pro GPU through MLX (Metal).

1 overhead : one tiny GPU operation launched and waited for (what a 1-element op costs end to end)
2 softmax  : row softmax of a 8192 x 8192 float32 matrix; achieved bandwidth if read once and written once
3 attention: softmax(Q K^T / sqrt(d)) V for 8 heads, d = 64, float16, N = 1024..4096:
             unfused (scores, then softmax, then P V, each evaluated separately so the N x N matrices
             really go to memory, like eager PyTorch launching three kernels) against
             mx.fast.scaled_dot_product_attention (a fused kernel). Outputs checked against each other.
Timing: warm up, then TRIALS trials, each the median of REPS calls; median, min, max per run;
1-minute load average recorded per run. Usage: python measure_m1.py OUT.json
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx

TRIALS = 7
OUT = sys.argv[1]
res = {"meta": {"mlx": mx.__version__, "numpy": np.__version__, "python": platform.python_version(),
                "device": str(mx.device_info().get("device_name", "")), "arch": str(mx.device_info().get("architecture", "")),
                "date": time.strftime("%Y-%m-%d %H:%M"), "load": os.getloadavg()[0]}, "cases": {}}

def bench(fn, reps):
    for _ in range(3): fn()
    ts = []
    for _ in range(TRIALS):
        t0 = time.perf_counter()
        for _ in range(reps): fn()
        ts.append((time.perf_counter() - t0) / reps * 1e3)
    ts.sort()
    return {"ms": ts[len(ts) // 2], "ms_min": ts[0], "ms_max": ts[-1]}

# 1 overhead
a = mx.ones((1,), dtype=mx.float32); mx.eval(a)
def tiny():
    b = a + 1; mx.eval(b); mx.synchronize()
r = bench(tiny, 200); r["us"] = r["ms"] * 1e3
res["cases"]["overhead"] = r

# 2 softmax 8192 x 8192 float32
R = C = 8192
x = mx.random.normal((R, C), key=mx.random.key(0)); mx.eval(x)
def sm():
    y = mx.softmax(x, axis=-1); mx.eval(y); mx.synchronize()
r = bench(sm, 10)
byt = 2 * R * C * 4
r["bytes"] = byt; r["gbps"] = byt / (r["ms"] * 1e-3) / 1e9
y = np.array(mx.softmax(x, axis=-1)); xn = np.array(x)
ref = np.exp(xn - xn.max(1, keepdims=True)); ref /= ref.sum(1, keepdims=True)
r["max_abs_err"] = float(np.abs(y - ref).max())
res["cases"]["softmax"] = r
del x, y, xn, ref

# 3 attention
H, D = 8, 64
att = []
for N in (1024, 2048, 4096):
    k0 = mx.random.key(N)
    q = mx.random.normal((1, H, N, D), key=k0).astype(mx.float16)
    k = mx.random.normal((1, H, N, D), key=mx.random.key(N + 1)).astype(mx.float16)
    v = mx.random.normal((1, H, N, D), key=mx.random.key(N + 2)).astype(mx.float16)
    mx.eval(q, k, v)
    sc = 1.0 / np.sqrt(D)
    def unfused():
        s = (q * sc) @ k.transpose(0, 1, 3, 2); mx.eval(s)
        p = mx.softmax(s, axis=-1); mx.eval(p)
        o = p @ v; mx.eval(o); mx.synchronize(); return o
    def fused():
        o = mx.fast.scaled_dot_product_attention(q, k, v, scale=sc); mx.eval(o); mx.synchronize(); return o
    ou = np.array(unfused().astype(mx.float32)); of = np.array(fused().astype(mx.float32))
    ru = bench(unfused, 5); rf = bench(fused, 5)
    flops = 4 * H * N * N * D
    att.append({"N": N, "H": H, "D": D, "unfused": ru, "fused": rf,
                "speedup": ru["ms"] / rf["ms"], "max_abs_diff": float(np.abs(ou - of).max()),
                "flops": flops, "unfused_tflops": flops / (ru["ms"] * 1e-3) / 1e12,
                "fused_tflops": flops / (rf["ms"] * 1e-3) / 1e12})
res["cases"]["attention"] = att
res["meta"]["load_end"] = os.getloadavg()[0]
json.dump(res, open(OUT, "w"), indent=1)
print(json.dumps(res)[:1500])
