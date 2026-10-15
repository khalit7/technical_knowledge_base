"""The running example's matmuls (and a 7B-class model's) placed on the TPU roofline. Writes out/roofline.json.

Measured here (deterministic): every dot_general in the jaxpr of one training step's value_and_grad (forward and
backward) of the running example, with its shapes, and the step's cost_analysis() from the CPU compile.
Calculated (labelled on the page): FLOPs, bytes moved, arithmetic intensity, MXU padding and the time each op would need
at best on each TPU generation, from the published peaks in out/specs.json. No TPU was used.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # -I drops the script folder
import json, math
import numpy as np
import jax, jax.numpy as jnp
import tp_common as T
import common as C, model_jax as MJ

cfg = C.CFG
sd = dict(np.load(C.path("data", "init_torch.npz")))
params = MJ.from_torch(sd, cfg)
x, y = C.batch(0)
specs = json.load(open(os.path.join(T.OUT, "specs.json")))
G = {g["gen"]: g for g in specs["gens"]}


def dots(jaxpr, out, phase_of):
    for i, e in enumerate(jaxpr.eqns):
        if e.primitive.name == "dot_general":
            (lc, rc), (lb, rb) = e.params["dimension_numbers"]
            ls, rs = e.invars[0].aval.shape, e.invars[1].aval.shape
            b = int(np.prod([ls[d] for d in lb])) if lb else 1
            k = int(np.prod([ls[d] for d in lc]))
            m = int(np.prod([ls[d] for d in range(len(ls)) if d not in lc and d not in lb]))
            n = int(np.prod([rs[d] for d in range(len(rs)) if d not in rc and d not in rb]))
            out.append(dict(lhs=list(ls), rhs=list(rs), b=b, m=m, k=k, n=n, phase=phase_of(i)))
        for p in ("jaxpr", "call_jaxpr", "fun_jaxpr"):
            if p in e.params:
                j = e.params[p]
                dots(getattr(j, "jaxpr", j), out, lambda _i: phase_of(i))


fwd_j = jax.make_jaxpr(lambda p: MJ.loss_fn(p, x, y, cfg))(params).jaxpr
fwd = []
dots(fwd_j, fwd, lambda i: "forward")
full_j = jax.make_jaxpr(lambda p: jax.value_and_grad(MJ.loss_fn)(p, x, y, cfg))(params).jaxpr
allv = []
dots(full_j, allv, lambda i: "step")
print("dot_generals: forward", len(fwd), "forward+backward", len(allv))

# name the forward ones by shape (the model is known: see ../data/model_jax.py)
D, F, V, H, TT, B = cfg["d_model"], cfg["d_ff"], cfg["vocab"], cfg["n_heads"], cfg["ctx"], cfg["batch"]
dh = D // H


def name(o):
    m, k, n, b = o["m"], o["k"], o["n"], o["b"]
    if b == B * H and k == dh: return "attention scores q k^T (per head)"
    if b == B * H and n == dh and k == TT: return "attention weights x v (per head)"
    if b == 1 and k == D and n == D: return "q, k, v, o projections (x W, 128 x 128)"
    if b == 1 and k == D and n == F: return "MLP up (x W1, 128 x 512)"
    if b == 1 and k == F and n == D: return "MLP down (h W2, 512 x 128)"
    if b == 1 and k == D and n == V: return "output head (x W_head, 128 x 65)"
    return None


groups = {}
for o in allv:
    key = (o["b"], o["m"], o["k"], o["n"])
    g = groups.setdefault(key, dict(b=o["b"], m=o["m"], k=o["k"], n=o["n"], count=0, fwd=0, lhs=o["lhs"], rhs=o["rhs"]))
    g["count"] += 1
for o in fwd:
    groups[(o["b"], o["m"], o["k"], o["n"])]["fwd"] += 1


def pad(v, s):
    return math.ceil(v / s) * s


ops = []
for g in groups.values():
    b, m, k, n = g["b"], g["m"], g["k"], g["n"]
    fl = 2 * b * m * k * n
    el = b * (m * k + k * n + m * n)          # elements read (lhs, rhs) and written (out), once each
    nm = name(g)
    if nm is None:
        nm = "backward: " + f"[{m} x {k}] x [{k} x {n}]" + (f", batch {b}" if b > 1 else "")
    elif g["count"] > g["fwd"]:
        nm += ", plus backward ops of the same shape"
    util = {}
    for s in (128, 256):
        # the MXU holds a k x n weight tile; rows stream through in groups of 8 sublanes
        util[str(s)] = round((m * k * n) / (pad(m, 8) * pad(k, s) * pad(n, s)), 4)
    ops.append(dict(name=nm, fwd=g["fwd"], bwd=g["count"] - g["fwd"], b=b, m=m, k=k, n=n, flops=fl,
                    bytes_bf16=2 * el, bytes_f32=4 * el, ai_bf16=round(fl / (2 * el), 2), ai_f32=round(fl / (4 * el), 2),
                    mxu_util=util))
ops.sort(key=lambda o: -o["flops"] * (o["fwd"] + o["bwd"]))
tot_dot = sum(o["flops"] * (o["fwd"] + o["bwd"]) for o in ops)
tot_bytes_bf16 = sum(o["bytes_bf16"] * (o["fwd"] + o["bwd"]) for o in ops)

# the whole step as XLA:CPU compiled it (cost_analysis counts every op, not only dots)
step = jax.jit(lambda p: jax.value_and_grad(MJ.loss_fn)(p, x, y, cfg))
ca = step.lower(params).compile().cost_analysis()
ca = ca[0] if isinstance(ca, list) else ca
ca_flops, ca_bytes = float(ca.get("flops", 0)), float(ca.get("bytes accessed", 0))


def best_time(fl, by, g):
    return max(fl / g["bf16"], by / g["bw"])


per_gen = {}
for gk, g in G.items():
    t_dots = sum(best_time(o["flops"], o["bytes_bf16"], g) * (o["fwd"] + o["bwd"]) for o in ops)
    per_gen[gk] = dict(t_dots_us=round(t_dots * 1e6, 2), t_peak_us=round(tot_dot / g["bf16"] * 1e6, 3),
                       mem_bound_ops=sum(1 for o in ops if o["ai_bf16"] < g["ridge"]))

# ---- a 7B-class model: Llama 2 7B as configured in MaxText (pinned clone, configs/models/llama2-7b.yml) ----
L7 = dict(d=4096, f=11008, layers=32, heads=32, head_dim=128, vocab=32000, src="maxtext src/maxtext/configs/models/llama2-7b.yml (main @ 1a95d1e5)")
d7, f7 = L7["d"], L7["f"]
P7 = L7["layers"] * (4 * d7 * d7 + 3 * d7 * f7) + 2 * L7["vocab"] * d7 + (2 * L7["layers"] + 1) * d7
L7["params"] = P7


def w7(tok):
    """Weight matmuls of one forward pass over `tok` tokens (per layer x layers, plus head): FLOPs and bf16 bytes."""
    mats = [(d7, d7)] * 4 + [(d7, f7)] * 2 + [(f7, d7)]
    fl = by = 0
    for k, n in mats:
        fl += 2 * tok * k * n
        by += 2 * (tok * k + k * n + tok * n)
    fl *= L7["layers"]; by *= L7["layers"]
    fl += 2 * tok * d7 * L7["vocab"]; by += 2 * (tok * d7 + d7 * L7["vocab"] + tok * L7["vocab"])
    return fl, by


seven = []
for tok in (1, 8, 32, 128, 256, 512, 1024, 4096, 16384):
    fl, by = w7(tok)
    row = dict(tokens=tok, flops=fl, bytes=by, ai=round(fl / by, 1))
    for gk, g in G.items():
        t = best_time(fl, by, g)
        row[gk] = dict(ms=round(t * 1e3, 3), frac_peak=round(fl / g["bf16"] / t, 4), tok_s=round(tok / t))
    seven.append(row)

T.save("roofline.json", dict(
    cfg=dict(batch=B, ctx=TT, d=D, f=F, vocab=V, heads=H, head_dim=dh),
    n_dots_fwd=len(fwd), n_dots_step=len(allv), ops=ops, dot_flops_step=tot_dot, dot_bytes_bf16_step=tot_bytes_bf16,
    cost_analysis=dict(flops=ca_flops, bytes_accessed=ca_bytes, note="XLA:CPU compile of value_and_grad(loss_fn), float32, jax 0.11.2"),
    per_gen=per_gen, l7=L7, seven=seven,
    formula=dict(flops="2 x b x m x k x n", bytes="bytes per element x b x (m k + k n + m n)", ai="FLOPs / bytes",
                 time="max(FLOPs / peak, bytes / HBM bandwidth)", mxu_util="m k n / (pad8(m) x padS(k) x padS(n)), S = MXU side")))
for o in ops:
    print(f'{o["name"]:<46} x{o["fwd"]}+{o["bwd"]} ai_bf16 {o["ai_bf16"]:>7} util128 {o["mxu_util"]["128"]} util256 {o["mxu_util"]["256"]}')
print("dot flops", tot_dot, "cost_analysis flops", ca_flops, "bytes", ca_bytes)
print(per_gen)
for r in seven:
    print(r["tokens"], r["ai"], r["v6e"], r["v5e"])
