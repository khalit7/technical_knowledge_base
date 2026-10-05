"""Library calls on the Apple M1 Pro GPU through MLX: (1) the same library GEMM at friendly and
awkward shapes; (2) a GEMM with a bias-and-GELU epilogue, unfused, partly fused (addmm: bias in
the GEMM) and with the elementwise tail fused by mx.compile. Labelled "measured on Apple M1 Pro GPU".
Usage: python measure.py <run_id>  -> out/run_<id>.json"""
import json, os, sys, time, platform
import mlx.core as mx

def bench(fn, reps=10, warm=3):
    for _ in range(warm):
        mx.eval(fn())
    ts = []
    for _ in range(reps):
        t = time.perf_counter(); mx.eval(fn()); ts.append(time.perf_counter() - t)
    ts.sort()
    return ts[len(ts) // 2]

def gelu(x):  # tanh approximation, as in GPT-2 and cuBLASLt's GELU epilogue
    return 0.5 * x * (1 + mx.tanh(0.7978845608028654 * (x + 0.044715 * x * x * x)))

out = {"run": sys.argv[1], "mlx": mx.__version__, "load_before": os.getloadavg()[0], "shapes": [], "epilogue": []}
mx.random.seed(0)
dt = mx.float16
shapes = [(1024, 1024, 1024), (2048, 2048, 2048), (4096, 4096, 4096), (4096, 4095, 4096), (4096, 4097, 4096),
          (4096, 4096, 4095), (4096, 4096, 256), (8, 4096, 4096), (1, 4096, 4096)]
for (M, N, K) in shapes:
    a = mx.random.normal((M, K)).astype(dt); b = mx.random.normal((K, N)).astype(dt); mx.eval(a, b)
    t = bench(lambda: a @ b)
    flops = 2 * M * N * K; byts = 2 * (M * K + K * N + M * N)
    out["shapes"].append({"M": M, "N": N, "K": K, "ms": t * 1e3, "tflops": flops / t / 1e12, "gbs": byts / t / 1e9})
for K in (256, 1024, 4096):
    M = N = 4096
    x = mx.random.normal((M, K)).astype(dt); w = mx.random.normal((K, N)).astype(dt) * (K ** -0.5); bias = mx.random.normal((N,)).astype(dt)
    mx.eval(x, w, bias)
    def unfused():          # three kernels, each result written to memory and read back
        y = x @ w; mx.eval(y); z = y + bias; mx.eval(z); return gelu(z)
    fused_tail = mx.compile(lambda: gelu(x @ w + bias))          # GEMM, then one fused elementwise kernel
    addmm_tail = mx.compile(lambda: gelu(mx.addmm(bias, x, w)))  # bias inside the GEMM, GELU fused after
    r = {"K": K, "M": M, "N": N}
    r["gemm_only_ms"] = bench(lambda: x @ w) * 1e3
    r["unfused_ms"] = bench(unfused) * 1e3
    r["compiled_tail_ms"] = bench(fused_tail) * 1e3
    r["addmm_compiled_ms"] = bench(addmm_tail) * 1e3
    ref = gelu(x.astype(mx.float32) @ w.astype(mx.float32) + bias.astype(mx.float32))
    r["max_abs_err_addmm"] = float(mx.max(mx.abs(addmm_tail().astype(mx.float32) - ref)))
    r["max_abs_err_unfused"] = float(mx.max(mx.abs(unfused().astype(mx.float32) - ref)))
    out["epilogue"].append(r)
out["load_after"] = os.getloadavg()[0]
out["device"] = platform.machine()
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
json.dump(out, open(os.path.join(d, "run_%s.json" % sys.argv[1]), "w"), indent=1)
print("ok", sys.argv[1])
