"""The longer twin run: PyTorch, plain JAX + optax and Flax NNX trained side by side from the same
weights on the same batches for JX_STEPS steps (default 4000), the setup run's 500 steps extended.

Records per step: training loss, gradient norm, step time (all three). Every 250 steps: validation loss
(8 fixed batches). Every 500 steps: how far the weights and logits of the twins have drifted apart
(all weights except the key biases; the key biases alone; logits on validation batch 0).
The batch order is common.offsets(JX_STEPS): numpy draws it row by row, so the first 500 batches are the
setup run's batches and steps 0..499 must reproduce equiv.json (checked at the end).

Run (about 25 to 40 minutes on a loaded M1 Pro CPU, low priority):
  JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_twin_long.py
Writes src/train/out/twin_long.json (small) and the final weights to $JX_SCRATCH/train/.
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np
import torch

torch.set_num_threads(4)
import jax
from flax import nnx

import common as C
import model_jax as MJ
import model_nnx as MN
import model_torch as MT

cfg = C.CFG
STEPS = int(os.environ.get("JX_STEPS", 4000))
VAL_EVERY, DRIFT_EVERY = 250, 500
d = lambda a, b: float(np.max(np.abs(a - b)))

sd0 = dict(np.load(C.path("data", "init_torch.npz")))
tm = MT.make_model(cfg, cfg["seed"])
tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
jp = MJ.from_torch(sd0, cfg)
nm = MN.from_torch(MN.make_model(cfg, 0), sd0)

VAL_B = 8
val_batches = [C.batch(i, "val", n_steps=VAL_B) for i in range(VAL_B)]
xv0 = val_batches[0][0]


def val_torch():
    with torch.no_grad():
        return float(np.mean([MT.loss_fn(tm, torch.from_numpy(a).long(), torch.from_numpy(b).long()).item()
                              for a, b in val_batches]))


eval_j = jax.jit(lambda p, a, b: MJ.loss_fn(p, a, b, cfg))
eval_n = nnx.jit(MN.loss_fn)
logits_j = jax.jit(lambda p, a: MJ.apply(p, a, cfg))
val_jax = lambda p: float(np.mean([eval_j(p, a, b) for a, b in val_batches]))
val_nnx = lambda m: float(np.mean([eval_n(m, a, b) for a, b in val_batches]))

opt_t, sched_t = MT.make_optimizer(tm, cfg, C.lr_at)
tx = MJ.make_optimizer(cfg, C.lr_at)
ost = tx.init(jp)
step_j = MJ.make_train_step(cfg, tx)
opt_n = MN.make_optimizer(nm, cfg)

rec = {k: {"loss": [], "gnorm": [], "time": []} for k in ("torch", "jax", "nnx")}
val = {k: [] for k in rec}
val_at, drift = [], []


def snapshot(s):
    wt = MT.state_numpy(tm); wj = MJ.to_torch_names(jp); wn = MN.to_torch_names(nm)
    kb = [k for k in wt if ".wk.bias" in k]
    rest = [k for k in wt if k not in kb]
    with torch.no_grad():
        lt = tm(torch.from_numpy(xv0).long()).numpy()
    lj = np.asarray(logits_j(jp, xv0))
    drift.append({"step": s,
                  "w_torch_vs_jax_excl_keybias": max(d(wt[k], wj[k]) for k in rest),
                  "w_torch_vs_jax_keybias": max(d(wt[k], wj[k]) for k in kb),
                  "w_jax_vs_nnx_all": max(d(wj[k], wn[k]) for k in wt),
                  "w_change_from_init": max(d(wt[k], sd0[k]) for k in wt),
                  "keybias_norm_torch": float(max(np.abs(wt[k]).max() for k in kb)),
                  "logits_torch_vs_jax": d(lt, lj), "max_abs_logit": float(np.abs(lt).max())})


t_start = time.time()
for s in range(STEPS):
    if s % VAL_EVERY == 0:
        val_at.append(s); val["torch"].append(val_torch()); val["jax"].append(val_jax(jp)); val["nnx"].append(val_nnx(nm))
    if s % DRIFT_EVERY == 0:
        snapshot(s)
    x, y = C.batch(s, n_steps=STEPS)
    t0 = time.perf_counter(); l, g = MT.train_step(tm, opt_t, sched_t, torch.from_numpy(x).long(), torch.from_numpy(y).long(), cfg["clip"])
    rec["torch"]["time"].append(time.perf_counter() - t0); rec["torch"]["loss"].append(l); rec["torch"]["gnorm"].append(g)
    t0 = time.perf_counter(); jp, ost, l, g = step_j(jp, ost, x, y); l, g = float(l), float(g)
    rec["jax"]["time"].append(time.perf_counter() - t0); rec["jax"]["loss"].append(l); rec["jax"]["gnorm"].append(g)
    t0 = time.perf_counter(); l, g = MN.train_step(nm, opt_n, x, y); l, g = float(l), float(g)
    rec["nnx"]["time"].append(time.perf_counter() - t0); rec["nnx"]["loss"].append(l); rec["nnx"]["gnorm"].append(g)
    if s % 100 == 0 or s == STEPS - 1:
        print(s, {k: round(rec[k]["loss"][-1], 5) for k in rec}, "%.0fs" % (time.time() - t_start), os.getloadavg()[0], flush=True)
val_at.append(STEPS); val["torch"].append(val_torch()); val["jax"].append(val_jax(jp)); val["nnx"].append(val_nnx(nm))
snapshot(STEPS)

L = {k: np.array(rec[k]["loss"]) for k in rec}
D = np.abs(L["torch"] - L["jax"])
first_over = {str(t): (int(np.argmax(D > t)) if (D > t).any() else None) for t in (1e-5, 1e-4, 1e-3, 1e-2)}
eq = json.load(open(os.path.join(HERE, "..", "data", "equiv.json")))
n5 = min(500, STEPS)
r500 = {k: float(np.abs(L[k][:n5] - np.array(eq["train"]["loss"][k][:n5])).max()) for k in rec}
out = {
    "what": "longer twin run: same weights, same batches, PyTorch vs plain JAX vs Flax NNX",
    "steps": STEPS, "cfg": cfg,
    "versions": {"jax": jax.__version__, "flax": __import__("flax").__version__, "optax": __import__("optax").__version__,
                 "torch": torch.__version__, "numpy": np.__version__},
    "loss": {k: [round(float(v), 6) for v in rec[k]["loss"]] for k in rec},
    "gnorm": {k: [round(float(v), 5) for v in rec[k]["gnorm"]] for k in rec},
    "val_at": val_at, "val": {k: [round(v, 6) for v in val[k]] for k in val},
    "drift": drift,
    "max_abs_loss_diff": {"torch_vs_jax": float(D.max()), "torch_vs_nnx": float(np.abs(L["torch"] - L["nnx"]).max()),
                          "jax_vs_nnx": float(np.abs(L["jax"] - L["nnx"]).max())},
    "max_abs_loss_diff_by_window": {"torch_vs_jax": [[a, min(a + 500, STEPS), float(D[a:a + 500].max())] for a in range(0, STEPS, 500)]},
    "first_step_loss_diff_over": first_over,
    "first500_vs_setup_run_max_abs": r500,
    "clip_active_steps": {k: int((np.array(rec[k]["gnorm"]) > cfg["clip"]).sum()) for k in rec},
    "step_time_median_s": {k: float(np.median(rec[k]["time"][10:])) for k in rec},
    "step_time_p10_p90_s": {k: [float(np.percentile(rec[k]["time"][10:], 10)), float(np.percentile(rec[k]["time"][10:], 90))] for k in rec},
    "first_step_time_s": {k: float(rec[k]["time"][0]) for k in rec},
    "wall_s": time.time() - t_start, "load_avg_end": os.getloadavg(), "date": time.strftime("%Y-%m-%d %H:%M"),
    "machine": "Apple M1 Pro (CPU), shared machine, 4 threads, low priority (nice 15)",
}
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
with open(os.path.join(HERE, "out", "twin_long.json"), "w") as f:
    json.dump(out, f)
os.makedirs(C.path("train"), exist_ok=True)
np.savez(C.path("train", f"final_torch_{STEPS}.npz"), **MT.state_numpy(tm))
np.savez(C.path("train", f"final_jax_{STEPS}.npz"), **MJ.to_torch_names(jp))
print(json.dumps({k: out[k] for k in ("max_abs_loss_diff", "first_step_loss_diff_over", "first500_vs_setup_run_max_abs",
                                      "step_time_median_s", "first_step_time_s", "clip_active_steps")}, indent=1))
print("val", out["val"]); print("drift", drift[-1])
