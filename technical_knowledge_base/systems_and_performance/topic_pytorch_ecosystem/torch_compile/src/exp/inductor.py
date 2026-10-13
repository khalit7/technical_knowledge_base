"""Inductor on one Block of the running example (CPU, torch 2.14.1): the scheduler nodes it starts from, every fusion it
made (and the pairs it rejected, with the reason it logged), the kernels it wrote (C++), the wrapper's launches; then
how config knobs change the number of kernels. Deterministic (no timing). Usage: PY inductor.py -> ../inputs/inductor.json"""
import re, collections
from common import *
from torch._inductor.utils import run_and_get_code
import torch._inductor.config as ic
torch._inductor.config.fx_graph_cache = False
torch._functorch.config.enable_autograd_cache = False
torch.set_num_threads(4)
cfg = GPTConfig()
LAUNCH = re.compile(r"^\s+(?:\w+(?:, \w+)* = )?(cpp_fused_\w+|extern_kernels\.\w+|torch\.ops\.\w+\.\w+(?:\.\w+)?)\(")

def launches(code):
    lines = code.split("\n")
    try:
        start = next(i for i, l in enumerate(lines) if l.strip().startswith("def call(self, args)") or l.strip().startswith("def call(args)"))
    except StopIteration:
        return []
    out, comment = [], ""
    for l in lines[start + 1:]:
        if l and not l.startswith(" "):
            break
        s = l.strip()
        if s.startswith("# Topologically Sorted Source Nodes") or s.startswith("# Source Nodes"):
            comment = s; continue
        m = LAUNCH.match(l)
        if m and "empty_strided" not in s:
            name = m.group(1)
            kind = "extern" if name.startswith("extern") else ("fallback" if name.startswith("torch.ops") else "fused")
            aten = re.findall(r"Original ATen: \[(.*?)\]", comment)
            out.append({"name": name, "kind": kind, "aten": aten[0].split(", ") if aten else []})
            comment = ""
    return out

def kernel_src(code, name):
    m = re.search(re.escape(name) + r" = async_compile\.\w+\((.*?)r?'''(.*?)'''", code, re.S)
    return m.group(2).strip() if m else ""

R = {"torch": torch.__version__}
m = make_model(cfg); blk = m.blocks[0]
x = torch.randn(8, 64, 256, generator=torch.Generator().manual_seed(0))

# 1. inference forward of one block: scheduler nodes, fusion log, kernels, code
torch._dynamo.reset()
with logs(fusion=True) as h, torch.no_grad():
    _, codes = run_and_get_code(torch.compile(blk.eval()), x)
nodes, events, rejects, rounds = [], [], collections.Counter(), []
for k, msg in h.recs:
    if "fusion" not in k:
        continue
    mm = re.match(r"\s*(SchedulerNode|ExternKernelSchedulerNode)\(name='(\w+)'\)(?:, (\w+)\(\['(\[[^\]]*\])'(?:, '(\w+)')?, 'origins=OrderedSet\(\[([^\]]*)\]\)')?", msg)
    if mm and not any(n["name"] == mm.group(2) for n in nodes):
        line = re.findall(r'line (\d+), in forward', msg)
        nodes.append({"name": mm.group(2), "kind": "extern" if mm.group(1).startswith("Extern") else mm.group(3).lower(),
                      "size": mm.group(4), "reduction": mm.group(5), "origins": [o.strip() for o in (mm.group(6) or "").split(",") if o.strip()],
                      "model_line": int(line[0]) if line else None})
        continue
    if msg.startswith("fusing "):
        a, b = re.match(r"fusing (\S+) with (\S+)", msg).groups(); events.append([a, b])
    elif msg.startswith("cannot fuse"):
        rejects[re.sub(r"cannot fuse \S+ with \S+: ", "", msg).split("\n")[0][:120]] += 1
    elif "completed fusion round" in msg:
        rounds.append(msg.split("\n")[0])
R["infer"] = {"nodes": nodes, "fusions": events, "reject_reasons": dict(rejects), "rounds": rounds}
# extern kernels: which aten op each extern node is (from the wrapper)
code = codes[-1]
L = launches(code)
R["infer"]["launches"] = L
R["infer"]["kernels"] = {l["name"]: kernel_src(code, l["name"]) for l in L if l["kind"] == "fused"}
R["infer"]["code_lines"] = code.count("\n")
i = code.find("def call(")
R["infer"]["wrapper_call"] = clean(code[i:code.find("return (", i) + 20])
R["infer"]["reuse_lines"] = code[i:].count("# reuse")
print("infer nodes", len(nodes), "fusions", events, "launches", [(l["name"], l["kind"]) for l in L])
print("rejects", dict(rejects))

# 2. training (forward + backward) of one block, under several Inductor configs
def train_counts(conf):
    torch._dynamo.reset()
    xx = x.clone().requires_grad_(True)
    b = make_model(cfg).blocks[0]
    with ic.patch(**conf), quiet():
        out, codes = run_and_get_code(lambda t: torch.compile(b)(t).sum().backward(), xx)
    res = []
    for c in codes:
        L = launches(c)
        res.append({"fused": sum(l["kind"] == "fused" for l in L), "extern": sum(l["kind"] == "extern" for l in L),
                    "fallback": sum(l["kind"] == "fallback" for l in L), "lines": c.count("\n"),
                    "kernel_names": [l["name"] for l in L]})
    return res
KNOBS = [("default", {}), ("no_fusion", {"max_fusion_size": 1}), ("aggressive_fusion", {"aggressive_fusion": True}),
         ("no_epilogue_fusion", {"epilogue_fusion": False}), ("cpp_wrapper", {"cpp_wrapper": True}),
         ("no_pattern_matcher", {"pattern_matcher": False})]
R["knobs"] = {}
for name, conf in KNOBS:
    try:
        R["knobs"][name] = {"conf": conf, "graphs": train_counts(conf)}
    except Exception as e:
        R["knobs"][name] = {"conf": conf, "error": clean(type(e).__name__ + ": " + str(e).split("\n")[0])[:200]}
    print(name, [(g["fused"], g["extern"], g["fallback"], g["lines"]) for g in R["knobs"][name].get("graphs", [])], R["knobs"][name].get("error", ""))

# 3. freezing (inference): weights become constants that Inductor may fold
torch._dynamo.reset()
with ic.patch(freezing=True), torch.no_grad(), quiet():
    _, codes = run_and_get_code(torch.compile(make_model(cfg).blocks[0].eval()), x)
L = launches(codes[-1])
R["freezing"] = {"launches": L, "lines": codes[-1].count("\n")}
print("freezing", [(l["name"], l["kind"]) for l in L])
save("inductor.json", R)
