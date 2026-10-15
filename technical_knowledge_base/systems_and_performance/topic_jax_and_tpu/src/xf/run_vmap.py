"""vmap: per-example gradients of the running example (32 sequences of 128 characters), four ways:
a Python loop over a jitted grad, jit(vmap(grad)), a PyTorch loop of backward() calls, and
torch.func.vmap(grad). Values checked against each other; rough timings. Also the jaxprs that show
what vmap does to each primitive (batching rules). Output: out/vmap.json"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
from torch.func import functional_call, grad as tgrad, vmap as tvmap  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
import model_torch as MT  # noqa: E402

torch.set_num_threads(4)
cfg = C.CFG
sd = dict(np.load(C.path("data", "init_torch.npz")))
xn, yn = C.batch(0)
x, y = jnp.asarray(xn), jnp.asarray(yn)
params = MJ.from_torch(sd, cfg)
out = {"versions": X.versions(), "torch": torch.__version__, "B": int(x.shape[0]), "T": int(x.shape[1])}
REPS = 5


def per_ex_loss(p, xi, yi):                     # one sequence: xi, yi int32[128]
    return MJ.loss_fn(p, xi[None], yi[None], cfg)


g_one = jax.jit(jax.grad(per_ex_loss))
g_vmap = jax.jit(jax.vmap(jax.grad(per_ex_loss), in_axes=(None, 0, 0)))


def jax_loop():
    gs = [g_one(params, x[i], y[i]) for i in range(x.shape[0])]
    return jax.tree.map(lambda *a: jnp.stack(a), *gs)


def timeit(fn, block):
    fn_out = fn(); block(fn_out)                 # warm up (compile)
    ts = []
    for _ in range(REPS):
        t0 = time.perf_counter(); r = fn(); block(r); ts.append(time.perf_counter() - t0)
    return r, ts


jb = lambda r: jax.block_until_ready(r)  # noqa: E731
loop_g, t_loop = timeit(jax_loop, jb)
vm_g, t_vmap = timeit(lambda: g_vmap(params, x, y), jb)

# PyTorch twin on the same weights
tm = MT.make_model(cfg)
tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd.items()})
xt, yt = torch.from_numpy(xn).long(), torch.from_numpy(yn).long()
names = [n for n, _ in tm.named_parameters()]


def torch_loop():
    res = {n: [] for n in names}
    for i in range(xt.shape[0]):
        tm.zero_grad(set_to_none=True)
        MT.loss_fn(tm, xt[i:i + 1], yt[i:i + 1]).backward()
        for n, p in tm.named_parameters():
            res[n].append(p.grad.detach().clone())
    return {n: torch.stack(v) for n, v in res.items()}


tparams = {k: v.detach() for k, v in tm.named_parameters()}


def t_loss(p, xi, yi):
    logits = functional_call(tm, p, (xi[None],))
    return torch.nn.functional.cross_entropy(logits.reshape(-1, logits.shape[-1]), yi[None].reshape(-1))


t_vm = tvmap(tgrad(t_loss), in_dims=(None, 0, 0))
tl_g, t_tloop = timeit(torch_loop, lambda r: None)
with torch.no_grad():
    tv_g, t_tvmap = timeit(lambda: t_vm(tparams, xt, yt), lambda r: None)

# agreement
def jax_stack_to_named(gstack):
    per = [MJ.to_torch_names(jax.tree.map(lambda a, i=i: a[i], gstack)) for i in range(x.shape[0])]
    return {n: np.stack([d[n] for d in per]) for n in per[0]}


vm_named = jax_stack_to_named(vm_g)
loop_named = jax_stack_to_named(loop_g)
d_vmap_loop = max(float(np.abs(vm_named[n] - loop_named[n]).max()) for n in names)
d_jax_torchloop = max(float(np.abs(vm_named[n] - tl_g[n].numpy()).max()) for n in names)
d_jax_torchvmap = max(float(np.abs(vm_named[n] - tv_g[n].numpy()).max()) for n in names)
d_torch_loop_vmap = max(float(np.abs(tl_g[n].numpy() - tv_g[n].numpy()).max()) for n in names)
gbatch = jax.grad(lambda p: MJ.loss_fn(p, x, y, cfg))(params)
d_mean = max(float(jnp.abs(a.mean(0) - b).max()) for a, b in zip(jax.tree.leaves(vm_g), jax.tree.leaves(gbatch)))
nparam = sum(v.size for v in jax.tree.leaves(params))
# per-example gradient norms: the quantity DP-SGD clips
norms = np.sqrt(sum(np.sum(np.asarray(v).reshape(x.shape[0], -1) ** 2, 1) for v in jax.tree.leaves(vm_g)))
out["agree"] = {"vmap_vs_loop": d_vmap_loop, "jax_vs_torch_loop": d_jax_torchloop, "jax_vs_torch_func": d_jax_torchvmap,
                "torch_loop_vs_torch_func": d_torch_loop_vmap, "mean_vs_batch_grad": d_mean}
out["per_example_norms"] = np.round(norms, 4).tolist()
out["grad_bytes"] = int(nparam * 4 * x.shape[0])
med = lambda ts: round(X.median(ts), 4)  # noqa: E731
out["time_s"] = {"jax_loop": med(t_loop), "jax_vmap": med(t_vmap), "torch_loop": med(t_tloop), "torch_func_vmap": med(t_tvmap),
                 "raw": {"jax_loop": t_loop, "jax_vmap": t_vmap, "torch_loop": t_tloop, "torch_func_vmap": t_tvmap},
                 "label": f"measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority; median of {REPS} after one warm-up; all 32 per-example gradients"}
out["load"] = os.getloadavg()[0]
print(out["agree"], out["time_s"], out["load"])

# ---- batching rules: the same primitive before and after vmap
def dot(q, k):                                   # q, k float32[32]: one head's score for one query and one key
    return q @ k


q = jnp.ones(32); K = jnp.ones((128, 32)); Q = jnp.ones((128, 32))
out["batching"] = {
    "one": str(jax.make_jaxpr(dot)(q, q)),
    "keys": str(jax.make_jaxpr(jax.vmap(dot, in_axes=(None, 0)))(q, K)),
    "both": str(jax.make_jaxpr(jax.vmap(dot, in_axes=(0, 0)))(Q, K)),
    "grid": str(jax.make_jaxpr(jax.vmap(jax.vmap(dot, in_axes=(None, 0)), in_axes=(0, None)))(Q, K)),
}
# per-example gradient program: jaxpr size of grad against vmap(grad)
cj1 = jax.make_jaxpr(jax.grad(per_ex_loss))(params, x[0], y[0])
cj2 = jax.make_jaxpr(jax.vmap(jax.grad(per_ex_loss), in_axes=(None, 0, 0)))(params, x, y)
out["eqns"] = {"grad": len(cj1.jaxpr.eqns), "vmap_grad": len(cj2.jaxpr.eqns)}
# MLP on one token against vmap over the 4,096 tokens of a batch (for the animation)
p_mlp = params["blocks"][0]["mlp"]
tok = jnp.ones(128); toks = jnp.ones((4096, 128))
one = jax.make_jaxpr(MJ.mlp)(p_mlp, tok)
bat = jax.make_jaxpr(jax.vmap(MJ.mlp, in_axes=(None, 0)))(p_mlp, toks)
h1, e1, f1 = X.split_jaxpr(str(one)); h2, e2, f2 = X.split_jaxpr(str(bat))
out["mlp_anim"] = {"one": {"head": h1, "eqns": e1, "foot": f1, "prims": [e.primitive.name for e in one.jaxpr.eqns]},
                   "batch": {"head": h2, "eqns": e2, "foot": f2, "prims": [e.primitive.name for e in bat.jaxpr.eqns]}}
X.save("vmap", out)
