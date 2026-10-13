"""AOTAutograd's partitioner on the running example. One Block (training, CPU) traced into the joint forward+backward graph
with Inductor's decompositions, then cut by each partitioner: default_partition (save what backward needs, recompute
nothing) and min_cut_rematerialization_partition (Inductor's default) at activation_memory_budget 1.0, 0.5, 0.2, 0.0.
For each: forward and backward graphs, what is saved (shape, bytes, producing op) and what backward recomputes.
Also the whole model's saved bytes per strategy. Deterministic. Usage: PY aot.py -> ../inputs/aot.json"""
from common import *
import torch._functorch.config as fc
from torch._functorch.partitioners import default_partition, min_cut_rematerialization_partition
torch.set_num_threads(4)
cfg = GPTConfig()

def tname(t):
    t = getattr(t, "__name__", str(t))
    return str(t).replace("aten.", "")

def meta_bytes(n):
    v = n.meta.get("val")
    if isinstance(v, torch.Tensor):
        return v.numel() * v.element_size(), list(v.shape), str(v.dtype).replace("torch.", "")
    return 0, None, type(v).__name__

import torch._inductor.compile_fx as cfx
torch._functorch.config.enable_autograd_cache = False   # caches would skip the graphs we want to see
torch._inductor.config.fx_graph_cache = False
REAL_MINCUT = cfx.min_cut_rematerialization_partition


def run(mod, inputs, strategy, budget=None):
    """The real Inductor path (compile_fx: decompositions, joint-graph passes, partition, codegen); the partitioner
    call is wrapped to record the joint graph it receives and to swap in default_partition when asked."""
    rec = {}
    def part(joint, joint_inputs, compiler="inductor", **kw):
        rec["joint"] = joint
        if strategy == "default":
            fw, bw = default_partition(joint, joint_inputs, num_fwd_outputs=kw["num_fwd_outputs"], static_lifetime_input_indices=kw.get("static_lifetime_input_indices"))
        else:
            fw, bw = REAL_MINCUT(joint, joint_inputs, compiler=compiler, **kw)
        rec["fw"], rec["bw"] = fw, bw
        return fw, bw
    cfx.min_cut_rematerialization_partition = part
    torch._dynamo.reset()
    patch = {"activation_memory_budget": budget} if budget is not None else {}
    try:
        with fc.patch(**patch), quiet():
            out = torch.compile(mod)(*inputs)
            loss = out[1] if isinstance(out, tuple) else out.sum()
            loss.backward()
    finally:
        cfx.min_cut_rematerialization_partition = REAL_MINCUT
    joint, fw, bw = rec["joint"], rec["fw"], rec["bw"]
    jn = [n for n in joint.graph.nodes if n.op == "call_function"]
    fwn = {n.name for n in fw.graph.nodes if n.op == "call_function"}
    bwn = [n for n in bw.graph.nodes if n.op == "call_function"]
    recomputed = sorted({n.name for n in bwn if n.name in fwn})
    outs = list(fw.graph.nodes)[-1].args[0]
    bw_inputs = {n.name for n in bw.graph.nodes if n.op == "placeholder"}
    VIEWS = {"view", "permute", "t", "transpose", "expand", "alias", "slice", "select", "unsqueeze", "squeeze", "split", "getitem", "_unsafe_view", "as_strided"}
    def input_view(o):
        while o.op == "call_function" and tname(o.target).split(".")[0] in VIEWS and o.args and hasattr(o.args[0], "op"):
            o = o.args[0]
        return o.op == "placeholder"
    saved = []
    for o in outs:
        if hasattr(o, "name") and o.name in bw_inputs:
            b, shp, dt = meta_bytes(o)
            prim = o.op == "placeholder"
            pv = (not prim) and input_view(o)
            saved.append({"name": o.name, "op": "input" if prim else tname(o.target), "shape": shp, "dtype": dt, "bytes": b, "is_input": prim, "input_view": pv})
    return {"joint_nodes": [{"name": n.name, "op": tname(n.target), "args": [a.name for a in n.args if hasattr(a, "name")] + [a.name for l in n.args if isinstance(l, (list, tuple)) for a in l if hasattr(a, "name")],
                             "bytes": meta_bytes(n)[0], "shape": meta_bytes(n)[1]} for n in jn],
            "joint_placeholders": [n.name for n in joint.graph.nodes if n.op == "placeholder"],
            "fw_ops": len(fwn), "bw_ops": len(bwn), "fw_names": sorted(fwn), "bw_names": [n.name for n in bwn],
            "recomputed": recomputed, "saved": saved,
            "saved_bytes_activations": sum(s["bytes"] for s in saved if not s["is_input"] and not s["input_view"]),
            "saved_bytes_input_views": sum(s["bytes"] for s in saved if s["input_view"]),
            "saved_bytes_inputs": sum(s["bytes"] for s in saved if s["is_input"])}

STRATS = [("default", None), ("mincut", 1.0), ("mincut", 0.5), ("mincut", 0.2), ("mincut", 0.0)]
R = {"torch": torch.__version__, "block": {}, "model": {}}
m = make_model(cfg); blk = m.blocks[0]
x = torch.randn(8, 64, 256, generator=torch.Generator().manual_seed(0), requires_grad=True)
for s, b in STRATS:
    key = s if b is None else f"{s}_{b}"
    r = run(blk, (x,), s, b)
    if key != "default":
        r.pop("joint_nodes")
    R["block"][key] = r
    print("block", key, r["fw_ops"], r["bw_ops"], len(r["saved"]), r["saved_bytes_activations"], len(r["recomputed"]))
# whole model, train step forward+backward (loss)
xb, yb = get_batch(cfg, 0)
for s, b in STRATS:
    key = s if b is None else f"{s}_{b}"
    r = run(make_model(cfg), (xb, yb), s, b)
    R["model"][key] = {k: r[k] for k in ("fw_ops", "bw_ops", "saved_bytes_activations", "saved_bytes_inputs", "saved_bytes_input_views")}
    R["model"][key]["n_saved"] = len(r["saved"]); R["model"][key]["n_recomputed"] = len(r["recomputed"])
    R["model"][key]["saved_shapes"] = [[s["op"], s["shape"], s["bytes"], s["is_input"], s["input_view"]] for s in r["saved"]]
    R["model"][key]["joint_ops"] = len(r["joint_nodes"])
    R["model"][key]["recomputed_ops"] = sorted({n["op"] for n in r["joint_nodes"] if n["name"] in set(r["recomputed"])})
    print("model", key, R["model"][key])
# functionalization: the joint graph has no in-place or mutating ops
R["block_inplace_ops_in_joint"] = [n["op"] for n in R["block"]["default"]["joint_nodes"] if n["op"].split(".")[0].endswith("_")]
save("aot.json", R)
