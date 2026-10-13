"""torch.compile's activation memory budget (torch._functorch.config.activation_memory_budget, 2.14.1 L202) on the
running example's larger variant, CPU: bytes the compiled forward saves for backward and the number of ATen
calls in the backward graph, for budgets 1.0 (default) down to 0.0 (like checkpointing everything). Deterministic.
Also eager plain and eager full checkpointing for reference.
    python budget.py -> inputs/budget.json
"""
import sys, warnings
import torch, torch._dynamo
import torch._functorch.config as fc
import common
from variants import forward
warnings.filterwarnings("ignore")
torch.set_num_threads(4)


def saved(fn, skip):
    seen, tot, n = set(skip), [0], [0]
    def pack(t):
        s = t.untyped_storage(); p = s.data_ptr()
        if p not in seen:
            seen.add(p); tot[0] += s.nbytes(); n[0] += 1
        return t
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
        out = fn()
    return out, tot[0], n[0]


def run(budget):
    c = common.cfg("big"); m = common.make_model(c); x, y = common.get_batch(c, 1)
    params = {p.untyped_storage().data_ptr() for p in m.parameters()}
    if budget is None:
        f = lambda: m(x, y)[1]
    elif budget == "ckpt":
        f = lambda: forward(m, x, y, "ckpt")
    else:
        torch._dynamo.reset(); fc.activation_memory_budget = budget
        cm = torch.compile(m); cm(x, y)[1].backward(); m.zero_grad(set_to_none=True)
        f = lambda: cm(x, y)[1]
    skip = params | {x.untyped_storage().data_ptr(), y.untyped_storage().data_ptr()}   # parameters and batch are not activations
    loss, b, n = saved(f, skip)
    loss.backward()
    return {"budget": budget, "saved_activation_bytes": b, "saved_tensors": n, "loss": round(float(loss), 6)}


if __name__ == "__main__":
    out = []
    for b in (None, "ckpt", 1.0, 0.5, 0.2, 0.0):
        r = run(b); out.append(r); print(r, file=sys.stderr)
    fc.activation_memory_budget = 1.0
    common.dump("budget.json", {"env": common.env(), "runs": out})
