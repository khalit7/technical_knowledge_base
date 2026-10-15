"""How Linen and Equinox hold state, with their real error messages (training_stack page, section 3).

Linen: init returns collections; apply with and without mutable; dropout rngs; sow; the NNX bridge.
Equinox: eqx.Module is a frozen pytree; jax.jit vs eqx.filter_jit on a module holding a function;
partition/combine; filter_grad; tree_at; stateful BatchNorm with eqx.nn.State.
Output: out/linen_eqx.json
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402

R = {"versions": T.versions()}
key = jax.random.key(0)
x = jax.random.normal(key, (32, 128))

# ------------------------------------------------------------------ Linen
import flax.linen as nn  # noqa: E402


class LBlock(nn.Module):
    d_ff: int = 512

    @nn.compact
    def __call__(self, x, train: bool):
        h = nn.Dense(self.d_ff)(x)                       # input width read from x at init time
        h = nn.BatchNorm(use_running_average=not train, momentum=0.9)(h)
        h = nn.gelu(h, approximate=False)
        self.sow("intermediates", "hidden_mean", h.mean())
        h = nn.Dropout(0.1, deterministic=not train)(h)
        return nn.Dense(x.shape[-1])(h)


m = LBlock()
variables = m.init({"params": jax.random.key(1), "dropout": jax.random.key(2)}, x, train=False)
L = {"collections": sorted(variables.keys()),
     "params_shapes": jax.tree.map(lambda a: list(a.shape), variables["params"]),
     "batch_stats_shapes": jax.tree.map(lambda a: list(a.shape), variables["batch_stats"])}
y_eval = m.apply(variables, x, train=False)
L["eval_ok_shape"] = list(y_eval.shape)
L["train_without_mutable"] = T.err_text(lambda: m.apply(variables, x, train=True, rngs={"dropout": jax.random.key(3)}))
L["train_without_dropout_rng"] = T.err_text(lambda: m.apply(variables, x, train=True, mutable=["batch_stats"]))
y, upd = m.apply(variables, x, train=True, rngs={"dropout": jax.random.key(3)}, mutable=["batch_stats", "intermediates"])
L["mutable_returns"] = sorted(upd.keys())
old_mean = np.asarray(variables["batch_stats"]["BatchNorm_0"]["mean"])
new_mean = np.asarray(upd["batch_stats"]["BatchNorm_0"]["mean"])
L["batch_mean_moved"] = float(np.abs(new_mean - old_mean).max())
L["sown"] = float(np.asarray(upd["intermediates"]["hidden_mean"][0]))
L["params_unchanged_by_apply"] = True   # apply never returns params: they are an input only
# the NNX bridge: run a Linen module as an NNX module
from flax import nnx  # noqa: E402
from flax.nnx import bridge  # noqa: E402

lin = bridge.ToNNX(nn.Dense(64), rngs=nnx.Rngs(0))
bridge.lazy_init(lin, x)
L["bridge_state"] = [[".".join(str(getattr(k, "key", k)) for k in p), type(v).__name__, list(v[...].shape)]
                     for p, v in nnx.to_flat_state(nnx.state(lin))]
R["linen"] = L
print("linen", {k: (str(v)[:160]) for k, v in L.items()})

# ------------------------------------------------------------------ Equinox
import equinox as eqx  # noqa: E402


class EMLP(eqx.Module):
    fc1: eqx.nn.Linear
    fc2: eqx.nn.Linear
    act: callable                        # a plain function stored as a field: a non-array leaf

    def __init__(self, key):
        k1, k2 = jax.random.split(key)
        self.fc1 = eqx.nn.Linear(128, 512, key=k1)
        self.fc2 = eqx.nn.Linear(512, 128, key=k2)
        self.act = jax.nn.gelu

    def __call__(self, x):                 # one example: Equinox layers do not batch
        return self.fc2(self.act(self.fc1(x)))


em = EMLP(jax.random.key(4))
E = {"leaves": [[type(l).__name__, list(getattr(l, "shape", []))] for l in jax.tree.leaves(em)],
     "fc1_weight_shape": list(em.fc1.weight.shape)}
E["setattr_error"] = T.err_text(lambda: setattr(em, "fc1", None))
E["jax_jit_error"] = T.err_text(lambda: jax.jit(lambda mm, xx: jax.vmap(mm)(xx))(em, x))
yy = eqx.filter_jit(lambda mm, xx: jax.vmap(mm)(xx))(em, x)
E["filter_jit_ok_shape"] = list(yy.shape)
params, static = eqx.partition(em, eqx.is_array)
E["partition"] = {"params_leaves": len(jax.tree.leaves(params)), "static_leaves": len(jax.tree.leaves(static))}
recombined = eqx.combine(params, static)
E["combine_maxdiff_eager_vs_jit"] = float(np.abs(np.asarray(jax.vmap(recombined)(x)) - np.asarray(yy)).max())


@eqx.filter_grad
def g(mm, xx):
    return jnp.mean(jax.vmap(mm)(xx) ** 2)


gr = g(em, x)
E["filter_grad_leaves"] = [[type(l).__name__, list(getattr(l, "shape", []))] for l in jax.tree.leaves(gr)]
em2 = eqx.tree_at(lambda mm: mm.fc1.bias, em, jnp.ones(512))
E["tree_at"] = {"old_bias_sum": float(em.fc1.bias.sum()), "new_bias_sum": float(em2.fc1.bias.sum()),
                "same_object": em2 is em}
bn, state = eqx.nn.make_with_state(eqx.nn.BatchNorm)(128, axis_name="batch")
out, state2 = jax.vmap(bn, axis_name="batch", in_axes=(0, None), out_axes=(0, None))(x, state)
E["batchnorm_state"] = {"state_type": type(state).__name__, "returns_new_state": type(state2).__name__,
                        "out_shape": list(out.shape)}
R["equinox"] = E
print("eqx", {k: (str(v)[:200]) for k, v in E.items()})
T.save("linen_eqx", R)
