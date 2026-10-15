"""Pipelining: what the BlockSpec pipeline accepts (buffer counts), and the timeline data for the Reading tab's
before/after animation (copies and matmuls serial vs overlapped). Writes out/pipeline.json.

Run here (deterministic): pipeline_mode=pl.Buffered(n) for n = 1, 2, 3 in interpret mode (correctness) and lowered
for TPU v5e with jax.export (accepted or the error). Calculated, not measured: step times on a TPU v5e from Google's
published 197 TFLOP/s (bf16) and 819 GB/s HBM bandwidth, as the Pallas TPU matmul guide uses them
(docs/pallas/tpu/matmul.md at jax-v0.11.2); no DMA latency, issue cost or pipeline overhead is modelled.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import contextlib, io, re
import jax, jax.numpy as jnp
from jax import export
from jax.experimental import pallas as pl
from jax.experimental.pallas import tpu as pltpu
from jax._src.mesh import AbstractDevice, AbstractMesh
import pk_common as P
import pk_kernels as K
import tp_kernels as TK

R = P.running_example()
V5E = AbstractMesh((1,), ("x",), abstract_device=AbstractDevice("TPU v5 lite", 1, "tpu"))
PEAK, BW = 197e12, 819e9
A, W2 = R["A"], R["W2"]
ref = jnp.dot(A, W2, precision="highest")


def mm_buffered(a, b, n, interpret, bm=512, bn=128, bk=128):
    M, Kd = a.shape
    _, N = b.shape
    mode = pl.Buffered(n)
    return pl.pallas_call(
        TK.matmul_kernel,                        # the root lab's kernel, unchanged
        out_shape=jax.ShapeDtypeStruct((M, N), jnp.float32),
        grid=(M // bm, N // bn, Kd // bk),
        in_specs=[pl.BlockSpec((bm, bk), lambda i, j, k: (i, k), pipeline_mode=mode),
                  pl.BlockSpec((bk, bn), lambda i, j, k: (k, j), pipeline_mode=mode)],
        out_specs=pl.BlockSpec((bm, bn), lambda i, j, k: (i, j)),
        interpret=interpret)(a, b)


buf = {}
for n in (1, 2, 3):
    e = P.maxerr(jax.jit(lambda a, b: mm_buffered(a, b, n, True))(A, W2), ref)
    try:
        with jax.sharding.use_abstract_mesh(V5E), contextlib.redirect_stdout(io.StringIO()):
            export.export(jax.jit(lambda a, b: mm_buffered(a, b, n, False)), platforms=["tpu"])(
                jax.ShapeDtypeStruct((4096, 512), jnp.bfloat16), jax.ShapeDtypeStruct((512, 128), jnp.bfloat16))
        low = dict(ok=True)
    except Exception as ex:
        m = P.scrub(str(ex))
        low = dict(ok=False, msg=m.split("See details")[0].strip()[:300])
    vmem = n * (512 * 128 + 128 * 128) * 2 + 2 * 512 * 128 * 4
    buf[n] = dict(err=e, lower=low, vmem_bytes=vmem)
    print(n, buf[n])


# ---- timeline: per grid step, bytes copied in (blocks whose index changed), FLOPs, bytes written back
def steps_matmul(M, Kd, N, bm, bn, bk, eb=2, eo=4, limit=None):
    out = []
    prev = [None, None, None]
    gi, gj, gk = M // bm, N // bn, Kd // bk
    for i in range(gi):
        for j in range(gj):
            for k in range(gk):
                idx = [(i, k), (k, j), (i, j)]
                cin = (bm * bk * eb if idx[0] != prev[0] else 0) + (bk * bn * eb if idx[1] != prev[1] else 0)
                prev = [idx[0], idx[1], prev[2]]
                wb = bm * bn * eo if k == gk - 1 else 0                    # output block leaves after its last k
                out.append(dict(g=[i, j, k], in_us=cin / BW * 1e6, mxu_us=2 * bm * bn * bk / PEAK * 1e6,
                                out_us=wb / BW * 1e6, in_bytes=cin, flops=2 * bm * bn * bk))
                if limit and len(out) >= limit:
                    return out
    return out


def schedule(steps, overlap):
    """Two lanes, DMA and compute, in microseconds. Serial: copy in, compute, copy out, one after the other.
    Double-buffered (what a BlockSpec pipeline does): while step s computes, the copy for step s+1 runs on the DMA
    lane, and step s's output block is written back after it is final. The DMA lane serves requests in order."""
    seg = []
    if not overlap:
        t = 0.0
        for s, st in enumerate(steps):
            if st["in_us"]:
                seg.append(["dma", t, t + st["in_us"], s, "in"]); t += st["in_us"]
            seg.append(["mxu", t, t + st["mxu_us"], s, "mm"]); t += st["mxu_us"]
            if st["out_us"]:
                seg.append(["dma", t, t + st["out_us"], s, "out"]); t += st["out_us"]
        return seg, t
    n = len(steps)
    in_end = [0.0] * n
    dma = steps[0]["in_us"]
    if dma:
        seg.append(["dma", 0.0, dma, 0, "in"])
    in_end[0] = dma
    ce_prev, end = 0.0, 0.0
    for s in range(n):
        cs = max(in_end[s], ce_prev)
        ce = cs + steps[s]["mxu_us"]
        seg.append(["mxu", cs, ce, s, "mm"])
        if s > 0 and steps[s - 1]["out_us"]:                      # previous output block, final since ce_prev
            st0 = max(dma, ce_prev); dma = st0 + steps[s - 1]["out_us"]
            seg.append(["dma", st0, dma, s - 1, "out"])
        if s + 1 < n:                                            # prefetch the next step's changed blocks
            st0 = max(dma, cs); d = steps[s + 1]["in_us"]
            if d:
                seg.append(["dma", st0, st0 + d, s + 1, "in"]); dma = st0 + d
            in_end[s + 1] = max(dma, st0) if d else cs
        ce_prev = ce
    if steps[-1]["out_us"]:
        st0 = max(dma, ce_prev); dma = st0 + steps[-1]["out_us"]
        seg.append(["dma", st0, dma, n - 1, "out"])
    return seg, max(dma, ce_prev)


cases = {}
for key, title, args, lim in (
        ("toy", "The running example's MLP down-projection: [4,096 x 512] x [512 x 128], blocks 512 x 128 x 128", (4096, 512, 128, 512, 128, 128), None),
        ("big", "A 7B-class MLP up-projection: [4,096 x 4,096] x [4,096 x 11,008], blocks 512 x 1,024 x 1,024 (first 12 steps)", (4096, 4096, 11008, 512, 1024, 1024), 12)):
    st = steps_matmul(*args, limit=lim)
    s_ser, t_ser = schedule(st, False)
    s_ovl, t_ovl = schedule(st, True)
    cases[key] = dict(title=title, steps=st, serial=s_ser, overlap=s_ovl, t_serial=t_ser, t_overlap=t_ovl,
                      dma_total=sum(x["in_us"] + x["out_us"] for x in st), mxu_total=sum(x["mxu_us"] for x in st))
    print(key, len(st), "serial %.2f us, overlapped %.2f us, dma %.2f, mxu %.2f" % (t_ser, t_ovl, cases[key]["dma_total"], cases[key]["mxu_total"]))

P.save("pipeline.json", dict(buffered=buf, peak=PEAK, bw=BW, cases=cases))
