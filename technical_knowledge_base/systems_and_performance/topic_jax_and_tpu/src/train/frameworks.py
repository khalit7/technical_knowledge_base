"""The running example's transformer block written in five frameworks, loaded with the same weights,
run on the same input, and compared with PyTorch.

PyTorch (model_torch.Block), Flax NNX (model_nnx.Block), Flax Linen, Equinox and Haiku. The Linen,
Equinox and Haiku versions are defined below; their source (inspect.getsource) and the measured results go to
out/frameworks.json so the page shows exactly the code that ran.
Weights: block 0 of the PyTorch model after the setup's 500 training steps (final_torch_500.npz), so that
biases and LayerNorm parameters are not trivially 0 and 1. Input: the embeddings of training batch 0.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B frameworks.py
"""
import inspect
import json
import math
import os
import sys
import warnings

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np
import torch

torch.set_num_threads(4)
import equinox as eqx
import flax
import flax.linen as nn
import haiku as hk
import jax
import jax.numpy as jnp
from flax import nnx

import common as C
import model_nnx as MN
import model_torch as MT

cfg = C.CFG
D, H, F, EPS = cfg["d_model"], cfg["n_heads"], cfg["d_ff"], cfg["ln_eps"]


# ------------------------------------------------------------------ Flax Linen: init/apply, params in a dict
class LinenBlock(nn.Module):
    d: int
    h: int
    f: int
    eps: float = 1e-5

    @nn.compact
    def __call__(self, x):                                   # x [B, T, D]
        B, T, D = x.shape
        split = lambda t: t.reshape(B, T, self.h, D // self.h).transpose(0, 2, 1, 3)
        y = nn.LayerNorm(epsilon=self.eps, name="ln1")(x)
        q, k, v = (split(nn.Dense(D, name=n)(y)) for n in ("wq", "wk", "wv"))
        s = q @ k.transpose(0, 1, 3, 2) / math.sqrt(D // self.h)
        s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
        a = (jax.nn.softmax(s, -1) @ v).transpose(0, 2, 1, 3).reshape(B, T, D)
        x = x + nn.Dense(D, name="wo")(a)
        y = nn.LayerNorm(epsilon=self.eps, name="ln2")(x)
        y = nn.Dense(self.f, name="fc1")(y)
        return x + nn.Dense(D, name="fc2")(jax.nn.gelu(y, approximate=False))


# ------------------------------------------------------------------ Equinox: the module is a pytree
class EqxBlock(eqx.Module):
    ln1: eqx.nn.LayerNorm
    ln2: eqx.nn.LayerNorm
    wq: eqx.nn.Linear
    wk: eqx.nn.Linear
    wv: eqx.nn.Linear
    wo: eqx.nn.Linear
    fc1: eqx.nn.Linear
    fc2: eqx.nn.Linear
    h: int = eqx.field(static=True)

    def __init__(self, d, h, f, eps, key):
        ks = jax.random.split(key, 6)
        self.ln1, self.ln2 = eqx.nn.LayerNorm(d, eps=eps), eqx.nn.LayerNorm(d, eps=eps)
        self.wq, self.wk, self.wv, self.wo = (eqx.nn.Linear(d, d, key=k) for k in ks[:4])
        self.fc1, self.fc2 = eqx.nn.Linear(d, f, key=ks[4]), eqx.nn.Linear(f, d, key=ks[5])
        self.h = h

    def __call__(self, x):                                   # x [T, D]: one sequence, vmap for a batch
        T, D = x.shape
        lin = lambda m, t: jax.vmap(m)(t)                    # Equinox layers act on one vector
        split = lambda t: t.reshape(T, self.h, D // self.h).transpose(1, 0, 2)
        y = jax.vmap(self.ln1)(x)
        q, k, v = (split(lin(m, y)) for m in (self.wq, self.wk, self.wv))
        s = q @ k.transpose(0, 2, 1) / math.sqrt(D // self.h)
        s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
        a = (jax.nn.softmax(s, -1) @ v).transpose(1, 0, 2).reshape(T, D)
        x = x + lin(self.wo, a)
        y = lin(self.fc1, jax.vmap(self.ln2)(x))
        return x + lin(self.fc2, jax.nn.gelu(y, approximate=False))


# ------------------------------------------------------------------ Haiku (legacy): transform a function
def haiku_block(x):                                          # x [B, T, D]
    B, T, D = x.shape
    split = lambda t: t.reshape(B, T, H, D // H).transpose(0, 2, 1, 3)
    ln = lambda n: hk.LayerNorm(-1, create_scale=True, create_offset=True, eps=EPS, name=n)
    y = ln("ln1")(x)
    q, k, v = (split(hk.Linear(D, name=n)(y)) for n in ("wq", "wk", "wv"))
    s = q @ k.transpose(0, 1, 3, 2) / math.sqrt(D // H)
    s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
    a = (jax.nn.softmax(s, -1) @ v).transpose(0, 2, 1, 3).reshape(B, T, D)
    x = x + hk.Linear(D, name="wo")(a)
    y = hk.Linear(F, name="fc1")(ln("ln2")(x))
    return x + hk.Linear(D, name="fc2")(jax.nn.gelu(y, approximate=False))


# ------------------------------------------------------------------ same weights, same input
sd = dict(np.load(C.path("data", "final_torch_500.npz")))
p = lambda k: sd["blocks.0." + k]
LIN = ("attn.wq", "attn.wk", "attn.wv", "attn.wo", "mlp.fc1", "mlp.fc2")
short = lambda n: n.split(".")[1]

tm = MT.make_model(cfg, 0); tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd.items()})
x0, _ = C.batch(0)
with torch.no_grad():
    xt = tm.tok_emb(torch.from_numpy(x0).long()) + tm.pos_emb(torch.arange(cfg["ctx"]))
    ref = tm.blocks[0](xt).numpy()
xin = xt.numpy()
res = {}
d = lambda a: float(np.max(np.abs(np.asarray(a) - ref)))

# NNX (the running example's own Block); copy with the non-deprecated [...] setter
nb = MN.Block(cfg, rngs=nnx.Rngs(0))
for n in LIN:
    m = getattr(getattr(nb, n.split(".")[0]), short(n))
    m.kernel[...] = p(n + ".weight").T; m.bias[...] = p(n + ".bias")
for n in ("ln1", "ln2"):
    getattr(nb, n).scale[...] = p(n + ".weight"); getattr(nb, n).bias[...] = p(n + ".bias")
res["nnx"] = d(nnx.jit(lambda m, x: m(x))(nb, xin))
graphdef, state = nnx.split(nb)
res["nnx_state_leaves"] = len(jax.tree.leaves(state))
res["nnx_param_count"] = int(sum(v.size for v in jax.tree.leaves(nnx.state(nb, nnx.Param))))

# Linen: init gives a params dict; we overwrite it with the PyTorch weights
lb = LinenBlock(D, H, F, EPS)
lp = lb.init(jax.random.key(0), xin)
lp = {"params": {**{short(n): {"kernel": p(n + ".weight").T, "bias": p(n + ".bias")} for n in LIN},
                 **{n: {"scale": p(n + ".weight"), "bias": p(n + ".bias")} for n in ("ln1", "ln2")}}}
res["linen"] = d(jax.jit(lb.apply)(lp, xin))
res["linen_param_paths"] = sorted(jax.tree_util.keystr(k) for k, _ in jax.tree_util.tree_leaves_with_path(lp))[:4]

# Equinox: build, then swap leaves in with eqx.tree_at (weights stay [out, in] like PyTorch)
eb = EqxBlock(D, H, F, EPS, jax.random.key(0))
names = [short(n) for n in LIN]
eb = eqx.tree_at(lambda b: [getattr(b, n).weight for n in names] + [getattr(b, n).bias for n in names],
                 eb, [jnp.asarray(p(n + ".weight")) for n in LIN] + [jnp.asarray(p(n + ".bias")) for n in LIN])
eb = eqx.tree_at(lambda b: [b.ln1.weight, b.ln1.bias, b.ln2.weight, b.ln2.bias], eb,
                 [jnp.asarray(p(f"{n}.{w}")) for n in ("ln1", "ln2") for w in ("weight", "bias")])
res["equinox"] = d(eqx.filter_jit(lambda m, x: jax.vmap(m)(x))(eb, xin))
res["equinox_leaves"] = len(jax.tree.leaves(eqx.filter(eb, eqx.is_array)))

# Haiku: transform the function into a pure (init, apply) pair
hb = hk.without_apply_rng(hk.transform(haiku_block))
hp = hb.init(jax.random.key(0), xin)
hp = {**{short(n): {"w": p(n + ".weight").T, "b": p(n + ".bias")} for n in LIN},
      **{n: {"scale": p(n + ".weight"), "offset": p(n + ".bias")} for n in ("ln1", "ln2")}}
res["haiku_init_keys"] = sorted(hb.init(jax.random.key(0), xin).keys())
res["haiku"] = d(jax.jit(hb.apply)(hp, xin))

res["ref_max_abs"] = float(np.abs(ref).max())
res["input"] = "embeddings of training batch 0, shape %s" % (list(xin.shape),)
res["versions"] = {"jax": jax.__version__, "flax": flax.__version__, "equinox": eqx.__version__,
                   "haiku": hk.__version__, "torch": torch.__version__}
src = {"torch": inspect.getsource(MT.Block) + "\n" + inspect.getsource(MT.Attention) + "\n" + inspect.getsource(MT.MLP),
       "nnx": inspect.getsource(MN.Block) + "\n" + inspect.getsource(MN.Attention) + "\n" + inspect.getsource(MN.MLP),
       "linen": inspect.getsource(LinenBlock), "equinox": inspect.getsource(EqxBlock), "haiku": inspect.getsource(haiku_block)}
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump({"results": res, "source": src}, open(os.path.join(HERE, "out", "frameworks.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
