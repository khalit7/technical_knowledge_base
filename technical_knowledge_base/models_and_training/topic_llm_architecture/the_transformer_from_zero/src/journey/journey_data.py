"""journey_data.py: write parts/34_js_tj_0data.js (window.TJD) for the Token's journey tab, from recorded files only:
journey/out/journey.json (make_journey.py: one forward pass of the retrained baseline) and the page's recorded
ablation runs train/out/runs/tz_*.json (final held-out loss and the greedy sample). Stdlib only; build.sh runs it.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..")
J = json.load(open(os.path.join(HERE, "out", "journey.json")))


def run(n):
    return json.load(open(os.path.join(SRC, "train", "out", "runs", n + ".json")))


abl = {}
for key, name in [("base", "tz_base"), ("nopos", "tz_nopos"), ("noresid", "tz_noresid"), ("nonorm", "tz_nonorm"),
                  ("noffn", "tz_noffn"), ("noattn", "tz_noattn"), ("onehead", "tz_1head")]:
    d = run(name)
    abl[key] = {"val": d["final_val"], "greedy": d["samples"][0]["greedy"][:60]}
prompts = json.load(open(os.path.join(SRC, "..", "..", "src", "data", "eval_prompts.json")))["prompts"]
J["abl"] = abl
J["abl_prompt"] = prompts[0]                      # the greedy samples continue evaluation prompt 1
s = "// written by src/journey/journey_data.py from journey/out/journey.json and train/out/runs; do not edit by hand\n"
s += "window.TJD=" + json.dumps(J, ensure_ascii=False, separators=(",", ":")) + ";\n"
open(os.path.join(SRC, "parts", "34_js_tj_0data.js"), "w").write(s)
print("TJD", len(s), "bytes")
