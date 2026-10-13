"""Write parts/22_tcp_data.js (window.TCP) from inputs/*.json. Everything the page draws comes from here."""
import json, os, re, statistics as st, collections
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, "inputs")
J = lambda n: json.load(open(os.path.join(I, n)))
D = {}
# 1 walk
w = J("walk.json")
D["walk"] = {"steps": [{"d": s["depth"], "fn": "Linear.forward" if s["depth"] else "MLP.forward", "off": s["off"], "op": s["op"],
                        "arg": "" if s["op"] in ("PUSH_NULL", "SWAP") else s["arg"], "stack": s["stack_after"],
                        "new": [n["name"] for n in s["new_nodes"] if n["op"] != "output"], "newop": [n["op"] for n in s["new_nodes"]], "g": s["guards_total"]} for s in w["steps"]],
             "dis": w["dis"], "eager": w["eager_calls"]}
gl = [m for m in w["logs"]["torch._dynamo.guards.__guards"] if "TREE_GUARD_MANAGER" in m][0]
lines = [re.sub(r"\s+#.*$", "", l) for l in gl.split("\n") if l.strip()]
D["guard_tree"] = "\n".join(l[:150] for l in lines[:26])
D["guard_kinds"] = dict(collections.Counter(m.group(1) for l in gl.split("\n") for m in [re.search(r"\+- ([A-Z_]+)(:|$)", l)] if m).most_common(9))
D["guard_latency"] = [m for m in w["logs"]["torch._dynamo.guards.__guards"] if "latency" in m][0].strip()
# 3 fixer
f = J("fixer.json")
D["fix"] = [{"key": k["key"], "label": k["label"], "how": k["how"], "src_b": k["src_break"], "src_f": k["src_fix"],
             "b": {x: k["broken"][x] for x in ("graphs", "breaks", "piece_ops", "pieces_per_forward", "fullgraph_error")} | {"reason": (k["broken"]["reasons"] or [{}])[0].get("reason", "")},
             "f": {x: k["fixed"][x] for x in ("graphs", "breaks", "piece_ops", "pieces_per_forward", "fullgraph_error", "max_diff_vs_original")} | {"reason": (k["fixed"]["reasons"] or [{}])[0].get("reason", "")}} for k in f["kinds"]]
D["fix_base"] = {x: f["baseline"][x] for x in ("graphs", "piece_ops", "pieces_per_forward")}
D["nested"] = J("nested.json")["cases"]
# 4 dynamic
dy = J("dynamic.json")
D["dyn"] = {"seq": dy["seq"], "strat": {k: {"calls": v["calls"], "reasons": v["recompile_reasons"], "breaks": v.get("graph_breaks", [])} for k, v in dy["strategies"].items()},
            "limit": dy["limit"], "unb": {k: {"graphs": v["graphs"], "breaks": v["breaks"], "code": v["graph_code"][0] if v["graph_code"] else "", "reasons": v["break_reasons"]} for k, v in dy["unbacked"].items()}}
D["pgo"] = [json.loads(l) for l in open(os.path.join(I, "pgo.jsonl"))]
# 5 aot
a = J("aot.json")
D["aot"] = {"block": {k: {x: v[x] for x in ("fw_ops", "bw_ops", "saved_bytes_activations", "recomputed", "fw_names", "bw_names")} | {"saved": [[s["name"], s["op"], s["shape"], s["bytes"], s["is_input"], s["input_view"]] for s in v["saved"]]} for k, v in a["block"].items()},
            "joint": [[n["name"], n["op"], n["args"], n["bytes"], n["shape"]] for n in a["block"]["default"]["joint_nodes"]],
            "placeholders": a["block"]["default"]["joint_placeholders"],
            "model": {k: {x: v[x] for x in ("fw_ops", "bw_ops", "saved_bytes_activations", "saved_bytes_input_views", "n_saved", "n_recomputed")} for k, v in a["model"].items()}}
# 6 inductor
ind = J("inductor.json"); tr = J("triton.json")
D["ind"] = {"nodes": ind["infer"]["nodes"], "fusions": ind["infer"]["fusions"], "rejects": ind["infer"]["reject_reasons"], "launches": ind["infer"]["launches"],
            "cpp": ind["infer"]["kernels"]["cpp_fused_gelu_view_2"], "wrap": ind["infer"]["wrapper_call"],
            "triton": tr["kernels"]["triton_poi_fused_gelu_view_2"], "triton_names": list(tr["kernels"]), "triton_ver": tr["triton"],
            "knobs": {k: [[g["fused"], g["extern"], g["fallback"], g["lines"]] for g in v["graphs"]] for k, v in ind["knobs"].items() if k != "no_fusion"}}
# 8 ca, ddp
ca = J("ca.json"); D["ca"] = {k: {"graphs": [[g["ops"], g["top"].get("AccumulateGrad", 0)] for g in v["graphs"]], "diff": v["max_grad_diff"]} for k, v in ca["runs"].items()}
D["ddp"] = J("ddp_compile.json")["runs"]
# 9, 10 timings
g = collections.defaultdict(list)
for l in open(os.path.join(I, "time_compile.jsonl")):
    d = json.loads(l); r = d["r"]
    g[d["label"]].append({"first": r["first_s"], "load": round(r["load"], 1), "ts": r.get("time_spent", {}), "hit": [r["fxgraph_hit"], r["fxgraph_miss"], r["aot_hit"], r["aot_miss"]], "mega": r.get("mega_bytes"), "steps": r["steps_ms"]})
D["ct"] = {k: {"runs": v, "med": round(st.median(x["first"] for x in v), 2)} for k, v in g.items()}
D["steady"] = J("time_steady.json")["runs"]
# 11 export
e = J("export.json")
D["exp"] = {"ops": e["nonstrict"]["ops"], "same": e["same_graph"], "dec": e["decomposed_ops"], "sig": e["signature"], "dyn": e["dynamic"], "cf": e["control_flow"],
            "draft": re.sub(r"\x1b\[[0-9;]*m", "", e["draft_export"]["report"]), "saved": e["saved_bytes"], "aoti": e["aoti_bytes"], "aoti_members": e["aoti_members"],
            "nc": e["aoti_noncontiguous"], "oor": e["out_of_range"], "dyn_runs": e["dyn_runs"]}
D["tl"] = J("tlparse.json")
D["mini"] = J("minify.json")
D["modes"] = {"default": {}, "lite": "10 options (graph passes, reordering, buffer reuse and DCE off; fallback_by_default, selective_decompose on)", "reduce-overhead": {"triton.cudagraphs": True},
              "max-autotune-no-cudagraphs": {"max_autotune": True, "coordinate_descent_tuning": True}, "max-autotune": {"max_autotune": True, "triton.cudagraphs": True, "coordinate_descent_tuning": True}}
txt = "window.TCP=" + json.dumps(D, separators=(",", ":")) + ";\n"
assert not re.search("U" + "sers|" + re.escape(os.path.basename(os.path.expanduser("~"))) + "|/pri" + "vate/|scr" + "atchpad", txt), "private string"
open(os.path.join(H, "parts", "22_tcp_data.js"), "w").write(txt)
print("22_tcp_data.js", len(txt))
