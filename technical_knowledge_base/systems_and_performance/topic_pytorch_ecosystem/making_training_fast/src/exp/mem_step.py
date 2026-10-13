"""Memory of one training step, by category, for the running example and its larger variant, under each way
of running the forward (plain, full checkpointing, two selective policies, fused linear + cross-entropy).
Deterministic (no timing): live bytes from PyTorch's memory profiler, saved activations from saved_tensors_hooks,
ATen calls per phase from a TorchDispatchMode. CPU, float32, torch 2.14.1.
    python mem_step.py            -> inputs/mem_step.json
"""
import sys, torch
from torch.utils._python_dispatch import TorchDispatchMode
import common
from variants import forward

torch.set_num_threads(4)
CONFIGS = {"small": {}, "big": {}, "big_v50k": {"vocab_size": 50257}}
HOWS = ["plain", "ckpt", "sac_mm", "sac_attn", "lce_ref", "lce"]


class Count(TorchDispatchMode):
    def __init__(self):
        super().__init__(); self.n = 0; self.ops = {}
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        self.n += 1; k = str(func.overloadpacket.__name__); self.ops[k] = self.ops.get(k, 0) + 1
        return func(*args, **(kwargs or {}))


def saved_bytes(model, x, y, how):
    seen, tot = set(), [0]
    params = {p.untyped_storage().data_ptr() for p in model.parameters()}
    def pack(t):
        s = t.untyped_storage(); p = s.data_ptr()
        if p not in seen and p not in params and p != x.untyped_storage().data_ptr() and p != y.untyped_storage().data_ptr():
            seen.add(p); tot[0] += s.nbytes()
        return t
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
        loss = forward(model, x, y, how)
    return loss, tot[0]


def one(cname, how):
    c = common.cfg("small" if cname == "small" else "big", **CONFIGS[cname])
    m = common.make_model(c); opt = common.make_optimizer(m)
    x0, y0 = common.get_batch(c, 0); forward(m, x0, y0, how).backward(); opt.step(); opt.zero_grad(set_to_none=True)
    x, y = common.get_batch(c, 1)
    # saved activations of the step's forward (unique storages, parameters and batch excluded)
    loss, sb = saved_bytes(m, x, y, how); del loss
    # ATen calls per phase
    cnt = {}
    for ph in ("fwd", "bwd", "opt"):
        pass
    with Count() as cf:
        l = forward(m, x, y, how)
    with Count() as cb:
        l.backward()
    with Count() as co:
        opt.step()
    opt.zero_grad(set_to_none=True)
    lv = float(l); del l
    # memory timeline of one full step (fresh step on the same batch after the counted one)
    def step():
        with torch.profiler.record_function("fst:fwd"):
            l = forward(m, x, y, how)
        with torch.profiler.record_function("fst:bwd"):
            l.backward()
        with torch.profiler.record_function("fst:opt"):
            opt.step()
        with torch.profiler.record_function("fst:zero"):
            opt.zero_grad(set_to_none=True)
        return float(l)
    l2, mem = common.mem_timeline(step)
    P = common.n_params(m)
    return {"config": cname, "how": how, "cfg": {k: getattr(c, k) for k in ("n_layer", "d_model", "n_head", "block_size", "batch_size", "vocab_size")},
            "params": P, "loss_counted_step": round(lv, 6), "loss_profiled_step": round(l2, 6), "saved_bytes": sb,
            "calls": {"fwd": cf.n, "bwd": cb.n, "opt": co.n}, "bwd_ops": dict(sorted(cb.ops.items(), key=lambda kv: -kv[1])[:14]),
            "fwd_ops": dict(sorted(cf.ops.items(), key=lambda kv: -kv[1])[:14]), "mem": mem}


if __name__ == "__main__":
    out = {"env": common.env(), "runs": []}
    for cname in CONFIGS:
        for how in HOWS:
            if cname == "big_v50k" and how not in ("plain", "lce_ref", "lce", "ckpt"):
                continue
            r = one(cname, how); out["runs"].append(r)
            print(cname, how, r["params"], r["saved_bytes"], r["calls"], r["mem"]["peak_total"], r["mem"]["start_total"], file=sys.stderr)
    common.dump("mem_step.json", out)
