"""Autodiff from zero on the running example: JVP, linearize, transpose and VJP of block 0's MLP as real
jaxprs (the data for the tape animation), what reverse mode saves (JAX residuals against PyTorch's saved
tensors), forward against reverse mode cost (FLOPs from XLA's cost analysis, deterministic), Hessians,
and the cost of a full gradient against the forward pass. Writes out/ad.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_ad.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax._src.ad_checkpoint import saved_residuals  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
from jaxpr_export import export, count_eqns, prim_counts  # noqa: E402

R = {"versions": J.versions(), "label": J.LABEL}
cfg = C.CFG
sd = dict(np.load(C.path("data", "init_torch.npz")))
params = MJ.from_torch(sd, cfg)
p_mlp = params["blocks"][0]["mlp"]
x4 = jnp.asarray(np.random.default_rng(0).standard_normal((4, 128)), jnp.float32)


def flops(f, *a):
    c = jax.jit(f).lower(*a).compile().cost_analysis()
    if isinstance(c, list):
        c = c[0]
    return float(c.get("flops", float("nan"))) if c else float("nan")


# ---------------------------------------------------------------- 1. the MLP: forward, JVP, linearize, transpose, VJP
def f_mlp(p):
    return MJ.mlp(p, x4)                        # [4,128] out, differentiated w.r.t. the weights


t_p = jax.tree.map(jnp.ones_like, p_mlp)
ct = jnp.ones((4, 128), jnp.float32)
y, f_lin = jax.linearize(f_mlp, p_mlp)
lin_jaxpr = jax.make_jaxpr(f_lin)(t_p)
f_T = jax.linear_transpose(f_lin, p_mlp)
T_jaxpr = jax.make_jaxpr(f_T)(ct)
fwd_jaxpr = jax.make_jaxpr(f_mlp)(p_mlp)
jvp_jaxpr = jax.make_jaxpr(lambda p, t: jax.jvp(f_mlp, (p,), (t,)))(p_mlp, t_p)
vjp_jaxpr = jax.make_jaxpr(lambda p, c: jax.vjp(f_mlp, p)[1](c))(p_mlp, ct)
res = saved_residuals(f_mlp, p_mlp)
gT = f_T(ct)[0]
_, vjp_fn = jax.vjp(f_mlp, p_mlp)
gV = vjp_fn(ct)[0]
R["mlp"] = {
    "code": "def f(p):                                 # block 0's MLP on 4 tokens, as a function of its weights\n    return mlp(p, x)                      # x: f32[4,128] -> f32[4,128]\n\ny, f_lin = jax.linearize(f, p)            # primal output and the linear map p_dot -> y_dot\nf_T = jax.linear_transpose(f_lin, p)      # the transposed map y_bar -> p_bar\n_, f_vjp = jax.vjp(f, p)                  # what jax.grad uses: linearize, then transpose",
    "forward": export(fwd_jaxpr), "jvp": export(jvp_jaxpr), "linear": export(lin_jaxpr),
    "transpose": export(T_jaxpr), "vjp": export(vjp_jaxpr),
    "linear_consts": [str(jax.typeof(c)) for c in lin_jaxpr.consts],
    "residuals": [{"aval": a.str_short(short_dtypes=True), "bytes": int(np.prod(a.shape)) * a.dtype.itemsize, "src": J.scrub(s)} for a, s in res],
    "transpose_equals_vjp": float(max(jnp.max(jnp.abs(a - b)) for a, b in zip(jax.tree.leaves(gT), jax.tree.leaves(gV)))),
    "flops": {"forward": flops(f_mlp, p_mlp), "jvp": flops(lambda p, t: jax.jvp(f_mlp, (p,), (t,)), p_mlp, t_p),
              "linear only": flops(f_lin, t_p), "vjp (forward + backward)": flops(lambda p, c: jax.vjp(f_mlp, p)[1](c), p_mlp, ct)},
}

# PyTorch: what autograd saves for the same MLP
import torch  # noqa: E402
torch.set_num_threads(4)
saved = []


def pack(t):
    saved.append((tuple(t.shape), str(t.dtype).replace("torch.", ""), t.numel() * t.element_size(),
                  t.grad_fn.name() if t.grad_fn is not None else ("parameter" if t.requires_grad else "input")))
    return t


tw = {k: torch.tensor(np.asarray(v), requires_grad=True) for k, v in [("w1", p_mlp["fc1"]["w"]), ("b1", p_mlp["fc1"]["b"]), ("w2", p_mlp["fc2"]["w"]), ("b2", p_mlp["fc2"]["b"])]}
tx = torch.tensor(np.asarray(x4))
with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
    ty = torch.nn.functional.gelu(tx @ tw["w1"] + tw["b1"]) @ tw["w2"] + tw["b2"]
ty.backward(torch.ones_like(ty))
R["mlp"]["torch_saved"] = [{"shape": list(s), "dtype": d, "bytes": b, "from": g} for s, d, b, g in saved]
R["mlp"]["torch_vs_jax_grad_w1"] = float(np.max(np.abs(tw["w1"].grad.numpy() - np.asarray(gV["fc1"]["w"]))))
R["mlp"]["torch_version"] = torch.__version__

# ---------------------------------------------------------------- 2. whole model: residuals and FLOPs
x, yb = C.batch(0)
x, yb = jnp.asarray(x), jnp.asarray(yb)


def loss(p):
    return MJ.loss_fn(p, x, yb, cfg)


res_all = saved_residuals(loss, params)
tot = sum(int(np.prod(a.shape)) * a.dtype.itemsize for a, _ in res_all)
by_shape = {}
for a, s in res_all:
    k = a.str_short(short_dtypes=True)
    by_shape.setdefault(k, [0, 0])
    by_shape[k][0] += 1
    by_shape[k][1] += int(np.prod(a.shape)) * a.dtype.itemsize
saved = []
mt = __import__("model_torch")
tm = mt.TinyLM(cfg)
tm.load_state_dict({k: torch.tensor(v) for k, v in sd.items()})
with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
    tl = mt.loss_fn(tm, torch.tensor(np.asarray(x)).long(), torch.tensor(np.asarray(yb)).long())
torch_bytes = sum(b for _, _, b, g in saved if g not in ("parameter",))
torch_param_bytes = sum(b for _, _, b, g in saved if g == "parameter")
t_vg = jax.random.normal(jax.random.key(3), (1,))
dir_t = jax.tree.map(lambda v: jnp.ones_like(v) * 1e-3, params)
R["model"] = {
    "n_residuals": len(res_all), "residual_bytes": tot,
    "residuals_by_shape": sorted([{"aval": k, "count": v[0], "bytes": v[1]} for k, v in by_shape.items()], key=lambda r: -r["bytes"]),
    "param_bytes": int(sum(v.size * 4 for v in jax.tree.leaves(params))),
    "torch_saved_count": len(saved), "torch_saved_bytes_nonparam": torch_bytes, "torch_saved_bytes_param": torch_param_bytes,
    "flops": {"forward (loss)": flops(loss, params),
              "jvp (one direction)": flops(lambda p, t: jax.jvp(loss, (p,), (t,)), params, dir_t),
              "value_and_grad": flops(jax.value_and_grad(loss), params)},
    "eqns": {"forward": count_eqns(jax.make_jaxpr(loss)(params)), "value_and_grad": count_eqns(jax.make_jaxpr(jax.value_and_grad(loss))(params))},
    "batch": "training batch 0: 32 sequences x 128 characters",
}

# ---------------------------------------------------------------- 3. forward against reverse mode: Jacobians of k inputs -> m outputs
xfix = jnp.asarray(np.random.default_rng(2).standard_normal((128,)), jnp.float32)


def make_g(k, m):
    def g(xs):                                   # xs: the first k of 128 input features of one token
        h = jnp.concatenate([xs, xfix[k:]])
        return MJ.mlp(p_mlp, h[None])[0, :m]     # first m of 128 outputs
    return g


grid = []
for k in (1, 8, 32, 128):
    for m in (1, 8, 32, 128):
        g = make_g(k, m)
        xs = xfix[:k]
        jf, jr = jax.jit(jax.jacfwd(g)), jax.jit(jax.jacrev(g))
        A, Bm = jf(xs), jr(xs)
        tf_, tr_ = [], []
        for _ in range(5):
            t0 = time.perf_counter(); jf(xs).block_until_ready(); tf_.append(time.perf_counter() - t0)  # noqa: E702
            t0 = time.perf_counter(); jr(xs).block_until_ready(); tr_.append(time.perf_counter() - t0)  # noqa: E702
        grid.append({"k": k, "m": m, "fwd_flops": flops(jax.jacfwd(g), xs), "rev_flops": flops(jax.jacrev(g), xs),
                     "forward_flops": flops(g, xs), "fwd_ms": J.median(tf_) * 1e3, "rev_ms": J.median(tr_) * 1e3,
                     "max_diff": float(jnp.max(jnp.abs(A - Bm)))})
R["jac_grid"] = {"rows": grid, "load": J.load1(),
                 "code": "def g(xs):                                  # k inputs -> m outputs through block 0's MLP\n    h = jnp.concatenate([xs, x_fixed[k:]])\n    return mlp(p, h[None])[0, :m]\n\njax.jacfwd(g)(xs)    # k JVPs, batched with vmap\njax.jacrev(g)(xs)    # m VJPs, batched with vmap"}

# ---------------------------------------------------------------- 4. Hessians and Hessian-vector products of a scalar of x (n = 128)
def s(xv):
    return jnp.sum(MJ.mlp(p_mlp, xv[None]) ** 2)


v = jnp.ones(128)
hfr = jax.hessian(s)(xfix)
R["hessian"] = {
    "n": 128,
    "flops": {"jax.hessian = jacfwd(jacrev)": flops(jax.hessian(s), xfix),
              "jacrev(jacrev)": flops(jax.jacrev(jax.jacrev(s)), xfix),
              "jacfwd(jacfwd)": flops(jax.jacfwd(jax.jacfwd(s)), xfix),
              "one Hessian-vector product: jvp(grad)": flops(lambda a, b: jax.jvp(jax.grad(s), (a,), (b,))[1], xfix, v),
              "grad": flops(jax.grad(s), xfix), "forward": flops(s, xfix)},
    "symmetric_max_diff": float(jnp.max(jnp.abs(hfr - hfr.T))),
    "hvp_matches_hessian": float(jnp.max(jnp.abs(jax.jvp(jax.grad(s), (xfix,), (v,))[1] - hfr @ v))),
}

# ---------------------------------------------------------------- 5. stop_gradient, and gradient of a non-differentiable point
R["misc"] = {
    "relu_grad_at_0": float(jax.grad(jax.nn.relu)(0.0)),
    "abs_grad_at_0": float(jax.grad(jnp.abs)(0.0)),
    "sqrt_grad_at_0": float(jax.grad(jnp.sqrt)(0.0)),
    "norm_grad_at_0": [float(v) for v in jax.grad(jnp.linalg.norm)(jnp.zeros(3))],
    "max_grad_tie": [float(v) for v in jax.grad(lambda a: jnp.max(a))(jnp.array([1.0, 1.0, 0.0]))],
    "torch_max_grad_tie": None,
}
tt = torch.tensor([1.0, 1.0, 0.0], requires_grad=True)
tt.max().backward()
R["misc"]["torch_max_grad_tie"] = [float(v) for v in tt.grad]
tr = torch.tensor(0.0, requires_grad=True)
torch.relu(tr).backward()
R["misc"]["torch_relu_grad_at_0"] = float(tr.grad)
R["load_end"] = J.load1()
J.save("ad", R)
