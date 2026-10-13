"""Where a graph break inside a called function leaves the caller: the default (the break bubbles up to the top frame)
against config.nested_graph_breaks = True, for a plain call, a module call, a for loop over a ModuleList, and the
same loop unrolled. Each entry lists the compiled graphs (ops per graph). Deterministic. Usage: PY nested.py -> ../inputs/nested.json"""
import inspect
from common import *
import torch._dynamo.config as dc

class Inner(torch.nn.Module):
    def forward(self, x):
        x = x + 1
        torch._dynamo.graph_break()
        return x * 2
def inner(x):
    x = x + 1
    torch._dynamo.graph_break()
    return x * 2
def outer(x):
    return inner(x.sin()).cos()
class Outer(torch.nn.Module):
    def __init__(s): super().__init__(); s.i = Inner()
    def forward(self, x): return self.i(x.sin()).cos()
class Loop(torch.nn.Module):
    def __init__(s): super().__init__(); s.l = torch.nn.ModuleList([Inner(), Inner()])
    def forward(self, x):
        x = x.sin()
        for m in self.l:
            x = m(x)
        return x.cos()
class Unrolled(torch.nn.Module):
    def __init__(s): super().__init__(); s.l = torch.nn.ModuleList([Inner(), Inner()])
    def forward(self, x):
        x = x.sin()
        x = self.l[0](x)
        x = self.l[1](x)
        return x.cos()
CASES = [("call", "function calling a function", outer), ("module", "module calling a module", Outer()), ("loop", "for loop over a ModuleList", Loop()), ("unrolled", "the same loop unrolled", Unrolled())]
R = {"src": inspect.getsource(Inner) + "\n" + inspect.getsource(Loop) + "\n" + inspect.getsource(Unrolled), "cases": []}
for key, label, f in CASES:
    row = {"key": key, "label": label}
    for nested in (False, True):
        dc.nested_graph_breaks = nested
        torch._dynamo.reset(); gs = []
        def be(gm, ex):
            gs.append([n.target.__name__ if callable(n.target) else str(n.target) for n in gm.graph.nodes if n.op in ("call_function", "call_method")]); return gm.forward
        with quiet():
            torch.compile(f, backend=be)(torch.randn(3))
        row["nested" if nested else "default"] = gs
    dc.nested_graph_breaks = False
    R["cases"].append(row); print(row)
save("nested.json", R)
