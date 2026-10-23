"""Write parts/22_js_ns_0data.js (window.NSD) and out/page_numbers.json from the recorded outputs in out/ and the
root's Block lab runs. Never edit the data part by hand. Runs that have not landed are left out (cells say so).
  python3 make_page_data.py
"""
import glob, json, math, os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ROOT = os.path.join(HERE, "..", "..", "src")
BL = os.path.join(ROOT, "block", "out")
AV = os.path.join(HERE, "..", "..", "attention_variants", "src", "out", "runs_eval.json")
TZ = os.path.join(HERE, "..", "..", "the_transformer_from_zero", "src", "train", "out", "runs")


def r(x, d=3):
    """Exact half-up rounding (floats print differently across Python versions)."""
    if x is None:
        return None
    return float(Decimal(repr(x)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP))


def f(x, d=3):
    """Format for prose: fixed decimals, thousands separators."""
    v = Decimal(repr(x)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP) if d > 0 else Decimal(repr(x)).quantize(Decimal(1), rounding=ROUND_HALF_UP)
    s = f"{v:,.{d}f}" if d > 0 else f"{int(v):,}"
    return s


def fs(x):
    """Significant formatting for logits and norms."""
    a = abs(x)
    if a >= 1000:
        return f(x, 0)
    if a >= 100:
        return f(x, 0)
    if a >= 10:
        return f(x, 1)
    if a >= 1:
        return f(x, 2)
    return f(x, 3)


N = {}           # prose numbers
uni = json.load(open(os.path.join(BL, "unigram.json")))["val_cross_entropy_under_train_unigram_nats"]
N["unigram"] = f(uni, 3)

# ------------------------------------------------------------------ runs
LRT = lambda v: {3e-4: "3e-4", 1e-3: "1e-3", 3e-3: "3e-3", 1e-2: "1e-2", 3e-2: "3e-2"}.get(v, f"{v:g}")
LABEL = {
    "pre": "Pre-norm", "post": "Post-norm", "sandwich": "Sandwich (peri-norm)", "output": "Output norm (OLMo 2)",
}
runs = {}


def bl_run(name):
    d = json.load(open(os.path.join(BL, "runs", name + ".json")))
    tr = d["train"]
    v = "post" if d["norm_pos"] == "post" else "pre"
    lab = LABEL[v] + (f", {d['warmup']} warmup steps" if d["warmup"] != 100 else "")
    return {"name": name, "lab": "bl", "label": lab + f", lr {LRT(d['lr'])}", "status": d["status"], "final": d["final_val_loss"],
            "lr": d["lr"], "ev": [[s, r(v_, 4)] for s, v_ in d["eval"]],
            "gn": [[t[0], r(t[2], 4)] for t in tr], "l10": [[t[0], r(t[1], 4)] for t in tr]}


def ns_label(L):
    a, c = L["args"], L["config"]
    p = a["norm_pos"] or c["norm_pos"]
    s = LABEL.get(p, p)
    if c["norm"] == "rmsnorm":
        s = s.replace("Pre-norm", "Pre-norm, RMSNorm")
    if c["qk_norm"]:
        s += " + QK-norm"
    if a["zloss"]:
        s += f" + z-loss {a['zloss']:g}"
    if a["attn_softcap"]:
        s += f" + logit cap {a['attn_softcap']:g}"
    if a["init"] == "flat":
        s += ", flat init"
    s += f", lr {LRT(a['lr'])}"
    if a["clip"] == 0:
        s += ", no clipping"
    if a["seed"]:
        s += f", seed {a['seed']}"
    return s


for fpath in sorted(glob.glob(os.path.join(OUT, "runs", "ns_*.json"))):
    L = json.load(open(fpath))
    nm = L["name"]
    P = L["probe"]
    loss, gn = L["loss"], L["grad_norm"]
    run = {"name": nm, "lab": "ns", "label": ns_label(L), "status": L["status"], "final": L["final_val_loss"], "lr": L["args"]["lr"],
           "ev": [[e["step"], r(e["val_loss"], 4)] for e in L["eval"]],
           "l10": [[0, r(loss[0], 4)]] + [[s, r(loss[s - 1], 4)] for s in range(10, len(loss) + 1, 10) if loss[s - 1] is not None],
           "gn": [[0, r(gn[0], 4)]] + [[s, r(gn[s - 1], 4)] for s in range(10, len(gn) + 1, 10) if gn[s - 1] is not None],
           "ml": [[p["step"], r(max(p["max_logit"]), 2)] for p in P],
           "ent": [[p["step"], r(min(p["entropy"]), 4)] for p in P],
           "lz": [[p["step"], r(p["log_z"], 4)] for p in P]}
    mls = [max(p["max_logit"]) for p in P]
    k = mls.index(max(mls))
    run.update(ml_max=r(max(mls), 1), ml_at=P[k]["step"], ml_end=r(mls[-1], 1))
    runs[nm] = run
    runs[nm]["_probe"] = P
    runs[nm]["_loss"] = loss
    runs[nm]["_gn"] = gn
    runs[nm]["_secs"] = L["seconds"]

for n in ["bl_pre_lr1e-3", "bl_pre_lr3e-3", "bl_pre_lr1e-2", "bl_pre_lr3e-2", "bl_post_lr3e-4", "bl_post_lr1e-3", "bl_post_lr3e-3", "bl_post_warm500"]:
    runs[n] = bl_run(n)

# ------------------------------------------------------------------ grid
LRS = [3e-4, 1e-3, 3e-3, 1e-2, 3e-2]
lt = lambda v: {3e-4: "3e-4", 1e-3: "1e-3", 3e-3: "3e-3", 1e-2: "1e-2", 3e-2: "3e-2"}[v]
NR_POST = {"nr": "not run: post-norm already sits at the unigram floor at lr 3e-3", "short": "fails at 3e-3"}
ROWS = [
    ("Pre-norm (LayerNorm)", {"1e-3": "bl_pre_lr1e-3", "3e-3": "bl_pre_lr3e-3", "1e-2": "bl_pre_lr1e-2", "3e-2": "bl_pre_lr3e-2"}),
    ("Post-norm", {"3e-4": "bl_post_lr3e-4", "1e-3": "bl_post_lr1e-3", "3e-3": "bl_post_lr3e-3", "1e-2": NR_POST, "3e-2": NR_POST}),
    ("Post-norm, 500 warmup steps", {"3e-3": "bl_post_warm500"}),
    ("Sandwich (peri-norm)", {"3e-3": "ns_sand_lr3e-3", "1e-2": "ns_sand_lr1e-2", "3e-2": "ns_sand_lr3e-2"}),
    ("Output norm (OLMo 2)", {"3e-3": "ns_out_lr3e-3", "1e-2": "ns_out_lr1e-2", "3e-2": "ns_out_lr3e-2"}),
    ("Sandwich + QK-norm (Gemma 3)", {"3e-3": "ns_sand_lr3e-3_qk"}),
    ("Output norm + QK-norm (OLMo 2)", {"3e-3": "ns_out_lr3e-3_qk"}),
    ("Pre-norm + QK-norm", {"3e-3": "ns_pre_lr3e-3_qk", "1e-2": "ns_pre_lr1e-2_qk", "3e-2": "ns_pre_lr3e-2_qk"}),
    ("Post-norm + QK-norm", {"3e-3": "ns_post_lr3e-3_qk"}),
    ("Pre-norm, RMSNorm", {"3e-3": "ns_rms_lr3e-3"}),
    ("Pre-norm, flat init", {"3e-3": "ns_flat_lr3e-3"}),
    ("Pre-norm, no clipping", {"3e-2": "ns_pre_lr3e-2_c0"}),
    ("+ QK-norm, no clipping", {"3e-2": "ns_pre_lr3e-2_c0_qk"}),
    ("+ z-loss 1e-4, no clipping", {"3e-2": "ns_pre_lr3e-2_c0_z"}),
    ("+ logit cap 50, no clipping", {"3e-2": "ns_pre_lr3e-2_c0_cap"}),
]
grid_rows = []
for label, cells in ROWS:
    row = {"label": label, "cells": {}}
    for k, v in cells.items():
        if isinstance(v, dict):
            row["cells"][k] = v
        elif v in runs:
            row["cells"][k] = {"run": v}
        else:
            row["cells"][k] = {"nr": "pending: queued, not yet run", "short": "pending"}
    grid_rows.append(row)
GOK, GBAD = 2.5, 4.0
N["st_ok"], N["st_bad"] = f(GOK, 1), f(GBAD, 1)
start = [n for n in ("bl_pre_lr3e-2", "ns_pre_lr3e-2_qk", "ns_pre_lr3e-2_c0") if n in runs][:3]
grid = {"lrs": LRS, "rows": grid_rows, "ok": GOK, "bad": GBAD, "unigram": uni, "start": start}

# rerun agreement (MPS reruns differ in the third decimal)
if "ns_pre_lr3e-3" in runs:
    N["rerun_note"] = (f"this page's rerun of the Block lab's pre-norm lr 3e-3 run ended at {f(runs['ns_pre_lr3e-3']['final'], 4)}, "
                       f"the Block lab's at {f(runs['bl_pre_lr3e-3']['final'], 4)}, the root's reference run at 2.278")
    N["rerun_ns"] = f(runs["ns_pre_lr3e-3"]["final"], 4)
    N["rerun_bl"] = f(runs["bl_pre_lr3e-3"]["final"], 4)

for n, R in runs.items():
    N["final_" + n] = f(R["final"], 3)
    if "ml_max" in R:
        N["mlmax_" + n] = fs(R["ml_max"])
        N["mlat_" + n] = f(R["ml_at"], 0)
        N["mlend_" + n] = fs(R["ml_end"])
        P = R["_probe"]
        N["entmin_" + n] = f(min(min(p["entropy"]) for p in P), 3)
        N["entend_" + n] = f(min(P[-1]["entropy"]), 3)
        N["lzend_" + n] = f(P[-1]["log_z"], 2)
        N["lz0_" + n] = f(P[0]["log_z"], 2)
        g = [x for x in R["_gn"] if x is not None]
        N["gnmax_" + n] = fs(max(g))
        N["gnmaxat_" + n] = f(R["_gn"].index(max(g)) + 1, 0)

for _lab, cells in ROWS:          # runs not landed yet: prose says "pending", the data check lists them
    for v in cells.values():
        if isinstance(v, str) and v not in runs:
            for k in ("final_", "mlmax_", "mlat_", "mlend_", "entmin_", "entend_", "lzend_", "lz0_", "gnmax_", "gnmaxat_"):
                N[k + v] = "pending"
N["pending_runs"] = sorted(v for _l, c in ROWS for v in c.values() if isinstance(v, str) and v not in runs)

# ------------------------------------------------------------------ spike replay
spike = None
if "ns_pre_lr3e-2_c0" in runs:
    comps = {k: v for k, v in (("qk", "ns_pre_lr3e-2_c0_qk"), ("z", "ns_pre_lr3e-2_c0_z"), ("cap", "ns_pre_lr3e-2_c0_cap"), ("ok", "ns_pre_lr3e-3")) if v in runs}
    every = 30
    for n in ["ns_pre_lr3e-2_c0"] + list(comps.values()):
        P = runs[n]["_probe"]
        runs[n]["pl"] = {"step": [p["step"] for p in P], "ml": [[r(x, 1) for x in p["max_logit"]] for p in P],
                         "ent": [[r(x, 2) for x in p["entropy"]] for p in P]}
    frames = list(range(0, 151, every // 10))
    spike = {"base": "ns_pre_lr3e-2_c0", "comps": comps, "def": "qk" if "qk" in comps else list(comps)[0], "frames": frames,
             "every": every, "caps": {}}

uniform_ent = sum(math.log(t) for t in range(2, 257)) / 255
N["uniform_ent"] = f(uniform_ent, 2)
if spike:
    spike["uniform_ent"] = N["uniform_ent"]

# ------------------------------------------------------------------ residual stream
INS = os.path.join(OUT, "inspect")
ld = lambda n: json.load(open(os.path.join(INS, n + ".json"))) if os.path.exists(os.path.join(INS, n + ".json")) else None
Q = ("median_norm", "trace_norm", "tok0_norm", "max_abs")
pick = lambda d: {q: [r(v, 3) for v in d[q]] for q in Q} if d else None
TR = {"pre": "ref_baseline_s1500", "post": "ns_post_lr1e-3", "sandwich": "ns_sand_lr3e-3", "output": "ns_out_lr3e-3", "pre_flat": "ns_flat_lr3e-3"}
IN = {"pre": "init_pre", "post": "init_post", "sandwich": "init_sandwich", "output": "init_output", "pre_flat": "init_pre_flat"}
models = {k: {"init": pick(ld(IN[k])), "trained": pick(ld(TR[k]))} for k in TR}
pts = ld("init_pre")["points"]
ptlab = lambda p: "after the embedding" if p == "emb" else f"after block {p[1:]} " + ("attention" if p[0] == "a" else "feed-forward")
resid = {"points": pts, "models": models, "caps": {"init": {}, "trained": {}}, "table": []}
for k, n in [("pre", "ref_baseline_s1500"), ("post", "ns_post_lr1e-3"), ("sandwich", "ns_sand_lr3e-3"), ("output", "ns_out_lr3e-3"),
             ("pre_flat", "ns_flat_lr3e-3"), ("mha_rope", "at_mha")]:
    d = ld(n)
    if not d:
        continue
    i = max(range(len(d["max_abs"])), key=lambda j: d["max_abs"][j])
    lab = {"pre": "Pre-norm (root reference run)", "post": "Post-norm, lr 1e-3", "sandwich": "Sandwich, lr 3e-3", "output": "Output norm, lr 3e-3",
           "pre_flat": "Pre-norm, flat init", "mha_rope": "Pre-norm, RoPE (Attention lab's at_mha)"}[k]
    resid["table"].append({"label": lab, "max": r(d["max_abs"][i], 1), "where": f"token {d['max_abs_tok'][i]}, channel {d['max_abs_dim'][i]}, " + ptlab(pts[i]),
                           "med": r(d["median_abs"][i], 3), "ratio": r(d["max_abs"][i] / d["median_abs"][i], 1)})
for k in models:
    for w in ("init", "trained"):
        m = models[k][w]
        if m:
            N[f"rs_{k}_{w}_first"] = fs(m["median_norm"][0]); N[f"rs_{k}_{w}_last"] = fs(m["median_norm"][-1])
            N[f"rs_{k}_{w}_max"] = fs(max(m["max_abs"]))

# ------------------------------------------------------------------ other recorded outputs
mist = json.load(open(os.path.join(OUT, "mistakes.json")))
for k, v in mist["cases"].items():
    N["mis_" + k] = f(v["loss"], 3)
N["mis_mean_over_rms_med"] = f(max(mist["mean_over_rms"]["median"]), 3)
N["mis_mean_over_rms_max"] = f(max(mist["mean_over_rms"]["max"]), 3)
N["mis_ln_rms_diff"] = f(abs(mist["cases"]["layernorm_as_rmsnorm"]["loss6"] - mist["cases"]["correct"]["loss6"]), 6)
e = mist["rmsnorm_default_eps"]
N["eps_default"], N["eps_1e5"], N["eps_1e6"] = f(e["default"], 4), f(e["eps_1e-5"], 4), f(e["eps_1e-6"], 4)
nb = {}
for dev in ("cpu", "mps"):
    p = os.path.join(OUT, f"normbench_{dev}.json")
    if os.path.exists(p):
        nb[dev] = json.load(open(p))
code = json.load(open(os.path.join(OUT, "code_refs.json")))
for k, v in code["refs"].items():
    N["ln_" + k] = f"{v['line']}" + (f"-{v['end']}" if v["end"] != v["line"] else "")
av = json.load(open(AV))
avs = {s["run"]: s for s in av["sinks"]}
N["av_mha_maxres"] = fs(max(avs["at_mha"]["max_abs_resid"])); N["av_gate_maxres"] = fs(max(avs["av_gate"]["max_abs_resid"]))
N["av_mha_first"] = f(max(avs["at_mha"]["first_token_mass"]), 3); N["av_gate_first"] = f(max(avs["av_gate"]["first_token_mass"]), 3)

gnj = json.load(open(os.path.join(BL, "gradnorm.json")))["runs"]   # the root Block lab's per-block gradient norms (gradnorm.py, CPU)
gradnorm = {n: {w: [r(x, 9) for x in v[w]["per_block"]] for w in ("init", "trained")} for n, v in gnj.items()}
D = {"gradnorm": gradnorm, "runs": {n: {k: v for k, v in R.items() if not k.startswith("_")} for n, R in runs.items()}, "grid": grid, "spike": spike,
     "resid": resid, "mistakes": mist, "normbench": nb, "code": code}
exec(open(os.path.join(HERE, "page_text.py")).read())   # captions and production table (uses N, D, runs)

js = "// written by src/make_page_data.py from src/out and the root's Block lab runs; do not edit by hand\nwindow.NSD=" + json.dumps(D, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "22_js_ns_0data.js"), "w").write(js)
json.dump(N, open(os.path.join(OUT, "page_numbers.json"), "w"), indent=0, sort_keys=True)
print("NSD", len(js), "bytes;", len(runs), "runs;", len(N), "numbers")
