"""Compiled autograd on the running example (CPU): the forward and backward of one training step compiled with and without
torch._dynamo.config.compiled_autograd, with and without a gradient hook; graphs captured, what the backward graph holds,
gradients against eager. Deterministic. Usage: PY ca.py -> ../inputs/ca.json"""
import collections
from common import *
from torch._dynamo.utils import counters
import torch._dynamo.config as dc
torch.set_num_threads(4)
cfg = GPTConfig()
x, y = get_batch(cfg, 0)

def eager_grads(hook):
    m = make_model(cfg)
    if hook:
        m.blocks[0].mlp.fc.weight.register_hook(lambda g: g * 0.5)
    _, loss = m(x, y); loss.backward()
    return {n: p.grad.clone() for n, p in m.named_parameters()}, float(loss)

def run(ca, hook):
    torch._dynamo.reset(); counters.clear()
    m = make_model(cfg)
    if hook:
        m.blocks[0].mlp.fc.weight.register_hook(lambda g: g * 0.5)
    graphs = []
    def be(gm, ex):
        from torch._inductor.compile_fx import compile_fx
        ops = [n for n in gm.graph.nodes if n.op == "call_function"]
        graphs.append({"name": gm.__class__.__name__, "ops": len(ops), "inputs": sum(1 for n in gm.graph.nodes if n.op == "placeholder"),
                       "top": dict(collections.Counter(str(getattr(n.target, "__name__", n.target)) for n in ops).most_common(8))})
        return compile_fx(gm, ex)
    def step(m, x, y):
        _, loss = m(x, y)
        loss.backward()
        return loss
    old = dc.compiled_autograd
    dc.compiled_autograd = ca
    try:
        with logs(compiled_autograd=True) as h, quiet():
            c = torch.compile(step, backend=be)
            loss = c(m, x, y)
    finally:
        dc.compiled_autograd = old
    ref, ref_loss = eager_grads(hook)
    diff = max(float((p.grad - ref[n]).abs().max()) for n, p in m.named_parameters())
    ca_msgs = [msg for k, msg in h.recs if "compiled_autograd" in k]
    return {"graphs": graphs, "max_grad_diff": diff, "loss": float(loss), "ref_loss": ref_loss,
            "counters": {k: dict(v) for k, v in counters.items() if k in ("compiled_autograd", "stats")},
            "ca_log_head": [clean(mm)[:600] for mm in ca_msgs[:2]], "ca_log_count": len(ca_msgs)}
R = {"torch": torch.__version__, "runs": {}}
for ca in (False, True):
    for hook in (False, True):
        k = f"{'ca' if ca else 'aot'}_{'hook' if hook else 'nohook'}"
        R["runs"][k] = run(ca, hook)
        print(k, [(g["ops"], g["inputs"]) for g in R["runs"][k]["graphs"]], R["runs"][k]["max_grad_diff"], R["runs"][k]["counters"].get("compiled_autograd"))
save("ca.json", R)
