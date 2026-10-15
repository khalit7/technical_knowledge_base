"""The parallelism layouts on two sizes of the same model, 8 simulated CPU devices: the running example (826,368
parameters, the root Sharding lab's setup) and a scaled-up config (d_model 512, 8 layers, 8 heads, MLP 2048,
context 256, batch 16 x 256 = 4,096 tokens, about 25.4M parameters, seeded init). For each layout: the collectives
in the compiled train step (kind, bytes, group size, forward or backward), memory_analysis per device, parameter and
optimizer bytes per device, and the loss over 3 steps against one device. ss_formulas.py then predicts the same
bytes from the textbook formulas (../out/scale.json holds both).

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B ss_scale.py          # about 5 to 10 minutes on a loaded machine
"""
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ss_common as SC  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

H = SC.H
SMALL = dict(C.CFG)
BIG = dict(C.CFG, d_model=512, n_layers=8, n_heads=8, d_ff=2048, ctx=256, batch=16)
STEPS = 3

# id, label, mesh shape, axis names, batch axes, param rule
LAYOUTS = [
    ("single", "One device", None, None, None, None),
    ("dp", "Data parallel (8)", (8,), ("data",), ("data",), "rep"),
    ("fsdp", "FSDP (8)", (8,), ("data",), ("data",), "fsdp:data"),
    ("hsdp", "HSDP: 2 replicas x FSDP 4", (2, 4), ("replica", "fsdp"), ("replica", "fsdp"), "fsdp:fsdp"),
    ("tp", "Data 2 x tensor 4", (2, 4), ("data", "model"), ("data",), "tp"),
    ("tp8", "Tensor parallel 8", (1, 8), ("data", "model"), ("data",), "tp"),
    ("fsdp_tp", "FSDP 2 x tensor 4", (2, 4), ("data", "model"), ("data",), "fsdp_tp"),
]


def keys_of(path):
    return [k for k in (getattr(q, "key", getattr(q, "idx", None)) for q in path) if isinstance(k, str)]


def megatron(names):
    if len(names) >= 2 and names[-2] in ("wq", "wk", "wv", "fc1"):
        return P(None, "model") if names[-1] == "w" else P("model")
    if len(names) >= 2 and names[-2] in ("wo", "fc2"):
        return P("model", None) if names[-1] == "w" else P()
    return None


def spec(rule, names, shape, mesh):
    if rule == "rep" or len(shape) == 0:
        return P()
    if rule.startswith("fsdp:"):
        ax = rule.split(":")[1]
        n = mesh.shape[ax]
        for i, d in enumerate(shape):
            if d % n == 0:
                s = [None] * len(shape)
                s[i] = ax
                return P(*s)
        return P()
    tp = megatron(names)
    if rule == "tp":
        return tp if tp is not None else P()
    if rule == "fsdp_tp":
        s = list(tp) + [None] * (len(shape) - len(tp)) if tp is not None else [None] * len(shape)
        for i, d in enumerate(shape):
            if s[i] is None and d % mesh.shape["data"] == 0:
                s[i] = "data"
                break
        return P(*s)
    raise ValueError(rule)


def loss_c(params, idx, y, cfg, resid):
    wsc = (lambda h: h) if resid is None else (lambda h: jax.lax.with_sharding_constraint(h, resid))
    T = idx.shape[1]
    h = wsc(params["tok_emb"][idx] + params["pos_emb"][:T])
    for p in params["blocks"]:
        h = wsc(MJ.block(p, h, cfg))
    logits = MJ.layer_norm(params["ln_f"], h, cfg["ln_eps"]) @ params["head"]["w"]
    return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()


def batches(cfg, n):
    if cfg is SMALL:
        return [C.batch(i) for i in range(n)]
    tr, _ = C.tokens()
    rng = np.random.default_rng(7)
    out = []
    for _ in range(n):
        o = rng.integers(0, len(tr) - cfg["ctx"] - 1, size=cfg["batch"])
        seq = tr[o[:, None] + np.arange(cfg["ctx"] + 1)[None, :]].astype(np.int32)
        out.append((seq[:, :-1], seq[:, 1:]))
    return out


def init(cfg):
    if cfg is SMALL:
        return MJ.from_torch(dict(np.load(C.path("data", "init_torch.npz"))), cfg)
    return MJ.init_params(cfg, jax.random.key(0))


def shard_bytes(tree, shardings):
    tot = 0
    for a, s in zip(jax.tree.leaves(tree), jax.tree.leaves(shardings, is_leaf=lambda x: isinstance(x, NamedSharding))):
        tot += math.prod(s.shard_shape(a.shape) if isinstance(s, NamedSharding) else a.shape) * a.dtype.itemsize
    return tot


def run(cfg, lay):
    lid, label, mshape, names, baxes, rule = lay
    tx = MJ.make_optimizer(cfg, C.lr_at)
    params0 = init(cfg)
    opt0 = tx.init(params0)
    if mshape is None:
        dev = jax.sharding.SingleDeviceSharding(jax.devices()[0])
        p_sh = jax.tree.map(lambda _: dev, params0)
        o_sh = jax.tree.map(lambda _: dev, opt0)
        x_sh = rep = dev
        resid = None
    else:
        mesh = jax.make_mesh(mshape, names, axis_types=(AxisType.Auto,) * len(names))
        mk = lambda pth, a: NamedSharding(mesh, spec(rule, keys_of(pth), a.shape, mesh))
        p_sh = jax.tree_util.tree_map_with_path(mk, params0)
        o_sh = jax.tree_util.tree_map_with_path(mk, opt0)
        bax = baxes if len(baxes) > 1 else baxes[0]
        x_sh = NamedSharding(mesh, P(bax, None))
        resid = NamedSharding(mesh, P(bax, None, None))
        rep = NamedSharding(mesh, P())

    def step(params, opt_state, x, y):
        loss, grads = jax.value_and_grad(loss_c)(params, x, y, cfg, resid)
        updates, opt_state = tx.update(grads, opt_state, params)
        return optax.apply_updates(params, updates), opt_state, loss

    f = jax.jit(step, in_shardings=(p_sh, o_sh, x_sh, x_sh), out_shardings=(p_sh, o_sh, rep), donate_argnums=(0, 1))
    params, opt = jax.device_put(params0, p_sh), jax.device_put(opt0, o_sh)
    bs = batches(cfg, STEPS)
    t0 = time.process_time(), time.perf_counter()
    comp = f.lower(params, opt, jax.device_put(bs[0][0], x_sh), jax.device_put(bs[0][1], x_sh)).compile()
    t_comp = (time.process_time() - t0[0], time.perf_counter() - t0[1])
    n_dev = 1 if mshape is None else math.prod(mshape)
    colls = H.collectives(comp.as_text(), n_dev)
    losses, times = [], []
    for x, y in bs:
        t = time.perf_counter()
        params, opt, loss = f(params, opt, jax.device_put(x, x_sh), jax.device_put(y, x_sh))
        losses.append(float(loss))
        times.append(time.perf_counter() - t)
    grouped = {}
    for c in colls:
        k = (c["kind"], c["phase"], c["group"] or 0)
        g = grouped.setdefault(k, [0, 0])
        g[0] += 1
        g[1] += c["logical"]
    return {"id": lid, "label": label, "mesh": list(mshape) if mshape else [1], "axes": list(names) if names else [],
            "collectives": [[k[0], k[1], k[2], v[0], v[1]] for k, v in sorted(grouped.items())],
            "summary": H.summarise(colls), "memory": H.mem(comp),
            "param_bytes_per_device": shard_bytes(params0, p_sh), "opt_bytes_per_device": shard_bytes(opt0, o_sh),
            "losses": losses, "compile_cpu_s": round(t_comp[0], 1), "compile_wall_s": round(t_comp[1], 1),
            "step_wall_s": [round(t, 2) for t in times]}


def main():
    print("load", os.getloadavg(), flush=True)
    out = {"what": "Train step (forward, backward, clip, AdamW; params and optimizer state donated) under seven layouts, "
                   "8 simulated CPU devices, jax " + jax.__version__ + "; collectives parsed from compile().as_text() "
                   "with the root Sharding lab's parser (logical bytes: all-gather output, reduce-scatter input, all-reduce operand).",
           "timing_note": "compile and step times measured on Apple M1 Pro (CPU), shared machine (1-minute load 25 to 50), "
                          "4 threads, nice 15, 8 simulated devices: not representative of any accelerator.",
           "configs": {}}
    for name, cfg in (("small", SMALL), ("big", BIG)):
        recs = []
        for lay in LAYOUTS:
            r = run(cfg, lay)
            recs.append(r)
            print(name, r["id"], {k: (v["count"], v["bytes"]) for k, v in r["summary"].items()}, "temp", r["memory"]["temp_size_in_bytes"],
                  "losses", r["losses"], "step", r["step_wall_s"], flush=True)
        ref = recs[0]["losses"]
        for r in recs:
            r["max_abs_loss_diff_vs_single"] = max(abs(a - b) for a, b in zip(r["losses"], ref))
        nparam = sum(int(np.prod(a.shape)) for a in jax.tree.leaves(init(cfg)))
        out["configs"][name] = {"cfg": {k: cfg[k] for k in ("vocab", "d_model", "n_layers", "n_heads", "d_ff", "ctx", "batch")},
                                "params": nparam, "layouts": recs}
        SC.dump("scale.json", out)
    print("load end", os.getloadavg(), flush=True)


if __name__ == "__main__":
    main()
