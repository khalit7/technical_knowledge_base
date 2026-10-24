"""Bring the root Flow lab's recordings that this page now teaches (the objective, solvers at equal NFE, the t = 1
Heun trap, the convention bugs, guidance) into window.FMY (parts/22_js_fm_0more.js) and out/page_data_more.json.

Added 2026-10-24 when this page became the owner of flow matching (OWNERS.md) and absorbed the root Flow lab's
from-zero layer. Reads the root's built data part (../../src/parts/33_js_fw_0data.js, itself written by the root's
src/flow/make_page_data.py from src/flow/out) and never recomputes it. Plain Python, standard library only.
Run: python3 make_data_more.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_PART = os.path.join(HERE, "..", "..", "src", "parts", "33_js_fw_0data.js")
s = open(ROOT_PART).read()
W = json.loads(s[s.index("{"):s.rindex("}") + 1])
F = W["f"]

keep_f = ["params", "steps", "train_sec", "toy_params", "toy_sec", "cfm_lines", "fm_e1_fd", "fm_e1_acc", "fm_e1_div",
          "err_nfe", "err_e", "err_h", "err_m", "err_he", "err_m50", "err_m100", "toy_on_e4", "toy_on_h4", "toy_on_m4",
          "toy_on_e2", "toy_on_h2", "toy_on_m2", "img_m2", "img_e4", "img_m1", "img_e2", "img_h2", "img_he3", "img_he5",
          "cos_v_x", "cos_true", "cos_true_09", "pt0", "pt1", "ptmid", "st_fm", "st_dd", "st_rf", "pairs_n", "pairs_sec",
          "rf_steps", "rf_sec", "pairs_oor"]
Y = {"src": "root Flow lab recordings (src/flow/out via src/parts/33_js_fw_0data.js), read 2026-10-24",
     "f": {k: F[k] for k in keep_f},
     "err": W["err"], "he": W["he"], "cfg": W["cfg"], "per_t": W["per_t"],
     "code": {"cfm": W["code"]["cfm"], "samp": W["code"]["samp"]},
     "sheet": W["sheet"], "cols": W["cols"],
     "tiles": {k: W["tiles"][k] for k in ["fm_50", "bug_rev", "bug_t1000", "cfg_0", "cfg_1.5", "cfg_3"]}}
# sentences the root recorded with their numbers (kept verbatim; they are the lab's measured findings)
for k in ["bug_text", "cfg_text"]:
    Y["f"][k] = F[k]
cfg = {r["scale"]: r for r in W["cfg"]}
Y["f"]["cfg_best_fd"] = f'{cfg[1.5]["fd"]:.1f}'
Y["f"]["cfg_none_fd"] = f'{cfg[1]["fd"]:.1f}'
js = ("// Written by src/make_data_more.py from the root Flow lab's recorded data part. Do not edit by hand.\n"
      "window.FMY=" + json.dumps(Y, separators=(",", ":")) + ";\n")
open(os.path.join(HERE, "parts", "22_js_fm_0more.js"), "w").write(js)
json.dump({k: v for k, v in Y.items() if k != "sheet"}, open(os.path.join(HERE, "out", "page_data_more.json"), "w"), indent=0)
print("FMY", len(js) // 1024, "KB;", len(Y["f"]), "facts")
