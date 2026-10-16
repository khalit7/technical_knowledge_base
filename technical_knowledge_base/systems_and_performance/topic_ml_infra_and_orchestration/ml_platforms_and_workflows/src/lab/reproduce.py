"""Reproduce a registered model version from what the tracker recorded.

  python reproduce.py champion          # resolve the alias, check code/data/env, rerun, compare bits
  python reproduce.py 1 --check-only    # only the checks, for version 1

Writes one JSON object to stdout.
"""
import json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402
import mlflow  # noqa: E402

NAME = "mi-tiny-gpt"


def main():
    ref, check_only = sys.argv[1], "--check-only" in sys.argv
    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
    cl = mlflow.MlflowClient()
    mv = cl.get_model_version_by_alias(NAME, ref) if not ref.isdigit() else cl.get_model_version(NAME, ref)
    run = cl.get_run(mv.run_id)
    p, t = run.data.params, run.data.tags
    env = C.env_info()
    checks = {
        "code_sha": [t["code_sha"], C.code_sha()],
        "data_sha": [t["data_sha"], C.sha256_file(os.environ["MP_DATA"])],
        "torch": [t["torch"], env["torch"]],
        "platform": [t["platform"], env["os"] + "-" + env["machine"]],
    }
    out = {"ref": ref, "version": mv.version, "run_id": mv.run_id, "params": p,
           "checks": {k: {"recorded": a[:12] if len(a) > 20 else a, "now": b[:12] if len(b) > 20 else b, "same": a == b}
                      for k, (a, b) in checks.items()},
           "recorded": {"val_loss": float(mv.tags["val_loss"]), "ckpt_sha": mv.tags["ckpt_sha"][:12],
                        "train_loss_last": run.data.metrics.get("train_loss")}}
    out["cmd"] = ["python", "flow.py", "run", "--lr", p["lr"], "--steps", p["steps"], "--seed", p["seed"], "--split", p["split"]]
    if not check_only:
        r = subprocess.run(out["cmd"], capture_output=True, text=True, cwd=C.LAB)
        line = [l for l in (r.stdout + r.stderr).splitlines() if '"promoted"' in l][-1]
        new = json.loads(line[line.index("{"):])
        nmv = cl.get_model_version(NAME, new["version"])
        nrun = cl.get_run(new["mlflow_run"])
        out["rerun"] = {"version": new["version"], "metaflow_run": new["run"], "val_loss": new["val_loss"],
                        "ckpt_sha": nmv.tags["ckpt_sha"][:12], "train_loss_last": nrun.data.metrics.get("train_loss"),
                        "promoted": new["promoted"]}
        out["bit_identical"] = {"val_loss": new["val_loss"] == out["recorded"]["val_loss"],
                                "train_loss_last": out["rerun"]["train_loss_last"] == out["recorded"]["train_loss_last"],
                                "ckpt_sha": nmv.tags["ckpt_sha"] == mv.tags["ckpt_sha"]}
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
