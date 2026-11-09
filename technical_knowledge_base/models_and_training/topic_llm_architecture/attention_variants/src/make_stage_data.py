"""Write parts/22_js_rd_0bench.js (window.AVB) for two 3D stages: the decode timings at 32,768 cached tokens that section 1 quotes (Fig. 2),
and SmolLM2-135M's sink measurements that section 6 quotes (Fig. 7).

Sources, read only (never edited here):
  the topic root's src/attn/out/decode_bench.json: one attention layer at Llama 3.1 8B's shape, batch 4, fp16, Apple M1 Pro MPS
    (the run made for the root's former Attention lab, which this page now carries);
  the topic root's src/inside/out/smol.json: the Inside lab's SmolLM2-135M run (weight on token 0 by layer, "sink_layer";
    loss with a 64-token sliding cache with and without the first tokens kept, "win").
Run: python3 make_stage_data.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "src", "attn", "out", "decode_bench.json")
d = json.load(open(SRC))
rows = [r for r in d["part_a"] if r["ctx"] == 32768]
keep = ["mha", "gqa8", "mla_absorbed", "mqa", "gqa8_repeat_kv"]
out = {"note": "written by src/make_stage_data.py from the topic root's src/attn/out/decode_bench.json; do not edit by hand",
       "device": d["device"], "date": d["date"], "ctx": 32768, "batch": rows[0]["batch"],
       "rows": [{k: r[k] for k in ("variant", "kv_heads", "cache_bytes", "ms_median")} for v in keep for r in rows if r["variant"] == v]}
sm = json.load(open(os.path.join(HERE, "..", "..", "src", "inside", "out", "smol.json")))
w = sm["win"]
out["sink"] = {"revision": sm["revision"], "tok0_by_layer": sm["sink_layer"],
               "win": {"T": w["T"], "W": w["W"], "n_sink": w["n_sink"], **{k: w[k]["loss_after_W"] for k in ("full", "window", "window_sink", "window_sink1")}}}
open(os.path.join(HERE, "parts", "22_js_rd_0bench.js"), "w").write(
    "// written by src/make_stage_data.py from the topic root's src/attn/out/decode_bench.json; do not edit by hand\nwindow.AVB=" +
    json.dumps(out, separators=(",", ":")) + ";\n")
print(len(out["rows"]), "rows;", len(out["sink"]["tok0_by_layer"]), "layers")
