"""Control-flow primitives measured: the same recurrent loop written seven ways, at three lengths;
trace, lower, compile and run time, program sizes, and whether grad, jvp and vmap work. Also cond
against select under vmap, a while_loop under vmap, and associative_scan on a linear recurrence.
Writes out/cf.json. About 5 to 10 minutes on a loaded machine.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_cf.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax import lax  # noqa: E402
from jaxpr_export import count_eqns, prim_counts  # noqa: E402

R = {"versions": J.versions(), "label": J.LABEL, "load_start": J.load1()}
D, B = 128, 32
rng = np.random.default_rng(0)
W = jnp.asarray(rng.standard_normal((D, D)) / np.sqrt(D), jnp.float32)
H0 = jnp.zeros((B, D), jnp.float32)


def cell(h, x):
    return jnp.tanh(h @ W + x)


def v_python(h, xs):
    for t in range(xs.shape[0]):
        h = cell(h, xs[t])
    return h


def v_fori_static(h, xs):
    return lax.fori_loop(0, xs.shape[0], lambda t, h: cell(h, xs[t]), h)


def v_fori_dynamic(h, xs, n):
    return lax.fori_loop(0, n, lambda t, h: cell(h, xs[t]), h)


def v_scan(h, xs):
    return lax.scan(lambda h, x: (cell(h, x), None), h, xs)[0]


def v_scan_unroll8(h, xs):
    return lax.scan(lambda h, x: (cell(h, x), None), h, xs, unroll=8)[0]


def v_while(h, xs):
    n = xs.shape[0]
    return lax.while_loop(lambda s: s[0] < n, lambda s: (s[0] + 1, cell(s[1], xs[s[0]])), (0, h))[1]


def v_map_cell(h, xs):         # lax.map: a scan with no carry; here each step uses only its own input
    return lax.map(lambda x: cell(h, x), xs)[-1]


VARIANTS = [
    ("python for", v_python, False),
    ("fori_loop, static bounds", v_fori_static, False),
    ("fori_loop, traced bound", v_fori_dynamic, True),
    ("scan", v_scan, False),
    ("scan, unroll=8", v_scan_unroll8, False),
    ("while_loop", v_while, False),
]
CODE = {
    "python for": "for t in range(n): h = cell(h, xs[t])",
    "fori_loop, static bounds": "lax.fori_loop(0, n, lambda t, h: cell(h, xs[t]), h)        # n a Python int",
    "fori_loop, traced bound": "lax.fori_loop(0, n, lambda t, h: cell(h, xs[t]), h)        # n a traced int32",
    "scan": "lax.scan(lambda h, x: (cell(h, x), None), h, xs)[0]",
    "scan, unroll=8": "lax.scan(lambda h, x: (cell(h, x), None), h, xs, unroll=8)[0]",
    "while_loop": "lax.while_loop(lambda s: s[0] < n, lambda s: (s[0] + 1, cell(s[1], xs[s[0]])), (0, h))[1]",
}


def first_line(e):
    return J.scrub(type(e).__name__ + ": " + str(e).strip().splitlines()[0])


def try_transform(fn, args, dyn):
    res = {}
    if dyn:
        g = lambda h, xs, n: fn(h, xs, n).sum()  # noqa: E731
    else:
        g = lambda h, xs: fn(h, xs).sum()  # noqa: E731
    try:
        jax.jit(jax.grad(g, argnums=1)).lower(*args).compile()
        res["grad (reverse)"] = "ok"
    except Exception as e:  # noqa: BLE001
        res["grad (reverse)"] = first_line(e)
    try:
        tang = (jnp.zeros_like(args[0]), jnp.ones_like(args[1])) + ((np.zeros((), jax.dtypes.float0),) if dyn else ())
        jax.jit(lambda *a: jax.jvp(g, a, tang)).lower(*args).compile()
        res["jvp (forward)"] = "ok"
    except Exception as e:  # noqa: BLE001
        res["jvp (forward)"] = first_line(e)
    try:
        in_axes = (0, None) + ((None,) if dyn else ())
        bargs = (jnp.stack([args[0]] * 2),) + args[1:]
        jax.jit(jax.vmap(fn, in_axes=in_axes)).lower(*bargs).compile()
        res["vmap"] = "ok"
    except Exception as e:  # noqa: BLE001
        res["vmap"] = first_line(e)
    return res


rows = []
for n in (10, 100, 1000):
    xs = jnp.asarray(rng.standard_normal((n, B, D)) * 0.1, jnp.float32)
    for name, fn, dyn in VARIANTS:
        args = (H0, xs, jnp.int32(n)) if dyn else (H0, xs)
        jf = jax.jit(fn)
        with J.Timer() as tt:
            cj = jax.make_jaxpr(fn)(*args)
        with J.Timer() as tl:
            low = jf.lower(*args)
        with J.Timer() as tc:
            comp = low.compile()
        hlo = comp.as_text()
        out = comp(*args)
        out.block_until_ready()
        runs = []
        for _ in range(5):
            t0 = time.perf_counter()
            comp(*args).block_until_ready()
            runs.append(time.perf_counter() - t0)
        ref = v_scan(*args[:2]) if name != "scan" else out
        pc = prim_counts(cj)
        row = {"variant": name, "n": n, "trace_s": tt.wall, "lower_s": tl.wall, "compile_s": tc.wall,
               "compile_cpu_s": tc.cpu, "run_ms": J.median(runs) * 1e3,
               "eqns_top": len(cj.eqns), "eqns_total": count_eqns(cj),
               "loop_prims": {k: v for k, v in pc.items() if k in ("scan", "while", "cond", "dot_general")},
               "hlo_lines": len(hlo.splitlines()), "hlo_while": hlo.count(" while("),
               "max_diff_vs_scan": float(jnp.max(jnp.abs(out - ref))), "load": J.load1()}
        if n == 10:
            row["transforms"] = try_transform(fn, args, dyn)
        rows.append(row)
        print(n, name, round(tc.wall, 2), "s compile", round(row["run_ms"], 2), "ms", flush=True)
R["loops"] = {"rows": rows, "code": CODE, "cell": "def cell(h, x):\n    return jnp.tanh(h @ W + x)      # h [32,128], W [128,128], x [32,128]",
              "jaxpr_fori_static_n10": str(jax.make_jaxpr(v_fori_static)(H0, jnp.zeros((10, B, D)))),
              "jaxpr_fori_dynamic_n10": str(jax.make_jaxpr(v_fori_dynamic)(H0, jnp.zeros((10, B, D)), jnp.int32(10)))}

# ---------------------------------------------------------------- transform support for every primitive
def tsupport(name, f, x):
    out = {}
    g = lambda v: f(v).sum()  # noqa: E731
    # every transformation applied inside jit, so loop bounds computed from x are traced, not concrete
    out["grad"] = J.err(lambda: jax.jit(jax.grad(g))(x), 1) or "ok"
    out["jvp"] = J.err(lambda: jax.jit(lambda a: jax.jvp(g, (a,), (jnp.ones_like(a),)))(x), 1) or "ok"
    out["vmap"] = J.err(lambda: jax.jit(jax.vmap(f))(jnp.stack([x, -x])), 1) or "ok"
    out["jit"] = J.err(lambda: jax.jit(f)(x), 1) or "ok"
    return out


xv = jnp.array([0.5, -1.0, 2.0])
prims = {
    "cond": lambda v: lax.cond(v.sum() > 0, jnp.sin, jnp.cos, v),
    "switch": lambda v: lax.switch(jnp.clip(v.sum().astype(jnp.int32), 0, 2), [jnp.sin, jnp.cos, jnp.tanh], v),
    "select / jnp.where": lambda v: jnp.where(v > 0, jnp.sin(v), jnp.cos(v)),
    "while_loop": lambda v: lax.while_loop(lambda s: s[0] < 3, lambda s: (s[0] + 1, jnp.sin(s[1])), (0, v))[1],
    "fori_loop (static bounds)": lambda v: lax.fori_loop(0, 3, lambda i, c: jnp.sin(c), v),
    "fori_loop (traced bound)": lambda v: lax.fori_loop(0, (v[0] * 0 + 3).astype(jnp.int32), lambda i, c: jnp.sin(c), v),
    "scan": lambda v: lax.scan(lambda c, _: (jnp.sin(c), None), v, None, length=3)[0],
    "map": lambda v: lax.map(jnp.sin, v),
    "associative_scan": lambda v: lax.associative_scan(jnp.add, v),
}
R["support"] = {k: tsupport(k, f, xv) for k, f in prims.items()}

# ---------------------------------------------------------------- cond under vmap becomes select
def heavy(h):
    for _ in range(30):
        h = jnp.tanh(h @ W)
    return h


def light(h):
    return h


def br(p, h):
    return lax.cond(p, heavy, light, h)


h1 = jnp.ones((B, D)) * 0.1
preds = jnp.zeros((8,), bool)                       # every example takes the light branch
hs = jnp.stack([h1] * 8)
f_unb = jax.jit(lambda h: jax.vmap(lambda hh: br(False, hh))(h))      # predicate not batched
f_b = jax.jit(jax.vmap(br))                                            # predicate batched
f_loop = jax.jit(lambda ps, h: jnp.stack([br(ps[i], h[i]) for i in range(8)]))
for f, a in [(f_unb, (hs,)), (f_b, (preds, hs)), (f_loop, (preds, hs))]:
    f(*a).block_until_ready()


def tm(f, *a):
    ts = []
    for _ in range(7):
        t0 = time.perf_counter()
        f(*a).block_until_ready()
        ts.append(time.perf_counter() - t0)
    return J.median(ts) * 1e3


jb = str(jax.make_jaxpr(jax.vmap(br))(preds, hs))
R["cond_vmap"] = {
    "code": "def br(p, h):\n    return lax.cond(p, heavy, light, h)     # heavy: 30 x tanh(h @ W); light: identity\n\njax.vmap(br)(preds, hs)    # preds: bool[8], all False; hs: f32[8,32,128]",
    "ms_pred_not_batched": tm(f_unb, hs), "ms_pred_batched": tm(f_b, preds, hs), "ms_python_loop_of_cond": tm(f_loop, preds, hs),
    "jaxpr_batched_prims": prim_counts(jax.make_jaxpr(jax.vmap(br))(preds, hs)),
    "jaxpr_unbatched_prims": prim_counts(jax.make_jaxpr(jax.vmap(lambda hh: br(False, hh)))(hs)),
    "jaxpr_batched_has_cond": " cond[" in jb, "jaxpr_batched_has_select": "select_n" in jb, "load": J.load1(),
}

# ---------------------------------------------------------------- while_loop under vmap runs until every element is done
def count_to(n, x):
    return lax.while_loop(lambda s: s[0] < n, lambda s: (s[0] + 1, s[1] * 0.999 + 1.0), (0, x))


ns = jnp.array([1, 10, 100, 1000])
vw = jax.vmap(count_to)(ns, jnp.zeros(4))
wj = str(jax.make_jaxpr(jax.vmap(count_to))(ns, jnp.zeros(4)))
R["while_vmap"] = {
    "code": "def count_to(n, x):\n    return lax.while_loop(lambda s: s[0] < n,\n                          lambda s: (s[0] + 1, s[1] * 0.999 + 1.0), (0, x))\n\njax.vmap(count_to)(jnp.array([1, 10, 100, 1000]), jnp.zeros(4))",
    "counts": [int(v) for v in vw[0]], "values": [float(v) for v in vw[1]],
    "cond_has_reduce_or": "reduce_or" in wj or "reduce_max" in wj, "body_has_select": "select_n" in wj,
    "jaxpr": wj,
}

# ---------------------------------------------------------------- associative_scan on a linear recurrence
def lin_scan(a, b):            # h_t = a_t * h_{t-1} + b_t, h_0 = 0
    return lax.scan(lambda h, ab: (ab[0] * h + ab[1],) * 2, jnp.zeros(a.shape[1:]), (a, b))[1]


def lin_assoc(a, b):
    def comb(l, r):
        return (r[0] * l[0], r[0] * l[1] + r[1])
    return lax.associative_scan(comb, (a, b))[1]


ascan = []
for n in (128, 1024, 8192):
    a = jnp.asarray(rng.uniform(0.9, 1.0, (n, 256)), jnp.float32)
    b = jnp.asarray(rng.standard_normal((n, 256)) * 0.1, jnp.float32)
    f1, f2 = jax.jit(lin_scan), jax.jit(lin_assoc)
    r1, r2 = f1(a, b), f2(a, b)
    c1 = f1.lower(a, b).compile().cost_analysis()
    c2 = f2.lower(a, b).compile().cost_analysis()
    ascan.append({"n": n, "scan_ms": tm(f1, a, b), "assoc_ms": tm(f2, a, b),
                  "max_diff": float(jnp.max(jnp.abs(r1 - r2))), "max_abs": float(jnp.max(jnp.abs(r1))),
                  "scan_flops": float(c1.get("flops", -1)) if c1 else None,
                  "assoc_flops": float(c2.get("flops", -1)) if c2 else None,
                  "assoc_eqns": count_eqns(jax.make_jaxpr(lin_assoc)(a, b)),
                  "scan_eqns": count_eqns(jax.make_jaxpr(lin_scan)(a, b))})
R["assoc"] = {"rows": ascan, "code": "def comb(l, r):                       # compose two steps of h = a*h + b\n    return (r[0] * l[0], r[0] * l[1] + r[1])\n\nh = lax.associative_scan(comb, (a, b))[1]      # a, b: f32[n, 256]"}
R["load_end"] = J.load1()
J.save("cf", R)
