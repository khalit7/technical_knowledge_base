"""Custom derivative rules, measured: where automatic differentiation of a correct formula gives NaN or
inf, and the custom_jvp / custom_vjp rules (or rewrites) that fix it; a fixed point solved with
while_loop and differentiated implicitly with custom_vjp; a backward-only rule (gradient clipping).
Values are swept over x in float32 and compared with a float64 NumPy reference. Writes out/custom.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_custom.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax import lax  # noqa: E402
from jax._src.ad_checkpoint import saved_residuals  # noqa: E402

R = {"versions": J.versions()}


def fnum(v):
    v = float(v)
    if np.isnan(v):
        return "nan"
    if np.isinf(v):
        return "inf" if v > 0 else "-inf"
    return v


def sweep(xs, fns, ref_val, ref_grad):
    out = {"x": [float(x) for x in xs]}
    for name, f in fns.items():
        fv = jax.jit(jax.vmap(f))(jnp.asarray(xs, jnp.float32))
        gv = jax.jit(jax.vmap(jax.grad(f)))(jnp.asarray(xs, jnp.float32))
        out[name] = {"value": [fnum(v) for v in fv], "grad": [fnum(v) for v in gv]}
    out["float64 reference"] = {"value": [fnum(v) for v in ref_val(np.asarray(xs, np.float64))],
                                "grad": [fnum(v) for v in ref_grad(np.asarray(xs, np.float64))]}
    return out


# ---------------------------------------------------------------- 1. softplus written naively: log(1 + exp(x))
def log1pexp_naive(x):
    return jnp.log(1.0 + jnp.exp(x))


@jax.custom_jvp
def log1pexp_cjvp(x):
    return jnp.log(1.0 + jnp.exp(x))


@log1pexp_cjvp.defjvp
def _log1pexp_jvp(primals, tangents):
    x, = primals
    t, = tangents
    return log1pexp_cjvp(x), t * jax.nn.sigmoid(x)      # d/dx log(1 + e^x) = sigmoid(x), stable everywhere


def log1pexp_stable(x):                                  # the rewrite: max(x, 0) + log1p(exp(-|x|))
    return jnp.maximum(x, 0.0) + jnp.log1p(jnp.exp(-jnp.abs(x)))


xs1 = np.round(np.linspace(-120, 120, 241), 6)
R["softplus"] = {
    "sweep": sweep(xs1, {"naive": log1pexp_naive, "custom_jvp": log1pexp_cjvp, "stable rewrite": log1pexp_stable,
                         "jax.nn.softplus": jax.nn.softplus},
                   lambda x: np.logaddexp(x, 0.0), lambda x: 1.0 / (1.0 + np.exp(-x))),
    "code": "def log1pexp(x):\n    return jnp.log(1.0 + jnp.exp(x))\n\n@jax.custom_jvp\ndef log1pexp_cjvp(x):\n    return jnp.log(1.0 + jnp.exp(x))\n\n@log1pexp_cjvp.defjvp\ndef _(primals, tangents):\n    x, = primals; t, = tangents\n    return log1pexp_cjvp(x), t * jax.nn.sigmoid(x)\n\ndef log1pexp_stable(x):              # no custom rule: a formula that never overflows\n    return jnp.maximum(x, 0.0) + jnp.log1p(jnp.exp(-jnp.abs(x)))",
    "naive_grad_jaxpr": str(jax.make_jaxpr(jax.grad(log1pexp_naive))(100.0)),
    "first_nan_grad_x": None,
}
sw = R["softplus"]["sweep"]
for x, g in zip(sw["x"], sw["naive"]["grad"]):
    if g == "nan":
        R["softplus"]["first_nan_grad_x"] = x
        break
R["softplus"]["exp_overflow_f32"] = float(np.log(np.finfo(np.float32).max))

# ---------------------------------------------------------------- 2. a norm at zero
def norm_naive(x):
    return jnp.sqrt(jnp.sum(x ** 2))


@jax.custom_jvp
def norm_safe(x):
    return jnp.sqrt(jnp.sum(x ** 2))


@norm_safe.defjvp
def _norm_jvp(primals, tangents):
    x, = primals
    t, = tangents
    n = norm_safe(x)
    safe_n = jnp.where(n == 0.0, 1.0, n)
    return n, jnp.where(n == 0.0, 0.0, jnp.sum(x * t) / safe_n)   # subgradient 0 at the origin


def norm_dw(x):                                # double where, no custom rule
    s = jnp.sum(x ** 2)
    safe = jnp.where(s == 0.0, 1.0, s)
    return jnp.where(s == 0.0, 0.0, jnp.sqrt(safe))


def vec(f):                                    # f of the 3-vector (x, 0, 0): a 1-D slice through the origin
    return lambda x: f(jnp.stack([x, 0.0 * x, 0.0 * x]))


xs2 = np.round(np.linspace(-1, 1, 21), 6)
R["norm"] = {
    "sweep": sweep(xs2, {"naive": vec(norm_naive), "custom_jvp": vec(norm_safe), "double where": vec(norm_dw),
                         "jnp.linalg.norm": vec(jnp.linalg.norm)},
                   lambda x: np.abs(x), lambda x: np.sign(x)),
    "grad_at_zero_vector": {k: [fnum(v) for v in jax.grad(f)(jnp.zeros(3))]
                            for k, f in [("naive", norm_naive), ("custom_jvp", norm_safe), ("double where", norm_dw), ("jnp.linalg.norm", jnp.linalg.norm)]},
    "code": "def norm(x):\n    return jnp.sqrt(jnp.sum(x ** 2))       # d/ds sqrt(s) = 0.5 / sqrt(s): 0.5 / 0 = inf, and inf * 0 = nan\n\n@jax.custom_jvp\ndef norm_safe(x):\n    return jnp.sqrt(jnp.sum(x ** 2))\n\n@norm_safe.defjvp\ndef _(primals, tangents):\n    x, = primals; t, = tangents\n    n = norm_safe(x)\n    safe_n = jnp.where(n == 0.0, 1.0, n)\n    return n, jnp.where(n == 0.0, 0.0, jnp.sum(x * t) / safe_n)",
}

# ---------------------------------------------------------------- 3. the jnp.where trap
def where_naive(x):
    return jnp.where(x > 0, jnp.sqrt(x), 0.0)


def where_double(x):
    safe = jnp.where(x > 0, x, 1.0)
    return jnp.where(x > 0, jnp.sqrt(safe), 0.0)


xs3 = np.round(np.linspace(-1, 1, 21), 6)
R["where"] = {
    "sweep": sweep(xs3, {"naive": where_naive, "double where": where_double},
                   lambda x: np.where(x > 0, np.sqrt(np.abs(x)), 0.0),
                   lambda x: np.where(x > 0, 0.5 / np.sqrt(np.where(x > 0, x, 1.0)), 0.0)),
    "code": "def f(x):\n    return jnp.where(x > 0, jnp.sqrt(x), 0.0)          # value right everywhere; gradient nan for x <= 0\n\ndef f_fixed(x):\n    safe = jnp.where(x > 0, x, 1.0)                     # the untaken branch never sees a bad input\n    return jnp.where(x > 0, jnp.sqrt(safe), 0.0)",
    "torch": None,
}
import torch  # noqa: E402
torch.set_num_threads(4)
tx = torch.tensor([-1.0, 0.0, 0.25], requires_grad=True)
torch.where(tx > 0, torch.sqrt(tx), torch.zeros(3)).sum().backward()
R["where"]["torch"] = {"x": [-1.0, 0.0, 0.25], "grad": [fnum(v) for v in tx.grad], "version": torch.__version__}

# ---------------------------------------------------------------- 4. fixed point: while_loop forward, implicit custom_vjp backward
D = 128
rng = np.random.default_rng(0)
W = jnp.asarray(rng.standard_normal((D, D)) * (0.5 / np.sqrt(D)), jnp.float32)   # spectral norm about 1: contraction
x0 = jnp.asarray(rng.standard_normal(D), jnp.float32)


def step(W, x, z):
    return jnp.tanh(W @ z + x)


def solve_while(W, x, tol=1e-6, maxit=500):
    def cond(s):
        i, z, dz = s
        return (dz > tol) & (i < maxit)

    def body(s):
        i, z, _ = s
        zn = step(W, x, z)
        return i + 1, zn, jnp.max(jnp.abs(zn - z))
    i, z, _ = lax.while_loop(cond, body, (0, jnp.zeros_like(x), jnp.inf))
    return z, i


def solve_unrolled(W, x, n):
    return lax.fori_loop(0, n, lambda i, z: step(W, x, z), jnp.zeros_like(x))


@jax.custom_vjp
def fixed_point(W, x):
    return solve_while(W, x)[0]


def fp_fwd(W, x):
    z = fixed_point(W, x)
    return z, (W, x, z)                            # save only the solution


def fp_bwd(res, z_bar):
    W, x, z = res
    _, vjp_step = jax.vjp(lambda W_, x_, z_: step(W_, x_, z_), W, x, z)

    def cond(s):
        i, u, du = s
        return (du > 1e-6) & (i < 500)

    def body(s):                                  # adjoint fixed point: u = z_bar + (d step / d z)^T u
        i, u, _ = s
        un = z_bar + vjp_step(u)[2]
        return i + 1, un, jnp.max(jnp.abs(un - u))
    _, u, _ = lax.while_loop(cond, body, (0, z_bar, jnp.inf))
    gW, gx, _ = vjp_step(u)
    return gW, gx


fixed_point.defvjp(fp_fwd, fp_bwd)
z_star, iters = jax.jit(solve_while)(W, x0)
iters = int(iters)


def L_impl(W, x):
    return jnp.sum(fixed_point(W, x) ** 2)


def L_unroll(W, x):
    return jnp.sum(solve_unrolled(W, x, iters) ** 2)


def L_while(W, x):
    return jnp.sum(solve_while(W, x)[0] ** 2)


g_impl = jax.jit(jax.grad(L_impl, argnums=(0, 1)))(W, x0)
g_unr = jax.jit(jax.grad(L_unroll, argnums=(0, 1)))(W, x0)
res_impl = saved_residuals(L_impl, W, x0)
res_unr = saved_residuals(L_unroll, W, x0)
nb = lambda rs: int(sum(int(np.prod(a.shape)) * a.dtype.itemsize for a, _ in rs))  # noqa: E731
R["fixed_point"] = {
    "iters_to_converge": iters,
    "while_grad_error": J.err(lambda: jax.grad(L_while)(W, x0), 1),
    "grad_diff_W": float(jnp.max(jnp.abs(g_impl[0] - g_unr[0]))), "grad_diff_x": float(jnp.max(jnp.abs(g_impl[1] - g_unr[1]))),
    "max_grad_x": float(jnp.max(jnp.abs(g_unr[1]))),
    "residual_bytes_implicit": nb(res_impl), "residual_bytes_unrolled": nb(res_unr),
    "residuals_implicit": [a.str_short(short_dtypes=True) for a, _ in res_impl],
    "residuals_unrolled_count": len(res_unr),
    "residual_bytes_unrolled_by_n": {str(n): nb(saved_residuals(lambda W_, x_, n=n: jnp.sum(solve_unrolled(W_, x_, n) ** 2), W, x0))
                                     for n in (15, 100, 1000)},
    "jvp_of_custom_vjp_error": J.err(lambda: jax.jvp(lambda x: fixed_point(W, x), (x0,), (jnp.ones_like(x0),)), 2),
    "code": "@jax.custom_vjp\ndef fixed_point(W, x):                    # z = tanh(W z + x), solved with while_loop\n    return solve_while(W, x)[0]\n\ndef fp_fwd(W, x):\n    z = fixed_point(W, x)\n    return z, (W, x, z)                   # residuals: only the solution\n\ndef fp_bwd(res, z_bar):                   # implicit function theorem: solve u = z_bar + J_z^T u\n    W, x, z = res\n    _, vjp_step = jax.vjp(step, W, x, z)\n    u = solve_adjoint(lambda u: z_bar + vjp_step(u)[2])   # another while_loop\n    gW, gx, _ = vjp_step(u)\n    return gW, gx\n\nfixed_point.defvjp(fp_fwd, fp_bwd)",
}

# ---------------------------------------------------------------- 5. a backward-only rule: clip the gradient
@jax.custom_vjp
def clip_gradient(x, lo, hi):
    return x


def _cg_fwd(x, lo, hi):
    return x, (lo, hi)


def _cg_bwd(res, g):
    lo, hi = res
    return (jnp.clip(g, lo, hi), None, None)


clip_gradient.defvjp(_cg_fwd, _cg_bwd)
gx = jax.grad(lambda x: jnp.sum(clip_gradient(x, -1.0, 1.0) * jnp.array([0.5, 3.0, -7.0])))(jnp.ones(3))
R["clip"] = {"grad": [float(v) for v in gx], "unclipped": [0.5, 3.0, -7.0],
             "code": "@jax.custom_vjp\ndef clip_gradient(x, lo, hi):\n    return x                               # identity forward\n\ndef fwd(x, lo, hi): return x, (lo, hi)\ndef bwd(res, g):\n    lo, hi = res\n    return (jnp.clip(g, lo, hi), None, None)\nclip_gradient.defvjp(fwd, bwd)\n\njax.grad(lambda x: jnp.sum(clip_gradient(x, -1., 1.) * jnp.array([0.5, 3., -7.])))(jnp.ones(3))"}

# custom_jvp functions still work in reverse mode (the JVP rule is linearized and transposed)
R["custom_jvp_reverse_ok"] = fnum(jax.grad(log1pexp_cjvp)(100.0))
R["custom_jvp_jaxpr"] = str(jax.make_jaxpr(log1pexp_cjvp)(1.0))
R["custom_vjp_jaxpr"] = str(jax.make_jaxpr(lambda x: clip_gradient(x, -1.0, 1.0))(jnp.ones(3)))
J.save("custom", R)
