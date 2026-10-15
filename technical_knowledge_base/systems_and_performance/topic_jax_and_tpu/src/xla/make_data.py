"""Build parts/32_js_xc_0data.js (window.XCD) from src/xla/out/*.json, and out/read_numbers.json for the Reading tab.
Plain python3, no JAX needed:  python3 src/xla/make_data.py
Everything the Compiler lab shows comes from here; check_data.py confirms the page embeds exactly this."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
PART = os.path.join(HERE, "..", "parts", "32_js_xc_0data.js")


def load(n):
    p = os.path.join(OUT, n)
    return json.load(open(p)) if os.path.exists(p) else None


def head(txt, n):
    ls = txt.splitlines()
    return "\n".join(ls[:n]) + ("\n... (%d more lines)" % (len(ls) - n) if len(ls) > n else "")


def pysrc():
    """The Python the MLP-block demo traced: layer_norm, linear and mlp from model_jax.py, plus the demo's wrapper."""
    src = open(os.path.join(HERE, "..", "data", "model_jax.py")).read().split("\n")
    out = []
    for name in ("def layer_norm", "def linear", "def mlp"):
        i = next(j for j, l in enumerate(src) if l.startswith(name))
        k = i + 1
        while k < len(src) and (src[k].startswith(" ") or not src[k].strip()):
            k += 1
        out += [l for l in src[i:k] if l.strip()] + [""]
    demo = open(os.path.join(HERE, "fusion_demo.py")).read().split("\n")
    i = next(j for j, l in enumerate(demo) if l.startswith("def mlp_block"))
    out += demo[i:i + 2]
    return "\n".join(out)


def r3(x):
    return float("%.4g" % x) if isinstance(x, float) else x


def main():
    P, F, S, R, T, TC, D, SRC, PR = (load(n) for n in ("pipeline.json", "fusion_demo.json", "passes.json", "remat.json",
                                                        "timing.json", "torch_compile.json", "debug.json", "source.json",
                                                        "profile.json"))
    d = {"v": P["versions"]}
    o = P["opt_hlo"]
    d["step"] = {"jaxpr": P["jaxpr"]["flat_eqns"], "jaxprTop": P["jaxpr"]["top_eqns"], "shlo": P["stablehlo"]["ops"],
                 "shloFuncs": P["stablehlo"]["funcs"], "hlo": P["hlo"]["instructions_total"],
                 "optTop": o["entry_instructions"], "optAll": o["instructions_total"], "fusions": o["fusions_all"],
                 "fusionsMulti": o["fusions_multi"], "kernels": o["kernels"], "cats": o["fusion_categories"],
                 "kernelsByOp": o["kernels_by_op"], "opsInFusions": o["ops_inside_fusions"],
                 "bytes": {"jaxpr": P["jaxpr"]["bytes"], "shlo": P["stablehlo"]["bytes"], "hlo": P["hlo"]["bytes"], "opt": o["bytes"]},
                 "flops": P["cost_analysis"].get("flops"), "bytesAccessed": P["cost_analysis"].get("bytes accessed"),
                 "transc": P["cost_analysis"].get("transcendentals"),
                 "memNo": {k: P["memory_no_donation"][k] for k in ("argument_size_in_bytes", "output_size_in_bytes", "temp_size_in_bytes", "alias_size_in_bytes", "peak_memory_in_bytes", "total_allocation_bytes")},
                 "memDon": {k: P["memory_donated"][k] for k in ("argument_size_in_bytes", "output_size_in_bytes", "temp_size_in_bytes", "alias_size_in_bytes", "peak_memory_in_bytes", "total_allocation_bytes")},
                 "par": P["bytes"], "aliasN": P.get("donated_alias_count"), "aliasEx": P.get("donated_alias_excerpt"), "topPrims": dict(list(P["jaxpr"]["flat_by_prim"].items())[:12])}
    d["pieces"] = P["pieces"]
    dm = F["demo"]
    d["demo"] = {"eqns": [{"p": e["prim"], "s": e["shape"], "src": e["src"], "k": e["kernel"], "how": e.get("how"),
                           "b": e["in_bytes"] + e["out_bytes"], "t": e["text"]} for e in dm["eqns"]],
                 "kernels": [{"cat": k["cat"], "n": k["n_members"], "io": k["io_bytes"], "ops": k["by_op"], "prims": k["jax_prims"], "name": k["name"]} for k in dm["kernels"]],
                 "ratio": round(dm["eager_bytes"] / dm["bytes_accessed"], 1),
                 "eagerBytes": dm["eager_bytes"], "xlaBytes": dm["bytes_accessed"], "flops": dm["flops"],
                 "shloOps": dm["stablehlo_ops"], "hloInstr": dm["hlo_instructions"],
                 "txt": {"jaxpr": dm["jaxpr_text"], "shlo": head(dm["stablehlo_text"], 16), "hlo": head(dm["hlo_text"], 14),
                         "opt": dm["hlo_entry"], "py": pysrc()}}
    if S:
        d["passes"] = {k: {"steps": [[s["i"], s["pipeline"], s["after"], s["instructions"], s["fusions"], s["work"]] for s in S[k]["steps"]],
                           "files": S[k]["n_files"], "bytes": S[k]["dump_bytes"], "n": S[k]["passes_that_changed_hlo"],
                           "other": S[k]["other_files"], "eagerMods": S[k]["other_modules"], "nMods": S[k]["n_modules_compiled"],
                           "cse": S[k].get("cse")}
                       for k in ("mlp_block", "train_step") if k in S}
    if R:
        d["remat"] = {"rows": [{"k": r["k"], "pol": r["policy"], "temp": r["temp_bytes"], "flops": r["flops"], "ba": r["bytes_accessed"]} for r in R["rows"]],
                      "check": R["check"],
                      "k3": next(r["temp_bytes"] for r in R["rows"] if r["k"] == 3 and r["policy"] == "nothing_saveable"),
                      "k4": next(r["temp_bytes"] for r in R["rows"] if r["k"] == 4 and r["policy"] == "nothing_saveable")}
    d["timing"] = None
    if T:
        t = {"label": T.get("label")}
        if "step" in T:
            t["step"] = {k: r3(v) for k, v in T["step"]["median"].items()}
            t["stepLoad"] = [r3(r["load1"]) for r in T["step"]["runs"]]
            t["stepN"] = len(T["step"]["runs"])
        if "cache" in T:
            c = T["cache"]
            t["cache"] = {"first": {k: r3(c["first_process"][k]) for k in ("trace", "lower", "compile", "first_call", "second_call", "cache_files", "cache_bytes")},
                          "later": {k: r3(v) for k, v in c["later_median"].items()}, "n": len(c["later"]) + 1,
                          "default": ({"files": T["cache_default_threshold"]["cache_files"], "compile": r3(T["cache_default_threshold"]["compile"])} if "cache_default_threshold" in T else None)}
        if "layers" in T:
            t["layers"] = [{k: r3(v) for k, v in r.items()} for r in T["layers"]]
        if "remat" in T:
            t["remat"] = [{"k": r["k"], "pol": r["policy"], "s": r3(r["steady_median"])} for r in T["remat"]]
        if "torch" in T:
            t["torch"] = {k: r3(v) for k, v in T["torch"]["median"].items()}
            t["torchN"] = len(T["torch"]["runs"])
        t["loads"] = sorted({r3(x) for x in t.get("stepLoad", [])})
        d["timing"] = t
    if TC:
        d["torch"] = {"eager": {k: TC["eager"][k] for k in ("aten_ops", "leaf_ops_all", "leaf_ops", "leaf_by_phase", "top_leaf_ops", "foreach_ops")},
                      "explain": TC["dynamo_explain"], "kernels": TC["inductor"]["generated_kernels"],
                      "lossDiff": TC.get("loss_compiled_vs_eager"), "branch": TC["branch"], "ver": TC["versions"]["torch"]}
    if D:
        d["debug"] = {k: D[k] for k in ("debug_print", "checkify", "debug_nans", "donate", "cost") if k in D}
    if SRC:
        d["src"] = SRC
    if PR:
        d["profile"] = {k: PR.get(k) for k in ("steps_traced", "files", "top_events_us", "threads_by_events", "hlo_stats_cols", "hlo_stats_n")}
        d["profile"]["hlo_stats_rows"] = (PR.get("hlo_stats_rows") or [])[:25]
    js = "// ---- Compiler lab data (t-xla), generated by src/xla/make_data.py from src/xla/out/*.json. Do not edit by hand.\nwindow.XCD=" + \
        json.dumps(d, separators=(",", ":"), ensure_ascii=True) + ";\n"
    open(PART, "w").write(js)
    print("wrote", os.path.relpath(PART, os.path.join(HERE, "..")), len(js), "bytes")

    # numbers the Reading tab asked for (src/read/todo.md items 3, 4, 10): a small JSON, not an edit of Reading files
    rn = {"source": "Compiler lab, src/xla/out/*.json; machine Apple M1 Pro (CPU), jax %s" % P["versions"]["jax"],
          "trace": {"ops": P["jaxpr"]["flat_eqns"], "fusions": o["fusions_all"], "fusionsMultiOp": o["fusions_multi"],
                    "kernels": o["kernels"], "torchKernels": TC["eager"]["leaf_ops"] if TC else None,
                    "torchKernelsNote": "aten operators that do work (views, allocations and scalar reads excluded) in one eager PyTorch step: forward, backward, clip, AdamW (for-loop implementation on CPU), scheduler"},
          "xla": {"stages": [{"n": "jaxpr equations", "v": P["jaxpr"]["flat_eqns"]},
                             {"n": "StableHLO operations", "v": P["stablehlo"]["ops"]},
                             {"n": "HLO instructions (before XLA)", "v": P["hlo"]["instructions_total"]},
                             {"n": "kernels after XLA (fusions, matmuls, ...)", "v": o["kernels"]},
                             {"n": "of which fusions", "v": o["fusions_all"]}],
                  "compile_s": None, "compile_cached_s": None,
                  "memory_no_donation": {k: P["memory_no_donation"][k] for k in ("argument_size_in_bytes", "output_size_in_bytes", "temp_size_in_bytes", "alias_size_in_bytes", "total_allocation_bytes")},
                  "memory_donated": {k: P["memory_donated"][k] for k in ("argument_size_in_bytes", "output_size_in_bytes", "temp_size_in_bytes", "alias_size_in_bytes", "total_allocation_bytes")}}}
    if T and "step" in T:
        rn["xla"]["compile_s"] = r3(T["step"]["median"]["compile"])
        rn["xla"]["trace_s"] = r3(T["step"]["median"]["trace"])
        rn["xla"]["lower_s"] = r3(T["step"]["median"]["lower"])
        rn["xla"]["first_call_s"] = r3(T["step"]["median"]["first_call"])
        rn["xla"]["steady_step_s"] = r3(T["step"]["median"]["steady_median"])
    if T and "cache" in T:
        rn["xla"]["compile_cached_s"] = r3(T["cache"]["later_median"]["compile"])
        rn["xla"]["first_call_cached_s"] = r3(T["cache"]["later_median"]["first_call"])
        rn["xla"]["compile_cpu_s"] = r3(T["step"]["median"]["compile_cpu"])
        rn["xla"]["compile_cached_cpu_s"] = r3(T["cache"]["later_median"]["compile_cpu"])
        rn["xla"]["load1_during_runs"] = sorted(r3(r["load1"]) for r in T["step"]["runs"])
        rn["xla"]["timing_note"] = "wall times inflated by a 1-minute load of about 30-50 on a 10-core machine; CPU times (process_time) are the steadier measure"
    rn["xla"]["timing_label"] = "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority; medians"
    json.dump(rn, open(os.path.join(OUT, "read_numbers.json"), "w"), indent=1)
    print("wrote out/read_numbers.json")


if __name__ == "__main__":
    main()
