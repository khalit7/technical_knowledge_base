"""collect_runs.py: copy the held-out curves of the GPU runs from scratch logs into out/runs_eval.json (scratch is not
durable). Needs LA_SCRATCH. Runs: the topic's reference (ref_baseline_s1500, read-only), and this page's fo_* runs."""
import json, os
from pathlib import Path
SCR = Path(os.environ["LA_SCRATCH"]) / "runs"
out = {}
for name in ("ref_baseline_s1500", "fo_mtp_joint", "fo_mtp_joint_s1", "fo_base_s1", "fo_base_1980"):
    p = SCR / name / "log.json"
    if not p.exists():
        print("missing", name); continue
    L = json.load(open(p))
    ev = [{"step": e["step"], "val": round(e["val_loss"], 4), **({"mtp": e["val_mtp"]} if "val_mtp" in e else {})} for e in L["eval"]]
    out[name] = {"eval": ev, "final": ev[-1]["val"], "seconds": L.get("seconds"), "device": L.get("device", "mps"),
                 "steps": L.get("steps_done") or L["args"]["steps"], "seed": L["args"].get("seed", 0),
                 "tokens_per_step": L.get("tokens_per_step", 8192), "lam": L.get("lam")}
    print(name, out[name]["final"], out[name]["steps"])
json.dump(out, open(Path(__file__).parent / "out" / "runs_eval.json", "w"), indent=1)
