"""Write the page's data parts from the recorded outputs in out/ (never by hand).

  parts/33_js_ky_0data.js  window.AVK  (Which keys are read: explorer rows, top-k statistics)
  parts/22_js_rd_0data.js  window.AVR  (Reading: runs, window sweep, sinks, MLA checks, conversions)
Run: python3 make_page_data.py   (reads out/*.json only; no scratch needed)
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
O = lambda n: json.load(open(os.path.join(HERE, "out", n)))


def pct(x):
    return f"{100 * x:.0f}%"


def keys():
    t = O("topk_mass.json")
    ex = t["explorer"]
    S, T = t["smollm2"]["layers"], t["tiny_at_mha"]["layers"]
    deep = [r for r in S if r["layer"] >= 13]
    lo = min(r["topk"]["16"] for r in deep); hi = max(r["topk"]["16"] for r in deep)
    wlo = min(r["window64_plus_tok0"] for r in deep); whi = max(r["window64_plus_tok0"] for r in deep)
    s0 = min(r["topk_no_tok0"]["16"] for r in deep); s1 = max(r["topk_no_tok0"]["16"] for r in deep)
    say = {
        "smollm2": (f"In SmolLM2's layers 13 to 30, a query's own top 16 keys (of at least 257) hold {pct(lo)} to {pct(hi)} of its attention; "
                    f"without position 0 (the sink) the same 16 hold {pct(s0)} to {pct(s1)}. The last 64 keys plus position 0 hold only "
                    f"{pct(wlo)} to {pct(whi)}: attention is concentrated, but not on the most recent tokens, which is why DSA and NSA select "
                    f"by score instead of by distance. Layer 1 is the exception (top 16: {pct(S[0]['topk']['16'])}): early layers spread their attention."),
        "tiny_at_mha": (f"The tiny GPT, at 256 tokens, is more local: in layers 2 to 6 the last 64 keys already hold "
                        f"{pct(min(r['window64'] for r in T[1:]))} to {pct(max(r['window64'] for r in T[1:]))}, and it puts almost nothing on position 0 "
                        f"(at most {100 * max(r['tok0'] for r in T):.1f}%): no sink formed in 12.3M training tokens, as the root's Attention and Inside labs found."),
    }
    data = {"note": "written by src/make_page_data.py from out/topk_mass.json; do not edit by hand",
            "tokens": ex["tokens"], "queries": ex["queries"], "layers": ex["layers"],
            "rows": [{k: r[k] for k in ("layer", "q", "mean_max", "mean", "head", "head_max", "head_row")} for r in ex["rows"]],
            "stats": {"smollm2": {"block": t["smollm2"]["block"], "layers": S},
                      "tiny_at_mha": {"block": t["tiny_at_mha"]["block"], "layers": T}},
            "say": say}
    open(os.path.join(HERE, "parts", "33_js_ky_0data.js"), "w").write(
        "// written by src/make_page_data.py from out/topk_mass.json; do not edit by hand\nwindow.AVK=" +
        json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")
    return data


def reading():
    p = os.path.join(HERE, "out", "runs_eval.json")
    if not os.path.exists(p):
        return None
    R = O("runs_eval.json")
    data = {"note": "written by src/make_page_data.py; do not edit by hand",
            "runs": {r["run"]: {k: r[k] for k in ("val_loss_20win", "val_loss_100win", "running_seq_loss", "params", "median_tok_s", "seconds", "config", "gate", "eval_curve")} for r in R["runs"]},
            "window_sweep": R["window_sweep"], "sinks": R["sinks"],
            "kv_rank": O("kv_rank.json"), "uptrain": O("uptrain.json") if os.path.exists(os.path.join(HERE, "out", "uptrain.json")) else None,
            "mla": O("mla_absorb.json"), "code": json.load(open(os.path.join(HERE, "inputs", "code_quotes.json"))),
            "run_pieces": json.load(open(os.path.join(HERE, "..", "..", "src", "data", "running_sequence.json")))["pieces"]}
    open(os.path.join(HERE, "parts", "22_js_rd_0data.js"), "w").write(
        "// written by src/make_page_data.py from out/*.json; do not edit by hand\nwindow.AVR=" +
        json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")
    return data


if __name__ == "__main__":
    k = keys()
    print("keys", len(json.dumps(k)), "bytes")
    r = reading()
    print("reading", len(json.dumps(r)) if r else "pending")
