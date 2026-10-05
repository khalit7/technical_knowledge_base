"""Recompute every worked number of the Reading tab (Topic: math) and of the old page's worked examples.
Run from the scratchpad: uv run --no-project --with numpy --with sympy python recompute.py
Prints name = value lines; check_page.py compares the page text against them."""
import numpy as np, sympy as sp, math, json, sys

R = {}
def put(k, v): R[k] = v; print(f"{k} = {v}")

# ---------- the running model ----------
vocab = ["cat", "dog", "sat"]
x = np.array([2.0, 1.0])                      # input vector (embedding of the context "the cat")
W = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, -2.0]])  # one row per vocabulary token
z = W @ x
put("z", z.tolist())                           # (2, 1, 0)
for i, t in enumerate(vocab):
    put(f"cos_{t}", round(float(W[i] @ x / np.linalg.norm(W[i]) / np.linalg.norm(x)), 3))
put("norm_x", round(float(np.linalg.norm(x)), 3))
put("norm_x_sq", float(x @ x))

def softmax(v):
    e = np.exp(v - v.max()); return e / e.sum()
e = np.exp(z); put("exp_z", np.round(e, 3).tolist()); put("sum_exp", round(float(e.sum()), 3))
p = softmax(z); put("p", np.round(p, 3).tolist())
for T in (0.5, 1, 2, 5):
    put(f"p_T{T}", np.round(softmax(z / T), 3).tolist())
put("p_shift_check", np.round(softmax(z + 10), 3).tolist())

y = np.array([0.0, 0.0, 1.0])                 # the right next token is "sat"
L = -math.log(p[2]); put("loss_sat_nats", round(L, 3))
put("loss_sat_bits", round(L / math.log(2), 3))
put("ppl_sat", round(math.exp(L), 2))
put("loss_uniform", round(math.log(3), 4)); put("ppl_uniform", 3)
H = -float((p * np.log(p)).sum()); put("entropy_p_nats", round(H, 3)); put("entropy_p_bits", round(H / math.log(2), 3))
for i, t in enumerate(vocab):
    put(f"surprise_bits_{t}", round(-math.log2(p[i]), 3))
# bits per byte for one token " sat" (4 UTF-8 bytes) -- illustrative
put("bpb_one_token", round(L / math.log(2) / 4, 3))
# KL from the one-hot target to p equals the cross-entropy (entropy of a one-hot is 0)
put("kl_onehot", round(L, 3))
# a soft target: say the data says sat 0.8, dog 0.2 after "the cat" (illustrative)
q = np.array([0.0, 0.2, 0.8])
CEq = -float((q[q > 0] * np.log(p[q > 0])).sum()); Hq = -float((q[q > 0] * np.log(q[q > 0])).sum())
put("soft_CE", round(CEq, 3)); put("soft_H", round(Hq, 3)); put("soft_KL", round(CEq - Hq, 3))

# ---------- gradient ----------
g = p - y; put("g_z", np.round(g, 3).tolist()); put("g_sum", round(float(g.sum()), 12))
# finite difference check on z_sat
h = 1e-3
def loss_of(zz): return -math.log(softmax(zz)[2])
fd = [(loss_of(z + h * np.eye(3)[k]) - loss_of(z - h * np.eye(3)[k])) / (2 * h) for k in range(3)]
put("fd_grad", np.round(fd, 4).tolist())
put("loss_nudge_sat_plus_0.1", round(loss_of(z + np.array([0, 0, 0.1])), 4))
put("loss_change_pred_0.1", round(-0.1 * (1 - p[2]), 4))
gW = np.outer(g, x); put("g_W", np.round(gW, 3).tolist())
put("rank_gW", int(np.linalg.matrix_rank(gW)))
gx = W.T @ g; put("g_x", np.round(gx, 3).tolist())
# chain rule pieces for z_sat: dL/dp_sat = -1/p_sat, dp_sat/dz_sat = p_sat(1-p_sat)
put("dL_dpsat", round(-1 / p[2], 3)); put("dpsat_dzsat", round(p[2] * (1 - p[2]), 4))
put("chain_product", round(-1 / p[2] * p[2] * (1 - p[2]), 3))

# ---------- one gradient step ----------
for eta in (0.1, 0.3, 1.0):
    W2 = W - eta * gW; z2 = W2 @ x; p2 = softmax(z2); L2 = -math.log(p2[2])
    put(f"step{eta}_W", np.round(W2, 3).tolist()); put(f"step{eta}_z", np.round(z2, 3).tolist())
    put(f"step{eta}_p", np.round(p2, 3).tolist()); put(f"step{eta}_loss", round(L2, 3))
    put(f"step{eta}_zcheck", np.round(z - eta * float(x @ x) * g, 3).tolist())
# several steps at eta 0.1
Wk = W.copy(); losses = []
for k in range(21):
    zk = Wk @ x; pk = softmax(zk); losses.append(round(-math.log(pk[2]), 3))
    Wk = Wk - 0.1 * np.outer(pk - y, x)
put("losses_eta0.1_steps0to20", losses)

# ---------- curvature of the running model ----------
Hz = np.diag(p) - np.outer(p, p)
ev = np.linalg.eigvalsh(Hz); put("Hz_eigs", np.round(ev, 4).tolist())
lam_W = ev.max() * float(x @ x); put("lam_max_W", round(lam_W, 3)); put("eta_limit_W", round(2 / lam_W, 3))
put("Hz_diag", np.round(np.diag(Hz), 4).tolist())

# ---------- the 1D quadratic animation ----------
lam = 4.0
for eta in (0.1, 0.4, 0.45, 0.55, 0.6):
    f = 1 - eta * lam; th = [1.0]
    for k in range(8): th.append(round(th[-1] * f, 4))
    put(f"quad_eta{eta}_factor", round(f, 3)); put(f"quad_eta{eta}_theta", th)
put("quad_limit", 2 / lam)

# ---------- old page: conditioning example H = diag(1, 10) ----------
put("old_cond_limit", 2 / 10); put("old_best_eta", round(2 / 11, 3)); put("old_contract", round(9 / 11, 3))
put("old_steps_1000x", round(math.log(1000) / math.log(11 / 9), 1))
mom = (math.sqrt(10) - 1) / (math.sqrt(10) + 1); put("old_momentum_contract", round(mom, 3))
put("old_momentum_steps", round(math.log(1000) / -math.log(mom), 1))

# ---------- old page: four hats with A correct (target = cat) ----------
LA = -math.log(p[0]); put("hat_nll_A", round(LA, 3)); put("hat_bits_A", round(LA / math.log(2), 3))
put("hat_grad_A", np.round(p - np.array([1, 0, 0]), 3).tolist())
put("hat_infonce_bound", round(math.log(3) - LA, 3))

# ---------- old page: Bernoulli curvature ----------
zb = sp.symbols('z'); yb = sp.symbols('y')
pb = 1 / (1 + sp.exp(-zb)); Lb = -(yb * sp.log(pb) + (1 - yb) * sp.log(1 - pb))
d2 = sp.simplify(sp.diff(Lb, zb, 2)); put("bern_d2", str(d2))
put("bern_d2_label_free", sp.simplify(sp.diff(d2, yb)) == 0)
score = sp.simplify(sp.diff(-Lb, zb)); put("bern_score", str(score))
for zz in (0, math.log(9)):
    pp = 1 / (1 + math.exp(-zz)); put(f"bern_curv_z{round(zz,3)}", round(pp * (1 - pp), 4))
put("ln9", round(math.log(9), 3))

# ---------- information-theory extras from the old page ----------
put("coin_0.9_bits", round(-(0.9 * math.log2(0.9) + 0.1 * math.log2(0.1)), 3))

# ---------- statistics: error bar of the mean ----------
# per-sentence loss change after the step has some spread; illustrative sd 0.5 nats, mean -0.05
sd = 0.5
for n in (1, 4, 16, 100, 400):
    put(f"se_n{n}", round(sd / math.sqrt(n), 3))
put("se_acc_0.5_n500", round(math.sqrt(0.25 / 500), 4)); put("ci95_acc_0.5_n500", round(1.96 * math.sqrt(0.25 / 500), 4))
put("se_acc_0.5_n2000", round(math.sqrt(0.25 / 2000), 4))

# ---------- LoRA ----------
d, r = 4096, 8
put("lora_full", d * d); put("lora_pair", 2 * d * r); put("lora_pct", round(100 * 2 * r / d, 2))

# ---------- the equation-reading example: softmax cross-entropy over a batch ----------

# ---------- the equation-reading example: scaled dot-product attention (Vaswani et al. 2017, eq. 1) ----------
q_ = x; K = W; dk = 2
sc = K @ q_ / math.sqrt(dk); put("attn_scores", np.round(sc, 3).tolist())
a_ = softmax(sc); put("attn_weights", np.round(a_, 3).tolist())
put("attn_out_V_eq_W", np.round(a_ @ W, 3).tolist())
put("attn_weights_unscaled", np.round(softmax(K @ q_), 3).tolist())
# ---------- Hessian of CE wrt logits = covariance of the one-hot draw ----------
rng = np.random.default_rng(0); draws = np.eye(3)[rng.choice(3, size=200000, p=p)]
put("onehot_cov_mc_diag", np.round(np.cov(draws.T).diagonal(), 3).tolist())

json.dump(R, open(sys.argv[1] if len(sys.argv) > 1 else "numbers.json", "w"), indent=1, default=lambda o: o if not isinstance(o, np.generic) else o.item())
