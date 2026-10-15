"""Merge the recorded run outputs (out/*.json) into parts/22_js_lc_data.js (window.LC). Nothing here is typed by hand
except labels; every number comes from a recorded file. Run from anywhere: python3 -B build_data.py"""
import os, json, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out")
J = lambda n: json.load(open(os.path.join(OUT, n)))
R = lambda x, d=6: float(f"{x:.{d}g}")
cfg, cfgd, shard, fwd, train, remat, mfu, tunix, hal, mp, src, imp = (J(n) for n in (
    "cfg.json", "cfgdata.json", "shard.json", "fwd.json", "train.json", "remat.json", "mfu.json", "tunix.json", "haliax.json", "map.json", "source.json", "imports.json"))

LC = {}
# ---- config parses
runs = []
for r in cfg["runs"]:
    e = {"label": r["label"], "overrides": r["overrides"], "ok": r["ok"], "wall_s": r["wall_s"]}
    if r["ok"]:
        e["v"] = {k: r["values"].get(k) for k in ("decoder_block", "emb_dim", "num_query_heads", "num_kv_heads", "head_dim", "mlp_dim",
                  "num_decoder_layers", "vocab_size", "global_batch_size_to_train_on", "ici_fsdp_parallelism", "ici_tensor_parallelism",
                  "remat_policy", "scan_layers", "dtype", "weight_dtype", "learning_rate", "adam_b2", "opt_type", "attention")}
    else:
        msg = r["error"]
        if msg.startswith("'remat_polcy' not in"):
            n = msg.count("', '") + 1
            msg = msg[:120] + " ... (the message goes on to list every valid key)"
        e["error"] = r.get("error_type", "Error") + ": " + msg
    if r.get("mesh"): e["mesh"] = r["mesh"]
    if r.get("mesh_error"): e["mesh_error"] = r["mesh_error"]
    runs.append(e)
LC["cfg"] = {"n_fields": cfg["n_fields_pydantic"], "devices": cfg["devices"], "runs": runs,
             "base_lines": cfgd["base_lines"], "base_keys": cfgd["base_top_level_keys"], "n_models": cfgd["n_model_files"],
             "models": cfgd["models"], "rows": cfgd["rows"], "runex": cfg["runex_overrides"],
             "rules": {"base": cfg["runs"][0]["rules_all"], "llama2-7b": cfg["runs"][1]["rules_all"]}}
# ---- sharding of real configs (parameters only)
cases = []
for c in shard["cases"]:
    rows = [{k: r[k] for k in ("name", "shape", "logical", "spec", "shard_shape", "params", "bytes", "bytes_per_device", "error")}
            for r in c["rows"] if r["type"] == "Param"]
    if "scan_layers=False" in c["label"]:   # 291 arrays: keep the summary and layer 0 only
        rows = [r for r in rows if "layers_0." in r["name"] or ".layers_" not in r["name"]]
    cases.append({"label": c["label"], "mesh": c["mesh_nontrivial"], "n": c["n_param_arrays"], "params": c["total_params"],
                  "bytes": c["param_bytes_total"], "bytes_dev": c["param_bytes_per_device"], "rows": rows})
LC["shard"] = {"devices": shard["devices"], "cases": cases}
# ---- the running example inside MaxText
LC["fwd"] = {k: fwd[k] for k in ("n_params_maxtext", "batch_shape", "max_abs_logit_diff_vs_tanh_gelu_twin",
             "max_abs_logit_diff_vs_running_example_exact_gelu", "max_abs_logit_diff_tanh_vs_exact_twin", "loss_maxtext",
             "loss_running_example", "loss_running_example_tanh", "build_wall_s")}
LC["fwd"]["shapes"] = fwd["param_shapes_maxtext"]
# ---- training with MaxText's step
def rl(a): return [round(x, 6) for x in a]
LC["train"] = {"steps": train["steps"], "warmup": train["warmup"], "mt": rl(train["maxtext_loss"]), "twin": rl(train["twin_loss"]),
               "re": rl(train["running_example_loss_jax"]), "gn": rl(train["maxtext_raw_grad_norm"]),
               "var": {k: rl(v) for k, v in train["variant_loss"].items()},
               "var_diff": train["variant_max_abs_diff_vs_twin"], "diff_twin": train["max_abs_loss_diff_maxtext_vs_twin"],
               "diff_re": train["max_abs_loss_diff_maxtext_vs_running_example"], "lr10": [R(x, 4) for x in train["maxtext_lr_every10"]],
               "step_med": train["step_time_median_s"], "step_p90": train["step_time_p90_s"], "setup_s": train["setup_wall_s"],
               "load": train["load_1min"], "decayed": train["decayed_leaves"],
               "s0": {"calls": train["step0"]["python_calls"], "wall": train["step0"]["wall_s"], "cpu": train["step0"]["cpu_s"],
                      "fns": [[f["file"].replace("src/maxtext/", ""), f["fn"], f["line"], f["depth"]] for f in train["step0"]["maxtext_functions_first_seen"]]},
               "s1": {"calls": train["step1"]["python_calls"], "wall": train["step1"]["wall_s"], "cpu": train["step1"]["cpu_s"], "n_fns": len(train["step1"]["maxtext_functions_first_seen"])}}
LC["remat"] = {"rows": remat["rows"], "load": remat["load_1min"]}
LC["mfu"] = {"peak": mfu["peak_flops"], "rows": mfu["rows"], "runex": mfu["running_example"]}
for r in LC["mfu"]["rows"]: r.pop("params_from_formula_6N_check", None)
LC["tunix"] = {"A": {"loss": rl(tunix["A"]["loss"]), "ref": rl(tunix["A"]["root_nnx_loss"]), "diff": tunix["A"]["max_abs_diff_vs_root_nnx"],
                     "wall": tunix["A"]["wall_s"], "cpu": tunix["A"]["cpu_s"]},
               "B": {k: dict(v, loss=rl(v["loss"])) for k, v in tunix["B"].items()}, "B_setup": tunix["B_setup"]}
LC["hal"] = hal
LC["map"] = mp
LC["src"] = {k: [v["file"], v["line"], v["repo"]] for k, v in src["loc"].items()}
LC["imports"] = imp["imports"]
s = "// Generated by src/build_data.py from src/out/*.json. Do not edit.\nwindow.LC=" + json.dumps(LC, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "22_js_lc_data.js"), "w").write(s)
print(len(s), "bytes")
