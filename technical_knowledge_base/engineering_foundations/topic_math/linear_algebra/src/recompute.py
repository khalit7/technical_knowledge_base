"""Recompute every number on the Linear algebra page.

Run: python3 src/recompute.py   (numpy only; writes src/numbers.json)
Hand-worked examples are recomputed here; the GPT-2 and LoRA figures are read from
inputs/gpt2_la.json (made offline by inputs/la_gpt2.py) and summarised the way the page quotes them.
check_page.mjs compares the page's JavaScript output with numbers.json.
"""
import json, math, os
import numpy as np

H = os.path.dirname(os.path.abspath(__file__))
N = {}
r3 = lambda v: float(np.round(v, 3))
def put(k, v, nd=3):
    if isinstance(v, (list, tuple, np.ndarray)):
        v = np.round(np.asarray(v, float), nd).tolist()
    elif isinstance(v, (float, np.floating)):
        v = float(round(float(v), nd))
    N[k] = v

# ---- the root's tiny model ----
x = np.array([2., 1.]); W = np.array([[1., 0], [0, 1], [1, -2]])
z = W @ x; put("z", z)
put("norm_x", np.linalg.norm(x)); put("norm1_x", np.abs(x).sum()); put("norminf_x", np.abs(x).max())
cos = lambda a, b: a @ b / np.linalg.norm(a) / np.linalg.norm(b)
put("cos_cat", cos(x, W[0])); put("cos_dog", cos(x, W[1])); put("cos_sat", cos(x, W[2]))
put("proj_x_on_11", (x @ [1, 1]) / 2 * np.array([1., 1])); put("resid_x_on_11", x - (x @ [1, 1]) / 2 * np.array([1., 1]))
# basis b1=(1,1), b2=(1,-1)
put("coords_x_b", np.linalg.solve(np.array([[1., 1], [1, -1]]).T, x))
# old examples
v = np.array([3., -4]); put("old_norms", [np.linalg.norm(v), np.abs(v).sum(), np.abs(v).max()])
a = np.array([1., 2, 2]); b = np.array([2., 1, 2]); put("old_cos_ab", cos(a, b)); put("old_dot_ab", a @ b)
put("old_orth", v @ [4, 3])
# W: four subspaces, norms, SVD
sW = np.linalg.svd(W, compute_uv=False); put("W_sv", sW); put("W_kappa", sW[0] / sW[1])
put("W_fro", np.linalg.norm(W)); put("W_nuc", sW.sum()); put("W_rank", np.linalg.matrix_rank(W))
n = np.array([-1., 2, 1]); put("leftnull_check", W.T @ n); put("leftnull_z", n @ z)
S = W.T @ W; put("S", S)
ev, evec = np.linalg.eigh(S); put("S_eig", ev)
put("S_x", S @ x); put("norm_z_sq", z @ z)
put("S_chol", np.linalg.cholesky(S), 4)
put("S_det", np.linalg.det(S))
# gradient of the root's step: g_W = g_z x^T, rank 1
p = np.exp(z) / np.exp(z).sum(); gz = p - np.array([0, 0, 1.]); gW = np.outer(gz, x)
put("g_z", gz); put("gW_rank", np.linalg.matrix_rank(gW)); put("gW_fro", np.linalg.norm(gW))
put("gW_sv1", np.linalg.svd(gW, compute_uv=False)[0]); put("norm_gz", np.linalg.norm(gz))

# ---- the running 2x2: A = [[3,0],[4,5]] ----
A = np.array([[3., 0], [4, 5]])
put("A_det", np.linalg.det(A)); put("A_trace", np.trace(A))
put("A_eig", sorted(np.linalg.eigvals(A).real))
put("A_eigcheck1", A @ [1, -2]); put("A_eigcheck2", A @ [0, 1])
put("AtA", A.T @ A); U, s, Vt = np.linalg.svd(A); put("A_sv", s, 4)
# sign convention fixed so both U and V are rotations (det +1) with v1 = (1,1)/sqrt2
v1 = np.array([1, 1]) / math.sqrt(2); v2 = np.array([-1, 1]) / math.sqrt(2)
u1 = A @ v1 / s[0]; u2 = A @ v2 / s[1]
put("A_u1", u1, 4); put("A_u2", u2, 4); put("A_u1_times_sqrt10", u1 * math.sqrt(10)); put("A_u2_times_sqrt10", u2 * math.sqrt(10))
Um = np.column_stack([u1, u2]); Vm = np.column_stack([v1, v2])
put("A_detU", np.linalg.det(Um)); put("A_detV", np.linalg.det(Vm))
put("A_rotU_deg", math.degrees(math.atan2(u1[1], u1[0])), 2); put("A_rotVt_deg", -math.degrees(math.atan2(v1[1], v1[0])), 2)
put("A_reconstruct", Um @ np.diag(s) @ Vm.T)
put("A_fro", np.linalg.norm(A)); put("A_spec", s[0]); put("A_nuc", s.sum()); put("A_kappa", s[0] / s[1])
A1 = s[0] * np.outer(u1, v1); put("A1", A1); put("A_minus_A1", A - A1)
put("A1_err_spec", np.linalg.norm(A - A1, 2)); put("A1_err_fro", np.linalg.norm(A - A1))
# power iteration from (1,1)
q = np.array([1., 1]); ang = []
for k in range(8):
    q = A @ q; q /= np.linalg.norm(q); ang.append(math.degrees(math.acos(abs(q @ [0, 1]))))
put("power_angles_deg", ang, 2)

# ---- matrix multiplication four ways ----
P = np.array([[1., 2], [3, 4]]); Q = np.array([[5., 6], [7, 8]])
put("PQ", P @ Q); put("QP", Q @ P)
put("PQ_outer1", np.outer(P[:, 0], Q[0])); put("PQ_outer2", np.outer(P[:, 1], Q[1]))
put("PQ_col1", 5 * P[:, 0] + 7 * P[:, 1])

# ---- broadcasting bug ----
pred = np.array([[1.], [2], [3]]); y = np.array([1., 2, 3])
put("bcast_diff", pred - y); put("bcast_mse_wrong", ((pred - y) ** 2).mean()); put("bcast_mse_right", ((pred[:, 0] - y) ** 2).mean())

# ---- rank by elimination ----
M = np.array([[1., 2, 3], [2, 4, 6], [1, 0, 1]]); put("M_rank", np.linalg.matrix_rank(M)); put("M_null_check", M @ [-1, -1, 1])
R1 = np.array([[1., 2], [2, 4]]); put("R1_rank", np.linalg.matrix_rank(R1)); put("R1_null", R1 @ [2, -1]); put("R1_det", np.linalg.det(R1))

# ---- least squares, QR, conditioning ----
X = np.array([[1., 0], [1, 1], [1, 2]]); yv = np.array([1., 2, 2])
put("XtX", X.T @ X); put("Xty", X.T @ yv)
w = np.linalg.solve(X.T @ X, X.T @ yv); put("ls_w", w); put("ls_pred", X @ w); put("ls_resid", yv - X @ w)
put("ls_resid_dot_cols", X.T @ (yv - X @ w), 6)
Qx, Rx = np.linalg.qr(X); sgn = np.sign(np.diag(Rx)); Qx = Qx * sgn; Rx = (Rx.T * sgn).T
put("qr_R", Rx, 4); put("qr_Q", Qx, 4); put("qr_Qty", Qx.T @ yv, 4)
put("gs_q2_unnorm", X[:, 1] - (X[:, 1] @ X[:, 0]) / 3 * X[:, 0])
put("kappa_X", np.linalg.cond(X), 2); put("kappa_XtX", np.linalg.cond(X.T @ X), 2)
e = np.linalg.eigvalsh(X.T @ X); put("XtX_eig", e); put("kappa_XtX_ridge1", (e[1] + 1) / (e[0] + 1), 2)
put("proj_P", X @ np.linalg.inv(X.T @ X) @ X.T, 4)
# near-singular system
B = np.array([[1., 1], [1, 1.001]]); put("B_kappa", np.linalg.cond(B), 0)
x1 = np.linalg.solve(B, [2, 2.001]); x2 = np.linalg.solve(B, [2, 2.002]); put("B_x1", x1); put("B_x2", x2)
relb = np.linalg.norm([0, 0.001]) / np.linalg.norm([2, 2.001]); relx = np.linalg.norm(x2 - x1) / np.linalg.norm(x1)
put("B_relb", relb, 6); put("B_relx", relx); put("B_amplif", relx / relb, 0)
# float32: normal equations against QR on a polynomial fit (degree 6, 50 points on [0, 1])
t = np.linspace(0, 1, 50); V = np.vander(t, 7, increasing=True)
wt = np.arange(1, 8) * (-1.) ** np.arange(7)  # true coefficients 1, -2, 3, ...
yy = V @ wt
put("vander_kappa", float("%.3g" % np.linalg.cond(V)), 0)
V32 = V.astype(np.float32); y32 = yy.astype(np.float32)
wn = np.linalg.solve(V32.T @ V32, V32.T @ y32)
q32, r32 = np.linalg.qr(V32); wq = np.linalg.solve(r32, q32.T @ y32)
rel = lambda u: float(np.linalg.norm(u.astype(float) - wt) / np.linalg.norm(wt))
put("f32_err_normal", float("%.2g" % rel(wn)), 6); put("f32_err_qr", float("%.2g" % rel(wq)), 6)
N["f32_dtypes"] = [str(wn.dtype), str(wq.dtype)]

# ---- symmetric / PD / Cholesky ----
C = np.array([[4., 2], [2, 3]]); L = np.linalg.cholesky(C); put("chol_old", L, 4)
put("chol_sample_z", L @ [1, -1], 3)
put("psd_11_eig", np.linalg.eigvalsh(np.array([[1., 1], [1, 1]])))
# PCA on four centred points
D = np.array([[2., 1], [-2, -1], [1, 1], [-1, -1]]); Cv = D.T @ D / 4; put("pca_cov", Cv)
ev2, evec2 = np.linalg.eigh(Cv); put("pca_eig", ev2); pc = evec2[:, 1] * np.sign(evec2[0, 1]); put("pca_dir", pc)
put("pca_frac", ev2[1] / ev2.sum())

# ---- LoRA arithmetic (root's numbers) and storage of a truncated SVD ----
d, r = 4096, 8; put("lora_full", d * d); put("lora_pair", 2 * d * r); put("lora_pct", 100 * 2 * r / d, 2)
put("svd_store_768_k64", 64 * (768 + 768)); put("svd_store_768_full", 768 * 768)
# MLA cache per token per layer (DeepSeek-V3 dims)
put("mla_cache", 512 + 64); put("mha_cache", 2 * 128 * 128)
# GaLore optimiser state for one 4096 x 4096 matrix at r = 128 (Adam keeps 2mn moments; GaLore 2nr, plus mr projector)
m_, n_, rr = 4096, 4096, 128; put("galore_adam_states", 2 * m_ * n_); put("galore_states", m_ * rr + 2 * n_ * rr)

# ---- Newton-Schulz orthogonalisation (cubic) on A / ||A||_F ----
Xn = A / np.linalg.norm(A); svs = [np.linalg.svd(Xn, compute_uv=False).tolist()]
for k in range(8):
    Xn = 1.5 * Xn - 0.5 * Xn @ Xn.T @ Xn; svs.append(np.linalg.svd(Xn, compute_uv=False).tolist())
put("ns_sv", svs, 4); put("ns_final", Xn, 4); put("polar_A", Um @ Vm.T, 4)

# ---- attention as linear algebra: the root's example (scores x.w / sqrt 2) ----
sc = W @ x / math.sqrt(2); put("attn_scores", sc); aw = np.exp(sc) / np.exp(sc).sum(); put("attn_weights", aw)

# ---- einsum shapes ----
put("einsum_scores_shape", [2, 8, 128, 128])

# ---- GPT-2 real data, as quoted ----
G = json.load(open(os.path.join(H, "inputs", "gpt2_la.json")))
N["gpt2"] = {"base_loss": round(G["base_loss"], 3), "layer": G["layer"], "tokens": G["tokens"]}
for nm, m in G["mats"].items():
    s_ = np.array(m["s"]); e_ = np.cumsum(s_ ** 2) / (s_ ** 2).sum()
    N["gpt2"][nm] = {"k90": int(np.searchsorted(e_, 0.9) + 1), "k99": int(np.searchsorted(e_, 0.99) + 1),
                     "kappa": float("%.3g" % (s_[0] / s_[-1])), "erank": round(float(m["metrics"]["erank"]), 0),
                     "rand_k90": m["rand_metrics"]["k90"], "loss_k": m["loss_k"],
                     "out_err_k64": m["out_err"][63], "w_err_k64": round(float(np.sqrt(1 - e_[63])), 4)}
N["gpt2"]["whole"] = G["whole"]; N["gpt2"]["head0_qk_rank"] = G["head0_qk_rank_tol"]
N["gpt2"]["emb_cos"] = G["emb_cos"]; N["gpt2"]["emb_rand_cos_mean"] = G["emb_rand_cos_mean"]
N["gpt2"]["lora"] = [{"name": L_["name"], "r": L_["r"],
                      "median_amp": round(float(np.median([x_["q_amplification"] for x_ in L_["layers"]])), 2),
                      "median_rel": round(float(np.median([x_["dW_fro"] / x_["W_fro"] for x_ in L_["layers"]])), 4)} for L_ in G["lora"]]

for i_, L_ in enumerate(G["lora"]):
    fr = [x_["dW_s"][0] ** 2 / sum(v ** 2 for v in x_["dW_s"]) for x_ in L_["layers"]]
    N["gpt2"]["lora"][i_]["median_top1_pct"] = int(round(100 * sorted(fr)[len(fr) // 2]))
    N["gpt2"]["lora"][i_]["amp_range"] = [round(min(x_["q_amplification"] for x_ in L_["layers"]), 2), round(max(x_["q_amplification"] for x_ in L_["layers"]), 2)]
    N["gpt2"]["lora"][i_]["rel_range_pct"] = [round(100 * min(x_["dW_fro"] / x_["W_fro"] for x_ in L_["layers"]), 1), round(100 * max(x_["dW_fro"] / x_["W_fro"] for x_ in L_["layers"]), 1)]
json.dump(N, open(os.path.join(H, "numbers.json"), "w"), indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
for k, v in N.items():
    if k != "gpt2": print(k, v)
print("gpt2", json.dumps(N["gpt2"])[:1500])
