"""grad and value_and_grad against loss.backward() on the same weights and batch: per-parameter
differences, has_aux, gradient accumulation semantics, and higher-order derivatives.
Output: out/grad.json"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
import model_torch as MT  # noqa: E402

torch.set_num_threads(4)
cfg = C.CFG
sd = dict(np.load(C.path("data", "init_torch.npz")))
x, y = C.batch(0)
out = {"versions": X.versions(), "torch": torch.__version__}

# JAX: one call returns the loss and a gradient pytree shaped like params
params = MJ.from_torch(sd, cfg)
loss_j, g = jax.jit(jax.value_and_grad(lambda p: MJ.loss_fn(p, x, y, cfg)))(params)
gn = MJ.to_torch_names(g)                      # same names and layout as PyTorch (transposed back)

# PyTorch: the same weights, loss.backward() fills .grad on every parameter
tm = MT.make_model(cfg)
tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd.items()})
lt = MT.loss_fn(tm, torch.from_numpy(x).long(), torch.from_numpy(y).long())
lt.backward()
rows = []
for name, p in tm.named_parameters():
    gt = p.grad.numpy()
    gj = np.asarray(gn[name])
    d = np.abs(gt - gj)
    rows.append({"name": name, "shape": list(gt.shape), "max_abs_diff": float(d.max()), "max_abs_grad": float(np.abs(gt).max()),
                 "rel": float(d.max() / max(np.abs(gt).max(), 1e-30))})
out["loss"] = {"jax": float(loss_j), "torch": float(lt), "diff": abs(float(loss_j) - float(lt))}
out["rows"] = rows
nonkb = [r for r in rows if not r["name"].endswith("attn.wk.bias")]
out["summary"] = {"n_params": len(rows), "max_abs_diff": max(r["max_abs_diff"] for r in rows),
                  "worst_rel_excl_key_bias": max(r["rel"] for r in nonkb),
                  "worst_rel_name": max(nonkb, key=lambda r: r["rel"])["name"],
                  "key_bias_max_abs_grad": max(r["max_abs_grad"] for r in rows if r["name"].endswith("attn.wk.bias")),
                  "largest_grad": max(r["max_abs_grad"] for r in rows),
                  "same_structure": jax.tree.structure(g) == jax.tree.structure(params)}
print(out["loss"], out["summary"])

# accumulation: PyTorch adds into .grad until zero_grad(); jax.grad returns a fresh value each call
g1 = tm.head.weight.grad.clone()
MT.loss_fn(tm, torch.from_numpy(x).long(), torch.from_numpy(y).long()).backward()   # no zero_grad
g2 = tm.head.weight.grad.clone()
_, gj2 = jax.jit(jax.value_and_grad(lambda p: MJ.loss_fn(p, x, y, cfg)))(params)
out["accumulate"] = {"torch_ratio_after_second_backward": float((g2.norm() / g1.norm())),
                     "jax_ratio_second_call": float(jnp.linalg.norm(gj2["head"]["w"]) / jnp.linalg.norm(g["head"]["w"]))}


# has_aux: return metrics next to the loss without differentiating them
def loss_aux(p, x, y):
    logits = MJ.apply(p, x, cfg)
    l = jnp.mean(jax.nn.logsumexp(logits, -1) - jnp.take_along_axis(logits, y[..., None], -1)[..., 0])
    acc = jnp.mean(jnp.argmax(logits, -1) == y)
    return l, {"accuracy": acc, "max_logit": logits.max()}


(l, aux), ga = jax.value_and_grad(loss_aux, has_aux=True)(params, x, y)
out["has_aux"] = {"loss": round(float(l), 6), "aux": {k: round(float(v), 6) for k, v in aux.items()},
                  "grad_equal_to_plain": float(max(jnp.abs(a - b).max() for a, b in zip(jax.tree.leaves(ga), jax.tree.leaves(g))))}
out["has_aux_missing"] = X.first_lines(X.err(lambda: jax.grad(loss_aux)(params, x, y)), 2)

# higher order: grad of grad, and the same through jax.hessian on a tiny function
f = lambda t: jnp.tanh(t)  # noqa: E731
out["higher"] = {"d1": float(jax.grad(f)(0.5)), "d2": float(jax.grad(jax.grad(f))(0.5)),
                 "d2_formula": float(-2 * np.tanh(0.5) * (1 - np.tanh(0.5) ** 2)),
                 "d3": float(jax.grad(jax.grad(jax.grad(f)))(0.5))}

# stop_gradient is detach()
out["stop_gradient"] = {"jax": float(jax.grad(lambda t: t * jax.lax.stop_gradient(t))(3.0))}
tt = torch.tensor(3.0, requires_grad=True)
(tt * tt.detach()).backward()
out["stop_gradient"]["torch"] = float(tt.grad)

# argnums: gradient with respect to several arguments
w = jnp.array([1.0, 2.0]); b = jnp.array(0.5)
gw, gb = jax.grad(lambda w, b: jnp.sum(w * 3.0 + b), argnums=(0, 1))(w, b)
out["argnums"] = {"dw": np.asarray(gw).tolist(), "db": float(gb)}
X.save("grad", out)
