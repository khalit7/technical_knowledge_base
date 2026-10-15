"""Write parts/22_js_tq_data.js (window.TQ) from out/*.json and the root TPU lab's roofline.json.
Plain python3, no dependencies. Run after the scripts in runs/ (see README.md)."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ROOT_TPU = os.path.join(os.path.dirname(os.path.dirname(HERE)), "src", "tpu", "out")
J = lambda n: json.load(open(os.path.join(OUT, n)))

gens = J("gens.json")
KEEP = ["gen", "name", "year", "bf16", "int8", "int8_src", "fp8", "hbm", "hbm_txt", "bw", "bw_txt", "ici", "ici_txt", "pod", "topo",
        "tc", "mxu_per_tc", "url", "dcn", "dcn_src", "pcie", "host_chips", "max_slice", "sparse", "price_v", "c1", "c3", "flex",
        "region", "name_rule", "price_note"]
G = []
for g in gens["gens"]:
    d = {k: g.get(k) for k in KEEP}
    s = g["src"]
    d.update(megacore=s["megacore"], mxu=s["mxu"], mxus=s["mxus_per_tc"], vmem=s["vmem_mib"], link1=g["sb"]["link_oneway"], links=g["sb"]["links"])
    G.append(d)
roof = json.load(open(os.path.join(ROOT_TPU, "roofline.json")))
sl = J("slices.json")
SL = [dict(g=r["gen"], t=r["topo"], c=r["chips"], d=r["devices"], h=r["hosts"], cu=r["cubes"], w=r["wrap"], n=r["note"],
           m=[[m["model"], m.get("hop", -1), "".join(m.get("phys", []))] for m in r["meshes"]]) for r in sl["rows"]]
err = next(m["error"] for r in sl["rows"] for m in r["meshes"] if "error" in m and r["gen"] == "v5p" and r["topo"] == "4x4x4")
rc = J("recompute.json")
TQ = dict(gens=G, notes=gens["notes"], free=gens["free"], gpu=gens["gpu"], price_read=gens["price_read"],
          prec=J("precision.json"), remat=J("remat.json"), mfu=J("mfu.json"), src={k: [v["file"], v["line"]] for k, v in J("source.json").items()}, errors=J("errors.json"),
          slices=SL, slice_err=err, slice_src=sl["src"],
          ops=[dict(name=o["name"], fwd=o["fwd"], bwd=o["bwd"], b=o["b"], m=o["m"], k=o["k"], n=o["n"]) for o in roof["ops"]],
          cost=roof["cost_analysis"], dots=roof["n_dots_step"], dot_flops=roof["dot_flops_step"],
          rc=dict(bcrit=rc["bcrit"], tiles=rc["tiles"], mxu=rc["mxu"], bf16_vals=rc["bf16_vals"], split=rc["split"], kv_tok=rc["kv_tok"], pmm=rc["pmm"]))
txt = "window.TQ=" + json.dumps(TQ, separators=(",", ":"), ensure_ascii=False) + ";\n"
assert "Users/" not in txt and "private/" not in txt
open(os.path.join(HERE, "parts", "22_js_tq_data.js"), "w").write(txt)
print("wrote parts/22_js_tq_data.js", len(txt), "bytes")
