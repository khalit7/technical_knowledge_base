"""Copy the training logs of this page's runs from $LA_SCRATCH/runs/<name>/log.json into src/runs/logs/ (small JSON),
so the page rebuilds without the scratch folder. Absolute paths are not recorded in the logs (train.py stores args only).
Run: LA_SCRATCH=<scratch>/la python3 src/runs/collect.py
"""
import json, os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = ["ref_baseline_s1500", "mx_moe8top2", "mx_moe16top3_shared", "mx_moe8top2_bias", "mx_moe8top2_none", "mx_moe8top2_sbias",
        "mx_moe8top2_cap1", "mx_moe8top2_s1", "mx_baseline_s1", "mx_probe_loop", "mx_probe_fast"]
os.makedirs(os.path.join(HERE, "logs"), exist_ok=True)
for n in RUNS:
    src = os.path.join(os.environ["LA_SCRATCH"], "runs", n, "log.json")
    if os.path.exists(src):
        d = json.load(open(src))
        json.dump(d, open(os.path.join(HERE, "logs", n + ".json"), "w"), separators=(",", ":"))
        print(n, d["status"], d.get("final_val_loss"), d.get("seconds"), "s")
    else:
        print(n, "not yet")
