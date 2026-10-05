"""Write parts/20_js_data.js (window.LA_DATA) from inputs/gpt2_la.json. Run: python3 src/mk_data.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(H, "inputs", "gpt2_la.json")))
g = lambda v, n: float(("%." + str(n) + "g") % v)
out = {"model": d["model"], "revision": d["revision"], "layer": d["layer"], "tokens": d["tokens"], "base_loss": round(d["base_loss"], 4),
       "mats": {}, "whole": d["whole"], "emb_words": [w.strip() for w in d["emb_words"]], "emb_cos": d["emb_cos"],
       "emb_rand_cos_mean": d["emb_rand_cos_mean"], "emb_rand_cos_sd": d["emb_rand_cos_sd"], "emb_mean_ratio": d["emb_mean_norm_over_avg_norm"],
       "head0_qk_rank": d["head0_qk_rank_tol"], "head0_qk_sv": [g(v, 3) for v in d["head0_qk_sv"]],
       "wte": {"shape": [d["vocab"], 768], "s": [g(v, 4) for v in d["wte_s"]]}, "lora": []}
for n, m in d["mats"].items():
    out["mats"][n] = {"shape": m["shape"], "s": [g(v, 4) for v in m["s"]], "rand_s": [g(v, 3) for v in m["rand_s"]],
                      "out_err": [g(v, 3) for v in m["out_err"]], "loss_k": m["loss_k"]}
for L in d["lora"]:
    out["lora"].append({"name": L["name"], "rev": d["lora_sources"][L["name"]], "r": L["r"], "alpha": L["alpha"], "layers": [
        {"layer": r["layer"], "s": [g(v, 4) for v in r["dW_s"][:L["r"] + 1]], "dW_fro": round(r["dW_fro"], 4), "W_fro": round(r["W_fro"], 2),
         "amp": round(r["q_amplification"], 3), "proj_dW": round(r["q_proj_dW"], 3), "proj_W": round(r["q_proj_W"], 2), "proj_rand": round(r["q_proj_rand"], 3)}
        for r in L["layers"]]})
s = "window.LA_DATA=" + json.dumps(out, separators=(",", ":")) + ";\n"
open(os.path.join(H, "parts", "20_js_data.js"), "w").write(s)
print(len(s))
