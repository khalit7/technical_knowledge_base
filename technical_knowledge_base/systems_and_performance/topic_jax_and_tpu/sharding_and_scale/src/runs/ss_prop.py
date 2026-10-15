"""Propagation explorer: one transformer block of the running example (forward), five annotation cases, compiled
with Shardy (the default) and with the older GSPMD propagator. For every operation: the sharding the propagator
chose (read from the HLO dumped right after the propagation pass), and the collectives the partitioner then
inserted (read from the optimised HLO), attributed to the line of model_jax.py they came from.

    XLA_FLAGS="--xla_force_host_platform_device_count=8 --xla_dump_to=$JX_SCRATCH/ss/prop_dump \
      --xla_dump_hlo_pass_re=shardy-xla|sharding-propagation" JAX_PLATFORMS=cpu nice -n 15 \
      $JX_SCRATCH/venv/bin/python -I -B ss_prop.py
Writes ../out/prop.json. The dumps (absolute paths inside) stay in $JX_SCRATCH/ss/prop_dump.
"""
import glob
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

CFG = C.CFG
DUMP = SC.big("prop_dump")
assert len(jax.devices()) == 8
MODEL_SRC = open(MJ.__file__).read().splitlines()


def megatron(names):
    if names[-2] in ("wq", "wk", "wv", "fc1"):
        return P(None, "model") if names[-1] == "w" else P("model")
    if names[-2] in ("wo", "fc2"):
        return P("model", None) if names[-1] == "w" else P()
    return P()


def fsdp(names, shape):
    if len(shape) == 2:
        return P("data", None)
    return P("data") if shape[0] % 8 == 0 else P()


CASES = [
    # id, mesh shape, axis names, param rule, x spec, residual constraint after attention (None = none), note
    ("tp", (2, 4), ("data", "model"), "megatron", P("data", None, None), None,
     "Megatron tensor parallel weights on 'model', batch on 'data'"),
    ("fsdp_w", (8,), ("data",), "fsdp", P("data", None, None), None,
     "FSDP: every weight split on its first dimension over 'data', batch on 'data', nothing else annotated"),
    ("fsdp_c", (8,), ("data",), "fsdp", P("data", None, None), P("data", None, None),
     "The same, plus one with_sharding_constraint on the residual stream after attention"),
    ("seq", (8,), ("data",), "replicated", P(None, "data", None), None,
     "Weights replicated, the sequence (dimension 1) split over 'data'"),
    ("conflict", (2, 4), ("data", "model"), "megatron", P("data", None, "model"), None,
     "Megatron weights, but x arrives with its feature dimension split on 'model' (the same axis)"),
]


def make_fn(cid, constraint):
    def block_fwd(p, x):
        h = x + MJ.attention(p["attn"], MJ.layer_norm(p["ln1"], x, CFG["ln_eps"]), CFG["n_heads"])
        if constraint is not None:
            h = jax.lax.with_sharding_constraint(h, constraint)
        return h + MJ.mlp(p["mlp"], MJ.layer_norm(p["ln2"], h, CFG["ln_eps"]))

    def block_step(p, x):
        """Forward and backward of one block: loss = mean(block(x)^2), gradients for every parameter."""
        return jax.value_and_grad(lambda q: jnp.mean(block_fwd(q, x) ** 2))(p)
    block_step.__name__ = block_step.__qualname__ = "ss_" + cid
    return block_step


def src_line(n):
    return MODEL_SRC[n - 1].strip() if n and n <= len(MODEL_SRC) else ""


def run(case, shardy):
    cid, mshape, names, rule, xspec, cspec, note = case
    jax.config.update("jax_use_shardy_partitioner", shardy)
    mesh = jax.make_mesh(mshape, names, axis_types=(AxisType.Auto,) * len(names))
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    p = MJ.from_torch(sd, CFG)["blocks"][0]

    def spec(path, a):
        nm = [getattr(k, "key", None) for k in path]
        nm = [n for n in nm if isinstance(n, str)]
        if rule == "megatron":
            return megatron(nm)
        if rule == "fsdp":
            return fsdp(nm, a.shape)
        return P()
    psh = jax.tree_util.tree_map_with_path(lambda pa, a: NamedSharding(mesh, spec(pa, a)), p)
    x0, _ = C.batch(0)
    params_full = MJ.from_torch(sd, CFG)
    x = (params_full["tok_emb"][x0] + params_full["pos_emb"][:x0.shape[1]]).astype(jnp.float32)
    fn = make_fn(cid + ("_shardy" if shardy else "_gspmd"), None if cspec is None else NamedSharding(mesh, cspec))
    f = jax.jit(fn, in_shardings=(psh, NamedSharding(mesh, xspec)))
    before = set(glob.glob(os.path.join(DUMP, "*")))
    comp = f.lower(p, x).compile()
    new = sorted(set(glob.glob(os.path.join(DUMP, "*"))) - before)
    prop_files = [g for g in new if ("after_shardy-xla" in g or "after_sharding-propagation" in g) and fn.__name__ in g]
    assert prop_files, ("no propagation dump", new[:5])
    prop = SH.instructions(open(prop_files[-1]).read())
    # one row per (source line, opcode): the largest instruction stands for the group
    rows = {}
    for ins in prop:
        if ins["line"] is None or ins["file"] != "model_jax.py" or ins["op"] in ("parameter", "constant"):
            continue
        dims = SH.dims_of(ins["type"]) or []
        if not dims:
            continue
        sp = "none" if ins["sharding"] is None else SH.shardy_to_spec(ins["sharding"]) if shardy else SH.gspmd_to_spec(ins["sharding"], len(dims), list(mshape), list(names))
        ph = "bwd" if "transpose(" in ins["op_name"] else "fwd"
        k = (ins["line"], ins["op"], ph)
        size = int(np.prod(dims))
        if k not in rows or size > rows[k]["size"]:
            rows[k] = {"line": ins["line"], "op": ins["op"], "phase": ph, "shape": dims, "size": size, "spec": sp,
                       "src": src_line(ins["line"])}
    # collectives in the optimised program, by source line
    opt = comp.as_text()
    colls = []
    for ins in SH.instructions(opt):
        kind = ins["op"].replace("-start", "")
        if kind in SC.H.COLL:
            b, _ = SC.H.shape_bytes(ins["type"])
            colls.append({"kind": kind, "bytes": b, "line": ins["line"], "phase": "bwd" if "transpose(" in ins["op_name"] else "fwd", "src": src_line(ins["line"]) if ins["file"] == "model_jax.py" else "",
                          "file": ins["file"]})
    y = f(jax.device_put(p, psh), jax.device_put(x, NamedSharding(mesh, xspec)))
    ref = jax.jit(fn)(p, x) if False else None
    m = comp.memory_analysis()
    return {"rows": sorted(rows.values(), key=lambda r: (r["phase"] == "bwd", r["line"], r["op"])), "collectives": colls,
            "temp_bytes": int(m.temp_size_in_bytes), "loss": float(y[0]),
            "y": y}


def full_step(sid, shardy):
    """The root Sharding lab's whole train step for one layout (sh_strategies.build), collectives by source line."""
    import sh_strategies as ST
    jax.config.update("jax_use_shardy_partitioner", shardy)
    s = next(x for x in ST.STRATS if x[0] == sid)
    f, params, opt, p_sh, o_sh, x_sh = ST.build(sid, s[2], s[3], s[4], s[5])
    x0, y0 = C.batch(0)
    comp = f.lower(params, opt, jax.device_put(x0, x_sh), jax.device_put(y0, x_sh)).compile()
    agg = {}
    for ins in SH.instructions(comp.as_text()):
        kind = ins["op"].replace("-start", "")
        if kind not in SC.H.COLL:
            continue
        b, _ = SC.H.shape_bytes(ins["type"])
        where = (ins["file"] or "?") + ":" + str(ins["line"]) if ins["line"] else "(no source line)"
        ph = "bwd" if "transpose(" in ins["op_name"] else ("fwd" if "jvp(" in ins["op_name"] else "other")
        k = (kind, where, ph)
        a = agg.setdefault(k, [0, 0])
        a[0] += 1
        a[1] += b
    return [{"kind": k[0], "where": k[1], "phase": k[2], "count": v[0], "bytes": v[1]} for k, v in sorted(agg.items())]


def main():
    print("load", os.getloadavg(), flush=True)
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params_full = MJ.from_torch(sd, CFG)
    x0, _ = C.batch(0)
    x = params_full["tok_emb"][x0] + params_full["pos_emb"][:x0.shape[1]]
    ref = np.asarray(jax.jit(lambda p, x: jax.value_and_grad(lambda q: jnp.mean(MJ.block(q, x, CFG) ** 2))(p)[0])(params_full["blocks"][0], x))
    out = {"what": "One block of the running example, forward and backward (loss = mean of the block output squared), batch 0 embedded [32, 128, 128]; shardings read from "
                   "the HLO dumped after the propagation pass (Shardy: shardy-xla; GSPMD: sharding-propagation); collectives "
                   "from compile().as_text(). jax " + jax.__version__ + ", 8 simulated CPU devices, Auto axes.",
           "cases": []}
    for case in CASES:
        rec = {"id": case[0], "mesh": list(case[1]), "axes": list(case[2]), "x_spec": str(case[4]),
               "constraint": str(case[5]) if case[5] is not None else None, "note": case[6]}
        for shardy in (True, False):
            r = run(case, shardy)
            r.pop("y"); r["max_abs_err_vs_one_device"] = float(abs(r["loss"] - ref))
            rec["shardy" if shardy else "gspmd"] = r
            print(case[0], "shardy" if shardy else "gspmd", len(r["rows"]), "rows",
                  {k: sum(1 for c in r["collectives"] if c["kind"] == k) for k in SC.H.COLL}, "err", r["max_abs_err_vs_one_device"], flush=True)
        a = {(r["line"], r["op"], r["phase"]): r["spec"] for r in rec["shardy"]["rows"]}
        b = {(r["line"], r["op"], r["phase"]): r["spec"] for r in rec["gspmd"]["rows"]}
        rec["n_ops_compared"] = len(set(a) & set(b))
        rec["n_ops_differ"] = sum(1 for k in set(a) & set(b) if a[k] != b[k])
        out["cases"].append(rec)
    out["full_step"] = {}
    for sid in ("tp", "fsdp_naive", "seq"):
        out["full_step"][sid] = {"shardy": full_step(sid, True), "gspmd": full_step(sid, False)}
        print("full", sid, sum(r["count"] for r in out["full_step"][sid]["shardy"]), sum(r["count"] for r in out["full_step"][sid]["gspmd"]), flush=True)
    jax.config.update("jax_use_shardy_partitioner", True)
    SC.dump("prop.json", out)


if __name__ == "__main__":
    main()
