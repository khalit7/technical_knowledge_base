"""Assemble data/dp_data.json (embedded in the page as window.DP) from the measured outputs in data/out/
and the few root Dedup lab outputs this page quotes (read only, ../../src/dedup/out/). Plain Python 3, no packages.
Run from anywhere: python3 build_data.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "data", "out")
ROOT = os.path.join(HERE, "..", "..", "src", "dedup", "out")


def j(name, root=False):
    p = os.path.join(ROOT if root else OUT, name)
    return json.load(open(p)) if os.path.exists(p) else None


mh = j("dp_mh.json")
seeds = j("dp_seeds.json")
uf = j("dp_uf.json")
sim = j("dp_simhash.json")
sa = j("dp_sa.json")
sem = j("dp_sem.json")
cmp_ = j("dp_compare.json")
demo = j("dp_mhdemo.json")

D = {}
D["mhdemo"] = demo
D["seeds"] = {"n_seeds": seeds["n_seeds"], "settings": seeds["settings"],
              "pairs": [{k: p[k] for k in ("j", "sd", "hist112", "cand", "formula")} for p in seeds["pairs"]]}
D["var"] = {"k": mh["variance"]["k"], "near075": mh["variance"]["near075"],
            "outside2sd": {str(r["k"]): r["outside2sd"] for r in mh["variance"]["rows"]}}
D["band"] = {"K": mh["K"], "n_docs": mh["n_docs"], "n_pairs": mh["n_pairs"], "n_share": mh["n_share"],
             "n_none": mh["n_none"], "ones": mh["ones"], "jhist_lt001": mh["jhist_lt001"],
             "masks": [[m[2], m[3]] for m in mh["masks"]]}

# union-find: keep band-0 operations and every operation that joins two sets; count the rest per band
anim = []
for a in uf["anim"]:
    ops, noop = [], {}
    for o in a["ops"]:
        if o["band"] == 0 or o["joined"]:
            ops.append({"b": o["band"], "a": o["a"], "c": o["b"], "pa": o["pa"], "pc": o["pb"], "j": o["joined"],
                        "par": [o["par"][str(x)] for x in a["members"]]})
        else:
            noop[str(o["band"])] = noop.get(str(o["band"]), 0) + 1
    anim.append({"members": a["members"], "kept": a["kept"], "hosts": [a["hosts"][str(x)] for x in a["members"]],
                 "jk": [a["j_to_kept"].get(str(x)) for x in a["members"]], "ops": ops, "noop": noop,
                 "n_ops": len(a["ops"])})
D["uf"] = {"pair_records": uf["pair_records"], "distinct_pairs": uf["distinct_pairs"], "removed": uf["removed"],
           "equals_run0": uf["equals_run0"], "removed_with_check08": uf["removed_with_check08"],
           "kept_is_longest": uf["kept_is_longest"], "kept_is_first": uf["kept_is_first"],
           "clusters": [{"n": len(c["members"]), "j_min": c["j_min"], "j_max": c["j_max"], "chk": c["check08_removed"],
                         "hosts": sorted(set(c["hosts"]))[:4], "nhosts": len(set(c["hosts"]))} for c in uf["clusters"]],
           "anim": anim}
D["sim"] = {k: sim[k] for k in ("n_docs", "n_pairs", "pairs_ge08", "rows", "by_cos", "no_overlap", "pts")}
D["sa"] = sa
D["sem"] = sem
D["ufscale"] = j("dp_ufscale.json")
D["d4fw"] = j("dp_d4_fw50k.json")  # pending GPU run until present
if cmp_:
    D["cmp"] = {"n": cmp_["n"], "bytes": cmp_["bytes"],
                "combos": {k: {s: v[s] for s in ("exact", "fuzzy", "semantic", "sa_all", "sa_keep")} for k, v in cmp_["combos"].items()}}
D["root"] = {"exact": j("dd_exact.json", True), "bloom": j("dd_bloom.json", True), "bighash": j("dd_bighash.json", True),
             "fineweb": j("dd_fineweb.json", True)}
for k in ("exact",):
    D["root"][k] = {s: {kk: vv for kk, vv in v.items() if kk not in ("top_lines", "top_long")} for s, v in D["root"][k].items()}
fw = j("dd_fwshard.json", True)
D["fwshard"] = fw  # null until the root lab's whole-shard job finishes

import sys
sys.path.insert(0, os.path.join(HERE, "scripts"))
src = open(os.path.join(HERE, "scripts", "dp_common.py")).read()
ns = {}
exec(src[src.index("PERSONAL_HOSTS"):src.index("def save")], ns)  # the masking table without importing the venv-only helpers
s = ns["mask_hosts"](json.dumps(D, ensure_ascii=False, separators=(",", ":")))
for bad in ("/" + "Users/", "Users" + "-", "/private/tmp", "scratchpad", __import__("getpass").getuser()):
    assert bad not in s, bad
open(os.path.join(HERE, "data", "dp_data.json"), "w").write(s)
print("dp_data.json", len(s), "bytes")
