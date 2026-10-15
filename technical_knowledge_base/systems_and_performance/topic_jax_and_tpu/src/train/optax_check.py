"""optax.adamw against torch.optim.AdamW on the same gradients, and the reference data for the page's
optax chain builder.

1. Same gradients: the running example's real gradients on training batches 0..N-1, all taken at the shared
   initial weights (so they do not depend on either optimiser). Feed the same sequence to torch.optim.AdamW
   (two parameter groups, decay on 2-D weights) and to optax.chain(clip_by_global_norm, adamw(mask=...)),
   with the shared warmup schedule; compare the parameters after every step.
2. Defaults: the same comparison with each library's defaults (weight decay, betas, no mask), to show what
   a port gets wrong if it relies on them.
3. Chain-builder reference: 8 coordinates of the real gradients (6 of blocks.0.mlp.fc1.weight[0, :6] and
   2 of blocks.0.ln1.weight[:2]) over 6 steps, run through a grid of optax chains; the page's JavaScript
   re-implements the same transformations and check_train.mjs compares it with these numbers.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B optax_check.py
"""
import itertools
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np
import torch

torch.set_num_threads(4)
import jax
import jax.numpy as jnp
import optax

import common as C
import model_torch as MT

cfg = C.CFG
N = 50
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
tm = MT.make_model(cfg, 0); tm.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
names = [n for n, _ in tm.named_parameters()]
grads = []
for s in range(N):
    x, y = C.batch(s)
    tm.zero_grad(); MT.loss_fn(tm, torch.from_numpy(x).long(), torch.from_numpy(y).long()).backward()
    grads.append({n: p.grad.numpy().copy() for n, p in tm.named_parameters()})
gnorm0 = [float(np.sqrt(sum((g ** 2).sum() for g in G.values()))) for G in grads]


def run_torch(groups_cfg, clip, sched, betas=None):
    """groups_cfg: list of (names, weight_decay) or None for one group with library defaults."""
    m = MT.make_model(cfg, 0); m.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
    P = dict(m.named_parameters())
    if groups_cfg is None:
        opt = torch.optim.AdamW(m.parameters(), lr=cfg["lr"])
    else:
        opt = torch.optim.AdamW([{"params": [P[n] for n in ns], "weight_decay": wd} for ns, wd in groups_cfg],
                                lr=cfg["lr"], betas=betas or cfg["betas"], eps=cfg["adam_eps"])
    sch = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: C.lr_at(s) / cfg["lr"]) if sched else None
    out = []
    for G in grads:
        for n, p in P.items():
            p.grad = torch.from_numpy(G[n].copy())
        if clip:
            torch.nn.utils.clip_grad_norm_(m.parameters(), clip)
        opt.step()
        if sch: sch.step()
        out.append({n: p.detach().numpy().copy() for n, p in P.items()})
    return out


def run_optax(tx):
    params = {n: jnp.asarray(v) for n, v in sd0.items() if n in names}
    st = tx.init(params)
    upd = jax.jit(lambda g, s, p: tx.update(g, s, p))
    out = []
    for G in grads:
        u, st = upd({n: jnp.asarray(G[n]) for n in names}, st, params)
        params = optax.apply_updates(params, u)
        out.append({n: np.asarray(v) for n, v in params.items()})
    return out


def compare(a, b):
    w0 = {n: sd0[n] for n in names}
    per_step = [max(float(np.abs(A[n] - B[n]).max()) for n in names) for A, B in zip(a, b)]
    moved = [max(float(np.abs(A[n] - w0[n]).max()) for n in names) for A in a]
    return {"max_abs_param_diff_per_step": per_step, "max_abs_param_change_from_init": moved}


decay = [n for n in names if C.decay_mask_name(n)]
rest = [n for n in names if n not in decay]
mask = {n: (n in decay) for n in names}
sched = lambda count: cfg["lr"] * jnp.minimum(1.0, (count + 1) / cfg["warmup"])

res = {"n_steps": N, "n_decayed_tensors": len(decay), "n_tensors": len(names), "grad_norms": gnorm0}
# 1. matched settings (the running example's)
ta = run_torch([(decay, cfg["weight_decay"]), (rest, 0.0)], cfg["clip"], True)
oa = run_optax(optax.chain(optax.clip_by_global_norm(cfg["clip"]),
                           optax.adamw(sched, b1=cfg["betas"][0], b2=cfg["betas"][1], eps=cfg["adam_eps"],
                                       weight_decay=cfg["weight_decay"], mask=mask)))
res["matched"] = compare(ta, oa)
# 1b. matched, but without clipping (isolates AdamW itself from the clip's 1e-6)
tb = run_torch([(decay, cfg["weight_decay"]), (rest, 0.0)], 0, True)
ob = run_optax(optax.adamw(sched, b1=cfg["betas"][0], b2=cfg["betas"][1], eps=cfg["adam_eps"],
                           weight_decay=cfg["weight_decay"], mask=mask))
res["matched_noclip"] = compare(tb, ob)
# 2. each library's defaults: torch AdamW(lr) vs optax.adamw(lr), constant lr, no clip, no mask
tc = run_torch(None, 0, False)
oc = run_optax(optax.adamw(cfg["lr"]))
res["defaults"] = compare(tc, oc)
res["defaults_note"] = {"torch": {"betas": [0.9, 0.999], "eps": 1e-8, "weight_decay": 0.01},
                        "optax": {"b1": 0.9, "b2": 0.999, "eps": 1e-8, "weight_decay": 1e-4, "mask": None}}
# which parameters differ most under defaults, and by how much relative to their change
last_t, last_o = tc[-1], oc[-1]
worst = sorted(((float(np.abs(last_t[n] - last_o[n]).max()), n) for n in names), reverse=True)[:5]
res["defaults_worst"] = [[n, v] for v, n in worst]
# 2b. optax default weight decay 1e-4 vs torch's 0.01, everything else matched
td = run_torch([(names, 0.01)], 0, False, betas=(0.9, 0.999))   # torch defaults, written out
od = run_optax(optax.adamw(cfg["lr"], weight_decay=1e-4))
oe = run_optax(optax.adamw(cfg["lr"], weight_decay=0.01))
res["wd_default_gap"] = compare(td, od)
res["wd_matched"] = compare(td, oe)

# 3. chain-builder reference
coords = [("blocks.0.mlp.fc1.weight", (0, i)) for i in range(6)] + [("blocks.0.ln1.weight", (i,)) for i in range(2)]
g8 = [[float(G[n][ix]) for n, ix in coords] for G in grads[:6]]
p8 = [float(sd0[n][ix]) for n, ix in coords]
m8 = [True] * 6 + [False] * 2
ref = {"coords": ["%s%s" % (n, list(ix)) for n, ix in coords], "grads": g8, "params0": p8, "decay_mask": m8, "cases": []}


def sch_of(kind, lr):
    if kind == "constant": return lr
    if kind == "warmup": return lambda c: lr * jnp.minimum(1.0, (c + 1) / 3)          # 3-step linear warmup
    if kind == "cosine": return optax.warmup_cosine_decay_schedule(0.0, lr, 2, 6, end_value=0.0)


def build(opt, clip, wd, use_mask, sched_kind, lr):
    s = sch_of(sched_kind, lr)
    parts = [optax.clip_by_global_norm(clip)] if clip else []
    mk = m8 if use_mask else None
    if opt == "sgd": parts.append(optax.sgd(s))
    elif opt == "momentum": parts.append(optax.sgd(s, momentum=0.9))
    elif opt == "adam": parts.append(optax.adam(s))
    elif opt == "adamw": parts.append(optax.adamw(s, weight_decay=wd, mask=mk))
    elif opt == "lion": parts.append(optax.lion(s, weight_decay=wd, mask=mk))
    return optax.chain(*parts)


for opt, clip, wd, use_mask, sk, lr in itertools.product(
        ["sgd", "momentum", "adam", "adamw", "lion"], [0, 0.05], [0.0, 0.1], [True, False], ["constant", "warmup", "cosine"], [1e-3, 1e-2]):
    if opt in ("sgd", "momentum", "adam") and (wd or not use_mask):
        continue
    tx = build(opt, clip, wd, use_mask, sk, lr)
    params = [jnp.float32(v) for v in p8]; st = tx.init(params); traj, ups = [], []   # 8 scalar leaves
    for g in g8:
        u, st = tx.update([jnp.float32(v) for v in g], st, params)
        params = optax.apply_updates(params, u)
        ups.append([float(v) for v in u]); traj.append([float(v) for v in params])
    ref["cases"].append({"opt": opt, "clip": clip, "wd": wd, "mask": use_mask, "sched": sk, "lr": lr, "updates": ups, "params": traj})
res["chain_cases"] = len(ref["cases"])
res["versions"] = {"optax": optax.__version__, "torch": torch.__version__, "jax": jax.__version__}
json.dump(res, open(os.path.join(HERE, "out", "optax_check.json"), "w"), indent=1)
json.dump(ref, open(os.path.join(HERE, "out", "chain_ref.json"), "w"))
for k in ("matched", "matched_noclip", "defaults", "wd_default_gap", "wd_matched"):
    r = res[k]; print(k, "max diff step1 %.2e step10 %.2e step50 %.2e; moved %.3e" % (
        r["max_abs_param_diff_per_step"][0], r["max_abs_param_diff_per_step"][9], r["max_abs_param_diff_per_step"][-1],
        r["max_abs_param_change_from_init"][-1]))
print("worst under defaults", res["defaults_worst"]); print("chain cases", res["chain_cases"])
