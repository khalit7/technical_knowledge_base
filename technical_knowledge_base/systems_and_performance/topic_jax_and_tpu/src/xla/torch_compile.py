"""The PyTorch twin under eager mode and under torch.compile (TorchDynamo + Inductor), CPU, for comparison with jit + XLA.

1. Eager: one training step (zero_grad, forward, loss, backward, clip, AdamW, scheduler) under torch.profiler:
   how many aten operators run, and how many of them are leaves (do the work themselves).
2. torch.compile of forward + loss, then backward: graphs captured, graph breaks, FX nodes, Inductor kernels generated,
   first-call (compile) time and steady time.
3. A data-dependent branch: torch.compile breaks the graph and keeps going; jax.jit refuses (ConcretizationTypeError).
Output: src/xla/out/torch_compile.json. Timings: rough, labelled by the page.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702
import collections
import statistics
import time

import numpy as np
import torch

import xc_common as X
import model_torch as MT

torch.set_num_threads(4)
C = X.C
cfg = C.CFG
res = {"versions": dict(X.versions(), torch=torch.__version__)}


def fresh():
    m = MT.make_model(cfg)
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    m.load_state_dict({k: torch.from_numpy(v) for k, v in sd.items()})
    opt, sched = MT.make_optimizer(m, cfg, C.lr_at)
    return m, opt, sched


xb, yb = (torch.from_numpy(a).long() for a in C.batch(0))

# ---- 1. eager step under the profiler
m, opt, sched = fresh()
for _ in range(3):
    MT.train_step(m, opt, sched, xb, yb, cfg["clip"])
from torch.profiler import ProfilerActivity, profile, record_function  # noqa: E402

with profile(activities=[ProfilerActivity.CPU]) as prof:
    opt.zero_grad(set_to_none=True)
    with record_function("forward"):
        loss = MT.loss_fn(m, xb, yb)
    with record_function("backward"):
        loss.backward()
    with record_function("optimizer"):
        torch.nn.utils.clip_grad_norm_(m.parameters(), cfg["clip"])
        opt.step()
        sched.step()
ev = [e for e in prof.events() if e.name.startswith("aten::")]


# view and metadata operators move no data: leave them out of the "kernels" count
VIEWS = {"aten::as_strided", "aten::view", "aten::resolve_conj", "aten::resolve_neg", "aten::empty", "aten::empty_strided",
         "aten::detach", "aten::t", "aten::transpose", "aten::reshape", "aten::_reshape_alias", "aten::expand", "aten::alias",
         "aten::unsqueeze", "aten::squeeze", "aten::slice", "aten::select", "aten::permute", "aten::lift_fresh",
         "aten::_unsafe_view", "aten::unbind", "aten::split", "aten::chunk", "aten::narrow", "aten::numpy_T",
         "aten::empty_like", "aten::zeros_like", "aten::_local_scalar_dense", "aten::item", "aten::to", "aten::contiguous",
         "aten::expand_as", "aten::view_as", "aten::split_with_sizes", "aten::flatten", "aten::is_nonzero"}
def is_leaf(e):   # does the work itself: no child operator that computes (views and allocations do not count)
    return not any(c.name.startswith("aten::") and c.name not in VIEWS for c in e.cpu_children)


def phase(e):
    p = e
    while p is not None:
        if p.name in ("forward", "backward", "optimizer"):
            return p.name
        p = p.cpu_parent
    return "backward" if e.thread != ev[0].thread else "other"


leaves_all = [e for e in ev if is_leaf(e)]
leaves = [e for e in leaves_all if e.name not in VIEWS]
res["eager"] = {"aten_ops": len(ev), "leaf_ops_all": len(leaves_all), "leaf_ops": len(leaves),
                "views_left_out": sorted(VIEWS),
                "leaf_by_phase": dict(collections.Counter(phase(e) for e in leaves)),
                "top_leaf_ops": dict(collections.Counter(e.name for e in leaves).most_common(12)),
                "foreach_ops": sum(1 for e in leaves if "_foreach_" in e.name)}
print("eager", res["eager"])

# ---- 2. torch.compile of forward + loss
import torch._dynamo as dynamo  # noqa: E402
from torch._inductor import metrics  # noqa: E402

m, opt, sched = fresh()
fn = lambda x, y: MT.loss_fn(m, x, y)  # noqa: E731
ex = dynamo.explain(fn)(xb, yb)
res["dynamo_explain"] = {"graphs": ex.graph_count, "graph_breaks": ex.graph_break_count,
                         "ops_captured": ex.op_count}
print("explain", res["dynamo_explain"])
dynamo.reset()
metrics.reset()
cfn = torch.compile(fn)
t0 = time.perf_counter()
l = cfn(xb, yb)
l.backward()
first = time.perf_counter() - t0
res["inductor"] = {"generated_kernels": int(metrics.generated_kernel_count), "first_call_s": first}
times = []
for _ in range(7):
    m.zero_grad(set_to_none=True)
    t0 = time.perf_counter()
    cfn(xb, yb).backward()
    times.append(time.perf_counter() - t0)
eager_t = []
for _ in range(7):
    m.zero_grad(set_to_none=True)
    t0 = time.perf_counter()
    fn(xb, yb).backward()
    eager_t.append(time.perf_counter() - t0)
res["inductor"]["steady_median_s"] = statistics.median(times)
res["eager_fwd_bwd_median_s"] = statistics.median(eager_t)
res["loss_compiled_vs_eager"] = abs(float(cfn(xb, yb).detach()) - float(fn(xb, yb).detach()))
print("inductor", res["inductor"], "eager fwd+bwd", res["eager_fwd_bwd_median_s"])

# ---- 3. a data-dependent branch, both ways
code_t = '''import torch
def f(x):
    if x.sum() > 0:          # depends on the data
        return x * 2
    return x - 1
ex = torch._dynamo.explain(f)(torch.ones(4))
print("graphs:", ex.graph_count, " graph breaks:", ex.graph_break_count)
print("reason:", ex.break_reasons[0].reason.splitlines()[0])
print(torch.compile(f)(torch.ones(4)))'''
code_j = '''import jax, jax.numpy as jnp
@jax.jit
def f(x):
    if x.sum() > 0:          # depends on the data
        return x * 2
    return x - 1
try:
    f(jnp.ones(4))
except jax.errors.ConcretizationTypeError as e:
    print(type(e).__name__ + ":", str(e).splitlines()[0])
print(jax.jit(lambda x: jnp.where(x.sum() > 0, x * 2, x - 1))(jnp.ones(4)))'''
import contextlib  # noqa: E402
import io  # noqa: E402

out = {}
for k, code in (("torch", code_t), ("jax", code_j)):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(compile(code, "<%s_branch>" % k, "exec"), {"__name__": "__ex__"})
    out[k] = {"code": code, "output": X.scrub(buf.getvalue().rstrip())}
    print(k, out[k]["output"])
res["branch"] = out
X.save("torch_compile.json", res)
