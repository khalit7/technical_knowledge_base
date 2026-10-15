"""Stop the running example mid-epoch, checkpoint it with orbax, resume in a NEW PROCESS, and check that the
resumed run is bit-identical to an uninterrupted one. Data comes from a grain pipeline whose iterator state
is saved in the same checkpoint, so the resumed run also continues mid-epoch on the right batch.

Pipeline: the training text cut into non-overlapping windows of 129 characters (7,781 windows), shuffled with
a fixed seed, batched by 32 (243 batches per epoch, remainder dropped). Model: the plain-JAX twin
(model_jax.py) and its optax chain, from the shared initial weights.

  mode "full":   train 200 steps without stopping.
  mode "first":  train 100 steps, save {params, opt_state} + the grain iterator with an orbax
                 CheckpointManager (async), exit.
  mode "resume": a fresh process: restore both, train steps 100..199.
Run all three: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ckpt_resume.py
(the script calls itself in subprocesses). Results: out/ckpt_resume.json.
"""
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np

import common as C

TOTAL, SAVE_AT, SEQ, B = 200, 100, C.CFG["ctx"] + 1, C.CFG["batch"]
CK = C.path("train", "ckpt_resume")
RES = C.path("train", "ckpt_resume_parts")


def pipeline():
    import grain
    train, _ = C.tokens()
    n = len(train) // SEQ
    windows = train[: n * SEQ].reshape(n, SEQ)
    ds = (grain.MapDataset.source(windows)
          .shuffle(seed=0)                                    # a fixed permutation of the windows
          .map(lambda w: w.astype(np.int32))
          .batch(B, drop_remainder=True))                    # 243 batches of [32, 129] per epoch
    return n, len(ds), iter(ds.to_iter_dataset())


def make():
    import jax
    import model_jax as MJ
    cfg = C.CFG
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, cfg)
    tx = MJ.make_optimizer(cfg, C.lr_at)
    return params, tx.init(params), MJ.make_train_step(cfg, tx), tx


def train(params, opt_state, step_fn, it, a, b):
    losses = []
    for s in range(a, b):
        w = next(it)
        params, opt_state, loss, _ = step_fn(params, opt_state, w[:, :-1], w[:, 1:])
        losses.append(float(loss))
    return params, opt_state, losses


def leaves(tree):
    import jax
    return [np.asarray(x) for x in jax.tree.leaves(tree)]


def main_mode(mode):
    import grain
    import jax
    import orbax.checkpoint as ocp
    n_windows, n_batches, it = pipeline()
    params, opt_state, step_fn, tx = make()
    out = {"mode": mode, "n_windows": n_windows, "batches_per_epoch": n_batches}
    if mode == "full":
        params, opt_state, losses = train(params, opt_state, step_fn, it, 0, TOTAL)
    elif mode == "first":
        params, opt_state, losses = train(params, opt_state, step_fn, it, 0, SAVE_AT)
        shutil.rmtree(CK, ignore_errors=True)
        mngr = ocp.CheckpointManager(CK, options=ocp.CheckpointManagerOptions(enable_async_checkpointing=True))
        t0 = time.perf_counter()
        mngr.save(SAVE_AT, args=ocp.args.Composite(state=ocp.args.StandardSave({"params": params, "opt_state": opt_state}),
                                                   data=grain.checkpoint.CheckpointSave(it)))
        out["save_call_s"] = time.perf_counter() - t0          # returns while the write continues in the background
        mngr.wait_until_finished()
        out["save_total_s"] = time.perf_counter() - t0
        out["iterator_state"] = it.get_state()
        files = []
        for root, _, fs in os.walk(CK):
            for f in fs:
                p = os.path.join(root, f)
                files.append([os.path.relpath(p, CK), os.path.getsize(p)])
        out["files"] = sorted(files)
    elif mode == "resume":
        mngr = ocp.CheckpointManager(CK)
        abstract = {"params": params, "opt_state": opt_state}   # shapes, dtypes and tree structure to restore into
        step = mngr.latest_step()
        r = mngr.restore(step, args=ocp.args.Composite(state=ocp.args.StandardRestore(abstract),
                                                       data=grain.checkpoint.CheckpointRestore(it)))
        params, opt_state = r.state["params"], r.state["opt_state"]
        out["restored_step"] = int(step)
        out["iterator_state_after_restore"] = it.get_state()
        params, opt_state, losses = train(params, opt_state, step_fn, it, SAVE_AT, TOTAL)
    out["losses"] = losses
    os.makedirs(RES, exist_ok=True)
    np.savez(os.path.join(RES, mode + ".npz"), *leaves({"params": params, "opt_state": opt_state}))
    json.dump(out, open(os.path.join(RES, mode + ".json"), "w"), default=str)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        main_mode(sys.argv[1]); sys.exit(0)
    env = dict(os.environ)
    for m in ("full", "first", "resume"):                       # three separate processes
        subprocess.run([sys.executable, "-I", "-B", os.path.abspath(__file__), m], check=True, env=env)
    J = {m: json.load(open(os.path.join(RES, m + ".json"))) for m in ("full", "first", "resume")}
    L = {m: np.load(os.path.join(RES, m + ".npz")) for m in ("full", "resume")}
    keys = sorted(L["full"].files, key=lambda k: int(k.split("_")[1]))
    same = all(np.array_equal(L["full"][k], L["resume"][k]) for k in keys)
    maxd = max(float(np.abs(L["full"][k].astype(np.float64) - L["resume"][k].astype(np.float64)).max()) for k in keys)
    joined = J["first"]["losses"] + J["resume"]["losses"]
    res = {"total_steps": TOTAL, "save_at": SAVE_AT, "n_windows": J["full"]["n_windows"],
           "batches_per_epoch": J["full"]["batches_per_epoch"],
           "bit_identical_state": bool(same), "n_arrays_compared": len(keys), "max_abs_diff": maxd,
           "losses_identical": joined == J["full"]["losses"],
           "loss_at": {str(s): J["full"]["losses"][s] for s in (0, 99, 100, 199)},
           "resumed_losses_first3": J["resume"]["losses"][:3], "full_losses_100_102": J["full"]["losses"][100:103],
           "save_call_s": J["first"]["save_call_s"], "save_total_s": J["first"]["save_total_s"],
           "iterator_state": J["first"]["iterator_state"], "files": J["first"]["files"],
           "restored_step": J["resume"]["restored_step"],
           "losses_full": [round(v, 6) for v in J["full"]["losses"]]}
    import grain, orbax.checkpoint as ocp, jax
    res["versions"] = {"orbax-checkpoint": ocp.__version__ if hasattr(ocp, "__version__") else "0.12.7", "grain": "0.2.18", "jax": jax.__version__}
    json.dump(res, open(os.path.join(HERE, "out", "ckpt_resume.json"), "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "losses_full"}, indent=1))
