"""Porting pitfalls, measured: the plain-JAX twin trained for 300 steps with ONE porting mistake at a time,
each a default that differs between PyTorch and JAX/Flax/optax or a layout slip, against the correct port.

For each variant: the largest logit difference from PyTorch at the shared initial weights (before training),
the training loss at every step, and the validation loss after 300 steps. The PyTorch reference curve is the
first 300 steps of the setup run (equiv.json), which the correct port reproduces.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pitfalls.py   (about 5 to 15 minutes)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np
import torch

torch.set_num_threads(4)
import jax
import jax.numpy as jnp
import optax
from flax import nnx

import common as C
import model_jax as MJ
import model_torch as MT

STEPS = int(os.environ.get("JX_STEPS", 300))
base = dict(C.CFG)
sd0 = dict(np.load(C.path("data", "init_torch.npz")))


def forward(params, idx, cfg, approx_gelu):
    T = idx.shape[1]
    x = params["tok_emb"][idx] + params["pos_emb"][:T]
    for p in params["blocks"]:
        x = x + MJ.attention(p["attn"], MJ.layer_norm(p["ln1"], x, cfg["ln_eps"]), cfg["n_heads"])
        h = MJ.layer_norm(p["ln2"], x, cfg["ln_eps"])
        x = x + MJ.linear(p["mlp"]["fc2"], jax.nn.gelu(MJ.linear(p["mlp"]["fc1"], h), approximate=approx_gelu))
    return MJ.layer_norm(params["ln_f"], x, cfg["ln_eps"]) @ params["head"]["w"]


def flax_default_params(cfg, seed=0):
    """What you get if you let Flax initialise: nnx.Linear (lecun_normal kernel, zero bias), nnx.Embed defaults."""
    r = nnx.Rngs(seed); d, f, V = cfg["d_model"], cfg["d_ff"], cfg["vocab"]
    lin = lambda i, o: (lambda m: {"w": m.kernel[...], "b": m.bias[...]})(nnx.Linear(i, o, rngs=r))
    ln = lambda: {"scale": jnp.ones((d,)), "bias": jnp.zeros((d,))}
    blocks = [{"ln1": ln(), "attn": {k: lin(d, d) for k in ("wq", "wk", "wv", "wo")}, "ln2": ln(),
               "mlp": {"fc1": lin(d, f), "fc2": lin(f, d)}} for _ in range(cfg["n_layers"])]
    return {"tok_emb": nnx.Embed(V, d, rngs=r).embedding[...], "pos_emb": nnx.Embed(cfg["ctx"], d, rngs=r).embedding[...],
            "blocks": blocks, "ln_f": ln(), "head": {"w": nnx.Linear(d, V, use_bias=False, rngs=r).kernel[...]}}


def no_transpose(params):
    """from_torch without the .T: only the square matrices load without a shape error, and they load wrong."""
    out = jax.tree.map(lambda x: x, params)
    n = 0
    for b in out["blocks"]:
        for grp in ("attn", "mlp"):
            for k, m in b[grp].items():
                if m["w"].shape[0] == m["w"].shape[1]:
                    m["w"] = m["w"].T; n += 1
    return out, n


VARIANTS = {
    "correct": dict(label="Correct port (every default set explicitly)"),
    "ln_eps": dict(label="LayerNorm epsilon left at Flax's 1e-6 (PyTorch 1e-5)", ln_eps=1e-6),
    "gelu": dict(label="GELU left at jax.nn.gelu's tanh approximation (PyTorch: exact erf)", approx=True),
    "transpose": dict(label="Linear weights copied without the transpose (square ones load silently)", transpose=True),
    "init": dict(label="Flax's default initialisers instead of the PyTorch weights", init=True),
    "decay_all": dict(label="Weight decay on every parameter (no optax mask)", mask=False),
    "wd_default": dict(label="optax.adamw default weight_decay=1e-4 (the run uses 0.1)", wd=1e-4),
    "b2_default": dict(label="optax default b2=0.999 (the run uses 0.95)", b2=0.999),
}

x0, _ = C.batch(0)
tm = MT.make_model(base, 0); tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
with torch.no_grad():
    ref_logits = tm(torch.from_numpy(x0).long()).numpy()
val_batches = [C.batch(i, "val", n_steps=8) for i in range(8)]
eq = json.load(open(os.path.join(HERE, "..", "data", "equiv.json")))
res = {"steps": STEPS, "torch_loss": eq["train"]["loss"]["torch"][:STEPS], "variants": {}}

for name, v in VARIANTS.items():
    cfg = dict(base); cfg["ln_eps"] = v.get("ln_eps", base["ln_eps"]); approx = v.get("approx", False)
    params = flax_default_params(cfg) if v.get("init") else MJ.from_torch(sd0, cfg)
    n_sq = None
    if v.get("transpose"):
        params, n_sq = no_transpose(params)
    mask = MJ.decay_mask if v.get("mask", True) else None
    tx = optax.chain(optax.clip_by_global_norm(cfg["clip"]),
                     optax.adamw(lambda c: cfg["lr"] * jnp.minimum(1.0, (c + 1) / cfg["warmup"]),
                                 b1=cfg["betas"][0], b2=v.get("b2", cfg["betas"][1]), eps=cfg["adam_eps"],
                                 weight_decay=v.get("wd", cfg["weight_decay"]), mask=mask))
    loss_fn = lambda p, x, y: optax.softmax_cross_entropy_with_integer_labels(forward(p, x, cfg, approx), y).mean()

    @jax.jit
    def step(p, s, x, y):
        l, g = jax.value_and_grad(loss_fn)(p, x, y)
        u, s = tx.update(g, s, p)
        return optax.apply_updates(p, u), s, l

    lg0 = np.asarray(jax.jit(lambda p, x: forward(p, x, cfg, approx))(params, x0))
    st = tx.init(params); losses = []
    for s in range(STEPS):
        x, y = C.batch(s)
        params, st, l = step(params, st, x, y); losses.append(round(float(l), 6))
    ev = jax.jit(loss_fn)
    val = float(np.mean([ev(params, a, b) for a, b in val_batches]))
    L = np.array(losses); T = np.array(res["torch_loss"])
    res["variants"][name] = {"label": v["label"], "init_logit_max_abs_diff": float(np.abs(lg0 - ref_logits).max()),
                             "init_loss": losses[0], "loss": losses, "val_300": val,
                             "max_abs_loss_diff_vs_torch": float(np.abs(L - T).max()),
                             "mean_loss_last50_minus_torch": float((L[-50:] - T[-50:]).mean())}
    if n_sq is not None:
        res["variants"][name]["square_matrices_transposed"] = n_sq
    print(name, "init logit diff %.2e, loss0 %.4f, val300 %.4f, max |dloss| %.2e" % (
        res["variants"][name]["init_logit_max_abs_diff"], losses[0], val, res["variants"][name]["max_abs_loss_diff_vs_torch"]), flush=True)

res["versions"] = {"jax": jax.__version__, "flax": __import__("flax").__version__, "optax": optax.__version__}
json.dump(res, open(os.path.join(HERE, "out", "pitfalls.json"), "w"))
