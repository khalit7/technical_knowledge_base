"""Historical (the Memory wall tab was replaced by the KV-cache calculator on 2026-10-23); writes out/wl_data.js (window.WLD): real config.json files from the root's
src/data/configs/ (read-only), their manifest rows, and the root calc.py results the tab's defaults must reproduce
(src/calc/out/py_results.json). Run: python3 make_wall_data.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(H, "../../../src")
KEYS = ["llama-3.1-8b", "llama-3.1-70b", "llama-3.1-405b", "qwen3-32b", "mistral-7b-v0.1", "gemma-3-27b", "gpt-oss-120b",
        "qwen3-30b-a3b", "deepseek-v3", "nemotron-h-8b", "qwen3-next-80b-a3b", "smollm2-135m"]
man = {m["key"]: m for m in json.load(open(os.path.join(ROOT, "data/configs/manifest.json")))["models"]}
py = json.load(open(os.path.join(ROOT, "calc/out/py_results.json")))
LAB = {"llama-3.1-8b": "Llama 3.1 8B", "llama-3.1-70b": "Llama 3.1 70B", "llama-3.1-405b": "Llama 3.1 405B", "qwen3-32b": "Qwen3 32B",
       "mistral-7b-v0.1": "Mistral 7B v0.1", "gemma-3-27b": "Gemma 3 27B", "gpt-oss-120b": "gpt-oss-120b", "qwen3-30b-a3b": "Qwen3-30B-A3B",
       "deepseek-v3": "DeepSeek-V3", "llama-4-scout": "Llama 4 Scout", "nemotron-h-8b": "Nemotron-H 8B",
       "qwen3-next-80b-a3b": "Qwen3-Next-80B-A3B", "smollm2-135m": "SmolLM2-135M"}
models = []
for k in KEYS:
    mm = man[k]
    models.append({"key": k, "label": LAB[k], "cfg": json.load(open(os.path.join(ROOT, "data/configs", mm["file"]))),
                   "repo": mm["official_repo"], "rev": mm["revision"][:10], "kind": mm["kind"],
                   "ref": {c: py[k]["cache"][c] for c in ["4096", "32768", "131072"]},
                   "ref_total": py[k]["params"]["total"]})
out = {"date": "2026-10-18", "models": models}
s = "// written by src/wall/make_wall_data.py from the root's src/data/configs and src/calc/out; do not edit by hand\nwindow.WLD=" + json.dumps(out, separators=(",", ":")) + ";\n"
open(os.path.join(H, "out/wl_data.js"), "w").write(s)
print(len(s))
