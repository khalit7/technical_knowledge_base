"""Pipeline parallelism written by hand with jax.shard_map, on the running example's 4 blocks.

Mesh ('stage', 'data'). Embedding and head stay outside the pipeline (ordinary jit, batch on 'data'), as MaxText
does (its pipeline wraps only the decoder layers). Inside: each device holds its stage's layers; microbatches flow
from stage to stage with jax.lax.ppermute, one loop iteration ("tick") at a time; jax.grad differentiates through
the loop, so the backward pass runs the schedule in reverse (GPipe: all forwards, then all backwards).

Schedules:
  gpipe    : S stages, L/S consecutive layers each, M microbatches, M + S - 1 ticks
  circular : S stages, R repeats: stage s holds layers s, s+S, s+2S, ...; the last stage sends back to the first;
             M*R + S - 1 ticks of one layer each (MaxText's num_pipeline_repeats; GSPMD paper section 3.3)
Each run: loss and every gradient against one device; collectives in the compiled step; the tick-by-tick schedule.

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B ss_pipe.py
Writes ../out/pipe.json.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ss_common as SC  # noqa: E402
import ss_hlo as SH  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

CFG = C.CFG
L = CFG["n_layers"]


def schedule(S, M, R):
    """[tick][stage] -> (microbatch, repeat) or None (bubble). Stage s at tick t works on item i = t - s."""
    ticks = M * R + S - 1
    out = []
    for t in range(ticks):
        row = []
        for s in range(S):
            i = t - s
            row.append([i % M, i // M] if 0 <= i < M * R else None)
        out.append(row)
    return out


def make_pipeline(S, M, R, mesh):
    lps = L // (S * R)                               # consecutive layers per stage per repeat
    ticks = M * R + S - 1
    rot = [(j, (j + 1) % S) for j in range(S)]       # stage j sends to j+1; the last sends back to 0

    def stage_fn(layers, x):
        """Per device. layers: pytree with leading axis R*lps (this stage's layers, repeat-major);
        x: [M, mb, T, D] all microbatches of this device's data shard."""
        s = jax.lax.axis_index("stage")
        state = jnp.zeros_like(x[0])
        circ = jnp.zeros_like(x)                     # stage 0's store of activations coming back for the next repeat
        outs = jnp.zeros_like(x)
        for t in range(ticks):
            i = t - s
            valid = (i >= 0) & (i < M * R)
            ic = jnp.clip(i, 0, M * R - 1)
            m, r = ic % M, ic // M
            first_in = jnp.where(r == 0, x[m], circ[m])
            inp = jnp.where(s == 0, first_in, state)
            h = inp
            for j in range(lps):
                p = jax.tree.map(lambda a: a[r * lps + j], layers)
                h = MJ.block(p, h, CFG)
            h = jnp.where(valid, h, 0.0)               # bubble ticks compute on zeros; their result is dropped
            last = s == S - 1
            outs = jnp.where(last & valid & (r == R - 1), outs.at[m].set(h), outs)
            recv = jax.lax.ppermute(h, "stage", rot)
            # stage 0 keeps what the last stage sent back (an item of repeat r < R-1); other stages pass it on
            i_last = t - (S - 1)
            if R > 1 and 0 <= i_last < M * R and i_last // M < R - 1:
                circ = jnp.where(s == 0, circ.at[i_last % M].set(recv), circ)
            state = recv
        return jax.lax.psum(jnp.where(s == S - 1, outs, 0.0), "stage")   # hand the outputs to every stage

    # layer order on the stacked axis: stage-major so each stage's shard holds its own layers (repeat-major inside)
    order = [r * S * lps + s * lps + j for s in range(S) for r in range(R) for j in range(lps)]
    sm = jax.shard_map(stage_fn, mesh=mesh, in_specs=(P("stage"), P(None, "data")), out_specs=P(None, "data"),
                       check_vma=False)
    return sm, order, ticks


def loss_pp(outer, stacked, idx, y, S, M, R, mesh, strided=True):
    """outer: embeddings, final LayerNorm and head (replicated); stacked: the blocks stacked in pipeline order and
    sharded P('stage') on the stacked axis, so each stage stores only its own layers."""
    sm, _, _ = make_pipeline(S, M, R, mesh)
    B, T = idx.shape
    h = outer["tok_emb"][idx] + outer["pos_emb"][:T]
    if strided:   # microbatch m = rows m, m+M, m+2M, ...: every device keeps its own rows (no communication)
        h = h.reshape(B // M, M, T, -1).swapaxes(0, 1)
        h = sm(stacked, h).swapaxes(0, 1).reshape(B, T, -1)
    else:         # microbatch m = rows m*B/M ... (m+1)*B/M - 1: contiguous blocks, which cut across the data shards
        h = h.reshape(M, B // M, T, -1)
        h = sm(stacked, h).reshape(B, T, -1)
    logits = MJ.layer_norm(outer["ln_f"], h, CFG["ln_eps"]) @ outer["head"]["w"]
    return optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()


def colls(comp):
    out = {}
    for ins in SH.instructions(comp.as_text()):
        k = ins["op"].replace("-start", "")
        if k in SC.H.COLL:
            b, _ = SC.H.shape_bytes(ins["type"])
            c = out.setdefault(k, {"count": 0, "bytes": 0, "where": {}})
            c["count"] += 1
            c["bytes"] += b
            w = (ins["file"] or "?") + ":" + str(ins["line"])
            c["where"][w] = c["where"].get(w, 0) + 1
    return out


RUNS = [("gpipe_contiguous", 4, 4, 1), ("gpipe", 4, 4, 1), ("gpipe", 4, 8, 1), ("gpipe", 2, 4, 1), ("circular", 2, 4, 2), ("circular", 2, 2, 2)]


def main():
    print("load", os.getloadavg(), flush=True)
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, CFG)
    x0, y0 = C.batch(0)
    ref_loss, ref_g = jax.jit(jax.value_and_grad(lambda p: MJ.loss_fn(p, x0, y0, CFG)))(params)
    out = {"what": "Hand-written pipeline (jax.shard_map + ppermute) over the running example's 4 blocks, batch 0, "
                   "8 simulated CPU devices, jax " + jax.__version__, "one_device_loss": float(ref_loss), "runs": []}
    for kind, S, M, R in RUNS:
        mesh = jax.make_mesh((S, 8 // S), ("stage", "data"), axis_types=(AxisType.Auto,) * 2)
        _, order, _ = make_pipeline(S, M, R, mesh)
        outer = {k: v for k, v in params.items() if k != "blocks"}
        stacked = jax.tree.map(lambda *xs: jnp.stack(xs), *[params["blocks"][k] for k in order])
        stacked = jax.device_put(stacked, NamedSharding(mesh, P("stage")))
        outer = jax.device_put(outer, NamedSharding(mesh, P()))
        f = jax.jit(jax.value_and_grad(lambda o, st, x, y: loss_pp(o, st, x, y, S, M, R, mesh, kind != "gpipe_contiguous"), argnums=(0, 1)))
        xs = NamedSharding(mesh, P("data", None))
        x, y = jax.device_put(x0, xs), jax.device_put(y0, xs)
        comp = f.lower(outer, stacked, x, y).compile()
        loss, (go, gs) = f(outer, stacked, x, y)
        gblocks = [None] * L
        for pos, k in enumerate(order):
            gblocks[k] = jax.tree.map(lambda a: a[pos], gs)
        g = dict(go, blocks=gblocks)
        gerr = max(float(np.abs(np.asarray(a) - np.asarray(b)).max()) for a, b in zip(jax.tree.leaves(g), jax.tree.leaves(ref_g)))
        sch = schedule(S, M, R)
        ticks = len(sch)
        busy = sum(1 for row in sch for c in row if c is not None)
        lps = L // (S * R)
        m = comp.memory_analysis()
        rec = {"kind": kind, "S": S, "M": M, "R": R, "mesh": [S, 8 // S], "layers_per_stage_per_repeat": lps,
               "stage_layers": [order[s * R * lps:(s + 1) * R * lps] for s in range(S)],
               "ticks": ticks, "bubble_fraction_forward": 1 - busy / (ticks * S),
               "formula_bubble": (S - 1) / (M * R + S - 1),
               "loss": float(loss), "abs_loss_diff": abs(float(loss) - float(ref_loss)), "grad_max_abs_diff": gerr,
               "collectives": colls(comp), "temp_bytes_per_device": int(m.temp_size_in_bytes), "schedule": sch}
        print(kind, S, M, R, "ticks", ticks, "bubble", round(rec["bubble_fraction_forward"], 3), "loss diff", rec["abs_loss_diff"],
              "grad diff", gerr, rec["collectives"], flush=True)
        out["runs"].append(rec)
    SC.dump("pipe.json", out)


if __name__ == "__main__":
    main()
