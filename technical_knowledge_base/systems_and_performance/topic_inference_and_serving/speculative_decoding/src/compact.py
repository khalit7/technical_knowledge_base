"""Copy the raw run outputs (kept outside the repository) into small files in results/.
usage: python3 -I compact.py <raw runs dir>
Drops per-sample data that only the statistics need (the 100,000 sampled openings are reduced to their test
statistics by scripts/stats.py first), local paths and anything else not used by the page."""
import json, os, re, sys, glob, statistics as st
RAW = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "results"); os.makedirs(O, exist_ok=True)
J = lambda p: json.load(open(p))
def put(name, obj):
    s = json.dumps(obj, separators=(",", ":"))
    s = re.sub(r'"[^"]*/models/', '"<models>/', s)  # never keep local paths
    open(os.path.join(O, name), "w").write(s); print(name, len(s))

# llama-bench pass-time curves: [n tokens, mean ms, sd ms]
for f in glob.glob(os.path.join(RAW, "lb_*.json")):
    rows = J(f); log = open(f[:-5] + ".log").read()
    curve = sorted([[r["n_prompt"], r["avg_ns"] / 1e6, r["stddev_ns"] / 1e6] for r in rows])
    put(os.path.basename(f), {"model": rows[0]["model_filename"].split("/")[-1], "build": rows[0].get("build_commit"), "n_depth": rows[0]["n_depth"],
                              "reps": rows[0].get("samples_ns") and len(rows[0]["samples_ns"]), "gpu": rows[0].get("gpu_info"), "curve": curve,
                              "load": re.findall(r"load_\w+ \{ ([\d. ]+) \}", log)})
# exactness test: statistics only
p = os.path.join(RAW, "exact_story_stats.json")
if os.path.exists(p):
    s = J(p); d = J(os.path.join(RAW, "exact_story.json"))
    for v in s["variants"].values():
        v["top_obs"] = [["".join(d["tokstr"][str(t)] for t in c), o, e] for c, o, e in v["top_obs"]]
    s["first"] = d["first"]; s["target"] = d["target"]; s["draft"] = d["draft"]
    put("exact_story_stats.json", s)
for n in ("floatcav.json", "floatcav2.json", "tree.json"):
    if os.path.exists(os.path.join(RAW, n)): put(n, J(os.path.join(RAW, n)))
if os.path.exists(os.path.join(RAW, "accept.json")):
    put("accept.json", J(os.path.join(RAW, "accept.json")))
if os.path.exists(os.path.join(RAW, "dists.json")):
    d = J(os.path.join(RAW, "dists.json"))
    for name, rows in d["texts"].items():
        for i, r in enumerate(rows):
            if not (0.3 <= r["a"] <= 0.8):
                r.pop("full", None)
    put("dists.json", d)
# server runs (crossover, drafters): summary plus per-request timings, no text
for sub in ("x", "dr", "dr_try1"):
    out = {}
    for f in sorted(glob.glob(os.path.join(RAW, sub, "*_B*.json"))):
        d = J(f)
        out[os.path.basename(f)[:-5]] = {"summary": d["summary"], "server_args": d.get("server_args"), "load_before": d.get("load_before"), "load_after": d.get("load_after"),
            "requests": [{k: r[k] for k in ("client", "round", "prompt", "n_out", "gen_ms", "tok_s", "prompt_n", "draft_n", "draft_acc")} for r in d["requests"]]}
    if out: put("server_%s.json" % sub, out)
