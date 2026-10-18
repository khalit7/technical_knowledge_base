"""Build the page's data from the recorded outputs in src/ (never from scratch files), so the page rebuilds from the repo.

Inputs:  src/runs/logs/<run>.json (training logs copied from the runs, trimmed), src/analysis/out/<run>.json,
         src/ep/out/*.json, src/code/out/*.json, src/inputs/moe_configs.json, the root's Config calculator data.
Outputs: parts/22_js_mx_0data.js (window.MXD), src/page_text.json (facts and text blocks for the [[...]] placeholders),
         src/analysis/out/router_probs_8tok.json (for the root's Reading animation).
Every number shown in prose comes from page_text.json, which fill.py writes into the built page.
"""
import base64, glob, json, math, os, subprocess
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "src"))
J = lambda *p: os.path.join(HERE, *p)

RUNS = [  # key, run name, label, short
    ("dense", "ref_baseline_s1500", "Dense FFN (root reference run)", "dense"),
    ("moe8", "mx_moe8top2", "8 experts, top 2, softmax, aux loss", "8e top-2 aux"),
    ("moe16s", "mx_moe16top3_shared", "16 experts + 1 shared, top 3, aux loss", "16+1 top-3 aux"),
    ("bias", "mx_moe8top2_bias", "8 experts, top 2, sigmoid, bias (no loss)", "8e sigmoid bias"),
    ("sbias", "mx_moe8top2_sbias", "8 experts, top 2, softmax, bias (no loss)", "8e softmax bias"),
    ("none", "mx_moe8top2_none", "8 experts, top 2, softmax, no balancing", "8e no balancing"),
    ("cap1", "mx_moe8top2_cap1", "8 experts, top 2, aux loss, capacity factor 1.0 in training", "8e aux CF 1.0"),
    ("moe8_s1", "mx_moe8top2_s1", "8 experts, top 2, aux loss, seed 1", "8e aux seed 1"),
    ("dense_s1", "mx_baseline_s1", "Dense FFN, seed 1", "dense seed 1"),
]


def dq(x, n):
    """Exact half-up rounding to n decimals (stable across Python versions)."""
    return float(Decimal(repr(float(x))).quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP))


def b64(vals):
    return base64.b64encode(bytes(int(max(0, min(255, v))) for v in vals)).decode()


def load_json(p):
    return json.load(open(p)) if os.path.exists(p) else None


def log_summary(key, name):
    lg = load_json(J("runs", "logs", name + ".json"))
    if not lg:
        return None
    tr = lg["train"]
    out = {"status": lg["status"], "final": lg["final_val_loss"], "seconds": lg["seconds"], "tok_s": lg["median_tok_s"],
           "mps_mb": lg.get("mps_driver_mb_peak_sampled"), "eval": [[e["step"], dq(e["val_loss"], 4)] for e in lg["eval"]],
           "train": [[r["step"], dq(r["loss"], 3)] for r in tr if r["step"] % 50 == 0 or r["step"] == tr[-1]["step"]],
           "params": lg["params"], "config": {k: lg["config"].get(k) for k in ("n_experts", "top_k", "n_shared", "moe_hidden",
                                                                              "router", "balance", "capacity_factor")}}
    if lg["config"].get("n_experts"):
        E = lg["config"]["n_experts"]
        L = len(tr[0]["moe_load"])
        steps = [r["step"] for r in tr]
        shares = []
        mv = []
        for r in tr:
            row = []
            for l in r["moe_load"]:
                s = sum(l)
                row += [round(255 * v / s) for v in l]
            shares += row
            mv.append([dq((max(l) - s_ / E) / (s_ / E), 2) for l in r["moe_load"] for s_ in [sum(l)]])
        out["load"] = {"steps": steps, "E": E, "L": L, "shares_b64": b64(shares), "maxvio": mv,
                       "aux": [dq(r.get("aux", 0), 4) for r in tr], "dropped": [r.get("dropped", []) for r in tr]}
    return out


def analysis(name):
    return load_json(J("analysis", "out", name + ".json"))


def main():
    pieces = json.load(open(os.path.join(ROOT_SRC, "data", "running_sequence.json")))["pieces"]
    D = {"date": "2026-10-18", "runs": {}, "pieces": pieces}
    T = {}  # facts and text blocks for the placeholders
    for key, name, label, short in RUNS:
        s = log_summary(key, name)
        a = analysis(name)
        if s is None:
            continue
        r = {"name": name, "label": label, "short": short, "log": s}
        if a:
            h = a["heldout"]
            r["heldout"] = {"loss": h["loss"]}
            if "load" in h:
                r["heldout"].update({"maxvio": h["maxvio_global"], "maxvio_batch": h["maxvio_batch"],
                                     "share": [[dq(v / sum(l), 4) for v in l] for l in h["load"]],
                                     "top1": [[dq(v / sum(l), 4) for v in l] for l in h["top1"]]})
                run = a["running"]
                E = a["config"]["n_experts"]
                r["seq"] = {"top": ["".join("0123456789abcdef"[e] for t in L["top_i"] for e in t) for L in run["layers"]],
                            "k": len(run["layers"][0]["top_i"][0]),
                            "w1": [[dq(t[0], 2) for t in L["top_w"]] for L in run["layers"]],
                            "scores64_b64": [b64(round(255 * v) for row in L["scores64"] for v in row) for L in run["layers"]],
                            "logits8": [[[dq(v, 2) for v in row] for row in L["logits8"]] for L in run["layers"]],
                            "bias": [L["e_bias"] for L in run["layers"]], "E": E}
                r["iv"] = {"cf": {k: {"loss": v["loss"], "drop": v["dropped_assign_frac"], "alldrop": v["tokens_all_dropped_frac"]}
                                  for k, v in a["cf_sweep"].items()},
                           "cf_batch": {k: {"loss": v["loss"], "drop": v["dropped_assign_frac"]} for k, v in a["cf125_by_batch"].items()},
                           "topk": a["topk_infer"], "mask": a["mask_top"], "no_shared": a.get("no_shared"),
                           "no_shared_plus1": a.get("no_shared_plus1"), "entropy": a["entropy_top1"]}
                r["special"] = [{"det": sp["determinism"], "ex": [[t[:3] for t in e[:4]] for e in sp["experts"]]} for sp in a["special"]]
            r["samples"] = a["samples"]
            r["seq_loss"] = a["running"]["mean_loss"]
        D["runs"][key] = r
    # expert parallel run
    ep = sorted(glob.glob(J("ep", "out", "ep_mx_moe8top2_*.json")))
    if ep:
        D["ep"] = json.load(open(ep[0]))
    D["code"] = {r["key"]: [r["file"], r["line"]] for r in json.load(open(J("code", "out", "code_refs.json")))["refs"]}
    D["cfgs"] = json.load(open(J("inputs", "moe_configs.json")))["rows"]
    # Config calculator models (the root's data, same formulas): MoE models and a few dense ones for comparison
    ccd = open(os.path.join(ROOT_SRC, "parts", "33_js_cc_0data.js")).read()
    ccd = json.loads(ccd[ccd.index("{"):ccd.rstrip().rstrip(";").rindex("}") + 1])
    keep = ["mixtral-8x7b", "gpt-oss-20b", "gpt-oss-120b", "qwen3-30b-a3b", "qwen3-235b-a22b", "llama-4-scout", "llama-4-maverick",
            "glm-4.5-air", "glm-4.5", "minimax-m2", "deepseek-v2", "deepseek-v3", "kimi-k2", "qwen3-next-80b-a3b",
            "granite-4.0-h-small", "jamba-v0.1", "llama-3.1-8b", "llama-3.1-70b", "llama-3.1-405b", "qwen3-32b"]
    D["cc"] = [{k: m[k] for k in ("key", "label", "kind", "cfg", "pub")} for m in ccd["models"] if m["key"] in keep]
    # CC numbers via node (the root's core, run unchanged)
    js = ("global.window={};const fs=require('fs');eval(fs.readFileSync(process.argv[1],'utf8'));"
          "const D=JSON.parse(fs.readFileSync(0,'utf8'));const o={};for(const m of D){const p=window.CC.params(window.CC.normalise(m.cfg));"
          "o[m.key]={total:p.total,active:p.active,ane:p.active_no_emb,b:p.breakdown}};console.log(JSON.stringify(o))")
    cc = json.loads(subprocess.run(["node", "-e", js, os.path.join(ROOT_SRC, "parts", "33_js_cc_1core.js")],
                                   input=json.dumps(D["cc"]), capture_output=True, text=True, check=True).stdout)
    facts(D, T, cc)
    os.makedirs(J("parts"), exist_ok=True)
    with open(J("parts", "22_js_mx_0data.js"), "w") as f:
        f.write("// written by src/make_page_data.py from the recorded outputs in src/; do not edit by hand\n")
        f.write("window.MXD=" + json.dumps(D, separators=(",", ":")) + ";\n")
    json.dump(T, open(J("page_text.json"), "w"), indent=1, ensure_ascii=False)
    print("data bytes", os.path.getsize(J("parts", "22_js_mx_0data.js")), "runs", list(D["runs"]), "facts", len(T))


def facts(D, T, cc):
    import page_text
    page_text.build(D, T, cc, dq)


if __name__ == "__main__":
    import sys
    sys.path.insert(0, HERE)
    main()
