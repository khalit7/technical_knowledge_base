"""Config explorer data: for each flag on the page, its line in base.yml (main 1a95d1e5), the default as written,
the comment beside it and the comment block above it, the value in a few model files when they set it, and the
value MaxText's parser produced for the running example (../out/cfg.json). Explanations ('what') are this page's.
Run: python3 -B lc_cfgdata.py (needs JX_SCRATCH) -> ../out/cfgdata.json"""
import os, re, json
JX = os.environ["JX_SCRATCH"]; HERE = os.path.dirname(os.path.abspath(__file__))
CFGDIR = os.path.join(JX, "src", "maxtext", "src", "maxtext", "configs")
base = open(os.path.join(CFGDIR, "base.yml"), encoding="utf-8").read().split("\n")
MODELS = ["llama2-7b", "llama3.1-8b", "llama3.1-70b", "gemma3-27b", "mixtral-8x7b", "deepseek3-671b", "qwen3-30b-a3b", "gpt3-52k"]
def keys_of(lines):
    d = {}
    for i, l in enumerate(lines):
        m = re.match(r"^([A-Za-z_0-9]+):\s*(.*)$", l)
        if m: d[m.group(1)] = (i, m.group(2))
    return d
B = keys_of(base)
MV = {}
for m in MODELS:
    ml = open(os.path.join(CFGDIR, "models", m + ".yml"), encoding="utf-8").read().split("\n")
    MV[m] = {k: v[1].split(" #")[0].strip() for k, v in keys_of(ml).items()}
runex = json.load(open(os.path.join(HERE, "..", "out", "cfg.json")))
RX = next(r for r in runex["runs"] if r["label"].startswith("running example"))
OVR = runex["runex_overrides"]

FLAGS = json.load(open(os.path.join(HERE, "cfg_flags.json")))   # [{key, group, what}] written for this page
rows = []
for f in FLAGS:
    k = f["key"]; assert k in B, k
    i, raw = B[k]
    val, _, comment = raw.partition(" #")
    above = []
    j = i - 1
    while j >= 0 and base[j].startswith("#") and len(above) < 6:
        above.insert(0, base[j].lstrip("# ").rstrip()); j -= 1
    if k == "logical_axis_rules": val = "[ ... 80 rules ... ]"
    rows.append({"key": k, "group": f["group"], "what": f["what"], "line": i + 1, "default": val.strip()[:120],
                 "comment": comment.strip()[:300], "above": " ".join(above)[:500],
                 "models": {m: MV[m][k][:60] for m in MODELS if k in MV[m]},
                 "runex": OVR.get(k)})
out = {"commit": "1a95d1e5", "base_lines": len(open(os.path.join(CFGDIR, "base.yml"), encoding="utf-8").read().splitlines()), "base_top_level_keys": len(B), "models": MODELS,
       "n_model_files": len([f for f in os.listdir(os.path.join(CFGDIR, "models")) if f.endswith(".yml")]),
       "rows": rows}
json.dump(out, open(os.path.join(HERE, "..", "out", "cfgdata.json"), "w"), indent=1)
print(len(rows), out["base_lines"], out["base_top_level_keys"], out["n_model_files"])
