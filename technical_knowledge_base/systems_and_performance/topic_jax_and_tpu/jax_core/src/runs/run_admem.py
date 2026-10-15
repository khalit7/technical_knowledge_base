"""What XLA actually allocates for the running example's loss and its gradient (compiled memory analysis),
next to the pre-XLA residual count in out/ad.json. Writes out/admem.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_admem.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import optax  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

cfg = C.CFG
params = MJ.from_torch(dict(np.load(C.path("data", "init_torch.npz"))), cfg)
x, y = (jnp.asarray(a) for a in C.batch(0))


def loss(p):
    return MJ.loss_fn(p, x, y, cfg)


def loss_remat(p):                               # the same loss with every block under jax.checkpoint
    T = x.shape[1]
    h = p["tok_emb"][x] + p["pos_emb"][:T]
    for b in p["blocks"]:
        h = jax.checkpoint(lambda bb, hh: MJ.block(bb, hh, cfg))(b, h)
    logits = MJ.layer_norm(p["ln_f"], h, cfg["ln_eps"]) @ p["head"]["w"]
    return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()


out = {"versions": J.versions()}
for name, f in [("forward (loss)", loss), ("value_and_grad", jax.value_and_grad(loss)),
                ("value_and_grad, every block under jax.checkpoint", jax.value_and_grad(loss_remat))]:
    m = jax.jit(f).lower(params).compile().memory_analysis()
    out[name] = {k: int(getattr(m, k)) for k in ("argument_size_in_bytes", "output_size_in_bytes", "temp_size_in_bytes",
                                                  "alias_size_in_bytes", "generated_code_size_in_bytes")}
out["remat_same_loss"] = float(abs(jax.jit(jax.value_and_grad(loss))(params)[0] - jax.jit(jax.value_and_grad(loss_remat))(params)[0]))
out["note"] = "XLA:CPU buffer assignment after fusion; temp is the scratch the program needs beyond arguments and outputs"
J.save("admem", out)
