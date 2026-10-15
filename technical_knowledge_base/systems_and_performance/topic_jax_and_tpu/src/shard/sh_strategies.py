"""Sharding lab: the running example's full train step (forward, backward, clip, AdamW) under six layouts on
8 simulated CPU devices. For each: the collectives XLA inserted (counted from the compiled HLO) and their bytes,
memory_analysis per device, parameter and optimizer-state bytes per device, and the loss over 20 steps against
one device. Also recompiles every layout with the older GSPMD partitioner (Shardy is the default) and compares.

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B sh_strategies.py
Writes out/strategies.json (small, embedded in the page) and, in $JX_SCRATCH/shard/, the full optimised HLO
of every layout (large; not in the repo).
"""
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sh_common as H  # noqa: E402  (puts src/data on sys.path)

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

N_STEPS = int(os.environ.get("SH_STEPS", "20"))
CFG = C.CFG
assert len(jax.devices()) == 8, "run with XLA_FLAGS=--xla_force_host_platform_device_count=8"
AUTO = AxisType.Auto
HLO_DIR = C.path("shard")
os.makedirs(HLO_DIR, exist_ok=True)


def keys_of(path):
    return tuple(getattr(k, "key", getattr(k, "idx", None)) for k in path)


def megatron(ks):
    """Megatron-style tensor parallel spec for a parameter path (on the 'model' axis), or None if replicated."""
    names = [k for k in ks if isinstance(k, str)]
    if len(names) >= 2 and names[-2] in ("wq", "wk", "wv", "fc1"):
        return P(None, "model") if names[-1] == "w" else P("model")       # column split: outputs (heads) split
    if len(names) >= 2 and names[-2] in ("wo", "fc2"):
        return P("model", None) if names[-1] == "w" else P()             # row split: inputs split, bias replicated
    return None


def fsdp_dim(shape, n):
    """FSDP: split the first dimension divisible by n (the largest-first rule would pick the same here)."""
    for i, d in enumerate(shape):
        if d % n == 0:
            return i
    return None


def spec_for(strategy, ks, shape):
    if len(shape) == 0:
        return P()
    if strategy in ("dp", "seq", "single"):
        return P()
    if strategy in ("fsdp", "fsdp_naive"):
        i = fsdp_dim(shape, 8)
        s = [None] * len(shape)
        if i is not None:
            s[i] = "data"
        return P(*s)
    tp = megatron(ks)
    if strategy == "tp":
        return tp if tp is not None else P()
    if strategy == "fsdp_tp":
        if tp is not None:
            s = list(tp) + [None] * (len(shape) - len(tp))
            for i, d in enumerate(shape):                 # put 'data' on the dimension TP left unsplit
                if s[i] is None and d % 2 == 0:
                    s[i] = "data"
                    break
            return P(*s)
        i = fsdp_dim(shape, 2)
        s = [None] * len(shape)
        if i is not None:
            s[i] = "data"
        return P(*s)
    raise ValueError(strategy)


STRATS = [
    # id, label, mesh shape, axis names, batch spec, residual-stream constraint (None: let the partitioner choose)
    ("single", "One device", None, None, None, None),
    ("dp", "Data parallel", (8,), ("data",), P("data", None), None),
    ("fsdp_naive", "FSDP, weights annotated only", (8,), ("data",), P("data", None), None),
    ("fsdp", "FSDP (ZeRO-3 style)", (8,), ("data",), P("data", None), P("data", None, None)),
    ("tp", "Data x tensor parallel", (2, 4), ("data", "model"), P("data", None), P("data", None, None)),
    ("fsdp_tp", "FSDP x tensor parallel", (2, 4), ("data", "model"), P("data", None), P("data", None, None)),
    ("seq", "Sequence sharded", (8,), ("data",), P(None, "data"), P(None, "data", None)),
]


def loss_c(params, idx, y, cfg, resid):
    """MJ.loss_fn with an optional with_sharding_constraint on the residual stream after the embedding
    and after every block (the 'annotate a few intermediates' of GSPMD). resid=None is exactly MJ.loss_fn."""
    wsc = (lambda h: h) if resid is None else (lambda h: jax.lax.with_sharding_constraint(h, resid))
    T = idx.shape[1]
    h = wsc(params["tok_emb"][idx] + params["pos_emb"][:T])
    for p in params["blocks"]:
        h = wsc(MJ.block(p, h, cfg))
    logits = MJ.layer_norm(params["ln_f"], h, cfg["ln_eps"]) @ params["head"]["w"]
    return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()


def shard_bytes(tree, shardings):
    tot = 0
    for a, s in zip(jax.tree.leaves(tree), jax.tree.leaves(shardings, is_leaf=lambda x: isinstance(x, NamedSharding))):
        shp = s.shard_shape(a.shape) if isinstance(s, NamedSharding) else a.shape
        tot += math.prod(shp) * a.dtype.itemsize
    return tot


def build(strategy, mesh_shape, names, bspec, cspec):
    tx = MJ.make_optimizer(CFG, C.lr_at)
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params0 = MJ.from_torch(sd, CFG)
    opt0 = tx.init(params0)

    resid = None

    def step(params, opt_state, x, y):
        loss, grads = jax.value_and_grad(loss_c)(params, x, y, CFG, resid)
        updates, opt_state = tx.update(grads, opt_state, params)
        return optax.apply_updates(params, updates), opt_state, loss, optax.global_norm(grads)

    if strategy == "single":
        dev = jax.devices()[0]
        sh = jax.sharding.SingleDeviceSharding(dev)
        p_sh = jax.tree.map(lambda _: sh, params0)
        o_sh = jax.tree.map(lambda _: sh, opt0)
        x_sh = rep = sh
    else:
        mesh = jax.make_mesh(mesh_shape, names, axis_types=(AUTO,) * len(names))
        p_sh = jax.tree_util.tree_map_with_path(lambda pth, a: NamedSharding(mesh, spec_for(strategy, keys_of(pth), a.shape)), params0)
        o_sh = jax.tree_util.tree_map_with_path(lambda pth, a: NamedSharding(mesh, spec_for(strategy, keys_of(pth), a.shape)), opt0)
        x_sh = NamedSharding(mesh, bspec)
        resid = NamedSharding(mesh, cspec) if cspec is not None else None
        rep = NamedSharding(mesh, P())
    f = jax.jit(step, in_shardings=(p_sh, o_sh, x_sh, x_sh), out_shardings=(p_sh, o_sh, rep, rep),
                donate_argnums=(0, 1))
    params = jax.device_put(params0, p_sh)
    opt = jax.device_put(opt0, o_sh)
    return f, params, opt, p_sh, o_sh, x_sh


def run(sid, label, mesh_shape, names, bspec, cspec, shardy=True):
    jax.config.update("jax_use_shardy_partitioner", shardy)
    f, params, opt, p_sh, o_sh, x_sh = build(sid, mesh_shape, names, bspec, cspec)
    x0, y0 = C.batch(0)
    t0 = time.perf_counter()
    lowered = f.lower(params, opt, jax.device_put(x0, x_sh), jax.device_put(y0, x_sh))
    comp = lowered.compile()
    t_compile = time.perf_counter() - t0
    hlo = comp.as_text()
    n_dev = 1 if mesh_shape is None else math.prod(mesh_shape)
    colls = H.collectives(hlo, n_dev)
    rec = {"id": sid, "label": label, "mesh": list(mesh_shape) if mesh_shape else [1],
           "axes": list(names) if names else [], "batch_spec": str(bspec) if bspec else "one device",
           "resid_constraint": str(cspec) if cspec is not None else None,
           "partitioner": "shardy" if shardy else "gspmd",
           "collectives": colls, "summary": H.summarise(colls), "memory": H.mem(comp),
           "param_bytes_per_device": shard_bytes(params, p_sh), "opt_bytes_per_device": shard_bytes(opt, o_sh),
           "hlo_lines": hlo.count("\n"), "compile_s": round(t_compile, 2)}
    if not shardy:
        return rec
    with open(os.path.join(HLO_DIR, f"{sid}.opt.hlo.txt"), "w") as fh:
        fh.write(H.scrub(hlo))
    # parameter specs (one example of each kind) for the page
    names_specs = {}
    for pth, s in jax.tree_util.tree_flatten_with_path(p_sh, is_leaf=lambda x: isinstance(x, (NamedSharding, jax.sharding.SingleDeviceSharding)))[0]:
        k = ".".join(str(x) for x in keys_of(pth))
        if k.startswith("blocks.") and not k.startswith("blocks.0."):
            continue
        names_specs[k] = str(s.spec) if isinstance(s, NamedSharding) else "one device"
    rec["param_specs"] = names_specs
    # train N_STEPS from the shared initial weights on the shared batches
    losses, gnorms, times = [], [], []
    for i in range(N_STEPS):
        x, y = C.batch(i)
        t = time.perf_counter()
        params, opt, loss, gn = f(params, opt, jax.device_put(x, x_sh), jax.device_put(y, x_sh))
        loss = float(loss)
        times.append(time.perf_counter() - t)
        losses.append(loss)
        gnorms.append(float(gn))
    rec["losses"] = losses
    rec["gnorms"] = gnorms
    rec["step_s_median"] = round(float(np.median(times[2:])), 4)
    # where the final weights live: per-device shard shape of a few parameters
    rec["shard_shapes"] = {k: list(v) for k, v in {
        "blocks.0.mlp.fc1.w": params["blocks"][0]["mlp"]["fc1"]["w"].sharding.shard_shape((128, 512)),
        "blocks.0.mlp.fc2.w": params["blocks"][0]["mlp"]["fc2"]["w"].sharding.shard_shape((512, 128)),
        "blocks.0.attn.wq.w": params["blocks"][0]["attn"]["wq"]["w"].sharding.shard_shape((128, 128)),
        "tok_emb": params["tok_emb"].sharding.shard_shape((65, 128)),
    }.items()}
    # final weights against one device's final weights (filled in by main)
    rec["_final"] = jax.tree.map(np.asarray, params)
    return rec


def grouped(colls):
    """[kind, phase, group, bytes, count] rows: the compact form embedded in the page."""
    cnt = {}
    for c in colls:
        k = (c["kind"], c["phase"], c["group"] or 0, c["logical"])
        cnt[k] = cnt.get(k, 0) + 1
    return [list(k) + [v] for k, v in sorted(cnt.items(), key=lambda kv: (kv[0][0], kv[0][1], -kv[0][3]))]


def main():
    print("load", os.getloadavg())
    recs, finals = [], {}
    for s in STRATS:
        r = run(*s)
        finals[r["id"]] = r.pop("_final")
        print(r["id"], {k: v["count"] for k, v in r["summary"].items()}, "loss0", r["losses"][0], "loss_last", r["losses"][-1],
              "param MB/dev", r["param_bytes_per_device"] / 1e6, r["memory"])
        recs.append(r)
    ref = recs[0]
    for r in recs:
        r["grouped"] = grouped(r["collectives"])
        r["max_abs_loss_diff_vs_single"] = float(max(abs(a - b) for a, b in zip(r["losses"], ref["losses"])))
        r["max_abs_weight_diff_vs_single"] = float(max(np.abs(a - b).max() for a, b in
                                                        zip(jax.tree.leaves(finals[r["id"]]), jax.tree.leaves(finals["single"]))))
    # same layouts with the older GSPMD partitioner
    gspmd = []
    for s in STRATS[1:]:
        g = run(*s, shardy=False)
        gspmd.append({"id": g["id"], "summary": g["summary"], "memory": g["memory"],
                      "grouped": grouped(g["collectives"]),
                      "kinds": sorted((c["kind"], c["logical"], c["group"] or 0) for c in g["collectives"])})
        print("gspmd", g["id"], {k: v["count"] for k, v in g["summary"].items()})
    jax.config.update("jax_use_shardy_partitioner", True)
    for g in gspmd:
        r = next(x for x in recs if x["id"] == g["id"])
        g["same_as_shardy"] = g["kinds"] == sorted((c["kind"], c["logical"], c["group"] or 0) for c in r["collectives"])
        del g["kinds"]
    H.dump("strategies.json", {
        "what": "Running example train step (value_and_grad + clip + AdamW, donated params and optimizer state) "
                "on 8 simulated CPU devices, jax 0.11.2; collectives parsed from compile().as_text().",
        "steps": N_STEPS, "jax": jax.__version__, "params_total": int(sum(a.size for a in jax.tree.leaves(finals["single"]))),
        "strategies": recs, "gspmd": gspmd,
        "timing_note": "step_s_median and compile_s measured on Apple M1 Pro (CPU), shared machine, low priority, "
                       "8 simulated devices on one CPU: not representative of real accelerators."})


if __name__ == "__main__":
    main()
