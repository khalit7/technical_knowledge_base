"""Deterministic record of torch.compile on the running example (CPU, 4 threads): Dynamo's graph and guards,
AOTAutograd's partitioned forward and backward graphs (what is saved for backward), and Inductor's kernels.
Usage: python trace_model.py [cpu|mps]   -> inputs/model_<device>.json"""
import io, logging, sys, collections
from common import *
from torch._inductor.compile_fx import compile_fx, compile_fx_inner
from torch._inductor.utils import run_and_get_code

dev = sys.argv[1] if len(sys.argv) > 1 else "cpu"
torch.set_num_threads(4)
torch._functorch.config.enable_autograd_cache = False   # caches would skip the graphs we want to see
torch._inductor.config.fx_graph_cache = False
torch._inductor.config.comment_origin = True
cfg = GPTConfig()
R = {"device": dev, "torch": torch.__version__, "threads": 4, "params": n_params(make_model(cfg))}

# ---- eager: dispatcher calls in forward and backward (step 0, no optimizer) ----
m = make_model(cfg, dev); x, y = get_batch(cfg, 0, dev)
with OpLog() as L:
    _, loss = m(x, y)
fw = L.ops
with OpLog() as L:
    loss.backward()
bw = L.ops
R["eager"] = {"fwd_calls": len(fw), "bwd_calls": len(bw), "loss0": loss.item(),
              "fwd_ops": [[o["op"], o["read"], o["write"]] for o in fw],
              "bwd_ops": [[o["op"], o["read"], o["write"]] for o in bw],
              "fwd_bytes": sum(o["read"] + o["write"] for o in fw), "bwd_bytes": sum(o["read"] + o["write"] for o in bw)}

# ---- Dynamo: explain ----
torch._dynamo.reset()
m = make_model(cfg, dev)
ex = torch._dynamo.explain(m)(x, y)
g0 = ex.graphs[0]
nodes = []
for n in g0.graph.nodes:
    t = n.target if isinstance(n.target, str) else getattr(n.target, "__name__", str(n.target))
    nodes.append([n.op, str(t), n.name])
R["dynamo"] = {"graph_count": ex.graph_count, "break_count": ex.graph_break_count,
               "ops_per_graph": [len(o) for o in ex.ops_per_graph], "nodes": nodes,
               "code": clean(g0.code.strip())}

# ---- guards (log) ----
torch._dynamo.reset()
buf = io.StringIO(); h = logging.StreamHandler(buf)
torch._logging.set_logs(guards=True)
for n in ["torch._dynamo", "torch.__guards"]:
    logging.getLogger(n).addHandler(h)
m = make_model(cfg, dev)
torch.compile(m, backend="eager")(x, y)
torch._logging.set_logs()
for n in ["torch._dynamo", "torch.__guards"]:
    logging.getLogger(n).removeHandler(h)
glog = clean(buf.getvalue())
kinds = collections.Counter(re.findall(r"\+- ([A-Z_]+):", glog))
R["guards"] = {"total": sum(kinds.values()), "by_kind": kinds.most_common(), "excerpt": "\n".join(glog.split("\n")[:60]),
               "eval_latency_us": [float(v) for v in re.findall(r"Guard eval latency = ([\d.]+) us", glog)]}

# ---- AOTAutograd + Inductor ----
torch._dynamo.reset()
cap = []
def inner(gm, ex_in, **kw):
    cap.append((gm, bool(kw.get("is_backward"))))
    return compile_fx_inner(gm, ex_in, **kw)
be = lambda gm, ex_in: compile_fx(gm, ex_in, inner_compile=inner)
m = make_model(cfg, dev)
cm = torch.compile(m, backend=be)
def fn():
    _, l = cm(x, y); l.backward(); return l
l, codes = run_and_get_code(fn)
R["compiled_loss0"] = l.item()

def gsum(gm):
    c = collections.Counter()
    for n in gm.graph.nodes:
        if n.op == "call_function":
            c[str(getattr(n.target, "__name__", n.target))] += 1
    return {"nodes": len(gm.graph.nodes), "calls": sum(c.values()), "by_op": c.most_common()}

fwg = [g for g, b in cap if not b][0]; bwg = [g for g, b in cap if b][0]
R["aot"] = {"fwd": gsum(fwg), "bwd": gsum(bwg)}
pnames = [n for n, _ in m.named_parameters()]
saved, seen = [], set()
for n in bwg.graph.nodes:
    if n.op != "placeholder" or n.name.startswith("tangents"):
        continue
    v = n.meta.get("val")
    if not isinstance(v, torch.Tensor):
        continue
    sid = id(v.untyped_storage()) if False else None
    try:
        sid = v.untyped_storage()._cdata
    except Exception:
        sid = n.name
    kind = "param" if n.name.startswith("primals_") and v.dim() >= 1 and n.name != "primals_" + str(len(list(fwg.graph.nodes))) else "act"
    saved.append({"name": n.name, "shape": list(v.shape), "bytes": nbytes(v), "storage_bytes": v.untyped_storage().nbytes(),
                  "new_storage": sid not in seen})
    seen.add(sid)
R["aot"]["saved"] = saved
R["codes_len"] = [len(c) for c in codes]
R["inductor"] = []
for c in codes:
    launches = parse_wrapper(c)
    names = sorted({l["name"] for l in launches if l["kind"] == "fused"}, key=lambda n: int(re.findall(r"\d+$", n)[0]) if re.findall(r"\d+$", n) else 0)
    R["inductor"].append({"launches": launches, "kernels": names, "n_kernel_defs": len(names),
                          "omp": c.count("#pragma omp parallel"), "lines": c.count("\n")})
# keep one generated kernel per graph, verbatim (the first block's add + LayerNorm and the GELU)
keep = {}
for gi, c in enumerate(codes):
    for nm in R["inductor"][gi]["kernels"]:
        keep[("fwd:" if gi == 0 else "bwd:") + nm] = clean(kernel_source(c, nm))
R["kernel_src"] = keep if dev == "cpu" else {}   # MPS kernels stay in code_mps_*.py.txt
open(os.path.join(INP, f"code_{dev}_fwd.py.txt"), "w").write(clean(codes[0]))
open(os.path.join(INP, f"code_{dev}_bwd.py.txt"), "w").write(clean(codes[1]) if len(codes) > 1 else "")

# ---- three training steps, eager vs compiled: same losses? ----
def run(compiled):
    torch._dynamo.reset()
    mm = make_model(cfg, dev); opt = make_optimizer(mm)
    f = torch.compile(mm) if compiled else mm
    out = []
    for s in range(3):
        xb, yb = get_batch(cfg, s, dev)
        _, lo = f(xb, yb); lo.backward(); opt.step(); opt.zero_grad(set_to_none=True); out.append(lo.item())
    return out
R["losses"] = {"eager": run(False), "compiled": run(True)}
save(f"model_{dev}.json", R)
print(R["eager"]["fwd_calls"], R["eager"]["bwd_calls"], R["dynamo"]["ops_per_graph"], R["guards"]["total"],
      R["aot"]["fwd"]["calls"], R["aot"]["bwd"]["calls"], len(saved), [len(i["launches"]) for i in R["inductor"]], R["losses"])
