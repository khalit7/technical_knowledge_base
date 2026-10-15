"""Interop without porting: DLPack sharing between torch and JAX, a jax2torch-style autograd bridge, and torchax
(PyTorch code run by JAX), all on the running example. Writes out/interop.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_interop.py
"""
import os
import sys
import time

os.environ["ENABLE_RUNTIME_UPTIME_TELEMETRY"] = "0"     # torchax sets this to 1 by default; off here
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

P.add_site()
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np  # noqa: E402
import torch  # noqa: E402

torch.set_num_threads(4)
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import optax  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
import model_torch as MT  # noqa: E402

R = {}
cfg = C.CFG
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
x0, y0 = C.batch(0)

# ------------------------------------------------------------------ 1. DLPack: zero copy, and what aliasing means
t = torch.arange(1024, dtype=torch.float32)
j = jax.dlpack.from_dlpack(t)
R["t2j"] = dict(same_pointer=t.data_ptr() == j.unsafe_buffer_pointer(), dtype=str(j.dtype))
before = float(j[5]); t.add_(100.0); after = float(j[5])
R["t2j"].update(jax_value_before=before, jax_value_after_torch_inplace_add=after,
                note="the JAX array changed under JAX's feet: JAX assumes arrays are immutable")
j2 = jnp.arange(1024, dtype=jnp.float32) * 2
t2 = torch.from_dlpack(j2)
R["j2t"] = dict(same_pointer=t2.data_ptr() == j2.unsafe_buffer_pointer())
R["j2t"]["torch_inplace_on_jax_buffer"] = P.err(lambda: t2.add_(1.0)) or "allowed: the torch view writes into JAX's buffer"
R["j2t"]["jax_value_after"] = float(j2[3])
# a non-contiguous torch tensor
tn = torch.arange(12, dtype=torch.float32).reshape(3, 4).T
jn = P.err(lambda: jax.dlpack.from_dlpack(tn))
R["t2j_noncontiguous"] = jn or dict(ok=True, equal=bool(np.array_equal(np.asarray(jax.dlpack.from_dlpack(tn)), tn.numpy())),
                                    same_pointer=tn.data_ptr() == jax.dlpack.from_dlpack(tn).unsafe_buffer_pointer())
# a tensor that requires grad
tg = torch.ones(4, requires_grad=True)
R["t2j_requires_grad"] = P.err(lambda: jax.dlpack.from_dlpack(tg), 1) or "ok"


# ------------------------------------------------------------------ 2. jax2torch: a JAX function as a torch autograd op
def jax_loss(params, x, y):
    return MJ.loss_fn(params, x, y, cfg)


jl = jax.jit(jax.value_and_grad(jax_loss))
names = list(MJ.to_torch_names(MJ.from_torch(sd0, cfg)).keys())


class JaxLoss(torch.autograd.Function):
    """Forward runs the jitted JAX loss; backward returns JAX's gradients. Tensors cross by DLPack (no copy on CPU)."""

    @staticmethod
    def forward(ctx, x, y, *ws):
        sd = {n: jax.dlpack.from_dlpack(w.detach()) for n, w in zip(names, ws)}
        params = MJ.from_torch(sd, cfg)                         # transposes happen inside JAX
        loss, g = jl(params, jax.dlpack.from_dlpack(x), jax.dlpack.from_dlpack(y))
        gsd = MJ.to_torch_names(g)
        ctx.grads = [torch.from_numpy(np.ascontiguousarray(gsd[n])) for n in names]
        return torch.from_dlpack(loss)

    @staticmethod
    def backward(ctx, gout):
        return (None, None, *[gout * g for g in ctx.grads])


tm = MT.make_model(cfg, 0); tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
params_t = dict(tm.named_parameters())
xt, yt = torch.from_numpy(x0), torch.from_numpy(y0)
# the batch is a [32, 128] slice of a [32, 129] window: strides (129, 1), which JAX's DLPack import refuses
R["t2j_strided_batch"] = dict(strides=list(xt.stride()), error=P.err(lambda: jax.dlpack.from_dlpack(xt), 1))
xt, yt = xt.contiguous(), yt.contiguous()
lb = JaxLoss.apply(xt, yt, *[params_t[n] for n in names])
lb.backward()
g_bridge = {n: params_t[n].grad.clone() for n in names}
tm.zero_grad(set_to_none=True)
ln = MT.loss_fn(tm, xt.long(), yt.long()); ln.backward()
R["bridge"] = dict(loss_bridge=float(lb), loss_torch=float(ln),
                   grad_maxdiff=max(float((g_bridge[n] - params_t[n].grad).abs().max()) for n in names),
                   n_tensors=len(names))

# ------------------------------------------------------------------ 3. torchax: the PyTorch module, run by JAX
# torchax 0.0.13 (PyPI, 2026-06-17) against torch 2.14.1: import it in a clean process and keep the last error line
import subprocess  # noqa: E402

pr = subprocess.run([sys.executable, "-I", "-B", "-c", "import sys; sys.path.append(%r); import torchax" % P.SITE],
                    capture_output=True, text=True, env=dict(os.environ, ENABLE_RUNTIME_UPTIME_TELEMETRY="0"))
R["torchax_0013_import"] = P.scrub([l for l in pr.stderr.strip().splitlines() if l.strip()][-1]) if pr.returncode else "ok"
# torchax from GitHub main (commit d95b0a5b, 2026-10-11, version string 0.0.14), which looks overloads up defensively
sys.path.insert(0, os.path.join(P.PJ, "site_txmain"))
import torchax  # noqa: E402

R["torchax_version"] = torchax.__version__
R["torchax_commit"] = "d95b0a5bff13e2b945e6a0e7ba3b3937b838161b"
tm2 = MT.make_model(cfg, 0); tm2.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
with torch.no_grad():
    ref = tm2(xt.long()).numpy()
t0 = time.perf_counter()
states, fn = torchax.extract_jax(tm2)
R["torchax_states"] = dict(n=len(states), example=sorted(states)[:3], dtype=str(next(iter(states.values())).dtype),
                           head_shape=list(states["head.weight"].shape))
fj = jax.jit(fn)
lg = np.asarray(fj(states, (jnp.asarray(x0),)))
R["torchax_logits_maxdiff"] = P.maxdiff(lg, ref)
R["torchax_first_call_s"] = round(time.perf_counter() - t0, 2)
# the jaxpr and gradients: torch code is now a JAX function, so grad works on it
jx = jax.make_jaxpr(fn)(states, (jnp.asarray(x0),))
prims = {}
for e in jx.eqns:
    prims[e.primitive.name] = prims.get(e.primitive.name, 0) + 1
R["torchax_jaxpr"] = dict(eqns=len(jx.eqns), top=sorted(prims.items(), key=lambda kv: -kv[1])[:10])
jxr = jax.make_jaxpr(lambda p, x: MJ.apply(p, x, cfg))(MJ.from_torch(sd0, cfg), x0)
R["native_jaxpr_eqns"] = len(jxr.eqns)


def tx_loss(st, x, y):
    return optax.softmax_cross_entropy_with_integer_labels(fn(st, (x,)), y).mean()


lval, g = jax.jit(jax.value_and_grad(tx_loss))(states, jnp.asarray(x0), jnp.asarray(y0))
tm2.zero_grad(set_to_none=True); lt = MT.loss_fn(tm2, xt.long(), yt.long()); lt.backward()
R["torchax_grad"] = dict(loss=float(lval), loss_torch=float(lt),
                         grad_maxdiff=max(float(np.abs(np.asarray(g[n]) - p.grad.numpy()).max()) for n, p in tm2.named_parameters()))
R["versions"] = dict(P.versions(), torch=torch.__version__, torchax=torchax.__version__)
P.save("interop", R)
