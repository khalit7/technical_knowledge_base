"""Build ../parts/22_js_xp_0data.js (window.XPD) from lab/out/*.json, and lab/out/prose_numbers.json.

Every number the page prints comes from here: the tabs read XPD directly, and the Reading tab's prose numbers are
<span data-xp="key"> elements filled from XPD.n (a flat dictionary), so prose and data cannot disagree.
Run with plain python3 (no JAX needed).
"""
import collections
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ROOT_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "xla", "out"))
PART = os.path.normpath(os.path.join(HERE, "..", "parts", "22_js_xp_0data.js"))


def J(name, base=OUT):
    with open(os.path.join(base, name)) as f:
        return json.load(f)


low, pipe, pdiff, fus, rec = J("lowering.json"), J("pipeline_src.json"), J("passes_diff.json"), J("fusion_lab.json"), J("recompile.json")
buf, inp, cache, exp, prof, flg = J("buffers.json"), J("inplace.json"), J("cache.json"), J("export.json"), J("profile.json"), J("flags.json")
r_pipe, r_read, r_torch = J("pipeline.json", ROOT_OUT), J("read_numbers.json", ROOT_OUT), J("torch_compile.json", ROOT_OUT)


def src(d):
    return {k: d[k] for k in ("file", "line", "url", "quote") if k in d}


def fn_group(fn):
    if fn in ("layer_norm",):
        return "layer_norm"
    if fn in ("linear",):
        return "linear"
    if fn.startswith("attention"):
        return "attention"
    if fn in ("mlp",):
        return "mlp"
    if any(k in fn for k in ("clip", "moment", "apply_updates", "tree_sum", "_square", "global_norm", "update_fn", "bias_correction", "scale_by")):
        return "optimiser"
    if fn in ("apply", "block", "loss_fn"):
        return "model (other)"
    return "other"


# ---------------------------------------------------------------- lowering
step_rows = low["step_expansion"]["rows"]
nometa = lambda t: re.sub(r",?\s*metadata=\{[^{}]*\}", "", t)  # noqa: E731
forms = dict(low["attention_block"]["forms"])
forms["hlo"], forms["opt_hlo"] = nometa(forms["hlo"]), nometa(forms["opt_hlo"])
lowd = {
    "forms": forms, "fcounts": dict({k: v for k, v in low["attention_block"]["counts"].items() if k != "opt_entry"},
                                    opt_kernels=sum(1 for o in low["attention_block"]["counts"]["opt_entry"] if o not in ("parameter", "constant", "tuple", "get-tuple-element", "bitcast")),
                                    opt_fusions=sum(1 for o in low["attention_block"]["counts"]["opt_entry"] if o == "fusion")),
    "rows": [[r["prim"], r["jaxpr"], r["stablehlo"], r["hlo"], r["stablehlo_ops"]] for r in step_rows[:20]],
    "pjrt": low["pjrt"], "src": [dict(src(s), step=s["step"]) for s in low["source"]],
}

# ---------------------------------------------------------------- pipeline source
pip = {"counts": pipe["counts"],
       "cat": [[c["name"], c["cls"], c["header"].get("file"), c["header"].get("line"), c["cpu_lines"], c["gpu_lines"], c["changed_attn"], c["changed_step"]] for c in pipe["catalog"]],
       "gpu_only": [[g["cls"], g["gpu_lines"]] for g in pipe["gpu_only"]],
       "q": {k: src(v) for k, v in pipe["quotes"].items()}}

# ---------------------------------------------------------------- pass diffs
passes = {}
for w, p in pdiff["programs"].items():
    passes[w] = {"module": p["module"], "files": p["dump_files"], "dump_bytes": p["dump_bytes"], "per_pass": p["per_pass_files"],
                 "changed": p["changed"], "start": p["start"]["instructions"],
                 "steps": [[s["n"], s["pipeline"], s["pass"], s["instructions"], s["fusions"], s.get("added", 0), s.get("removed", 0),
                            s.get("delta", {}), s.get("diff", []), s.get("diff_truncated", 0)] for s in p["steps"]]}

# ---------------------------------------------------------------- fusion
dft = fus["step"]["default"]
cat = [[r[0], {"kLoop": "L", "kCustom": "C", "kInput": "I", "kOutput": "O"}.get(r[1], "?"), r[2], r[3], r[4][:1] if r[4] != "?" else "?", fn_group(r[5]), r[6]] for r in dft["catalog"]]
breakers = []
for m in fus["breaker_meta"]:
    k = m["key"]
    row = {"key": k, "title": m["title"], "code": m["code"], "s": {}}
    for s in fus["settings"]:
        b = fus["breakers"][s][k]
        row["s"][s] = {"k": b["kernels"], "b": b["bytes_accessed"],
                       "l": [[x["op"], x.get("kind") or "", " ".join(x.get("ops", []))[:90]] for x in b["list"]][:14],
                       "more": max(0, len(b["list"]) - 14)}
    h = fus["breakers"]["default"][k]["hlo"] or ""
    hl = [re.sub(r",?\s*metadata=\{[^{}]*\}", "", l) for l in h.splitlines() if l.strip() and not l.startswith("HloModule")]
    row["hlo"] = [l[:160] for l in hl[:34]]
    row["hlo_more"] = max(0, len(hl) - 34)
    row["dec"] = fus["decisions"].get(k, {})
    breakers.append(row)
fusd = {"cat": cat, "examples": dft["examples"], "dec": fus["decisions"].get("step", {}),
        "dec_ex": fus["decision_examples"].get("step", {}),
        "steps": {s: {k: v for k, v in fus["step"][s].items() if k not in ("catalog", "examples")} for s in fus["settings"]},
        "settings": fus["settings"], "breakers": breakers}

# ---------------------------------------------------------------- recompile
recd = {"sc": [{k: s[k] for k in ("key", "title", "why", "code", "counts", "printed", "error")} | {"explain": s["explain"][-1:] if s["explain"] else []}
               for s in rec["scenarios"]],
        "storm": {"what": rec["storm"]["what"], "label": rec["storm"]["label"],
                  "runs": [{"exact": {k: r["exact"][k] for k in ("compiles", "compile_s", "trace_s", "lower_s", "wall_s", "cpu_s")},
                            "bucketed": {k: r["bucketed"][k] for k in ("compiles", "compile_s", "trace_s", "lower_s", "wall_s", "cpu_s")},
                            "load1": r["load1"]} for r in rec["storm"]["runs"]],
                  "calls_exact": [[c["L"], c["shape"], c["compiled"], c["ms"]] for c in rec["storm"]["runs"][1]["exact"]["calls"]],
                  "calls_bucket": [[c["L"], c["shape"], c["compiled"], c["ms"]] for c in rec["storm"]["runs"][1]["bucketed"]["calls"]]},
        "log": rec["log_compiles"]}

# ---------------------------------------------------------------- profile
pt = prof["timeline"]
profd = {"threads": pt["threads"], "dur": pt["dur_us"], "ev": [[e[0], e[1], e[2], e[3], (e[4] or "?")[:1], fn_group(e[5]) if e[5] else ""] for e in pt["events"]],
         "n_all": pt["n_events_all"], "min_dur": pt["min_dur_us"], "step_ms": prof["step_ms"], "load1": prof["load1"],
         "by_phase": prof["by_phase_us"], "by_kind": prof["by_kind_us"],
         "by_fn": dict(collections.Counter({fn_group(k): 0 for k in prof["by_fn_us"]})),
         "top": [[t["name"], t["us"], t.get("phase") or "", fn_group(t.get("fn") or "")] for t in prof["top_kernels"][:15]],
         "tools": {k: {kk: vv for kk, vv in v.items() if kk in ("ok", "bytes", "n_rows", "cols", "keys", "device_type", "error")} for k, v in prof["xprof_tools"].items()},
         "label": prof["label"], "files": prof["files"]}
byfn = collections.Counter()
for k, v in prof["by_fn_us"].items():
    byfn[fn_group(k)] += v
profd["by_fn"] = dict(byfn.most_common())

# ---------------------------------------------------------------- the rest
cached = {"cases": [{k: c.get(k) for k in ("key", "flags", "what", "wall_s", "cpu_s", "compile_s", "changed_entries", "keys")}
                    | {"hits": c["events"].get("/jax/compilation_cache/cache_hits", 0), "misses": c["events"].get("/jax/compilation_cache/cache_misses", 0),
                       "files": len(c["files_after"]), "entry_bytes": max([f["bytes"] for f in c["files_after"] if "train_step" in f["name"]] or [0])}
                    for c in cache["cases"]],
          "entries": list(cache["cases"][0]["entries"].keys()), "src": {k: src(v) for k, v in cache["source"].items()}, "label": cache["label"]}
expd = {k: exp[k] for k in ("aot", "serialized_executable", "export", "export_versions", "export_head", "in_avals", "shape_poly", "vjp", "fresh_process")}
expd["src"] = {k: src(v) for k, v in exp["source"].items()}
flagd = {"runs": flg["runs"], "docs": flg["docs"], "maxtext": {k: src(v) for k, v in flg["maxtext"].items()}, "doc": src(flg["jax_doc"]), "label": flg["label"]}

# ---------------------------------------------------------------- numbers for prose (data-xp keys)
st = {s: fus["step"][s] for s in fus["settings"]}
fr = {r["key"]: r for r in flg["runs"]}
storm = rec["storm"]["runs"]
med = lambda xs: sorted(xs)[len(xs) // 2]  # noqa: E731
n = {
    "jax": low["versions"]["jax"],
    "step_jaxpr": low["step_expansion"]["jaxpr_eqns"], "step_shlo": low["step_expansion"]["stablehlo_ops"],
    "step_hlo": low["step_expansion"]["hlo_instructions"],
    "step_kernels": st["default"]["kernels"], "step_fusions": st["default"]["fusions"],
    "step_kloop": st["default"]["kinds"].get("kLoop"), "step_kcustom": st["default"]["kinds"].get("kCustom"),
    "step_dots": st["default"]["non_fusion"].get("dot"),
    "root_kernels": r_pipe["opt_hlo"]["kernels"], "root_entry_kernels": r_pipe["opt_hlo"]["entry_by_op"]["fusion"] + r_pipe["opt_hlo"]["entry_by_op"]["dot"], "reducer_bodies": r_pipe["opt_hlo"]["kernels"] - (r_pipe["opt_hlo"]["entry_by_op"]["fusion"] + r_pipe["opt_hlo"]["entry_by_op"]["dot"]),
    "attn_jaxpr": low["attention_block"]["counts"]["jaxpr_eqns"], "attn_shlo": low["attention_block"]["counts"]["stablehlo_ops"],
    "attn_hlo": low["attention_block"]["counts"]["hlo_instructions"],
    "mul_jaxpr": next(r["jaxpr"] for r in step_rows if r["prim"] == "mul"), "mul_shlo": next(r["stablehlo"] for r in step_rows if r["prim"] == "mul"),
    "mul_bcast": next(r["stablehlo_ops"].get("stablehlo.broadcast_in_dim", 0) for r in step_rows if r["prim"] == "mul"),
    "pjrt_minor": int(re.search(r"PJRT_API_MINOR (\d+)", low["source"][-1]["quote"]).group(1)),
    "cpu_addpass": pipe["counts"]["cpu_addpass"], "gpu_addpass": pipe["counts"]["gpu_addpass"],
    "cpu_classes": pipe["counts"]["cpu_classes"], "gpu_classes": pipe["counts"]["gpu_classes"], "shared_classes": pipe["counts"]["shared_classes"],
    "pass_step_files": pdiff["programs"]["step"]["per_pass_files"], "pass_step_changed": pdiff["programs"]["step"]["changed"],
    "pass_attn_files": pdiff["programs"]["attn"]["per_pass_files"], "pass_attn_changed": pdiff["programs"]["attn"]["changed"],
    "dump_step_mb": round(pdiff["programs"]["step"]["dump_bytes"] / 1e6, 1),
    "bytes_default_gb": round(st["default"]["bytes_accessed"] / 1e9, 2), "bytes_nofusion_gb": round(st["no_fusion"]["bytes_accessed"] / 1e9, 2),
    "bytes_nolib_gb": round(st["no_library"]["bytes_accessed"] / 1e9, 2),
    "bytes_ratio": round(st["no_fusion"]["bytes_accessed"] / st["default"]["bytes_accessed"], 1),
    "kernels_nofusion": st["no_fusion"]["kernels"], "kernels_nolib": st["no_library"]["kernels"],
    "temp_default_mb": round(st["default"]["temp_bytes"] / 1e6, 1), "temp_nofusion_mb": round(st["no_fusion"]["temp_bytes"] / 1e6, 1),
    "dec_dup": fus["decisions"]["step"].get("refuse: expensive producer would be duplicated", 0),
    "dec_red": fus["decisions"]["step"].get("refuse: Too many reductions inside single fusion.", 0),
    "dec_prof": fus["decisions"]["step"].get("refuse: Fusion is not profitable.", 0),
    "peak_mb": round(buf["peak"]["bytes"] / 1e6, 1), "xla_peak_mb": round(buf["peak"]["xla_bytes"] / 1e6, 1),
    "peak_diff_pct": round(abs(buf["peak"]["bytes"] - buf["peak"]["xla_bytes"]) / buf["peak"]["xla_bytes"] * 100, 1),
    "sched_len": buf["schedule_len"], "peak_pos": buf["peak"]["xla_pos"], "allocs": buf["allocations"]["count"],
    "alloc_thread_local": buf["allocations"]["by_kind"].get("thread-local"),
    "alloc_param_out": buf["allocations"]["by_kind"].get("parameter+maybe-live-out"),
    "prealloc_mb": round(buf["allocations"]["bytes_by_kind"].get("preallocated-temp", 0) / 1e6, 1),
    "peak_div_pct": buf["peak"]["rows"][0]["pct"], "peak_erfc_pct": buf["peak"]["rows"][1]["pct"],
    "inplace_mib": inp["array_bytes"] // (1024 * 1024),
    "cache_entry_kb": round(cached["cases"][0]["entry_bytes"] / 1000), "cache_cold_cpu": round(cache["cases"][0]["cpu_s"], 2),
    "cache_warm_cpu": round(cache["cases"][1]["cpu_s"], 2),
    "exe_bytes_kb": round(exp["serialized_executable"]["bytes"] / 1000), "exe_load_s": exp["fresh_process"]["executable_load"]["cpu_s"],
    "export_call_s": exp["fresh_process"]["export_call"]["cpu_s"],
    "export_cpu_kb": round(exp["export"]["cpu"]["serialized_bytes"] / 1000, 1), "export_multi_kb": round(exp["export"]["cpu+cuda+tpu"]["serialized_bytes"] / 1000, 1),
    "export_ops": exp["export"]["cpu"]["stablehlo_ops"], "export_ops_multi": exp["export"]["cpu+cuda+tpu"]["stablehlo_ops"],
    "export_ccv": exp["export"]["cpu"]["calling_convention_version"], "poly_kb": round(exp["shape_poly"]["serialized_bytes"] / 1000, 1),
    "vjp_kb": round(exp["vjp"]["serialized_bytes_vjp1"] / 1000, 1), "vjp0_kb": round(exp["vjp"]["serialized_bytes_vjp0"] / 1000, 1),
    "storm_exact_compiles": storm[1]["exact"]["compiles"], "storm_bucket_compiles": storm[1]["bucketed"]["compiles"],
    "storm_exact_s": med([r["exact"]["compile_s"] for r in storm]), "storm_bucket_s": med([r["bucketed"]["compile_s"] for r in storm]),
    "flag_default_step": round(fr["default"]["step_cpu_s"], 2), "flag_nofusion_step": round(fr["no_fusion"]["step_cpu_s"], 2),
    "flag_o0_step": round(fr["opt_level_0"]["step_cpu_s"], 2), "flag_nolib_step": round(fr["no_library"]["step_cpu_s"], 2),
    "flag_default_compile": round(fr["default"]["compile_cpu_s"], 2), "flag_o0_compile": round(fr["opt_level_0"]["compile_cpu_s"], 2),
    "flag_nofusion_compile": round(fr["no_fusion"]["compile_cpu_s"], 2),
    "prof_step_ms": med(prof["step_ms"]),
    "torch_eager_ops": r_torch["eager"]["leaf_ops"], "torch_inductor_kernels": r_torch["inductor"]["generated_kernels"],
}
rt = J("reading_time.json") if os.path.exists(os.path.join(OUT, "reading_time.json")) else {"minutes": 0, "extra_minutes": 0}
n["read_min"], n["read_extra_min"] = rt["minutes"], rt["extra_minutes"]
tot = sum(v for k, v in prof["by_phase_us"].items())
for k in ("forward", "backward", "optimiser"):
    n["prof_%s_pct" % k] = round(100 * prof["by_phase_us"].get(k, 0) / tot)

XPD = {"meta": {"versions": low["versions"], "xla": pipe["xla_commit"], "jax_commit": "32544801e261"},
       "low": lowd, "pipe": pip, "pass": passes, "fuse": fusd, "rec": recd, "buf": buf, "inp": inp, "cache": cached,
       "exp": expd, "prof": profd, "flags": flagd, "n": n}
js = "// generated by src/lab/make_data.py from src/lab/out/*.json: do not edit\nwindow.XPD=" + json.dumps(XPD, separators=(",", ":"), ensure_ascii=False) + ";\n"
with open(PART, "w") as f:
    f.write(js)
with open(os.path.join(OUT, "prose_numbers.json"), "w") as f:
    json.dump(n, f, indent=1)
print("wrote", os.path.relpath(PART, HERE), len(js.encode()), "bytes;", len(n), "prose numbers")
for k in ("low", "pipe", "pass", "fuse", "rec", "buf", "inp", "cache", "exp", "prof", "flags"):
    print("  %-6s %7d" % (k, len(json.dumps(XPD[k], separators=(",", ":")))))
