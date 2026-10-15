"""Divergence hunter: the plain-JAX twin trained 300 steps with ONE porting difference at a time, plus the
evidence ladder for every difference (what each rung of the equivalence test would have shown).

Extends the root's Training lab (src/train/pitfalls.py, same harness, same 300 steps, same batches): the seven
variants it already ran are NOT re-trained here; their curves are read from src/train/out/pitfalls.json, and only
their ladder rungs (logits, loss, gradients, one step: seconds each) are computed. New variants are trained.
The harness is checked first: its correct port must reproduce the root's correct curve exactly.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_hunt.py   (about 10 to 30 minutes under load)
JX_ONLY=name1,name2 trains only those variants (others keep their previous result in out/hunt.json).
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np  # noqa: E402
import torch  # noqa: E402

torch.set_num_threads(4)
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import optax  # noqa: E402
from flax import nnx  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
import model_torch as MT  # noqa: E402

STEPS = 300
base = dict(C.CFG)
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
ROOT_PIT = json.load(open(os.path.join(P.ROOT_SRC, "train", "out", "pitfalls.json")))


# ------------------------------------------------------------------ the model with switches
def layer_norm(p, x, eps, fast):
    mu = x.mean(-1, keepdims=True)
    if fast:   # Flax's default use_fast_variance=True: E[x^2] - E[x]^2, clamped at 0
        var = jnp.maximum(0.0, (x * x).mean(-1, keepdims=True) - mu * mu)
    else:
        var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return (x - mu) / jnp.sqrt(var + eps) * p["scale"] + p["bias"]


def mm(a, b, bf16):
    if bf16:   # emulated TPU DEFAULT precision: inputs rounded to bfloat16, float32 accumulation
        return jnp.matmul(a.astype(jnp.bfloat16), b.astype(jnp.bfloat16), preferred_element_type=jnp.float32)
    return a @ b


def forward(params, idx, v):
    cfg = v["cfg"]; T = idx.shape[1]; bf = v.get("bf16", False); fast = v.get("fast_var", False)
    lin = lambda q, x: mm(x, q["w"], bf) + q["b"]
    x = params["tok_emb"][idx] + params["pos_emb"][:T]
    for blk in params["blocks"]:
        h = layer_norm(blk["ln1"], x, cfg["ln_eps"], fast)
        B, Tt, D = h.shape; H = cfg["n_heads"]; dh = D // H
        sp = lambda t: t.reshape(B, Tt, H, dh).transpose(0, 2, 1, 3)
        q, k, vv = (sp(lin(blk["attn"][n], h)) for n in ("wq", "wk", "wv"))
        s = mm(q, k.transpose(0, 1, 3, 2), bf) / math.sqrt(dh)
        tril = jnp.tril(jnp.ones((Tt, Tt), bool))
        m = v.get("mask", "causal")
        if m == "causal":
            s = jnp.where(tril, s, -jnp.inf)
        elif m == "inverted":            # True/False convention flipped: attend only to the future
            s = jnp.where(~tril, s, -jnp.inf)
        elif m == "inverted_finfo":      # the same flip with Flax's finfo.min instead of -inf
            s = jnp.where(~tril, s, jnp.finfo(jnp.float32).min)
        a = mm(jax.nn.softmax(s, axis=-1), vv, bf)
        x = x + lin(blk["attn"]["wo"], a.transpose(0, 2, 1, 3).reshape(B, Tt, D))
        h = layer_norm(blk["ln2"], x, cfg["ln_eps"], fast)
        x = x + lin(blk["mlp"]["fc2"], jax.nn.gelu(lin(blk["mlp"]["fc1"], h), approximate=v.get("approx", False)))
    return mm(layer_norm(params["ln_f"], x, cfg["ln_eps"], fast), params["head"]["w"], bf)


def flax_default_params(cfg, seed=0):   # as the root's pitfalls.py: what Flax's own initialisers give
    r = nnx.Rngs(seed); d, f, V = cfg["d_model"], cfg["d_ff"], cfg["vocab"]
    lin = lambda i, o: (lambda m: {"w": m.kernel[...], "b": m.bias[...]})(nnx.Linear(i, o, rngs=r))
    ln = lambda: {"scale": jnp.ones((d,)), "bias": jnp.zeros((d,))}
    blocks = [{"ln1": ln(), "attn": {k: lin(d, d) for k in ("wq", "wk", "wv", "wo")}, "ln2": ln(),
               "mlp": {"fc1": lin(d, f), "fc2": lin(f, d)}} for _ in range(cfg["n_layers"])]
    return {"tok_emb": nnx.Embed(V, d, rngs=r).embedding[...], "pos_emb": nnx.Embed(cfg["ctx"], d, rngs=r).embedding[...],
            "blocks": blocks, "ln_f": ln(), "head": {"w": nnx.Linear(d, V, use_bias=False, rngs=r).kernel[...]}}


def no_transpose(params):              # as the root's pitfalls.py
    out = jax.tree.map(lambda x: x, params)
    for b in out["blocks"]:
        for grp in ("attn", "mlp"):
            for k, m in b[grp].items():
                if m["w"].shape[0] == m["w"].shape[1]:
                    m["w"] = m["w"].T
    return out


def torch_clip(max_norm):
    """clip_by_global_norm with PyTorch's formula: scale = max_norm / (norm + 1e-6), clamped to 1."""
    def init(params):
        return optax.EmptyState()

    def update(g, state, params=None):
        n = optax.global_norm(g)
        s = jnp.minimum(1.0, max_norm / (n + 1e-6))
        return jax.tree.map(lambda t: t * s, g), state
    return optax.GradientTransformation(init, update)


def make_tx(v):
    cfg = v["cfg"]
    off = v.get("sched_off", False)
    lr = (lambda c: cfg["lr"] * jnp.minimum(1.0, c / cfg["warmup"])) if off else \
         (lambda c: cfg["lr"] * jnp.minimum(1.0, (c + 1) / cfg["warmup"]))
    adam = optax.adamw(lr, b1=cfg["betas"][0], b2=v.get("b2", cfg["betas"][1]), eps=cfg["adam_eps"],
                       weight_decay=v.get("wd", cfg["weight_decay"]), mask=MJ.decay_mask if v.get("decay_mask", True) else None)
    clip = torch_clip(cfg["clip"]) if v.get("clip_eps") else optax.clip_by_global_norm(cfg["clip"])
    return optax.chain(adam, clip) if v.get("clip_after") else optax.chain(clip, adam)


def loss_of(v):
    red = (lambda l: l.sum()) if v.get("loss_sum") else (lambda l: l.mean())
    return lambda p, x, y: red(optax.softmax_cross_entropy_with_integer_labels(forward(p, x, v), y))


def init_params(v):
    p = flax_default_params(v["cfg"]) if v.get("init") else MJ.from_torch(sd0, v["cfg"])
    return no_transpose(p) if v.get("transpose") else p


# ------------------------------------------------------------------ variants
def V(label, kind, src, **kw):
    cfg = dict(base); cfg["ln_eps"] = kw.pop("ln_eps", base["ln_eps"])
    return dict(label=label, kind=kind, src=src, cfg=cfg, **kw)


ROOT = "root Training lab (curve reused from src/train/out/pitfalls.json)"
NEW = "this page (trained here)"
VARIANTS = {
    "correct": V("Correct port (every default set explicitly)", "reference", ROOT),
    # forward-pass differences
    "ln_eps": V("LayerNorm epsilon left at Flax's 1e-6", "forward", ROOT, ln_eps=1e-6),
    "gelu": V("GELU left at jax.nn.gelu's tanh approximation", "forward", ROOT, approx=True),
    "fast_var": V("LayerNorm variance as E[x^2] - E[x]^2 (Flax's use_fast_variance=True)", "forward", NEW, fast_var=True),
    "bf16": V("Matmul inputs rounded to bfloat16 (emulates a TPU's DEFAULT precision)", "forward", NEW, bf16=True),
    "no_mask": V("Causal mask forgotten (attends to future characters)", "forward", NEW, mask="none"),
    "mask_inverted": V("Mask convention flipped (True read as 'masked out'), -inf fill", "forward", NEW, mask="inverted"),
    "mask_inverted_finfo": V("Mask convention flipped, Flax-style finfo.min fill", "forward", NEW, mask="inverted_finfo"),
    # weights
    "transpose": V("Linear weights copied without the transpose", "weights", ROOT, transpose=True),
    "init": V("Flax's default initialisers instead of the PyTorch weights", "weights", ROOT, init=True),
    # loss and optimiser
    "loss_sum": V("Loss summed over the batch instead of averaged", "loss", NEW, loss_sum=True),
    "decay_all": V("Weight decay on every parameter (no optax mask)", "optimizer", ROOT, decay_mask=False),
    "wd_default": V("optax.adamw default weight_decay=1e-4 (run uses 0.1)", "optimizer", ROOT, wd=1e-4),
    "b2_default": V("optax default b2=0.999 (run uses 0.95)", "optimizer", ROOT, b2=0.999),
    "clip_after": V("Clip placed after adamw in the chain (clips updates, not gradients)", "optimizer", NEW, clip_after=True),
    "clip_eps": V("PyTorch's clipping formula, max_norm / (norm + 1e-6)", "optimizer", NEW, clip_eps=True),
    "sched_off": V("Schedule off by one: lr(count) instead of lr(count + 1)", "optimizer", NEW, sched_off=True),
    "naive": V("Naive port: Flax LayerNorm epsilon, tanh GELU and unmasked weight decay together", "combined", NEW,
               ln_eps=1e-6, approx=True, decay_mask=False),
}

# ------------------------------------------------------------------ PyTorch reference: logits, loss, grads and params after one step
x0, y0 = C.batch(0)
tm = MT.make_model(base, 0); tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
opt, sched = MT.make_optimizer(tm, base, C.lr_at)
with torch.no_grad():
    ref_logits = tm(torch.from_numpy(x0).long()).numpy()
opt.zero_grad(set_to_none=True)
tl = MT.loss_fn(tm, torch.from_numpy(x0).long(), torch.from_numpy(y0).long())
tl.backward()
ref_grads = MJ.from_torch({k: p.grad.numpy().copy() for k, p in tm.named_parameters()}, base)
ref_loss0 = float(tl)
torch.nn.utils.clip_grad_norm_(tm.parameters(), base["clip"]); opt.step(); sched.step()
ref_p1 = MJ.from_torch(MT.state_numpy(tm), base)
val_batches = [C.batch(i, "val", n_steps=8) for i in range(8)]
TORCH_LOSS = ROOT_PIT["torch_loss"]


def tree_maxdiff(a, b, skip_keybias=True):
    out = 0.0
    for (pa, la), (pb, lb) in zip(jax.tree_util.tree_leaves_with_path(a), jax.tree_util.tree_leaves_with_path(b)):
        name = jax.tree_util.keystr(pa)
        if skip_keybias and "'wk'" in name and "'b'" in name:
            continue
        out = max(out, float(jnp.abs(jnp.asarray(la, jnp.float32) - jnp.asarray(lb, jnp.float32)).max()))
    return out


def rungs(v):
    params = init_params(v)
    lf = loss_of(v)
    lg = np.asarray(jax.jit(lambda p, x: forward(p, x, v))(params, x0))
    l0, g0 = jax.jit(jax.value_and_grad(lf))(params, x0, y0)
    tx = make_tx(v); st = tx.init(params)
    u, st = tx.update(g0, st, params); p1 = optax.apply_updates(params, u)
    mean_l0 = float(l0) / (x0.size if v.get("loss_sum") else 1)
    return dict(logits=P.maxdiff(lg, ref_logits), logits_nan=bool(np.isnan(lg).any()),
                loss0=abs(mean_l0 - ref_loss0) if np.isfinite(mean_l0) else None,
                grads=tree_maxdiff(g0, ref_grads) if np.isfinite(float(l0)) else None,
                step1=tree_maxdiff(p1, ref_p1) if np.isfinite(float(l0)) else None)


def train(v):
    params = init_params(v); tx = make_tx(v); lf = loss_of(v)

    @jax.jit
    def step(p, s, x, y):
        l, g = jax.value_and_grad(lf)(p, x, y)
        u, s = tx.update(g, s, p)
        return optax.apply_updates(p, u), s, l

    st = tx.init(params); losses = []
    t0 = time.perf_counter(); c0 = time.process_time()
    for s in range(STEPS):
        x, y = C.batch(s)
        params, st, l = step(params, st, x, y)
        l = float(l) / (x.size if v.get("loss_sum") else 1)
        losses.append(round(l, 6) if math.isfinite(l) else None)
    vl = jax.jit(lambda p, x, y: optax.softmax_cross_entropy_with_integer_labels(forward(p, x, dict(v, mask="causal")), y).mean())
    val = float(np.mean([vl(params, a, b) for a, b in val_batches]))
    # the same model judged honestly: validation with the variant's own (possibly wrong) mask too
    vl_own = jax.jit(lambda p, x, y: optax.softmax_cross_entropy_with_integer_labels(forward(p, x, v), y).mean())
    val_own = float(np.mean([vl_own(params, a, b) for a, b in val_batches]))
    return losses, val, val_own, time.perf_counter() - t0, time.process_time() - c0


# ------------------------------------------------------------------ run
outp = os.path.join(P.OUT, "hunt.json")
prev = json.load(open(outp)) if os.path.exists(outp) else {"variants": {}}
only = set(filter(None, os.environ.get("JX_ONLY", "").split(",")))
res = {"steps": STEPS, "torch_loss": TORCH_LOSS, "variants": {}, "load_start": P.load1(),
       "ref": dict(loss0=ref_loss0, max_abs_logit=float(np.abs(ref_logits).max()))}
for name, v in VARIANTS.items():
    r = dict(label=v["label"], kind=v["kind"], src=v["src"], rungs=rungs(v))
    if v["src"] == ROOT:
        rv = ROOT_PIT["variants"][name]
        r.update(loss=rv["loss"], val_300=rv["val_300"])
    elif only and name not in only and name in prev["variants"]:
        r.update({k: prev["variants"][name][k] for k in ("loss", "val_300", "val_300_own_mask", "wall_s", "cpu_s") if k in prev["variants"][name]})
    else:
        losses, val, val_own, wall, cpu = train(v)
        r.update(loss=losses, val_300=val, val_300_own_mask=val_own, wall_s=round(wall, 1), cpu_s=round(cpu, 1))
    L = np.array([np.nan if t is None else t for t in r["loss"]], dtype=float); Tl = np.array(TORCH_LOSS)
    d = np.abs(L - Tl)
    r["max_abs_loss_diff_vs_torch"] = float(np.nanmax(d)) if np.isfinite(d).any() else None
    r["first_nan_step"] = int(np.argmax(~np.isfinite(L))) if (~np.isfinite(L)).any() else None
    r["first_step_over_1e-4"] = int(np.argmax(d > 1e-4)) if (d > 1e-4).any() else None
    res["variants"][name] = r
    print(name, json.dumps(r["rungs"]), r.get("val_300"), r["max_abs_loss_diff_vs_torch"], flush=True)

# harness check: the correct port trained here must reproduce the root's correct curve exactly
chk = train(VARIANTS["correct"])
res["harness_check"] = dict(max_abs_vs_root_correct=float(np.max(np.abs(np.array(chk[0]) - np.array(ROOT_PIT["variants"]["correct"]["loss"])))),
                            val_here=chk[1], val_root=ROOT_PIT["variants"]["correct"]["val_300"])
res["load_end"] = P.load1()
res["versions"] = dict(P.versions(), torch=torch.__version__, optax=optax.__version__)
res["label"] = P.LABEL
P.save("hunt", res)
