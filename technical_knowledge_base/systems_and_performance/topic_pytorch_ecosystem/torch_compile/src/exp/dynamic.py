"""Dynamic shapes on the running example: the same sequence of sequence lengths under each strategy (default automatic
dynamic, dynamic=False, dynamic=True, mark_dynamic with bounds, mark_unbacked), with every compile and the guard that
failed; the symbolic shape guards of the dynamic graph; unbacked symbols from .item() and nonzero(); the recompile
limit. Forward only, eval mode, Inductor on CPU. Deterministic. Usage: PY dynamic.py -> ../inputs/dynamic.json"""
import re
from common import *
import torch._dynamo.config as dc
torch.set_num_threads(4)
cfg = GPTConfig()
R = {"torch": torch.__version__}
SEQ = [64, 32, 48, 16, 1, 64]

def batch(T, B=8):
    x, y = get_batch(cfg, 0)
    return x[:B, :T].contiguous()

class Counter:
    def __init__(s): s.n = 0; s.graph_inputs = []
    def __call__(s, gm, ex):
        s.n += 1
        s.graph_inputs.append([str(getattr(v, "shape", v)) for v in ex][:2])
        from torch._inductor.compile_fx import compile_fx
        return compile_fx(gm, ex)

def run_seq(strategy):
    torch._dynamo.reset()
    m = make_model(cfg).eval(); ctr = Counter()
    kw = {"backend": ctr}
    if strategy == "static": kw["dynamic"] = False
    if strategy == "dynamic_true": kw["dynamic"] = True
    c = torch.compile(m, **kw)
    rows = []
    with logs(recompiles=True, graph_breaks=True) as h, torch.no_grad():
        for T in SEQ:
            x = batch(T)
            if strategy == "mark_dynamic":
                torch._dynamo.mark_dynamic(x, 1, min=2, max=64)
            if strategy == "mark_unbacked":
                torch._dynamo.decorators.mark_unbacked(x, 1)
            n0 = ctr.n; err = ""
            try:
                with quiet():
                    out = c(x)
            except Exception as e:
                err = clean(type(e).__name__ + ": " + str(e).split("\n")[0])[:240]
            rows.append({"T": T, "compiled": ctr.n - n0, "total": ctr.n, "error": err})
    reasons = [msg for k, msg in h.recs if "recompiles" in k]
    breaks = []
    for k, msg in h.recs:
        if "graph_breaks" in k:
            ls = [l.strip() for l in msg.split("\n") if l.strip()]
            loc = next((l for l in ls if l.startswith("Graph break in user code")), "")
            expl = next((l for l in ls if l.startswith("Explanation:")), "")
            reason = next((l for l in ls if l.startswith("Graph Break Reason:")), "")
            breaks.append({"where": loc[:200], "reason": reason[:200], "explanation": expl[:300]})
    return {"calls": rows, "compiles": ctr.n, "graph_inputs": ctr.graph_inputs, "graph_breaks": breaks,
            "recompile_reasons": [re.sub(r"\s+", " ", r)[:400] for r in reasons]}

R["seq"] = SEQ
R["strategies"] = {}
for s in ["default", "static", "dynamic_true", "mark_dynamic", "mark_unbacked"]:
    R["strategies"][s] = run_seq(s)
    print(s, [(r["T"], r["compiled"], r["error"][:60]) for r in R["strategies"][s]["calls"]])

# symbolic guards of the default strategy's dynamic graph (after T 64 -> 32)
torch._dynamo.reset()
m = make_model(cfg).eval(); c = torch.compile(m)
with torch.no_grad(), quiet():
    c(batch(64))
    with logs(guards=True, dynamic=logging.DEBUG) as h:
        c(batch(32))
glines = []
for k, msg in h.recs:
    for l in msg.split("\n"):
        if ("size()" in l or "s0" in l or "s1" in l or "s2" in l) and ("GUARD" in l or "<=" in l or "==" in l or "Eq" in l or "create_symbol" in l or "set_replacement" in l or "eval" in l):
            glines.append(re.sub(r"\s+", " ", l.strip())[:300])
R["symbolic_guard_lines"] = glines[:60]
print(len(glines), glines[:8])

# unbacked symbols: .item() used as a size, and nonzero()
def trunc(idx, lengths):
    n = lengths.max().item()
    return idx[:, :n].sum(dim=1)
def trunc_checked(idx, lengths):
    n = lengths.max().item()
    torch._check(n >= 0); torch._check(n <= idx.shape[1])
    return idx[:, :n].sum(dim=1)
def nz(x):
    i = torch.nonzero(x > 0)
    return i.shape[0] * 1.0 + x.sum()
UB = {}
for name, f, conf in [("item_default", trunc, {}), ("item_capture", trunc, {"capture_scalar_outputs": True}),
                      ("item_capture_checked", trunc_checked, {"capture_scalar_outputs": True}),
                      ("nonzero_default", nz, {}), ("nonzero_capture", nz, {"capture_dynamic_output_shape_ops": True})]:
    for k, v in conf.items(): setattr(dc, k, v)
    torch._dynamo.reset()
    graphs = []
    def be(gm, ex):
        graphs.append(clean(gm.print_readable(print_output=False, include_stride=False, include_device=False, colored=False))); return gm.forward
    err = ""
    try:
        with quiet():
            torch.compile(f, backend=be, fullgraph=False)(*( (batch(64), torch.tensor([10, 40, 30])) if "item" in name else (torch.randn(16),)))
    except Exception as e:
        err = clean(type(e).__name__ + ": " + str(e).split("\n")[0])[:300]
    with quiet():
        torch._dynamo.reset()
        ex = torch._dynamo.explain(f)(*((batch(64), torch.tensor([10, 40, 30])) if "item" in name else (torch.randn(16),)))
    UB[name] = {"graphs": len(graphs), "breaks": ex.graph_break_count, "break_reasons": [clean(b.reason).split("\n")[0][:200] for b in ex.break_reasons],
                "graph_code": [g[:2500] for g in graphs], "error": err}
    for k in conf: setattr(dc, k, False)
    print(name, len(graphs), ex.graph_break_count, err[:100])
R["unbacked"] = UB

# the recompile limit: a Python string argument with ten different values
def scaled(x, mode):
    return x * 2 if mode.startswith("a") else x * 3
torch._dynamo.reset(); ctr = [0]
def be2(gm, ex):
    ctr[0] += 1; return gm.forward
c = torch.compile(scaled, backend=be2)
per = []
hw = Capture(); lgc = logging.getLogger("torch._dynamo.convert_frame"); lgc.addHandler(hw)
for i in range(10):
    n0 = ctr[0]; c(torch.ones(4), "a" + str(i)); per.append(ctr[0] - n0)
lgc.removeHandler(hw)
R["limit"] = {"per_call": per, "recompile_limit": dc.recompile_limit,
              "warning": [m for k, m in hw.recs if "recompile_limit" in m][:1]}
print("limit", per)
save("dynamic.json", R)
