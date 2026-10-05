"""Gradient lab (t-grad): recompute every formula and displayed number independently of the page.

Run from the scratchpad (not inside the repo's project):
  uv run --no-project --with numpy --with sympy --with torch python recompute.py
Writes expected.json next to this file; check_js.mjs runs the page's JavaScript (parts/32_js_grad_core.js)
and compares it with expected.json.

Three independent routes are used where they help:
  sympy  - symbolic derivatives of each loss (the formulas shown on the page)
  numpy  - the numbers (float64), written separately from the JS
  torch  - autograd on the two-layer model and on each loss, as a third opinion
"""
import json, math, os
import numpy as np
import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(os.path.join(HERE, "model.json")))
out = {}
ok = True


def check(name, cond):
    global ok
    print(("PASS " if cond else "FAIL ") + name)
    ok = ok and bool(cond)


def softmax(z):
    z = np.asarray(z, float)
    e = np.exp(z - z.max())
    return e / e.sum()


def lse(z):
    z = np.asarray(z, float)
    m = z.max()
    return m + np.log(np.exp(z - m).sum())


# ---------------------------------------------------------------- 1. symbolic derivatives (sympy)
z, y, g, eps = sp.symbols("z y gamma epsilon", real=True)
s = 1 / (1 + sp.exp(-z))
bce = -(y * sp.log(s) + (1 - y) * sp.log(1 - s))
check("BCE: dL/dz = sigma(z) - y", sp.simplify(sp.diff(bce, z) - (s - y)) == 0)
check("BCE: d2L/dz2 = sigma(1-sigma), no y", sp.simplify(sp.diff(bce, z, 2) - s * (1 - s)) == 0)
mse = sp.Rational(1, 2) * (z - y) ** 2
check("MSE (1/2 convention): dL/dz = z - y", sp.simplify(sp.diff(mse, z) - (z - y)) == 0)
check("MSE (no 1/2): dL/dz = 2(z - y)", sp.simplify(sp.diff((z - y) ** 2, z) - 2 * (z - y)) == 0)
z1, z2, z3 = sp.symbols("z1 z2 z3", real=True)
Z = [z1, z2, z3]
den = sum(sp.exp(v) for v in Z)
P = [sp.exp(v) / den for v in Z]
ce = -sp.log(P[0])  # target is token 0 (cat)
for i in range(3):
    check(f"CE: dL/dz{i+1} = p{i+1} - y{i+1}", sp.simplify(sp.diff(ce, Z[i]) - (P[i] - (1 if i == 0 else 0))) == 0)
K = 3
q = [(1 - eps) * (1 if i == 0 else 0) + eps / K for i in range(3)]
ls = -sum(q[i] * sp.log(P[i]) for i in range(3))
for i in range(3):
    check(f"label smoothing: dL/dz{i+1} = p{i+1} - q{i+1}", sp.simplify(sp.diff(ls, Z[i]) - (P[i] - q[i])) == 0)
fl = -(1 - P[0]) ** g * sp.log(P[0])
pt = P[0]
w = (1 - pt) ** g - g * pt * (1 - pt) ** (g - 1) * sp.log(pt)
for i in range(3):
    expr = sp.diff(fl, Z[i]) - w * (P[i] - (1 if i == 0 else 0))
    val = max(abs(float(expr.subs({z1: a, z2: b, z3: c, g: gg})))
              for a, b, c, gg in [(2, 1, 0, 2), (0.3, -1, 2, 0.5), (-1, 2, 0.5, 3)])
    check(f"focal: dL/dz{i+1} = w (p{i+1} - y{i+1}) (numeric spot check, max err {val:.1e})", val < 1e-12)

# ---------------------------------------------------------------- 2. loss explorer defaults (numpy)
zz = np.array([2.0, 1.0, 0.0])
p = softmax(zz)
L = -math.log(p[0])
TI = M["target_index"]; YT = np.eye(3)[TI]
L = -math.log(p[TI])
out["ce_default"] = {"t": TI, "z": zz.tolist(), "e": np.exp(zz).tolist(), "sum": float(np.exp(zz).sum()), "p": p.tolist(),
                     "L": L, "L_bits": L / math.log(2), "grad": (p - YT).tolist()}
qv = 0.9 * YT + 0.1 / 3
out["ls_default"] = {"eps": 0.1, "q": qv.tolist(), "L": float(-(qv * np.log(p)).sum()), "grad": (p - qv).tolist()}
ptv = p[TI]
wv = (1 - ptv) ** 2 - 2 * ptv * (1 - ptv) * math.log(ptv)
out["focal_default"] = {"gamma": 2, "L": float(-(1 - ptv) ** 2 * math.log(ptv)), "w": wv,
                        "grad": (wv * (p - YT)).tolist()}
out["mse_default"] = {"z": 1.5, "y": 1.0, "L_half": 0.125, "grad_half": 0.5, "L_plain": 0.25, "grad_plain": 1.0}
sz = 1 / (1 + math.exp(-2.0))
out["bce_default"] = {"z": 2.0, "y": 1, "p": sz, "L": -math.log(sz), "grad": sz - 1}

# finite-difference error against step h at the CE default (float64): the V shape
def ce_loss(v):
    return lse(v) - v[TI]
hs = [10.0 ** (-k) for k in range(1, 13)]
fd = []
for h in hs:
    e = np.zeros(3); e[1] = h
    num = (ce_loss(zz + e) - ce_loss(zz - e)) / (2 * h)
    fd.append(abs(num - (p[1] - YT[1])))
out["fd_err_dz2"] = {"h": hs, "err": fd}
best = hs[int(np.argmin(fd))]
check(f"central difference error is smallest near h = 1e-5 or so (best {best:g})", 1e-7 <= best <= 1e-3)

# ---------------------------------------------------------------- 3. two-layer model (numpy and torch)
T = M["two_layer"]
x = np.array(T["x"]); W1 = np.array(T["W1"]); W2 = np.array(T["W2"]); t = M["target_index"]
a = W1 @ x; h = np.maximum(a, 0); zz2 = W2 @ h; p2 = softmax(zz2); L2 = lse(zz2) - zz2[t]
y1 = np.eye(3)[t]
dz = p2 - y1; dW2 = np.outer(dz, h); dh = W2.T @ dz; da = dh * (a > 0); dW1 = np.outer(da, x); dx = W1.T @ da
check("two-layer logits are exactly (2, 1, 0)", np.allclose(zz2, [2, 1, 0]))
check("one-layer logits are exactly (2, 1, 0)", np.allclose(np.array(M["one_layer"]["W"]) @ np.array(M["one_layer"]["x"]), [2, 1, 0]))
out["two"] = {"a": a.tolist(), "h": h.tolist(), "z": zz2.tolist(), "p": p2.tolist(), "L": L2, "dz": dz.tolist(),
              "dW2": dW2.tolist(), "dh": dh.tolist(), "da": da.tolist(), "dW1": dW1.tolist(), "dx": dx.tolist()}
import torch
torch.set_num_threads(1)
tx = torch.tensor(x, requires_grad=True, dtype=torch.float64)
tW1 = torch.tensor(W1, requires_grad=True, dtype=torch.float64)
tW2 = torch.tensor(W2, requires_grad=True, dtype=torch.float64)
tz = tW2 @ torch.relu(tW1 @ tx)
tL = torch.nn.functional.cross_entropy(tz[None], torch.tensor([t]))
tL.backward()
check("torch autograd: loss", abs(tL.item() - L2) < 1e-12)
check("torch autograd: dW1", np.allclose(tW1.grad.numpy(), dW1, atol=1e-12))
check("torch autograd: dW2", np.allclose(tW2.grad.numpy(), dW2, atol=1e-12))
check("torch autograd: dx", np.allclose(tx.grad.numpy(), dx, atol=1e-12))

def two_loss(x, W1, W2):
    z = W2 @ np.maximum(W1 @ x, 0)
    return lse(z) - z[t]

# one SGD step on every parameter (lr from model.json)
lr = M["sgd_lr"]
x1, W11, W21 = x - lr * dx, W1 - lr * dW1, W2 - lr * dW2
out["two_step"] = {"lr": lr, "L_after": two_loss(x1, W11, W21)}
check("one SGD step lowers the loss", out["two_step"]["L_after"] < L2)
# five steps: correct, wrong sign, forgot zero_grad (gradients accumulate)
def run(mode, n=5):
    xs, A, B = x.copy(), W1.copy(), W2.copy(); acc = [np.zeros(2), np.zeros_like(W1), np.zeros_like(W2)]
    Ls = [two_loss(xs, A, B)]
    for _ in range(n):
        aa = A @ xs; hh = np.maximum(aa, 0); z_ = B @ hh; dz_ = softmax(z_) - y1
        gB = np.outer(dz_, hh); dh_ = B.T @ dz_; da_ = dh_ * (aa > 0); gA = np.outer(da_, xs); gx = A.T @ da_
        if mode == "accum":
            acc = [acc[0] + gx, acc[1] + gA, acc[2] + gB]; gx, gA, gB = acc
        sgn = 1 if mode == "sign" else -1
        xs, A, B = xs + sgn * lr * gx, A + sgn * lr * gA, B + sgn * lr * gB
        Ls.append(two_loss(xs, A, B))
    return Ls
out["traj"] = {"ok": run("ok"), "sign": run("sign"), "accum": run("accum")}
check("wrong sign: loss rises every step", all(b > a_ for a_, b in zip(out["traj"]["sign"], out["traj"]["sign"][1:])))
# bugs on the model
dh_bad = W2 @ dz  # missing transpose; W2 is square so it runs
da_bad = dh_bad * (a > 0)
out["bug_transpose"] = {"dW1": np.outer(da_bad, x).tolist(), "dx": (W1.T @ da_bad).tolist(),
                        "max_diff": float(max(np.abs(np.outer(da_bad, x) - dW1).max(), np.abs(W1.T @ da_bad - dx).max()))}
check("missing transpose gives a wrong first-layer gradient", out["bug_transpose"]["max_diff"] > 1e-3)
# softmax twice: floor ln(1 + (K-1)/e)
qq = softmax(zz2); Ltw = lse(qq) - qq[t]
out["bug_twice"] = {"q": qq.tolist(), "L": Ltw, "floor": math.log(1 + 2 / math.e), "L_correct": L2}
check("softmax-twice floor equals the loss at q = one-hot", abs(out["bug_twice"]["floor"] - (lse(YT) - 1)) < 1e-12)
qt = torch.tensor(zz2, requires_grad=True)
lt = torch.nn.functional.cross_entropy(torch.softmax(qt, 0)[None], torch.tensor([t])); lt.backward()
out["bug_twice"]["dz"] = qt.grad.numpy().tolist()
check("softmax twice: torch loss matches", abs(lt.item() - Ltw) < 1e-12)
# multiply-adds
n1, n2 = W1.size, W2.size
out["macs"] = {"fwd": n1 + n2, "bwd_trainx": 2 * n2 + 2 * n1, "bwd_fixedx": 2 * n2 + n1}

# ---------------------------------------------------------------- 4. curvature and step size
def gd(l1, l2, lr, steps=200, beta=None):
    np.seterr(over="ignore", invalid="ignore")
    th = np.array([1.0, 1.0]); v = np.zeros(2); H = np.diag([l1, l2])
    for _ in range(steps):
        gr = H @ th
        if beta is None:
            th = th - lr * gr
        else:
            v = beta * v - lr * gr; th = th + v
    return 0.5 * th @ H @ th
lam = 4.0
for r, want in [(0.5, "conv"), (1.5, "conv"), (1.99, "conv"), (2.01, "div")]:
    Lr = gd(lam, 1.0, r / lam, 3000)
    check(f"GD on lambda_max={lam}: lr*lambda = {r} -> {want}", (Lr < 1e-6) if want == "conv" else (not np.isfinite(Lr) or Lr > 1))
for r, want in [(3.7, "conv"), (3.85, "div")]:
    Lr = gd(lam, 1.0, r / lam, 4000, beta=0.9)
    check(f"momentum 0.9: lr*lambda = {r} (limit 2(1+beta) = 3.8) -> {want}", (Lr < 1e-6) if want == "conv" else (not np.isfinite(Lr) or Lr > 1))
kap = 25.0
out["curv"] = {"opt_lr_rate": (kap - 1) / (kap + 1), "kappa": kap, "mom_limit_beta09": 3.8}
Hm = np.array([[3.0, 1.0], [1.0, 2.0]])
gv = Hm @ np.array([2.0, -1.0])
check("Newton step on a quadratic lands on the minimum", np.allclose(np.array([2.0, -1.0]) - np.linalg.solve(Hm, gv), 0))

# ---------------------------------------------------------------- 5. Bernoulli curvature, three ways
def bern(zv):
    pv = 1 / (1 + math.exp(-zv))
    var = pv * (1 - pv) ** 2 + (1 - pv) * pv ** 2
    zs = sp.Symbol("zs")
    ss = 1 / (1 + sp.exp(-zs))
    hes = [float(sp.diff(-(yy * sp.log(ss) + (1 - yy) * sp.log(1 - ss)), zs, 2).subs(zs, zv)) for yy in (0, 1)]
    score = [float(sp.diff(yy * sp.log(ss) + (1 - yy) * sp.log(1 - ss), zs).subs(zs, zv)) for yy in (0, 1)]
    fish = (1 - pv) * score[0] ** 2 + pv * score[1] ** 2
    return {"z": zv, "p": pv, "hess_y0": hes[0], "hess_y1": hes[1], "var": var, "fisher": fish}
out["bern"] = [bern(0.0), bern(math.log(9)), bern(2.0)]
for b in out["bern"]:
    check(f"Bernoulli z={b['z']:.3f}: Hessian = variance = Fisher = {b['var']:.4f}",
          max(abs(b["hess_y0"] - b["var"]), abs(b["hess_y1"] - b["var"]), abs(b["fisher"] - b["var"])) < 1e-12)
check("Bernoulli z=0: 0.25", abs(out["bern"][0]["var"] - 0.25) < 1e-15)
check("Bernoulli z=ln 9: 0.09", abs(out["bern"][1]["var"] - 0.09) < 1e-12)

# ---------------------------------------------------------------- 6. numerical stability
with np.errstate(over="ignore", invalid="ignore"):
    big = np.array([1000.0, 999.0, 0.0])
    naive = np.exp(big) / np.exp(big).sum()
out["overflow"] = {"naive": [None if not np.isfinite(v) else float(v) for v in naive], "stable": softmax(big).tolist(),
                   "lse": lse(big), "L_stable": float(lse(big) - big[0]),
                   "f64_limit": math.log(np.finfo(np.float64).max), "f32_limit": float(np.log(np.finfo(np.float32).max)),
                   "f16_limit": float(np.log(np.float64(np.finfo(np.float16).max)))}
check("naive softmax of (1000, 999, 0) is NaN", np.isnan(naive[0]))
check("stable softmax of (1000, 999, 0) equals softmax of (1, 0, -999)", np.allclose(softmax(big), softmax([1, 0, -999])))

# ---------------------------------------------------------------- 7. batch bugs (1/n and broadcasting), MSE batch from scikit-learn's docs
yt = np.array([3, -0.5, 2, 7.0]); yp = np.array([2.5, 0.0, 2, 8.0]); n = len(yt)
mse_ok = float(((yp - yt) ** 2).mean())
mse_bc = float(((yp - yt[:, None]) ** 2).mean())
out["batch"] = {"y_true": yt.tolist(), "y_pred": yp.tolist(), "mse": mse_ok, "mse_broadcast": mse_bc,
                "grad_mean": (2 * (yp - yt) / n).tolist(), "grad_sum_bug": (2 * (yp - yt)).tolist()}
check("MSE of the scikit-learn example is 0.375", abs(mse_ok - 0.375) < 1e-15)
num = []
for i in range(n):
    e = np.zeros(n); e[i] = 1e-6
    num.append((((yp + e - yt) ** 2).mean() - ((yp - e - yt) ** 2).mean()) / 2e-6)
check("finite differences agree with 2(yhat - y)/n, not 2(yhat - y)", np.allclose(num, out["batch"]["grad_mean"], atol=1e-8))

# ---------------------------------------------------------------- 8. extra checks for displayed claims
# Goh 2017 optimal momentum on the "momentum in the valley" preset (lambda_max 2, kappa 25): rate (sqrt k - 1)/(sqrt k + 1)
l1, l2 = 2.0, 2.0 / 25
a_opt = (2 / (math.sqrt(l1) + math.sqrt(l2))) ** 2; b_opt = ((5 - 1) / (5 + 1)) ** 2
out["mom_opt"] = {"lr": a_opt, "beta": b_opt, "lr_times_lmax": a_opt * l1, "rate": 4 / 6, "gd_rate": 24 / 26}
check(f"momentum preset lr 1.39, beta 0.44 are Goh's optimum rounded ({a_opt:.3f}, {b_opt:.3f})", abs(a_opt - 1.39) < 0.005 and abs(b_opt - 0.44) < 0.005)
check("momentum preset: lr * lambda_max > 2 (plain GD would diverge)", a_opt * l1 > 2)
# detach bug: only W2 trains; five steps of lr 0.5
xs, A, B = x.copy(), W1.copy(), W2.copy()
for _ in range(5):
    hh = np.maximum(A @ xs, 0); z_ = B @ hh; B = B - lr * np.outer(softmax(z_) - y1, hh)
out["detach_5"] = two_loss(xs, A, B)
print("detach bug, loss after five steps:", out["detach_5"], "correct:", out["traj"]["ok"][-1])
# zero_grad: k accumulated backward calls on one example give k times the gradient
check("softmax-twice floor is 0.551", abs(math.log(1 + 2 / math.e) - 0.5514) < 1e-4)

# ---------------------------------------------------------------- 9. the Reading's one-matrix model (must match src/read/numbers.json)
O = M["one_layer"]; xo = np.array(O["x"]); Wo = np.array(O["W"])
zo = Wo @ xo; po = softmax(zo); Lo = lse(zo) - zo[TI]; gz = po - YT
gWo = np.outer(gz, xo); gxo = Wo.T @ gz
steps = {}
for lr_ in (0.1, 0.3, 1.0):
    z1 = (Wo - lr_ * gWo) @ xo
    steps[str(lr_)] = {"z": z1.tolist(), "p": softmax(z1).tolist(), "L": float(lse(z1) - z1[TI])}
Hz = np.diag(po) - np.outer(po, po)
lam = float(np.linalg.eigvalsh(Hz).max() * (xo @ xo))
out["one"] = {"z": zo.tolist(), "p": po.tolist(), "L": float(Lo), "dz": gz.tolist(), "dW": gWo.tolist(), "dx": gxo.tolist(), "steps": steps, "lam_max_W": lam, "lr_limit": 2 / lam}
tW = torch.tensor(Wo, requires_grad=True); tx2 = torch.tensor(xo, requires_grad=True)
tl = torch.nn.functional.cross_entropy((tW @ tx2)[None], torch.tensor([TI])); tl.backward()
check("one-matrix model: torch grads match", np.allclose(tW.grad.numpy(), gWo) and np.allclose(tx2.grad.numpy(), gxo))
try:
    R = json.load(open(os.path.join(HERE, "..", "read", "numbers.json")))
    check("one-matrix model agrees with the Reading: loss, grad_W, grad_x",
          abs(R["loss_sat_nats"] - round(Lo, 3)) < 1e-9 and np.allclose(R["g_W"], np.round(gWo, 3)) and np.allclose(R["g_x"], np.round(gxo, 3)))
    check("one step at lr 0.1 agrees with the Reading", abs(R["step0.1_loss"] - round(steps["0.1"]["L"], 3)) < 1e-9 and np.allclose(R["step0.1_p"], np.round(steps["0.1"]["p"], 3)))
except FileNotFoundError:
    print("note: src/read/numbers.json not found, Reading comparison skipped")
print("one-matrix steps:", {k: round(v["L"], 3) for k, v in steps.items()}, "lam_max", round(lam, 3), "limit", round(2 / lam, 3))

json.dump(out, open(os.path.join(HERE, "expected.json"), "w"), indent=1)
print("ALL PASS" if ok else "SOME FAILED")
