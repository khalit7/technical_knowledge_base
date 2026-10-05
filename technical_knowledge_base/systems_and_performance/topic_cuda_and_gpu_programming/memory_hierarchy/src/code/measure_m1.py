"""GPU memory hierarchy child page: measurements on the Apple M1 Pro GPU (16 cores) through MLX custom Metal kernels.

Each case is checked against NumPy before it is timed. Cases (one group per Reading section):
  widths   : copy 256 MB with 4-, 8- and 16-byte accesses per thread
  aos      : read one 4-byte field of 16M 32-byte structs (AoS), the same field from its own array (SoA), all 8 fields (AoS)
  tgwide   : threadgroup-memory reads of 4/8/16-byte elements at lane strides 1, 2, 4, 8 (in elements)
  local    : a 16-entry per-thread array updated with a run-time index against the same work with constant indices only
  roof     : read one float4, do F steps of 8 independent FMAs, write one float: arithmetic intensity (16F+11)/20 FLOP/byte
  (const, a constant-address-space table, was tried and dropped: see ../README.md)
Timing: spin up, warm up, then TRIALS trials of REPS calls with mx.eval + mx.synchronize; median, min, max, load average.
Usage: python measure_m1.py OUT.json   (needs mlx; run outside the repo's project)
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx

TRIALS = 7
OUT = sys.argv[1] if len(sys.argv) > 1 else "m1.json"
res = {"meta": {"mlx": mx.__version__, "numpy": np.__version__, "python": platform.python_version(),
                "device": {k: (v if isinstance(v, (int, float, str)) else str(v)) for k, v in mx.device_info().items()},
                "date": time.strftime("%Y-%m-%d %H:%M"), "load_start": os.getloadavg()[0]}, "cases": []}
_spun = set()


def spin(fn, secs=0.6):
    t0 = time.perf_counter()
    while time.perf_counter() - t0 < secs:
        mx.eval(fn())
    mx.synchronize()


def timeit(fn, reps):
    g = sys._getframe(1).f_code.co_name
    if g not in _spun:
        _spun.add(g); spin(fn)
    for _ in range(2):
        mx.eval(fn())
    mx.synchronize()
    ts = []
    for _ in range(TRIALS):
        t0 = time.perf_counter()
        for _ in range(reps):
            mx.eval(fn())
        mx.synchronize()
        ts.append((time.perf_counter() - t0) / reps)
    ts.sort()
    return {"median_s": ts[len(ts) // 2], "min_s": ts[0], "max_s": ts[-1], "trials": TRIALS, "reps": reps}


def add(group, name, t, **kw):
    c = {"group": group, "name": name, "load": os.getloadavg()[0], **t, **kw}
    res["cases"].append(c)
    print(f"{group:7s} {name:36s} {t['median_s']*1e3:9.3f} ms ({t['min_s']*1e3:.3f}-{t['max_s']*1e3:.3f}) load {c['load']:.1f} {kw}", flush=True)


def K(name, inputs, outputs, src, header=""):
    return mx.fast.metal_kernel(name=name, input_names=inputs, output_names=outputs, source=src, header=header)


# ---------------- widths: 4, 8, 16 bytes per access ----------------
WIDTH_SRC = {
    1: "uint g = thread_position_in_grid.x; out[g] = inp[g];",
    2: "uint g = thread_position_in_grid.x; ((device float2*)out)[g] = ((const device float2*)inp)[g];",
    4: "uint g = thread_position_in_grid.x; ((device float4*)out)[g] = ((const device float4*)inp)[g];",
}
width_k = {v: K(f"mh_w{v}", ["inp"], ["out"], s) for v, s in WIDTH_SRC.items()}


def widths():
    m = 1 << 26  # 64M floats = 256 MB in, 256 MB out
    a = mx.random.uniform(shape=(m,), dtype=mx.float32); mx.eval(a)
    na = np.asarray(a)
    for v in (1, 2, 4):
        f = lambda: width_k[v](inputs=[a], grid=(m // v, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(m,)], output_dtypes=[mx.float32])[0]
        assert np.array_equal(np.asarray(f()), na), v
        t = timeit(f, 5)
        add("widths", f"{4*v}-byte accesses", t, bytes_per_access=4 * v, threads=m // v, bytes=8 * m, gbps=8 * m / t["median_s"] / 1e9)
    del a


# ---------------- AoS against SoA ----------------
AOS1 = "uint i = thread_position_in_grid.x; out[i] = p[i * 8];"
AOSALL = "uint i = thread_position_in_grid.x; float s = 0.0f; for (uint j = 0; j < 8; ++j) s += p[i * 8 + j]; out[i] = s;"
SOA1 = "uint i = thread_position_in_grid.x; out[i] = p[i];"
aos1_k, aosall_k, soa1_k = K("mh_aos1", ["p"], ["out"], AOS1), K("mh_aosall", ["p"], ["out"], AOSALL), K("mh_soa1", ["p"], ["out"], SOA1)


def aos():
    n = 1 << 24  # 16M particles of 8 floats = 512 MB
    p = mx.random.uniform(shape=(n * 8,), dtype=mx.float32); mx.eval(p)
    x = p.reshape(n, 8)[:, 0] + 0; mx.eval(x)  # the SoA x array (64 MB)
    npp = np.asarray(p).reshape(n, 8)
    kw = dict(grid=(n, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(n,)], output_dtypes=[mx.float32])
    cases = [("AoS, read field x", lambda: aos1_k(inputs=[p], **kw)[0], npp[:, 0], 4 * n, 32 * n),
             ("SoA, read array x", lambda: soa1_k(inputs=[x], **kw)[0], npp[:, 0], 4 * n, 4 * n),
             ("AoS, read all 8 fields", lambda: aosall_k(inputs=[p], **kw)[0], None, 32 * n, 32 * n)]
    for name, f, ref, useful, footprint in cases:
        got = np.asarray(f())
        if ref is not None:
            assert np.array_equal(got, ref), name
        else:
            assert np.allclose(got[:1000], npp[:1000].sum(1, dtype=np.float32), rtol=1e-5), name
        t = timeit(f, 5)
        add("aos", name, t, useful_bytes=useful, footprint_bytes=footprint, moved_bytes=footprint + 4 * n, gbps_moved=(footprint + 4 * n) / t["median_s"] / 1e9, gbps_useful=useful / t["median_s"] / 1e9,
            gbps_footprint=footprint / t["median_s"] / 1e9)
    del p, x


# ---------------- threadgroup memory: wide elements ----------------
TG_SRC = """
    threadgroup VT buf[NE];
    uint lid = thread_position_in_threadgroup.x;
    const device VT* src = (const device VT*)inp;
    for (uint i = lid; i < NE; i += 256) buf[i] = src[i];
    threadgroup_barrier(mem_flags::mem_threadgroup);
    VT v = VT(0.0f);
    uint base = lid * S;
    for (uint k = 0; k < ITERS; ++k) v += buf[(base + k) & (NE - 1)];
    out[thread_position_in_grid.x] = dot(VT(1.0f), v);
"""
TG1_SRC = TG_SRC.replace("dot(VT(1.0f), v)", "v")


def tgwide():
    inp = mx.random.uniform(shape=(4096,), dtype=mx.float32); mx.eval(inp)  # 16 KB of threadgroup memory in every case
    ni = np.asarray(inp).astype(np.float64)
    th, iters = 256 * 512, 1024
    for vec, vt in ((1, "float"), (2, "float2"), (4, "float4")):
        ne = 4096 // vec
        k = K(f"mh_tg{vec}", ["inp"], ["out"], (TG1_SRC if vec == 1 else TG_SRC).replace("VT", vt))
        for s in sorted({1, 2, 4, 8, 32 // vec, 32 // vec + 1}):
            f = lambda: k(inputs=[inp], template=[("S", s), ("ITERS", iters), ("NE", ne)], grid=(th, 1, 1), threadgroup=(256, 1, 1),
                          output_shapes=[(th,)], output_dtypes=[mx.float32])[0]
            got = np.asarray(f())
            el = ni.reshape(ne, vec).sum(1)
            for gid in (0, 9, 255):
                ref = sum(el[(gid % 256 * s + kk) & (ne - 1)] for kk in range(iters))
                assert abs(got[gid] - ref) < 1e-3 * max(1, abs(ref)), (vec, s, gid, got[gid], ref)
            t = timeit(f, 5)
            add("tgwide", f"{4*vec}-byte elements, lane stride {s}", t, bytes_per_access=4 * vec, stride=s, reads=th * iters,
                gbytes_per_s=th * iters * 4 * vec / t["median_s"] / 1e9, greads_per_s=th * iters / t["median_s"] / 1e9)


# ---------------- per-thread array: run-time index ----------------
LOCAL_SRC = """
    uint t = thread_position_in_grid.x;
    float h[16];
    for (uint j = 0; j < 16; ++j) h[j] = 0.0f;
    for (uint k = 0; k < ITERS; ++k) {
        uint b = ((t * 2654435761u) ^ (k * 40503u)) >> 28;     // a bin from 0 to 15, known only at run time
        if (DYN) { h[b] += 1.0f; }
        else { for (uint j = 0; j < 16; ++j) h[j] += (b == j) ? 1.0f : 0.0f; }
    }
    for (uint j = 0; j < 16; ++j) out[j * threads_per_grid.x + t] = h[j];
"""
local_k = K("mh_local", ["dummy"], ["out"], LOCAL_SRC)


def local():
    th, iters = 1 << 18, 1024
    dummy = mx.zeros((1,), dtype=mx.float32)
    t_ = np.arange(th, dtype=np.uint64)
    for dyn in (1, 0):
        f = lambda: local_k(inputs=[dummy], template=[("ITERS", iters), ("DYN", dyn)], grid=(th, 1, 1), threadgroup=(256, 1, 1),
                            output_shapes=[(16 * th,)], output_dtypes=[mx.float32])[0]
        got = np.asarray(f()).reshape(16, th)
        for tt in (0, 5, th - 1):
            ref = np.zeros(16)
            for kk in range(iters):
                b = (((tt * 2654435761) & 0xFFFFFFFF) ^ ((kk * 40503) & 0xFFFFFFFF)) >> 28
                ref[b] += 1
            assert np.array_equal(got[:, tt], ref), (dyn, tt)
        t = timeit(f, 5)
        add("local", "run-time index h[b] += 1" if dyn else "constant indices only (16 selects)", t, dynamic=dyn,
            updates=th * iters, gupdates_per_s=th * iters / t["median_s"] / 1e9)


# ---------------- roofline sweep ----------------
# Two float4 chains (8 FMAs = 16 FLOPs per step), the step written out 8 times per loop pass so loop overhead stays small.
ROOF_SRC = """
    uint g = thread_position_in_grid.x;
    float4 a = ((const device float4*)inp)[g];
    float4 b = a * 0.5f;
    const float4 m = float4(0.999f), c = float4(0.25f);
    for (uint k = 0; k < F / 8; ++k) { STEP STEP STEP STEP STEP STEP STEP STEP }
    for (uint k = 0; k < F % 8; ++k) { STEP }
    out[g] = dot(a + b, float4(1.0f));
"""
ROOF_HDR = "#define STEP a = fma(a, m, c); b = fma(b, m, c);\n"
roof_k = K("mh_roof", ["inp"], ["out"], ROOF_SRC, header=ROOF_HDR)


def roof():
    th = 1 << 24  # 16M threads read 256 MB (16 B each) and write 64 MB (4 B each)
    a = mx.random.uniform(shape=(4 * th,), dtype=mx.float32); mx.eval(a)
    na = np.asarray(a).reshape(th, 4).astype(np.float64)
    for F in (1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024):
        f = lambda: roof_k(inputs=[a], template=[("F", F)], grid=(th, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(th,)], output_dtypes=[mx.float32])[0]
        got = np.asarray(f())
        for gid in (0, 123457):
            ra, rb = na[gid].copy(), na[gid] * 0.5
            for _ in range(F):
                ra = ra * 0.999 + 0.25; rb = rb * 0.999 + 0.25
            ref = ra.sum() + rb.sum()
            assert abs(got[gid] - ref) < 1e-3 * abs(ref), (F, got[gid], ref)
        t = timeit(f, 3 if F >= 256 else 5)
        flops, byts = (16 * F + 4 + 7) * th, 20 * th   # 16 per step, the b = a * 0.5 (4) and the final dot (7)
        add("roof", f"F = {F}", t, F=F, flops=flops, bytes=byts, ai=flops / byts, gflops=flops / t["median_s"] / 1e9,
            gbps=byts / t["median_s"] / 1e9)
    del a


for fn in (widths, aos, tgwide, local, roof):
    fn()
    mx.clear_cache()
res["meta"]["load_end"] = os.getloadavg()[0]
with open(OUT, "w") as fh:
    json.dump(res, fh, indent=1)
print("wrote", OUT)
