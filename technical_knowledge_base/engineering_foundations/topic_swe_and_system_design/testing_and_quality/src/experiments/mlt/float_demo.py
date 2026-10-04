import numpy as np, json
rng = np.random.default_rng(0)
x = rng.standard_normal(1_000_000).astype(np.float32)
a = float(np.sum(x))                    # numpy pairwise summation
b = float(sum(x.tolist()))              # Python left-to-right in float64
c = float(np.sum(x[::-1]))              # same numbers, reversed order
d = float(np.sum(x.astype(np.float64)))
e = float(np.float32(0)); 
acc = np.float32(0)
for v in x[:100000]: acc = np.float32(acc + v)   # naive float32 running sum over the first 100k
f = float(np.sum(x[:100000].astype(np.float64)))
out = {"numpy_float32_pairwise": a, "numpy_float32_reversed": c, "python_float64_sequential": b, "numpy_float64": d,
       "naive_f32_first100k": float(acc), "float64_first100k": f,
       "pairwise_vs_reversed_equal": a == c, "abs_diff_pairwise_reversed": abs(a - c),
       "naive_rel_err_100k": abs(float(acc) - f) / abs(f)}
print(json.dumps(out, indent=1)); json.dump(out, open("float_out.json", "w"), indent=1)
print(np.testing.assert_allclose(a, d, rtol=1e-5) or "assert_allclose(rtol=1e-5): pass")
print("exact equal:", a == d)
