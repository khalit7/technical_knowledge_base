"""Run the Pallas kernels of tp_kernels.py in interpret mode on CPU, on the running example's real tensors.
Writes out/pallas.json.

What is measured (deterministic unless marked timing): errors against jnp, the grid order the TPU interpreter walks,
what each interpret mode catches in three buggy kernels, the HLO that interpret mode builds, and the Mosaic MLIR that
JAX hands to the TPU compiler (lowered here with jax.export for platform "tpu"; NOT compiled: that needs libtpu and a TPU).
Timings: measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority; median of 5 after one warm-up.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # -I drops the script folder
import contextlib, io, re, statistics, time, traceback
import numpy as np
import jax, jax.numpy as jnp
from jax import export
from jax.experimental.pallas import tpu as pltpu
from jax._src.pallas.mosaic.interpret import interpret_pallas_call as IPC
import tp_common as T
import tp_kernels as K
import common as C, model_jax as MJ

cfg = C.CFG
params = MJ.from_torch(dict(np.load(C.path("data", "init_torch.npz"))), cfg)
x, _ = C.batch(0)
p0 = params["blocks"][0]
D, H, TT, B = cfg["d_model"], cfg["n_heads"], cfg["ctx"], cfg["batch"]
dh = D // H

# ---- the running example's real tensors, layer 0, training batch 0, initial weights -----------------------------
h0 = params["tok_emb"][x] + params["pos_emb"][:TT]                                   # [32, 128, 128]
a_in = MJ.layer_norm(p0["ln1"], h0, cfg["ln_eps"])
split = lambda t: t.reshape(B, TT, H, dh).transpose(0, 2, 1, 3).reshape(B * H, TT, dh)
q, k, v = (split(MJ.linear(p0["attn"][n], a_in)) for n in ("wq", "wk", "wv"))         # [128, 128, 32] each
h1 = h0 + MJ.attention(p0["attn"], a_in, H)
hid = jax.nn.gelu(MJ.linear(p0["mlp"]["fc1"], MJ.layer_norm(p0["ln2"], h1, cfg["ln_eps"])), approximate=False)
A = hid.reshape(B * TT, cfg["d_ff"])                                                   # [4096, 512]
W2 = p0["mlp"]["fc2"]["w"]                                                             # [512, 128]
ref_mm = jnp.dot(A, W2, precision="highest")
R = dict(shapes=dict(A=list(A.shape), W2=list(W2.shape), q=list(q.shape)))


def maxerr(a, b):
    return float(jnp.max(jnp.abs(a - b)))


def timeit(f, *args, n=5):
    jax.block_until_ready(f(*args))
    ts = []
    for _ in range(n):
        t0 = time.perf_counter(); jax.block_until_ready(f(*args)); ts.append(time.perf_counter() - t0)
    return statistics.median(ts)


# ---- 1. tiled matmul: correctness ----------------------------------------------------------------------------
mm = jax.jit(lambda a, b: K.matmul(a, b))
out = mm(A, W2)
R["matmul"] = dict(block=[512, 128, 128], grid=[8, 1, 4], err_f32=maxerr(out, ref_mm),
                   max_abs_ref=float(jnp.max(jnp.abs(ref_mm))))
# bf16 inputs, f32 accumulation (what the MXU does), against the f32 reference
out16 = jax.jit(lambda a, b: K.matmul(a.astype(jnp.bfloat16), b.astype(jnp.bfloat16)))(A, W2)
R["matmul"]["err_bf16_inputs"] = maxerr(out16, ref_mm)
R["matmul"]["err_xla_bf16_inputs"] = maxerr(jnp.dot(A.astype(jnp.bfloat16), W2.astype(jnp.bfloat16),
                                                     preferred_element_type=jnp.float32), ref_mm)
R["matmul"]["bf16_vs_xla_bf16"] = maxerr(out16, jnp.dot(A.astype(jnp.bfloat16), W2.astype(jnp.bfloat16),
                                                         preferred_element_type=jnp.float32))

# ---- 2. flash attention: correctness --------------------------------------------------------------------------
fa = jax.jit(lambda q, k, v: K.flash_attention(q, k, v))
ref_att = K.attention_reference(q, k, v)
R["flash"] = dict(block=[64, 64], grid=[B * H, 2, 2], err=maxerr(fa(q, k, v), ref_att),
                  max_abs_ref=float(jnp.max(jnp.abs(ref_att))))
# bytes the attention core moves to and from HBM (float32), naive vs flash: calculation
el_qkvo = 4 * B * H * TT * dh
R["flash"]["bytes_naive"] = 4 * (el_qkvo + 2 * B * H * TT * TT)        # q,k,v,o + scores written and read back
R["flash"]["bytes_flash"] = 4 * el_qkvo + 4 * B * H * TT * dh          # q,k,v,o + k,v read again for the 2nd q block (approx)
R["flash"]["scores_bytes"] = 4 * B * H * TT * TT
R["flash"]["blocks_total"] = B * H * 2 * 2
R["flash"]["blocks_run"] = B * H * 3                                    # causal: block (q0, k1) is skipped

# ---- 3. timings (rough) ---------------------------------------------------------------------------------------
xla_mm = jax.jit(lambda a, b: a @ b)
xla_att = jax.jit(K.attention_reference)
ip_mm = jax.jit(lambda a, b: K.matmul(a, b, interpret=pltpu.InterpretParams()))
R["timing"] = dict(label=T.LABEL_TIME, load=os.getloadavg()[0],
                   mm_xla_ms=timeit(xla_mm, A, W2) * 1e3, mm_interp_ms=timeit(mm, A, W2) * 1e3,
                   mm_tpu_interp_ms=timeit(ip_mm, A, W2, n=3) * 1e3,
                   att_xla_ms=timeit(xla_att, q, k, v) * 1e3, att_interp_ms=timeit(fa, q, k, v) * 1e3)

# ---- 4. what interpret mode builds: a while loop over the grid -----------------------------------------------
txt = mm.lower(A, W2).as_text()
R["interp_hlo"] = dict(lines=txt.count("\n"), whiles=txt.count("stablehlo.while"),
                       dynamic_slices=txt.count("stablehlo.dynamic_slice"),
                       dynamic_update_slices=txt.count("stablehlo.dynamic_update_slice"),
                       dots=txt.count("stablehlo.dot_general"))
xla_txt = xla_mm.lower(A, W2).as_text()
R["interp_hlo"]["xla_lines"] = xla_txt.count("\n")

# ---- 5. grid order, as the TPU interpreter walks it ------------------------------------------------------------
def walk(semantics, cores, seed=0, kernel=K.matmul_kernel, a=A, b=W2, **kw):
    pts = []

    def rec(tok, g, c):
        pts.append([int(t) for t in np.asarray(g)] + [int(c)])
        return tok
    ip = pltpu.InterpretParams(num_cores_or_threads=cores, random_seed=seed, grid_point_recorder=rec, detect_races=True)
    o = jax.block_until_ready(K.matmul(a, b, interpret=ip, semantics=semantics, kernel=kernel, **kw))
    return o, pts, bool(IPC.races.races_found) if IPC.races else False


o, pts, races = walk(None, 1)
R["walk_default"] = dict(points=pts, err=maxerr(o, ref_mm), races=races)
o, pts, races = walk(("parallel", "parallel", "arbitrary"), 2)
R["walk_2core"] = dict(points=pts, err=maxerr(o, ref_mm), races=races)

# ---- 6. three bugs and which interpret mode catches them --------------------------------------------------------
bugs = []
o = jax.jit(lambda a, b: K.matmul(a, b, kernel=K.matmul_kernel_nozero))(A, W2)
o2, _, _ = walk(None, 1, kernel=K.matmul_kernel_nozero)
bugs.append(dict(k="nozero", plain=dict(nan=bool(jnp.isnan(o).any())), tpu=dict(nan=bool(jnp.isnan(o2).any()))))
o = jax.jit(lambda a, b: K.matmul(a, b, semantics=("parallel", "parallel", "parallel")))(A, W2)
o2, pts2, races2 = walk(("parallel", "parallel", "parallel"), 2)
bugs.append(dict(k="kparallel", plain=dict(err=maxerr(o, ref_mm)), tpu=dict(err=maxerr(o2, ref_mm), races=races2,
                 first_k_tile0=int([p[2] for p in pts2 if p[0] == 0 and p[1] == 0][0]), order=pts2)))
bad_map = lambda i, j, k: (i, k + 1)
try:
    o = jax.jit(lambda a, b: K.matmul(a, b, a_map=bad_map))(A, W2)
    plain = dict(raised=False, err=maxerr(o, ref_mm))
except Exception as e:
    plain = dict(raised=True, msg=T.scrub(str(e))[:300])
try:
    o2, _, _ = walk(None, 1, a_map=bad_map)
    tpu = dict(raised=False, err=maxerr(o2, ref_mm))
except Exception as e:
    m = T.scrub(str(e))
    i = m.find("Out-of-bounds") if "Out-of-bounds" in m else m.lower().find("out of bounds")
    tpu = dict(raised=True, msg=m[max(0, i):max(0, i) + 300] if i >= 0 else m.splitlines()[-1][:300])
bugs.append(dict(k="oob", plain=plain, tpu=tpu))
R["bugs"] = bugs

# ---- 7. lowering for TPU on this CPU: the Mosaic module (not compiled) -----------------------------------------
S16 = jax.ShapeDtypeStruct
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    ex = export.export(jax.jit(lambda a, b: K.matmul(a, b, interpret=False, debug=True)),
                       platforms=["tpu"])(S16((4096, 512), jnp.bfloat16), S16((512, 128), jnp.bfloat16))
dbg = T.scrub(buf.getvalue())
mos = dbg[dbg.find("The Mosaic module"):]
mos = re.sub(r"pallas_call matmul_kernel at \S*", "pallas_call matmul_kernel", mos)
R["mosaic"] = dict(text=mos.strip(), stablehlo_custom_calls=ex.mlir_module().count("tpu_custom_call"),
                   ops=sorted(set(re.findall(r"\b(tpu\.[a-z_]+|vector\.[a-z_]+|arith\.[a-z_]+|scf\.[a-z_]+)", mos))))
# flash kernel lowers too? count its Mosaic ops
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    try:
        export.export(jax.jit(lambda q, k, v: K.flash_attention(q, k, v, interpret=False, debug=True)),
                      platforms=["tpu"])(*(S16((B * H, TT, dh), jnp.bfloat16),) * 3)
        fl = dict(ok=True)
    except Exception as e:
        fl = dict(ok=False, msg=T.scrub(str(e))[:400])
fmos = buf.getvalue()
fmos = fmos[fmos.find("The Mosaic module"):]
fl["n_matmul"] = fmos.count("tpu.matmul")
fl["lines"] = fmos.count("\n")
R["mosaic_flash"] = fl
# an illegal block shape: rejected when lowering for TPU, accepted by interpret mode
try:
    export.export(jax.jit(lambda a, b: K.matmul(a, b, bm=100, interpret=False)), platforms=["tpu"])(
        S16((300, 512), jnp.bfloat16), S16((512, 128), jnp.bfloat16))
    R["bad_block"] = dict(raised=False)
except Exception as e:
    m = T.scrub(str(e)).replace("pallas_call matmul_kernel at <path>", "pallas_call matmul_kernel")
    m = re.sub(r"\s+at \S+:\d+", "", m)
    R["bad_block"] = dict(raised=True, msg=m.split("See details")[0].strip()[:600])
R["bad_block"]["interpret_err"] = maxerr(jax.jit(lambda a, b: K.matmul(a, b, bm=100))(A[:300], W2),
                                         jnp.dot(A[:300], W2, precision="highest"))

# ---- 8. HBM -> VMEM traffic and VMEM footprint per block choice (rule: a block is copied only when its index changes)
def traffic(M, Kd, N, bm, bn, bk, eb_in=2, eb_out=4):
    gi, gj, gk = M // bm, N // bn, Kd // bk
    prev = [None, None, None]; cp = [0, 0, 0]; steps = 0
    for i in range(gi):
        for j in range(gj):
            for kk in range(gk):
                idx = [(i, kk), (kk, j), (i, j)]
                for t in range(3):
                    if idx[t] != prev[t]:
                        cp[t] += 1; prev[t] = idx[t]
                steps += 1
    by = cp[0] * bm * bk * eb_in + cp[1] * bk * bn * eb_in + cp[2] * bm * bn * eb_out
    vmem = 2 * (bm * bk + bk * bn) * eb_in + 2 * bm * bn * eb_out          # 2 buffers per operand (Pallas default)
    return dict(bm=bm, bn=bn, bk=bk, steps=steps, copies=cp, hbm_bytes=by, vmem_bytes=vmem,
                min_bytes=(M * Kd + Kd * N) * eb_in + M * N * eb_out)


cfgs = [(128, 128, 128), (256, 128, 128), (512, 128, 128), (512, 128, 256), (1024, 128, 512), (4096, 128, 512)]
R["traffic"] = [traffic(4096, 512, 128, *c) for c in cfgs]
# each configuration lowers for TPU (block shapes legal)?
for t in R["traffic"]:
    try:
        export.export(jax.jit(lambda a, b, t=t: K.matmul(a, b, bm=t["bm"], bn=t["bn"], bk=t["bk"], interpret=False)),
                      platforms=["tpu"])(S16((4096, 512), jnp.bfloat16), S16((512, 128), jnp.bfloat16))
        t["lowers"] = True
    except Exception as e:
        t["lowers"] = False
# 7B-class example: an MLP up projection, 4096 tokens x 4096 -> 11008 (Llama 2 7B shapes), bf16 in, f32 out
R["traffic7b"] = [traffic(4096, 4096, 11008, *c) for c in
                  [(128, 128, 128), (512, 256, 512), (1024, 256, 1024), (512, 5504, 256)]]

T.save("pallas.json", R)
for kk in ("matmul", "flash", "timing", "interp_hlo", "bad_block", "mosaic_flash"):
    print(kk, {a: b for a, b in R[kk].items() if a not in ("text",)})
for b in R["bugs"]:
    print(b["k"], {a: c for a, c in b["plain"].items()}, {a: c for a, c in b["tpu"].items() if a != "order"})
for t in R["traffic"] + R["traffic7b"]:
    print(t)
print(R["mosaic"]["ops"])
