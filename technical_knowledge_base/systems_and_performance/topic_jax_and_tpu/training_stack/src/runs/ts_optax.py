"""optax in depth on the running example (training_stack page, section 4 and the Optimiser lab tab).

S1 the running example's chain (clip, scale_by_adam, add_decayed_weights with mask, scale_by_learning_rate),
   run stage by stage on real gradients for 12 steps; 8 tracked coordinates; the hand decomposition is checked
   against tx.update to the last bit.
S2 inject_hyperparams: the learning rate lives in the state; changing it does not retrace. A Python float does.
S3 partition (multi_transform): decay / no-decay / frozen labels; state sizes.
S4 MultiSteps(k=4) on 4 micro-batches of 8 vs one step on the batch of 32.
S5 apply_if_finite: a NaN gradient at step 3 is skipped.
S6 schedules: warmup_cosine_decay (old page's numbers), WSD via join_schedules, constant with warmup.
S7 Lion: every update has magnitude lr.
S8 Muon: Newton-Schulz on a real gradient matrix, singular values after each iteration.
S9 300 steps each: AdamW, Lion, Muon (default 2-D rule, and embeddings/head excluded): one seed, untuned.
Output: out/optax.json
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402

import model_jax as MJ  # noqa: E402

C = T.C
CFG = C.CFG
R = {"versions": T.versions(), "load_start": T.load_avg()}
sd = dict(np.load(C.path("data", "init_torch.npz")))
P0 = MJ.from_torch(sd, CFG)
grad_fn = jax.jit(jax.value_and_grad(lambda p, x, y: MJ.loss_fn(p, x, y, CFG)))


def batch(i):
    x, y = C.batch(i)
    return jnp.asarray(x), jnp.asarray(y)


# tracked coordinates: (label, getter path, index)
TRACK = [
    ("fc1.w[0,0] (decayed)", ("blocks", 0, "mlp", "fc1", "w"), (0, 0)),
    ("fc1.w[5,17] (decayed)", ("blocks", 0, "mlp", "fc1", "w"), (5, 17)),
    ("wq.w[3,3] (decayed)", ("blocks", 0, "attn", "wq", "w"), (3, 3)),
    ("head.w[10,0] (decayed)", ("head", "w"), (10, 0)),
    ("ln1.scale[0] (no decay)", ("blocks", 0, "ln1", "scale"), (0,)),
    ("tok_emb[1,0] (no decay)", ("tok_emb",), (1, 0)),
    ("wk.b[0] (gradient is noise)", ("blocks", 0, "attn", "wk", "b"), (0,)),
    ("fc2.b[0] (no decay)", ("blocks", 0, "mlp", "fc2", "b"), (0,)),
]


def get(tree, path, idx):
    for k in path:
        tree = tree[k]
    return float(np.asarray(tree)[idx])


def track(tree):
    return [get(tree, p, i) for _, p, i in TRACK]


# ------------------------------------------------------------------ S1 stage by stage
lr_fn = lambda count: CFG["lr"] * jnp.minimum(1.0, (count + 1) / CFG["warmup"])
b1, b2, eps, wd = CFG["betas"][0], CFG["betas"][1], CFG["adam_eps"], CFG["weight_decay"]
tx = MJ.make_optimizer(CFG, C.lr_at)
st = tx.init(P0)
params = P0
mask = MJ.decay_mask(P0)
mu = jax.tree.map(jnp.zeros_like, P0)
nu = jax.tree.map(jnp.zeros_like, P0)
steps = []
for t in range(12):
    x, y = batch(t)
    loss, g = grad_fn(params, x, y)
    gn = optax.global_norm(g)
    scale = jnp.where(gn < CFG["clip"], 1.0, CFG["clip"] / gn)
    gc = jax.tree.map(lambda a: a * scale, g) if float(gn) >= CFG["clip"] else g
    mu = jax.tree.map(lambda m, a: b1 * m + (1 - b1) * a, mu, gc)
    nu = jax.tree.map(lambda v, a: b2 * v + (1 - b2) * a * a, nu, gc)
    bc1, bc2 = 1 - b1 ** (t + 1), 1 - b2 ** (t + 1)
    mhat = jax.tree.map(lambda m: m / bc1, mu)
    vhat = jax.tree.map(lambda v: v / bc2, nu)
    adam = jax.tree.map(lambda m, v: m / (jnp.sqrt(v) + eps), mhat, vhat)
    dec = jax.tree.map(lambda a, p, k: a + wd * p if k else a, adam, params, mask)
    lr = float(lr_fn(t))
    upd_hand = jax.tree.map(lambda a: -lr * a, dec)
    upd, st = tx.update(g, st, params)
    diff = max(float(jnp.abs(a - b).max()) for a, b in zip(jax.tree.leaves(upd), jax.tree.leaves(upd_hand)))
    new_params = optax.apply_updates(params, upd)
    steps.append({"t": t, "loss": float(loss), "grad_norm": float(gn), "clip_scale": float(scale), "lr": lr,
                  "stages": {"grad": track(g), "clipped": track(gc), "mu": track(mu), "nu": track(nu),
                             "mu_hat": track(mhat), "nu_hat": track(vhat), "adam": track(adam),
                             "decayed": track(dec), "update": track(upd), "param_before": track(params),
                             "param_after": track(new_params)},
                  "norms": {"grad": float(gn), "clipped": float(optax.global_norm(gc)),
                            "adam": float(optax.global_norm(adam)), "decayed": float(optax.global_norm(dec)),
                            "update": float(optax.global_norm(upd))},
                  "hand_vs_optax_maxdiff": diff})
    params = new_params
R["S1"] = {"track": [t[0] for t in TRACK], "steps": steps, "bias_corr_t1": [1 - b1, 1 - b2],
           "hyper": {"b1": b1, "b2": b2, "eps": eps, "wd": wd, "clip": CFG["clip"], "peak_lr": CFG["lr"], "warmup": CFG["warmup"]},
           "state_structure": T.scrub(str(jax.tree.map(lambda a: list(a.shape), st)))[:600],
           "state_leaves": len(jax.tree.leaves(st)),
           "state_floats": int(sum(np.prod(a.shape) for a in jax.tree.leaves(st)))}
print("S1 max hand diff", max(s["hand_vs_optax_maxdiff"] for s in steps), "state leaves", R["S1"]["state_leaves"])

# ------------------------------------------------------------------ S2 inject_hyperparams
TRACE = {"inj": 0, "flt": 0}
tx_i = optax.inject_hyperparams(optax.adamw)(learning_rate=1e-3, b2=0.95, weight_decay=0.1)
si = tx_i.init(P0)


@jax.jit
def step_inj(p, s, x, y):
    TRACE["inj"] += 1
    l, g = jax.value_and_grad(lambda p: MJ.loss_fn(p, x, y, CFG))(p)
    u, s = tx_i.update(g, s, p)
    return optax.apply_updates(p, u), s, l


x, y = batch(0)
p = P0
lrs = []
for i, lr in enumerate([1e-3, 1e-3, 5e-4, 2.5e-4]):
    si.hyperparams["learning_rate"] = jnp.asarray(lr)   # change the value in the state
    p, si, l = step_inj(p, si, x, y)
    lrs.append({"step": i, "lr_set": lr, "traces": TRACE["inj"]})


def step_float(lr):
    t = optax.adamw(lr, b2=0.95, weight_decay=0.1)

    @jax.jit
    def f(p, s, x, y):
        TRACE["flt"] += 1
        l, g = jax.value_and_grad(lambda p: MJ.loss_fn(p, x, y, CFG))(p)
        u, s = t.update(g, s, p)
        return optax.apply_updates(p, u), s, l
    return t, f


flt = []
for i, lr in enumerate([1e-3, 5e-4, 2.5e-4]):
    t_, f_ = step_float(lr)
    f_(P0, t_.init(P0), x, y)
    flt.append({"step": i, "lr": lr, "traces": TRACE["flt"]})
R["S2"] = {"inject": lrs, "float_rebuilt": flt, "hyperparams_keys": sorted(si.hyperparams.keys()),
           "state_type": type(si).__name__}
print("S2", lrs, flt)

# ------------------------------------------------------------------ S3 partition (multi_transform)


def label_fn(params):
    def lab(path, _):
        names = [getattr(k, "key", getattr(k, "idx", None)) for k in path]
        if names[0] in ("tok_emb", "pos_emb"):
            return "frozen"
        return "decay" if names[-1] == "w" else "no_decay"
    return jax.tree_util.tree_map_with_path(lab, params)


tx_p = optax.partition({"decay": optax.adamw(1e-3, b2=0.95, weight_decay=0.1),
                        "no_decay": optax.adam(1e-3, b2=0.95),
                        "frozen": optax.set_to_zero()}, label_fn)
sp = tx_p.init(P0)
p = P0
for i in range(5):
    x, y = batch(i)
    l, g = grad_fn(p, x, y)
    u, sp = tx_p.update(g, sp, p)
    p = optax.apply_updates(p, u)
labels = jax.tree.leaves(label_fn(P0))
counts = {k: int(sum(np.prod(a.shape) for a, lb in zip(jax.tree.leaves(P0), labels) if lb == k)) for k in ("decay", "no_decay", "frozen")}
R["S3"] = {"label_counts_params": counts, "n_leaves_by_label": {k: labels.count(k) for k in counts},
           "emb_unchanged": bool(np.array_equal(np.asarray(p["tok_emb"]), np.asarray(P0["tok_emb"]))),
           "state_floats": int(sum(np.prod(a.shape) for a in jax.tree.leaves(sp))),
           "adamw_full_state_floats": int(sum(np.prod(a.shape) for a in jax.tree.leaves(optax.adamw(1e-3).init(P0)))),
           "multi_transform_is_partition": optax.multi_transform is optax.partition}
print("S3", R["S3"])

# ------------------------------------------------------------------ S4 MultiSteps
base = optax.adamw(1e-3, b2=0.95, weight_decay=0.1)
ms = optax.MultiSteps(base, every_k_schedule=4)
sm = ms.init(P0)
x, y = batch(0)
p = P0
micro = []
for k in range(4):
    l, g = grad_fn(p, x[8 * k: 8 * k + 8], y[8 * k: 8 * k + 8])
    u, sm = ms.update(g, sm, p)
    unorm = float(optax.global_norm(u))
    p = optax.apply_updates(p, u)
    micro.append({"micro": k, "update_norm": unorm, "mini_step": int(sm.mini_step), "gradient_step": int(sm.gradient_step)})
l, gbig = grad_fn(P0, x, y)
u_big, _ = base.update(gbig, base.init(P0), P0)
p_big = optax.apply_updates(P0, u_big)
d = max(float(jnp.abs(a - b).max()) for a, b in zip(jax.tree.leaves(p), jax.tree.leaves(p_big)))
R["S4"] = {"micro": micro, "maxdiff_vs_big_batch": d,
           "state_floats": int(sum(np.prod(a.shape) for a in jax.tree.leaves(sm) if hasattr(a, "shape"))),
           "base_state_floats": int(sum(np.prod(a.shape) for a in jax.tree.leaves(base.init(P0))))}
print("S4", R["S4"])

# ------------------------------------------------------------------ S5 apply_if_finite
tx_f = optax.apply_if_finite(optax.adamw(1e-3, b2=0.95), max_consecutive_errors=3)
sf = tx_f.init(P0)
p = P0
fin = []
for i in range(6):
    x, y = batch(i)
    l, g = grad_fn(p, x, y)
    if i == 3:
        g = jax.tree.map(lambda a: a.at[(0,) * a.ndim].set(jnp.nan), g)
    u, sf = tx_f.update(g, sf, p)
    unorm = float(optax.global_norm(u))
    p = optax.apply_updates(p, u)
    fin.append({"step": i, "nan_injected": i == 3, "update_norm": unorm, "notfinite_count": int(sf.notfinite_count),
                "total_notfinite": int(sf.total_notfinite), "params_finite": bool(all(np.isfinite(np.asarray(a)).all() for a in jax.tree.leaves(p)))})
R["S5"] = {"steps": fin}
print("S5", fin)

# ------------------------------------------------------------------ S6 schedules
N = 100_000
wc = optax.warmup_cosine_decay_schedule(init_value=0.0, peak_value=3e-4, warmup_steps=2_000, decay_steps=100_000, end_value=3e-5)
wsd = optax.join_schedules([optax.linear_schedule(0.0, 3e-4, 2_000), optax.constant_schedule(3e-4),
                            optax.linear_schedule(3e-4, 3e-5, 20_000)], boundaries=[2_000, 80_000])
pts = sorted(set(list(range(0, N + 1, 1000)) + [0, 1000, 1999, 2000, 2001, 79_999, 80_000, 99_999, 100_000]))
R["S6"] = {"steps": pts, "warmup_cosine": [float(wc(s)) for s in pts], "wsd": [float(wsd(s)) for s in pts],
           "running_example": [float(lr_fn(s)) for s in (0, 1, 24, 49, 50, 499)],
           "checks": {"wc_at_2000": float(wc(2000)), "wc_at_100000": float(wc(100000)), "wc_at_51000": float(wc(51000))}}
print("S6", R["S6"]["checks"])

# ------------------------------------------------------------------ S7 Lion
tx_l = optax.lion(1e-4, b1=0.9, b2=0.99, weight_decay=0.0)
sl = tx_l.init(P0)
x, y = batch(0)
l, g = grad_fn(P0, x, y)
u, sl = tx_l.update(g, sl, P0)
absu = np.concatenate([np.abs(np.asarray(a)).ravel() for a in jax.tree.leaves(u)])
R["S7"] = {"lr": 1e-4, "update_abs_values": sorted(set(np.round(absu, 12).tolist()))[:5], "frac_equal_lr": float(np.mean(np.isclose(absu, 1e-4))),
           "frac_zero": float(np.mean(absu == 0)), "state_floats": int(sum(np.prod(a.shape) for a in jax.tree.leaves(sl))),
           "lion_default_wd": 1e-3}
print("S7", R["S7"])

# ------------------------------------------------------------------ S8 Muon Newton-Schulz on a real gradient
from optax.contrib import _muon as MU  # noqa: E402

G = np.asarray(g["blocks"][0]["mlp"]["fc1"]["w"], dtype=np.float32)          # [128, 512]
X = jnp.asarray(G.T if G.shape[0] > G.shape[1] else G)
X = X / (jnp.linalg.norm(X) + 1e-8)
coeffs = jnp.asarray(MU._DEFAULT_NS_COEFFS, jnp.float32)
svs = [np.linalg.svd(np.asarray(X), compute_uv=False).tolist()]
for i in range(5):
    X = MU._base_newton_schulz_iteration(X, coeffs)
    svs.append(np.linalg.svd(np.asarray(X), compute_uv=False).tolist())
lib = MU.orthogonalize_via_newton_schulz(jnp.asarray(G), coeffs, 5)
sv_lib = np.linalg.svd(np.asarray(lib), compute_uv=False)
sv_raw = np.linalg.svd(G, compute_uv=False)
R["S8"] = {"shape": list(G.shape), "coeffs": list(MU._DEFAULT_NS_COEFFS), "sv_raw": sv_raw.tolist(),
           "sv_after_frob_and_each_iter": svs, "sv_library": sv_lib.tolist(),
           "library_vs_hand_maxdiff": float(np.abs(np.sort(sv_lib) - np.sort(svs[-1])).max()),
           "range_final": [float(min(svs[-1])), float(max(svs[-1]))],
           "cond_raw": float(sv_raw.max() / max(sv_raw.min(), 1e-30)),
           "cond_final": float(max(svs[-1]) / max(min(svs[-1]), 1e-30))}
print("S8 final range", R["S8"]["range_final"], "cond raw", R["S8"]["cond_raw"], "lib diff", R["S8"]["library_vs_hand_maxdiff"])

# ------------------------------------------------------------------ S9 short runs
STEPS = int(os.environ.get("TS_STEPS", 300))
VAL = [tuple(jnp.asarray(a) for a in C.batch(i, "val", n_steps=8)) for i in range(8)]   # the Training lab's 8 validation batches
_ev = jax.jit(lambda p, x, y: MJ.loss_fn(p, x, y, CFG))
val_loss = lambda p: float(np.mean([float(_ev(p, x, y)) for x, y in VAL]))
sched = lambda count: jnp.minimum(1.0, (count + 1) / CFG["warmup"])


def no_emb_dims(params):
    def f(path, a):
        n = [getattr(k, "key", getattr(k, "idx", None)) for k in path]
        if n[0] in ("tok_emb", "pos_emb", "head") or a.ndim != 2:
            return None
        return MU.MuonDimensionNumbers()
    return jax.tree_util.tree_map_with_path(f, params)


OPTS = {
    "adamw (running example)": lambda: MJ.make_optimizer(CFG, C.lr_at),
    "lion lr 1e-4 wd 1.0": lambda: optax.chain(optax.clip_by_global_norm(1.0),
                                                optax.lion(lambda c: 1e-4 * sched(c), b1=0.9, b2=0.99, weight_decay=1.0, mask=MJ.decay_mask)),
    "muon lr 0.02, default 2-D rule": lambda: optax.chain(optax.clip_by_global_norm(1.0),
                                                           optax.contrib.muon(lambda c: 0.02 * sched(c), adam_learning_rate=lambda c: 1e-3 * sched(c), adam_b2=0.95)),
    "muon lr 0.02, embeddings and head on Adam": lambda: optax.chain(optax.clip_by_global_norm(1.0),
                                                                      optax.contrib.muon(lambda c: 0.02 * sched(c), adam_learning_rate=lambda c: 1e-3 * sched(c), adam_b2=0.95,
                                                                                         muon_weight_dimension_numbers=no_emb_dims)),
}
runs = {}
for name, mk in OPTS.items():
    txr = mk()
    stepf = MJ.make_train_step(CFG, txr)
    p = jax.tree.map(jnp.copy, P0)
    s = txr.init(p)
    losses = []
    with T.Timer() as tm:
        for i in range(STEPS):
            x, y = batch(i)
            p, s, l, _ = stepf(p, s, x, y)
            if i % 10 == 9 or i < 3:
                losses.append([i, float(l)])
    runs[name] = {"losses": losses, "val_end": float(val_loss(p)), "wall_s": round(tm.wall, 1), "cpu_s": round(tm.cpu, 1),
                  "state_floats": int(sum(np.prod(a.shape) for a in jax.tree.leaves(s) if hasattr(a, "shape")))}
    print("S9", name, runs[name]["val_end"], runs[name]["wall_s"])
R["S9"] = {"steps": STEPS, "runs": runs, "load": T.load_avg()}
R["load_end"] = T.load_avg()
T.save("optax", R)
