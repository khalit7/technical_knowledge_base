"""Write the page's data part, parts/22_js_rd_0data.js (window.BAD), from the recorded outputs in src/*/out/.

Inputs: runs/out/runs.json, state/out/state_rules.json, mem/out/statecalc.json (+ the configs it names, pruned, for the
in-page calculator, which runs the root's window.CC), recall/out/{pretrained_copy,tiny_recall}.json and
recall/out/mqar/*.json, inside/out/ssm_inside.json. Missing inputs are left out (the page then shows a pending note).
Run: python3 src/make_page_data.py
"""
import base64, glob, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(HERE, *p)))
EX = lambda *p: os.path.exists(os.path.join(HERE, *p))
KEEP_DICTS = {"text_config", "linear_attn_config", "rope_scaling", "ssm_cfg", "rope_parameters"}


def prune(c):
    out = {}
    for k, v in c.items():
        if isinstance(v, dict):
            if k in KEEP_DICTS: out[k] = prune(v)
        elif isinstance(v, list):
            if len(v) <= 200 and all(not isinstance(x, (dict, list)) for x in v): out[k] = v
        else:
            out[k] = v
    return out


def main():
    D = {"date": "2026-10-19"}
    if EX("runs", "out", "runs.json"):
        rr = J("runs", "out", "runs.json")["runs"]
        D["runs"] = [{k: r[k] for k in ("run", "label", "owner", "layer_types", "pos", "params", "val", "rs", "tok_s",
                                       "seconds", "seed", "kv_256_bf16", "state_fp32", "curve", "sample")} for r in rr]
        D["rs_tokens"] = {r["run"]: [round(x, 2) for x in r["rs_tokens"]] for r in rr
                          if r["run"] in ("at_mha", "ba_ssm", "ba_hybrid", "ba_hybrid2", "pe_nope")}
        rs = json.load(open(os.path.normpath(os.path.join(HERE, "..", "..", "src", "data", "running_sequence.json"))))
        D["rs_pieces"] = rs["pieces"]
    st = J("state", "out", "state_rules.json")
    D["wr"] = {k: {"mean": round(v["mean"], 3), "cos": {w: round(c, 3) for w, c in v["cos"].items()}} for k, v in st["rules"].items()}
    D["wr_writes"] = st["writes"]
    m = J("mem", "out", "statecalc.json")
    cfgdir = {"data": os.path.normpath(os.path.join(HERE, "..", "..", "src", "data", "configs")),
              "map": os.path.normpath(os.path.join(HERE, "..", "..", "src", "map", "inputs", "configs"))}
    D["mem"] = {"ctxs": m["ctxs"], "tiny": m["tiny"], "models": []}
    for x in m["models"]:
        f = os.path.join(cfgdir["data"], x["file"])
        if not os.path.exists(f): f = os.path.join(cfgdir["map"], x["file"])
        D["mem"]["models"].append({k: x[k] for k in ("key", "label", "group", "mixers", "kv_per_token", "state", "kv_equals_state_at")}
                                  | {"at": {c: x["at"][c]["total"] for c in x["at"]}, "cfg": prune(json.load(open(f)))})
    if EX("recall", "out", "pretrained_copy.json"):
        D["copy"] = J("recall", "out", "pretrained_copy.json")
    if EX("recall", "out", "tiny_recall.json"):
        D["tiny_recall"] = J("recall", "out", "tiny_recall.json")
    mq = sorted(glob.glob(os.path.join(HERE, "recall", "out", "mqar", "*.json")))
    if mq:
        D["mqar"] = [{k: v for k, v in json.load(open(f)).items() if k not in ("torch",)} for f in mq]
    if EX("inside", "out", "ssm_inside.json"):
        s = J("inside", "out", "ssm_inside.json")
        enc = lambda arr: base64.b64encode(bytes(arr)).decode()
        D["inside"] = {"tokens": s["tokens"], "ntok": s["ntok"], "dual": s["dual_vs_recurrent_max_abs_logit_diff"],
                       "layers": [{"layer": l["layer"], "half_life": l["half_life"], "a_median": l["a_median"],
                                   "map_heads": l["map_heads"], "maps": [enc(mp) for mp in l["maps"]],
                                   # decay per token, quantised to 0..255 (a in [0, 1])
                                   "a_tok": enc([int(round(255 * v)) for h in l["a_tokens"] for v in h])}
                                  for l in s["layers"]],
                       "attn": [{"layer": a["layer"], "heads": a["heads"], "maps": [enc(mp) for mp in a["maps"]]} for a in s["attn_maps"]]}
    txt = "// written by src/make_page_data.py from src/*/out; do not edit by hand\nwindow.BAD=" + \
          json.dumps(D, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "parts", "22_js_rd_0data.js"), "w").write(txt)
    print("22_js_rd_0data.js", len(txt), "bytes;", ", ".join(k for k in D))


if __name__ == "__main__":
    main()
