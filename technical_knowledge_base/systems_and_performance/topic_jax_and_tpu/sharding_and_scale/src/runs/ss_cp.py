"""Context parallelism on the running example's attention: the sequence split over 8 devices, three ways.

  propagate : jax.jit with q, k, v sharded on the sequence; the compiler decides (it all-gathers K and V)
  allgather : jax.shard_map, each device all_gathers K and V, then attends its own queries (Llama 3's variant)
  ring      : jax.shard_map, K/V blocks passed round the ring with ppermute, online softmax (ring attention)

Inputs: q, k, v of block 0 for batch 0 (real weights, [32, 4, 128, 32]), causal. Each checked against one-device
attention (values and gradients); collectives and memory read from the compiled programs. A second, long input
(random, 1 x 4 heads x 8,192 tokens) shows the memory each method needs per device.

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B ss_cp.py
Writes ../out/cp.json.
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

N = 8
CFG = C.CFG
mesh = jax.make_mesh((N,), ("seq",), axis_types=(AxisType.Auto,))
SEQ = P(None, None, "seq", None)          # [B, H, T, dh] with T split


def ref_attn(q, k, v):
    T = q.shape[2]
    s = q @ k.transpose(0, 1, 3, 2) / math.sqrt(q.shape[-1])
    s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
    return jax.nn.softmax(s, axis=-1) @ v


def allgather_attn(q, k, v):
    """Per device: q [B, H, T/N, dh]; gather all of K and V, attend with the causal mask shifted by my offset."""
    me = jax.lax.axis_index("seq")
    tq = q.shape[2]
    kf = jax.lax.all_gather(k, "seq", axis=2, tiled=True)
    vf = jax.lax.all_gather(v, "seq", axis=2, tiled=True)
    s = q @ kf.transpose(0, 1, 3, 2) / math.sqrt(q.shape[-1])
    qpos = me * tq + jnp.arange(tq)[:, None]
    kpos = jnp.arange(kf.shape[2])[None, :]
    s = jnp.where(kpos <= qpos, s, -jnp.inf)
    return jax.nn.softmax(s, axis=-1) @ vf


def ring_attn(q, k, v):
    """Ring attention: N steps; at step t this device holds the K/V block that started on device (me - t) mod N.
    Online softmax keeps a running max m, denominator l and numerator o, so no [T, T] matrix is ever built."""
    me = jax.lax.axis_index("seq")
    tq = q.shape[2]
    scale = 1.0 / math.sqrt(q.shape[-1])
    m = jnp.full(q.shape[:3] + (1,), -jnp.inf, q.dtype)
    l = jnp.zeros(q.shape[:3] + (1,), q.dtype)
    o = jnp.zeros_like(q)
    perm = [(j, (j + 1) % N) for j in range(N)]
    kb, vb = k, v
    qpos = me * tq + jnp.arange(tq)[:, None]
    for t in range(N):
        src = (me - t) % N                                   # which device's keys we hold now
        kpos = src * tq + jnp.arange(tq)[None, :]
        s = (q @ kb.transpose(0, 1, 3, 2)) * scale
        s = jnp.where(kpos <= qpos, s, -jnp.inf)
        m_new = jnp.maximum(m, s.max(-1, keepdims=True))
        m_safe = jnp.where(jnp.isinf(m_new), 0.0, m_new)     # rows with nothing visible yet
        p = jnp.exp(s - m_safe)
        corr = jnp.exp(jnp.where(jnp.isinf(m), -jnp.inf, m - m_safe))
        l = l * corr + p.sum(-1, keepdims=True)
        o = o * corr + p @ vb
        m = m_new
        if t < N - 1:
            kb = jax.lax.ppermute(kb, "seq", perm)
            vb = jax.lax.ppermute(vb, "seq", perm)
    return o / l


def colls(comp):
    out = {}
    for ins in SH.instructions(comp.as_text()):
        k = ins["op"].replace("-start", "")
        if k in SC.H.COLL:
            b, _ = SC.H.shape_bytes(ins["type"])
            c = out.setdefault(k, {"count": 0, "bytes": 0})
            c["count"] += 1
            c["bytes"] += b
    return out


def variants():
    sm = lambda f: jax.shard_map(f, mesh=mesh, in_specs=(SEQ, SEQ, SEQ), out_specs=SEQ, check_vma=False)
    return {"propagate": ref_attn, "allgather": sm(allgather_attn), "ring": sm(ring_attn)}


def measure(q, k, v, with_grad):
    sh = NamedSharding(mesh, SEQ)
    qs, ks, vs = (jax.device_put(a, sh) for a in (q, k, v))
    ref = np.asarray(jax.jit(ref_attn)(q, k, v))
    cot = jnp.asarray(np.random.default_rng(1).normal(size=q.shape).astype(np.float32))
    gref = jax.jit(jax.grad(lambda q, k, v: jnp.sum(ref_attn(q, k, v) * cot), argnums=(0, 1, 2)))(q, k, v)
    out = {}
    for name, f in variants().items():
        jf = jax.jit(f, in_shardings=(sh, sh, sh), out_shardings=sh)
        comp = jf.lower(qs, ks, vs).compile()
        y = np.asarray(jf(qs, ks, vs))
        m = comp.memory_analysis()
        r = {"max_abs_err": float(np.abs(y - ref).max()), "collectives": colls(comp),
             "temp_bytes_per_device": int(m.temp_size_in_bytes)}
        if with_grad:
            g = jax.jit(jax.grad(lambda q, k, v: jnp.sum(f(q, k, v) * cot), argnums=(0, 1, 2)),
                        in_shardings=(sh, sh, sh))
            gc = g.lower(qs, ks, vs).compile()
            gv = g(qs, ks, vs)
            r["grad_max_abs_err"] = float(max(np.abs(np.asarray(a) - np.asarray(b)).max() for a, b in zip(gv, gref)))
            r["grad_collectives"] = colls(gc)
        out[name] = r
        print(name, q.shape, r, flush=True)
    return out


def schedule():
    """Which K/V block each device holds at each ring step, and whether the causal mask leaves work to do:
    'full' (all keys earlier), 'diag' (the device's own block, triangular), 'skip' (all keys later)."""
    steps = []
    for t in range(N):
        row = []
        for me in range(N):
            src = (me - t) % N
            row.append({"src": src, "work": "diag" if src == me else ("full" if src < me else "skip")})
        steps.append(row)
    busy = [sum(1 for t in range(N) if steps[t][me]["work"] != "skip") for me in range(N)]
    return {"steps": steps, "blocks_with_work_per_device": busy}


def main():
    print("load", os.getloadavg(), flush=True)
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, CFG)
    x0, _ = C.batch(0)
    h = params["tok_emb"][x0] + params["pos_emb"][:x0.shape[1]]
    p = params["blocks"][0]
    a_in = MJ.layer_norm(p["ln1"], h, CFG["ln_eps"])
    B, T, D = a_in.shape
    H = CFG["n_heads"]
    split = lambda t: t.reshape(B, T, H, D // H).transpose(0, 2, 1, 3)
    q, k, v = (split(MJ.linear(p["attn"][n], a_in)) for n in ("wq", "wk", "wv"))
    res = {"what": "Causal attention of the running example (block 0, batch 0, q/k/v [32, 4, 128, 32]) with the sequence "
                   "split over 8 simulated CPU devices (16 tokens each), jax " + jax.__version__,
           "running_example": measure(q, k, v, True), "schedule": schedule()}
    rng = np.random.default_rng(0)
    Tl = 8192
    ql, kl, vl = (jnp.asarray(rng.normal(size=(1, 4, Tl, 32)).astype(np.float32)) for _ in range(3))
    res["long"] = {"shape": [1, 4, Tl, 32], "methods": measure(ql, kl, vl, False)}
    SC.dump("cp.json", res)


if __name__ == "__main__":
    main()
