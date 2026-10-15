"""The equivalence ladder in three precisions: is a gap rounding or a bug?

Rungs: logits, loss, gradients, parameters after one step, training loss over 100 steps. Each rung compares the
PyTorch twin with the plain-JAX twin from the same weights on the same batch, in float32 and in float64
(torch .double(), jax_enable_x64), for the correct port and for one real bug (tanh GELU). Rounding differences
shrink by about nine orders of magnitude in float64; a bug does not. Also: the key-bias gradient (zero in exact
arithmetic) in both precisions, and logits in bfloat16 against a float32 reference (the tolerance a bf16 port
can expect). Writes out/ladder.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_ladder.py float32   (then float64; a few minutes each)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

os.environ.setdefault("JAX_PLATFORMS", "cpu")
import jax  # noqa: E402

DT = sys.argv[1] if len(sys.argv) > 1 else "float32"     # one precision per process: x64 changes promotion everywhere
assert DT in ("float32", "float64")
if DT == "float64":
    jax.config.update("jax_enable_x64", True)
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402
import torch  # noqa: E402

torch.set_num_threads(4)
import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
import model_torch as MT  # noqa: E402

N = 100
cfg = dict(C.CFG)
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
x0, y0 = C.batch(0)


def jax_apply(params, idx, approx):
    T = idx.shape[1]
    x = params["tok_emb"][idx] + params["pos_emb"][:T]
    for p in params["blocks"]:
        x = x + MJ.attention(p["attn"], MJ.layer_norm(p["ln1"], x, cfg["ln_eps"]), cfg["n_heads"])
        h = MJ.layer_norm(p["ln2"], x, cfg["ln_eps"])
        x = x + MJ.linear(p["mlp"]["fc2"], jax.nn.gelu(MJ.linear(p["mlp"]["fc1"], h), approximate=approx))
    return MJ.layer_norm(params["ln_f"], x, cfg["ln_eps"]) @ params["head"]["w"]


def leaves_maxdiff(a, b, which):
    """which: 'all but key bias', or 'key bias'"""
    out = 0.0
    for (pa, la), (_, lb) in zip(jax.tree_util.tree_leaves_with_path(a), jax.tree_util.tree_leaves_with_path(b)):
        kb = "'wk'" in jax.tree_util.keystr(pa) and "'b'" in jax.tree_util.keystr(pa)
        if (which == "kb") != kb:
            continue
        out = max(out, float(np.abs(np.asarray(la, np.float64) - np.asarray(lb, np.float64)).max()))
    return out


def torch_clip(max_norm):
    """clip_by_global_norm with PyTorch's formula: scale = max_norm / (norm + 1e-6), clamped to 1."""
    def update(g, state, params=None):
        sc = jnp.minimum(1.0, max_norm / (optax.global_norm(g) + 1e-6))
        return jax.tree.map(lambda t: t * sc, g), state
    return optax.GradientTransformation(lambda p: optax.EmptyState(), update)


def run(dtype, approx, clipfix=False):
    npd = np.float64 if dtype == "float64" else np.float32
    sd = {k: v.astype(npd) for k, v in sd0.items()}
    tm = MT.make_model(cfg, 0)
    tm = tm.double() if dtype == "float64" else tm
    tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd.items()})
    opt, sched = MT.make_optimizer(tm, cfg, C.lr_at)
    params = MJ.from_torch(sd, cfg)
    assert params["head"]["w"].dtype == npd
    xt, yt = torch.from_numpy(x0).long(), torch.from_numpy(y0).long()
    with torch.no_grad():
        lt = tm(xt).numpy()
    lj = np.asarray(jax.jit(lambda p, x: jax_apply(p, x, approx))(params, x0))
    loss_j = lambda p, x, y: optax.softmax_cross_entropy_with_integer_labels(jax_apply(p, x, approx), y).mean()
    l0j, gj = jax.jit(jax.value_and_grad(loss_j))(params, x0, y0)
    opt.zero_grad(set_to_none=True); l0t = MT.loss_fn(tm, xt, yt); l0t.backward()
    gt = MJ.from_torch({k: p.grad.numpy().copy() for k, p in tm.named_parameters()}, cfg)
    largest_grad = max(float(np.abs(np.asarray(g)).max()) for g in jax.tree.leaves(gt))
    out = dict(logits=P.maxdiff(lt, lj), max_abs_logit=float(np.abs(lt).max()), loss0=abs(float(l0t) - float(l0j)),
               grads=leaves_maxdiff(gj, gt, "rest"), largest_grad=largest_grad,
               keybias_grad_torch=float(max(np.abs(np.asarray(g)).max() for g in [b["attn"]["wk"]["b"] for b in gt["blocks"]])),
               keybias_grad_jax=float(max(np.abs(np.asarray(g)).max() for g in [b["attn"]["wk"]["b"] for b in gj["blocks"]])))
    # one step, then N steps of training on the same batches
    tx = MJ.make_optimizer(cfg, C.lr_at)
    if clipfix:   # the same chain with PyTorch's clipping formula in place of optax's
        tx = optax.chain(torch_clip(cfg["clip"]), optax.adamw(
            learning_rate=lambda count: cfg["lr"] * jnp.minimum(1.0, (count + 1) / cfg["warmup"]),
            b1=cfg["betas"][0], b2=cfg["betas"][1], eps=cfg["adam_eps"], weight_decay=cfg["weight_decay"], mask=MJ.decay_mask))
    st = tx.init(params)

    @jax.jit
    def step(p, s, x, y):
        l, g = jax.value_and_grad(loss_j)(p, x, y)
        u, s = tx.update(g, s, p)
        return optax.apply_updates(p, u), s, l

    lt_curve, lj_curve = [], []
    for s in range(N):
        x, y = C.batch(s)
        l, _ = MT.train_step(tm, opt, sched, torch.from_numpy(x).long(), torch.from_numpy(y).long(), cfg["clip"])
        params, st, lj_ = step(params, st, x, y)
        lt_curve.append(l); lj_curve.append(float(lj_))
        if s == 0:
            p1t = MJ.from_torch(MT.state_numpy(tm), cfg)
            out["step1"] = leaves_maxdiff(params, p1t, "rest")
            out["step1_keybias"] = leaves_maxdiff(params, p1t, "kb")
    pNt = MJ.from_torch(MT.state_numpy(tm), cfg)
    d = np.abs(np.array(lt_curve) - np.array(lj_curve))
    out.update(curve_max=float(d.max()), curve_by_10=[float(d[i:i + 10].max()) for i in range(0, N, 10)],
               stepN_params=leaves_maxdiff(params, pNt, "rest"), stepN_keybias=leaves_maxdiff(params, pNt, "kb"))
    return out


res = {"steps": N, "eps": {"float64": float(np.finfo(np.float64).eps), "float32": float(np.finfo(np.float32).eps),
                           "bfloat16": float(jnp.finfo(jnp.bfloat16).eps), "float16": float(np.finfo(np.float16).eps)}}
for approx in (False, True):
    key = ("tanh_gelu_" if approx else "correct_") + DT
    res[key] = run(DT, approx)
    print(key, res[key], flush=True)
if DT == "float64":
    res["correct_torchclip_float64"] = run(DT, False, clipfix=True)
    print("correct_torchclip_float64", res["correct_torchclip_float64"], flush=True)
    res["versions"] = dict(P.versions(), torch=torch.__version__); res["load"] = P.load1()
    P.save("ladder_float64", res)
    sys.exit(0)

# bfloat16 logits: both frameworks with weights and activations in bf16, against the float32 PyTorch reference
sd16 = {k: torch.from_numpy(v) for k, v in sd0.items()}
tm32 = MT.make_model(cfg, 0); tm32.load_state_dict(sd16)
tm16 = MT.make_model(cfg, 0); tm16.load_state_dict(sd16); tm16 = tm16.bfloat16()
with torch.no_grad():
    l32 = tm32(torch.from_numpy(x0).long()).numpy()
    l16t = tm16(torch.from_numpy(x0).long()).float().numpy()
p16 = jax.tree.map(lambda a: a.astype(jnp.bfloat16), MJ.from_torch(sd0, cfg))
l16j = np.asarray(jax.jit(lambda p, x: jax_apply(p, x, False))(p16, x0).astype(jnp.float32))
res["bf16_logits"] = dict(torch_bf16_vs_f32=P.maxdiff(l16t, l32), jax_bf16_vs_f32=P.maxdiff(l16j, l32),
                          torch_bf16_vs_jax_bf16=P.maxdiff(l16t, l16j), max_abs_logit=float(np.abs(l32).max()))
res["versions"] = dict(P.versions(), torch=torch.__version__)
res["load"] = P.load1()
P.save("ladder_float32", res)
