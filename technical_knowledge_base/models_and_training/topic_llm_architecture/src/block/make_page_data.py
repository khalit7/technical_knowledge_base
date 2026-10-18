"""Block lab: write parts/31_js_bl_0data.js (window.BLD) from the recorded outputs in src/block/out/.
Vectors are stored as int8 with one scale per vector (value = int8 x scale), attention rows as uint8 of the row
maximum; everything else verbatim. Run: python3 src/block/make_page_data.py
"""
import base64, json, os
from array import array

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
PART = os.path.join(HERE, "..", "parts", "31_js_bl_0data.js")
DATA = os.path.join(HERE, "..", "data")

PRE, POST = os.environ.get("BL_PRE", "bl_pre_lr1e-3"), os.environ.get("BL_POST", "bl_post_lr1e-3")   # the pair compared at an equal, stable learning rate
TRACE = "ref_baseline_s1500"                      # the trained reference model of the running example


def q8(v):
    m = max(abs(x) for x in v) or 1.0
    s = m / 127.0
    a = array("b", [max(-127, min(127, round(x / s))) for x in v])
    return [float("%.6g" % s), base64.b64encode(a.tobytes()).decode()]


def u8(v):
    m = max(v) or 1.0
    a = array("B", [max(0, min(255, round(x / m * 255))) for x in v])
    return [float("%.6g" % m), base64.b64encode(a.tobytes()).decode()]


def j(name):
    return json.load(open(os.path.join(OUT, name)))


def main():
    t = j(f"trace_{TRACE}.json")
    seq = json.load(open(os.path.join(DATA, "running_sequence.json")))
    P = t["pos"]
    layers = []
    for L in t["layers"]:
        d = {k: q8(L[k]) for k in ("x_in", "norm1", "q", "k", "v", "head_out", "attn_out", "x_mid", "norm2", "ffn_up", "ffn_act", "ffn_out", "x_out")}
        d["attn"] = [u8(row) for row in L["attn"]]
        d["ent"] = L["stats"]["attn_entropy_bits"]
        d["gneg"] = L["stats"]["gelu_neg_frac"]; d["gsmall"] = L["stats"]["gelu_small_frac"]
        layers.append(d)
    trace = {"run": TRACE, "pos": P, "piece": t["token"], "id": t["token_id"], "next": t["next_token"],
             "pieces": seq["pieces"][:P + 1], "embed": {k: q8(v) for k, v in t["embed"].items()}, "layers": layers,
             "final": {"norm_f": q8(t["final"]["norm_f"]), "top": t["final"]["top"], "p_next": t["final"]["p_next"],
                       "err": t["final"]["check_max_abs_err_vs_model_forward"]}, "config": t["config"]}
    norms = {}
    for key, fn in (("pre", f"trace_{PRE}.json"), ("pre_init", f"trace_{TRACE}_init.json"),
                    ("post", f"trace_{POST}.json"), ("post_init", f"trace_{POST}_init.json")):
        if os.path.exists(os.path.join(OUT, fn)):
            n = j(fn)
            norms[key] = {**n["norms"], "run": n["run"], "init": n["init"], "p_next": n["final"]["p_next"]}
    runs = {}
    for fn in sorted(os.listdir(os.path.join(OUT, "runs"))):
        r = json.load(open(os.path.join(OUT, "runs", fn)))
        tr = [x for x in r["train"] if x[0] % 20 == 0 or x[0] == r["train"][-1][0]]
        runs[r["name"]] = {k: r[k] for k in ("norm_pos", "lr", "warmup", "status", "steps_done", "final_val_loss", "seconds", "median_tok_s", "tokens_seen")}
        runs[r["name"]]["eval"] = r["eval"]
        runs[r["name"]]["train"] = [[x[0], x[1], x[2]] for x in tr]
    fl = j("flops.json")
    flops = {k: {"by_op": v["counter_by_op"], "total": v["counter_total"], "formula_total": v["formula_total"], "match": v["match"],
                 "train": v["train_step_counter_T255"], "fwd255": v["forward_formula_T255"], "ratio": v["train_over_forward"],
                 "params": v["params"]} for k, v in fl["presets"].items()}
    mi = j("mistakes.json")
    cr = j("code_refs.json")
    BLD = {"date": "2026-10-18", "trace": trace, "norms": norms, "runs": runs, "grad": j("gradnorm.json"),
           "flops": {"T": fl["T"], "torch": fl["torch"], "presets": flops},
           "mist": {"baseline_loss": mi["baseline_loss"], "baseline_greedy": mi["baseline_greedy"], "cases": mi["cases"], "errors": mi["errors"]},
           "code": {"version": cr["version"], "commit": cr["commit"], "file": cr["file"],
                    "refs": [{k: r[k] for k in ("key", "what", "line", "end", "text")} for r in cr["refs"]]},
           "uni": j("unigram.json"), "pair": {"pre": PRE, "post": POST}}
    s = "// written by src/block/make_page_data.py from src/block/out/; do not edit by hand\nwindow.BLD=" + json.dumps(BLD, separators=(",", ":")) + ";\n"
    assert "—" not in s
    open(PART, "w").write(s)
    print(PART, len(s), "bytes")


if __name__ == "__main__":
    main()
