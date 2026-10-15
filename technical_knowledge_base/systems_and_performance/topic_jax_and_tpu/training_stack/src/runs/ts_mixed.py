"""float16 and loss scaling on the running example (training_stack page, section 7). The Training lab already
measured bfloat16 with and without a float32 master copy (src/train/mixed.py); this adds float16, whose narrow
exponent range is the reason loss scaling exists.

M1 one batch at the initial weights: gradients computed in float16 with loss scale 1, 2^8, 2^15, 2^24
   (then unscaled in float32): how many entries underflow to zero (nonzero in float32), how many overflow.
   bfloat16 at scale 1 for comparison.
M2 200 steps, float32 master weights, compute in float16: no loss scaling, a static scale 2^12, jmp's
   DynamicLossScale (start 2^15, halves on overflow and skips the step, doubles every 2,000 good steps);
   and float32. Validation loss on the Training lab's 8 validation batches.
Output: out/mixed.json
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import jmp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402

import model_jax as MJ  # noqa: E402

C = T.C
CFG = C.CFG
R = {"versions": dict(T.versions(), jmp=jmp.__version__ if hasattr(jmp, "__version__") else "0.0.4")}
P0 = MJ.from_torch(dict(np.load(C.path("data", "init_torch.npz"))), CFG)


def loss_c(p32, x, y, dt, scale):
    p = jax.tree.map(lambda a: a.astype(dt), p32)          # compute copy
    logits = MJ.apply(p, x, CFG).astype(jnp.float32)
    l = optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()
    return l * scale


def grads(p32, x, y, dt, scale):
    # differentiate with respect to the low-precision copy, so the gradients themselves are float16/bfloat16
    pc = jax.tree.map(lambda a: a.astype(dt), p32)

    def f(pc):
        logits = MJ.apply(pc, x, CFG).astype(jnp.float32)
        return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean() * scale
    l, g = jax.value_and_grad(f)(pc)
    return l / scale, jax.tree.map(lambda a: a.astype(jnp.float32) / scale, g), g


x, y = (jnp.asarray(a) for a in C.batch(0))
_, g32, _ = grads(P0, x, y, jnp.float32, 1.0)
G32 = np.concatenate([np.asarray(a).ravel() for a in jax.tree.leaves(g32)])
m1 = []
for dt, name in ((jnp.float16, "float16"), (jnp.bfloat16, "bfloat16")):
    for sc in ((1.0, 2.0 ** 8, 2.0 ** 15, 2.0 ** 24) if name == "float16" else (1.0,)):
        _, g, graw = jax.jit(lambda p, x, y: grads(p, x, y, dt, sc))(P0, x, y)
        G = np.concatenate([np.asarray(a).ravel() for a in jax.tree.leaves(g)])
        GR = np.concatenate([np.asarray(a, dtype=np.float32).ravel() for a in jax.tree.leaves(graw)])
        nz = G32 != 0
        m1.append({"dtype": name, "scale": sc, "n": int(G.size),
                   "underflow_to_zero": int(np.sum((G == 0) & nz)),
                   "nonfinite": int(np.sum(~np.isfinite(GR))),
                   "rel_err_median": float(np.median(np.abs(G[nz & np.isfinite(G)] - G32[nz & np.isfinite(G)]) / np.abs(G32[nz & np.isfinite(G)])))})
        print(m1[-1], flush=True)
R["M1"] = {"rows": m1, "f32_grad_abs_min_nonzero": float(np.abs(G32[G32 != 0]).min()), "f32_grad_abs_max": float(np.abs(G32).max()),
           "f32_grad_abs_median": float(np.median(np.abs(G32))),
           "fp16_min_subnormal": float(np.finfo(np.float16).smallest_subnormal), "fp16_min_normal": float(np.finfo(np.float16).tiny),
           "fp16_max": float(np.finfo(np.float16).max),
           "hist_log10": np.histogram(np.log10(np.abs(G32[G32 != 0])), bins=np.arange(-14, 1, 1))[0].tolist()}

VAL = [tuple(jnp.asarray(a) for a in C.batch(i, "val", n_steps=8)) for i in range(8)]
_ev = jax.jit(lambda p, x, y: MJ.loss_fn(p, x, y, CFG))
val_loss = lambda p: float(np.mean([float(_ev(p, x, y)) for x, y in VAL]))
STEPS = int(os.environ.get("TS_STEPS", 200))


def run(kind):
    tx = MJ.make_optimizer(CFG, C.lr_at)
    p = jax.tree.map(jnp.copy, P0)
    s = tx.init(p)
    dt = jnp.float32 if kind == "f32" else jnp.float16
    if kind == "dynamic":
        ls = jmp.DynamicLossScale(jnp.asarray(2.0 ** 15, jnp.float32))
    elif kind == "static":
        ls = jmp.StaticLossScale(jnp.asarray(2.0 ** 12, jnp.float32))
    else:
        ls = jmp.NoOpLossScale()

    @jax.jit
    def step(p, s, ls, x, y):
        def f(pc):
            logits = MJ.apply(jax.tree.map(lambda a: a.astype(dt), pc), x, CFG).astype(jnp.float32)
            return ls.scale(optax.softmax_cross_entropy_with_integer_labels(logits, y).mean())
        l, g = jax.value_and_grad(f)(p)                    # cast inside f: gradients flow back through the cast
        g = ls.unscale(g)
        finite = jmp.all_finite(g)
        u, s2 = tx.update(g, s, p)
        p2 = optax.apply_updates(p, u)
        p, s = jmp.select_tree(finite, (p2, s2), (p, s))
        return p, s, ls.adjust(finite), ls.unscale(l), finite

    losses, scales, skipped, skipped_at = [], [], 0, []
    for i in range(STEPS):
        x, y = (jnp.asarray(a) for a in C.batch(i))
        p, s, ls, l, fin = step(p, s, ls, x, y)
        skipped += int(not bool(fin))
        if not bool(fin):
            skipped_at.append(i)
        if i % 10 == 9 or i < 3:
            losses.append([i, float(l)])
        if kind == "dynamic":
            scales.append(float(ls.loss_scale))
    return {"losses": losses, "val_end": val_loss(p), "skipped": skipped, "skipped_at": skipped_at,
            "scales": scales, "scale_end": scales[-1] if scales else None}


R["M2"] = {"steps": STEPS, "runs": {}}
for k in ("f32", "fp16 no scaling", "static", "dynamic"):
    kind = {"fp16 no scaling": "none"}.get(k, k)
    R["M2"]["runs"][k] = run(kind)
    print(k, R["M2"]["runs"][k]["val_end"], R["M2"]["runs"][k]["skipped"], flush=True)
R["load"] = T.load_avg()
T.save("mixed", R)
