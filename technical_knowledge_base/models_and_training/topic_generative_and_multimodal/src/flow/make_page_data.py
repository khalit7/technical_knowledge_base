"""Flow lab: build parts/33_js_fw_0data.js and out/page_data.json from the recorded outputs (CPU, seconds).

Reads out/toy2d.json, out/train_*.json, out/samples_*.json, out/strips_*.npz, out/pairs.json, the Diffusion lab's
committed ../diff/out/samples_eps.json and strips_eps.npz (for the equal-step comparison on the same noise), and the
code shown on the page (../data/objectives.py, fm_samplers.py). Every number in the tab's prose is a fact key here.
    GM_SCRATCH=... $GM_SCRATCH/venv/bin/python -I make_page_data.py
"""
import base64, html, io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import numpy as np
from PIL import Image

OUT = os.path.join(HERE, "out")
DIFF = os.path.join(HERE, "..", "diff", "out")
J = lambda p: json.load(open(p))
toy = J(os.path.join(OUT, "toy2d.json"))
tr = J(os.path.join(OUT, "train_fm_4000.json"))
trr = J(os.path.join(OUT, "train_reflow_2000.json"))
fm = J(os.path.join(OUT, "samples_fm_4000.json"))
rf = J(os.path.join(OUT, "samples_reflow_2000.json"))
pairs = J(os.path.join(OUT, "pairs.json"))
df = J(os.path.join(DIFF, "samples_eps.json"))
dtr = J(os.path.join(DIFF, "train_eps.json"))
S = dict(np.load(os.path.join(OUT, "strips_fm_4000.npz")))
SR = dict(np.load(os.path.join(OUT, "strips_reflow_2000.npz")))
SD = dict(np.load(os.path.join(DIFF, "strips_eps.npz")))

# ------------------------------------------------------------------ the starting noise of the strips (seed 5, as both labs make it)
import torch
z = torch.randn((10, 1, 32, 32), generator=torch.Generator().manual_seed(5))
noise_img = ((z.clamp(-1, 1) + 1) * 127.5).round().to(torch.uint8)[:, 0, 2:30, 2:30].numpy()

# ------------------------------------------------------------------ one sprite sheet of 28x28 tiles, 10 per row
runs = [("noise", noise_img)]
for n in [1, 2, 4, 10, 50]:
    runs.append((f"fm_{n}", S[f"euler_{n}"]))
    if n <= 4:                     # reflowed strips at 1, 2, 4 steps only (at 10+ they look like the plain flow's; scores in the table)
        runs.append((f"rf_{n}", SR[f"euler_{n}"]))
    runs.append((f"ddim_{n}", S["ddim_2"] if n == 2 else SD[f"ddim_{n}"]))
CFG_STRIPS = [0, 1.5, 3]
for s in CFG_STRIPS:
    runs.append((f"cfg_{s}", S[f"cfg_{s}"]))
for sh in ["0.33", "3.00"]:
    runs.append((f"shift_{sh}_4", S[f"shift_{sh}_4"]))
runs += [("bug_rev", S["bug_reversed_time"][:5]), ("bug_t1000", S["bug_time_x1000"][:5])]   # first 5 classes
# trajectories: 1 of the 4 noises (the ankle boot) x 10 steps; frames: noise, then after steps 1..10; guesses at steps 1..10
TRI = [3]
def frames(a):          # (frames, 4, 28, 28) -> one tile per frame
    return np.asarray(a)[:, TRI].reshape(-1, 28, 28)
runs += [("tr_fm_xt", frames(S["traj_10_xt"])), ("tr_fm_x1", frames(S["traj_10_x1"])),
         ("tr_dd_xt", frames(S["ddim_traj_10_xt"])), ("tr_dd_x0", frames(S["ddim_traj_10_x0"]))]
tiles, allt = {}, []
for k, a in runs:
    a = np.asarray(a).reshape(-1, 28, 28)
    tiles[k] = len(allt); allt += list(a)
COLS = 10
rows = (len(allt) + COLS - 1) // COLS
sheet = np.zeros((rows * 28, COLS * 28), np.uint8)
for i, t in enumerate(allt):
    sheet[(i // COLS) * 28:(i // COLS + 1) * 28, (i % COLS) * 28:(i % COLS + 1) * 28] = t
def enc(fmt, **kw):
    b = io.BytesIO(); Image.fromarray(sheet).save(b, fmt, **kw); return b.getvalue()
def png16():
    """4-bit grey PNG: 16 levels (v // 17 rounded), an explicit grey palette, so the page decodes exact levels."""
    idx = np.round(sheet / 17).astype(np.uint8)
    im = Image.fromarray(idx, "P"); im.putpalette(sum([[17 * i] * 3 for i in range(16)], []))
    b = io.BytesIO(); im.save(b, "PNG", optimize=True, bits=4); return b.getvalue()
cands = {"png16": png16(), "png": enc("PNG", optimize=True), "webp_ll": enc("WEBP", lossless=True, method=6)}
for q in [75, 85, 92]:
    cands[f"webp_{q}"] = enc("WEBP", quality=q, method=6)
print("tiles", len(allt), {k: len(v) for k, v in cands.items()})
FMT = os.environ.get("FW_SHEET", "png16")
sheet_bytes = cands[FMT]
sheet_uri = ("data:image/png;base64," if FMT.startswith("png") else "data:image/webp;base64,") + base64.b64encode(sheet_bytes).decode()

# ------------------------------------------------------------------ tables
ex = J(os.path.join(OUT, "samples_extra.json"))
tex = J(os.path.join(OUT, "toy_extra.json"))
keep = ("solver", "steps", "nfe", "fd", "acc", "div", "sec")
fmrows = [{k: r[k] for k in keep} for r in fm["samplers"]]
rfrows = [{k: r[k] for k in keep} for r in rf["samplers"]]
herows = [{"solver": "heun_last_euler", **r} for r in ex["heun_last_euler"]]
dfrows = [{"solver": r["sampler"], "steps": r["steps"], "nfe": r["steps"], "fd": r["fd"], "acc": r["acc"], "div": r["div"], "sec": r["sec"]}
          for r in df["samplers"] if r["sampler"] != "euler"]           # diffusers Euler == DDIM within 0.2 there; left out of the chart
dcfg = [{"scale": r["scale"], "fd": r["fd"], "acc": r["acc"]} for r in df["cfg"]]
logsub = [[r["step"], r["loss"]] for r in tr["log"] if r["step"] % 200 == 0 or r["step"] == 1]

# ------------------------------------------------------------------ code shown on the page (verbatim slices)
obj = open(os.path.join(HERE, "..", "data", "objectives.py")).read()
i0 = obj.index("def cfm_loss"); i1 = obj.index("\n\n\n", i0)
code_cfm = obj[i0:i1]
l0 = obj[:i0].count("\n") + 1; l1 = l0 + code_cfm.count("\n")
smp = open(os.path.join(HERE, "fm_samplers.py")).read()
j0 = smp.index("def vel"); j1 = smp.index("@torch.no_grad()\ndef heun_last_euler")
code_samp = smp[j0:j1].rstrip() + "\n"

# ------------------------------------------------------------------ facts used in the prose
c = lambda v: f"{v:,}"
pct = lambda v: f"{100 * v:.1f}%"
pct0 = lambda v: f"{100 * v:.0f}%"
row = lambda rows, s, n: [r for r in rows if r["solver"] == s and r["steps"] == n][0]
trow = lambda m, s, n, rs=toy["results"]: [r for r in rs if r["model"] == m and r["solver"] == s and r["steps"] == n][0]
E = lambda n: row(fmrows, "euler", n); M = lambda n: row(fmrows, "midpoint", n); Hn = lambda n: row(fmrows, "heun", n)
HE = lambda n: row(herows, "heun_last_euler", n); R = lambda n: row(rfrows, "euler", n)
DD = lambda s, n: row(dfrows, s, n)
err = {(r["solver"], r["nfe"]): r["rms"] for r in ex["ode_err"]}
best_fm = min(fmrows + herows, key=lambda r: r["fd"])
nparam_toy = sum(L["o"] * L["i"] + L["o"] for L in toy["nets"]["cfm"])
F = {
    "date": fm["date"], "floor_fd": f"{fm['floor_fd']:.2f}", "real_div": f"{fm['real_div']:.2f}",
    "toy_params": c(nparam_toy), "toy_hidden": str(toy["setup"]["hidden"]), "toy_sec": f"{toy['seconds']:.0f}",
    "cfm_lines": f"{l0} to {l1}", "params": c(tr["config"]["params"]), "steps": c(tr["config"]["steps"]),
    "train_sec": f"{tr['seconds']:.1f}", "train_sps": f"{tr['steps_per_s']:.2f}",
    "fm_e1_fd": f"{E(1)['fd']:.1f}", "fm_e1_acc": pct(E(1)["acc"]), "fm_e1_div": f"{E(1)['div']:.2f}",
    "err_nfe": "10", "err_e": f"{err[('euler', 10)]:.3f}", "err_h": f"{err[('heun', 10)]:.3f}", "err_m": f"{err[('midpoint', 10)]:.3f}",
    "err_he": f"{err[('heun_last_euler', 9)]:.3f}", "err_m50": f"{err[('midpoint', 50)]:.4f}", "err_m100": f"{err[('midpoint', 100)]:.4f}",
    "toy_on_e4": pct0(trow("cfm", "euler", 4)["on_mode"]), "toy_on_h4": pct0(trow("cfm", "heun", 2)["on_mode"]),
    "toy_on_m4": pct0(trow("cfm", "midpoint", 2)["on_mode"]), "toy_on_e2": pct0(trow("cfm", "euler", 2)["on_mode"]),
    "toy_on_h2": pct0(trow("cfm", "heun", 1)["on_mode"]), "toy_on_m2": pct0(trow("cfm", "midpoint", 1)["on_mode"]),
    "toy_w2_floor": f"{toy['w2_floor']:.3f}",
    **{f"toy_st_{k}": f"{v['straightness']:.3f}" for k, v in toy["straight"].items()},
    "toy_loss_reflow": f"{toy['logs']['reflow'][-1][1]:.4f}", "toy_loss_cfm": f"{toy['logs']['cfm'][-1][1]:.2f}",
    "toy_full_cfm": pct0(trow("cfm", "euler", 64)["on_mode"]), "toy_full_reflow": pct0(trow("reflow", "euler", 64)["on_mode"]),
    "ms1000": f"{fm['ms_per_eval']['1000']:.0f}",
    "st_fm": f"{fm['straightness']:.3f}", "st_dd": f"{fm['ddim_straightness']:.3f}", "st_rf": f"{rf['straightness']:.3f}",
    "one50_fm": f"{fm['one_vs_50_rms']:.2f}", "one50_dd": f"{fm['ddim_one_vs_50_rms']:.2f}", "one50_rf": f"{rf['one_vs_50_rms']:.2f}",
    "pairs_n": c(pairs["pairs"]), "pairs_sec": f"{pairs['seconds']:.0f}", "rf_steps": c(trr["config"]["steps"]), "rf_sec": f"{trr['seconds']:.0f}",
}
f1 = lambda v: f"{v:,.1f}"
cfg = {r["scale"]: r for r in fm["cfg"]}
shf = {(r["shift"], r["steps"]): r for r in fm["shift"]}
bug = {r["bug"]: r for r in fm["bugs"]}
F["cmp_text"] = (
    f"At every step count both labs ran from 1 to 50, flow with Euler scores better than all three diffusion samplers. At 4 evaluations it scores FD {f1(E(4)['fd'])} against "
    f"{f1(DD('ddim', 4)['fd'])} for DDIM and {f1(DD('ddpm', 4)['fd'])} for DDPM; at 10, {f1(E(10)['fd'])} against {f1(DD('ddim', 10)['fd'])}, "
    f"{f1(DD('ddpm', 10)['fd'])} and DPM-Solver++'s {f1(DD('dpm', 10)['fd'])}; at 20, {f1(E(20)['fd'])} against {f1(DD('ddim', 20)['fd'])}, "
    f"{f1(DD('ddpm', 20)['fd'])} and {f1(DD('dpm', 20)['fd'])}. The midpoint solver does better still: {f1(M(2)['fd'])} with 2 steps "
    f"(4 evaluations, {M(2)['sec']:.2f} s for 1,000 images) and {f1(M(5)['fd'])} with 5 (10 evaluations); DDPM needs 250 steps to reach "
    f"{f1(DD('ddpm', 250)['fd'])}. Plain Heun is the outlier ({f1(Hn(2)['fd'])} at 4 evaluations, {f1(Hn(5)['fd'])} at 10): section 3's "
    f"endpoint problem. Making its last step Euler fixes it ({f1(HE(3)['fd'])} at 5 evaluations, {f1(HE(5)['fd'])} at 9) and gives the "
    f"best unguided flow score in the lab, {f1(best_fm['fd'])} at {best_fm['nfe']} evaluations. Accuracy is high for every flow run from 2 Euler steps (above {pct0(min(r['acc'] for r in fmrows if r['solver'] == 'euler' and r['steps'] >= 2) - 0.005)}); "
    f"what few steps cost is diversity ({E(2)['div']:.1f} at 2 Euler steps, {E(50)['div']:.1f} at 50, real images {fm['real_div']:.1f}): "
    f"few-step samples are cleaner, more average garments.")
F["ddpm_wins"] = (
    f"With many steps the stochastic DDPM sampler reaches FD {f1(DD('ddpm', 1000)['fd'])} at 1,000 steps ({f1(DD('ddpm', 250)['fd'])} at 250), "
    f"below every unguided flow run (best {f1(best_fm['fd'])}). Solving the flow ODE more exactly does not help: Euler with 250 steps scores "
    f"{f1(E(250)['fd'])} and midpoint with 25 steps {f1(M(25)['fd'])}, worse than 5 midpoint steps, so the coarse solvers' error happens to "
    f"improve this under-trained model's samples, as DDPM's fresh noise does (the Diffusion lab saw DDPM beat DDIM for the same reason). "
    f"A stochastic sampler for the flow model would test that; not run here. With guidance (section 7) the flow model reaches "
    f"{f1(cfg[1.5]['fd'])}, the best score in either lab.")
F["shift_text"] = (
    f"no shift is best at both step counts: at 4 Euler steps FD {f1(shf[(1.0, 4)]['fd'])} against {f1(shf[(0.3333, 4)]['fd'])} with shift 1/3 "
    f"and {f1(shf[(3.0, 4)]['fd'])} with shift 3; at 10 steps {f1(shf[(1.0, 10)]['fd'])}, {f1(shf[(0.3333, 10)]['fd'])} and {f1(shf[(3.0, 10)]['fd'])}. "
    f"The shift exists because a large image keeps recognisable structure at noise levels that wipe out a small one, so a 1024-pixel model "
    f"needs more of its steps near the noise end; a 28 &times; 28 model has nothing to gain.")
F["cfg_text"] = (
    f"Flow, Euler 50 steps, 1,000 samples <span class=\"meas\">measured</span>: FD {f1(cfg[1]['fd'])} unguided (s = 1), {f1(cfg[1.5]['fd'])} at s = 1.5 "
    f"(class accuracy {pct(cfg[1.5]['acc'])}; real images score {fm['floor_fd']:.2f}), {f1(cfg[2]['fd'])} at s = 2, {f1(cfg[3]['fd'])} at s = 3 and "
    f"{f1(cfg[5]['fd'])} at s = 5, where accuracy is {pct(cfg[5]['acc'])} and diversity has fallen from {cfg[1]['div']:.1f} to {cfg[5]['div']:.1f}: "
    f"guidance trades variety for recognisability, and past a small scale FD punishes the lost variety. s = 0, the unconditional model "
    f"(it only trained on the 10% of examples whose label was dropped), scores {f1(cfg[0]['fd'])}. The Diffusion lab's DDIM-50 sweep "
    f"peaked at s = 2 (FD 35.55; it did not try 1.5); the flow model's best is lower.")
F["bug_text"] = (
    f"Correct sampling: FD {f1(E(50)['fd'])}. Integrating from t = 1 down to 0 (diffusers' direction) with this t = 0-is-noise model: FD "
    f"{f1(bug['reversed_time']['fd'])}, class accuracy {pct(bug['reversed_time']['acc'])} (chance is 10%). Passing t &times; 1000 (what "
    f"diffusers' pipelines give a transformer) to a net trained on t in [0, 1]: FD {f1(bug['time_x1000']['fd'])}, accuracy "
    f"{pct(bug['time_x1000']['acc'])}. Neither raises an error. <span class=\"meas\">measured</span>")
F.update({"img_m2": f1(M(2)["fd"]), "img_e4": f1(E(4)["fd"]), "img_m1": f1(M(1)["fd"]), "img_e2": f1(E(2)["fd"]), "img_h2": f1(Hn(2)["fd"]),
          "img_he3": f1(HE(3)["fd"]), "img_he5": f1(HE(5)["fd"]),
          "cos_v_x": f"{ex['at_t1.0']['cos_v_x']:.3f}", "cos_true": f"{ex['at_t1.0']['cos_v_true']:.3f}", "cos_true_09": f"{ex['at_t0.9']['cos_v_true']:.3f}"})
F["rf_text"] = (
    f"After reflow one Euler step scores FD {f1(R(1)['fd'])} (from {f1(E(1)['fd'])}), two steps {f1(R(2)['fd'])} (from {f1(E(2)['fd'])}) and "
    f"four {f1(R(4)['fd'])} (from {f1(E(4)['fd'])}); at 50 steps {f1(R(50)['fd'])} against {f1(E(50)['fd'])} before. One step now lands "
    f"{rf['one_vs_50_rms']:.2f} (RMS per pixel) from the 50-step answer, against {fm['one_vs_50_rms']:.2f} before, and the 50-step paths' "
    f"straightness rises from {fm['straightness']:.3f} to {rf['straightness']:.3f}. <span class=\"meas\">measured</span>")
F["toy_on_r1"] = pct0(trow("reflow", "euler", 1)["on_mode"])
F["toy_on_c1"] = pct0(trow("cfm", "euler", 1)["on_mode"])

F["pairs_oor"] = pct0(pairs["x1_beyond_range_frac"])
pt = {r["t"]: r["loss"] for r in tr["per_t"]}
F.update({"pt0": f"{pt[0.0]:.3f}", "pt1": f"{pt[1.0]:.3f}", "ptmid": f"{pt[0.5]:.3f}"})

# ------------------------------------------------------------------ the page's data object
toy_page = {"setup": toy["setup"], "nets": toy["nets"], "w2_floor": toy["w2_floor"], "straight": toy["straight"],
            "results": [{k: r[k] for k in ("model", "solver", "steps", "nfe", "on_mode", "w2", "err_ref")} for r in toy["results"]
                        if r["model"] == "cfm" or r["solver"] in ("euler", "ddim")]}   # all solvers for random pairs; Euler / DDIM for the rest
page = {"f": F, "toy": toy_page, "sheet": sheet_uri, "cols": COLS, "tiles": tiles, "cfgStrips": CFG_STRIPS,
        "fm": fmrows, "rf": rfrows, "he": herows, "df": dfrows, "err": ex["ode_err"], "cfg": fm["cfg"], "dcfg": dcfg,
        "per_t": tr["per_t"], "log": logsub, "code": {"cfm": code_cfm, "samp": code_samp},
        "f_floor": fm["floor_fd"], "f_realdiv": fm["real_div"], "f_st_fm": F["st_fm"], "f_st_rf": F["st_rf"], "f_st_dd": F["st_dd"]}
txt = json.dumps(page, separators=(",", ":"), ensure_ascii=False)
assert "\u2014" not in txt, "em dash in data"
json.dump(page, open(os.path.join(OUT, "page_data.json"), "w"), separators=(",", ":"), ensure_ascii=False)
open(os.path.join(HERE, "..", "parts", "33_js_fw_0data.js"), "w").write("window.FWD=" + txt + ";\n")
sizes = {"total": len(txt), "sheet": len(sheet_uri), "toy_nets": len(json.dumps(toy["nets"], separators=(",", ":"))),
         "toy_results": len(json.dumps(toy_page["results"], separators=(",", ":")))}
print("page data bytes", sizes)

# ------------------------------------------------------------------ for the Reading tab (src/read/todo.md: flow_vs_diff, t_flow)
rd = {"flow_vs_diff": (
    f"Same tiny U-Net, data, recipe and 4,000 training steps, scored on 1,000 samples (FD in the classifier's feature space; 1,000 real "
    f"images score {fm['floor_fd']:.1f}): flow matching with Euler reaches FD {f1(E(4)['fd'])} at 4 steps and {f1(E(10)['fd'])} at 10, where "
    f"the DDPM model with DDIM scores {f1(DD('ddim', 4)['fd'])} and {f1(DD('ddim', 10)['fd'])}; with the midpoint solver flow reaches "
    f"{f1(M(2)['fd'])} at 4 network evaluations, while DDPM's stochastic sampler needs 250 steps for {f1(DD('ddpm', 250)['fd'])} "
    f"<span class=\"meas\">measured</span> on Apple M1 Pro (MPS). One network evaluation costs the same for both models, so evaluations "
    f"are sampling time. On the 2-D toy, one Euler step puts {F['toy_on_c1']} of the points on a mode before reflow and "
    f"{F['toy_on_r1']} after; on the images, reflow takes 1-step FD from {f1(E(1)['fd'])} to {f1(R(1)['fd'])} "
    f"<span class=\"meas\">measured</span>."),
    "t_flow": "about 25 minutes (25.3 at 200 words per minute, measured by check_page.mjs on 2026-10-17), plus about 7 for the folded interview answers and code"}
json.dump(rd, open(os.path.join(OUT, "read_numbers.json"), "w"), indent=1, ensure_ascii=False)
