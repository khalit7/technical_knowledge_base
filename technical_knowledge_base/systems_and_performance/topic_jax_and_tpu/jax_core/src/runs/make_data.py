"""Gather out/*.json into ../parts/22_js_jc_data.js (window.JC), keeping only what the page shows.
Plain Python 3, no JAX needed: python3 -B make_data.py (build.sh runs it).
"""
import json
import re
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")


def L(name):
    with open(os.path.join(OUT, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


arr, arr8, tr, ad, adm, cf, cv, vm, pt, pr, pm, src = (L(n) for n in (
    "array", "array8", "trace", "ad", "admem", "cf", "custom", "vmap", "pytree", "prng", "prim", "source"))

# ---- the tape animation: stage of every equation (0 x@W1, 1 +b1, 2 GELU, 3 @W2, 4 +b2), checked against the primitives
STAGES = {
    "forward": [0, 1, 1, 2, 2, 2, 2, 2, 2, 3, 4, 4],
    "linear": [0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4],
    "transpose": [4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 0, 0],
    "jvp": [0, 0] + [1] * 4 + [2] * 18 + [3] * 4 + [4] * 4,
}
STAGES["vjp"] = [0, 1, 1] + [2] * 9 + [3, 4, 4] + STAGES["transpose"]
EXPECT = {
    "forward": "dot_general broadcast_in_dim add mul neg mul erfc mul copy dot_general broadcast_in_dim add",
    "linear": "dot_general broadcast_in_dim add mul neg mul mul mul mul mul add_any copy dot_general dot_general add_any broadcast_in_dim add",
    "transpose": "reduce_sum reshape reduce_sum dot_general transpose dot_general copy mul mul mul mul mul neg mul add_any reduce_sum reshape reduce_sum dot_general transpose",
}


def eqn_lines(ex):
    """One printed line per top-level equation, rebuilt from the export (names, avals, params in short form)."""
    rows = []
    for e in ex["eqns"]:
        outs = " ".join(o["v"] + ":" + o["aval"] for o in e["out"])
        ins = " ".join(i.get("v") or i.get("lit") for i in e["in"])
        ps = []
        for k, v in e["params"].items():
            if isinstance(v, str) and k in ("dimension_numbers", "axes", "permutation", "broadcast_dimensions", "new_sizes"):
                ps.append(k + "=" + re.sub(r"np\.int64\((-?\d+)\)", r"\1", v))
        p = ("[" + " ".join(ps) + "]") if ps else ""
        rows.append({"t": outs + " = " + e["prim"] + p + " " + ins, "prim": e["prim"],
                     "ins": [i.get("v") for i in e["in"] if i.get("v")], "outs": [o["v"] for o in e["out"]]})
    return rows


tape = {}
for k in ("forward", "linear", "transpose", "jvp", "vjp"):
    ex = ad["mlp"][k]
    prims = [e["prim"] for e in ex["eqns"]]
    assert len(prims) == len(STAGES[k]), (k, len(prims))
    if k in EXPECT:
        assert " ".join(prims) == EXPECT[k], k
    tape[k] = {"eqns": eqn_lines(ex), "stage": STAGES[k], "text": ex["text"],
               "invars": [i["v"] + ":" + i["aval"] for i in ex["invars"]],
               "constvars": [i["v"] + ":" + i["aval"] for i in ex["constvars"]],
               "outvars": [o.get("v") or o.get("lit") for o in ex["outvars"]]}
# tangent-dependence in the JVP program (inputs f..i are tangents) and cotangent-dependence in the VJP (input f)
for k, seeds in (("jvp", set(v.split(":")[0] for v in tape["jvp"]["invars"][4:])), ("vjp", {tape["vjp"]["invars"][-1].split(":")[0]})):
    dep = set(seeds)
    for e in tape[k]["eqns"]:
        e["d"] = any(i in dep for i in e["ins"])
        if e["d"]:
            dep.update(e["outs"])

JC = {
    "arr": {k: arr[k] for k in ("versions", "array", "committed", "async", "x64_off", "weak", "jnp_vs_np", "matmul_precision_cpu", "load_start", "numpy")},
    "prom": arr["promotion"],
    "arr8": arr8,
    "tr": {k: tr[k] for k in ("avals", "shapedarray_fields", "chains", "dispatch_log", "constants")},
    "ex": {"order": tr["explorer_order"], "items": tr["explorer"],
           "lines": {k: v for k, v in tr["model_jax_lines"].items() if 40 <= int(k) <= 100}},
    "tape": tape,
    "ad": {"mlp": {k: ad["mlp"][k] for k in ("code", "linear_consts", "residuals", "transpose_equals_vjp", "flops", "torch_saved", "torch_vs_jax_grad_w1", "torch_version")},
           "model": ad["model"], "jac": ad["jac_grid"], "hess": ad["hessian"], "misc": ad["misc"], "mem": adm},
    "cf": cf, "cv": cv, "vm": vm, "pt": pt, "pr": pr, "pm": pm, "src": src,
}
def clean(o):
    """Non-finite floats become the strings 'nan', 'inf', '-inf' (JSON has no NaN)."""
    if isinstance(o, float) and o != o:
        return "nan"
    if isinstance(o, float) and o in (float("inf"), float("-inf")):
        return "inf" if o > 0 else "-inf"
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    return o


JC = clean(JC)
txt = json.dumps(JC, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
dst = os.path.join(HERE, "..", "parts", "22_js_jc_data.js")
with open(dst, "w", encoding="utf-8") as f:
    f.write("window.JC=" + txt + ";\n")
print("wrote", os.path.normpath(dst), len(txt), "bytes")
