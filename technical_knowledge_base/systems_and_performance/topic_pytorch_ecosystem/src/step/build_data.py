"""Compact the recorded traces into ../parts/31_stp_data.js (window.STP) for the page.

    python3 build_data.py

Reads inputs/step_cpu.json, step_cpu_ckpt.json, step_mps.json, fwd_cpu_nograd.json,
fwd_cpu_infer.json, basics.json, timing.json, timing_opt.json. Plain Python, no torch.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
I = lambda f: json.load(open(os.path.join(HERE, "inputs", f)))
PH = {"fwd": 0, "bwd": 1, "opt": 2}

strs, sidx = [], {}


def S(s):
    if s not in sidx:
        sidx[s] = len(strs)
        strs.append(s)
    return sidx[s]


def fix_paths(r):
    # ones_like(loss) seeds backward: grad mode is on and loss requires grad, but ones_like has no derivative
    for o in r["ops"]:
        if o["ph"] == "bwd" and o["op"] == "ones_like":
            o["rg"] = False
            o["path"][0] = o["path"][0].replace("(records a node)", "(no node: output has no history)")
        if o["ph"] == "bwd" and o["rg"]:
            o["path"][0] = o["path"][0].replace("(records a node)", "(records a node: recompute)")


tds, tdi = [], {}


def tens(lst, n):
    """Tensor descriptions [shape, stride, offset, dtype(, new bytes)] interned in STP.tds."""
    out = []
    for t in lst[:n]:
        k = json.dumps(t, separators=(",", ":"))
        if k not in tdi:
            tdi[k] = len(tds)
            tds.append(t)
        out.append(tdi[k])
    return out


plain = I("step_cpu.json"); fix_paths(plain)
ckpt = I("step_cpu_ckpt.json"); fix_paths(ckpt)
mps = I("step_mps.json"); fix_paths(mps)
nog = I("fwd_cpu_nograd.json"); inf = I("fwd_cpu_infer.json")

ops = []
for o in plain["ops"]:
    ops.append([PH[o["ph"]], S(o["op"] + ("." + o["ov"] if o["ov"] != "default" else "")), S(o["ctx"]),
                S("|".join(o["path"])), 1 if o["rg"] else 0, tens(o["in"], 3), o["nin"], tens(o["out"], 3),
                len(o["out"]), o["alloc"], o["live"], o.get("node", o.get("bn", -1)), S(",".join(o["keys"]))])

graph = []
for g in plain["graph"]:
    graph.append([S(g["name"]), -1 if g["seq"] is None else g["seq"], g["next"],
                  [[s["name"], s["shape"], s["kind"][0], s["bytes"], s["counted"]] for s in g["saved"]],
                  g.get("op", -1), g.get("param") or ""])


def short(r, path=False):
    """[phase, op, path (or -1), records-a-node, new bytes, live bytes(, MPS allocator bytes)]"""
    return [[PH[o["ph"]], S(o["op"] + ("." + o["ov"] if o["ov"] != "default" else "")),
             S("|".join(o["path"])) if path else -1, 1 if o["rg"] else 0, o["alloc"], o["live"]] + ([o["mps_alloc"]] if "mps_alloc" in o else [])
            for o in r["ops"]]


summ = lambda r: {k: r[k] for k in r if k not in ("ops", "graph", "bwd_order")}
B = I("basics.json")
T = I("timing.json")
TO = I("timing_opt.json")
data = {
    "strs": strs, "tds": tds, "ops": ops, "graph": graph, "bwd_order": plain["bwd_order"], "plain": summ(plain),
    "ckpt": {"sum": summ(ckpt), "ops": short(ckpt), "graph_saved": sum(s["counted"] for g in ckpt["graph"] for s in g["saved"]),
             "graph_nodes": len(ckpt["graph"])},
    "mps": {"sum": summ(mps), "ops": short(mps), "graph_saved": sum(s["counted"] for g in mps["graph"] for s in g["saved"]),
            "graph_nodes": len(mps["graph"])},
    "nograd": {"sum": summ(nog), "ops": short(nog, True)},
    "infer": {"sum": summ(inf), "ops": short(inf, True)},
    "views": B["views"], "tables": B["dispatch_tables"], "param_keys": B["dispatch_keys_of_param"],
    "hand": B["hand_grad"], "gradcheck": B["gradcheck"], "ckpt_same": B["ckpt_same"], "first_step_opt": B["first_step_opt"],
    "timing": {k: T[k] for k in ("cpu", "mps", "profile_cpu", "load_before", "load_after", "date", "threads", "trials", "steps")},
    "timing_opt": TO,
}
s = json.dumps(data, separators=(",", ":"))
out = os.path.join(HERE, "..", "parts", "31_stp_data.js")
open(out, "w").write("// Inside one step: recorded data (src/step/build_data.py from src/step/inputs/). Do not edit by hand.\nwindow.STP=" + s + ";\n")
print(out, len(s), "bytes;", len(ops), "ops,", len(graph), "nodes,", len(strs), "strings")
