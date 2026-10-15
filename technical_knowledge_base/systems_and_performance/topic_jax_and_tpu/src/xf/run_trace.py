"""Tracing: the running example's attention and MLP before and after tracing into a jaxpr, with each
equation mapped to the Python line that produced it; tracer types under each transformation; jaxpr size
of the Python layer loop against lax.scan; errors raised by Python control flow on tracers.
Output: out/trace.json"""
import inspect
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax._src import source_info_util as siu  # noqa: E402
from jax._src import core as jcore  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

cfg = C.CFG
sd = dict(X.np.load(C.path("data", "init_torch.npz")))
params = MJ.from_torch(sd, cfg)
xb, yb = C.batch(0)
B, T, D = cfg["batch"], cfg["ctx"], cfg["d_model"]
xact = jnp.ones((B, T, D), jnp.float32)


def traced(fn, fname, *args):
    """jaxpr of fn(*args), split into equations, each mapped to a line of the function named fname."""
    src, start = inspect.getsourcelines(getattr(MJ, fname))
    cj = jax.make_jaxpr(fn)(*args)
    head, eqtexts, foot = X.split_jaxpr(str(cj))
    assert len(eqtexts) == len(cj.jaxpr.eqns), (len(eqtexts), len(cj.jaxpr.eqns))
    lines, inner = [], []
    mj_file = MJ.__file__
    mj_src = open(mj_file).read().splitlines()
    for e in cj.jaxpr.eqns:
        ln = None
        frs = list(siu.user_frames(e.source_info.traceback))
        for fr in frs:
            if fr.function_name == fname:
                ln = fr.start_line - start
                break
        ins = next((fr for fr in frs if fr.file_name == mj_file), None)   # innermost frame in model_jax.py
        inner.append(None if ins is None or ins.function_name == fname else
                     ins.function_name + ": " + mj_src[ins.start_line - 1].strip().split("  #")[0])
        lines.append(ln)
    return {
        "fn": fname,
        "src": [s.rstrip("\n") for s in src],
        "src_start": start,
        "head": head,
        "eqns": eqtexts,
        "prims": [e.primitive.name for e in cj.jaxpr.eqns],
        "line": lines,
        "inner": inner,
        "foot": foot,
        "n_eqns": len(cj.jaxpr.eqns),
    }


out = {"versions": X.versions(), "shapes": {"x": [B, T, D]}}
out["attention"] = traced(lambda p, x: MJ.attention(p, x, cfg["n_heads"]), "attention", params["blocks"][0]["attn"], xact)
out["mlp"] = traced(MJ.mlp, "mlp", params["blocks"][0]["mlp"], xact)
out["linear_src"] = [s.rstrip("\n") for s in inspect.getsourcelines(MJ.linear)[0]]
out["layer_norm_src"] = [s.rstrip("\n") for s in inspect.getsourcelines(MJ.layer_norm)[0]]
print("attention eqns", out["attention"]["n_eqns"], "mlp eqns", out["mlp"]["n_eqns"])


# ---- tracer types under each transformation
seen = {}


def probe(tag):
    def f(x):
        seen[tag] = type(x).__name__ + ": " + str(x)
        return (x * 2.0).sum()
    return f


jax.jit(probe("jit"))(jnp.ones(3))
jax.grad(probe("grad"))(jnp.ones(3))
jax.vmap(probe("vmap"))(jnp.ones((5, 3)))
jax.make_jaxpr(probe("make_jaxpr"))(jnp.ones(3))
jax.jit(jax.vmap(jax.grad(probe("jit(vmap(grad))"))))(jnp.ones((5, 3)))
probe("no transformation")(jnp.ones(3))
out["tracers"] = {k: X.scrub(v) for k, v in seen.items()}
print(out["tracers"])

# abstract value of an array and of a tracer
out["typeof"] = {"array": str(jax.typeof(jnp.ones((32, 128)))), "array_bf16": str(jax.typeof(jnp.ones((2, 3), jnp.bfloat16))),
                 "py_float": str(jax.typeof(2.0)), "py_int": str(jax.typeof(3))}

# ---- jaxpr size: Python loop over layers (unrolled) against lax.scan, for growing depth
def count_eqns(jaxpr):
    n = 0
    for e in jaxpr.eqns:
        n += 1
        for sub in jcore.jaxprs_in_params(e.params):
            n += count_eqns(sub)
    return n


rows = []
key = jax.random.key(0)
for L in (1, 2, 4, 8, 16, 32):
    c = dict(cfg, n_layers=L)
    p = MJ.init_params(c, key)
    sp = MJ.stack_blocks(p)
    t0 = time.perf_counter(); cu = jax.make_jaxpr(lambda p, x: MJ.apply(p, x, c))(p, xb); tu = time.perf_counter() - t0
    t0 = time.perf_counter(); cs = jax.make_jaxpr(lambda p, x: MJ.apply_scan(p, x, c))(sp, xb); ts = time.perf_counter() - t0
    rows.append({"layers": L, "unrolled_top": len(cu.jaxpr.eqns), "unrolled_total": count_eqns(cu.jaxpr),
                 "scan_top": len(cs.jaxpr.eqns), "scan_total": count_eqns(cs.jaxpr),
                 "trace_s_unrolled": round(tu, 4), "trace_s_scan": round(ts, 4)})
    print(rows[-1])
out["loop_vs_scan"] = rows

# whole forward and loss gradient of the running example (4 layers), unrolled
cf = jax.make_jaxpr(lambda p, x: MJ.apply(p, x, cfg))(params, xb)
cg = jax.make_jaxpr(jax.value_and_grad(lambda p, x, y: MJ.loss_fn(p, x, y, cfg)))(params, xb, yb)
from collections import Counter  # noqa: E402
out["forward_eqns"] = len(cf.jaxpr.eqns)
out["value_and_grad_eqns"] = len(cg.jaxpr.eqns)
out["forward_prims"] = Counter(e.primitive.name for e in cf.jaxpr.eqns).most_common()
out["vg_prims"] = Counter(e.primitive.name for e in cg.jaxpr.eqns).most_common()
print("forward", out["forward_eqns"], "value_and_grad", out["value_and_grad_eqns"])

# ---- Python control flow on tracers: the errors, and the structured replacements
def f_if(x):
    if x.sum() > 0:
        return x
    return -x


def f_where(x):
    return jnp.where(x.sum() > 0, x, -x)


def f_cond(x):
    return jax.lax.cond(x.sum() > 0, lambda v: v, lambda v: -v, x)


def f_int(x):
    return jnp.zeros(int(x.sum()))


out["cf_errors"] = {
    "if_under_jit": X.err(lambda: jax.jit(f_if)(jnp.ones(3))),
    "int_under_jit": X.err(lambda: jax.jit(f_int)(jnp.ones(3))),
    "if_under_grad": X.err(lambda: jax.grad(lambda x: f_if(x).sum())(jnp.ones(3))),
}
out["cf_jaxprs"] = {"where": str(jax.make_jaxpr(f_where)(jnp.ones(3))), "cond": str(jax.make_jaxpr(f_cond)(jnp.ones(3)))}
out["cf_values"] = {"if_no_jit": X.np.asarray(f_if(jnp.array([-1.0, -2.0, 0.5]))).tolist(),
                    "cond_jit": X.np.asarray(jax.jit(f_cond)(jnp.array([-1.0, -2.0, 0.5]))).tolist()}

# loops: Python for (unrolled), fori_loop, scan, while_loop on the same computation
def body(i, c):
    return c * 0.5 + i


def py_loop(c):
    for i in range(10):
        c = body(i, c)
    return c


def fori(c):
    return jax.lax.fori_loop(0, 10, body, c)


def scan(c):
    def step(c, i):
        return body(i, c), None
    return jax.lax.scan(step, c, jnp.arange(10))[0]


def wl(c):
    return jax.lax.while_loop(lambda s: s[0] < 10, lambda s: (s[0] + 1, body(s[0], s[1])), (0, c))[1]


x0 = jnp.float32(3.0)
loops = {}
for nm, f in (("python for", py_loop), ("lax.fori_loop", fori), ("lax.scan", scan), ("lax.while_loop", wl)):
    cj = jax.make_jaxpr(f)(x0)
    loops[nm] = {"top": len(cj.jaxpr.eqns), "total": count_eqns(cj.jaxpr), "value": float(jax.jit(f)(x0)),
                 "prims": [e.primitive.name for e in cj.jaxpr.eqns],
                 "grad": X.first_lines(X.err(lambda f=f: jax.grad(f)(x0)), 2) or float(jax.grad(f)(x0))}
out["loops"] = loops
print(loops)
out["fori_jaxpr"] = str(jax.make_jaxpr(fori)(x0))
X.save("trace", out)
