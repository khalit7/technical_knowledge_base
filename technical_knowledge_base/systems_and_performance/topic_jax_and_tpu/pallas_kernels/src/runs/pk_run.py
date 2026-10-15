"""Run every kernel of pk_kernels.py (and the production kernels shipped with jax) on the running example's real tensors,
in Pallas interpret mode on CPU. Writes out/kernels.json.

Deterministic results: errors against jnp references (forward and gradients), errors in bf16, what the TPU interpreter
reports, deliberate bugs, lowering for TPU (Mosaic) and for an NVIDIA GPU (Triton) with jax.export on this CPU.
Timings: measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority; median of 3 after one warm-up. They
say nothing about TPU speed: interpret mode runs the kernel body as ordinary XLA:CPU code inside a loop over the grid.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # -I drops the script folder
import contextlib, functools, io, math, re, time
import numpy as np
import jax, jax.numpy as jnp
from jax import export
from jax.experimental import pallas as pl
from jax.experimental.pallas import tpu as pltpu
from jax._src.mesh import AbstractDevice, AbstractMesh
import pk_common as P
import pk_kernels as K
import tp_kernels as TK                     # the root lab's matmul and flash forward, imported, not copied
import common as C

T0 = time.time()
R = P.running_example()
MJ, cfg = R["MJ"], R["cfg"]
B, H, T, D, dh = R["B"], R["H"], R["T"], R["D"], R["dh"]
q, k, v, A, W2 = R["q"], R["k"], R["v"], R["A"], R["W2"]
p0 = R["params"]["blocks"][0]
OUT = dict(label_time=P.LABEL_TIME, load_start=os.getloadavg()[0], jax=jax.__version__)
S16 = lambda *s: jax.ShapeDtypeStruct(s, jnp.bfloat16)
S32 = lambda *s: jax.ShapeDtypeStruct(s, jnp.float32)
log = lambda *a: print(f"[{time.time() - T0:6.1f}s]", *a, flush=True)


def mosaic(f, *shapes, mesh=None):
    """Lower f for TPU on this CPU (jax.export, not compiled). Returns ok, message, op counts, Mosaic text."""
    buf = io.StringIO()
    mesh = mesh or V5E                                       # target chip for lowering: TPU v5e ("TPU v5 lite")
    orig = pl.pallas_call
    pl.pallas_call = functools.partial(orig, debug=True)     # print the Mosaic module (not shown in the kernels)
    try:
        with jax.sharding.use_abstract_mesh(mesh), contextlib.redirect_stdout(buf):
            ex = export.export(jax.jit(f), platforms=["tpu"])(*shapes)
        txt = buf.getvalue()
        mods = [m for m in txt.split("The Mosaic module for ")[1:]]
        mtxt = "\n".join(mods)
        ops = {}
        for o in re.findall(r"\b((?:tpu|vector|arith|scf|math|memref)\.[a-z_0-9]+)\b", mtxt):
            ops[o] = ops.get(o, 0) + 1
        return dict(ok=True, kernels=ex.mlir_module().count("tpu_custom_call"), ops=ops,
                    lines=sum(m.count("\n") for m in mods)), mods
    except Exception as e:
        m = P.scrub(str(e))
        m = re.sub(r"\s+at <path>:\d+", "", m)
        return dict(ok=False, msg=m.split("See details")[0].strip()[:700]), []
    finally:
        pl.pallas_call = orig


def clean_mosaic(m):
    m = P.scrub(m)
    m = re.sub(r"pallas_call (\w+) at <path>:\d+:", r"pallas_call \1", m)
    return m.strip()


TPUI = lambda **kw: pltpu.InterpretParams(**kw)
V5E = AbstractMesh((1,), ("x",), abstract_device=AbstractDevice("TPU v5 lite", 1, "tpu"))
KERN = {}

# ---------------------------------------------------------------- 1. bias + exact GELU (elementwise)
pre = MJ.layer_norm(p0["ln2"], R["h1"], cfg["ln_eps"]).reshape(B * T, D) @ p0["mlp"]["fc1"]["w"]   # [4096, 512]
b1 = p0["mlp"]["fc1"]["b"]
ref = jax.nn.gelu(pre + b1, approximate=False)
f = jax.jit(lambda x, b: K.bias_gelu(x, b))
KERN["bias_gelu"] = dict(
    inp="layer 0 MLP pre-activation x W1 [4,096 x 512] and bias b1 [512]", grid=[8], block=[512, 512],
    err=P.maxerr(f(pre, b1), ref), max_ref=float(jnp.abs(ref).max()),
    err_vs_A=P.maxerr(f(pre, b1), A),
    err_tanh_gelu=P.maxerr(jax.nn.gelu(pre + b1), ref),
    err_tpu_interp=P.maxerr(jax.jit(lambda x, b: K.bias_gelu(x, b, interpret=TPUI(detect_races=True)))(pre, b1), ref))
KERN["bias_gelu"]["lower"], _ = mosaic(lambda x, b: K.bias_gelu(x, b, interpret=False), S32(4096, 512), S32(512))
log("bias_gelu", KERN["bias_gelu"]["err"])

# ---------------------------------------------------------------- 2. fused softmax over rows (attention scores)
s = jnp.einsum("btd,bsd->bts", q, k) / math.sqrt(dh)
s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
S2 = s.reshape(B * H * T, T)                                                       # [16,384, 128]
ref = jax.nn.softmax(S2, axis=-1)
f = jax.jit(lambda x: K.softmax_rows(x))
o = f(S2)
o16 = jax.jit(lambda x: K.softmax_rows(x))(S2.astype(jnp.bfloat16))
KERN["softmax_rows"] = dict(
    inp="layer 0 attention scores, scaled and causally masked, all 128 heads [16,384 x 128]", grid=[32],
    block=[512, 128], err=P.maxerr(o, ref), row_sum_err=float(jnp.abs(o.sum(-1) - 1).max()),
    err_bf16_in=P.maxerr(o16, ref), err_xla_bf16_in=P.maxerr(jax.nn.softmax(S2.astype(jnp.bfloat16), -1), ref),
    masked_frac=float(jnp.mean(jnp.isinf(S2))))
KERN["softmax_rows"]["lower"], _ = mosaic(lambda x: K.softmax_rows(x, interpret=False), S32(16384, 128))
log("softmax", KERN["softmax_rows"]["err"])

# ---------------------------------------------------------------- 3. fused cross-entropy (vocabulary 65)
logits = MJ.apply(R["params"], R["x"], cfg).reshape(B * T, cfg["vocab"])        # [4096, 65]
labels = R["y"].reshape(-1)
f = jax.jit(lambda z, y: K.xent_rows(z, y))
lk = f(logits, labels)
lref = MJ.loss_fn(R["params"], R["x"], R["y"], cfg)
KERN["xent_rows"] = dict(
    inp="logits of the whole model at initialisation, batch 0 [4,096 x 65], with the targets", grid=[8],
    block=[512, 65], mean_loss=float(lk.mean()), model_loss=float(lref), err_mean=abs(float(lk.mean()) - float(lref)),
    err_rows=P.maxerr(lk[:, 0], -jnp.take_along_axis(jax.nn.log_softmax(logits, -1), labels[:, None], 1)[:, 0]),
    ln65=math.log(65), lanes_padded=128, lane_waste=1 - 65 / 128)
KERN["xent_rows"]["lower"], _ = mosaic(lambda z, y: K.xent_rows(z, y, interpret=False), S32(4096, 65),
                                       jax.ShapeDtypeStruct((4096,), jnp.int32))
log("xent", KERN["xent_rows"]["mean_loss"], KERN["xent_rows"]["model_loss"])

# ---------------------------------------------------------------- 4. layer norm forward and backward (custom_vjp)
pt = MJ.from_torch(dict(np.load(C.path("data", "final_torch_500.npz"))), cfg)   # trained 500 steps: real scale/bias
ln = pt["blocks"][0]["ln1"]
hx = (pt["tok_emb"][R["x"]] + pt["pos_emb"][:T]).reshape(B * T, D)             # [4096, 128]
dy = jax.random.normal(jax.random.key(0), hx.shape, jnp.float32)                  # a fixed upstream gradient
lnf = lambda x, g, b: MJ.layer_norm({"scale": g, "bias": b}, x, cfg["ln_eps"])
y_ref = lnf(hx, ln["scale"], ln["bias"])
g_ref = jax.vjp(lnf, hx, ln["scale"], ln["bias"])[1](dy)
y_k = jax.jit(lambda x, g, b: K.layer_norm(x, g, b))(hx, ln["scale"], ln["bias"])
g_k = jax.jit(lambda x, g, b, d: jax.vjp(lambda *a: K.layer_norm(*a), x, g, b)[1](d))(hx, ln["scale"], ln["bias"], dy)
names = ["dx", "dscale", "dbias"]
KERN["layer_norm"] = dict(
    inp="layer 0 input (embeddings) and ln1 after 500 training steps [4,096 x 128]; upstream gradient N(0, 1), key 0",
    grid=[16], block=[256, 128], err=P.maxerr(y_k, y_ref), max_ref=float(jnp.abs(y_ref).max()),
    grads={n: dict(err=P.maxerr(a, b), max_ref=float(jnp.abs(b).max()), rel=P.maxerr(a, b) / float(jnp.abs(b).max()))
           for n, a, b in zip(names, g_k, g_ref)},
    scale_range=[float(ln["scale"].min()), float(ln["scale"].max())])
# residuals saved for the backward: what the custom_vjp keeps vs what XLA's autodiff keeps for the jnp version
res_k = jax.eval_shape(lambda x, g, b: K._layer_norm_fwd(x, g, b, 1e-5, 256, True)[1], hx, ln["scale"], ln["bias"])
KERN["layer_norm"]["res_kernel_bytes"] = int(sum(np.prod(r.shape) * r.dtype.itemsize for r in res_k))
KERN["layer_norm"]["lower_fwd"], _ = mosaic(lambda x, g, b: K._ln_fwd_call(x, g, b, 1e-5, 256, False),
                                            S32(4096, 128), S32(128), S32(128))
KERN["layer_norm"]["lower_bwd"], _ = mosaic(lambda x, g, mu, rs, d: K._ln_bwd_call(x, g, mu, rs, d, 256, False),
                                            S32(4096, 128), S32(128), S32(4096, 1), S32(4096, 1), S32(4096, 128))
log("layer_norm", KERN["layer_norm"]["err"], KERN["layer_norm"]["grads"])

# ---------------------------------------------------------------- 5. flash attention: forward with lse, backward
ref_o = TK.attention_reference(q, k, v)
do = jax.random.normal(jax.random.key(1), q.shape, jnp.float32)
ref_g = jax.vjp(TK.attention_reference, q, k, v)[1](do)
o_k, lse_k = jax.jit(lambda q, k, v: K.flash_fwd(q, k, v))(q, k, v)
lse_ref = jax.nn.logsumexp(s, axis=-1)[..., None]
g_k = jax.jit(lambda q, k, v, d: jax.vjp(lambda *a: K.flash_attention(*a), q, k, v)[1](d))(q, k, v, do)
o_root = jax.jit(lambda q, k, v: TK.flash_attention(q, k, v))(q, k, v)
KERN["flash"] = dict(
    inp="layer 0 q, k, v of all 32 sequences x 4 heads [128 x 128 x 32]; upstream gradient N(0, 1), key 1",
    grid_fwd=[128, 2, 2], grid_dkv=[128, 2, 2], grid_dq=[128, 2, 2], block=[64, 64],
    err=P.maxerr(o_k, ref_o), err_root_kernel=P.maxerr(o_root, ref_o), same_as_root=P.maxerr(o_k, o_root),
    err_lse=P.maxerr(lse_k, lse_ref), max_ref=float(jnp.abs(ref_o).max()),
    grads={n: dict(err=P.maxerr(a, b), max_ref=float(jnp.abs(b).max())) for n, a, b in zip(["dq", "dk", "dv"], g_k, ref_g)})
# bf16 inputs (what a TPU kernel would get), f32 accumulation
o16 = jax.jit(lambda q, k, v: K.flash_fwd(q, k, v)[0])(*(t.astype(jnp.bfloat16) for t in (q, k, v)))
x16 = TK.attention_reference(*(t.astype(jnp.bfloat16).astype(jnp.float32) for t in (q, k, v)))
KERN["flash"]["err_bf16_in"] = P.maxerr(o16, ref_o)
KERN["flash"]["err_bf16_vs_f32_of_bf16"] = P.maxerr(o16, x16)
# residual memory: flash keeps o and lse; plain autodiff of the reference keeps the T x T probabilities
KERN["flash"]["res_lse_bytes"] = int(4 * B * H * T)                       # beyond q, k, v, o: one float per row
KERN["flash"]["res_naive_P_bytes"] = int(4 * B * H * T * T)
KERN["flash"]["lower_fwd"], _ = mosaic(lambda q, k, v: K.flash_fwd(q, k, v, interpret=False), *(S16(128, 128, 32),) * 3)
KERN["flash"]["lower_bwd"], _ = mosaic(lambda q, k, v, o, l, d: K.flash_bwd(q, k, v, o, l, d, interpret=False),
                                       *(S16(128, 128, 32),) * 4, S32(128, 128, 1), S16(128, 128, 32))
log("flash", KERN["flash"]["err"], KERN["flash"]["grads"])

# block-size sweep for the flash forward (correctness and TPU lowering of each choice)
sweep = []
for bq, bk in [(16, 16), (32, 32), (64, 64), (128, 128), (32, 128), (128, 32), (64, 32)]:
    e = P.maxerr(jax.jit(lambda q, k, v: K.flash_fwd(q, k, v, bq=bq, bk=bk)[0])(q, k, v), ref_o)
    lw, _ = mosaic(lambda q, k, v: K.flash_fwd(q, k, v, bq=bq, bk=bk, interpret=False), *(S16(128, 128, 32),) * 3)
    nq, nk = T // bq, T // bk
    run = sum(1 for i in range(nq) for j in range(nk) if j * bk <= i * bq + bq - 1)
    sweep.append(dict(bq=bq, bk=bk, err=e, steps=nq * nk, run=run, lowers=lw["ok"],
                      msg=None if lw["ok"] else lw["msg"][:260]))
KERN["flash"]["sweep"] = sweep
log("flash sweep", [(x["bq"], x["bk"], x["lowers"]) for x in sweep])

# ---------------------------------------------------------------- 6. production kernels shipped with jax, same tensors
from jax.experimental.pallas.ops.tpu import flash_attention as FA
import importlib
GMM = importlib.import_module("jax.experimental.pallas.ops.tpu.megablox.gmm")
q4, k4, v4, do4 = (t.reshape(B, H, T, dh) for t in (q, k, v, do))
prod = {}
with pltpu.force_tpu_interpret_mode():
    t1 = time.time()
    o_p = jax.block_until_ready(FA.flash_attention(q4, k4, v4, causal=True, sm_scale=1 / math.sqrt(dh)))
    prod["fa_fwd_err"] = P.maxerr(o_p.reshape(q.shape), ref_o)
    prod["fa_vs_ours"] = P.maxerr(o_p.reshape(q.shape), o_k)
    g_p = jax.vjp(lambda a, b, c: FA.flash_attention(a, b, c, causal=True, sm_scale=1 / math.sqrt(dh)), q4, k4, v4)[1](do4)
    prod["fa_grad_err"] = {n: P.maxerr(a.reshape(q.shape), b) for n, a, b in zip(["dq", "dk", "dv"], g_p, ref_g)}
    o_d = jax.block_until_ready(FA.flash_attention(q4, k4, v4, causal=True))           # sm_scale left at its default
    prod["fa_default_scale_err"] = P.maxerr(o_d.reshape(q.shape), ref_o)
    prod["fa_seconds"] = time.time() - t1
    # megablox grouped matmul: the running example's MLP rows split over 4 "experts" of uneven size
    rng = np.random.default_rng(0)
    rhs = jnp.stack([W2] + [jnp.asarray(rng.standard_normal(W2.shape) * 0.02, jnp.float32) for _ in range(3)])
    gs = jnp.array([1000, 0, 2600, 496], jnp.int32)
    out = jax.block_until_ready(GMM.gmm(A, rhs, gs, tiling=(512, 128, 128)))
    st = np.concatenate([[0], np.cumsum(np.asarray(gs))])
    gref = jnp.concatenate([jnp.dot(A[st[i]:st[i + 1]], rhs[i], precision="highest") for i in range(4)])
    prod["gmm_err"] = P.maxerr(out, gref)
    prod["gmm_groups"] = [int(x) for x in gs]
prod["fa_default_sm_scale"] = 1.0
# the GPU (Triton-style) attention kernel shipped with jax, run in interpret mode on the same tensors
import warnings
with warnings.catch_warnings(record=True) as wl:
    warnings.simplefilter("always")
    GA = importlib.import_module("jax.experimental.pallas.ops.gpu.attention")
prod["gpu_attention_warning"] = str(wl[0].message) if wl else None
qg, kg, vg, dog = (t.reshape(B, H, T, dh).transpose(0, 2, 1, 3) for t in (q, k, v, do))     # [batch, seq, heads, dim]
mha = lambda a, b, c: GA.mha(a, b, c, None, sm_scale=1 / math.sqrt(dh), causal=True, interpret=True)
og = jax.jit(mha)(qg, kg, vg)
prod["gpu_mha_err"] = P.maxerr(og.transpose(0, 2, 1, 3).reshape(q.shape), ref_o)
gg = jax.jit(lambda a, b, c, d: jax.vjp(mha, a, b, c)[1](d))(qg, kg, vg, dog)
prod["gpu_mha_grad_err"] = {n: P.maxerr(a.transpose(0, 2, 1, 3).reshape(q.shape), b) for n, a, b in zip(["dq", "dk", "dv"], gg, ref_g)}
OUT["production"] = prod
log("production", prod)

# ---------------------------------------------------------------- 7. pipelining by hand, and with emit_pipeline
ref_mm = jnp.dot(A, W2, precision="highest")
pipe = dict(err_manual=P.maxerr(jax.jit(lambda a, b: K.matmul_manual(a, b))(A, W2), ref_mm),
            err_manual_tpu_interp=P.maxerr(jax.jit(lambda a, b: K.matmul_manual(a, b, interpret=TPUI(detect_races=True)))(A, W2), ref_mm))
pipe["lower_manual"], mods = mosaic(lambda a, b: K.matmul_manual(a, b, interpret=False), S16(4096, 512), S16(512, 128))
pipe["mosaic_manual"] = clean_mosaic(mods[0]) if mods else ""
try:
    jax.jit(lambda a, b: K.matmul_emit(a, b))(A, W2)
    pipe["emit_interp"] = dict(ok=True)
except Exception as e:
    pipe["emit_interp"] = dict(ok=False, msg=P.scrub(str(e)).split(" If you are not")[0][:200])
    try:
        pltpu.reset_tpu_interpret_mode_state()
    except Exception:
        pass
am = AbstractMesh((1,), ("x",), abstract_device=AbstractDevice("TPU v5 lite", 1, "tpu"))
pipe["lower_emit"], mods = mosaic(lambda a, b: K.matmul_emit(a, b, interpret=False), S16(4096, 512), S16(512, 128), mesh=am)
OUT["pipeline"] = pipe
log("pipeline", {k_: v_ for k_, v_ in pipe.items() if k_ != "mosaic_manual"})

# ---------------------------------------------------------------- 8. scalar prefetch: paged decode attention
# 8 (sequence, head) pairs of batch 0 and 1 decode their next token: query = the q row at position n-1,
# keys and values 0..n-1, stored in 16-token pages scattered over a shuffled pool. Reference: the model's own
# attention output at row n-1 (causal attention at the last position sees exactly keys 0..n-1).
page, npp = 16, T // 16
lens = np.array([37, 128, 64, 90, 1, 17, 113, 70], np.int32)
pairs = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3)]
rng = np.random.default_rng(0)
need = [int(math.ceil(n / page)) for n in lens]
n_phys = sum(need) + 3                                                  # 3 spare pages nobody uses
perm = rng.permutation(n_phys)
kp = np.zeros((n_phys, page, dh), np.float32); vp = np.zeros_like(kp)
table = np.full((len(lens), npp), -1, np.int32)                         # -1: no page (unused table slot)
c = 0
qn = np.asarray(q); kn = np.asarray(k); vn = np.asarray(v)
for si, ((b_, h_), n) in enumerate(zip(pairs, lens)):
    bh = b_ * H + h_
    for pg in range(need[si]):
        phys = int(perm[c]); c += 1
        table[si, pg] = phys
        lo, hi = pg * page, min((pg + 1) * page, int(n))
        kp[phys, :hi - lo] = kn[bh, lo:hi]; vp[phys, :hi - lo] = vn[bh, lo:hi]
qd = np.stack([qn[b_ * H + h_, n - 1][None] for (b_, h_), n in zip(pairs, lens)])   # (8, 1, 32)
ref_d = np.stack([np.asarray(ref_o)[b_ * H + h_, n - 1][None] for (b_, h_), n in zip(pairs, lens)])
tab_ok = np.where(table < 0, 0, table)                                   # unused slots point at page 0 (any valid page)
f = jax.jit(lambda *a: K.paged_decode(*a))
od = f(jnp.asarray(qd), jnp.asarray(kp), jnp.asarray(vp), jnp.asarray(tab_ok), jnp.asarray(lens))
pg = dict(lens=lens.tolist(), pairs=pairs, page=page, npp=npp, n_phys=n_phys, table=table.tolist(),
          err=P.maxerr(od, ref_d), max_ref=float(np.abs(ref_d).max()),
          err_tpu_interp=P.maxerr(jax.jit(lambda *a: K.paged_decode(*a, interpret=TPUI(detect_races=True)))(
              jnp.asarray(qd), jnp.asarray(kp), jnp.asarray(vp), jnp.asarray(tab_ok), jnp.asarray(lens)), ref_d))
pg["lower"], mods = mosaic(lambda *a: K.paged_decode(*a, interpret=False), S16(8, 1, 32), S16(n_phys, 16, 32),
                           S16(n_phys, 16, 32), jax.ShapeDtypeStruct((8, 8), jnp.int32), jax.ShapeDtypeStruct((8,), jnp.int32))
if mods:
    head = clean_mosaic(mods[0]).split("\n")
    pg["mosaic_head"] = "\n".join(l for l in head[:3])[:1500]
OUT["paged"] = pg
log("paged", pg["err"], pg["err_tpu_interp"])
OUT["_paged_arrays"] = dict(table_raw=table)        # dropped before saving; used by the bug section

# ---------------------------------------------------------------- 9. deliberate bugs and what catches them
bugs = []
# (a) LN backward with its row axis marked "parallel": dscale and dbias are one block revisited by every step
def ln_bwd_sem(sem, ip):
    y, mu, rs = K._ln_fwd_call(hx, ln["scale"], ln["bias"], 1e-5, 256, True)
    return K._ln_bwd_call(hx, ln["scale"], mu, rs, dy, 256, ip, semantics=sem)
pl_ = ln_bwd_sem(("parallel",), True)
tpu_runs = []
for seed in (0, 1, 2):
    tp_ = ln_bwd_sem(("parallel",), TPUI(num_cores_or_threads=2, random_seed=seed, detect_races=True))
    e = P.maxerr(tp_[1][0], g_ref[1])
    tpu_runs.append(dict(seed=seed, nan=bool(jnp.isnan(tp_[1]).any()), err=None if math.isnan(e) else e,
                         dx_err=P.maxerr(tp_[0], g_ref[0])))
ok_ = ln_bwd_sem(("arbitrary",), TPUI(num_cores_or_threads=2, random_seed=0, detect_races=True))
bugs.append(dict(k="ln_parallel", plain_err=P.maxerr(pl_[1][0], g_ref[1]), tpu_runs=tpu_runs,
                 fixed_err=P.maxerr(ok_[1][0], g_ref[1]), max_ref=float(jnp.abs(g_ref[1]).max())))
log("bug ln_parallel", bugs[-1])

# (b) manual DMA: use the slot before waiting for its copy
def bad_kernel(a_hbm, b_ref, o_ref, a_buf, sem, *, bm, nsteps):
    def copy(i, slot):
        return pltpu.make_async_copy(a_hbm.at[pl.ds(i * bm, bm), :], a_buf.at[slot], sem.at[slot])
    copy(0, 0).start()
    def body(i, carry):
        slot = i % 2
        @pl.when(i + 1 < nsteps)
        def _():
            copy(i + 1, 1 - slot).start()
        o_ref[pl.ds(i * bm, bm), :] = jnp.dot(a_buf[slot], b_ref[...], preferred_element_type=jnp.float32)
        copy(i, slot).wait()                                             # BUG: waits after the data was used
        return carry
    jax.lax.fori_loop(0, nsteps, body, 0)
import functools
def bad_call(a, b, ip, bm=512):
    M, Kd = a.shape
    return pl.pallas_call(functools.partial(bad_kernel, bm=bm, nsteps=M // bm),
                          out_shape=jax.ShapeDtypeStruct((M, b.shape[1]), jnp.float32),
                          in_specs=[pl.BlockSpec(memory_space=pl.ANY), pl.BlockSpec(memory_space=pltpu.VMEM)],
                          out_specs=pl.BlockSpec(memory_space=pltpu.VMEM),
                          scratch_shapes=[pltpu.VMEM((2, bm, Kd), a.dtype), pltpu.SemaphoreType.DMA((2,))],
                          interpret=ip)(a, b)
o1 = bad_call(A, W2, True)
o2 = bad_call(A, W2, TPUI(detect_races=True))
bugs.append(dict(k="dma_nowait", plain_err=P.maxerr(o1, ref_mm), plain_nan=bool(jnp.isnan(o1).any()),
                 tpu_err=None if bool(jnp.isnan(o2).any()) else P.maxerr(o2, ref_mm), tpu_nan=bool(jnp.isnan(o2).any()),
                 tpu_nan_rows=int(jnp.isnan(o2).any(axis=1).sum())))
log("bug dma_nowait", bugs[-1])

# (c) paged decode with the raw table (-1 in unused slots) and no clamp in the index map
def page_map_noclamp(page):
    def f(s, p, table_ref, lens_ref):
        return (table_ref[s, p], 0, 0)
    return f
junk = np.where(table < 0, 9999, table)                                   # stale entries: a page that does not exist
orig = K.page_map
K.page_map = page_map_noclamp
try:
    o1 = jax.jit(lambda *a: K.paged_decode(*a))(jnp.asarray(qd), jnp.asarray(kp), jnp.asarray(vp), jnp.asarray(junk), jnp.asarray(lens))
    plain = dict(raised=False, err=P.maxerr(o1, ref_d))
except Exception as e:
    plain = dict(raised=True, msg=P.scrub(str(e))[:300])
try:
    o2 = jax.jit(lambda *a: K.paged_decode(*a, interpret=TPUI()))(jnp.asarray(qd), jnp.asarray(kp), jnp.asarray(vp), jnp.asarray(junk), jnp.asarray(lens))
    tpu = dict(raised=False, err=P.maxerr(o2, ref_d))
except Exception as e:
    m = P.scrub(str(e)); i = m.find("Out-of-bounds")
    tpu = dict(raised=True, msg=(m[i:i + 300] if i >= 0 else m.splitlines()[-1][:300]))
    try:
        pltpu.reset_tpu_interpret_mode_state()
    except Exception:
        pass
try:
    o3 = jax.jit(lambda *a: K.paged_decode(*a, interpret=TPUI()))(jnp.asarray(qd), jnp.asarray(kp), jnp.asarray(vp), jnp.asarray(table), jnp.asarray(lens))
    minus1 = dict(raised=False, err=P.maxerr(o3, ref_d))
except Exception as e:
    minus1 = dict(raised=True, msg=P.scrub(str(e))[:200])
    try:
        pltpu.reset_tpu_interpret_mode_state()
    except Exception:
        pass
K.page_map = orig
bugs.append(dict(k="page_oob", plain=plain, tpu=tpu, tpu_minus1=minus1))
log("bug page_oob", bugs[-1])
# (d) differentiating a pallas_call that has no custom_vjp
xs = S2[:1024]
nv = {}
for name, fn in (("softmax_grad", lambda x: jnp.sum(K.softmax_rows(x) ** 2)),
                 ("flash_grad", lambda x: jnp.sum(K.flash_fwd(q[:8], q[:8], q[:8])[0] * 0 + K.flash_fwd(x, k[:8], v[:8])[0]))):
    arg = xs if name == "softmax_grad" else q[:8]
    try:
        jax.grad(fn)(arg)
        nv[name] = dict(raised=False)
    except Exception as e:
        nv[name] = dict(raised=True, type=type(e).__name__, msg=P.scrub(str(e)).split(". This is")[0][:300])
try:
    _, t = jax.jvp(lambda x: K.softmax_rows(x), (jnp.where(jnp.isinf(xs), -1e9, xs),), (jnp.ones_like(xs),))
    nv["softmax_jvp"] = dict(raised=False)
except Exception as e:
    nv["softmax_jvp"] = dict(raised=True, type=type(e).__name__, msg=P.scrub(str(e))[:300])
bugs.append(dict(k="no_vjp", **nv))
log("bug no_vjp", nv)
OUT["bugs"] = bugs

# ---------------------------------------------------------------- 10. the same kernel lowered for an NVIDIA GPU (Triton)
def softmax_gpu(x, bm=16):
    from jax.experimental.pallas import triton as plgpu
    M, N = x.shape
    return pl.pallas_call(K.softmax_kernel, out_shape=jax.ShapeDtypeStruct((M, N), x.dtype), grid=(M // bm,),
                          in_specs=[pl.BlockSpec((bm, N), lambda i: (i, 0))],
                          out_specs=pl.BlockSpec((bm, N), lambda i: (i, 0)),
                          compiler_params=plgpu.CompilerParams(num_warps=4, num_stages=1), debug=True)(x)
gm = AbstractMesh((1,), ("x",), abstract_device=AbstractDevice("NVIDIA H100 80GB HBM3", 132, "gpu"))
buf = io.StringIO()
with jax.sharding.use_abstract_mesh(gm), contextlib.redirect_stdout(buf):
    ex = export.export(jax.jit(softmax_gpu), platforms=["cuda"],
                       disabled_checks=[export.DisabledSafetyCheck.custom_call("__gpu$xla.gpu.triton")])(S32(16384, 128))
tri = buf.getvalue()
tri = tri[tri.find("The Triton module"):]
tri = clean_mosaic(tri)
tri = "\n".join(l for l in tri.splitlines() if not l.startswith("#loc"))
tri = re.sub(r"\s*(loc\([^)]*\)|\[unknown\])", "", tri)
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    export.export(jax.jit(lambda x: pl.pallas_call(
        K.softmax_kernel, out_shape=jax.ShapeDtypeStruct(x.shape, x.dtype), grid=(32,),
        in_specs=[pl.BlockSpec((512, 128), lambda i: (i, 0))], out_specs=pl.BlockSpec((512, 128), lambda i: (i, 0)),
        debug=True)(x)), platforms=["tpu"])(S32(16384, 128))
mos = buf.getvalue()
mos = clean_mosaic(mos[mos.find("The Mosaic module"):])
OUT["backends"] = dict(triton=tri[:6000], mosaic=mos[:6000],
                       triton_custom_call=bool("__gpu$xla.gpu.triton" in ex.mlir_module()),
                       triton_ops=sorted(set(re.findall(r"\b(tt\.[a-z_]+)", tri))),
                       mosaic_ops=sorted(set(re.findall(r"\b(tpu\.[a-z_]+|vector\.[a-z_]+)", mos))))
log("backends", OUT["backends"]["triton_ops"], OUT["backends"]["mosaic_ops"])
try:
    with jax.sharding.use_abstract_mesh(gm), contextlib.redirect_stdout(io.StringIO()):
        export.export(jax.jit(lambda x: K.softmax_rows(x, interpret=False)), platforms=["cuda"])(S32(16384, 128))
    OUT["backends_tpu_on_gpu"] = "lowered"
except Exception as e:
    OUT["backends_tpu_on_gpu"] = P.scrub(str(e))[:200]

# ---------------------------------------------------------------- 11. timings (rough; interpret mode)
tm = {}
xla = dict(bias_gelu=(jax.jit(lambda x, b: jax.nn.gelu(x + b, approximate=False)), (pre, b1)),
           softmax_rows=(jax.jit(lambda x: jax.nn.softmax(x, -1)), (S2,)),
           layer_norm=(jax.jit(lnf), (hx, ln["scale"], ln["bias"])),
           flash=(jax.jit(TK.attention_reference), (q, k, v)))
pal = dict(bias_gelu=(jax.jit(lambda x, b: K.bias_gelu(x, b)), (pre, b1)),
           softmax_rows=(jax.jit(lambda x: K.softmax_rows(x)), (S2,)),
           layer_norm=(jax.jit(lambda x, g, b: K.layer_norm(x, g, b)), (hx, ln["scale"], ln["bias"])),
           flash=(jax.jit(lambda q, k, v: K.flash_fwd(q, k, v)[0]), (q, k, v)))
for n in xla:
    wx, cx = P.timeit(xla[n][0], *xla[n][1], n=3)
    wp, cp = P.timeit(pal[n][0], *pal[n][1], n=3)
    tm[n] = dict(xla_ms=wx * 1e3, xla_cpu_ms=cx * 1e3, interp_ms=wp * 1e3, interp_cpu_ms=cp * 1e3)
tm["load_end"] = os.getloadavg()[0]
OUT["timing"] = tm
log("timing", tm)

OUT["kernels"] = KERN
OUT.pop("_paged_arrays")
OUT["seconds"] = time.time() - T0
P.save("kernels.json", OUT)
