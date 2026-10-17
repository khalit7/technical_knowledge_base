"""Build parts/22_js_fm_0data.js (window.FMD) and out/page_data.json from the recorded outputs (CPU, seconds).

Inputs: out/*.json and out/*.npz here (this page's runs), the root Flow lab's and Diffusion lab's recorded outputs
(read only), inputs/*.json. Everything the page shows as a measured number or image comes from here.
Run: python -I make_page_data.py  (the shared venv: numpy, Pillow)
"""
import base64, io, json, os, re

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ROOT = os.path.join(HERE, "..", "..", "src")
J = lambda p: json.load(open(p))

toy = J(os.path.join(OUT, "toy.json"))
root_toy = J(os.path.join(ROOT, "flow", "out", "toy2d.json"))
memo = J(os.path.join(OUT, "memo.json"))
oti = J(os.path.join(OUT, "ot_images.json"))
fm = J(os.path.join(ROOT, "flow", "out", "samples_fm_4000.json"))
rf = J(os.path.join(ROOT, "flow", "out", "samples_reflow_2000.json"))
df = J(os.path.join(ROOT, "diff", "out", "samples_eps.json"))
tr_fm = J(os.path.join(ROOT, "flow", "out", "train_fm_4000.json"))
new = J(os.path.join(OUT, "samples_new.json")) if os.path.exists(os.path.join(OUT, "samples_new.json")) else {"models": {}}
sched = J(os.path.join(HERE, "inputs", "scheduler_configs.json"))
trains = {n: J(os.path.join(OUT, f"train_{n}.json")) for n in ["rf3_2000", "rf1d_1500", "rf2d_1500"] if os.path.exists(os.path.join(OUT, f"train_{n}.json"))}
pairs = {n: J(os.path.join(OUT, f"{n}.json")) for n in ["pairs_rf1", "pairs_rf2"] if os.path.exists(os.path.join(OUT, f"{n}.json"))}

D = {"date": "2026-10-17"}

# ------------------------------------------------------------------ toy
D["nets"] = {"rf1": root_toy["nets"]["cfm"], "rf2": root_toy["nets"]["reflow"], **toy["nets"]}
ex = toy["exact"]
D["exact"] = {k: {"straightness": v["straightness"], "ref": v["ref"],
                  "euler": [[r["steps"], r["on_mode"], r["w2"]] for r in v["euler"]],
                  "ddim": [[r["steps"], r["on_mode"], r["w2"]] for r in v["ddim"]]} for k, v in ex["paths"].items()}
D["ddim_equiv"] = ex["ddim_equiv"]
D["floor"] = {"t": [r["t"] for r in toy["floor"]["by_t"]], "total": [r["total"] for r in toy["floor"]["by_t"]],
              "floor": [r["floor"] for r in toy["floor"]["by_t"]],
              "learned": [r["mse_vs_exact"] for r in toy["floor"]["learned_cfm"]]}
D["sde"] = [[r["eps"], r["steps"], r["on_mode"], r["w2"]] for r in toy["sde"]]
D["rounds"] = {k: {"straightness": v["straightness"], "ref": v["ref"], "pair_cost": v["pair_cost"],
                   "euler": [[r["steps"], r["on_mode"], r["w2"]] for r in v["euler"]]} for k, v in toy["rounds"].items()}
D["distill"] = {k: v["one_step"] for k, v in toy["distill"].items()}
D["ot"] = {"cost2d": [[r["B"], r["cost"]] for r in toy["ot"]["cost"]], "indep2d": toy["indep_pair_cost"],
           "trained": {k: {"straightness": v["straightness"], "ref": v["ref"], "euler": [[r["steps"], r["on_mode"], r["w2"]] for r in v["euler"]]}
                       for k, v in toy["ot"]["trained"].items()},
           "costimg": [[r["B"], r["cost_per_pixel"]] for r in oti["minibatch"]],
           "pairimg": {k: oti[k] for k in ["pairs_rf1", "pairs_rf2"] if k in oti}}
runs = toy["tsched"]["runs"]
ts = {}
for b in [2000, 12000]:
    for s in toy["tsched"]["hist"]:
        rr = [r for r in runs if r["budget"] == b and r["scheme"] == s]
        ts[f"{b}|{s}"] = {"err": [round(float(v), 4) for v in np.mean([r["err_by_t"] for r in rr], 0)],
                          "e4_on": round(float(np.mean([r["e4"]["on_mode"] for r in rr])), 4),
                          "e64_w2": round(float(np.mean([r["e64"]["w2"] for r in rr])), 4),
                          "e64_w2_sd": round(float(np.std([r["e64"]["w2"] for r in rr])), 4),
                          "e64_on": round(float(np.mean([r["e64"]["on_mode"] for r in rr])), 4),
                          "seeds": len(rr)}
D["tsched"] = {"t": toy["tsched"]["t_eval"], "hist": toy["tsched"]["hist"], "runs": ts}

# ------------------------------------------------------------------ images: scores
def rows(sam, key="solver"):
    return [[r.get(key), r["steps"], r.get("nfe", r["steps"]), r["fd"], r["acc"], r["div"]] for r in sam]
D["img"] = {"floor_fd": fm["floor_fd"], "real_div": fm["real_div"],
            "fm": rows(fm["samplers"]), "rf2": rows(rf["samplers"]), "diff": rows(df["samplers"], "sampler"),
            "fm_straight": fm["straightness"], "rf2_straight": rf["straightness"],
            "new": new["models"], "trains": {k: {"seconds": v["seconds"], "steps": v["config"]["steps"], "peak": v.get("peak_mps_mb")} for k, v in trains.items()},
            "pairs": pairs, "fm_train_s": tr_fm["seconds"]}
D["memo"] = memo
D["sd3"] = J(os.path.join(HERE, "inputs", "sd3_tables.json"))
D["img"]["sde"] = new.get("sde_fm_4000", [])
D["img"]["sde_decay"] = new.get("sde_decay_fm_4000", [])
src = open(os.path.join(HERE, "runs", "fm_toy.py")).read()
D["code"] = {"exact": src[src.index("def coef("):src.index("def grid(")].rstrip() + "\n"}
sdm = J(os.path.join(OUT, "sched_demo.json"))
pl = sdm["printed"]
D["sched_demo"] = pl[pl.index("1024 px"):].rstrip() + "\n"

# ------------------------------------------------------------------ production configs
D["sched"] = {r: {"sha": v["sha"][:12], **{k: v["config"].get(k) for k in ["_class_name", "shift", "use_dynamic_shifting", "base_shift", "max_shift",
                                                                           "base_image_seq_len", "max_image_seq_len", "shift_terminal", "flow_shift",
                                                                           "prediction_type", "time_shift_type"]}}
              for r, v in sched["configs"].items()}

# ------------------------------------------------------------------ sprite sheet of 28x28 tiles, runs of 10 (one per class unless noted)
tiles, sheet = {}, []
def add(key, arr):
    arr = np.asarray(arr)
    assert arr.ndim == 3 and arr.shape[1:] == (28, 28), (key, arr.shape)
    tiles[key] = sum(len(a) for a in sheet); sheet.append(arr.astype(np.uint8))
S_fm = np.load(os.path.join(ROOT, "flow", "out", "strips_fm_4000.npz"))
S_rf = np.load(os.path.join(ROOT, "flow", "out", "strips_reflow_2000.npz"))
S_df = np.load(os.path.join(ROOT, "diff", "out", "strips_eps.npz"))
for n in [1, 2, 4, 10, 20, 50]:
    add(f"fm_e{n}", S_fm[f"euler_{n}"]); add(f"rf2_e{n}", S_rf[f"euler_{n}"])
for n in [1, 2, 5, 10, 25]:
    add(f"fm_m{n}", S_fm[f"midpoint_{n}"])
for n in [1, 4, 10, 20, 50]:
    add(f"ddpm_{n}", S_df[f"ddpm_{n}"]); add(f"ddim_{n}", S_df[f"ddim_{n}"]); add(f"dpm_{n}", S_df[f"dpm_{n}"])
add("ddim_2", S_fm["ddim_2"])
if os.path.exists(os.path.join(OUT, "strips_new.npz")):
    S_new = np.load(os.path.join(OUT, "strips_new.npz"))
    for k in S_new.files:
        m = re.match(r"(rf3_2000|rf1d_1500|rf2d_1500|reflow_2000)_(\d+)", k)
        if m and m.group(1) != "reflow_2000":
            add({"rf3_2000": "rf3", "rf1d_1500": "rf1d", "rf2d_1500": "rf2d"}[m.group(1)] + f"_e{m.group(2)}", S_new[k])
        if k.startswith("sde_"):
            add(k.replace(".", "p"), S_new[k])
S_memo = np.load(os.path.join(OUT, "memo_strips.npz"))
for k in S_memo.files:
    add("memo_" + k, S_memo[k])
allt = np.concatenate(sheet)
cols = 10
nrow = (len(allt) + cols - 1) // cols
img = np.zeros((nrow * 28, cols * 28), np.uint8)
for i, t in enumerate(allt):
    img[(i // cols) * 28:(i // cols + 1) * 28, (i % cols) * 28:(i % cols + 1) * 28] = t
buf = io.BytesIO(); Image.fromarray(img, "L").save(buf, "WEBP", lossless=True, method=6)
D["sheet"] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
D["tiles"] = tiles; D["cols"] = cols
print("sheet", img.shape, len(buf.getvalue()) // 1024, "KB,", len(allt), "tiles")

# ------------------------------------------------------------------ facts used in the prose (data-fmf="key")
f = {}
def pct(v): return f"{100 * v:.0f}%" if v >= 0.1 or v == 0 else f"{100 * v:.1f}%"
F = toy["floor"]
f["floor_mean"] = f'{F["uniform_mean_per_coord"]:.2f}'
f["root_loss"] = f'{F["root_cfm_log_last20_mean"]:.2f}'
f["floor_share"] = pct(F["uniform_mean_per_coord"] / F["root_cfm_log_last20_mean"])
lc = {r["t"]: r["mse_vs_exact"] for r in F["learned_cfm"]}
f["learned_t01"] = f'{lc[0.1]:.3f}'; f["learned_t1"] = f'{lc[1.0]:.2f}'; f["learned_t05"] = f'{lc[0.5]:.3f}'
fl = {r["t"]: r for r in F["by_t"]}
f["floor_t0"] = f'{fl[0.0]["floor"]:.1f}'; f["floor_t1"] = f'{fl[1.0]["floor"]:.1f}'; f["total_t"] = f'{fl[0.5]["total"]:.1f}'
f["floor_t07"] = f'{fl[0.7]["floor"]:.1f}'
P = ex["paths"]
e = lambda k, n: next(r for r in P[k]["euler"] if r["steps"] == n)
dd = lambda k, n: next(r for r in P[k]["ddim"] if r["steps"] == n)
f["ex_lin_straight"] = f'{P["linear"]["straightness"]:.3f}'; f["ex_cos_straight"] = f'{P["cos"]["straightness"]:.3f}'; f["ex_vp_straight"] = f'{P["vp"]["straightness"]:.3f}'
f["learned_straight"] = f'{toy["rounds"]["1"]["straightness"]:.3f}'
f["ex_lin_4"] = pct(e("linear", 4)["on_mode"]); f["ex_cos_4"] = pct(e("cos", 4)["on_mode"]); f["ex_vp_4"] = pct(e("vp", 4)["on_mode"])
f["ex_vpddim_4"] = pct(dd("vp", 4)["on_mode"]); f["ex_cosddim_4"] = pct(dd("cos", 4)["on_mode"])
f["ex_lin_2"] = pct(e("linear", 2)["on_mode"]); f["ex_lin_ref"] = pct(P["linear"]["ref"]["on_mode"])
rr1 = {r["steps"]: r for r in toy["rounds"]["1"]["euler"]}
f["net_lin_4"] = pct(rr1[4]["on_mode"]); f["net_lin_2"] = pct(rr1[2]["on_mode"])
f["ddim_equiv"] = f'{ex["ddim_equiv"]["max_abs_diff"]:.0e}'.replace("e-", " &times; 10<sup>&minus;") + "</sup>"
f["ddim_equiv_grid"] = ", ".join(f"{v:.3f}" for v in ex["ddim_equiv"]["lambda"])
f["ddim_equiv_dist"] = f'{ex["ddim_equiv"]["vs_uniform_grid_mean_dist"]:.3f}'
R_ = toy["rounds"]
for k in ["1", "2", "3", "4"]:
    f[f"rd{k}_1"] = pct(R_[k]["euler"][0]["on_mode"]); f[f"rd{k}_ref"] = pct(R_[k]["ref"]["on_mode"]); f[f"rd{k}_st"] = f'{R_[k]["straightness"]:.4f}'
    f[f"rd{k}_cost"] = f'{R_[k]["pair_cost"]:.2f}'
for k in ["1", "2", "3"]:
    f[f"ds{k}_on"] = pct(toy["distill"][k]["one_step"]["on_mode"]); f[f"ds{k}_w2"] = f'{toy["distill"][k]["one_step"]["w2"]:.3f}'
f["w2_floor"] = f'{root_toy["w2_floor"]:.2f}'
f["indep2d"] = f'{toy["indep_pair_cost"]:.1f}'
c2 = {r["B"]: r["cost"] for r in toy["ot"]["cost"]}; ci = {r["B"]: r["cost_per_pixel"] for r in oti["minibatch"]}
f["ot2d_256"] = pct(1 - c2[256] / c2[1]); f["ot2d_4096"] = pct(1 - c2[4096] / c2[1]); f["otimg_256"] = pct(1 - ci[256] / ci[1]); f["otimg_4096"] = pct(1 - ci[4096] / ci[1])
f["ot2d_1"] = f'{c2[1]:.2f}'; f["ot2d_full"] = f'{c2[4096]:.2f}'; f["otimg_1"] = f'{ci[1]:.3f}'; f["otimg_full"] = f'{ci[4096]:.3f}'
for k in ["pairs_rf1", "pairs_rf2"]:
    if k in oti:
        f[k + "_cost"] = f'{oti[k]["cost_per_pixel"]:.3f}'; f[k + "_cut"] = pct(1 - oti[k]["cost_per_pixel"] / oti[k]["indep_same_images"])
OTT = toy["ot"]["trained"]
for B in ["1", "4", "16", "64", "256"]:
    f[f"ot{B}_1"] = pct(OTT[B]["euler"][0]["on_mode"]); f[f"ot{B}_st"] = f'{OTT[B]["straightness"]:.3f}'; f[f"ot{B}_ref"] = pct(OTT[B]["ref"]["on_mode"])
sd = {(r["eps"], r["steps"]): r for r in toy["sde"]}
for eps in [0.0, 1.0, 4.0]:
    for n in [4, 16, 256]:
        f[f"sde_{eps:g}_{n}"] = pct(sd[(eps, n)]["on_mode"])
m = memo["steps"]
f["memo_copy4"] = pct(m["4"]["exact_copies_frac"]); f["memo_copy50"] = pct(m["50"]["exact_copies_frac"])
f["memo_exact50"] = f'{m["50"]["exact_nn_rms_median"]:.4f}'; f["memo_net50"] = f'{m["50"]["net_nn_rms_median"]:.3f}'
f["memo_test"] = f'{memo["nn"]["test_rms_median"]:.3f}'; f["memo_netmin"] = f'{m["50"]["net_nn_rms_min"]:.3f}'
f["memo_same"] = pct(m["50"]["same_nn_frac"]); f["memo_sec"] = f'{memo["seconds"]:.0f}'
def tsr(b, s, k): return ts[f"{b}|{s}"][k]
for b in [2000, 12000]:
    for s, short in [("uniform", "u"), ("lognorm(0,1)", "ln"), ("lognorm(0.5,0.6)", "ln56"), ("mode(1.29)", "mode"), ("cosmap", "cos")]:
        f[f"ts{b}_{short}_e4"] = pct(tsr(b, s, "e4_on")); f[f"ts{b}_{short}_w2"] = f'{tsr(b, s, "e64_w2"):.3f}'
        f[f"ts{b}_{short}_err0"] = f'{tsr(b, s, "err")[0]:.3f}'
        f[f"ts{b}_{short}_errmid"] = f'{tsr(b, s, "err")[5]:.3f}'
        f[f"ts{b}_{short}_sd"] = f'{tsr(b, s, "e64_w2_sd"):.3f}'
f["toy_seconds"] = f'{toy["seconds"] / 60:.0f}'
fmS = {(r["solver"], r["steps"]): r for r in fm["samplers"]}; rfS = {r["steps"]: r for r in rf["samplers"]}
f["fm_e1"] = f'{fmS[("euler", 1)]["fd"]:.1f}'; f["fm_e50"] = f'{fmS[("euler", 50)]["fd"]:.1f}'; f["fm_e4"] = f'{fmS[("euler", 4)]["fd"]:.1f}'
f["rf2_e1"] = f'{rfS[1]["fd"]:.1f}'; f["rf2_e50"] = f'{rfS[50]["fd"]:.1f}'; f["rf2_e4"] = f'{rfS[4]["fd"]:.1f}'
f["fm_div50"] = f'{fmS[("euler", 50)]["div"]:.1f}'; f["rf2_div50"] = f'{rfS[50]["div"]:.1f}'; f["real_div"] = f'{fm["real_div"]:.1f}'
f["floor_fd"] = f'{fm["floor_fd"]:.1f}'
NM = new["models"]
if "rf3_2000" in NM:
    r3 = {r["steps"]: r for r in NM["rf3_2000"]["euler"]}
    f["rf3_e1"] = f'{r3[1]["fd"]:.1f}'; f["rf3_e4"] = f'{r3[4]["fd"]:.1f}'; f["rf3_e50"] = f'{r3[50]["fd"]:.1f}'; f["rf3_div50"] = f'{r3[50]["div"]:.1f}'
    f["rf3_st"] = f'{NM["rf3_2000"]["straightness"]:.4f}'; f["rf3_e2"] = f'{r3[2]["fd"]:.1f}'
for k, short in [("rf1d_1500", "d1"), ("rf2d_1500", "d2")]:
    if k in NM:
        r = NM[k]["euler"][0]; f[f"{short}_fd"] = f'{r["fd"]:.1f}'; f[f"{short}_acc"] = pct(r["acc"]); f[f"{short}_div"] = f'{r["div"]:.1f}'
if "reflow_2000" in NM:
    f["rf2_check1"] = f'{NM["reflow_2000"]["euler"][0]["fd"]:.1f}'
for k, v in trains.items():
    f[f"tr_{k}_s"] = f'{v["seconds"] / 60:.1f}'
for k in ["pairs_rf1", "pairs_rf2"]:
    if k in oti:
        f[k + "_cutimg"] = pct(1 - oti[k]["cost_per_pixel"] / oti[k]["indep_same_images"])
sdd = {(r["eps"], r["steps"]): r for r in new.get("sde_fm_4000", [])}
for (e_, n_), r in sdd.items():
    f[f"isde_{e_:g}_{n_}"] = f'{r["fd"]:.1f}'.replace(".0", ".0")
for r in new.get("sde_decay_fm_4000", []):
    f[f"isded_{r['eps']:g}_{r['steps']}"] = f'{r["fd"]:.1f}'
if "rf3_2000" in NM:
    f["rf3_e10"] = f'{r3[10]["fd"]:.1f}'
f["fm_e2"] = f'{fmS[("euler", 2)]["fd"]:.1f}'; f["rf2_e2"] = f'{rfS[2]["fd"]:.1f}'
for k, v in pairs.items():
    f[f"{k}_s"] = f'{v["seconds"] / 60:.1f}'; f[f"{k}_out"] = pct(v["x1_beyond_range_frac"])
D["f"] = f

js = "// Written by src/make_page_data.py from src/out/*.json, the root's src/flow/out and src/diff/out, and src/inputs. Do not edit by hand.\nwindow.FMD=" + json.dumps(D, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "22_js_fm_0data.js"), "w").write(js)
json.dump({k: v for k, v in D.items() if k != "sheet"}, open(os.path.join(OUT, "page_data.json"), "w"), indent=0)
print("data", len(js) // 1024, "KB;", len(f), "facts")
