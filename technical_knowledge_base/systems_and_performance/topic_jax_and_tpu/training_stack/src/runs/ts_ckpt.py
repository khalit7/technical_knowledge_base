"""Checkpoint and resume, bit for bit, and what each missing piece costs (training_stack Resume lab).

The running example in Flax NNX with dropout 0.1 on the embeddings (so the RNG stream is part of the state),
the running example's optimizer (nnx.Optimizer over the optax chain), data from a grain pipeline
(non-overlapping 129-character windows, shuffled with seed 0, batches of 32).

  full            one process trains steps 0..TOTAL-1 without stopping
  first           trains 0..SAVE_AT-1, saves {model state incl. RNG, optimizer state, grain iterator, step}
                  with an async orbax CheckpointManager, exits
  resume:<what>   a fresh process restores some of that and trains SAVE_AT..TOTAL-1:
     all          everything
     no_data      a fresh data iterator (the epoch restarts at batch 0)
     no_opt       a fresh optimizer (Adam moments zero, step count 0, so warmup restarts)
     no_rng       fresh RNG streams (dropout masks repeat those of steps 0..)
     params_only  only the Param leaves (what torch.save(model.state_dict()) would keep)
Each mode runs in its own process. Results: out/ckpt.json; checkpoints in $JX_SCRATCH/ts/ckpt.
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
TOTAL, SAVE_AT, SEQ, B = 160, 80, CFG["ctx"] + 1, CFG["batch"]
CK = T.scratch("ckpt")
RES = T.scratch("ckpt_parts")
VARIANTS = ["all", "no_data", "no_opt", "no_rng", "params_only"]


def pipeline():
    import grain
    train, _ = C.tokens()
    n = len(train) // SEQ
    windows = train[: n * SEQ].reshape(n, SEQ)
    ds = (grain.MapDataset.source(windows).shuffle(seed=0).map(lambda w: w.astype(np.int32))
          .batch(B, drop_remainder=True))
    return iter(ds.to_iter_dataset())


def build():
    import jax.numpy as jnp
    from flax import nnx
    import model_nnx as MN

    class TinyLMDrop(MN.TinyLM):
        def __init__(self, cfg, *, rngs):
            super().__init__(cfg, rngs=rngs)
            self.drop = nnx.Dropout(0.1, rngs=rngs)

        def __call__(self, idx):
            x = self.drop(self.tok_emb(idx) + self.pos_emb(jnp.arange(idx.shape[1])))
            for b in self.blocks:
                x = b(x)
            return self.head(self.ln_f(x))

    model = TinyLMDrop(CFG, rngs=nnx.Rngs(params=0, dropout=1))
    MN.from_torch(model, dict(np.load(C.path("data", "init_torch.npz"))))
    opt = MN.make_optimizer(model, CFG)

    @nnx.jit
    def step(model, opt, x, y):
        loss, grads = nnx.value_and_grad(MN.loss_fn)(model, x, y)
        opt.update(model, grads)
        return loss
    return model, opt, step


def train(model, opt, step, it, a, b):
    import jax.numpy as jnp
    out = []
    for _ in range(a, b):
        w = next(it)
        out.append(float(step(model, opt, jnp.asarray(w[:, :-1]), jnp.asarray(w[:, 1:]))))
    return out


def dump(name, model, opt, extra):
    import jax
    from flax import nnx
    leaves = [np.asarray(x) for x in jax.tree.leaves(nnx.state(model, nnx.Param))]
    leaves += [np.asarray(x) for x in jax.tree.leaves(nnx.state(opt, nnx.Not(nnx.Param)))
               if hasattr(x, "dtype") and x.dtype != object and "key" not in str(x.dtype)]
    np.savez(os.path.join(RES, name + ".npz"), *leaves)
    json.dump(extra, open(os.path.join(RES, name + ".json"), "w"))


def run(mode):
    import grain
    import jax
    import orbax.checkpoint as ocp
    from flax import nnx
    model, opt, step = build()
    it = pipeline()
    out = {"mode": mode}
    if mode == "full":
        out["losses"] = train(model, opt, step, it, 0, TOTAL)
    elif mode == "first":
        out["losses"] = train(model, opt, step, it, 0, SAVE_AT)
        shutil.rmtree(CK, ignore_errors=True)
        mngr = ocp.CheckpointManager(CK, options=ocp.CheckpointManagerOptions(max_to_keep=3, enable_async_checkpointing=True))
        t0 = time.perf_counter()
        mngr.save(SAVE_AT, args=ocp.args.Composite(
            model=ocp.args.StandardSave(nnx.state(model)),          # Params and RNG streams
            opt=ocp.args.StandardSave(nnx.state(opt, nnx.Not(nnx.Param))),
            data=grain.checkpoint.CheckpointSave(it),
            meta=ocp.args.JsonSave({"step": SAVE_AT, "cfg_lr": CFG["lr"]})))
        out["save_call_s"] = time.perf_counter() - t0
        mngr.wait_until_finished()
        out["save_total_s"] = time.perf_counter() - t0
        out["iterator_state"] = it.get_state()
        out["model_state_leaves"] = [[".".join(str(getattr(k, "key", k)) for k in p), type(v).__name__]
                                     for p, v in nnx.to_flat_state(nnx.state(model, nnx.RngState))]
        files = []
        for root, _, fs in os.walk(CK):
            for f in fs:
                p = os.path.join(root, f)
                files.append([os.path.relpath(p, CK), os.path.getsize(p)])
        out["files"] = sorted(files)
    else:
        what = mode.split(":")[1]
        mngr = ocp.CheckpointManager(CK)
        s = mngr.latest_step()
        abstract_model = nnx.state(model)                             # target: shapes, dtypes, shardings
        abstract_opt = nnx.state(opt, nnx.Not(nnx.Param))
        r = mngr.restore(s, args=ocp.args.Composite(
            model=ocp.args.StandardRestore(abstract_model),
            opt=ocp.args.StandardRestore(abstract_opt),
            meta=ocp.args.JsonRestore(),
            **({} if what == "no_data" or what == "params_only" else {"data": grain.checkpoint.CheckpointRestore(it)})))
        if what in ("all", "no_data", "no_opt"):
            nnx.update(model, r.model)
        elif what == "no_rng":
            nnx.update(model, nnx.filter_state(r.model, nnx.Param))
        elif what == "params_only":
            nnx.update(model, nnx.filter_state(r.model, nnx.Param))
        if what in ("all", "no_data", "no_rng"):
            nnx.update(opt, r.opt)
        out["restored_step"] = int(s)
        out["meta"] = r.meta
        out["iterator_state"] = it.get_state()
        out["rng_count_after_restore"] = int(model.drop.rngs.count[...])
        out["opt_step_after_restore"] = int(opt.step[...])
        out["losses"] = train(model, opt, step, it, SAVE_AT, TOTAL)
    dump(mode.replace(":", "_"), model, opt, out)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        run(sys.argv[1]); sys.exit(0)
    env = dict(os.environ)
    modes = ["full", "first"] + ["resume:" + v for v in VARIANTS]
    for m in modes:
        t0 = time.time()
        subprocess.run([sys.executable, "-I", "-B", os.path.abspath(__file__), m], check=True, env=env)
        print(m, "done", round(time.time() - t0, 1), "s", flush=True)
    J = {m: json.load(open(os.path.join(RES, m.replace(":", "_") + ".json"))) for m in modes}
    L = {m: np.load(os.path.join(RES, m.replace(":", "_") + ".npz")) for m in modes if m != "first"}
    keys = sorted(L["full"].files, key=lambda k: int(k.split("_")[1]))
    res = {"total": TOTAL, "save_at": SAVE_AT, "versions": T.versions(), "full_losses": J["full"]["losses"],
           "first_losses": J["first"]["losses"], "save_call_s": J["first"]["save_call_s"],
           "save_total_s": J["first"]["save_total_s"], "iterator_state": J["first"]["iterator_state"],
           "rng_leaves": J["first"]["model_state_leaves"], "files": J["first"]["files"],
           "n_arrays": len(keys), "variants": {}}
    for v in VARIANTS:
        m = "resume:" + v
        same = all(np.array_equal(L["full"][k], L[m][k]) for k in keys)
        maxd = max(float(np.abs(L["full"][k].astype(np.float64) - L[m][k].astype(np.float64)).max()) for k in keys[:69])
        joined = J["first"]["losses"] + J[m]["losses"]
        dl = [abs(a - b) for a, b in zip(joined, J["full"]["losses"])]
        res["variants"][v] = {"bitwise_equal": bool(same), "losses_equal": joined == J["full"]["losses"],
                              "param_maxdiff": maxd, "resumed_losses": J[m]["losses"],
                              "first_loss_diff": dl[SAVE_AT], "max_loss_diff": max(dl),
                              "iterator_state": J[m]["iterator_state"], "rng_count": J[m]["rng_count_after_restore"],
                              "opt_step": J[m]["opt_step_after_restore"]}
    res["load"] = T.load_avg()
    T.save("ckpt", res)
    print(json.dumps({v: {k: x for k, x in d.items() if k != "resumed_losses"} for v, d in res["variants"].items()}, indent=1))
