"""Export what the lab recorded (MLflow server + Metaflow datastore + logs) to ../runs/mp_lab.json, scrubbed.

Run with the lab environment (env.sh) and the MLflow server up:  python export.py
Only ids, hashes, parameters, metrics, timings and sizes leave the scratch folder: no paths, no user names.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402
import mlflow  # noqa: E402
from metaflow import Flow, namespace  # noqa: E402

SCR = os.environ["MP_SCRATCH"]
OUT = os.path.join(C.LAB, "..", "runs", "mp_lab.json")
NAME = "mi-tiny-gpt"


def ms(t):
    return None if t is None else int(t)


def du(path):
    tot = 0
    for root, _, files in os.walk(path):
        for f in files:
            tot += os.path.getsize(os.path.join(root, f))
    return tot


def scrub(s):
    s = s.replace(SCR, "<scratch>")
    return re.sub("/" + "Users" + r"/[^/\s]+", "<home>", s)


def main():
    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
    cl = mlflow.MlflowClient()
    exp = cl.get_experiment_by_name("mi-running-example")
    runs = []
    for r in cl.search_runs([exp.experiment_id], order_by=["attributes.start_time ASC"]):
        t = r.data.tags
        hist = [[m.step, m.value] for m in cl.get_metric_history(r.info.run_id, "train_loss")]
        runs.append(dict(
            id=r.info.run_id, name=r.info.run_name, status=r.info.status,
            start=ms(r.info.start_time), end=ms(r.info.end_time),
            params={k: r.data.params[k] for k in ("lr", "steps", "seed", "split") if k in r.data.params},
            tags={k: t.get(k) for k in ("metaflow.run", "code_sha", "data_sha", "train_sha", "val_sha", "ckpt_sha",
                                        "torch", "python", "platform", "mlflow.user", "mlflow.source.name")},
            metrics={k: v for k, v in r.data.metrics.items()}, curve=sorted(hist)))
    versions = []
    for mv in sorted(cl.search_model_versions(f"name='{NAME}'"), key=lambda m: int(m.version)):
        versions.append(dict(version=mv.version, run=mv.run_id, source=mv.source, status=mv.status,
                             created=ms(mv.creation_timestamp), aliases=list(mv.aliases), tags=dict(mv.tags)))
    rm = cl.get_registered_model(NAME)
    # Metaflow: every run, its tasks, and the content address of every artifact
    namespace(None)
    mf = []
    for run in Flow("TinyGPTFlow").runs():
        steps = []
        for s in run:
            for task in s:
                md = {m.name: m.value for m in task.metadata}
                arts = [{"name": a.id, "sha": a.sha[:12], "bytes": a.size} for a in task.artifacts
                        if not a.id.startswith("_")]
                steps.append(dict(step=s.id, task=task.id, ok=task.successful,
                                  start=int(task.created_at.timestamp() * 1000),
                                  end=int(task.finished_at.timestamp() * 1000) if task.finished_at else None,
                                  origin_run=md.get("origin-run-id"), origin_task=md.get("origin-task-id"),
                                  artifacts=sorted(arts, key=lambda a: a["name"])))
        mf.append(dict(id=run.id, ok=run.successful, finished=run.finished,
                       created=int(run.created_at.timestamp() * 1000),
                       tags=sorted(x for x in run.tags if not x.startswith("user:")) + ["user:mp-lab"],
                       steps=sorted(steps, key=lambda x: x["start"])))
    mf.sort(key=lambda r: r["created"])
    # an MLmodel file, as stored
    v3 = [v for v in versions if v["version"] == rm.aliases.get("champion")][0]
    mid = v3["source"].split("/")[-1]
    mlmodel = open(os.path.join(SCR, "srv", "artifacts", exp.experiment_id, "models", mid, "artifacts", "MLmodel")).read()
    files = []
    base = os.path.join(SCR, "srv", "artifacts", exp.experiment_id, "models", mid, "artifacts")
    for root, _, fs in os.walk(base):
        for f in fs:
            p = os.path.join(root, f)
            files.append([os.path.relpath(p, base), os.path.getsize(p)])
    out = dict(
        note="Recorded 2026-10-16 on Apple M1 Pro (macOS, native, CPU), shared machine; MLflow 3.17.1 server (sqlite + local artifacts), Metaflow 2.19.39 local datastore, torch 2.14.1.",
        experiment=exp.experiment_id, runs=runs, versions=versions, aliases=dict(rm.aliases), metaflow=mf,
        mlmodel=scrub(mlmodel), model_files=sorted(files),
        storage={"mlflow_db": os.path.getsize(os.path.join(SCR, "srv", "mlflow.db")),
                 "mlflow_artifacts": du(os.path.join(SCR, "srv", "artifacts")),
                 "metaflow_datastore": du(os.path.join(SCR, "mf"))})
    for k in ("repro_v1_check", "repro_champion"):
        out[k] = json.load(open(os.path.join(SCR, "logs", k + ".json")))
    json.dump(out, open(OUT, "w"), indent=1)
    print("wrote", os.path.relpath(OUT), os.path.getsize(OUT), "bytes;", len(runs), "runs,", len(versions), "versions,", len(mf), "metaflow runs")


if __name__ == "__main__":
    main()
