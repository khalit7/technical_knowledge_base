"""Tracing in depth on the running example: abstract values, the chain of traces under nested
transformations, how one primitive is dispatched through them, closed-over constants, and structured
jaxprs for the Jaxpr explorer. Writes out/trace.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_trace.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax._src import core  # noqa: E402
from jax._src.interpreters import ad, batching, partial_eval as pe  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
from jaxpr_export import export, prim_counts  # noqa: E402

R = {"versions": J.versions()}
cfg = C.CFG
sd = dict(np.load(C.path("data", "init_torch.npz")))
params = MJ.from_torch(sd, cfg)
blk = params["blocks"][0]

# ---------------------------------------------------------------- 1. abstract values
key = jax.random.key(0)
vals = {
    "jnp.ones((32, 128))": jnp.ones((32, 128)),
    "jnp.ones((2, 3), jnp.bfloat16)": jnp.ones((2, 3), jnp.bfloat16),
    "2.0 (Python float)": 2.0,
    "2 (Python int)": 2,
    "True": True,
    "np.float32(2.0)": np.float32(2.0),
    "jnp.array(2.0)": jnp.array(2.0),
    "jax.random.key(0)": key,
    "jax.random.PRNGKey(0)": jax.random.PRNGKey(0),
}
avals = []
for k, v in vals.items():
    a = jax.typeof(v)
    avals.append({"expr": k, "typeof": str(a), "class": type(a).__name__, "shape": list(a.shape),
                  "dtype": str(a.dtype), "weak_type": bool(getattr(a, "weak_type", False)),
                  "sharding": str(getattr(a, "sharding", ""))})
R["avals"] = avals
R["shapedarray_fields"] = [s for s in core.ShapedArray.__slots__] if hasattr(core.ShapedArray, "__slots__") else None


# ---------------------------------------------------------------- 2. the chain of traces
def chain(x):
    out = [{"current_trace": type(core.trace_ctx.trace).__name__}]
    y = x
    while isinstance(y, core.Tracer):
        tr = y._trace
        out.append({"trace": type(tr).__name__, "tracer": type(y).__name__, "aval": str(jax.typeof(y)),
                    "extra": ("batch_dim=" + str(y.batch_dim)) if hasattr(y, "batch_dim") else ""})
        nxt = None
        for attr in ("primal", "val"):
            if hasattr(y, attr):
                nxt = getattr(y, attr)
                break
        if nxt is None:
            out.append({"parent": type(getattr(tr, "parent_trace", None)).__name__})
            break
        y = nxt
    else:
        out.append({"value": type(y).__name__})
    return out


chains = {}


def make_f(tag):
    def f(x):
        chains[tag] = chain(x)
        return jnp.sin(x).sum()
    return f


x23 = jnp.ones((2, 3))
jax.jit(jax.vmap(jax.grad(make_f("jit(vmap(grad(f)))"))))(x23)
jax.grad(lambda x: jax.vmap(make_f("grad(vmap(f))"))(x).sum())(x23)
jax.vmap(jax.jit(jax.grad(make_f("vmap(jit(grad(f)))"))))(x23)
jax.grad(make_f("grad(f)"))(jnp.ones(3))
jax.jit(make_f("jit(f)"))(jnp.ones(3))
make_f("f (no transformation)")(jnp.ones(3))
R["chains"] = chains

# ---------------------------------------------------------------- 3. one primitive dispatched through the chain
# Every process_primitive call is logged with its nesting depth while jit(vmap(jvp(lax.sin))) traces.
log = []
classes = {"EvalTrace": core.EvalTrace, "DynamicJaxprTrace": pe.DynamicJaxprTrace,
           "BatchTrace": batching.BatchTrace, "LinearizeTrace": ad.LinearizeTrace, "JVPTrace": ad.JVPTrace}
orig = {}
depth = [0]
for nm, cls in classes.items():
    orig[nm] = cls.process_primitive

    def wrap(self, prim, args, params, _nm=nm):
        log.append({"depth": depth[0], "trace": _nm, "prim": prim.name, "in": [str(jax.typeof(a)) for a in args]})
        depth[0] += 1
        try:
            return orig[_nm](self, prim, args, params)
        finally:
            depth[0] -= 1
    cls.process_primitive = wrap


def f_jvp(x, t):
    return jax.jvp(jax.lax.sin, (x,), (t,))[1]


xs_, ts_ = jnp.ones((2, 3)), jnp.ones((2, 3))
try:
    jax.jit(jax.vmap(f_jvp))(xs_, ts_)
finally:
    for nm, cls in classes.items():
        cls.process_primitive = orig[nm]
first = next(i for i, e in enumerate(log) if e["prim"] == "sin")
R["dispatch_log"] = {"code": "def f(x, t):\n    return jax.jvp(jax.lax.sin, (x,), (t,))[1]   # tangent of sin at x in direction t\n\njax.jit(jax.vmap(f))(jnp.ones((2, 3)), jnp.ones((2, 3)))",
                     "log": log[first:], "skipped_before": first,
                     "jaxpr": str(jax.make_jaxpr(jax.vmap(f_jvp))(xs_, ts_))}

# ---------------------------------------------------------------- 4. closed-over constants and literals
big_np = np.arange(16.0, dtype=np.float32)
big_jax = jnp.ones(16)


def closes(x):
    return x + big_np + big_jax + jnp.full((16,), 142.0) + 3.0


cj = jax.make_jaxpr(closes)(jnp.ones(16))
R["constants"] = {
    "src": "big_np = np.arange(16.0, dtype=np.float32)\nbig_jax = jnp.ones(16)\n\ndef closes(x):\n    return x + big_np + big_jax + jnp.full((16,), 142.0) + 3.0",
    "jaxpr": str(cj), "n_consts": len(cj.consts), "const_types": [type(c).__name__ for c in cj.consts],
    "simplified_constants_flag": None,
}
try:
    R["constants"]["simplified_constants_flag"] = bool(jax.config.jax_use_simplified_jaxpr_constants)
except Exception:  # noqa: BLE001
    pass

# ---------------------------------------------------------------- 5. jaxprs for the explorer
ex = {}
x8 = jnp.asarray(np.random.default_rng(0).standard_normal((8, 128)), jnp.float32)
x2 = jnp.asarray(np.random.default_rng(1).standard_normal((2, 16, 128)), jnp.float32)


def add(name, title, fn, *args, code, note, **kw):
    cj = jax.make_jaxpr(fn, **kw)(*args)
    d = export(cj)
    d.update({"title": title, "code": code, "note": note, "prims": prim_counts(cj)})
    ex[name] = d


add("mlp", "The MLP of block 0 on 8 tokens", lambda p, x: MJ.mlp(p, x), blk["mlp"], x8,
    code="def linear(p, x):\n    return x @ p[\"w\"] + p[\"b\"]\n\ndef mlp(p, x):\n    return linear(p[\"fc2\"], jax.nn.gelu(linear(p[\"fc1\"], x), approximate=False))\n\njax.make_jaxpr(mlp)(params[\"blocks\"][0][\"mlp\"], x)   # x: f32[8,128]",
    note="Exact (erf) GELU, as in the running example. Inputs are a pytree: the dict of four arrays became four invars.")
add("ln", "LayerNorm on 8 tokens", lambda p, x: MJ.layer_norm(p, x, cfg["ln_eps"]), blk["ln1"], x8,
    code="def layer_norm(p, x, eps):\n    mu = x.mean(-1, keepdims=True)\n    var = ((x - mu) ** 2).mean(-1, keepdims=True)\n    return (x - mu) / jnp.sqrt(var + eps) * p[\"scale\"] + p[\"bias\"]",
    note="mean() is a reduce_sum and a div; keepdims is a broadcast_in_dim; eps 1e-5 is folded in as a literal.")
add("attn", "Causal attention of block 0 (batch 2, 16 characters)", lambda p, x: MJ.attention(p, x, cfg["n_heads"]), blk["attn"], x2,
    code="def attention(p, x, n_heads):                     # x [B, T, D]\n    B, T, D = x.shape\n    dh = D // n_heads\n    split = lambda t: t.reshape(B, T, n_heads, dh).transpose(0, 2, 1, 3)\n    q, k, v = (split(linear(p[n], x)) for n in (\"wq\", \"wk\", \"wv\"))\n    s = q @ k.transpose(0, 1, 3, 2) / math.sqrt(dh)\n    mask = jnp.tril(jnp.ones((T, T), bool))\n    s = jnp.where(mask, s, -jnp.inf)\n    a = jax.nn.softmax(s, axis=-1) @ v\n    return linear(p[\"wo\"], a.transpose(0, 2, 1, 3).reshape(B, T, D))",
    note="jnp.tril and jnp.where appear as nested jit (pjit) equations with their own sub-jaxpr; softmax's max is under stop_gradient.")
add("grad_mlp", "Gradient of sum(mlp) with respect to the weights", jax.grad(lambda p, x: MJ.mlp(p, x).sum()), blk["mlp"], x8,
    code="jax.make_jaxpr(jax.grad(lambda p, x: mlp(p, x).sum()))(params[\"blocks\"][0][\"mlp\"], x)",
    note="The forward equations come first, then the backward ones that JAX produced by transposing the linearized program: dot_general with swapped operands, transpose, reduce_sum for the bias gradients.")


def cf(x, n):
    y = jax.lax.cond(x.sum() > 0, lambda v: jnp.sin(v), lambda v: v * 2.0, x)
    z, _ = jax.lax.scan(lambda c, t: (c * 0.5 + t, None), y, jnp.ones((3, 16)))
    w = jax.lax.while_loop(lambda s: s[0] < n, lambda s: (s[0] + 1, s[1] * 0.9), (0, z))[1]
    return w + big_np + 3.0


add("cf", "cond, scan and while_loop, with a closed-over NumPy constant", cf, jnp.ones(16), 4, static_argnums=1,
    code="big_np = np.arange(16.0, dtype=np.float32)\n\ndef cf(x, n):                           # n is static\n    y = jax.lax.cond(x.sum() > 0, lambda v: jnp.sin(v), lambda v: v * 2.0, x)\n    z, _ = jax.lax.scan(lambda c, t: (c * 0.5 + t, None), y, jnp.ones((3, 16)))\n    w = jax.lax.while_loop(lambda s: s[0] < n, lambda s: (s[0] + 1, s[1] * 0.9), (0, z))[1]\n    return w + big_np + 3.0\n\njax.make_jaxpr(cf, static_argnums=1)(jnp.ones(16), 4)",
    note="The NumPy array became a constvar (before the semicolon); scalars became literals. cond lists its branches false first (index 0). The static n = 4 is a literal inside while's cond_jaxpr.")


@jax.jit
def inner(x):
    return jnp.tanh(x) * 2.0


def misc(x):
    y = inner(x)
    y = jax.nn.relu(y)
    jax.debug.print("y0 = {}", y[0])
    return jax.lax.stop_gradient(y) + jax.checkpoint(lambda v: jnp.sin(v) * v)(x)


add("misc", "Nested jit, custom_jvp, a debug effect, stop_gradient and checkpoint", misc, jnp.ones(4),
    code="@jax.jit\ndef inner(x):\n    return jnp.tanh(x) * 2.0\n\ndef misc(x):\n    y = inner(x)\n    y = jax.nn.relu(y)                     # relu is a custom_jvp function\n    jax.debug.print(\"y0 = {}\", y[0])\n    return jax.lax.stop_gradient(y) + jax.checkpoint(lambda v: jnp.sin(v) * v)(x)",
    note="Higher-order primitives carry sub-jaxprs as parameters: pjit (jaxpr), custom_jvp_call (call_jaxpr, jvp_jaxpr_fun), checkpoint (jaxpr, prevent_cse, policy). debug_print carries an effect, so it is never removed as dead code.")
R["explorer"] = ex
R["explorer_order"] = ["mlp", "ln", "attn", "grad_mlp", "cf", "misc"]
R["model_jax_lines"] = {}
src = open(os.path.join(J.DATA, "model_jax.py")).read().splitlines()
for i, ln in enumerate(src, 1):
    R["model_jax_lines"][str(i)] = ln
J.save("trace", R)
