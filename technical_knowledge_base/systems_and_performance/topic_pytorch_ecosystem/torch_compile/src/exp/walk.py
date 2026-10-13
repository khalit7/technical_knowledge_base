"""Dynamo, instruction by instruction, on the running example's MLP (block 0): what CPython runs eagerly at each
bytecode instruction (ATen calls, recorded with sys.settrace opcode events + a TorchDispatchMode) against what Dynamo
does at the same instruction (its stack of VariableTrackers, FX nodes added, guards). Deterministic.
Usage: PY walk.py -> ../inputs/walk.json"""
import dis, sys as _sys, re
from common import *
from torch.utils._python_dispatch import TorchDispatchMode
import torch._dynamo.symbolic_convert as sc
torch.set_num_threads(4)
cfg = GPTConfig(); m = make_model(cfg); mlp = m.blocks[0].mlp
x = torch.randn(8, 64, 256, generator=torch.Generator().manual_seed(0))
R = {"torch": torch.__version__, "python": _sys.version.split()[0]}

# ---- eager: which bytecode instruction of which forward() is executing when each ATen call happens
class Log(TorchDispatchMode):
    def __init__(s): super().__init__(); s.calls = []
    def __torch_dispatch__(s, func, types, args=(), kwargs=None):
        out = func(*args, **(kwargs or {}))
        f = _sys._getframe(1); at = None
        while f is not None:
            if f.f_code.co_name == "forward":
                at = [f.f_code.co_filename.split("/")[-1], f.f_lasti]; break
            f = f.f_back
        s.calls.append({"at": at, "op": str(func), "shape": list(out.shape) if isinstance(out, torch.Tensor) else None})
        return out
lg = Log()
with lg:
    ye = mlp(x)
R["eager_calls"] = lg.calls

# ---- Dynamo: patch step() to record each instruction it symbolically executes
steps = []
orig = sc.InstructionTranslatorBase.step
def short(v):
    s = repr(v)
    s = re.sub(r"LazyVariableTracker\((un)?realized: ", "Lazy(", s)
    return clean(s)[:160]
def step(self):
    ip = self.instruction_pointer
    if ip is None or ip >= len(self.instructions):
        return orig(self)
    inst = self.instructions[ip]
    depth, p = 0, getattr(self, "parent", None)
    while p is not None:
        depth += 1; p = getattr(p, "parent", None)
    g = self.output.graph
    names0 = {n.name for n in g.nodes}
    before = [short(v) for v in self.stack]
    r = orig(self)
    nodes = [n for n in g.nodes if n.name not in names0]
    steps.append({"fn": self.f_code.co_name, "depth": depth, "off": inst.offset, "op": inst.opname,
                  "arg": clean(repr(inst.argval))[:80], "stack_before": before, "stack_after": [short(v) for v in self.stack],
                  "new_nodes": [{"name": n.name, "op": n.op, "target": clean(getattr(n.target, "__name__", str(n.target)))} for n in nodes],
                  "guards_total": len(self.output.guards)})
    return r
sc.InstructionTranslatorBase.step = step
torch._dynamo.reset()
with logs(bytecode=True, guards=True, graph_code=True) as h:
    c = torch.compile(mlp, backend="eager")
    yc = c(x)
sc.InstructionTranslatorBase.step = orig
R["steps"] = steps
R["max_diff"] = float((yc - ye).abs().max())
R["logs"] = {}
for k, msg in h.recs:
    R["logs"].setdefault(k, []).append(msg)
R["dis"] = {name: [{"off": i.offset, "op": i.opname, "arg": clean(repr(i.argval))[:60], "line": i.starts_line if isinstance(i.starts_line, int) else None}
                   for i in dis.get_instructions(fn)] for name, fn in [("MLP.forward", type(mlp).forward), ("Linear.forward", torch.nn.Linear.forward)]}
save("walk.json", R)
print(len(steps), "steps;", len(lg.calls), "eager calls;", {k: len(v) for k, v in R["logs"].items()})
