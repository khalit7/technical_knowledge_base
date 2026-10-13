"""What Dynamo captured for the running example's forward with three activations: F.gelu, the C++ function
through pybind11 (a break), and the same C++ as a full custom op. Per graph: its ATen-level ops (FX targets) in
order; per break: the reason and the user line. Feeds the before/after animation on the Reading tab.
Writes src/inputs/graphs.json. Deterministic.
"""
import contextlib, io, warnings
import torch
import torch.nn.functional as F
import torch._dynamo as dynamo
from common import clean, save, SCRATCH
import model as M
from model import GPTConfig, make_model, get_batch
from cpp_ext import load_ext

warnings.simplefilter("ignore")
torch.set_num_threads(2)
EXT, _ = load_ext(SCRATCH + "/build_ops")
cfg = GPTConfig()
xi, yi = get_batch(cfg, 0)


@torch.library.custom_op("ext::gelu", mutates_args=())
def gelu(x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu(x)


@gelu.register_fake
def _(x):
    return torch.empty_like(x)


ACT = {"f": F.gelu}
M.MLP.forward = lambda self, x: self.proj(ACT["f"](self.fc(x)))


def short(t):
    s = getattr(t, "__name__", None) or str(t)
    s = str(t) if "ext" in str(t) else s
    return s.replace("<built-in function ", "").replace(">", "").replace("built-in method ", "")


out = {}
for name, fn in [("native", F.gelu), ("pybind", EXT.raw_gelu), ("custom_op", gelu)]:
    ACT["f"] = fn
    dynamo.reset()
    m = make_model(cfg)
    with contextlib.redirect_stderr(io.StringIO()):
        e = dynamo.explain(m)(xi, yi)
    graphs = []
    for g in e.graphs:
        ops = []
        for n in g.graph.nodes:
            if n.op in ("call_function", "call_method", "call_module"):
                ops.append(short(n.target))
        graphs.append({"n_ops": len(ops), "ops": ops})
    breaks = []
    for r in e.break_reasons:
        where = None
        try:
            fr = r.user_stack[-1]
            where = f"{fr.filename.split('/')[-1]}:{fr.lineno} in {fr.name}"
        except Exception:
            pass
        breaks.append({"reason": clean(r.reason, 160).split("\n")[0], "where": where})
    out[name] = {"graphs": graphs, "breaks": breaks, "graph_count": e.graph_count, "break_count": e.graph_break_count}
    print(name, e.graph_count, e.graph_break_count, [g["n_ops"] for g in graphs], [b["where"] for b in breaks])
# torch.export with the custom op: it stays one node, also after decomposition to core ATen
ACT["f"] = gelu
m = make_model(cfg)
with contextlib.redirect_stderr(io.StringIO()):
    ep = torch.export.export(m, (xi, yi))
    n_all = sum(1 for n in ep.graph.nodes if n.op == "call_function")
    n_ext = sum(1 for n in ep.graph.nodes if n.op == "call_function" and "ext.gelu" in str(n.target))
    ep2 = ep.run_decompositions()
    n_all2 = sum(1 for n in ep2.graph.nodes if n.op == "call_function")
    n_ext2 = sum(1 for n in ep2.graph.nodes if n.op == "call_function" and "ext.gelu" in str(n.target))
    lo, _ = ep.module()(xi, yi)
out["export"] = {"ops": n_all, "ext_nodes": n_ext, "ops_core": n_all2, "ext_nodes_core": n_ext2,
                 "logits_match": bool(torch.allclose(lo, m(xi, yi)[0], atol=1e-6))}
# and with the pybind call: export cannot trace it
ACT["f"] = EXT.raw_gelu
try:
    with contextlib.redirect_stderr(io.StringIO()):
        torch.export.export(make_model(cfg), (xi, yi))
    out["export_pybind"] = "exported"
except Exception as e:
    out["export_pybind"] = clean(f"{type(e).__name__}: {e}", 220).split("\n")[0]
print(out["export"], out["export_pybind"])
save("graphs.json", out)
