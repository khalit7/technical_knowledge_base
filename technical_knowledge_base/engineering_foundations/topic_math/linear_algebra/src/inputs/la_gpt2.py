# Real-weight linear algebra for the Linear algebra child page (Topic: math).
# GPT-2 small (openai-community/gpt2, snapshot 607a30d783dfa663caf39e06633721c8d4cfcd7e), wikitext-2-raw test text,
# two public GPT-2 LoRA adapters. Writes la_out.json (full) for extraction into src/inputs/.
import os, json, math, time
os.environ["HF_HUB_OFFLINE"] = "1"
import torch, numpy as np
torch.set_num_threads(2)
from transformers import GPT2LMHeadModel, GPT2TokenizerFast
import pyarrow.parquet as pq

T0 = time.time()
def log(*a): print(f"[{time.time()-T0:6.1f}s]", *a, flush=True)
REV = "607a30d783dfa663caf39e06633721c8d4cfcd7e"
tok = GPT2TokenizerFast.from_pretrained("openai-community/gpt2", revision=REV)
model = GPT2LMHeadModel.from_pretrained("openai-community/gpt2", revision=REV, torch_dtype=torch.float32).eval()
log("loaded")

# ---- text: wikitext-2-raw-v1 test split, first lines joined, 2 windows of 1024 tokens ----
pth = [os.path.join(dp, f) for dp, _, fs in os.walk(os.path.expanduser("~/.cache/huggingface/hub/datasets--Salesforce--wikitext")) for f in fs if f == "test-00000-of-00001.parquet" and "wikitext-2-raw-v1" in dp][0]
lines = pq.read_table(pth).column("text").to_pylist()
text = "".join(lines)
ids = tok(text, return_tensors="pt").input_ids[0]
NW, L = 2, 1024
windows = [ids[i * L:(i + 1) * L] for i in range(NW)]
batch = torch.stack(windows)
log("tokens", batch.shape, "first chars:", repr(text[:80]))

def loss_now():
    with torch.no_grad():
        out = model(batch, labels=batch)
    return float(out.loss)

base_loss = loss_now()
log("base loss", base_loss)

LAYER = 5
blk = model.transformer.h[LAYER]
d = 768
# GPT-2 Conv1D: y = x W + b, W stored (in, out)
Wattn = blk.attn.c_attn.weight.detach().double().numpy()  # 768 x 2304
mats = {
    "W_Q": Wattn[:, 0:d], "W_K": Wattn[:, d:2 * d], "W_V": Wattn[:, 2 * d:3 * d],
    "W_O": blk.attn.c_proj.weight.detach().double().numpy(),
    "W_in": blk.mlp.c_fc.weight.detach().double().numpy(),     # 768 x 3072
    "W_out": blk.mlp.c_proj.weight.detach().double().numpy(),  # 3072 x 768
}

# ---- capture real inputs to each matrix at this layer ----
caps = {}
def hook(name):
    def f(mod, inp):
        caps[name] = inp[0].detach().double().reshape(-1, inp[0].shape[-1]).numpy()
    return f
hs = [blk.attn.c_attn.register_forward_pre_hook(hook("attn_in")),
      blk.attn.c_proj.register_forward_pre_hook(hook("o_in")),
      blk.mlp.c_fc.register_forward_pre_hook(hook("fc_in")),
      blk.mlp.c_proj.register_forward_pre_hook(hook("proj_in"))]
loss_now()
for h in hs: h.remove()
inp_of = {"W_Q": "attn_in", "W_K": "attn_in", "W_V": "attn_in", "W_O": "o_in", "W_in": "fc_in", "W_out": "proj_in"}
log("captured", {k: v.shape for k, v in caps.items()})

def metrics(s):
    s = np.asarray(s, float)
    p = s / s.sum()
    p = p[p > 0]
    erank = float(math.exp(-(p * np.log(p)).sum()))
    e = np.cumsum(s ** 2) / (s ** 2).sum()
    k90 = int(np.searchsorted(e, 0.90) + 1)
    k99 = int(np.searchsorted(e, 0.99) + 1)
    return {"sigma_max": float(s[0]), "sigma_min": float(s[-1]), "kappa": float(s[0] / s[-1]),
            "fro": float(np.sqrt((s ** 2).sum())), "nuclear": float(s.sum()),
            "stable_rank": float((s ** 2).sum() / s[0] ** 2), "erank": erank, "k90": k90, "k99": k99, "n": len(s)}

rng = np.random.default_rng(0)
res = {"model": "openai-community/gpt2", "revision": REV, "layer": LAYER, "tokens": int(batch.numel()),
       "text": "wikitext-2-raw-v1 test split, first %d tokens (two windows of %d)" % (batch.numel(), L),
       "base_loss": base_loss, "mats": {}}
KGRID = [1, 2, 4, 8, 16, 32, 64, 96, 128, 192, 256, 384, 512, 640, 768]
svds = {}
for name, W in mats.items():
    U, s, Vt = np.linalg.svd(W, full_matrices=False)
    svds[name] = (U, s, Vt)
    X = caps[inp_of[name]]
    # output error of rank-k truncation on real inputs: ||X(W - W_k)||_F^2 = sum_{i>k} s_i^2 ||X u_i||^2
    a = (s ** 2) * (np.linalg.norm(X @ U, axis=0) ** 2)
    tot = a.sum()
    out_err = np.sqrt(np.maximum(0, tot - np.cumsum(a)) / tot)  # index k-1 -> keep k
    w_err = np.sqrt(np.maximum(0, (s ** 2).sum() - np.cumsum(s ** 2)) / (s ** 2).sum())
    # random Gaussian matrix of the same shape scaled to the same Frobenius norm
    G = rng.standard_normal(W.shape)
    G *= np.linalg.norm(W) / np.linalg.norm(G)
    sg = np.linalg.svd(G, compute_uv=False)
    # random-input baseline: isotropic inputs would make output error = weight error
    res["mats"][name] = {"shape": list(W.shape), "s": [float("%.5g" % v) for v in s],
                         "metrics": metrics(s), "rand_s": [float("%.4g" % v) for v in sg], "rand_metrics": metrics(sg),
                         "out_err": [float("%.4g" % v) for v in out_err], "w_err": [float("%.4g" % v) for v in w_err]}
    log(name, W.shape, res["mats"][name]["metrics"])

# ---- loss when one matrix is replaced by its rank-k truncation ----
def set_attn_part(part_idx, newW):
    w = blk.attn.c_attn.weight.data
    w[:, part_idx * d:(part_idx + 1) * d] = torch.tensor(newW, dtype=torch.float32)
orig = {"c_attn": blk.attn.c_attn.weight.data.clone(), "c_proj": blk.attn.c_proj.weight.data.clone(),
        "c_fc": blk.mlp.c_fc.weight.data.clone(), "mlp_proj": blk.mlp.c_proj.weight.data.clone()}
def restore():
    blk.attn.c_attn.weight.data.copy_(orig["c_attn"]); blk.attn.c_proj.weight.data.copy_(orig["c_proj"])
    blk.mlp.c_fc.weight.data.copy_(orig["c_fc"]); blk.mlp.c_proj.weight.data.copy_(orig["mlp_proj"])
for name in mats:
    U, s, Vt = svds[name]
    curve = []
    for k in KGRID:
        if k > len(s): continue
        Wk = (U[:, :k] * s[:k]) @ Vt[:k]
        if name in ("W_Q", "W_K", "W_V"): set_attn_part(["W_Q", "W_K", "W_V"].index(name), Wk)
        elif name == "W_O": blk.attn.c_proj.weight.data.copy_(torch.tensor(Wk, dtype=torch.float32))
        elif name == "W_in": blk.mlp.c_fc.weight.data.copy_(torch.tensor(Wk, dtype=torch.float32))
        else: blk.mlp.c_proj.weight.data.copy_(torch.tensor(Wk, dtype=torch.float32))
        curve.append([k, round(loss_now(), 4)])
        restore()
    res["mats"][name]["loss_k"] = curve
    log("loss curve", name, curve[:4], curve[-2:])

# ---- whole model: every attention and MLP matrix in all 12 layers truncated to a fraction of its full rank ----
allm = []
for li, b in enumerate(model.transformer.h):
    for mod in (b.attn.c_attn, b.attn.c_proj, b.mlp.c_fc, b.mlp.c_proj):
        W = mod.weight.data.double().numpy().copy()
        pieces = [W[:, i * d:(i + 1) * d] for i in range(3)] if mod is b.attn.c_attn else [W]
        allm.append((mod, mod.weight.data.clone(), [np.linalg.svd(P, full_matrices=False) for P in pieces]))
log("svd all done")
whole = []
for frac in [1.0, 0.9, 0.75, 0.5, 0.25, 0.1]:
    nparam_kept = 0; nparam_full = 0
    for mod, w0, pieces in allm:
        newp = []
        for (U, s, Vt) in pieces:
            k = max(1, int(round(frac * len(s))))
            newp.append((U[:, :k] * s[:k]) @ Vt[:k])
            m, n = U.shape[0], Vt.shape[1]
            nparam_full += m * n; nparam_kept += min(m * n, k * (m + n))
        mod.weight.data.copy_(torch.tensor(np.concatenate(newp, axis=1), dtype=torch.float32))
    whole.append({"frac": frac, "loss": round(loss_now(), 4), "params_lowrank_form": nparam_kept, "params_full": nparam_full})
    for mod, w0, _ in allm: mod.weight.data.copy_(w0)
    log("whole", whole[-1])
res["whole"] = whole
assert abs(loss_now() - base_loss) < 1e-5

# ---- per-head bilinear form W_Q^h W_K^h^T has rank <= 64 ----
U, s, Vt = np.linalg.svd(mats["W_Q"][:, 0:64] @ mats["W_K"][:, 0:64].T)
res["head0_qk_sv"] = [float("%.4g" % v) for v in s[:70]]
res["head0_qk_rank_tol"] = int((s > s[0] * 1e-10).sum())

# ---- embeddings: cosine similarities of real GPT-2 token embeddings ----
E = model.transformer.wte.weight.detach().double().numpy()
words = [" cat", " dog", " sat", " car", " king", " queen", " the", " Paris", " London"]
wid = []
for w in words:
    t = tok(w).input_ids; assert len(t) == 1, (w, t); wid.append(t[0])
V = E[wid]; Vn = V / np.linalg.norm(V, axis=1, keepdims=True)
res["emb_words"] = words
res["emb_cos"] = [[round(float(v), 3) for v in row] for row in Vn @ Vn.T]
res["emb_norm"] = [round(float(v), 3) for v in np.linalg.norm(V, axis=1)]
idx = rng.choice(E.shape[0], size=(20000, 2))
En = E / np.linalg.norm(E, axis=1, keepdims=True)
c = (En[idx[:, 0]] * En[idx[:, 1]]).sum(1)
res["emb_rand_cos_mean"] = round(float(c.mean()), 3)
res["emb_rand_cos_sd"] = round(float(c.std()), 3)
mu = E.mean(0)
res["emb_mean_norm_over_avg_norm"] = round(float(np.linalg.norm(mu) / np.linalg.norm(E, axis=1).mean()), 3)
se = np.linalg.svd(E - 0 * mu, compute_uv=False)
res["wte_s"] = [float("%.4g" % v) for v in se]
res["wte_metrics"] = metrics(se)
res["vocab"] = int(E.shape[0])
log("emb done", res["emb_rand_cos_mean"], res["emb_mean_norm_over_avg_norm"])

# ---- real LoRA adapters ----
def lora(dirn, name):
    cfg = json.load(open(os.path.join(dirn, "adapter_config.json")))
    sd = torch.load(os.path.join(dirn, "adapter_model.bin"), map_location="cpu")
    r, alpha = cfg["r"], cfg["lora_alpha"]; sc = alpha / r
    out = {"name": name, "r": r, "alpha": alpha, "scaling": sc, "target": cfg["target_modules"], "layers": []}
    keys = sorted({k.split(".lora_")[0] for k in sd if "lora_A" in k}, key=lambda k: int(k.split(".h.")[1].split(".")[0]))
    for k in keys:
        A = sd[k + ".lora_A.weight"].double().numpy(); B = sd[k + ".lora_B.weight"].double().numpy()
        li = int(k.split(".h.")[1].split(".")[0])
        dW = sc * (B @ A)  # (out, in) = (2304, 768)
        W = model.transformer.h[li].attn.c_attn.weight.detach().double().numpy().T  # (out, in)
        sd_ = np.linalg.svd(dW, compute_uv=False)
        row = {"layer": li, "A_shape": list(A.shape), "B_shape": list(B.shape), "dW_s": [float("%.4g" % v) for v in sd_[:r + 2]],
               "dW_fro": float(np.linalg.norm(dW)), "W_fro": float(np.linalg.norm(W))}
        # LoRA paper section 7.3 / H.4 on the query block: ||U^T W_q V^T||_F with U, V top-r singular directions of dW_q
        dq, Wq = dW[0:d], W[0:d]
        Uq, sq, Vqt = np.linalg.svd(dq)
        Ur, Vr = Uq[:, :r], Vqt[:r]
        proj = np.linalg.norm(Ur.T @ Wq @ Vr.T)
        Uw, sw, Vwt = np.linalg.svd(Wq)
        projW = np.linalg.norm(Uw[:, :r].T @ Wq @ Vwt[:r].T)
        Qa, _ = np.linalg.qr(rng.standard_normal((d, r))); Qb, _ = np.linalg.qr(rng.standard_normal((d, r)))
        projR = np.linalg.norm(Qa.T @ Wq @ Qb)
        row.update({"q_dW_fro": float(np.linalg.norm(dq)), "q_proj_dW": float(proj), "q_proj_W": float(projW), "q_proj_rand": float(projR),
                    "q_amplification": float(np.linalg.norm(dq) / proj), "q_s": [float("%.4g" % v) for v in sq[:r + 2]]})
        out["layers"].append(row)
    return out
S = os.path.dirname(os.path.abspath(__file__))
res["lora"] = [lora(os.path.join(S, "lora_alpaca"), "monsterapi/gpt2_alpaca-lora"), lora(os.path.join(S, "lora_guanaco"), "harigovind511/GPT2-Guanaco-LoRA")]
for L_ in res["lora"]:
    log(L_["name"], [(r["layer"], round(r["dW_fro"] / r["W_fro"], 4), round(r["q_amplification"], 2)) for r in L_["layers"]][:12])
json.dump(res, open(os.path.join(S, "la_out.json"), "w"))
log("done")
