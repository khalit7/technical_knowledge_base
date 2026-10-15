"""Writing a new primitive, one rule at a time: what fails after each step, with JAX's real messages.
multiply_add(x, y, z) = x * y + z, the example of JAX's own primitives guide, written against the
public extension APIs of jax 0.11.2 (jax.extend.core.Primitive, jax.interpreters.mlir/ad/batching).
Writes out/prim.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_prim.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax.extend.core import Primitive  # noqa: E402
from jax.interpreters import ad, batching, mlir  # noqa: E402
from jax._src import core  # noqa: E402

R = {"versions": J.versions(), "steps": []}
multiply_add_p = Primitive("multiply_add")


def multiply_add(x, y, z):
    return multiply_add_p.bind(x, y, z)


def f(x):                                           # the user function: x * 2 + x, through the primitive
    return multiply_add(x, 2.0, x)


x = jnp.array([1.0, 2.0, 3.0])


def attempts():
    out = {}
    for name, fn in [("eager", lambda: f(x)),
                     ("make_jaxpr", lambda: jax.make_jaxpr(f)(x)),
                     ("jit", lambda: jax.jit(f)(x)),
                     ("jvp", lambda: jax.jvp(f, (x,), (jnp.ones(3),))),
                     ("grad", lambda: jax.grad(lambda v: f(v).sum())(x)),
                     ("vmap", lambda: jax.vmap(f)(jnp.stack([x, x])))]:
        e = J.err(fn, 1)
        out[name] = e if e else "ok"
    return out


def step(title, code):
    R["steps"].append({"title": title, "code": code, "result": attempts()})


step("Create the primitive and a function that binds it",
     "multiply_add_p = jax.extend.core.Primitive(\"multiply_add\")\n\ndef multiply_add(x, y, z):\n    return multiply_add_p.bind(x, y, z)")


@multiply_add_p.def_impl
def _impl(x, y, z):                                 # eager evaluation on concrete arrays
    return jnp.add(jnp.multiply(x, y), z)


step("Evaluation rule (impl): runs eagerly on concrete values",
     "@multiply_add_p.def_impl\ndef _impl(x, y, z):\n    return jnp.add(jnp.multiply(x, y), z)")


@multiply_add_p.def_abstract_eval
def _abstract(xs, ys, zs):                          # shapes and dtypes only: what tracing needs
    shape = jnp.broadcast_shapes(xs.shape, ys.shape, zs.shape)
    return core.ShapedArray(shape, jnp.result_type(xs.dtype, ys.dtype, zs.dtype))


step("Abstract evaluation rule: output shape and dtype from input shapes and dtypes",
     "@multiply_add_p.def_abstract_eval\ndef _abstract(xs, ys, zs):\n    shape = jnp.broadcast_shapes(xs.shape, ys.shape, zs.shape)\n    return core.ShapedArray(shape, jnp.result_type(xs.dtype, ys.dtype, zs.dtype))")

mlir.register_lowering(multiply_add_p, mlir.lower_fun(_impl, multiple_results=False))
step("Lowering rule: how to emit StableHLO (here: by tracing the impl, which uses existing primitives)",
     "mlir.register_lowering(multiply_add_p, mlir.lower_fun(_impl, multiple_results=False))")


def _jvp(primals, tangents):
    x, y, z = primals
    xt, yt, zt = (ad.instantiate_zeros(t) for t in tangents)
    out = multiply_add(x, y, z)
    # d(x*y + z) = xt*y + x*yt + zt, written with the primitive itself so that it stays linear in the tangents
    t_out = multiply_add(xt, y, multiply_add(x, yt, zt))
    return out, t_out


ad.primitive_jvps[multiply_add_p] = _jvp
step("JVP rule: forward-mode derivative",
     "def _jvp(primals, tangents):\n    x, y, z = primals\n    xt, yt, zt = (ad.instantiate_zeros(t) for t in tangents)\n    out = multiply_add(x, y, z)\n    t_out = multiply_add(xt, y, multiply_add(x, yt, zt))   # linear in the tangents\n    return out, t_out\n\nad.primitive_jvps[multiply_add_p] = _jvp")


def _transpose(ct, x, y, z):
    # linear in x (when y is known) and in z; exactly one of x, y is the undefined (linear) input
    if ad.is_undefined_primal(x) and not ad.is_undefined_primal(y):
        ct_x = multiply_add(ct, y, jnp.zeros_like(ct))
        ct_z = ct if ad.is_undefined_primal(z) else None
        return ct_x, None, ct_z
    if ad.is_undefined_primal(y) and not ad.is_undefined_primal(x):
        ct_y = multiply_add(x, ct, jnp.zeros_like(ct))
        ct_z = ct if ad.is_undefined_primal(z) else None
        return None, ct_y, ct_z
    return None, None, ct


ad.primitive_transposes[multiply_add_p] = _transpose
step("Transpose rule: reverse mode is JVP + transpose, so grad needs it",
     "def _transpose(ct, x, y, z):            # x or y is the linear input (an UndefinedPrimal)\n    if ad.is_undefined_primal(x):\n        return multiply_add(ct, y, zeros), None, (ct if ad.is_undefined_primal(z) else None)\n    ...\n\nad.primitive_transposes[multiply_add_p] = _transpose")


def _batch(args, dims):
    # elementwise with NumPy broadcasting: put every batch dimension in front, give unbatched operands a
    # leading axis of size 1 (and pad ranks with 1s), then apply the primitive once to the whole batch
    rank = max(jnp.ndim(a) - (d is not None) for a, d in zip(args, dims))
    moved = []
    for a, d in zip(args, dims):
        if d is None:
            moved.append(jnp.reshape(a, (1,) * (1 + rank - jnp.ndim(a)) + jnp.shape(a)))
        else:
            a = jnp.moveaxis(a, d, 0)
            moved.append(jnp.reshape(a, a.shape[:1] + (1,) * (rank - (a.ndim - 1)) + a.shape[1:]))
    return multiply_add(*moved), 0


batching.primitive_batchers[multiply_add_p] = _batch
step("Batching rule: vmap",
     "def _batch(args, dims):                 # dims[i]: which axis of args[i] is the batch, or None\n    # move batch axes to the front; unbatched operands get a leading axis of 1\n    moved = [front_or_expand(a, d) for a, d in zip(args, dims)]\n    return multiply_add(*moved), 0       # the output's batch axis is 0\n\nbatching.primitive_batchers[multiply_add_p] = _batch")

R["final"] = {
    "eager": [float(v) for v in f(x)],
    "jit": [float(v) for v in jax.jit(f)(x)],
    "grad": [float(v) for v in jax.grad(lambda v: f(v).sum())(x)],
    "grad_expected": [3.0, 3.0, 3.0],
    "vmap_shape": list(jax.vmap(f)(jnp.stack([x, x])).shape),
    "jaxpr": str(jax.make_jaxpr(f)(x)),
    "grad_jaxpr": str(jax.make_jaxpr(jax.grad(lambda v: f(v).sum()))(x)),
    "stablehlo": "\n".join(ln for ln in jax.jit(f).lower(x).as_text().splitlines() if "stablehlo" in ln or "func.func" in ln)[:1200],
}
J.save("prim", R)
