#!/usr/bin/env python3
"""Build the data the page embeds: src/ft_data.json and parts/15_js_ft_data.js (do not edit those by hand).
Inputs: src/runs/*.json (this page's native runs, saved by ft_save_runs.py), src/inputs/tax.json and
src/inputs/rec.json (published numbers, curated by hand from the extracts in src/inputs/), and the root's
Failure lab data (../src/fail/fl_data.json, fl_recompute.json), read only.
Detectors applied to the bit-flip runs are defined here, once, and the page only displays their verdicts.
usage: python3 scripts/make_data.py
"""
import json, math, os, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
ROOT_FAIL = os.path.join(SRC, "..", "..", "src", "fail")
RUNS = os.path.join(SRC, "runs")


def run(name):
    return json.load(open(os.path.join(RUNS, name + ".json")))


def isnum(x):
    return isinstance(x, (int, float)) and not (isinstance(x, float) and math.isnan(x))


out = {"generated": "2026-10-16"}

# ---- stragglers: per-rank compute and all-reduce time per step, three runs
strag = {"slow": [
    {"rank": 2, "first": 80, "last": 159, "ms": 6, "every": 1, "what": "sustained: +6 ms sleep in forward on every step 80 to 159 (a throttled GPU)"},
    {"rank": 0, "first": 25, "last": 300, "ms": 20, "every": 25, "what": "periodic: +20 ms on every 25th step (work only rank 0 does, such as logging or an evaluation)"},
    {"rank": 3, "first": 200, "last": 300, "ms": 2, "every": 1, "what": "mild: +2 ms on every step 200 to 300"}], "runs": {}}
for n in ("strag_none", "strag_mix", "strag_mix2"):
    r = run(n)
    strag["runs"][n] = {"steps": r["steps"], "gloss_last": r["gloss"][-1],
                        "compute": [r["ranks"][str(k)]["compute_ms"] for k in range(4)],
                        "comm": [r["ranks"][str(k)]["comm_ms"] for k in range(4)],
                        "step": [r["ranks"][str(k)]["step_ms"] for k in range(4)]}
assert len({strag["runs"][n]["gloss_last"] for n in strag["runs"]}) == 1, "stragglers must not change the loss"
out["strag"] = strag

# ---- bit flips: detectors on every run, against the clean run
clean = run("sdc_clean")
W = 20


def spike_flags(xs):
    """Robust loss-spike / norm detector: value non-finite, or more than 6 MADs from the median of the last 20."""
    flags = []
    for i, x in enumerate(xs):
        if not isnum(x):
            flags.append(True); continue
        win = [v for v in xs[max(0, i - W):i] if isnum(v)]
        if len(win) < W:
            flags.append(False); continue
        med = st.median(win); mad = st.median(abs(v - med) for v in win) or 1e-12
        flags.append(abs(x - med) > 6 * mad)
    return flags


def norm_flags(xs):
    """Gradient-norm monitor: non-finite, or more than 10 times the median of the last 20 steps."""
    flags = []
    for i, x in enumerate(xs):
        if not isnum(x):
            flags.append(True); continue
        win = [v for v in xs[max(0, i - W):i] if isnum(v)]
        flags.append(len(win) == W and x > 10 * st.median(win))
    return flags


base_spikes = [s for s, f in zip(clean["steps"], spike_flags(clean["gloss"])) if f]
base_norm = [s for s, f in zip(clean["steps"], norm_flags(clean["gnorm"])) if f]
sdc = {"clean": {"gloss": clean["gloss"], "gnorm": clean["gnorm"], "false_spikes": base_spikes, "false_norm": base_norm},
       "runs": {}, "window": W}
LABEL = {"grad_lo": "gradient, low mantissa bit (bit 3)", "grad_mid": "gradient, exponent bit 27",
         "grad_hi": "gradient, top exponent bit (bit 30)", "w_lo": "weight, low mantissa bit (bit 3)",
         "w_mid": "weight, exponent bit 27", "w_hi": "weight, top exponent bit (bit 30)"}
for n in LABEL:
    r = run(n)
    g = r["gloss"]
    diff = [None if not isnum(a) else a - b for a, b in zip(g, clean["gloss"])]
    first = next((s for s, d in zip(r["steps"], diff) if d is None or d != 0), None)
    nan = next((s for s, x in zip(r["steps"], g) if not isnum(x)), None)
    ck = next((s for s, c in zip(r["steps"], r["cks_agree"]) if not c), None)
    sp = [s for s, f in zip(r["steps"], spike_flags(g)) if f and s >= 101]
    nf = [s for s, f in zip(r["steps"], norm_flags(r["gnorm"])) if f and s >= 101]
    rec = {"label": LABEL[n], "flip": r["flip"], "first_diff": first, "n_diff": sum(1 for d in diff if d is None or d != 0),
           "max_abs_diff": max((abs(d) for d in diff if d is not None), default=0), "nan_step": nan, "cks_first": ck,
           "spike_first": sp[0] if sp else None, "norm_first": nf[0] if nf else None,
           "gnorm_flip": r["gnorm"][r["flip"]["step"] - 1], "gnorm_clean_flip": clean["gnorm"][r["flip"]["step"] - 1],
           "final": g[-1], "final_clean": clean["gloss"][-1],
           "diff": [None if d is None else d for d in diff],
           "loss_r2": [x if isnum(x) else None for x in r["ranks"]["2"]["loss"]]}
    rp = os.path.join(RUNS, "rp_" + n + ".json")
    if os.path.exists(rp):
        p = json.load(open(rp))
        mism = []
        for i, s in enumerate(p["steps"]):
            j = r["steps"].index(s)
            for k in range(4):
                if p["ranks"][str(k)]["lgh"][i] != r["ranks"][str(k)]["lgh"][j]:
                    mism.append([s, k])
        rec["replay"] = {"from": p["steps"][0] - 1, "to": p["steps"][-1], "first": mism[0] if mism else None,
                         "first_step_ranks": [k for s, k in mism if mism and s == mism[0][0]],
                         "equals_clean": all(a == b for a, b in zip(p["gloss"], clean["gloss"][p["steps"][0] - 1:p["steps"][-1]]))}
    sdc["runs"][n] = rec
out["sdc"] = sdc

# ---- the root Failure lab (read only): measured recovery times reused by the Recovery designs tab
fl = json.load(open(os.path.join(ROOT_FAIL, "fl_data.json")))
flr = json.load(open(os.path.join(ROOT_FAIL, "fl_recompute.json")))
# The root Failure lab's recorded data, whole (since 2026-10-19 this page also draws the lab's checkpoint, bit-for-bit,
# straggler, elastic and goodput charts that moved here from the root); the root's files stay the single source.
out["fl"] = dict(fl)
out["fl"].update({"rates": flr["rates"], "t5": flr["t5"], "replay": flr["replay"]})

# ---- published data curated from the extracts
for k in ("tax", "rec"):
    p = os.path.join(SRC, "inputs", k + ".json")
    if os.path.exists(p):
        out[k] = json.load(open(p))

txt = json.dumps(out, separators=(",", ":"), allow_nan=False)
open(os.path.join(SRC, "ft_data.json"), "w").write(json.dumps(out, indent=1, allow_nan=False))
open(os.path.join(SRC, "parts", "15_js_ft_data.js"), "w").write("// generated by scripts/make_data.py from src/runs, src/inputs and the root's Failure lab: do not edit\nwindow.FT=" + txt + ";\n")
print("bytes", len(txt))
for n, r in sdc["runs"].items():
    print(n, {k: r[k] for k in ("first_diff", "n_diff", "max_abs_diff", "nan_step", "cks_first", "spike_first", "norm_first", "gnorm_flip")}, r.get("replay", {}).get("first"))
print("clean false spikes", base_spikes, "false norm", base_norm)
