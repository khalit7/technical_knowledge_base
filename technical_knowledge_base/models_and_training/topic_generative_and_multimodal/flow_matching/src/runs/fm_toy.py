"""Flow matching child page, 2-D toy (CPU, minutes): the root Flow lab's ring of 8 Gaussians, taken further.

The data is a Gaussian mixture, so the MARGINAL velocity field u(x, t) (what a flow-matching network should learn) has a
closed form for any Gaussian path x_t = a_t x1 + b_t x0 (x0 ~ N(0, I), t = 0 noise, t = 1 data):
    x_t | mode k ~ N(a mu_k, S I), S = a^2 s^2 + b^2;  w_k(x) = posterior over modes (a softmax)
    E[x1 | x] = sum_k w_k (mu_k + a s^2 / S (x - a mu_k)),  E[x0 | x] = sum_k w_k b / S (x - a mu_k)
    u = a' E[x1 | x] + b' E[x0 | x],  score = sum_k w_k (-(x - a mu_k) / S)
Experiments (all scored like the root's toy: 2,000 noises from seed 11, on-mode share, W2 against 2,000 data points):
  exact     the exact field on three paths (straight, cosine VP, DDPM-style VP): Euler steps, DDIM, straightness;
            DDIM on a VP path == Euler on the straight path at the matched times (checked numerically)
  floor     the irreducible part of the conditional loss by t, against the root's training loss
  learned   the root's trained flow network against the exact field, error by t
  sde       same marginals, added noise eps: dx = (u + eps/2 score) dt + sqrt(eps) dW
  rounds    reflow rounds 1 to 4 (1-RF and 2-RF are the root's networks; 3-RF and 4-RF trained here)
  distill   one-step students distilled from the k-RF pairs, k = 1, 2, 3
  ot        minibatch OT pairing: transport cost by batch size (no training), and OT-CFM trained at three batch sizes
  tsched    timestep sampling (uniform, logit-normal, mode, cosmap; SD3's section 3.1): 3 seeds x 2 budgets, error by t
Writes out/toy.json (scores, curves, int8 weights of the new networks for the page).
Run: nice -n 15 OMP_NUM_THREADS=4 python -I fm_toy.py
"""
import json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_FLOW = os.path.join(HERE, "..", "..", "..", "src", "flow")
sys.path.insert(0, ROOT_FLOW)
import numpy as np
import torch
from scipy.optimize import linear_sum_assignment
import toy2d as T                      # the root's toy: data, MLP, quantise, solvers, scores (imported, unchanged)

torch.set_num_threads(4)
CEN, SD, K = T.CEN.double(), T.SD, T.K
T0 = time.time()
OUT = {"date": time.strftime("%Y-%m-%d"), "machine": "Apple M1 Pro, CPU (4 threads)", "torch": torch.__version__}


def log(*a):
    print(f"[{time.time() - T0:7.1f}s]", *a, flush=True)


# ------------------------------------------------------------------ the root's networks (dequantised: what both pages run)
ROOT = json.load(open(os.path.join(ROOT_FLOW, "out", "toy2d.json")))


def deq(blob):
    import base64
    net = T.MLP(); sd = {}
    for i, l in enumerate(blob):
        q = np.frombuffer(base64.b64decode(l["q"]), dtype=np.int8).reshape(l["o"], l["i"]).astype(np.float32)
        sd[f"l.{i}.weight"] = torch.from_numpy(q) * torch.tensor(l["s"]).view(-1, 1)
        sd[f"l.{i}.bias"] = torch.tensor(l["b"])
    net.load_state_dict(sd)
    return net


RN = {k: deq(ROOT["nets"][k]) for k in ["cfm", "reflow", "ot"]}


# ------------------------------------------------------------------ Gaussian paths and the exact field
def coef(kind, t):
    """a_t, b_t and their t-derivatives. t = 0 noise, t = 1 data."""
    t = torch.as_tensor(t, dtype=torch.float64)
    if kind == "linear":
        return t, 1 - t, torch.ones_like(t), -torch.ones_like(t)
    if kind == "cos":
        h = math.pi / 2
        return torch.sin(h * t), torch.cos(h * t), h * torch.cos(h * t), -h * torch.sin(h * t)
    if kind == "vp":       # Song et al.'s VP SDE (beta_min 0.1, beta_max 20), the continuous DDPM schedule, run from s = 1 - t
        s = 1 - t
        ab = torch.exp(-(0.1 * s + 19.9 * s * s / 2)); beta = 0.1 + 19.9 * s
        a, b = ab.sqrt(), (1 - ab).sqrt()
        return a, b, beta * a / 2, -beta * ab / (2 * b)
    raise ValueError(kind)


def exact(x, t, kind="linear"):
    """Exact marginal velocity u, score, E[x1|x], E[x0|x] at (x, t) for the ring mixture. x: (N, 2) float64."""
    a, b, da, db = coef(kind, t)
    S = a * a * SD * SD + b * b
    d = x[:, None, :] - a * CEN[None]                      # N, K, 2
    w = torch.softmax(-(d * d).sum(-1) / (2 * S), 1)[..., None]
    E1 = (w * (CEN[None] + a * SD * SD / S * d)).sum(1)
    E0 = (w * (b / S * d)).sum(1)
    return da * E1 + db * E0, (w * (-d / S)).sum(1), E1, E0


def grid(n):
    return [k / n for k in range(n + 1)]


def solve_exact(z, n, kind="linear", solver="euler", ts=None, keep=False):
    ts = ts or grid(n); x = z.clone(); P = [x.clone()]
    for t, t2 in zip(ts[:-1], ts[1:]):
        h = t2 - t
        if solver == "euler":
            x = x + h * exact(x, t, kind)[0]
        elif solver == "midpoint":
            x = x + h * exact(x + 0.5 * h * exact(x, t, kind)[0], t + 0.5 * h, kind)[0]
        elif solver == "ddim":                              # re-noise the predicted ends at the next time
            _, _, E1, E0 = exact(x, t, kind)
            a2, b2, _, _ = coef(kind, t2)
            x = a2 * E1 + b2 * E0
        if keep:
            P.append(x.clone())
    return (x, torch.stack(P)) if keep else x


def straightness(P):
    seg = (P[1:] - P[:-1]).norm(dim=2).sum(0); d = (P[-1] - P[0]).norm(dim=1)
    return float((d / seg).mean())


def w2(x, y):
    return T.w2(x.float(), y.float())


def on_mode(x):
    return T.on_mode(x.float())


ge = torch.Generator().manual_seed(11)
zE = torch.randn(2000, 2, generator=ge); TGT = T.data(2000, ge)        # identical to the root's evaluation set
zD = zE.double()
NS = [1, 2, 3, 4, 6, 8, 16, 32, 64]


def score_set(x):
    return {"on_mode": round(on_mode(x), 4), "w2": round(w2(x, TGT), 4)}


# ================================================================== exact field on three paths
ex = {"paths": {}}
for kind in ["linear", "cos", "vp"]:
    ref, P = solve_exact(zD, 1000, kind, "midpoint", keep=True)
    rec = {"ref": score_set(ref), "straightness": round(straightness(P[::4]), 4), "euler": [], "ddim": []}
    for n in NS:
        x = solve_exact(zD, n, kind, "euler")
        rec["euler"].append({"steps": n, **score_set(x), "err_ref": round(float((x - ref).norm(dim=1).mean()), 4)})
        if kind != "linear":
            x = solve_exact(zD, n, kind, "ddim")
            rec["ddim"].append({"steps": n, **score_set(x), "err_ref": round(float((x - ref).norm(dim=1).mean()), 4)})
    ex["paths"][kind] = rec; log("exact", kind, rec["ref"], rec["straightness"], rec["euler"][3])
# DDIM on the cosine path at 4 steps == Euler on the straight path at times lambda = a / (a + b)
n = 4; tsC = grid(n)
lam = [float(coef("cos", t)[0] / (coef("cos", t)[0] + coef("cos", t)[1])) for t in tsC]
xc = solve_exact(zD, n, "cos", "ddim"); xl = solve_exact(zD, n, "linear", "euler", ts=lam)
ex["ddim_equiv"] = {"steps": n, "lambda": [round(v, 4) for v in lam], "max_abs_diff": float((xc - xl).abs().max())}
xl_u = solve_exact(zD, n, "linear", "euler")
ex["ddim_equiv"]["vs_uniform_grid_mean_dist"] = round(float((xc - xl_u).norm(dim=1).mean()), 4)
log("ddim == euler", ex["ddim_equiv"])
# one Euler step of the exact straight field: every point lands on E[x1] (the ring's centre)
x1s = solve_exact(zD, 1, "linear", "euler")
ex["one_step_mean_norm"] = round(float(x1s.norm(dim=1).mean()), 6)
OUT["exact"] = ex

# ================================================================== the loss floor, and the root's network against the exact field
TG = [0.0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0]
gF = torch.Generator().manual_seed(3)
floor, learned = [], []
for t in TG:
    x0 = torch.randn(20000, 2, generator=gF, dtype=torch.float64); x1 = T.data(20000, gF).double()
    xt = (1 - t) * x0 + t * x1
    u = exact(xt, t)[0]
    tgt = x1 - x0
    floor.append({"t": t, "total": round(float(((tgt) ** 2).sum(1).mean()), 4),
                  "floor": round(float(((tgt - u) ** 2).sum(1).mean()), 4),
                  "u_sq": round(float((u ** 2).sum(1).mean()), 4)})
    with torch.no_grad():
        v = RN["cfm"](xt.float(), torch.full((len(xt),), float(t))).double()
    learned.append({"t": t, "mse_vs_exact": round(float(((v - u) ** 2).sum(1).mean()), 5),
                    "loss_vs_target": round(float(((v - tgt) ** 2).sum(1).mean()), 4)})
# the expected conditional loss under uniform t (trapezoid on a fine grid), per coordinate like the root's mean() logs
tf = np.linspace(0, 1, 101); fl = []
for t in tf:
    x0 = torch.randn(4000, 2, generator=gF, dtype=torch.float64); x1 = T.data(4000, gF).double()
    xt = (1 - t) * x0 + t * x1
    fl.append(float(((x1 - x0 - exact(xt, float(t))[0]) ** 2).sum(1).mean()))
logs = [v for _, v in ROOT["logs"]["cfm"]]
OUT["floor"] = {"by_t": floor, "uniform_mean_per_coord": round(float(np.trapezoid(fl, tf)) / 2, 4),
                "root_cfm_log_last20_mean": round(float(np.mean(logs[-20:])), 4), "learned_cfm": learned,
                "note": "root logs are torch mean() over both coordinates of a 512 batch, so the floor is divided by 2"}
log("floor", OUT["floor"]["uniform_mean_per_coord"], OUT["floor"]["root_cfm_log_last20_mean"])
log("learned", learned)

# ================================================================== same marginals, added noise (stochastic sampling)
def solve_sde(z, n, eps, seed=5, kind="linear"):
    g = torch.Generator().manual_seed(seed); x = z.clone(); ts = grid(n)
    for t, t2 in zip(ts[:-1], ts[1:]):
        h = t2 - t
        u, sc, _, _ = exact(x, t, kind)
        x = x + h * (u + 0.5 * eps * sc) + math.sqrt(eps * h) * torch.randn(x.shape, generator=g, dtype=x.dtype)
    return x


sde = []
for eps in [0.0, 0.5, 1.0, 2.0, 4.0]:
    for n in [2, 4, 8, 16, 64, 256]:
        x = solve_sde(zD, n, eps)
        sde.append({"eps": eps, "steps": n, **score_set(x)})
    log("sde", eps, sde[-1])
OUT["sde"] = sde


# ================================================================== a general trainer (the root's recipe: Adam 2e-3 cosine, batch 512, 12,000 steps)
def lognorm(m, s):
    return lambda u, g: 1 - torch.sigmoid(m + s * torch.randn(u.shape, generator=g))      # SD3's t (1 = noise) -> ours


def mode(s):
    return lambda u, g: 1 - (1 - u - s * (torch.cos(math.pi * u / 2) ** 2 - 1 + u))


def cosmap():
    return lambda u, g: 1 - (1 - 1 / (torch.tan(math.pi * u / 2) + 1))


def train(kind="cfm", pairs=None, init=None, steps=T.STEPS, seed=0, tsamp=None, ot_block=None):
    torch.manual_seed(seed); g = torch.Generator().manual_seed(seed + 100)
    net = T.MLP()
    if init is not None:
        net.load_state_dict(init.state_dict())
    opt = torch.optim.Adam(net.parameters(), lr=T.LR)
    sch = torch.optim.lr_scheduler.CosineAnnealingLR(opt, steps)
    lg = []
    for s in range(steps):
        if pairs is not None:
            j = torch.randint(0, len(pairs[0]), (T.BS,), generator=g)
            x0, x1 = pairs[0][j], pairs[1][j]
        else:
            x0, x1 = torch.randn(T.BS, 2, generator=g), T.data(T.BS, g)
        if ot_block:
            parts = []
            for b in range(0, T.BS, ot_block):
                c = torch.cdist(x0[b:b + ot_block], x1[b:b + ot_block]) ** 2
                _, cidx = linear_sum_assignment(c.numpy())
                parts.append(x1[b:b + ot_block][torch.from_numpy(cidx)])
            x1 = torch.cat(parts)
        if kind == "distill":
            loss = ((x0 + net(x0, torch.zeros(T.BS)) - x1) ** 2).mean()
        else:
            u = torch.rand(T.BS, generator=g)
            t = (tsamp(u, g) if tsamp else u).clamp(0, 1)
            xt = (1 - t.view(-1, 1)) * x0 + t.view(-1, 1) * x1
            loss = ((net(xt, t) - (x1 - x0)) ** 2).mean()
        opt.zero_grad(); loss.backward(); opt.step(); sch.step()
        if s % 200 == 0 or s == steps - 1:
            lg.append([s, round(loss.item(), 4)])
    return net, lg


def flow_scores(net, ns=(1, 2, 4, 8, 64)):
    ref, P = T.flow_solve(net, zE, 256, "heun", keep=True)
    r = {"straightness": round(straightness(P), 4), "ref": score_set(ref), "euler": []}
    for n in ns:
        x = T.flow_solve(net, zE, n, "euler")
        r["euler"].append({"steps": n, **score_set(x), "err_ref": round(float((x - ref).norm(dim=1).mean()), 4)})
    return r, ref


def pairs_from(net, seed):
    z = torch.randn(20000, 2, generator=torch.Generator().manual_seed(seed))
    return z, T.flow_solve(net, z, 256, "heun")          # the root's reflow recipe


# ================================================================== reflow rounds and distillation
blobs, rounds, dist = {}, {}, {}
qn = {1: RN["cfm"], 2: RN["reflow"]}
PAIRS = {1: pairs_from(qn[1], 7)}                         # identical to the root's reflow pairs (seed 7)
PAIRS[2] = pairs_from(qn[2], 8)
for k in [3, 4]:
    net, lg = train("reflow", pairs=PAIRS[k - 1], init=qn[k - 1])
    blobs[f"rf{k}"], qn[k] = T.quantise(net)
    PAIRS[k] = pairs_from(qn[k], 6 + k)
    log("rf", k, lg[-1])
for k in [1, 2, 3, 4]:
    r, ref = flow_scores(qn[k])
    z, x1 = PAIRS[k]
    r["pair_cost"] = round(float(((x1 - z) ** 2).sum(1).mean()), 4)      # mean squared travel distance of the coupling
    rounds[k] = r; log("round", k, r["straightness"], r["ref"], r["euler"][0])
for k in [1, 2, 3]:
    net, lg = train("distill", pairs=PAIRS[k], init=qn[k])
    blobs[f"d{k}"], qd = T.quantise(net)
    with torch.no_grad():
        x = zE + qd(zE, torch.zeros(len(zE)))
    dist[k] = {"one_step": score_set(x), "loss_last": lg[-1][1]}
    log("distill", k, dist[k])
OUT["rounds"] = rounds; OUT["distill"] = dist
gC = torch.Generator().manual_seed(4)
z = torch.randn(20000, 2, generator=gC); x = T.data(20000, gC)
OUT["indep_pair_cost"] = round(float(((x - z) ** 2).sum(1).mean()), 4)

# ================================================================== minibatch OT: coupling cost by batch size, then training
otc = []
gO = torch.Generator().manual_seed(12)
z = torch.randn(4096, 2, generator=gO); x = T.data(4096, gO)
for B in [1, 2, 4, 8, 16, 64, 256, 1024, 4096]:
    tot = 0.0
    for b in range(0, 4096, B):
        c = (torch.cdist(z[b:b + B], x[b:b + B]) ** 2).numpy()
        r_, c_ = linear_sum_assignment(c); tot += c[r_, c_].sum()
    otc.append({"B": B, "cost": round(float(tot) / 4096, 4)})
log("ot cost", otc)
ot_tr = {}
for B in [4, 16, 64]:
    t1 = time.time(); net, lg = train("cfm", ot_block=B)
    _, qo = T.quantise(net); r, _ = flow_scores(qo); r["train_s"] = round(time.time() - t1, 1)
    ot_tr[B] = r; log("ot train", B, r["straightness"], r["euler"][0], r["euler"][2])
r, _ = flow_scores(RN["ot"]); ot_tr[256] = r            # the root's OT model (blocks of 256)
r, _ = flow_scores(RN["cfm"]); ot_tr[1] = r              # independent pairs
OUT["ot"] = {"cost": otc, "trained": ot_tr}

# ================================================================== timestep sampling
SCHEMES = {"uniform": None, "lognorm(0,1)": lognorm(0.0, 1.0), "lognorm(0.5,0.6)": lognorm(0.5, 0.6),
           "lognorm(-0.5,1)": lognorm(-0.5, 1.0), "mode(1.29)": mode(1.29), "cosmap": cosmap()}
TE = [0.02, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.98]
gT = torch.Generator().manual_seed(21)
XT = {}
for t in TE:
    x0 = torch.randn(4000, 2, generator=gT, dtype=torch.float64); x1 = T.data(4000, gT).double()
    xt = (1 - t) * x0 + t * x1; XT[t] = (xt, exact(xt, t)[0])
ts_res = []
for budget in [2000, 12000]:
    for nm, fn in SCHEMES.items():
        for seed in [0, 1, 2]:
            net, lg = train("cfm", steps=budget, seed=seed, tsamp=fn)
            with torch.no_grad():
                err = [round(float(((net(XT[t][0].float(), torch.full((4000,), t)).double() - XT[t][1]) ** 2).sum(1).mean()), 5) for t in TE]
            x4 = T.flow_solve(net, zE, 4, "euler"); x64 = T.flow_solve(net, zE, 64, "euler")
            ts_res.append({"budget": budget, "scheme": nm, "seed": seed, "err_by_t": err,
                           "e4": score_set(x4), "e64": score_set(x64)})
        log("tsched", budget, nm, np.mean([r["e64"]["w2"] for r in ts_res[-3:]]), np.mean([np.mean(r["err_by_t"]) for r in ts_res[-3:]]))
# histogram of t under each scheme (our convention), 40 bins, for the page
hist = {}
gH = torch.Generator().manual_seed(1)
for nm, fn in SCHEMES.items():
    u = torch.rand(200000, generator=gH)
    t = (fn(u, gH) if fn else u).clamp(0, 1)
    hist[nm] = [round(float(v), 4) for v in torch.histc(t, 40, 0, 1) / 200000 * 40]
OUT["tsched"] = {"t_eval": TE, "runs": ts_res, "hist": hist}

OUT["w2_floor_root"] = ROOT["w2_floor"]
OUT["nets"] = blobs
OUT["seconds"] = round(time.time() - T0, 1)
os.makedirs(os.path.join(HERE, "..", "out"), exist_ok=True)
json.dump(OUT, open(os.path.join(HERE, "..", "out", "toy.json"), "w"), default=float)
log("done")
