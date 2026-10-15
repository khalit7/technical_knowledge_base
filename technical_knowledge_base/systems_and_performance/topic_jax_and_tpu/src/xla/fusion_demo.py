"""The same small function before and after XLA: its jaxpr equations, then the kernels of the optimised HLO,
with each equation mapped to the kernel that now computes it (via the op_name and source line XLA keeps in metadata).

Function: one MLP sub-block of the running example, forward only: x + mlp(layer_norm(x)), x float32 [32, 128, 128].
Output: src/xla/out/fusion_demo.json
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702
import re

import jax
import jax.numpy as jnp
from jax._src import source_info_util as siu

import xc_common as X
import hlo_tools as H
import model_jax as MJ

C = X.C
cfg = C.CFG
params, tx, opt, xb, yb = X.setup_state()
p = params["blocks"][0]
x = jax.random.normal(jax.random.key(0), (cfg["batch"], cfg["ctx"], cfg["d_model"]), jnp.float32)


def mlp_block(p, x):
    return x + MJ.mlp(p["mlp"], MJ.layer_norm(p["ln2"], x, cfg["ln_eps"]))


def run(fn, name):
    tr = jax.jit(fn).trace(p, x)
    jp = tr.jaxpr
    eqns = []
    for i, e in enumerate(jp.jaxpr.eqns):
        fr = siu.user_frame(e.source_info.traceback)
        line = fr.start_line if fr else None
        fname = os.path.basename(fr.file_name) if fr else None
        out = e.outvars[0].aval if e.outvars else None
        s = str(e)
        s = re.sub(r"\s+", " ", s)
        nbytes = lambda v: (int(v.aval.size) * v.aval.dtype.itemsize) if hasattr(v, "aval") and hasattr(v.aval, "size") and not hasattr(v, "val") else 0
        eqns.append({"in_bytes": sum(nbytes(v) for v in e.invars), "out_bytes": sum(nbytes(v) for v in e.outvars),
                     "i": i, "prim": e.primitive.name, "shape": out.str_short() if out is not None else "",
                     "src": "%s:%s" % (fname, line), "text": s[:140]})
    lo = tr.lower()
    co = lo.compile()
    txt = co.as_text()
    # stack frame table -> file:line per stack_frame_id
    fn_names = dict(re.findall(r'^(\d+) "([^"]*)"$', txt.split("FunctionNames")[0].split("FileNames")[1], re.M))
    floc = {}
    sec = txt.split("FileLocations")[1].split("StackFrames")[0]
    for m in re.finditer(r"^(\d+) \{file_name_id=(\d+) function_name_id=(\d+) line=(\d+)", sec, re.M):
        floc[m.group(1)] = (os.path.basename(fn_names.get(m.group(2), "?")), int(m.group(4)))
    frames = {}
    sec = txt.split("StackFrames")[1].split("\n\n")[0]
    for m in re.finditer(r"^(\d+) \{file_location_id=(\d+) parent_frame_id=(\d+)", sec, re.M):
        frames[m.group(1)] = (m.group(2), m.group(3))

    def chain(fid):
        out = []
        seen = set()
        while fid and fid in frames and fid not in seen:
            seen.add(fid)
            loc, parent = frames[fid]
            out.append(floc.get(loc))
            fid = parent
        return out

    comps = H.parse_hlo(txt)
    byname = {c["name"]: c for c in comps}
    entry = [c for c in comps if c["entry"]][0]
    lines = {ln.split("=")[0].strip().replace("ROOT ", "").lstrip("%"): ln for c in [0] for ln in txt.splitlines()}
    kernels = []
    for ins in entry["instrs"]:
        if ins["opcode"] in H.TRIVIAL:
            continue
        members = byname[ins["calls"]]["instrs"] if ins["opcode"] == "fusion" else [ins]
        mem = []
        for m in members:
            if m["opcode"] in H.TRIVIAL:
                continue
            ln = lines.get(m["name"], "")
            sfi = re.search(r"stack_frame_id=(\d+)", ln)
            ch = chain(sfi.group(1)) if sfi else []
            src = next(("%s:%d" % c for c in ch if c and c[0] == "model_jax.py"), None) or next(("%s:%d" % c for c in ch if c and c[0] == "fusion_demo.py"), None)
            mem.append({"op": m["opcode"], "jax": (m.get("meta_op") or "").split("/")[-1], "src": src})
        cat = "library (YNNPACK) fusion" if "ynn" in ins["name"] else ("single op" if len(mem) <= 1 else "multi-op loop fusion")
        if ins["opcode"] != "fusion":
            cat = ins["opcode"]
        # bytes this kernel reads and writes: its operands' and its result's shapes in the entry computation
        def shape_bytes(t):
            m = re.match(r"(f32|s32|f16|bf16|pred|u8|s8)\[([\d,]*)\]", t)
            if not m:
                return 0
            n = 1
            for q in filter(None, m.group(2).split(",")):
                n *= int(q)
            return n * {"f32": 4, "s32": 4, "f16": 2, "bf16": 2, "pred": 1, "u8": 1, "s8": 1}[m.group(1)]
        shapes = {}
        for ln in txt.split("ENTRY")[1].splitlines():
            mm = re.match(r"\s*(?:ROOT\s+)?%?([\w.\-]+)\s*=\s*(\S+)", ln)
            if mm:
                shapes[mm.group(1)] = shape_bytes(mm.group(2))
        eline = next(l for l in txt.split("ENTRY")[1].splitlines() if re.match(r"\s*(?:ROOT\s+)?%?" + re.escape(ins["name"]) + r"\s*=", l))
        args = re.search(r"\w\((.*?)\)(?:, kind=|, metadata=|, lhs_|$)", eline)
        ops_in = re.findall(r"%([\w.\-]+)", args.group(1)) if args else []
        io = shapes.get(ins["name"], 0) + sum(shapes.get(a, 0) for a in ops_in)
        kernels.append({"io_bytes": io, "name": ins["name"], "opcode": ins["opcode"], "kind": ins.get("kind"), "cat": cat, "members": mem})
    # map each jaxpr equation to the kernel holding an op with the same primitive name and source line,
    # consuming kernel members in program order (the two Linear layers share a source line)
    taken = set()
    prod = {}
    for i, f in enumerate(jp.jaxpr.eqns):
        for v in f.outvars:
            prod[id(v)] = i
    for i, e in enumerate(eqns):
        e["kernel"] = None
        # a consumer never runs in an earlier kernel than its inputs (ENTRY order is topological)
        lo_k = max([eqns[prod[id(v)]]["kernel"] or 0 for v in jp.jaxpr.eqns[i].invars if id(v) in prod] + [0])
        for k_i, k in enumerate(kernels):
            if k_i < lo_k:
                continue
            hit = [m_i for m_i, m in enumerate(k["members"]) if m["jax"] == e["prim"] and m["src"] == e["src"]]
            if e["prim"] == "dot_general":           # one dot per equation: consume it
                hit = [h for h in hit if (k_i, h) not in taken]
            if hit:
                e["kernel"] = k_i
                taken.add((k_i, hit[0]))
                break
    # equations with no op of their own: broadcasts are absorbed into the kernel that consumes them; copies vanish
    cons = {}
    for i, e in enumerate(jp.jaxpr.eqns):
        for v in e.invars:
            cons.setdefault(id(v), []).append(i)
    for i, e in enumerate(jp.jaxpr.eqns):
        if eqns[i]["kernel"] is None:
            users = cons.get(id(e.outvars[0]), [])
            ks = [eqns[u]["kernel"] for u in users if eqns[u]["kernel"] is not None]
            if e.primitive.name == "broadcast_in_dim" and ks:
                eqns[i]["kernel"] = ks[0]
                eqns[i]["how"] = "absorbed into its consumer"
            else:
                twin = [j for j, f in enumerate(jp.jaxpr.eqns) if j != i and f.primitive == e.primitive
                        and [id(v) for v in f.invars] == [id(v) for v in e.invars] and eqns[j]["kernel"] is not None]
                if twin:
                    eqns[i]["kernel"] = eqns[twin[0]]["kernel"]
                    eqns[i]["how"] = "same inputs as equation %d: computed once (common-subexpression elimination)" % twin[0]
                else:
                    eqns[i]["how"] = "removed by XLA (no work left)"
    for k in kernels:
        import collections as _c
        k["n_members"] = len(k["members"])
        k["by_op"] = dict(_c.Counter(m["op"] for m in k["members"]).most_common())
        k["jax_prims"] = sorted({m["jax"] for m in k["members"] if m["jax"]})
        del k["members"]
    ca = co.cost_analysis()
    ca = ca[0] if isinstance(ca, (list, tuple)) else ca
    return {"name": name, "eqns": eqns, "kernels": kernels, "n_eqns": len(eqns), "n_kernels": len(kernels),
            "unmapped": sum(1 for e in eqns if e["kernel"] is None), "bytes_accessed": float(ca.get("bytes accessed", 0)),
            "flops": float(ca.get("flops", 0)), "jaxpr_text": X.scrub(str(jp)),
            "stablehlo_text": X.scrub(lo.as_text()), "hlo_text": X.scrub(lo.as_text(dialect="hlo")),
            "stablehlo_ops": H.stablehlo_counts(lo.as_text())["ops"], "hlo_instructions": H.hlo_counts(lo.as_text(dialect="hlo"))["instructions_total"], "hlo_entry": X.scrub(
                "\n".join(l for l in txt.split("ENTRY")[1].splitlines()[1:] if l.strip() and not l.startswith("}"))[:6000])}


res = {"versions": X.versions(), "what": "x + mlp(layer_norm(x)) from model_jax.py, block 0 weights, x float32 [32,128,128], forward only",
       "demo": run(mlp_block, "mlp_block")}
d = res["demo"]
d["eager_bytes"] = sum(e["in_bytes"] + e["out_bytes"] for e in d["eqns"])
print("eager bytes", d["eager_bytes"], "xla bytes accessed", d["bytes_accessed"])
print("eqns", d["n_eqns"], "kernels", d["n_kernels"], "unmapped", d["unmapped"])
for e in d["eqns"]:
    print(e["i"], e["prim"], e["shape"], e["src"], "->", e["kernel"])
for i, k in enumerate(d["kernels"]):
    print(i, k["cat"], k["name"], k["n_members"], k["by_op"], k["jax_prims"])
X.save("fusion_demo.json", res)
