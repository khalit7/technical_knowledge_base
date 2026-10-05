"""Nondeterminism from floating-point atomics, measured on the Apple M1 Pro GPU (MLX custom Metal kernels).

The same 1,048,576 float32 values (the summation input of numerics.py, regenerated with the same seed)
are summed 30 times by three kernels:
  atomic_all   every thread does atomic_fetch_add on one float (order decided by the hardware)
  atomic_tg    each 256-thread threadgroup reduces its chunk with a fixed tree in threadgroup memory,
               then thread 0 atomically adds the partial (the split-K / "atomic epilogue" pattern)
  tree_fixed   same tree, partials written to their own slots and summed on the host in a fixed order
Writes out/atomics.json. Usage: <mlx python> code/atomics_mlx.py
"""
import json, math, os, time
import numpy as np
import mlx.core as mx

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "out", "atomics.json")

rng = np.random.default_rng(0)
n = 1 << 20
x_np = (rng.standard_normal(n) * np.exp(rng.standard_normal(n) * 2)).astype(np.float32)
exact = math.fsum(x_np.astype(np.float64))
x = mx.array(x_np)

k_all = mx.fast.metal_kernel(
    name="atomic_all", input_names=["x"], output_names=["out"], atomic_outputs=True,
    source="""
    uint i = thread_position_in_grid.x;
    atomic_fetch_add_explicit(&out[0], x[i], memory_order_relaxed);
    """)

TREE = """
    uint i = thread_position_in_grid.x;
    uint t = thread_position_in_threadgroup.x;
    threadgroup float s[256];
    s[t] = x[i];
    threadgroup_barrier(mem_flags::mem_threadgroup);
    for (uint h = 128; h > 0; h >>= 1) {
        if (t < h) s[t] += s[t + h];
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }
"""
k_tg = mx.fast.metal_kernel(
    name="atomic_tg", input_names=["x"], output_names=["out"], atomic_outputs=True,
    source=TREE + """
    if (t == 0) atomic_fetch_add_explicit(&out[0], s[0], memory_order_relaxed);
    """)
k_tree = mx.fast.metal_kernel(
    name="tree_fixed", input_names=["x"], output_names=["out"],
    source=TREE + """
    if (t == 0) out[threadgroup_position_in_grid.x] = s[0];
    """)


def run(kind):
    if kind == "atomic_all":
        r = k_all(inputs=[x], grid=(n, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(1,)],
                  output_dtypes=[mx.float32], init_value=0)[0]
        mx.eval(r); return float(np.array(r)[0])
    if kind == "atomic_tg":
        r = k_tg(inputs=[x], grid=(n, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(1,)],
                 output_dtypes=[mx.float32], init_value=0)[0]
        mx.eval(r); return float(np.array(r)[0])
    r = k_tree(inputs=[x], grid=(n, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(n // 256,)],
               output_dtypes=[mx.float32])[0]
    mx.eval(r)
    parts = np.array(r)
    acc = np.float32(0)
    for v in parts:
        acc = np.float32(acc + v)
    return float(acc)


res = {"mlx": mx.__version__, "device": "Apple M1 Pro GPU (MLX custom Metal kernels)", "n": n, "exact": exact,
       "ulp_at_exact": float(np.spacing(np.float32(abs(exact)))), "load": [round(v, 2) for v in os.getloadavg()],
       "runs": 30, "kernels": {}}
for kind in ("atomic_all", "atomic_tg", "tree_fixed"):
    vals = [run(kind) for _ in range(30)]
    u = sorted(set(vals))
    res["kernels"][kind] = {"values": vals, "distinct": len(u), "min": u[0], "max": u[-1],
                            "max_abs_err": max(abs(v - exact) for v in vals),
                            "spread_ulps": int(round((u[-1] - u[0]) / res["ulp_at_exact"]))}
    print(kind, len(u), "distinct", flush=True)
json.dump(res, open(OUT, "w"), indent=1)
print("wrote out/atomics.json")
