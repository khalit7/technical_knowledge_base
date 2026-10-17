"""Build the page data (parts/20_js_ev_0data.js and out/page_data.json) from the recorded outputs, CPU only.

    python -I make_data.py
Reads out/{gen,metrics,feats_inception,sd_gen,clipscore,vqa}.json, the root's src/data/smoke/fid_floor.json, and for
images and the PCA picture GM_SCRATCH/ev/{sets.npz,feat_inception.npz,sd/*.png}. Every number the prose quotes is
formatted here into EV.txt (keys are the data-ev attributes found in parts/*.html), so the page and the data agree
by construction; check_data.py proves the built page embeds exactly this.
"""
import base64, glob, io, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ev_env import ev_scratch, OUT, HERE, SETS
import numpy as np
from PIL import Image

PARTS = os.path.join(HERE, "..", "parts")
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
J = lambda n: json.load(open(os.path.join(OUT, n)))
gen, met, fi, sdg, cs, vqa = (J(n) for n in ("gen.json", "metrics.json", "feats_inception.json", "sd_gen.json", "clipscore.json", "vqa.json"))
floor = json.load(open(os.path.join(ROOT_SRC, "data", "smoke", "fid_floor.json")))
sets = dict(np.load(ev_scratch("sets.npz")))
NS = met["ns"]


def png(a, scale=1, mode="L"):
    im = Image.fromarray(a, mode)
    if scale != 1:
        im = im.resize((a.shape[1] * scale, a.shape[0] * scale), Image.NEAREST)
    b = io.BytesIO(); im.save(b, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def webp(im, size, q=72):
    im = im.copy(); im.thumbnail((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def mean(a):
    return float(np.mean(a))


def f(v, dp):
    return f"{v:,.{dp}f}"


META = {  # label, short, colour, is a model set
    "real": ("Real training images (the floor)", "real", "var(--ink)", False),
    "ddpm": ("DDPM, 250 steps", "DDPM 250", "var(--c1)", True),
    "ddim": ("DDIM, 10 steps", "DDIM 10", "var(--c6)", True),
    "flow": ("Flow matching, no guidance", "flow s=1", "var(--c3)", True),
    "flow_g15": ("Flow matching, guidance 1.5", "flow s=1.5", "var(--c5)", True),
    "flow_g4": ("Flow matching, guidance 4", "flow s=4", "var(--c4)", True),
    "vae": ("VAE prior samples", "VAE", "var(--c2)", True),
    "half": ("Half the classes (constructed)", "half", "#c9508a", False),
}
LAB = {"ddpm": "22.6 (Diffusion from zero, DDPM 250)", "flow": "48.9 (Flow lab, Euler 50)", "flow_g15": "23.8 (Flow lab, s = 1.5)",
       "vae": "689 (Latent lab)", "ddim": "76.0 (Diffusion from zero, DDIM 10)", "real": "18.9 (1,000 real validation images: the classifier was trained on the training split, so training images score lower)"}


def strip(a, rows=1):
    if rows == 1:
        return np.concatenate(list(a[:10]), axis=1)
    return np.concatenate([np.concatenate(list(a[r * 10:(r + 1) * 10]), axis=1) for r in range(rows)], axis=0)


def firsts(k, rows=1):
    a = sets[k]
    if k in ("vae", "half", "real"):
        return a[:10 * rows]
    return np.stack([a[c * 1000 + r] for r in range(rows) for c in range(10)])


EV = {"ns": NS, "sets": [], "m": {}, "pr": {}, "notes": {}, "txt": {}}
for k in SETS:
    lab, short, colr, model = META[k]
    g = gen["sets"][k]
    EV["sets"].append({"k": k, "label": lab, "short": short, "color": colr, "model": model, "what": SETS[k],
                       "strip": png(strip(firsts(k))), "strip3": png(strip(firsts(k, 3), 3)),  # scale 1: the page enlarges with image-rendering: pixelated
                       "sec": g.get("seconds"), "fd1k": g["fd_fmnist_1000"], "lab": LAB.get(k, "")})
    mm = met["metrics"][k]
    EV["m"][k] = {m: mm[m] for m in ("fid", "kid", "kid_sd", "cmmd", "fd_dino", "fd_clf")}
    EV["pr"][k] = mm["pr"]
from common import load_split
xte, yte = load_split("test")
EV["ref_strip"] = png(strip(np.stack([xte[np.where(yte == c)[0][0]] for c in range(10)])))

# PCA of the real (test) Inception features, for the FID animation
F = dict(np.load(ev_scratch("feat_inception.npz")))
X = F["test"].astype(np.float64); mu0 = X.mean(0)
U, S, Vt = np.linalg.svd(X - mu0, full_matrices=False)
V2 = Vt[:2].T
rng = np.random.default_rng(0); pick = rng.choice(10000, 300, replace=False)
EV["pca"] = {"var_pct": f"{100 * (S[:2] ** 2).sum() / (S ** 2).sum():.0f}%", "pts": {}, "stats": {}}
for k in ["test"] + list(SETS):
    Z = (F[k].astype(np.float64) - mu0) @ V2
    EV["pca"]["pts"][k] = np.round(Z[pick], 2).tolist()
    EV["pca"]["stats"][k] = {"mu": np.round(Z.mean(0), 3).tolist(), "cov": np.round(np.cov(Z, rowvar=False), 3).tolist()}
# full-dimensional decomposition at 10,000
from scipy import linalg
Sr = np.cov(X, rowvar=False)
EV["dec"] = {}
for k in SETS:
    G = F[k].astype(np.float64); d = G.mean(0) - mu0; Sg = np.cov(G, rowvar=False)
    tr = float(np.trace(Sr) + np.trace(Sg) - 2 * np.trace(linalg.sqrtm(Sr @ Sg).real))
    EV["dec"][k] = {"mean": round(float(d @ d), 3), "cov": round(tr, 3)}
# FID_N = FID_inf + K / N fit (least squares on the per-N means)
EV["fit"] = {}
for k in SETS:
    use = [i for i, n in enumerate(NS) if n >= 1000]               # below 1,000 the curve bends (1/N^2 terms)
    y = np.array([mean(EV["m"][k]["fid"][i]) for i in use]); x = 1 / np.array([NS[i] for i in use], float)
    K, inf = np.polyfit(x, y, 1)
    EV["fit"][k] = {"inf": round(float(inf), 3), "K": round(float(K), 1)}

# JPEG and resize pictures (4 real images: classes 0, 1, 8, 9) and the per-pixel change over all 10,000
import io as _io
def jpeg(a, q):
    b = _io.BytesIO(); Image.fromarray(a, "L").save(b, "JPEG", quality=q); b.seek(0); return np.asarray(Image.open(b).convert("L"))
real = sets["real"]; ytr = load_split("train")[1][:10000]
idx = [int(np.where(ytr == c)[0][0]) for c in (0, 1, 8, 9)]
JP = {"orig": [png(real[i]) for i in idx], "mad": {}, "psnr": {}}
for q in (90, 75, 50):
    jj = np.stack([jpeg(a, q) for a in real])
    diff = np.abs(jj.astype(int) - real.astype(int))
    JP["mad"][str(q)] = round(float(diff.mean()), 3)
    mse = ((jj.astype(float) - real) ** 2).reshape(len(real), -1).mean(1)
    JP["psnr"][str(q)] = round(float(np.mean(10 * np.log10(255 ** 2 / np.maximum(mse, 1e-10)))), 2)
    JP[f"q{q}"] = [png(jpeg(real[i], q)) for i in idx]
    JP[f"d{q}"] = [png(np.clip(np.abs(jpeg(real[i], q).astype(int) - real[i].astype(int)) * 8, 0, 255).astype(np.uint8)) for i in idx]
    JP[f"q{q}_one"] = png(jpeg(real[idx[0]], q), 4); JP[f"d{q}_one"] = png(np.clip(np.abs(jpeg(real[idx[0]], q).astype(int) - real[idx[0]].astype(int)) * 8, 0, 255).astype(np.uint8), 4)
JP["orig_one"] = png(real[idx[0]], 4)
import torch
from torch_fidelity.interpolate_compat_tensorflow import interpolate_bilinear_2d_like_tensorflow1x
x = torch.from_numpy(real[idx[0]]).float()[None, None]
up = interpolate_bilinear_2d_like_tensorflow1x(x, size=(299, 299), align_corners=False)[0, 0].round().clamp(0, 255).byte().numpy()
JP["up_ext"] = png(up)
JP["up_bic"] = png(np.asarray(Image.fromarray(real[idx[0]]).resize((299, 299), Image.BICUBIC)))
JP["up_near"] = png(np.asarray(Image.fromarray(real[idx[0]]).resize((299, 299), Image.NEAREST)))
EV["jpeg"] = JP
EV["pit"] = met["pitfalls"]

# Stable Diffusion: thumbnails and scores
SHORT = {"g01": "bicycle", "g02": "oranges", "g03": "lighthouse", "g04": "puppy", "g05": "stop sign", "g06": "astronaut + horse",
         "x07": "HELLO mug", "x08": "2 cats, 3 dogs"}
Q = json.load(open(os.path.join(HERE, "..", "inputs", "vqa_questions.json")))
sd = {"prompts": sdg["prompts"], "short": SHORT, "scales": [f"{s:g}" for s in sdg["scales"]], "qs": Q["questions"], "img": {}, "avg": {}}
for r in sdg["images"]:
    n = r["name"]; c = cs["images"][n]; v = vqa["images"][n]
    im = Image.open(ev_scratch("sd", n + ".png")).convert("RGB")
    sd["img"][n] = {"u": webp(im, 136, 66), "cs": c["cs"], "cl": c["cl"], "vq": v["whole"]["p_yes"], "tf": v["tifa_lite"],
                    "el": [e["p_yes"] for e in v["elements"]], "sec": r["seconds"]}
for s in sd["scales"]:
    rows = [sd["img"][r["name"]] for r in sdg["images"] if f"{r['scale']:g}" == s]
    sd["avg"][s] = {k: round(mean([x[k] for x in rows]), 4) for k in ("cs", "cl", "vq", "tf", "sec")}
EV["sd"] = sd

EV["notes"] = {
    "fid": "Inception-v3 pool features, Fr&eacute;chet distance. Biased upward at small N; the real set is the floor at each N.",
    "kid": "Inception features, cubic-kernel MMD&sup2;, unbiased (diagonal dropped), 100 subsets of min(1,000, N). The real set sits near 0 at every N; the range bars show the draws.",
    "fd_dino": "DINOv2 ViT-B/14 [CLS] features (768-d), Fr&eacute;chet distance. A different scale from FID; biased in N like FID.",
    "cmmd": "CLIP ViT-B/32 embeddings (the paper uses ViT-L/14 at 336 px; see the Reading tab's check), L2-normalised, Gaussian kernel &sigma; = 10, x 1,000, the official code's biased estimator.",
    "fd_clf": "The topic's Fashion-MNIST classifier (128-d features), the labs' fd_fmnist. Domain-specific: it knows what a shirt is. It was trained on the training split, which flatters the real set (training images) here."}
# ---------------- prose numbers (EV.txt) ----------------
M = met["metrics"]; P = met["pitfalls"]; C = met["checks"]
DP = {"fid": 2, "kid": 2, "cmmd": 4, "fd_dino": 1, "fd_clf": 1}
def mv(k, m, n):
    return mean(M[k][m][NS.index(n)])
T = {}
fl = floor["floor_by_N"]
T["floor:10000"] = f(fl["10000"][0], 2); T["floor:1000"] = f(mean(fl["1000"]), 1)
T["chk:fid_fast"] = f"{abs(C['fid_fast_vs_scipy_vae_1000'][0] - C['fid_fast_vs_scipy_vae_1000'][1]):.0e} (the 1,000 VAE samples: {C['fid_fast_vs_scipy_vae_1000'][0]:.5f} against {C['fid_fast_vs_scipy_vae_1000'][1]:.5f})"
dc = J("feats_dino.json")["check_cos_to_ve_cls_test"]
T["chk:dino_cos"] = f"{dc['min']:.4f} at worst over the 10,000 images"
T["inf:real"] = f(EV["fit"]["real"]["inf"], 2)
for k in ("real", "ddpm", "ddim", "flow", "flow_g15", "flow_g4", "vae", "half"):
    for m in DP:
        for n in NS:
            T[f"m:{k}:{m}:{n}"] = f(mv(k, m, n), DP[m] if not (m == "fid" and n < 10000 and k == "real") else 1)
for k, v in P.items():
    T[f"pit:{k}"] = f(v["fid"], 2)
md = {k: mv(k, "fid", 10000) for k in SETS}
T["txt:half_vs_vae"] = (f"The half set wins by a wide margin. Its decomposition: mean term {EV['dec']['half']['mean']:.1f} and covariance term {EV['dec']['half']['cov']:.1f}; "
                        f"the VAE's: {EV['dec']['vae']['mean']:.1f} and {EV['dec']['vae']['cov']:.1f}.")
def order(m, n, ks=("ddpm", "ddim", "flow", "flow_g15", "flow_g4", "vae")):
    return sorted(ks, key=lambda k: mv(k, m, n))
SH = {k: META[k][1] for k in SETS}
ordn = lambda i: {1: "1st", 2: "2nd", 3: "3rd"}.get(i, f"{i}th")
fl_ = EV["fit"]
T["txt:bias_rank"] = (f"Every model's curve has the same shape: DDPM goes from {f(mv('ddpm','fid',250),1)} at 250 to {f(mv('ddpm','fid',10000),1)} at 10,000 "
    f"(FID<sub>&infin;</sub> {f(fl_['ddpm']['inf'],1)}), the VAE from {f(mv('vae','fid',250),1)} to {f(mv('vae','fid',10000),1)}. "
    f"At 250 samples the real data (FID {f(mv('real','fid',250),1)}) scores worse than DDPM does at 1,000 ({f(mv('ddpm','fid',1000),1)}): a careless comparison across N can rank real data below a model. "
    f"The slopes differ (K from {f(min(v['K'] for v in fl_.values()),0)} to {f(max(v['K'] for v in fl_.values()),0)}), so the gap between two models depends on N too: DDPM against DDIM is {f(mv('ddim','fid',250)-mv('ddpm','fid',250),1)} at 250 and {f(mv('ddim','fid',10000)-mv('ddpm','fid',10000),1)} at 10,000.")
T["txt:kid_floor"] = (f"The real set's KID is {f(mv('real','kid',250),2)} at 250 and {f(mv('real','kid',10000),2)} at 10,000: zero within noise at every N, where its FID falls from {f(mv('real','fid',250),1)} to {f(mv('real','fid',10000),2)}. "
    f"DDPM's KID is {f(mv('ddpm','kid',250),2)} at 250 and {f(mv('ddpm','kid',10000),2)} at 10,000: the same value, so small-N KIDs can be compared with large-N ones. "
    f"Check against torch-fidelity's own KID on 2,000 random DDIM samples: {C['kid_torch_fidelity_ddim_2000']['kernel_inception_distance_mean']*1000:.2f} (x 1,000), this page's {f(mv('ddim','kid',2000),2)} (different random subsets).")
T["txt:kid_sorted"] = (f"This page's first KID cross-check passed torch-fidelity the first 2,000 DDIM samples. The sets are stored 1,000 per class in class order, so those were T-shirts and trousers only: KID x 1,000 came out "
    f"{C['kid_torch_fidelity_ddim_first2000_two_classes']['kernel_inception_distance_mean']*1000:.1f} instead of {C['kid_torch_fidelity_ddim_2000']['kernel_inception_distance_mean']*1000:.2f} for a random 2,000. Shuffle before taking a subset.")
pr = {k: M[k]["pr"]["inception_10000"] for k in SETS}
T["txt:pr_read"] = (f"The real set scores precision {pr['real'][0]:.2f} and recall {pr['real'][1]:.2f}: with k = 3 even real data is not at 1.00, so read each model against it. "
    f"The half set keeps real-level precision ({pr['half'][0]:.2f}) and loses recall ({pr['half'][1]:.2f}); strong guidance (flow s = 4) has precision {pr['flow_g4'][0]:.2f} and recall {pr['flow_g4'][1]:.2f} against {pr['flow'][0]:.2f} and {pr['flow'][1]:.2f} without guidance; "
    f"the VAE is low on both ({pr['vae'][0]:.2f}, {pr['vae'][1]:.2f}).")
T["txt:dino_read"] = (f"The real floor here is {f(mv('real','fd_dino',10000),1)} at 10,000 and {f(mv('real','fd_dino',250),0)} at 250: DINOv2's 768 features carry a large small-N bias too. "
    f"Its order of the six models: {', '.join(SH[k] for k in order('fd_dino',10000))}; Inception's: {', '.join(SH[k] for k in order('fid',10000))}. "
    f"The visible change: DINOv2 puts DDIM with 10 steps ({f(mv('ddim','fd_dino',10000),0)}) behind flow with s = 1.5 ({f(mv('flow_g15','fd_dino',10000),0)}), where Inception has DDIM second.")
cl = C["cmmd_vs_linear_approx_10000"]
T["txt:cmmd_lin"] = "; ".join(f"{SH[k]} CMMD {v['cmmd']:.4f} against 10 &middot; &#8214;&Delta;&mu;&#8214;&sup2; = {v['10_x_mean_gap_sq']:.4f}" for k, v in cl.items())
LB = C["cmmd_L14_vs_B32_1000"]
oL = sorted([k for k in LB if k not in ("real", "half")], key=lambda k: LB[k]["L14_336"]); oB = sorted(oL, key=lambda k: LB[k]["B32"])
T["txt:cmmd_L_vs_B"] = (f"L/14-336 orders the five model sets {', '.join(SH[k] for k in oL)}; B/32 orders them {', '.join(SH[k] for k in oB)}"
    + (" (the same order)" if oL == oB else "") + f". Values differ in scale (VAE {LB['vae']['L14_336']:.2f} against {LB['vae']['B32']:.2f}; DDPM {LB['ddpm']['L14_336']:.3f} against {LB['ddpm']['B32']:.3f}), so B/32 numbers are not CMMD numbers to quote, only a ranking.")
oF = order("fid", 10000); oC = order("cmmd", 10000); oK = order("fd_clf", 10000)
T["txt:rank_read"] = (f"FID, KID and the others agree on the ends (DDPM best, the VAE worst) and disagree in the middle. DDIM with 10 steps is second by FID ({f(md['ddim'],1)}) and KID, but {ordn(oC.index('ddim')+1)} by CMMD and {ordn(oK.index('ddim')+1)} by the classifier FD; "
    f"strong guidance (flow s = 4) is {ordn(oF.index('flow_g4')+1)} by FID and {ordn(oC.index('flow_g4')+1)} by CMMD. "
    f"Different features see different failures: the classifier knows what each garment should look like, CLIP (with the code's kernel) compares averages, Inception sees through ImageNet classes. A claim that model A beats model B is only as strong as the agreement between metrics with different features.")
def rk(m, k): return order(m, 10000).index(k) + 1
T["txt:guid_read"] = (f"Precision rises from {pr['flow'][0]:.2f} to {pr['flow_g4'][0]:.2f} and recall falls from {pr['flow'][1]:.2f} to {pr['flow_g4'][1]:.2f}. The distances split: FID gets worse ({f(md['flow'],1)} to {f(md['flow_g4'],1)}), so do FD-DINOv2 ({f(mv('flow','fd_dino',10000),0)} to {f(mv('flow_g4','fd_dino',10000),0)}) and the classifier FD ({f(mv('flow','fd_clf',10000),1)} to {f(mv('flow_g4','fd_clf',10000),1)}), KID barely moves ({f(mv('flow','kid',10000),2)} to {f(mv('flow_g4','kid',10000),2)}), and CMMD gets better ({f(mv('flow','cmmd',10000),3)} to {f(mv('flow_g4','cmmd',10000),3)}): sharper average images move CLIP's mean embedding closer to the real one even as variety collapses.")
T["txt:jpeg_models"] = (f"DDPM scores {f(P['ddpm']['fid'],2)} as PNG, {f(P['ddpm_jpeg75']['fid'],2)} with its samples saved as JPEG 75, {f(P['ddpm_vs_test_jpeg75']['fid'],2)} if only the reference is compressed, and {f(P['ddpm_jpeg75_vs_test_jpeg75']['fid'],2)} with both compressed, lower than its PNG score. "
    f"The flow model: {f(P['flow']['fid'],2)}, {f(P['flow_jpeg75']['fid'],2)}, {f(P['flow_vs_test_jpeg75']['fid'],2)} and {f(P['flow_jpeg75_vs_test_jpeg75']['fid'],2)}. Compression is not neutral: it erases fine detail the model got wrong as well as detail it got right. Other features notice JPEG too: the JPEG-75 real set's FD-DINOv2 is {f(P['real_jpeg75']['fd_dino'],1)} (floor {f(P['real']['fd_dino'],1)}) and its CMMD {P['real_jpeg75']['cmmd']:.3f} (floor {P['real']['cmmd']:.4f}), worse than the flow model's {f(mv('flow','cmmd',10000),3)}.")
T["txt:jpeg_models_tab"] = ("Model samples, compressed or not, against a reference compressed or not. With both sides compressed the models score lower (better) than as PNG: "
    f"DDPM {f(P['ddpm']['fid'],2)} to {f(P['ddpm_jpeg75_vs_test_jpeg75']['fid'],2)}, flow {f(P['flow']['fid'],2)} to {f(P['flow_jpeg75_vs_test_jpeg75']['fid'],2)}. The clean-fid paper saw the same direction on LSUN Church.")
A = sd["avg"]
T["txt:sd_read"] = (f"Averaged over the 16 prompt-seed pairs, CLIPScore rises from {A['1']['cs']:.3f} without guidance to {A['3']['cs']:.3f} at s = 3 and {A['7.5']['cs']:.3f} at 7.5, then {A['12']['cs']:.3f} at 12; "
    f"the VQA P(yes) from {A['1']['vq']:.2f} to {A['7.5']['vq']:.2f}, the element questions answered yes from {100*A['1']['tf']:.0f}% to {100*A['7.5']['tf']:.0f}%. Without guidance (s = 1, the plain conditional model) several images barely follow the prompt: no stop sign, no lighthouse on a cliff, a distorted puppy (thumbnails above). "
    f"Guidance costs time: {A['1']['sec']:.1f} s per image at s = 1 (one U-Net pass per step) against {A['7.5']['sec']:.1f} s with guidance (two). "
    f"Past s = 3 the averages flatten, while the thumbnails get more saturated, which none of these scores penalises. The VLM has its own errors: it answers yes to \"Does the mug say HELLO?\" for a mug lettered HELLLO (seed 0, s = 12) and for a plain mug with the word on a card beside it (seed 1, s = 7.5), so a VQA-based score is only as good as its VLM.")
g = sd["img"]
T["txt:horse"] = (f"The question, directly: on seed 0 at s = 7.5 (an astronaut, no horse) SmolVLM gives P(yes) {g['g06_s0_g7.5']['el'][1]:.4f} to \"Is there a horse?\" and {g['g06_s0_g7.5']['vq']:.3f} to the whole prompt; on seed 1 at s = 7.5, which does draw the horse, {g['g06_s1_g7.5']['el'][1]:.3f} and {g['g06_s1_g7.5']['vq']:.3f}. "
    f"CLIPScore does move ({g['g06_s0_g7.5']['cs']:.3f} without the horse, {g['g06_s1_g7.5']['cs']:.3f} with it), but {g['g06_s0_g7.5']['cs']:.3f} is an ordinary value for a correct image of another prompt (the bicycle without guidance scores {g['g01_s0_g1']['cs']:.3f}), so no threshold on it says \"the horse is missing\". A per-element question says what failed; a similarity only says less similar.")
c0 = cs["images"]["g04_s0_g7.5"]
T["txt:clip_conv"] = f"{c0['cs']:.3f} as Hessel's CLIP-S, {c0['cs_pre']:.3f} with the \"A photo depicts\" prefix, and {100*c0['cl']:.1f} as 100 &middot; cos with CLIP L/14-336 (the puppy, seed 0, s = 7.5)"
# reading time: words in the Reading parts / 220 per minute
words = 0
for fn in sorted(glob.glob(os.path.join(PARTS, "20_read_*.html"))):
    words += len(re.sub(r"<[^>]+>", " ", re.sub(r"<style>.*?</style>", " ", open(fn).read(), flags=re.S)).split())
rp = os.path.join(OUT, "reading.json")             # rendered word count written by check_page.mjs (includes generated text)
if os.path.exists(rp):
    words = json.load(open(rp))["words_rendered"]
T["rt"] = str(round(words / 220))
EV["txt"] = T
need = set()
for fn in glob.glob(os.path.join(PARTS, "*.html")):
    need |= set(re.findall(r'data-ev="([^"]+)"', open(fn).read()))
for fn in glob.glob(os.path.join(PARTS, "*.js")):
    if not fn.endswith("0data.js"):
        need |= set(re.findall(r"txt\['([^']+)'\]", open(fn).read()))
missing = sorted(need - set(T))
assert not missing, missing
for k in list(T):                       # keep only what the page uses
    if k not in need:
        del T[k]
js = "window.EV=" + json.dumps(EV, separators=(",", ":")) + ";\n"
open(os.path.join(PARTS, "20_js_ev_0data.js"), "w").write(js)
json.dump(EV, open(os.path.join(OUT, "page_data.json"), "w"), separators=(",", ":"))
print("wrote 20_js_ev_0data.js", len(js), "bytes;", len(T), "text keys")
