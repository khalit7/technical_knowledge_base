"""The running example's train step through every stage of jit: jaxpr -> StableHLO -> HLO -> optimised HLO -> executable.

Counts at each stage, cost_analysis, memory_analysis with and without donation, and the texts themselves
(scrubbed, kept in $JX_SCRATCH/xla/ for the excerpt scripts). Output: src/xla/out/pipeline.json
"""
import os, sys, time; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import jax
import jax.numpy as jnp  # noqa: F401
import optax  # noqa: F401

import xc_common as X
import hlo_tools as H
import model_jax as MJ

C = X.C
cfg = C.CFG
params, tx, opt, x, y = X.setup_state()


def step_fn(params, opt_state, x, y):          # the same body as MJ.make_train_step, un-jitted
    loss, grads = jax.value_and_grad(MJ.loss_fn)(params, x, y, cfg)
    updates, opt_state = tx.update(grads, opt_state, params)
    params = optax.apply_updates(params, updates)
    return params, opt_state, loss, optax.global_norm(grads)


res = {"versions": X.versions(), "what": "running example train step (model_jax.make_train_step body), batch 32x128, float32"}

# ---- stage 1: trace to a jaxpr
t0 = time.perf_counter()
traced = jax.jit(step_fn).trace(params, opt, x, y)
res["trace_s"] = time.perf_counter() - t0
jx = H.jaxpr_counts(traced.jaxpr)
res["jaxpr"] = jx
jtxt = str(traced.jaxpr)
res["jaxpr"]["lines"] = len(jtxt.splitlines())
res["jaxpr"]["bytes"] = len(jtxt.encode())
open(X.big("step_jaxpr.txt"), "w").write(X.scrub(jtxt))

# ---- stage 2: lower to StableHLO
t0 = time.perf_counter()
lowered = traced.lower()
res["lower_s"] = time.perf_counter() - t0
shlo = lowered.as_text()
res["stablehlo"] = H.stablehlo_counts(shlo)
open(X.big("step_stablehlo.mlir"), "w").write(X.scrub(shlo))
try:
    hlo = lowered.as_text(dialect="hlo")
    res["hlo"] = H.hlo_counts(hlo)
    open(X.big("step_hlo.txt"), "w").write(X.scrub(hlo))
except Exception as e:  # noqa: BLE001
    res["hlo_error"] = repr(e)[:300]

# ---- stage 3: compile (XLA's optimisation passes and codegen)
t0 = time.perf_counter()
compiled = lowered.compile()
res["compile_s"] = time.perf_counter() - t0
ohlo = compiled.as_text()
res["opt_hlo"] = H.hlo_counts(ohlo)
open(X.big("step_opt_hlo.txt"), "w").write(X.scrub(ohlo))
ca = compiled.cost_analysis()
ca = ca[0] if isinstance(ca, (list, tuple)) else ca
res["cost_analysis"] = {k: float(v) for k, v in ca.items() if isinstance(v, (int, float)) and ("flops" in k or "bytes accessed" == k or k in ("transcendentals", "optimal_seconds", "utilization"))}


def mem(c):
    m = c.memory_analysis()
    return {k: int(getattr(m, k)) for k in dir(m) if k.endswith("_in_bytes") or k.endswith("_bytes")}


res["memory_no_donation"] = mem(compiled)

# ---- the same step with donation (exactly MJ.make_train_step)
jd = MJ.make_train_step(cfg, tx)
cd = jd.lower(params, opt, x, y).compile()
res["memory_donated"] = mem(cd)
ohd = cd.as_text()
res["opt_hlo_donated"] = {k: H.hlo_counts(ohd)[k] for k in ("fusions_all", "kernels", "entry_instructions")}
res["donated_aliases"] = ohd.count("may-alias") + ohd.count("must-alias")
hdr = ohd.splitlines()[0]
res["donated_header_has_alias"] = "input_output_alias" in hdr
import re as _re
m = _re.search(r"input_output_alias=\{(.*?)\}\s*,\s*entry_computation_layout", hdr)
al = _re.findall(r"\{\d*\}: \(\d+, \{\}, [\w-]+\)", m.group(1)) if m else []
res["donated_alias_count"] = len(al)
res["donated_alias_excerpt"] = ", ".join(al[:3])

# parameter and optimizer-state bytes, for the note
nb = lambda t: sum(a.size * a.dtype.itemsize for a in jax.tree.leaves(t))
res["bytes"] = {"params": int(nb(params)), "opt_state": int(nb(opt)), "batch": int(x.nbytes + y.nbytes)}


# ---- the same counts for the pieces of the step: forward only, forward + backward, and the scan version
def stages(fn, *args):
    tr = jax.jit(fn).trace(*args)
    lo = tr.lower()
    co = lo.compile()
    oh = H.hlo_counts(co.as_text())
    ca = co.cost_analysis()
    ca = ca[0] if isinstance(ca, (list, tuple)) else ca
    return {"jaxpr_eqns": H.jaxpr_counts(tr.jaxpr)["flat_eqns"], "stablehlo_ops": H.stablehlo_counts(lo.as_text())["ops"],
            "hlo_instructions": H.hlo_counts(lo.as_text(dialect="hlo"))["instructions_total"],
            "opt_instructions": oh["instructions_total"], "fusions": oh["fusions_all"], "fusions_multi": oh["fusions_multi"],
            "kernels": oh["kernels"], "flops": float(ca.get("flops", 0)), "temp_bytes": int(co.memory_analysis().temp_size_in_bytes)}


fwd = lambda p, x, y: MJ.loss_fn(p, x, y, cfg)
fwdbwd = lambda p, x, y: jax.value_and_grad(MJ.loss_fn)(p, x, y, cfg)
sp = MJ.stack_blocks(params)
sopt = tx.init(sp)


def loss_scan(p, x, y):
    return optax.softmax_cross_entropy_with_integer_labels(MJ.apply_scan(p, x, cfg), y).mean()


def step_scan(params, opt_state, x, y):
    loss, grads = jax.value_and_grad(loss_scan)(params, x, y)
    updates, opt_state = tx.update(grads, opt_state, params)
    return optax.apply_updates(params, updates), opt_state, loss, optax.global_norm(grads)


res["pieces"] = {"forward": stages(fwd, params, x, y), "forward_backward": stages(fwdbwd, params, x, y),
                 "step": stages(step_fn, params, opt, x, y), "step_scan": stages(step_scan, sp, sopt, x, y)}
for k, v in res["pieces"].items():
    print(k, v)
X.save("pipeline.json", res)
print({k: res[k] for k in ("trace_s", "lower_s", "compile_s")})
print("jaxpr top/flat", jx["top_eqns"], jx["flat_eqns"])
print("stablehlo ops", res["stablehlo"]["ops"], "funcs", res["stablehlo"]["funcs"])
print("hlo", res.get("hlo", {}).get("instructions_total"), "opt", res["opt_hlo"]["instructions_total"],
      "fusions", res["opt_hlo"]["fusions_all"], "kernels", res["opt_hlo"]["kernels"])
print("mem", res["memory_no_donation"], res["memory_donated"])
print("cost", res["cost_analysis"])
