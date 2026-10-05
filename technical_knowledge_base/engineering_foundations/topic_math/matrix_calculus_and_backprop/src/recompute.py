"""Matrix calculus and backprop: recompute every number on the page, independently of the page's JavaScript.

Run from the scratchpad, never inside the repo's uv project:
  uv run --no-project --with numpy --with torch python recompute.py
Writes expected.json beside this file. check_js.mjs runs the page's maths (parts/22b_js_core.js) and compares.

Routes: numpy formulas written by hand (float64), PyTorch autograd (torch.float64) as a second opinion,
and finite differences as a third where it helps. Measured data (timings, memory, the real autograd graph)
come from the scratchpad scripts copied into inputs/measure/ and are summarised here, not re-measured.
"""
import json, math, os
import numpy as np
import torch

torch.set_default_dtype(torch.float64)
HERE = os.path.dirname(os.path.abspath(__file__))
E = {}
fails = []


def check(name, a, b, tol=1e-9):
    a, b = np.asarray(a, float), np.asarray(b, float)
    err = float(np.max(np.abs(a - b))) if a.size else 0.0
    if not err <= tol:
        fails.append((name, err))
    return err


def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()


# ---------------- the tiny model of the root page ----------------
W = np.array([[1., 0.], [0., 1.], [1., -2.]]); x = np.array([2., 1.]); y = 2
z = W @ x; p = softmax(z); loss = -math.log(p[y]); onehot = np.eye(3)[y]
gz = p - onehot; gW = np.outer(gz, x); gx = W.T @ gz
J = np.diag(p) - np.outer(p, p)
E["tiny"] = dict(z=z.tolist(), p=p.tolist(), loss=loss, gz=gz.tolist(), gW=gW.tolist(), gx=gx.tolist(), J=J.tolist(),
                 J_rowsums=J.sum(1).tolist())
# torch autograd
Wt = torch.tensor(W, requires_grad=True); xt = torch.tensor(x, requires_grad=True)
Lt = torch.nn.functional.cross_entropy((Wt @ xt)[None], torch.tensor([y]))
Lt.backward()
check("tiny loss", loss, Lt.item()); check("tiny gW", gW, Wt.grad); check("tiny gx", gx, xt.grad)
# numerator-layout objects
E["tiny"]["dL_dz_row"] = gz.tolist()               # 1 x 3 in numerator layout
E["tiny"]["gW_numerator"] = gW.T.tolist()          # 2 x 3, the transpose
# forward mode: one JVP per weight W_ij (tangent dW = e_ij), carrying dz, dp, dL
jvps = []
for i in range(3):
    for j in range(2):
        dz = np.zeros(3); dz[i] = x[j]
        dp = J @ dz; dL = -dp[y] / p[y]
        jvps.append(dict(i=i, j=j, dz=dz.tolist(), dp=dp.tolist(), dL=dL))
        check("jvp %d%d" % (i, j), dL, gW[i, j])
E["tiny"]["jvps"] = jvps
# Hessian of the loss in x: W^T (diag p - p p^T) W, and the HVP along e1
Hx = W.T @ J @ W
E["tiny"]["Hx"] = Hx.tolist(); E["tiny"]["Hx_e1"] = Hx[:, 0].tolist()
xt2 = torch.tensor(x, requires_grad=True)
f = lambda xx: torch.nn.functional.cross_entropy((torch.tensor(W) @ xx)[None], torch.tensor([y]))
g1, = torch.autograd.grad(f(xt2), xt2, create_graph=True)
hv, = torch.autograd.grad(g1 @ torch.tensor([1., 0.]), xt2)
check("tiny hvp", Hx[:, 0], hv)
jx = json.load(open(os.path.join(HERE, "inputs/measure/jax.json")))
check("jax hessian", Hx, jx["hessian_x"]); check("jax grad_W", gW, jx["grad_W"]); check("jax vjp", gx, jx["vjp_x"])
# layout claim: torch.func.jacrev returns (output shape, input shape), i.e. numerator layout; .grad has the parameter's shape
from torch.func import jacrev
Jx = jacrev(lambda xx: torch.tensor(W) @ xx)(torch.tensor(x))
assert tuple(Jx.shape) == (3, 2); check("jacrev of Wx is W", W, Jx)
assert tuple(Wt.grad.shape) == (3, 2)
# chain rule pieces quoted in the reading
E["tiny"]["dL_dpsat"] = -1 / p[y]; E["tiny"]["dpsat_dzsat"] = p[y] * (1 - p[y])
# central against forward differences on L(z_sat)
def Lz(zs):
    zz = z.copy(); zz[y] = zs
    return -math.log(softmax(zz)[y])
fd = {}
for h in [1e-1, 1e-2, 1e-3, 1e-4]:
    fwd = (Lz(z[y] + h) - Lz(z[y])) / h; cen = (Lz(z[y] + h) - Lz(z[y] - h)) / (2 * h)
    fd["%g" % h] = dict(forward=fwd, central=cen, err_forward=abs(fwd - gz[y]), err_central=abs(cen - gz[y]))
E["fd_zsat"] = fd

# ---------------- section 2 and 7 worked examples ----------------
f2 = lambda a, b: a * a + 3 * a * b
E["ex_grad"] = dict(f=f2(2, 1), grad=[2 * 2 + 3 * 1, 3 * 2], approx=f2(2, 1) + 0.07, exact=f2(2.01, 1))
A = np.array([[2., 1.], [0., 3.]]); xv = np.array([1., 2.])
E["ex_quad"] = dict(f=float(xv @ A @ xv), grad=((A + A.T) @ xv).tolist())
X = np.array([[2., 1.], [1., 3.]])
E["ex_logdet"] = dict(det=float(np.linalg.det(X)), grad=np.linalg.inv(X).T.tolist())
h = 1e-6; Xp = X.copy(); Xp[0, 0] += h
check("logdet fd", (math.log(np.linalg.det(Xp)) - math.log(np.linalg.det(X))) / h, np.linalg.inv(X).T[0, 0], 1e-5)
Xd = np.array([[1., 0.], [1., 1.], [1., 2.]]); yd = np.array([1., 2., 2.])
wls = np.linalg.solve(Xd.T @ Xd, Xd.T @ yd)
E["ex_lsq"] = dict(XtX=(Xd.T @ Xd).tolist(), Xty=(Xd.T @ yd).tolist(), w=wls.tolist(), pred=(Xd @ wls).tolist(),
                   resid=(yd - Xd @ wls).tolist(), grad_at_0=(2 * Xd.T @ (Xd @ np.zeros(2) - yd)).tolist(),
                   kappa_X=float(np.linalg.cond(Xd)), kappa_XtX=float(np.linalg.cond(Xd.T @ Xd)))
# the old page's layout example: L = ||W x - y||^2 with W 3x2 -> grad 2 (W x - y) x^T, shape 3 x 2
yv = np.array([1., 0., 0.])
Wl = torch.tensor(W, requires_grad=True); ((Wl @ torch.tensor(x) - torch.tensor(yv)) ** 2).sum().backward()
check("old layout example", 2 * np.outer(W @ x - yv, x), Wl.grad)
E["ex_sqerr"] = dict(y=yv.tolist(), grad=(2 * np.outer(W @ x - yv, x)).tolist())
# the old page's list of gradients, each against autograd
a = np.array([1., -2.]); At = torch.tensor(A); Xt = torch.tensor(X, requires_grad=True)
xa = torch.tensor(xv, requires_grad=True); (torch.tensor(a) @ xa).backward(); check("a^T x", a, xa.grad)
xb = torch.tensor(xv, requires_grad=True); (xb @ At @ xb).backward(); check("x^T A x", (A + A.T) @ xv, xb.grad)
Xc = torch.tensor(X, requires_grad=True); torch.trace(At @ Xc).backward(); check("tr(AX)", A.T, Xc.grad)
Xe = torch.tensor(X, requires_grad=True); (Xe ** 2).sum().backward(); check("||X||_F^2", 2 * X, Xe.grad)
Xf = torch.tensor(X, requires_grad=True); torch.logdet(Xf).backward(); check("logdet", np.linalg.inv(X).T, Xf.grad)

# old calculus page: one logistic unit
xl_=np.array([1.,2.]); wl_=np.array([0.5,-0.25]); bl_=0.1; zl_=wl_@xl_+bl_; pl_=1/(1+math.exp(-zl_)); gzl=pl_-1
w2_=wl_-0.1*gzl*xl_; b2_=bl_-0.1*gzl; z2_=w2_@xl_+b2_
E["ex_logistic"]=dict(z=zl_,p=pl_,loss=-math.log(pl_),gz=gzl,gw=(gzl*xl_).tolist(),gx=(gzl*wl_).tolist(),w2=w2_.tolist(),b2=b2_,z2=z2_,p2=1/(1+math.exp(-z2_)))
check("logistic example", [round(pl_,3),round(-math.log(pl_),3),round(z2_,3),round(1/(1+math.exp(-z2_)),3)], [0.525,0.644,0.385,0.595], 1e-9)
# ---------------- the derivative workbench defaults ----------------
WB = {}
gbar_lin = gz.copy()
WB["linear"] = dict(P=dict(W=W.tolist(), x=x.tolist(), b=[0., 0., 0.]), g=gbar_lin.tolist(),
                    out=(W @ x).tolist(), grads=dict(W=np.outer(gbar_lin, x).tolist(), x=(W.T @ gbar_lin).tolist(), b=gbar_lin.tolist()))
# torch
Wq = torch.tensor(W, requires_grad=True); xq = torch.tensor(x, requires_grad=True); bq = torch.zeros(3, requires_grad=True)
((Wq @ xq + bq) @ torch.tensor(gbar_lin)).backward()
check("wb linear W", WB["linear"]["grads"]["W"], Wq.grad); check("wb linear x", WB["linear"]["grads"]["x"], xq.grad)

xa_ = np.array([-1.5, -0.2, 0.4, 2.0]); ga_ = np.array([0.5, -1.0, 0.25, 1.0])
from math import erf
Phi = lambda v: 0.5 * (1 + erf(v / math.sqrt(2))); phi = lambda v: math.exp(-v * v / 2) / math.sqrt(2 * math.pi)
acts = {"relu": (lambda v: max(0., v), lambda v: 1. if v > 0 else 0.),
        "tanh": (math.tanh, lambda v: 1 - math.tanh(v) ** 2),
        "sigmoid": (lambda v: 1 / (1 + math.exp(-v)), lambda v: (1 / (1 + math.exp(-v))) * (1 - 1 / (1 + math.exp(-v)))),
        "gelu": (lambda v: v * Phi(v), lambda v: Phi(v) + v * phi(v))}
tfn = {"relu": torch.relu, "tanh": torch.tanh, "sigmoid": torch.sigmoid, "gelu": torch.nn.functional.gelu}
WB["act"] = {}
for k, (fn, dfn) in acts.items():
    out = [fn(v) for v in xa_]; gr = [ga_[i] * dfn(v) for i, v in enumerate(xa_)]
    xt_ = torch.tensor(xa_, requires_grad=True); (tfn[k](xt_) @ torch.tensor(ga_)).backward()
    check("wb act " + k, gr, xt_.grad)
    WB["act"][k] = dict(P=dict(fn=k, x=xa_.tolist()), g=ga_.tolist(), out=out, grads=dict(x=gr), deriv=[dfn(v) for v in xa_])

zs = np.array([2., 1., 0.]); gs = np.array([0.5, -1.0, 0.25]); ps = softmax(zs)
vjp_s = ps * (gs - ps @ gs)
zt = torch.tensor(zs, requires_grad=True); (torch.softmax(zt, 0) @ torch.tensor(gs)).backward(); check("wb softmax", vjp_s, zt.grad)
check("softmax vjp via J", (np.diag(ps) - np.outer(ps, ps)).T @ gs, vjp_s)
WB["softmax"] = dict(P=dict(z=zs.tolist()), g=gs.tolist(), out=ps.tolist(), grads=dict(z=vjp_s.tolist()), dot=float(ps @ gs),
                     J=(np.diag(ps) - np.outer(ps, ps)).tolist())
WB["sce"] = dict(P=dict(z=zs.tolist(), y=2), g=[1.0], out=[loss], grads=dict(z=gz.tolist()))

xl = np.array([2., 1., 0., -1.]); gam = np.array([1., 0.5, -1., 2.]); bet = np.zeros(4); gl = np.array([0.3, -0.6, 0.9, 0.1]); eps = 1e-5
mu = xl.mean(); var = ((xl - mu) ** 2).mean(); r = 1 / math.sqrt(var + eps); xh = (xl - mu) * r
yl = gam * xh + bet; gh = gl * gam
dx = r * (gh - gh.mean() - xh * (gh * xh).mean())
xt_ = torch.tensor(xl, requires_grad=True); gt_ = torch.tensor(gam, requires_grad=True); bt_ = torch.tensor(bet, requires_grad=True)
(torch.nn.functional.layer_norm(xt_, (4,), gt_, bt_, eps) @ torch.tensor(gl)).backward()
check("wb ln x", dx, xt_.grad); check("wb ln gamma", gl * xh, gt_.grad); check("wb ln beta", gl, bt_.grad)
# PyTorch CPU kernel form (aten/src/ATen/native/cpu/layer_norm_kernel.cpp, v2.14.1)
N = 4; ds = (gl * xl * gam).sum(); db = (gl * gam).sum(); ka = r; kb = (db * mu - ds) * ka ** 3 / N; kc = -kb * mu - db * ka / N
check("ln kernel form", ka * gl * gam + kb * xl + kc, dx)
WB["layernorm"] = dict(P=dict(x=xl.tolist(), gamma=gam.tolist(), beta=bet.tolist(), eps=eps), g=gl.tolist(), out=yl.tolist(),
                       grads=dict(x=dx.tolist(), gamma=(gl * xh).tolist(), beta=gl.tolist()),
                       stats=dict(mu=mu, var=var, rstd=r, xh=xh.tolist(), mean_gh=gh.mean(), mean_ghxh=(gh * xh).mean()),
                       kernel=dict(a=ka, b=kb, c=kc, ds=ds, db=db))
# RMSNorm variant (no mean): y = g * x / rms, rms = sqrt(mean(x^2) + eps)
rms = math.sqrt((xl ** 2).mean() + eps); xr = xl / rms
dx_rms = (gh - xr * (gh * xr).mean()) / rms
xt_ = torch.tensor(xl, requires_grad=True)
((torch.tensor(gam) * xt_ / torch.sqrt((xt_ ** 2).mean() + eps)) @ torch.tensor(gl)).backward(); check("rmsnorm", dx_rms, xt_.grad)
WB["rmsnorm"] = dict(rms=rms, dx=dx_rms.tolist())

Q = np.array([[2., 1.], [0., 1.]]); K = W.copy(); V = W.copy(); dO = np.array([[1., 0.], [0., -1.]])
sc = 1 / math.sqrt(2); S = Q @ K.T * sc; Am = np.vstack([softmax(rw) for rw in S]); O = Am @ V
dV = Am.T @ dO; dA = dO @ V.T; D = (dO * O).sum(1); dS = Am * (dA - D[:, None]); dQ = dS @ K * sc; dK = dS.T @ Q * sc
check("D identity", D, (dA * Am).sum(1))
Qt = torch.tensor(Q, requires_grad=True); Kt = torch.tensor(K, requires_grad=True); Vt = torch.tensor(V, requires_grad=True)
Ot = torch.softmax(Qt @ Kt.T * sc, -1) @ Vt; (Ot * torch.tensor(dO)).sum().backward()
check("wb attn Q", dQ, Qt.grad); check("wb attn K", dK, Kt.grad); check("wb attn V", dV, Vt.grad)
# and against PyTorch's fused scaled_dot_product_attention
Qt2 = torch.tensor(Q, requires_grad=True); Kt2 = torch.tensor(K, requires_grad=True); Vt2 = torch.tensor(V, requires_grad=True)
O2 = torch.nn.functional.scaled_dot_product_attention(Qt2[None], Kt2[None], Vt2[None])[0]
(O2 * torch.tensor(dO)).sum().backward(); check("sdpa O", O, O2.detach()); check("sdpa dQ", dQ, Qt2.grad)
WB["attn"] = dict(P=dict(Q=Q.tolist(), K=K.tolist(), V=V.tolist()), g=dO.tolist(), out=O.tolist(),
                  grads=dict(Q=dQ.tolist(), K=dK.tolist(), V=dV.tolist()), S=S.tolist(), A=Am.tolist(), dA=dA.tolist(), D=D.tolist(), dS=dS.tolist())
E["wb"] = WB
# first query of the attention example is the root's: scores (1.414, 0.707, 0), weights (0.576, 0.284, 0.140)
E["attn_root_check"] = dict(scores=S[0].tolist(), weights=Am[0].tolist(), out=O[0].tolist())

# ---------------- the memory animation's chain and schedules ----------------
CH = dict(w=[1.5, -1.2, 0.9, 1.1, -0.8, 1.3, 0.7, -1.4, 1.0, 1.2, -0.9, 0.8, 1.1, -1.3, 0.9, 1.0], h0=0.5, t=0.2)
def chain(n):
    hs = [CH["h0"]]
    for k in range(1, n + 1):
        hs.append(math.tanh(CH["w"][k - 1] * hs[-1]))
    gh = [0.] * (n + 1); gw = [0.] * n; gh[n] = hs[n] - CH["t"]
    for k in range(n, 0, -1):
        a_ = gh[k] * (1 - hs[k] ** 2); gw[k - 1] = a_ * hs[k - 1]; gh[k - 1] = a_ * CH["w"][k - 1]
    return dict(h=hs, loss=0.5 * (hs[n] - CH["t"]) ** 2, gh=gh, gw=gw)
E["chain9"] = chain(9)
wt = torch.tensor(CH["w"][:9], requires_grad=True); hh = torch.tensor(CH["h0"])
for k in range(9):
    hh = torch.tanh(wt[k] * hh)
(0.5 * (hh - CH["t"]) ** 2).backward(); check("chain gw", E["chain9"]["gw"], wt.grad)

def schedule(n, mode, seg=0):
    held = {0}; peak = 1; fw = rc = bw = 0
    stored = lambda k: k == 0 or mode == "all" or (mode == "ckpt" and k % seg == 0)
    keep = mode != "none"
    def ensure(k):
        nonlocal rc, peak
        if k in held:
            return
        j = k - 1
        while j not in held:
            j -= 1
        for i in range(j + 1, k + 1):
            held.add(i); rc += 1; peak = max(peak, len(held))
            if not keep and i - 1 > j:
                held.discard(i - 1)
    for k in range(1, n + 1):
        held.add(k); fw += 1; peak = max(peak, len(held))
        if not stored(k - 1):
            held.discard(k - 1)
    if mode == "infer":
        return dict(peak=peak, fw=fw, rc=rc, bw=bw)
    for k in range(n, 0, -1):
        ensure(k); ensure(k - 1); bw += 1; peak = max(peak, len(held)); held.discard(k)
    return dict(peak=peak, fw=fw, rc=rc, bw=bw)
SCH = {}
for n in [4, 9, 16]:
    for mode, seg in [("infer", 0), ("all", 0), ("none", 0)] + [("ckpt", s) for s in (2, 3, 4)]:
        SCH["%d_%s_%d" % (n, mode, seg)] = schedule(n, mode, seg)
E["schedules"] = SCH

# ---------------- einsum and FLOPs ----------------
E["einsum_attn"] = dict(macs=2 * 8 * 128 * 128 * 64, flops=2 * 2 * 8 * 128 * 128 * 64)
E["einsum_chain"] = dict(naive_macs=1000 ** 3, optimal_macs=2 * 1000 ** 2)

# ---------------- the measurements (copied from the scratchpad runs) ----------------
M = os.path.join(HERE, "inputs/measure")
fl = json.load(open(os.path.join(M, "cost_flops.json")))
cfg = fl["cfg"]; tok = cfg["B"] * cfg["T"]
mm_f = 2 * tok * (fl["params_nonemb"] - cfg["L"] * (4 * cfg["d"] + cfg["f"] + cfg["d"]) - 2 * cfg["d"] + cfg["V"] * cfg["d"])  # matmul weights only
E["flops"] = dict(fwd=fl["fwd"], bwd=fl["bwd"], ratio=fl["bwd"] / fl["fwd"], ckpt1_total=fl["ckpt1_total"],
                  ckpt1_extra=fl["ckpt1_total"] - fl["fwd"] - fl["bwd"], params=fl["params"], params_nonemb=fl["params_nonemb"],
                  kaplan_6N=fl["kaplan_6N"], attn_fwd=4 * cfg["B"] * cfg["T"] ** 2 * cfg["d"] * cfg["L"],
                  mm_fwd_pred=mm_f, fwd_by=fl["fwd_by"], bwd_by=fl["bwd_by"])
check("attention bmm flops", E["flops"]["attn_fwd"], fl["fwd_by"]["aten.bmm"], 0.5)
check("matmul flops", mm_f, fl["fwd_by"]["aten.mm"], 0.5)
# the recompute skips each block's last matmul (W2): early stop of non-reentrant checkpointing
last_mm = 2 * tok * cfg["d"] * cfg["f"] * cfg["L"]
check("ckpt extra = blocks' forward minus W2", fl["fwd"] - 2 * tok * cfg["V"] * cfg["d"] - last_mm, E["flops"]["ckpt1_extra"], 0.5)
mem = {m: json.load(open(os.path.join(M, "memtl_%s.json" % m))) for m in ["nograd", "none", "ckpt2", "ckpt1"]}
sv = json.load(open(os.path.join(M, "savedops.json")))
E["memory"] = {m: dict(held=v["held_after_fwd"], peak=v["peak_over_base"], ops=v["n_ops"]) for m, v in mem.items()}
E["memory"]["saved_by_graph_walk"] = sv["total_saved_bytes"]
E["saved_by_op"] = sv["by_op"]
check("graph walk equals MPS held (MiB, 0.5)", sv["total_saved_bytes"] / 2 ** 20, mem["none"]["held_after_fwd"] / 2 ** 20, 0.5)
# predicted per-block saved floats, from the graph (fp32): see the page's table
B_, T_, d_, f_, h_ = cfg["B"], cfg["T"], cfg["d"], cfg["f"], cfg["h"]
per_block = (8 * B_ * T_ * d_ + 2 * B_ * T_ * f_ + h_ * B_ * T_ * T_) * 4 + T_ * T_  # 8 (BTd) + 2 (BTf) + probabilities, plus the bool mask
head = (B_ * T_ * cfg["V"] + 2 * B_ * T_ * d_) * 4                                  # log-softmax output; final norm input and output
E["per_block_saved_bytes"] = per_block; E["head_saved_bytes"] = head
check("saved = 8 blocks + head (MiB, 0.2; the rest is norm statistics and targets)", (cfg["L"] * per_block + head) / 2 ** 20, sv["total_saved_bytes"] / 2 ** 20, 0.2)
tm = json.load(open(os.path.join(M, "timing2.json")))
E["timing"] = {m: tm[m] for m in ["none", "ckpt2", "ckpt1"]}
hv = json.load(open(os.path.join(M, "hvp.json")))
E["hvp"] = hv["hvp"]; E["jac"] = dict(out1=hv["jac_scalar_out"], in1=hv["jac_scalar_in"])
gr = json.load(open(os.path.join(M, "graph.json")))
E["graph"] = dict(n_nodes=gr["n_nodes"], n_acc=gr["n_accumulate"], loss=gr["loss"], saved=gr["saved_unique_nonparam_bytes"])

json.dump(E, open(os.path.join(HERE, "expected.json"), "w"), indent=1)
print("checks failed:", fails if fails else "none")
print("tiny", [round(v, 4) for v in gz], "loss", round(loss, 4), "Hx", np.round(Hx, 4).tolist())
print("ln dx", np.round(dx, 4).tolist(), "attn dQ", np.round(dQ, 4).tolist())
print("flops ratio", E["flops"]["ratio"], "ckpt extra", E["flops"]["ckpt1_extra"] / 1e9)
