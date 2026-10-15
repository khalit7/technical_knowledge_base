"""Equivalence check of the running example's three implementations (PyTorch, Flax NNX, plain JAX + optax).

1. Build the PyTorch model (seed 0), save its initial weights to $JX_SCRATCH/data/init_torch.npz,
   copy them into the NNX model and the plain-JAX params pytree.
2. Same input -> compare logits, loss and gradients (float32).
3. Train all three for CFG['steps'] steps on the same batches; record loss and gradient norm per step,
   validation loss every 100 steps, step times; write equiv.json (small, in the repo) and the final weights
   to $JX_SCRATCH/data/.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B check_equiv.py
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np
import torch

torch.set_num_threads(4)
import jax
import jax.numpy as jnp
from flax import nnx

import common as C
import model_jax as MJ
import model_nnx as MN
import model_torch as MT

cfg = C.CFG
STEPS = int(os.environ.get("JX_STEPS", cfg["steps"]))
out = {"cfg": cfg, "steps": STEPS, "versions": {"jax": jax.__version__, "flax": __import__("flax").__version__,
       "optax": __import__("optax").__version__, "torch": torch.__version__, "numpy": np.__version__},
       "devices": [str(d) for d in jax.devices()]}

# ---------------------------------------------------------------- 1. same initial weights
tm = MT.make_model(cfg, cfg["seed"])
sd = MT.state_numpy(tm)
np.savez(C.path("data", "init_torch.npz"), **sd)
n_params = sum(v.size for v in sd.values())
out["n_params"] = int(n_params)
out["param_shapes"] = {k: list(v.shape) for k, v in sd.items()}
jp = MJ.from_torch(sd, cfg)
nm = MN.from_torch(MN.make_model(cfg, 0), sd)
print("params", n_params)

# ---------------------------------------------------------------- 2. same input, same outputs
x, y = C.batch(0, n_steps=STEPS)
with torch.no_grad():
    lt = tm(torch.from_numpy(x).long()).numpy()
lj = np.asarray(jax.jit(lambda p, x: MJ.apply(p, x, cfg))(jp, x))
ln = np.asarray(nnx.jit(lambda m, x: m(x))(nm, x))
lj_scan = np.asarray(jax.jit(lambda p, x: MJ.apply_scan(p, x, cfg))(MJ.stack_blocks(jp), x))
d = lambda a, b: float(np.max(np.abs(a - b)))
out["logits"] = {"max_abs_logit": float(np.abs(lt).max()), "torch_vs_jax": d(lt, lj), "torch_vs_nnx": d(lt, ln),
                 "jax_vs_nnx": d(lj, ln), "jax_vs_jax_scan": d(lj, lj_scan)}
print("logits", out["logits"])

# loss and gradients
xt, yt = torch.from_numpy(x).long(), torch.from_numpy(y).long()
loss_t = MT.loss_fn(tm, xt, yt)
tm.zero_grad(); loss_t.backward()
gt = {k: p.grad.numpy().copy() for k, p in tm.named_parameters()}
loss_j, gj = jax.value_and_grad(MJ.loss_fn)(jp, x, y, cfg)
gj_t = MJ.to_torch_names(gj)                         # back to PyTorch names and layout
gdiff = {k: d(gt[k], gj_t[k]) for k in gt}
# relative to each parameter's largest gradient; skip parameters whose gradient is exactly zero in theory
# (the key bias: softmax is invariant to adding the same number to every score of a row, so d loss / d bk = 0)
gmax = {k: float(np.abs(gt[k]).max()) for k in gt}
grel = {k: d(gt[k], gj_t[k]) / gmax[k] for k in gt if ".wk.bias" not in k}
worst = max(grel, key=grel.get)
out["grads"] = {"loss_torch": loss_t.item(), "loss_jax": float(loss_j), "loss_diff": abs(loss_t.item() - float(loss_j)),
                "max_abs_diff": max(gdiff.values()), "max_rel_diff": grel[worst], "worst_param": worst,
                "key_bias_grad_max_abs": {"torch": max(gmax[k] for k in gt if ".wk.bias" in k),
                                          "jax": max(float(np.abs(gj_t[k]).max()) for k in gt if ".wk.bias" in k)},
                "largest_grad_max_abs": max(gmax.values()),
                "ln_V": float(np.log(cfg["vocab"]))}
print("grads", out["grads"])
del gt, gj, gj_t

# ---------------------------------------------------------------- 3. train all three on the same batches
VAL_B = 8
val_batches = [C.batch(i, "val", n_steps=VAL_B) for i in range(VAL_B)]


def val_torch():
    with torch.no_grad():
        return float(np.mean([MT.loss_fn(tm, torch.from_numpy(a).long(), torch.from_numpy(b).long()).item()
                              for a, b in val_batches]))


eval_j = jax.jit(lambda p, a, b: MJ.loss_fn(p, a, b, cfg))
eval_n = nnx.jit(MN.loss_fn)
val_jax = lambda p: float(np.mean([eval_j(p, a, b) for a, b in val_batches]))
val_nnx = lambda m: float(np.mean([eval_n(m, a, b) for a, b in val_batches]))

opt_t, sched_t = MT.make_optimizer(tm, cfg, C.lr_at)
tx = MJ.make_optimizer(cfg, C.lr_at)
ost = tx.init(jp)
step_j = MJ.make_train_step(cfg, tx)
opt_n = MN.make_optimizer(nm, cfg)

rec = {k: {"loss": [], "gnorm": [], "time": []} for k in ("torch", "nnx", "jax")}
val = {k: [] for k in ("torch", "nnx", "jax")}
val_at = []
for s in range(STEPS):
    if s % 100 == 0:
        val_at.append(s); val["torch"].append(val_torch()); val["jax"].append(val_jax(jp)); val["nnx"].append(val_nnx(nm))
    x, y = C.batch(s, n_steps=STEPS)
    t0 = time.perf_counter(); l, g = MT.train_step(tm, opt_t, sched_t, torch.from_numpy(x).long(), torch.from_numpy(y).long(), cfg["clip"])
    rec["torch"]["time"].append(time.perf_counter() - t0); rec["torch"]["loss"].append(l); rec["torch"]["gnorm"].append(g)
    t0 = time.perf_counter(); jp, ost, l, g = step_j(jp, ost, x, y); l, g = float(l), float(g)
    rec["jax"]["time"].append(time.perf_counter() - t0); rec["jax"]["loss"].append(l); rec["jax"]["gnorm"].append(g)
    t0 = time.perf_counter(); l, g = MN.train_step(nm, opt_n, x, y); l, g = float(l), float(g)
    rec["nnx"]["time"].append(time.perf_counter() - t0); rec["nnx"]["loss"].append(l); rec["nnx"]["gnorm"].append(g)
    if s % 50 == 0 or s == STEPS - 1:
        print(s, {k: round(rec[k]["loss"][-1], 5) for k in rec}, flush=True)
val_at.append(STEPS); val["torch"].append(val_torch()); val["jax"].append(val_jax(jp)); val["nnx"].append(val_nnx(nm))

L = {k: np.array(rec[k]["loss"]) for k in rec}
out["train"] = {
    "loss": {k: [round(v, 6) for v in rec[k]["loss"]] for k in rec},
    "gnorm": {k: [round(v, 5) for v in rec[k]["gnorm"]] for k in rec},
    "val_at": val_at, "val": {k: [round(v, 6) for v in val[k]] for k in val},
    "max_abs_loss_diff": {"torch_vs_jax": float(np.abs(L["torch"] - L["jax"]).max()),
                          "torch_vs_nnx": float(np.abs(L["torch"] - L["nnx"]).max()),
                          "jax_vs_nnx": float(np.abs(L["jax"] - L["nnx"]).max())},
    "loss_diff_by_step": {k: [float(np.abs(L["torch"] - L[k])[:n].max()) for n in (1, 10, 100, STEPS)]
                          for k in ("jax", "nnx")},
    "step_time_median_s": {k: float(np.median(rec[k]["time"][10:])) for k in rec},
    "first_step_time_s": {k: float(rec[k]["time"][0]) for k in rec},
}
wt = MT.state_numpy(tm); wj = MJ.to_torch_names(jp); wn = MN.to_torch_names(nm)
w0 = dict(np.load(C.path("data", "init_torch.npz")))
out["train"]["final_weight_max_abs_diff_torch_vs_jax"] = max(d(wt[k], wj[k]) for k in wt)
out["train"]["final_weight_max_abs_diff_torch_vs_nnx"] = max(d(wt[k], wn[k]) for k in wt)
out["train"]["max_abs_weight_change_from_init"] = max(d(wt[k], w0[k]) for k in wt)
np.savez(C.path("data", f"final_torch_{STEPS}.npz"), **wt)
np.savez(C.path("data", f"final_jax_{STEPS}.npz"), **wj)
out["load_avg"] = os.getloadavg()
out["date"] = time.strftime("%Y-%m-%d %H:%M")
with open(os.path.join(C.HERE, "equiv.json"), "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps({k: out["train"][k] for k in ("max_abs_loss_diff", "loss_diff_by_step", "step_time_median_s",
                                               "first_step_time_s", "final_weight_max_abs_diff_torch_vs_jax")}, indent=1))
print("val", out["train"]["val"])
