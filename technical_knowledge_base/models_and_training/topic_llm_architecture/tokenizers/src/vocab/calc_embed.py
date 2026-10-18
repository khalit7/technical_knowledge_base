"""Embedding and unembedding share of every config in the root's Config calculator, read from its recorded results
(src/calc/out/py_results.json, calc.py's breakdown, validated to residual 0 against the Hub counts) and the running
example's configs (src/data/configs/). Nothing is recomputed differently from the calculator: shares are
(token embedding V x d + unembedding) / total (learned position tables, which the calculator files under
"embedding", are reported apart), where a tied model's unembedding is 0.
Run: python3 calc_embed.py -> ../out/calc_embed.json
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
R = json.load(open(os.path.join(ROOT, "calc", "out", "py_results.json")))
M = {m["key"]: m for m in json.load(open(os.path.join(ROOT, "data", "configs", "manifest.json")))["models"]}
rows = []
for k, r in R.items():
    c = json.load(open(os.path.join(ROOT, "data", "configs", k + ".json")))
    tc = c.get("text_config") or c
    V = tc.get("vocab_size") or c.get("vocab_size"); d = tc.get("hidden_size") or tc.get("n_embd") or tc.get("d_model")
    b = r["params"]["breakdown"]; tot = r["params"]["total"]
    e, u = b["embedding"], b["unembedding"]
    pos = e - V * d; assert pos >= 0, (k, e, V, d)  # the calculator counts learned position tables (GPT-2) in "embedding"
    e = V * d
    rows.append({"key": k, "V": V, "d": d, "tied": u == 0, "embedding": e, "position": pos, "unembedding": u, "total": tot,
                 "active": r["params"]["active"], "share_total": round((e + u) / tot, 4),
                 "share_active": round((e + u) / r["params"]["active"], 4),
                 "head_flops_per_token": 2 * V * d, "decode_flops_1": r["flops"]["1"]["decode"],
                 "date": M.get(k, {}).get("hf_created"), "kind": M.get(k, {}).get("kind"), "config_url": M.get(k, {}).get("config_url"),
                 "repo": M.get(k, {}).get("official_repo")})
rows.sort(key=lambda x: x["total"])
json.dump({"source": "Topic: llm-architecture src/calc/out/py_results.json (calc.py), read 2026-10-18", "rows": rows},
          open(os.path.join(HERE, "..", "out", "calc_embed.json"), "w"), indent=1)
for x in rows: print(f'{x["key"]:22s} V={x["V"]:>7} d={x["d"]:>6} tied={x["tied"]!s:5} total={x["total"]/1e9:9.3f}B share={x["share_total"]:.4f} active_share={x["share_active"]:.4f} head/decode={x["head_flops_per_token"]/x["decode_flops_1"]:.3f} {x["date"]}')
