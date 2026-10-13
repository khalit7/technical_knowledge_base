"""torch.export and AOTInductor on the running example (eval, logits only): strict against non-strict, a dynamic_shapes spec
and what happens when it is wrong, the ExportedProgram's parts, run_decompositions, data-dependent control flow (error,
then torch.cond), draft_export, save/load, and the AOTInductor package's contents. Deterministic except file sizes
(stable) and nothing timed. Usage: PY export.py <scratch dir> -> ../inputs/export.json"""
import os, zipfile, collections
from common import *
from torch.export import export, Dim
torch.set_num_threads(4)
SCR = sys.argv[1]; os.makedirs(SCR, exist_ok=True)
cfg = GPTConfig()
m = make_model(cfg).eval()
x, _ = get_batch(cfg, 0)
R = {"torch": torch.__version__}

class Logits(torch.nn.Module):            # export the logits path only (no loss)
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, idx): return s.m(idx)[0]
L = Logits(m).eval()
def ops(ep):
    return [str(n.target) for n in ep.graph.nodes if n.op == "call_function"]

out = {}
for strict in (False, True):
    torch._dynamo.reset()
    with quiet():
        ep = export(L, (x,), strict=strict)
    out[strict] = ep
    R["strict" if strict else "nonstrict"] = {"ops": len(ops(ep)), "op_counts": dict(collections.Counter(o.split(".")[1] if o.startswith("aten.") else o for o in ops(ep)).most_common(12))}
R["same_graph"] = ops(out[False]) == ops(out[True])
ep = out[False]
sig = ep.graph_signature
R["signature"] = {"inputs": dict(collections.Counter(s.kind.name for s in sig.input_specs)), "outputs": dict(collections.Counter(s.kind.name for s in sig.output_specs)),
                  "user_inputs": list(sig.user_inputs), "first_params": [s.target for s in sig.input_specs if s.kind.name == "PARAMETER"][:4],
                  "state_dict_keys": len(ep.state_dict), "range_constraints": {str(k): str(v) for k, v in ep.range_constraints.items()}}
dec = ep.run_decompositions()
R["decomposed_ops"] = len(ops(dec)); R["decomposed_top"] = dict(collections.Counter(o.split(".")[1] if o.startswith("aten.") else o for o in ops(dec)).most_common(12))
R["graph_head"] = clean(ep.graph_module.print_readable(print_output=False, include_stride=False, include_device=False, colored=False))[:3000]

# dynamic shapes: batch and length, then specs that are wrong
B, T = Dim("batch", min=1, max=64), Dim("T", min=2, max=64)
def try_export(spec, label, model=L, args=(x,)):
    torch._dynamo.reset()
    try:
        with quiet():
            e = export(model, args, dynamic_shapes=spec)
        res = {"label": label, "ok": True, "range_constraints": {str(k): str(v) for k, v in e.range_constraints.items()}, "ops": len(ops(e))}
        return res, e
    except Exception as ex:
        msg = clean(str(ex))
        return {"label": label, "ok": False, "error_type": type(ex).__name__, "error": msg[:900]}, None
DYN = []
r, ep_dyn = try_export({"idx": {0: B, 1: T}}, "batch 1..64 and T 2..64"); DYN.append(r)
r, _ = try_export({"idx": {0: B, 1: Dim("T", min=2, max=128)}}, "T up to 128 (positions table has 64 rows)"); DYN.append(r)
r, _ = try_export({"idx": {0: Dim.AUTO, 1: Dim.AUTO}}, "Dim.AUTO on both"); DYN.append(r)
class Spec(torch.nn.Module):               # code that silently assumes a fixed batch
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, idx):
        lg = s.m(idx)[0]
        return lg.reshape(8, -1)
r, _ = try_export({"idx": {0: B, 1: T}}, "dynamic batch, but the code reshapes to 8 rows", Spec(m)); DYN.append(r)
R["dynamic"] = DYN
# run the dynamic program on other shapes, and outside its range
mod = ep_dyn.module()
with torch.no_grad():
    R["dyn_runs"] = []
    for bb, tt in [(8, 64), (2, 17), (64, 64)]:
        xi = x.repeat(8, 1)[:bb, :tt]
        R["dyn_runs"].append({"shape": [bb, tt], "max_diff": float((mod(xi) - L(xi)).abs().max())})
    try:
        mod(x.repeat(1, 2)[:, :100]); R["out_of_range"] = "ran"
    except Exception as ex:
        R["out_of_range"] = clean(type(ex).__name__ + ": " + str(ex).split("\n")[0])[:300]

# data-dependent control flow
class Branch(torch.nn.Module):
    def forward(s, t):
        if t.sum() > 0:
            return t.sin()
        return t.cos()
class BranchCond(torch.nn.Module):
    def forward(s, t):
        return torch.cond(t.sum() > 0, lambda u: u.sin(), lambda u: u.cos(), (t,))
t = torch.randn(4, 4)
R["control_flow"] = {}
for name, mm in [("python_if", Branch()), ("torch_cond", BranchCond())]:
    for strict in (False, True):
        torch._dynamo.reset()
        try:
            with quiet():
                e = export(mm, (t,), strict=strict)
            R["control_flow"][f"{name}_{'strict' if strict else 'nonstrict'}"] = {"ok": True, "ops": ops(e)}
        except Exception as ex:
            R["control_flow"][f"{name}_{'strict' if strict else 'nonstrict'}"] = {"ok": False, "error_type": type(ex).__name__, "error": clean(str(ex)).split("\n\n")[0][:500]}
# draft_export: export anyway and report
try:
    with quiet():
        dep = torch.export.draft_export(Branch(), (t,))
    rep = dep._report if hasattr(dep, "_report") else None
    R["draft_export"] = {"ok": True, "report": clean(str(rep))[:1200] if rep is not None else "", "ops": ops(dep)}
except Exception as ex:
    R["draft_export"] = {"ok": False, "error": clean(type(ex).__name__ + ": " + str(ex))[:400]}

# save / load
p = os.path.join(SCR, "gpt_export.pt2")
torch.export.save(ep_dyn, p)
R["saved_bytes"] = os.path.getsize(p)
with zipfile.ZipFile(p) as z:
    R["saved_members"] = [[clean(i.filename).split("/", 1)[-1], i.file_size] for i in z.infolist()]
ep2 = torch.export.load(p)
with torch.no_grad():
    R["load_max_diff"] = float((ep2.module()(x) - L(x)).abs().max())

# AOTInductor package
from torch._inductor import aoti_compile_and_package, aoti_load_package
pk = os.path.join(SCR, "gpt_aoti.pt2")
with quiet():
    aoti_compile_and_package(ep_dyn, package_path=pk)
R["aoti_bytes"] = os.path.getsize(pk)
with zipfile.ZipFile(pk) as z:
    mem = [[i.filename.split("/", 1)[-1], i.file_size] for i in z.infolist()]
R["aoti_members"] = [[clean(a)[:120], b] for a, b in mem]
runner = aoti_load_package(pk)
with torch.no_grad():
    R["aoti_max_diff"] = {f"{bb}x{tt}": float((runner(x.repeat(8, 1)[:bb, :tt].contiguous()) - L(x.repeat(8, 1)[:bb, :tt])).abs().max()) for bb, tt in [(8, 64), (3, 20)]}
    xs = x[:3, :20]                                   # a slice: not contiguous (strides 64, 1)
    R["aoti_noncontiguous"] = {"is_contiguous": xs.is_contiguous(), "stride": list(xs.stride()),
                               "aoti_max_diff": float((runner(xs) - L(xs)).abs().max()),
                               "aoti_contiguous_max_diff": float((runner(xs.contiguous()) - L(xs)).abs().max()),
                               "exported_module_max_diff": float((mod(xs) - L(xs)).abs().max())}
save("export.json", R)
print({k: R[k] for k in ("same_graph", "decomposed_ops", "saved_bytes", "aoti_bytes", "load_max_diff", "aoti_max_diff", "out_of_range")})
print([(d["label"], d["ok"], d.get("error", "")[:150]) for d in DYN])
print({k: (v["ok"], v.get("error", "")[:120]) for k, v in R["control_flow"].items()})
