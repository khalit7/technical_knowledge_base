"""Mixed precision on the running example (plain-JAX twin), 300 steps each, same weights and batches:

  f32         everything float32 (the reference).
  bf16_master jmp policy params=float32, compute=bfloat16, output=float32: the forward and backward run in
              bfloat16 on a bfloat16 copy of the weights, the gradients arrive in float32 (the gradient of a
              cast is a cast back), and optax updates float32 master weights.
  bf16_all    weights and optimiser state stored in bfloat16 too (no master copy).

Records the training loss per step, validation loss at 300, the bytes held for weights and optimiser state,
and, for bf16_all, how many LayerNorm scale entries never moved from 1.0: bfloat16 has 8 significant bits, so
the spacing just above 1.0 is 2**-7 = 0.0078 and an update of about lr = 1e-3 rounds away.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B mixed.py
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np
import jax
import jax.numpy as jnp
import jmp
import optax

import common as C
import model_jax as MJ

cfg = C.CFG
STEPS = int(os.environ.get("JX_STEPS", 300))
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
val_batches = [C.batch(i, "val", n_steps=8) for i in range(8)]
POL = {"f32": jmp.get_policy("params=float32,compute=float32,output=float32"),
       "bf16_master": jmp.get_policy("params=float32,compute=bfloat16,output=float32"),
       "bf16_all": jmp.get_policy("params=bfloat16,compute=bfloat16,output=float32")}


def loss_fn(params, x, y, policy):
    p = policy.cast_to_compute(params)                      # bfloat16 copy for the matmuls (or a no-op)
    logits = policy.cast_to_output(MJ.apply(p, x, cfg))     # back to float32 for the loss
    return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()


res = {"steps": STEPS, "variants": {}}
for name, pol in POL.items():
    params = jax.tree.map(lambda a: a.astype(pol.param_dtype), MJ.from_torch(sd0, cfg))
    tx = MJ.make_optimizer(cfg, C.lr_at)
    st = tx.init(params)

    @jax.jit
    def step(p, s, x, y):
        l, g = jax.value_and_grad(loss_fn)(p, x, y, pol)
        u, s = tx.update(g, s, p)
        return optax.apply_updates(p, u), s, l, g

    losses, times = [], []
    for s in range(STEPS):
        x, y = C.batch(s)
        t0 = time.perf_counter()
        params, st, l, g = step(params, st, x, y)
        losses.append(round(float(l), 6)); times.append(time.perf_counter() - t0)
    ev = jax.jit(lambda p, a, b: loss_fn(p, a, b, pol))
    val = float(np.mean([ev(params, a, b) for a, b in val_batches]))
    ln_scales = [params["blocks"][i][n]["scale"] for i in range(cfg["n_layers"]) for n in ("ln1", "ln2")] + [params["ln_f"]["scale"]]
    unmoved = int(sum(int((np.asarray(a, np.float32) == 1.0).sum()) for a in ln_scales))
    nbytes = lambda t: int(sum(a.size * a.dtype.itemsize for a in jax.tree.leaves(t)))
    res["variants"][name] = {"loss": losses, "val_300": val, "grad_dtype": str(jax.tree.leaves(g)[0].dtype),
                             "param_dtype": str(jax.tree.leaves(params)[0].dtype),
                             "param_bytes": nbytes(params), "opt_state_bytes": nbytes(st),
                             "ln_scale_entries": int(sum(a.size for a in ln_scales)), "ln_scale_unmoved": unmoved,
                             "step_time_median_s": float(np.median(times[10:])), "first_step_s": times[0]}
    print(name, "val %.4f, loss[-1] %.4f, LN scale unmoved %d/%d, params %d B, opt %d B, grads %s, step %.3fs" % (
        val, losses[-1], unmoved, res["variants"][name]["ln_scale_entries"], res["variants"][name]["param_bytes"],
        res["variants"][name]["opt_state_bytes"], res["variants"][name]["grad_dtype"], res["variants"][name]["step_time_median_s"]), flush=True)
res["bf16_spacing_at_1"] = float(jnp.finfo(jnp.bfloat16).eps)
res["versions"] = {"jax": jax.__version__, "jmp": "0.0.4", "optax": optax.__version__}
res["load_avg"] = os.getloadavg()
json.dump(res, open(os.path.join(HERE, "out", "mixed.json"), "w"))
