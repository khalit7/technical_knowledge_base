"""Assemble inputs/*.json into ../parts/32_cmp_data.js (window.CMP). Plain python3, no torch needed."""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, "inputs")
def J(n):
    # timing files are one JSON line; a module imported by time_comp.py may have printed before it
    t = open(os.path.join(I, n)).read().strip()
    return json.loads(t if t.startswith("{\n") or n.startswith(("model_", "fusion", "breaks", "export", "autotune", "time_phases_run1")) else t.split("\n")[-1])
r3 = lambda v: round(v, 3)
def tm(d):
    return {"med": r3(d["median_ms"]), "min": r3(d["min_ms"]), "max": r3(d["max_ms"])}

C = {"date": "2026-10-12"}
mc, mm = J("model_cpu.json"), J("model_mps.json")
C["torch"] = mc["torch"]; C["params"] = mc["params"]
C["eager"] = {"cpu": {"fwd": mc["eager"]["fwd_calls"], "bwd": mc["eager"]["bwd_calls"],
                      "fwd_ops": [o[0] for o in mc["eager"]["fwd_ops"]], "bwd_ops": [o[0] for o in mc["eager"]["bwd_ops"]]},
              "mps": {"fwd": mm["eager"]["fwd_calls"], "bwd": mm["eager"]["bwd_calls"],
                      "fwd_ops": [o[0] for o in mm["eager"]["fwd_ops"]], "bwd_ops": [o[0] for o in mm["eager"]["bwd_ops"]]}}
def short(n):
    n = n.replace("torch.ops.aten.", "aten.").replace(".default", "")
    return n
C["ind"] = {}
for dev, R in (("cpu", mc), ("mps", mm)):
    C["ind"][dev] = []
    for g in R["inductor"]:
        C["ind"][dev].append({"L": [[short(l["name"]), {"fused": "g", "extern": "e", "fallback": "b"}[l["kind"]], ", ".join(a.replace("aten.", "") for a in l["aten"])] for l in g["launches"]],
                              "defs": g["n_kernel_defs"], "lines": g["lines"]})
KEEP = ["fwd:cpp_fused_gelu_view_2", "fwd:cpp_fused_add_native_layer_norm_view_1", "bwd:cpp_fused_gelu_gelu_backward_sum_view_2"]
C["ksrc"] = {k.split(":")[1] + ("|" + k.split(":")[0]): mc["kernel_src"][k] for k in KEEP}
d = mc["dynamo"]
C["dyn"] = {"graphs": d["graph_count"], "breaks": d["break_count"], "ops": d["ops_per_graph"][0],
            "calls": [n[1] for n in d["nodes"] if n[0] in ("call_function", "call_method", "call_module")]}
g = mc["guards"]
C["guards"] = {"total": g["total"], "kinds": g["by_kind"], "lat_us": g["eval_latency_us"] + mm["guards"]["eval_latency_us"],
               "excerpt": "\n".join(l[:170] + (" ..." if len(l) > 170 else "") for l in g["excerpt"].split("\n")[3:22])}
a = mc["aot"]
saved = a["saved"]
acts = [s for s in saved if not (s["name"].startswith("primals_") and s["name"] != "primals_54")]
C["aot"] = {"fwd_calls": a["fwd"]["calls"], "bwd_calls": a["bwd"]["calls"], "fwd_top": a["fwd"]["by_op"][:10], "bwd_top": a["bwd"]["by_op"][:10],
            "saved": [[s["name"], s["shape"], s["bytes"]] for s in acts], "n_saved_params": len(saved) - len(acts),
            "saved_params_bytes": sum(s["bytes"] for s in saved if s not in acts),
            "mps_bwd_fallback": sum(1 for l in mm["inductor"][1]["launches"] if l["name"].endswith("linear_backward.default"))}
C["losses"] = {"cpu": mc["losses"], "mps": mm["losses"]}
F = J("fusion.json"); tf_c, tf_m = J("time_fusion_cpu.json")["results"], J("time_fusion_mps.json")["results"]
C["fus"] = {}
for k, v in F.items():
    C["fus"][k] = {"ops": [[o["op"], o["read"], o["write"]] for o in v["eager_ops"]], "cr": v["compiled_read"], "cw": v["compiled_write"],
                   "kernel": v["kernel"], "kname": [l["name"] for l in v["compiled_launches"] if l["kind"] == "fused"][0], "nlaunch": len(v["compiled_launches"]), "diff": v["max_abs_diff"], "shapes": v["input_shapes"], "numel": v["numel"],
                   "t": {"cpu": {"eager": tm(tf_c[k]["eager"]), "compiled": tm(tf_c[k]["compiled"])},
                         "mps": {"eager": tm(tf_m[k]["eager"]), "compiled": tm(tf_m[k]["compiled"])}}}
B = J("breaks.json"); tb = J("time_breaks.json")
C["brk"] = {}
for k, v in B["breaks"].items():
    rs = v["reasons"]
    C["brk"][k] = {"src": B["variant_src"].get(k, ""), "graphs": v["graphs"], "nbreaks": v["breaks"], "per_fwd": v["pieces_per_forward"],
                   "pieces": v["piece_names"], "reasons": [[re.split(r"\n", r["reason"])[0][:200],
                    (re.findall(r"Explanation: ([^\n]*)", r["reason"]) or [""])[0][:220], ", ".join(r["where"])] for r in rs],
                   "fg": v["fullgraph_error"][:260], "t": tm(tb["results"][k])}
C["brk_eager"] = tm(tb["results"]["eager"])
C["rec"] = {k: [[r["call"], r["B"], r["T"], r["new_graphs"], r["reason"]] for r in rows] for k, rows in B["recompiles"].items()}
C["rec_ms"] = {"warm": [r3(r["ms"]) for r in J("time_seq.json")["results"]], "cold": [r3(r["ms"]) for r in J("time_seq_cold.json")["results"]]}
C["dynconf"] = B["dynamic_note"]; C["scal"] = B["scalars"]
sc, sm = J("time_step_cpu.json"), J("time_step_mps.json")
C["step"] = {"cpu": {k: dict(tm(v), first=round(v["first_call_ms"])) for k, v in sc["results"].items()},
             "mps": {k: dict(tm(v), first=round(v["first_call_ms"])) for k, v in sm["results"].items()},
             "mps_mem": sm["mps_mem"], "load": [sc["load_before"], sm["load_before"]]}
pc, pm = J("time_phases_cpu.json"), J("time_phases_mps.json")
C["ph"] = {"cpu": {k: [r3(v["fwd_ms"]), r3(v["bwd_ms"])] for k, v in pc["results"].items()},
           "mps": {k: [r3(v["fwd_ms"]), r3(v["bwd_ms"])] for k, v in pm["results"].items()}}
r1 = J("time_phases_run1.json")
C["ph1"] = {"cpu": r1["cpu"], "mps": r1["mps"]}
C["prof"] = {k: {"total": round(v["self_total_us"]), "top": [[t[0][:60], t[1], round(t[2])] for t in v["top"][:14]]} for k, v in pc["profile"].items()}
first = [json.loads(l) for l in open(os.path.join(I, "time_first.jsonl"))]
C["first"] = {"cold": [round(f["first_call_ms"]) for f in first if f["kind"] == "cold"], "warm": [round(f["first_call_ms"]) for f in first if f["kind"] == "warm"],
              "load": [round(f["load_before"][0], 1) for f in first]}
E = J("export.json"); ti = J("time_infer.json")
C["exp"] = {"export_s": round(E["export_s"], 2), "calls": E["calls"], "top": E["by_op"][:9], "core_calls": E["core_aten"]["calls"], "core_top": E["core_aten"]["by_op"][:9],
            "nparams": E["n_params_inputs"], "range": list(E["range_constraints"].values()), "aoti_s": round(E["aoti_compile_s"], 1),
            "pkg": E["pkg_bytes"], "files": [[re.sub(r"^c[a-z0-9]{40,}", "<hash>", f[0]), f[1]] for f in E["pkg_files"][:5]],
            "diff": E["max_abs_diff"], "diff4": E["max_abs_diff_b4"], "t": {k: tm(v) for k, v in ti["results"].items()}}
AT = J("autotune.json")
C["at"] = {"fwd": AT["fwd"]["launches"], "bwd": AT["bwd"]["launches"], "templates": AT["fwd"]["gemm_template_defs"] + AT["bwd"]["gemm_template_defs"]}
out = "// Compile lab: recorded data (src/comp/build_data.py from src/comp/inputs/). Do not edit by hand.\nwindow.CMP=" + json.dumps(C, separators=(",", ":")) + ";\n"
open(os.path.join(H, "..", "parts", "32_cmp_data.js"), "w").write(out)
print("bytes", len(out))
