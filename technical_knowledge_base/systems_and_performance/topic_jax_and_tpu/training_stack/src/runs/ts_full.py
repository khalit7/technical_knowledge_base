"""A complete training script for the running example: Flax NNX + optax + grain + orbax + nnx.metrics.

This file is shown on the page (section 9) as it is. It trains, evaluates every 100 steps, keeps the two best
checkpoints by validation loss plus the latest, logs without a host sync per step, and resumes from the
latest checkpoint if one exists. The driver at the bottom runs it three times in separate processes:
  run A: 400 steps without stopping
  run B: the same, killed (sys.exit) right after step 250
  run C: started again with the same command; it finds the step-200 checkpoint and finishes
and checks that B+C ends with the same weights as A.
Output: out/full.json; checkpoints in $JX_SCRATCH/ts/full_*.
"""
import json
import os
import shutil
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import numpy as np  # noqa: E402

C = T.C
CFG = C.CFG
POLICY_ONLY = os.environ.get("TS_POLICY_ONLY") == "1"   # reproduce the run without best_fn (out/full_policy_only.json)


# ---------------------------------------------------------------- the training script
def train(ckpt_dir, total_steps=400, eval_every=100, log_every=50, stop_after=None):
    import grain
    import jax
    import jax.numpy as jnp
    import optax
    import orbax.checkpoint as ocp
    from flax import nnx
    import model_nnx as MN

    # data: a deterministic, checkpointable pipeline
    seq = CFG["ctx"] + 1
    train_tok, val_tok = C.tokens()
    win = train_tok[: len(train_tok) // seq * seq].reshape(-1, seq)
    ds = (grain.MapDataset.source(win).shuffle(seed=0).repeat()          # reshuffled every epoch
          .map(lambda w: w.astype(np.int32)).batch(CFG["batch"], drop_remainder=True))
    it = iter(ds.to_iter_dataset())
    vwin = val_tok[: len(val_tok) // seq * seq].reshape(-1, seq)[:256].astype(np.int32)   # fixed 256 windows

    # model and optimiser
    model = MN.make_model(CFG, seed=0)
    MN.from_torch(model, dict(np.load(C.path("data", "init_torch.npz"))))
    sched = optax.warmup_cosine_decay_schedule(0.0, CFG["lr"], warmup_steps=50, decay_steps=total_steps, end_value=CFG["lr"] / 10)
    tx = optax.chain(optax.clip_by_global_norm(CFG["clip"]),
                     optax.adamw(sched, b1=CFG["betas"][0], b2=CFG["betas"][1], weight_decay=CFG["weight_decay"],
                                 mask=MN._decay_mask))
    opt = nnx.Optimizer(model, tx, wrt=nnx.Param)
    metrics = nnx.MultiMetric(loss=nnx.metrics.Average("loss"), accuracy=nnx.metrics.Accuracy())

    @nnx.jit
    def train_step(model, opt, metrics, x, y):
        def loss_fn(m):
            logits = m(x)
            return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean(), logits
        (loss, logits), grads = nnx.value_and_grad(loss_fn, has_aux=True)(model)
        opt.update(model, grads)
        metrics.update(loss=loss, logits=logits, labels=y)              # accumulates on device: no sync

    @nnx.jit
    def eval_step(model, metrics, x, y):
        logits = model(x)
        metrics.update(loss=optax.softmax_cross_entropy_with_integer_labels(logits, y).mean(), logits=logits, labels=y)

    # checkpoints: save every eval; keep the latest plus the 2 best by validation loss
    # (orbax 0.12.7 marks max_to_keep / best_fn as deprecated in favour of these policy objects)
    cm = ocp.checkpoint_managers
    mngr = ocp.CheckpointManager(ckpt_dir, options=ocp.CheckpointManagerOptions(
        save_decision_policy=cm.FixedIntervalPolicy(eval_every),
        preservation_policy=cm.AnyPreservationPolicy([
            cm.LatestN(n=1),
            cm.BestN(get_metric_fn=lambda m: m["val_loss"], reverse=True, n=2)]),   # reverse=True keeps the smallest
        # best_fn is deprecated, but without it orbax 0.12.7 does not write the metrics to disk, so after a
        # restart BestN sees no metrics and keeps every old checkpoint (measured: out/full_policy_only.json)
        **({} if POLICY_ONLY else {"best_fn": lambda m: m["val_loss"], "best_mode": "min"}),
        enable_async_checkpointing=True))
    start = 0
    if mngr.latest_step() is not None:                                   # resume
        s = mngr.latest_step()
        r = mngr.restore(s, args=ocp.args.Composite(model=ocp.args.StandardRestore(nnx.state(model)),
                                                    opt=ocp.args.StandardRestore(nnx.state(opt)),
                                                    data=grain.checkpoint.CheckpointRestore(it)))
        nnx.update(model, r.model)
        nnx.update(opt, r.opt)
        start = s
        print(f"resumed from step {s}", flush=True)

    log = []
    t0 = time.perf_counter()
    for step in range(start, total_steps):
        w = next(it)
        train_step(model, opt, metrics, jnp.asarray(w[:, :-1]), jnp.asarray(w[:, 1:]))
        if (step + 1) % log_every == 0:                                   # the only host syncs
            m = {k: float(v) for k, v in metrics.compute().items()}
            metrics.reset()
            log.append({"step": step + 1, "train_loss": m["loss"], "train_acc": m["accuracy"],
                        "lr": float(sched(step)), "s": round(time.perf_counter() - t0, 1)})
            print(log[-1], flush=True)
        if (step + 1) % eval_every == 0:
            ev = nnx.MultiMetric(loss=nnx.metrics.Average("loss"), accuracy=nnx.metrics.Accuracy())
            for i in range(0, len(vwin), 32):
                eval_step(model, ev, jnp.asarray(vwin[i:i + 32, :-1]), jnp.asarray(vwin[i:i + 32, 1:]))
            e = {k: float(v) for k, v in ev.compute().items()}
            log.append({"step": step + 1, "val_loss": e["loss"], "val_acc": e["accuracy"]})
            print(log[-1], flush=True)
            mngr.save(step + 1, args=ocp.args.Composite(model=ocp.args.StandardSave(nnx.state(model)),
                                                        opt=ocp.args.StandardSave(nnx.state(opt)),
                                                        data=grain.checkpoint.CheckpointSave(it)),
                      metrics={"val_loss": e["loss"]})
        if stop_after is not None and step + 1 == stop_after:
            mngr.wait_until_finished()
            print(f"stopping after step {step + 1} (simulated preemption)", flush=True)
            return model, log, mngr
    mngr.wait_until_finished()
    return model, log, mngr


# ---------------------------------------------------------------- driver
def child(name, ckpt, stop):
    import jax
    from flax import nnx
    model, log, mngr = train(ckpt, stop_after=stop)
    leaves = [np.asarray(a) for a in jax.tree.leaves(nnx.state(model, nnx.Param))]
    np.savez(C.path("ts", f"full_{name}.npz"), *leaves)
    json.dump({"log": log, "kept_steps": list(mngr.all_steps()), "latest": mngr.latest_step(),
               "best": mngr.best_step()}, open(C.path("ts", f"full_{name}.json"), "w"))


if __name__ == "__main__":
    if len(sys.argv) > 1:
        name, ckpt, stop = sys.argv[1], sys.argv[2], (int(sys.argv[3]) if sys.argv[3] != "-" else None)
        child(name, ckpt, stop)
        sys.exit(0)
    T.scratch("x")
    da, db = C.path("ts", "full_ckpt_A"), C.path("ts", "full_ckpt_B")
    res_disk = {}
    for d in (da, db):
        shutil.rmtree(d, ignore_errors=True)
    env = dict(os.environ)
    me = os.path.abspath(__file__)
    times = {}
    for name, d, stop in (("A", da, "-"), ("B", db, "250"), ("C", db, "-")):
        t0 = time.time()
        subprocess.run([sys.executable, "-I", "-B", "-u", me, name, d, stop], check=True, env=env)
        times[name] = round(time.time() - t0, 1)
    J = {n: json.load(open(C.path("ts", f"full_{n}.json"))) for n in "ABC"}
    LA, LC = np.load(C.path("ts", "full_A.npz")), np.load(C.path("ts", "full_C.npz"))
    same = all(np.array_equal(LA[k], LC[k]) for k in LA.files)
    res = {"versions": T.versions(), "runs": J, "times_s": times, "final_bitwise_equal_A_vs_BC": bool(same),
           "dirs_A": sorted(os.listdir(da)), "dirs_BC": sorted(os.listdir(db)), "policy_only": POLICY_ONLY, "load": T.load_avg()}
    T.save("full_policy_only" if POLICY_ONLY else "full", res)
    print(json.dumps({k: v for k, v in res.items() if k != "runs"}, indent=1))
