"""Copy the small results of the setup's runs into src/data/smoke/runs.json (loss curves, speed, memory, samples).
Run: LA_SCRATCH=<scratch>/la python3 src/data/smoke_summary.py smoke_baseline smoke_mla smoke_hybrid ref_baseline_s1500"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ["LA_SCRATCH"]
out = {"measured_on": "Apple M1 Pro, MPS, fp32, torch 2.14.1, 2026-10-18", "runs": []}
for name in sys.argv[1:]:
    d = os.path.join(SCR, "runs", name)
    log = json.load(open(os.path.join(d, "log.json")))
    ev = json.load(open(os.path.join(d, "eval.json"))) if os.path.exists(os.path.join(d, "eval.json")) else {}
    out["runs"].append({
        "name": name, "preset": log["preset"], "status": log["status"], "steps": log["steps_done"],
        "tokens_seen": log["tokens_seen"], "seconds": log["seconds"], "median_tok_s": log["median_tok_s"],
        "peak_rss_mb": log["peak_rss_mb"], "mps_driver_mb_end": log["mps_driver_mb_end"], "mps_driver_mb_peak_sampled": log.get("mps_driver_mb_peak_sampled"),
        "params_total": log["params"]["total"], "params_active": log["params"]["active"],
        "val_curve": [[e["step"], e["val_loss"]] for e in log["eval"]],
        "train_curve": [[r["step"], r["loss"], r["grad_norm"]] for r in log["train"][::5]],
        "eval_val_loss_100x32": ev.get("val_loss"), "running_sequence_mean_loss": ev.get("running_sequence_mean_loss"),
        "samples_greedy": [s["greedy"][:240] for s in ev.get("samples", [])]})
os.makedirs(os.path.join(HERE, "smoke"), exist_ok=True)
json.dump(out, open(os.path.join(HERE, "smoke", "runs.json"), "w"), indent=1)
for r in out["runs"]:
    print(r["name"], r["steps"], r["seconds"], r["median_tok_s"], r["val_curve"][-1], r["eval_val_loss_100x32"], r["peak_rss_mb"], r["mps_driver_mb_end"])
