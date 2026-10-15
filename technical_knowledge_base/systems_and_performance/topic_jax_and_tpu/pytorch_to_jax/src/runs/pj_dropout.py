"""Dropout when porting: the masks cannot match (different random generators), so what can be tested?

The running example with residual dropout p = 0.1 (after attention and after the MLP), 300 steps, same weights and
batches: PyTorch (torch.manual_seed), JAX with a fresh key per step (fold_in(key, step)), JAX with the SAME key every
step (the classic port bug: in PyTorch the generator advances by itself), and the running example without dropout
as the anchor. Plus: validation with dropout left on (eval mode forgotten). Writes out/dropout.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_dropout.py   (about 5 to 15 minutes)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn.functional as F  # noqa: E402

torch.set_num_threads(4)
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import optax  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
import model_torch as MT  # noqa: E402

STEPS, PD = 300, 0.1
cfg = dict(C.CFG)
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
val_batches = [C.batch(i, "val", n_steps=8) for i in range(8)]


# ---------------- JAX: the plain twin with dropout on the two residual branches
def drop(x, key, train):
    if not train:
        return x
    keep = jax.random.bernoulli(key, 1 - PD, x.shape)
    return jnp.where(keep, x / (1 - PD), 0.0)


def apply_d(params, idx, key, train):
    T = idx.shape[1]
    x = params["tok_emb"][idx] + params["pos_emb"][:T]
    keys = jax.random.split(key, 2 * len(params["blocks"]))
    for i, p in enumerate(params["blocks"]):
        x = x + drop(MJ.attention(p["attn"], MJ.layer_norm(p["ln1"], x, cfg["ln_eps"]), cfg["n_heads"]), keys[2 * i], train)
        x = x + drop(MJ.mlp(p["mlp"], MJ.layer_norm(p["ln2"], x, cfg["ln_eps"])), keys[2 * i + 1], train)
    return MJ.layer_norm(params["ln_f"], x, cfg["ln_eps"]) @ params["head"]["w"]


def loss_d(p, x, y, key, train):
    return optax.softmax_cross_entropy_with_integer_labels(apply_d(p, x, key, train), y).mean()


def run_jax(mode, seed=0):
    params = MJ.from_torch(sd0, cfg); tx = MJ.make_optimizer(cfg, C.lr_at); st = tx.init(params)
    root = jax.random.key(seed)

    @jax.jit
    def step(p, s, x, y, key):
        l, g = jax.value_and_grad(loss_d)(p, x, y, key, mode != "off")
        u, s = tx.update(g, s, p)
        return optax.apply_updates(p, u), s, l

    losses = []
    for s in range(STEPS):
        x, y = C.batch(s)
        key = root if mode == "reuse" else jax.random.fold_in(root, s)
        params, st, l = step(params, st, x, y, key)
        losses.append(round(float(l), 6))
    ev = jax.jit(lambda p, x, y, k, tr: loss_d(p, x, y, k, tr), static_argnums=4)
    val = float(np.mean([ev(params, a, b, root, False) for a, b in val_batches]))
    val_on = float(np.mean([ev(params, a, b, jax.random.fold_in(root, 10_000 + i), True) for i, (a, b) in enumerate(val_batches)]))
    return dict(loss=losses, val_300=val, val_300_dropout_left_on=val_on)


# ---------------- PyTorch: the same model with F.dropout on the same two branches
class BlockD(torch.nn.Module):
    def __init__(self, b):
        super().__init__(); self.b = b

    def forward(self, x):
        x = x + F.dropout(self.b.attn(self.b.ln1(x)), PD, self.training)
        return x + F.dropout(self.b.mlp(self.b.ln2(x)), PD, self.training)


def run_torch():
    torch.manual_seed(0)
    m = MT.make_model(cfg, 0); m.load_state_dict({k: torch.from_numpy(v) for k, v in sd0.items()})
    m.blocks = torch.nn.ModuleList(BlockD(b) for b in m.blocks)
    opt, sched = MT.make_optimizer(m, cfg, C.lr_at)
    torch.manual_seed(0); m.train(); losses = []
    for s in range(STEPS):
        x, y = C.batch(s)
        l, _ = MT.train_step(m, opt, sched, torch.from_numpy(x).long(), torch.from_numpy(y).long(), cfg["clip"])
        losses.append(round(l, 6))
    with torch.no_grad():
        m.eval(); val = float(np.mean([float(MT.loss_fn(m, torch.from_numpy(a).long(), torch.from_numpy(b).long())) for a, b in val_batches]))
        m.train(); val_on = float(np.mean([float(MT.loss_fn(m, torch.from_numpy(a).long(), torch.from_numpy(b).long())) for a, b in val_batches]))
    return dict(loss=losses, val_300=val, val_300_dropout_left_on=val_on)


R = {"steps": STEPS, "p": PD, "runs": {}}
for name, fn in [("torch", run_torch), ("jax_fresh", lambda: run_jax("fresh")), ("jax_fresh_seed1", lambda: run_jax("fresh", 1)), ("jax_reuse", lambda: run_jax("reuse")), ("jax_off", lambda: run_jax("off"))]:
    with P.Timer() as t:
        R["runs"][name] = fn()
    R["runs"][name].update(wall_s=round(t.wall, 1), cpu_s=round(t.cpu, 1))
    print(name, R["runs"][name]["val_300"], R["runs"][name]["val_300_dropout_left_on"], flush=True)
L = {k: np.array(v["loss"]) for k, v in R["runs"].items()}
w = lambda a: float(a[-50:].mean())
R["summary"] = dict(last50_mean={k: w(v) for k, v in L.items()},
                    torch_vs_jax_fresh_max_abs=float(np.abs(L["torch"] - L["jax_fresh"]).max()),
                    torch_vs_jax_fresh_last50_mean_diff=w(L["torch"]) - w(L["jax_fresh"]),
                    seed_noise_last50=w(L["jax_fresh_seed1"]) - w(L["jax_fresh"]),
                    val_seed_noise=R["runs"]["jax_fresh_seed1"]["val_300"] - R["runs"]["jax_fresh"]["val_300"],
                    step0_torch_vs_jax_fresh=float(abs(L["torch"][0] - L["jax_fresh"][0])))
R["label"] = P.LABEL; R["load"] = P.load1(); R["versions"] = dict(P.versions(), torch=torch.__version__)
P.save("dropout", R)
