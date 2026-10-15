"""Rematerialisation policies on the running example (measured here: compile only, deterministic).

For each jax.checkpoint policy applied to every transformer block, compile value_and_grad of the loss
for one 32 x 128 batch on CPU and record: XLA's flops and bytes accessed (cost_analysis), temporary
bytes (memory_analysis), and the residuals JAX saves for the backward pass (saved_residuals).
What transfers to TPU: the residual counts and bytes and the extra FLOPs (properties of the program);
the temp bytes are XLA:CPU's buffer plan (TPU's differs; it also runs its own HloRematerialization).
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import time
import numpy as np
import tq_common as T
import jax
import jax.numpy as jnp
import optax
from jax._src import ad_checkpoint as adc
import common as C
import model_jax as MJ

cfg = C.CFG
sd = dict(np.load(C.path("data", "init_torch.npz")))
params = MJ.from_torch(sd, cfg)
x, y = (jnp.asarray(a) for a in C.batch(0))
cp = jax.checkpoint_policies
POL = [("none (save everything)", None), ("nothing_saveable (full remat)", cp.nothing_saveable),
       ("dots_saveable", cp.dots_saveable), ("dots_with_no_batch_dims_saveable", cp.dots_with_no_batch_dims_saveable),
       ("everything_saveable", cp.everything_saveable)]


def make_loss(policy, use_ckpt):
    blk = MJ.block
    if use_ckpt:
        blk = jax.checkpoint(MJ.block, policy=policy, static_argnums=(2,))

    def apply(params, idx):
        Tn = idx.shape[1]
        h = params["tok_emb"][idx] + params["pos_emb"][:Tn]
        for p in params["blocks"]:
            h = blk(p, h, cfg) if not use_ckpt else blk(p, h, tuple(sorted(cfg.items())))
        return MJ.layer_norm(params["ln_f"], h, cfg["ln_eps"]) @ params["head"]["w"]

    def loss(params, x, y):
        return optax.softmax_cross_entropy_with_integer_labels(apply(params, x), y).mean()
    return loss


# block() reads cfg["ln_eps"] and cfg["n_heads"]: give it a hashable mapping when it is a static arg
class HCfg(dict):
    def __hash__(self):
        return hash(tuple(sorted(self.items())))


_orig_block = MJ.block
MJ.block = lambda p, h, c: _orig_block(p, h, dict(c) if isinstance(c, tuple) else c)

rows = []
for name, pol in POL:
    use = pol is not None
    f = make_loss(pol, use)
    t0 = time.time()
    res = adc.saved_residuals(f, params, x, y)
    n_res = len(res)
    res_bytes = int(sum(int(np.prod(a.shape)) * a.dtype.itemsize for a, _ in res))
    comp = jax.jit(jax.value_and_grad(f)).lower(params, x, y).compile()
    ca = comp.cost_analysis()
    ca = ca[0] if isinstance(ca, list) else ca
    ma = comp.memory_analysis()
    loss_val = float(jax.jit(f)(params, x, y))
    rows.append({"policy": name, "residuals": n_res, "residual_bytes": res_bytes,
                 "flops": float(ca.get("flops", 0)), "bytes_accessed": float(ca.get("bytes accessed", 0)),
                 "temp_bytes": int(ma.temp_size_in_bytes), "arg_bytes": int(ma.argument_size_in_bytes),
                 "loss": loss_val, "compile_s": round(time.time() - t0, 1)})
    print(rows[-1], flush=True)
fwd = jax.jit(make_loss(None, False)).lower(params, x, y).compile().cost_analysis()
fwd = fwd[0] if isinstance(fwd, list) else fwd
T.save("remat.json", {"rows": rows, "forward_flops": float(fwd["flops"]), "batch": [32, 128],
                      "jax_version": jax.__version__, "label": "XLA:CPU compile of jax.value_and_grad(loss), float32, every block under jax.checkpoint(policy)",
                      "policy_src": {"nothing_saveable": T.src_line("jax", "jax/_src/ad_checkpoint.py", r"^def nothing_saveable"),
                                     "dots_saveable": T.src_line("jax", "jax/_src/ad_checkpoint.py", r"dots_saveable = DotsSaveable\(False\)"),
                                     "dots_with_no_batch_dims_saveable": T.src_line("jax", "jax/_src/ad_checkpoint.py", r"^dots_with_no_batch_dims_saveable = ")}})
