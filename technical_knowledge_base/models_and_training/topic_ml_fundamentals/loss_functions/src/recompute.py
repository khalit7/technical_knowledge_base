"""Independent recomputation of every number the page's JavaScript produces (check/js_out.json, written by
check_core.mjs): PyTorch's own loss modules and autograd for losses and gradients, SciPy's linprog for the
L1 / pinball / MAPE fits, scipy.optimize for Huber and log-cosh, numpy for locations.
Run: OMP_NUM_THREADS=2 uv run --with torch --with scipy --with numpy python recompute.py
Writes check/recompute.json and prints PASS/FAIL per group."""
import json, csv, math
import numpy as np, torch, scipy.optimize as so
torch.set_num_threads(2); torch.set_default_dtype(torch.float64)
J = json.load(open("check/js_out.json"))
res = {"torch": torch.__version__, "checks": []}
def chk(name, ok, detail):
    res["checks"].append({"name": name, "ok": bool(ok), "detail": detail}); return ok
a3 = list(csv.DictReader(open("inputs/anscombe.csv")))
X3 = np.array([float(r["x3"]) for r in a3]); Y3 = np.array([float(r["y3"]) for r in a3])
st = list(csv.DictReader(open("inputs/starsCYG.csv")))
XS = np.array([float(r["log.Te"]) for r in st]); YS = np.array([float(r["log.light"]) for r in st])
gi = [10, 19, 29, 33]
sets = {"anscombe3": (X3, Y3), "anscombe3_clean": (np.delete(X3, 2), np.delete(Y3, 2)),
        "stars": (XS, YS), "stars_main": (np.delete(XS, gi), np.delete(YS, gi))}
def torch_loss(key, x, y, a, b, delta=1.0, tau=0.9):
    """mean loss with PyTorch modules where one exists; returns value and autograd gradient wrt (a, b)"""
    p = torch.tensor([a, b], requires_grad=True)
    xt, yt = torch.tensor(x), torch.tensor(y)
    pred = p[0] + p[1] * xt
    u = yt - pred
    if key == "mse": L = torch.nn.MSELoss()(pred, yt)
    elif key == "mae": L = torch.nn.L1Loss()(pred, yt)
    elif key == "huber": L = torch.nn.HuberLoss(delta=delta)(pred, yt)
    elif key == "logcosh": L = torch.log(torch.cosh(u)).mean()
    elif key == "pinball": L = torch.maximum(tau * u, (tau - 1) * u).mean()
    elif key == "mape": L = (u.abs() / yt.abs()).mean()
    L.backward()
    return L.item(), p.grad.tolist()
def lp_fit(x, y, tau, w=None):
    """weighted pinball regression as a linear programme: min sum w (tau u+ + (1-tau) u-), y - a - b x = u+ - u-"""
    n = len(x); w = np.ones(n) if w is None else w
    c = np.concatenate([[0, 0], tau * w, (1 - tau) * w])
    A = np.hstack([np.ones((n, 1)), x[:, None], np.eye(n), -np.eye(n)])
    r = so.linprog(c, A_eq=A, b_eq=y, bounds=[(None, None)] * 2 + [(0, None)] * (2 * n), method="highs")
    return r.x[0], r.x[1], r.fun / n
def smooth_fit(key, x, y, delta):
    def f(p):
        v, g = torch_loss(key, x, y, p[0], p[1], delta=delta); return v, np.array(g)
    r = so.minimize(f, np.polyfit(x, y, 1)[::-1], jac=True, method="BFGS", options={"gtol": 1e-13, "maxiter": 10000})
    return r.x[0], r.x[1], r.fun
worst = 0
for k, (x, y) in sets.items():
    for name, js in J["fits"][k].items():
        key = name.split("_")[0]; arg = float(name.split("_")[1]) if "_" in name else None
        delta = arg if key == "huber" and arg else 1.0
        tau = arg if key == "pinball" and arg else 0.9
        tl, tg = torch_loss(key, x, y, js["a"], js["b"], delta=delta, tau=tau)
        if key == "mse":
            b, a = np.polyfit(x, y, 1); ref = (a, b, tl)
        elif key in ("huber", "logcosh"):
            ref = smooth_fit(key, x, y, delta)
        else:
            t = 0.5 if key in ("mae", "mape") else tau
            ref = lp_fit(x, y, t, 1 / np.abs(y) if key == "mape" else None)
            if key in ("mae", "mape"): ref = (ref[0], ref[1], 2 * ref[2])  # pinball at tau 0.5 is |u|/2
        # objective: JS value equals PyTorch's loss at the JS parameters, and is no worse than the reference optimum
        d_obj = abs(js["obj"] - tl); gap = js["obj"] - ref[2]
        ok = d_obj < 1e-12 and gap < 1e-9
        if key in ("mse", "huber", "logcosh"):
            ok = ok and max(abs(g) for g in tg) < 1e-8 and abs(js["a"] - ref[0]) < 1e-6 and abs(js["b"] - ref[1]) < 1e-6
        worst = max(worst, d_obj)
        chk(f"fit {k} {name}", ok, {"js": js, "torch_loss_at_js": tl, "torch_grad_at_js": tg, "ref": list(ref)})
# locations on the rivers
rv = np.array([float(r["dat"]) for r in csv.DictReader(open("inputs/rivers.csv"))])
L = J["loc"]
chk("rivers mean", abs(L["mse"] - rv.mean()) < 1e-9, [L["mse"], rv.mean()])
chk("rivers median", L["mae"] == np.median(rv), [L["mae"], float(np.median(rv))])
cand = np.concatenate([rv, np.linspace(rv.min(), rv.max(), 40001)])
def best(fun):
    t = torch.tensor(cand)[:, None]; v = fun(t).numpy(); return cand[v.argmin()], v.min()
yt = torch.tensor(rv)[None, :]
for key, fun, js in [
    ("pinball tau 0.9", lambda c: torch.maximum(0.9 * (yt - c), -0.1 * (yt - c)).mean(1), L["pinball"]),
    ("MAPE beta-median", lambda c: ((yt - c).abs() / yt).mean(1), L["mape"]),
    ("Huber delta 100", lambda c: torch.nn.functional.huber_loss(c.expand(-1, rv.size), yt.expand(c.shape[0], -1), reduction="none", delta=100.0).mean(1), L["huber"]),
    ("log-cosh", lambda c: ((yt - c).abs() + torch.log1p(torch.exp(-2 * (yt - c).abs())) - math.log(2)).mean(1), L["logcosh"]),
]:
    c0, v0 = best(fun)
    vjs = fun(torch.tensor([[js]])).item()
    chk("rivers " + key, vjs <= v0 + 1e-9 and abs(js - c0) < 0.1, {"js": js, "grid_best": c0, "loss_js": vjs, "loss_grid": v0})
# margin losses against PyTorch (BCEWithLogits for logistic, autograd for pulls)
ms = [-3, -1, -0.25, 0, 0.5, 1, 2.5]
def mphi(key, m, g=0):
    if key == "hinge": return torch.clamp(1 - m, min=0)
    if key == "sqhinge": return torch.clamp(1 - m, min=0) ** 2
    if key == "logistic": return torch.nn.functional.binary_cross_entropy_with_logits(m, torch.ones_like(m), reduction="none")
    if key == "exp": return torch.exp(-m)
    if key == "focal":
        p = torch.sigmoid(m); ce = torch.nn.functional.binary_cross_entropy_with_logits(m, torch.ones_like(m), reduction="none")
        return (1 - p) ** g * ce
for name, vals in J["marg"].items():
    key = name.split("_")[0]; g = float(name.split("_")[1]) if "_" in name else 0
    errs = []
    for m, (phi, pull) in zip(ms, vals):
        mt = torch.tensor(float(m), requires_grad=True); v = mphi(key, mt, g); v.backward()
        errs.append(max(abs(v.item() - phi), abs(-mt.grad.item() - pull)))
    chk("margin " + name, max(errs) < 1e-12, max(errs))
# minimisers of the conditional risk: logistic, exp, sqhinge closed form; focal by SciPy bounded scalar search
for eta, row in J["fstar"].items():
    e = float(eta)
    for key, js in row.items():
        k = key.split("_")[0]; g = float(key.split("_")[1]) if "_" in key else 0
        def C(f):
            f = torch.tensor(float(f)); return (e * mphi(k, f, g) + (1 - e) * mphi(k, -f, g)).item()
        if k == "hinge": ok = js == (1 if e > 0.5 else -1); ref = js
        else:
            r = so.minimize_scalar(C, bounds=(-40, 40), method="bounded", options={"xatol": 1e-12}); ref = r.x
            ok = abs(js - ref) < 1e-5 or C(js) <= C(ref) + 1e-13
        chk(f"f* eta {eta} {key}", ok, {"js": js, "scipy": ref, "p_implied": 1 / (1 + math.exp(-js)) if k in ("logistic", "focal") else None})
# GAN generator gradients via autograd on the two losses
errs = []
for l, gm, gn in J["gan"]:
    lt = torch.tensor(float(l), requires_grad=True); torch.log(1 - torch.sigmoid(lt)).backward(); errs.append(abs(lt.grad.item() - gm))
    lt = torch.tensor(float(l), requires_grad=True); (-torch.log(torch.sigmoid(lt))).backward(); errs.append(abs(lt.grad.item() - gn))
chk("GAN gradients", max(errs) < 1e-12, max(errs))
# bf16 rounding against torch.bfloat16
errs = []
for v, r, gap in J["bf16"]:
    tb = torch.tensor(v, dtype=torch.float32).to(torch.bfloat16).double().item(); errs.append(abs(tb - r))
chk("bf16 rounding", max(errs) == 0, errs)
# z-loss value and gradient
v = torch.tensor(J["z"]["v"], requires_grad=True); z = torch.logsumexp(v, 0); zl = 1e-4 * z ** 2; zl.backward()
chk("z-loss", abs(zl.item() - J["z"]["loss"]) < 1e-15 and max(abs(a - b) for a, b in zip(v.grad.tolist(), J["z"]["grad"])) < 1e-15, [zl.item(), J["z"]["loss"]])
# gradient on the logits: PyTorch's CrossEntropyLoss (with label_smoothing), focal and Brier through autograd
errs = []
for row in J["logit"]["rows"]:
    z = torch.tensor(J["logit"]["z"], requires_grad=True); t = torch.tensor([row["t"]])
    p = torch.softmax(z, 0)
    if row["k"] == "ce": L = torch.nn.CrossEntropyLoss()(z[None], t)
    elif row["k"] == "ls": L = torch.nn.CrossEntropyLoss(label_smoothing=0.1)(z[None], t)
    elif row["k"] == "focal": pt = p[row["t"]]; L = -(1 - pt) ** 2 * torch.log(pt)
    else: y = torch.nn.functional.one_hot(t[0], 5).double(); L = ((p - y) ** 2).sum()
    L.backward()
    errs.append(max(abs(L.item() - row["loss"]), max(abs(a - b) for a, b in zip(z.grad.tolist(), row["grad"]))))
chk("logit gradients (CE, label smoothing, focal, Brier) vs autograd", max(errs) < 1e-12, max(errs))
pz = torch.softmax(torch.tensor(J["logit"]["z"]), 0).tolist()
chk("page prose: p = 0.743 0.166 0.061 0.022 0.008", [round(v, 3) for v in pz] == [0.743, 0.166, 0.061, 0.022, 0.008], pz)
gce = {(r["k"], r["t"]): r["grad"] for r in J["logit"]["rows"]}
prose = {"ce easy -0.257": round(gce[("ce", 0)][0], 3) == -0.257, "ce wrong -0.992": round(gce[("ce", 4)][4], 3) == -0.992,
         "brier wrong -0.026": round(gce[("brier", 4)][4], 3) == -0.026, "ratio 38": round(gce[("ce", 4)][4] / gce[("brier", 4)][4]) == 38,
         "focal easy -0.046": round(gce[("focal", 0)][0], 3) == -0.046, "focal wrong -1.053": round(gce[("focal", 4)][4], 3) == -1.053,
         "5.6x": round(gce[("ce", 0)][0] / gce[("focal", 0)][0], 1) == 5.6, "ls easy -0.177": round(gce[("ls", 0)][0], 3) == -0.177,
         "ls car up 0.012": round(-gce[("ls", 0)][4], 3) == 0.012}
chk("page prose: logit widget numbers", all(prose.values()), prose)
# ranking: RankNet cost through autograd on the pairwise logistic loss; LambdaRank recomputed with numpy (Burges 2010 eqs 3, 4, 6)
def ndcg_np(l):
    l = np.array(l, float); d = 1 / np.log2(np.arange(len(l)) + 2); g = 2 ** l - 1
    return (g * d).sum() / (np.sort(g)[::-1] * d).sum()
errs = []
for row in J["rank"]["rows"]:
    s = torch.tensor(J["rank"]["s"], requires_grad=True); l = row["l"]; n = len(l)
    pairs = [(i, j) for i in range(n) for j in range(n) if l[i] > l[j]]
    if not row["lr"]:
        C = sum(torch.nn.functional.softplus(-(s[i] - s[j])) for i, j in pairs); C.backward()
        errs.append(max(abs(a - b) for a, b in zip(s.grad.tolist(), row["lam"]))); errs.append(abs(C.item() - row["cost"]))
    else:
        sv = np.array(J["rank"]["s"]); lam = np.zeros(n); rank = np.argsort(-sv, kind="stable").argsort()
        ideal = ((2 ** np.sort(np.array(l, float))[::-1] - 1) / np.log2(np.arange(n) + 2)).sum()
        for i, j in pairs:
            sw = list(l); ri, rj = rank[i], rank[j]; order = [None] * n
            for k in range(n): order[rank[k]] = l[k]
            sw_order = list(order); sw_order[ri], sw_order[rj] = sw_order[rj], sw_order[ri]
            dn = abs(ndcg_np(sw_order) - ndcg_np(order))
            lij = -1 / (1 + math.exp(sv[i] - sv[j])) * dn; lam[i] += lij; lam[j] -= lij
        errs.append(max(abs(a - b) for a, b in zip(lam, row["lam"])))
    errs.append(abs(ndcg_np([l[k] for k in np.argsort(-np.array(J["rank"]["s"]), kind="stable")]) - row["ndcg"]))
chk("ranking: RankNet lambdas vs autograd, LambdaRank by explicit swaps, NDCG", max(errs) < 1e-12, max(errs))
r10 = {r["lr"]: r for r in J["rank"]["rows"] if r["pos"] == 10}
rp = {"errs 9": r10[False]["errs"] == 9, "ndcg 0.564": round(r10[False]["ndcg"], 3) == 0.564, "fixA 0.624": round(J["rank"]["fixA"], 3) == 0.624,
      "fixB 0.790": round(J["rank"]["fixB"], 3) == 0.790,
      "0.30": round(r10[False]["lam"][1] / r10[False]["lam"][9], 2) == 0.30, "0.42": round(r10[True]["lam"][1] / r10[True]["lam"][9], 2) == 0.42,
      "0.24": round(-r10[False]["lam"][0] / r10[False]["lam"][9], 2) == 0.24, "0.75": round(-r10[True]["lam"][0] / r10[True]["lam"][9], 2) == 0.75}
chk("page prose: ranking numbers", all(rp.values()), rp)
# published figures the page reproduces
chk("Anscombe 1973: y = 3.00 + 0.500x", round(J["fits"]["anscombe3"]["mse"]["a"], 2) == 3.00 and round(J["fits"]["anscombe3"]["mse"]["b"], 3) == 0.500, J["fits"]["anscombe3"]["mse"])
chk("Lin et al. 2017: 100x at pt 0.9, about 1000x at pt 0.968 (gamma 2)", abs(1 / (1 - 0.9) ** 2 - 100) < 1e-9 and 950 < 1 / (1 - 0.968) ** 2 < 1050, [1 / (1 - 0.9) ** 2, 1 / (1 - 0.968) ** 2])
json.dump(res, open("check/recompute.json", "w"), indent=1)
bad = [c["name"] for c in res["checks"] if not c["ok"]]
print("checks", len(res["checks"]), "fail", len(bad), bad[:10], "worst JS-vs-torch objective diff", worst)
