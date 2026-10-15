"""Expert parallelism on a tiny mixture-of-experts layer, 8 experts on 8 simulated devices (one expert each).

Tokens: the running example's batch 0 after the embedding and block 0's second LayerNorm ([4096, 128]), 512 per
device. Router [128, 8] and experts (MLP 128 -> 256 -> 128, exact GELU) are new weights, seeded (illustrative: not
trained). Routing top-1 (Switch Transformer) or top-2 (GShard, Mixtral), with a capacity C per expert per device
(Switch-style groups: each device routes its own 512 tokens); tokens past capacity are dropped (output 0 from the
layer, the residual carries them).

  hand  : jax.shard_map: route locally, all_to_all to the experts' devices, compute, all_to_all back, combine
  auto  : the same einsum dispatch written for one device, groups and experts annotated P('expert'), one
          with_sharding_constraint on the dispatched tensor; the compiler inserts the communication (GShard's way)
Both checked against a one-device reference (values and gradients). Writes ../out/moe.json.

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B ss_moe.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ss_common as SC  # noqa: E402
import ss_hlo as SH  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

E, D, F, G = 8, 128, 256, 8                   # experts, model width, expert hidden, groups (= devices)
mesh = jax.make_mesh((E,), ("expert",), axis_types=(AxisType.Auto,))


def init(key):
    k1, k2, k3 = jax.random.split(key, 3)
    return {"router": jax.random.normal(k1, (D, E)) / math.sqrt(D),
            "w1": jax.random.normal(k2, (E, D, F)) * 0.02, "w2": jax.random.normal(k3, (E, F, D)) * 0.02}


def route(x, wr, k, cap):
    """x [t, D] -> combine weights [t, E, C] (gate value where token goes to slot c of expert e) and dispatch mask.
    Slots are given in token order, first choices before second choices (as GShard and Switch do)."""
    logits = x @ wr
    probs = jax.nn.softmax(logits, -1)
    gate, idx = jax.lax.top_k(probs, k)                       # [t, k]
    if k > 1:
        gate = gate / gate.sum(-1, keepdims=True)            # renormalise over the chosen experts
    comb = jnp.zeros((x.shape[0], E, cap), x.dtype)
    used = jnp.zeros((E,), jnp.int32)
    for j in range(k):
        oh = jax.nn.one_hot(idx[:, j], E, dtype=jnp.int32)   # [t, E]
        pos = jnp.cumsum(oh, 0) - 1 + used                   # slot each token would take in its expert
        keep = (pos < cap) & (oh > 0)
        used = used + oh.sum(0)
        slot = jax.nn.one_hot(jnp.where(keep, pos, cap), cap + 1, dtype=x.dtype)[..., :cap]   # [t, E, C]
        comb = comb + gate[:, j, None, None] * slot * keep[..., None]
    return comb, (comb > 0).astype(x.dtype), idx


def expert(w1, w2, h):
    return jax.nn.gelu(h @ w1, approximate=False) @ w2


def moe_reference(params, xg, k, cap):
    """One device: xg [G, t, D]; each group routed on its own; every expert applied to its slots."""
    def group(x):
        comb, disp, _ = route(x, params["router"], k, cap)
        slots = jnp.einsum("tec,td->ecd", disp, x)             # [E, C, D]
        y = jax.vmap(expert)(params["w1"], params["w2"], slots)
        return jnp.einsum("tec,ecd->td", comb, y)
    return jax.vmap(group)(xg)


def moe_hand(params, xg, k, cap):
    def per_device(router, w1, w2, x):                       # x [1, t, D]; w1 [1, D, F]: this device's expert
        x = x[0]
        comb, disp, _ = route(x, router, k, cap)
        slots = jnp.einsum("tec,td->ecd", disp, x)            # [E, C, D]: what this device sends to each expert
        recv = jax.lax.all_to_all(slots, "expert", split_axis=0, concat_axis=0, tiled=True)   # [G, C, D] for my expert
        y = expert(w1[0], w2[0], recv)
        back = jax.lax.all_to_all(y, "expert", split_axis=0, concat_axis=0, tiled=True)       # [E, C, D] my tokens' outputs
        return jnp.einsum("tec,ecd->td", comb, back)[None]
    f = jax.shard_map(per_device, mesh=mesh,
                      in_specs=(P(), P("expert"), P("expert"), P("expert")), out_specs=P("expert"), check_vma=False)
    return f(params["router"], params["w1"], params["w2"], xg)


def moe_auto(params, xg, k, cap):
    """moe_reference with the dispatched tensor constrained to live with its expert."""
    def group(x):
        comb, disp, _ = route(x, params["router"], k, cap)
        return comb, disp
    comb, disp = jax.vmap(group)(xg)                          # [G, t, E, C]
    slots = jnp.einsum("gtec,gtd->egcd", disp, xg)
    slots = jax.lax.with_sharding_constraint(slots, NamedSharding(mesh, P("expert")))
    y = jax.vmap(lambda w1, w2, s: expert(w1, w2, s))(params["w1"], params["w2"], slots)   # [E, G, C, D]
    y = jax.lax.with_sharding_constraint(y, NamedSharding(mesh, P("expert")))
    return jnp.einsum("gtec,egcd->gtd", comb, y)


def colls(comp):
    out = {}
    for ins in SH.instructions(comp.as_text()):
        kd = ins["op"].replace("-start", "")
        if kd in SC.H.COLL:
            b, _ = SC.H.shape_bytes(ins["type"])
            c = out.setdefault(kd, {"count": 0, "bytes": 0})
            c["count"] += 1
            c["bytes"] += b
    return out


def main():
    print("load", os.getloadavg(), flush=True)
    cfg = C.CFG
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    pm = MJ.from_torch(sd, cfg)
    x0, _ = C.batch(0)
    h = pm["tok_emb"][x0] + pm["pos_emb"][:x0.shape[1]]
    h = MJ.block(pm["blocks"][0], h, cfg)
    x = MJ.layer_norm(pm["blocks"][1]["ln2"], h, cfg["ln_eps"]).reshape(G, -1, D)   # [8, 512, 128]
    t = x.shape[1]
    params = init(jax.random.key(0))
    psh = {"router": NamedSharding(mesh, P()), "w1": NamedSharding(mesh, P("expert")), "w2": NamedSharding(mesh, P("expert"))}
    xsh = NamedSharding(mesh, P("expert"))
    pd, xd = jax.device_put(params, psh), jax.device_put(x, xsh)
    cot = jnp.asarray(np.random.default_rng(2).normal(size=x.shape).astype(np.float32))
    out = {"what": "Tiny MoE layer (8 experts, MLP 128-256-128, seeded weights, illustrative) on the running example's "
                   "tokens after block 0 (batch 0, 4,096 tokens, 512 per device), 8 simulated CPU devices, jax " + jax.__version__,
           "tokens_per_device": t, "runs": []}
    for k in (1, 2):
        for cf in (1.0, 1.25, 2.0):
            cap = int(math.ceil(cf * t * k / E))
            ref = jax.jit(lambda p, x: moe_reference(p, x, k, cap))(params, x)
            gref = jax.jit(jax.grad(lambda p, x: jnp.sum(moe_reference(p, x, k, cap) * cot)))(params, x)
            # routing statistics (identical in all three implementations: same route())
            idx = np.asarray(jax.jit(jax.vmap(lambda xx: route(xx, params["router"], k, cap)[2]))(x))  # [G, t, k]
            disp = np.asarray(jax.jit(jax.vmap(lambda xx: route(xx, params["router"], k, cap)[1]))(x))  # [G, t, E, C]
            wanted = np.zeros((G, E), int)
            for g in range(G):
                for j in range(k):
                    np.add.at(wanted[g], idx[g, :, j], 1)
            kept = disp.sum(axis=(1, 3)).astype(int)                                  # [G, E]
            rec = {"k": k, "capacity_factor": cf, "capacity": cap, "wanted": wanted.tolist(), "kept": kept.tolist(),
                   "dropped": int(wanted.sum() - kept.sum()), "assignments": int(wanted.sum()),
                   "first_tokens": [[[int(v) for v in idx[g, i]] + [int(disp[g, i].sum())] for i in range(6)] for g in range(G)]}
            for name, fn in (("hand", moe_hand), ("auto", moe_auto)):
                jf = jax.jit(lambda p, x, fn=fn: fn(p, x, k, cap), in_shardings=(psh, xsh), out_shardings=xsh)
                comp = jf.lower(pd, xd).compile()
                y = np.asarray(jf(pd, xd))
                gf = jax.jit(jax.grad(lambda p, x, fn=fn: jnp.sum(fn(p, x, k, cap) * cot)), in_shardings=(psh, xsh))
                gcomp = gf.lower(pd, xd).compile()
                gv = gf(pd, xd)
                rec[name] = {"max_abs_err": float(np.abs(y - np.asarray(ref)).max()),
                             "grad_max_abs_err": float(max(np.abs(np.asarray(a) - np.asarray(b)).max()
                                                           for a, b in zip(jax.tree.leaves(gv), jax.tree.leaves(gref)))),
                             "collectives": colls(comp), "grad_collectives": colls(gcomp),
                             "temp_bytes_per_device": int(comp.memory_analysis().temp_size_in_bytes)}
            print(k, cf, cap, "dropped", rec["dropped"], "/", rec["assignments"], "hand", rec["hand"]["collectives"],
                  rec["hand"]["max_abs_err"], "auto", rec["auto"]["collectives"], rec["auto"]["max_abs_err"], flush=True)
            out["runs"].append(rec)
    SC.dump("moe.json", out)


if __name__ == "__main__":
    main()
