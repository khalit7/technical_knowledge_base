"""Numerical-correctness experiments (PyTorch 2.14.1 and NumPy on CPU; one kernel-against-reference
test on the Apple M1 Pro GPU through MPS). Writes out/numerics.json.

Usage: uv run --no-project --with torch==2.14.1 --with numpy python code/numerics.py
"""
import json, math, os, sys, time
import numpy as np
import torch

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "out", "numerics.json")
rng = np.random.default_rng(0)


def bf16_round(x):
    """Round float32 values to bfloat16 (round to nearest even), returned as float32."""
    x = np.asarray(x, dtype=np.float32)
    u = x.view(np.uint32).astype(np.uint64)
    r = ((u + 0x7FFF + ((u >> 16) & 1)) >> 16) << 16
    return r.astype(np.uint32).view(np.float32)


def check_bf16_round():
    x = rng.standard_normal(100000).astype(np.float32) * 10
    ours = bf16_round(x)
    ref = torch.from_numpy(x).to(torch.bfloat16).float().numpy()
    return int((ours != ref).sum())


def dtypes():
    out = {}
    for name, dt in (("float32", torch.float32), ("bfloat16", torch.bfloat16), ("float16", torch.float16),
                     ("float8_e4m3fn", torch.float8_e4m3fn), ("float8_e5m2", torch.float8_e5m2)):
        f = torch.finfo(dt)
        out[name] = {"bits": f.bits, "eps": f.eps, "max": f.max, "smallest_normal": f.smallest_normal}
    # TF32: float32's 8-bit exponent with a 10-bit stored mantissa (NVIDIA A100 blog); eps = 2^-10
    out["tf32"] = {"bits": 19, "eps": 2.0 ** -10, "max": None, "smallest_normal": None}
    import torch.testing._comparison as C
    tol = {str(k).replace("torch.", ""): list(v) for k, v in C._DTYPE_PRECISIONS.items()
           if k in (torch.float16, torch.bfloat16, torch.float32, torch.float64)}
    return out, tol


def accumulate():
    """Dot products of length K from inputs rounded to fp16 or bf16; products are exact in fp32.
    Accumulators: fp32 sequential (one FMA chain, like one thread's loop), fp32 pairwise (a tree,
    like a reduction across threads), and fp16 / bf16 sequential (rounding after every add).
    Error relative to sqrt(sum p_i^2), the natural scale of a sum of random-sign terms."""
    Ks = [16, 64, 256, 1024, 4096, 16384, 65536]
    T = 256
    res = {}
    for inp in ("float16", "bfloat16"):
        rows = []
        for K in Ks:
            a = rng.standard_normal((T, K)).astype(np.float32)
            b = rng.standard_normal((T, K)).astype(np.float32)
            if inp == "float16":
                a = a.astype(np.float16).astype(np.float32); b = b.astype(np.float16).astype(np.float32)
            else:
                a = bf16_round(a); b = bf16_round(b)
            p = a * b  # exact in float32
            exact = np.array([math.fsum(r) for r in p.astype(np.float64)])
            scale = np.sqrt((p.astype(np.float64) ** 2).sum(1))
            seq32 = np.zeros(T, np.float32); seq16 = np.zeros(T, np.float16); seqbf = np.zeros(T, np.float32)
            for k in range(K):
                seq32 = (seq32 + p[:, k]).astype(np.float32)
                seq16 = (seq16.astype(np.float32) + p[:, k]).astype(np.float16)
                seqbf = bf16_round(seqbf + p[:, k])
            pair32 = p.sum(1, dtype=np.float32)  # NumPy float32 sum is pairwise
            row = {"K": K}
            for nm, v in (("fp32_sequential", seq32), ("fp32_pairwise", pair32),
                          ("fp16_sequential", seq16.astype(np.float32)), ("bf16_sequential", seqbf)):
                e = np.abs(v.astype(np.float64) - exact) / scale
                row[nm] = {"median": float(np.median(e)), "p90": float(np.quantile(e, .9)), "max": float(e.max())}
            rows.append(row)
        res[inp] = rows
    return {"trials": T, "inputs": res}


def summation_order():
    """One million float32 values summed in different orders. Exact answer from math.fsum."""
    n = 1 << 20
    x = (rng.standard_normal(n) * np.exp(rng.standard_normal(n) * 2)).astype(np.float32)
    exact = math.fsum(x.astype(np.float64))
    out = {"n": n, "exact": exact, "orders": {}}
    out["orders"]["sequential"] = float(np.cumsum(x, dtype=np.float32)[-1])
    out["orders"]["pairwise (NumPy)"] = float(x.sum(dtype=np.float32))
    out["orders"]["torch CPU sum"] = float(torch.from_numpy(x).sum())
    out["orders"]["sorted ascending, sequential"] = float(np.cumsum(np.sort(x), dtype=np.float32)[-1])
    out["orders"]["sorted by magnitude, sequential"] = float(np.cumsum(x[np.argsort(np.abs(x))], dtype=np.float32)[-1])
    split = {}
    for S in (1, 2, 4, 8, 16, 64, 256, 1024):
        parts = [np.cumsum(c, dtype=np.float32)[-1] for c in np.split(x, S)]
        acc = np.float32(0)
        for v in parts:
            acc = np.float32(acc + v)
        split[str(S)] = float(acc)
    out["split_k"] = split
    # atomics: the 256 partial sums land in a random order each run
    parts = np.array([np.cumsum(c, dtype=np.float32)[-1] for c in np.split(x, 256)], dtype=np.float32)
    vals = []
    for _ in range(2000):
        acc = np.float32(0)
        for v in parts[rng.permutation(256)]:
            acc = np.float32(acc + v)
        vals.append(float(acc))
    u = sorted(set(vals))
    out["atomic_order"] = {"partials": 256, "runs": 2000, "distinct": len(u), "min": u[0], "max": u[-1],
                           "spread_ulps": int(round((u[-1] - u[0]) / np.spacing(np.float32(abs(exact)))))}
    out["ulp_at_exact"] = float(np.spacing(np.float32(abs(exact))))
    return out


def fp16_matmul_vs_reference():
    """A real kernel against a reference: torch fp16 and bf16 matmul on the M1 Pro GPU (MPS) against an
    fp64 CPU matmul of the same rounded inputs; how many elements pass assert_close's defaults."""
    out = {}
    dev = "mps" if torch.backends.mps.is_available() else None
    if dev is None:
        return {"skipped": "no MPS"}
    for dt, nm in ((torch.float16, "float16"), (torch.bfloat16, "bfloat16")):
        rows = []
        for K in (64, 512, 4096, 16384):
            g = torch.Generator().manual_seed(K)
            a = torch.randn(256, K, generator=g).to(dt); b = torch.randn(K, 256, generator=g).to(dt)
            ref64 = a.double() @ b.double()
            got = (a.to(dev) @ b.to(dev)).cpu()
            ref_same = ref64.to(dt)  # the reference rounded to the output dtype once
            rtol, atol = {torch.float16: (1e-3, 1e-5), torch.bfloat16: (1.6e-2, 1e-5)}[dt]
            diff = (got.double() - ref_same.double()).abs()
            allowed = atol + rtol * ref_same.double().abs()
            fail = int((diff > allowed).sum())
            scale = torch.sqrt((a.double() ** 2) @ (b.double() ** 2))
            rel_scaled = ((got.double() - ref64).abs() / scale)
            rows.append({"K": K, "elements": got.numel(), "fail_default": fail,
                         "max_abs": float(diff.max()), "median_abs_ref": float(ref64.abs().median()),
                         "max_err_over_scale": float(rel_scaled.max()), "p99_err_over_scale": float(torch.quantile(rel_scaled.flatten(), .99))})
        out[nm] = rows
    return out


def fp8_scaling():
    """Activations with a wide range cast to float8 e4m3fn: no scaling, one scale per tensor, one per row."""
    g = torch.Generator().manual_seed(1)
    x = torch.randn(1024, 1024, generator=g) * torch.exp(torch.randn(1024, 1, generator=g) * 2.0)
    x[3, 7] = 900.0  # one outlier above e4m3fn's max of 448
    def stats(xq, xs):
        err = (xq - xs).abs()
        nz = xs != 0
        rel = (err[nz] / xs[nz].abs())
        return {"nan": int(torch.isnan(xq).sum()), "zero_from_nonzero": int(((xq == 0) & nz).sum()),
                "median_rel_err": float(rel[~torch.isnan(rel)].median()),
                "p99_rel_err": float(torch.quantile(rel[~torch.isnan(rel)][:2_000_000], .99))}
    out = {"elements": x.numel(), "absmax": float(x.abs().max()), "min_abs": float(x.abs().min())}
    q = x.to(torch.float8_e4m3fn).float()
    out["no_scale"] = stats(q, x)
    s = 448.0 / x.abs().max()
    out["per_tensor"] = {**stats((x * s).to(torch.float8_e4m3fn).float() / s, x), "scale": float(s)}
    sr = 448.0 / x.abs().amax(1, keepdim=True)
    out["per_row"] = stats((x * sr).to(torch.float8_e4m3fn).float() / sr, x)
    # what does the cast do to values above 448?
    probe = torch.tensor([400.0, 448.0, 460.0, 480.0, 500.0, 900.0, float("inf")])
    out["cast_probe"] = {"in": probe.tolist(), "out": [None if math.isnan(v) else v for v in probe.to(torch.float8_e4m3fn).float().tolist()]}
    return out


def main():
    t0 = time.time()
    d, tol = dtypes()
    res = {"torch": torch.__version__, "numpy": np.__version__, "bf16_round_mismatches_vs_torch": check_bf16_round(),
           "dtypes": d, "assert_close_defaults": tol}
    res["summation"] = summation_order(); print("summation", flush=True)
    res["fp8"] = fp8_scaling(); print("fp8", flush=True)
    res["matmul_vs_ref"] = fp16_matmul_vs_reference(); print("matmul", flush=True)
    res["accumulate"] = accumulate(); print("accumulate", flush=True)
    res["seconds"] = round(time.time() - t0, 1)
    json.dump(res, open(OUT, "w"), indent=1)
    print("wrote out/numerics.json", res["seconds"], "s")


if __name__ == "__main__":
    main()
