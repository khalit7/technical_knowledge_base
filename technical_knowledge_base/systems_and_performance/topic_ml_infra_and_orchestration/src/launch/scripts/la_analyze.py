#!/usr/bin/env python3
"""Launch lab: turn the probe files of the timing runs into stage times (src/launch/out/launch_times.json).

usage: python3 la_analyze.py <evidence root> <out json>
Evidence root holds slurm/<run>/, k8s/<run>/ (plus k8s_runs/<run>/ with the probe files) and ray/<run>/.

Every boundary is the time the LAST node or rank reached it (the job moves at the pace of its slowest member), so
consecutive boundaries give the stages on the job's critical path. Times are from the Docker VM's one clock
(all containers share it), so differences across containers are meaningful.
"""
import glob, json, os, sys
from datetime import datetime, timezone


def jl(p):
    with open(p) as f:
        return json.load(f)


def iso(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()


def step1(run_dir):
    """(max ts of 'start', max ts of first 'step') over ranks."""
    st, s1 = [], []
    for p in sorted(glob.glob(os.path.join(run_dir, "rank*.jsonl"))):
        evs = [json.loads(l) for l in open(p) if l.strip()]
        st.append(max(e["ts"] for e in evs if e["ev"] == "start"))
        s1.append(min(e["ts"] for e in evs if e["ev"] == "step"))
    return max(st), max(s1)


def torchrun_part(run_dir):
    agents = [jl(p) for p in sorted(glob.glob(os.path.join(run_dir, "agent_*.json")))]
    probes = [jl(p) for p in sorted(glob.glob(os.path.join(run_dir, "probe_rank*.json")))]
    b = {
        "task": max(a["task_ts"] for a in agents),
        "agent_import": max(a["t_import"] for a in agents),
        "rdzv": max(a["rdzv"][0]["t1"] for a in agents),
        "worker_import": max(p["t_import"] for p in probes),
        "pg": max(p["t_pg1"] for p in probes),
    }
    b["model"], b["step1"] = step1(run_dir)
    per_node = [{"host": a["host"], "task": a["task_ts"], "agent_import": a["t_import"], "rdzv0": a["rdzv"][0]["t0"],
                 "rdzv1": a["rdzv"][0]["t1"], "workers": a["workers"][0]} for a in agents]
    per_rank = [{"rank": p["rank"], "host": p["host"], "t0": p["t0"], "import": p["t_import"], "pg0": p["t_pg0"],
                 "pg1": p["t_pg1"]} for p in probes]
    return b, per_node, per_rank


def stages(order, b):
    return [{"stage": n, "s": round(b[k] - b[order[i - 1][1]], 3)} for i, (n, k) in enumerate(order) if i > 0]


TAIL = [("rendezvous (agents meet)", "rdzv"), ("spawn workers, import torch", "worker_import"),
        ("init_process_group", "pg"), ("data, model, DDP wrapper", "model"), ("first step", "step1")]


def slurm(root):
    out = []
    for d in sorted(glob.glob(os.path.join(root, "slurm", "la-t[0-9]*"))):
        sub = float(open(os.path.join(d, "submit.txt")).read().split()[0])
        b, nodes, ranks = torchrun_part(d)
        b["submit"] = sub
        b["batch"] = jl(os.path.join(d, "batch.json"))["batch_ts"]
        order = [("submit", "submit"), ("queue and dispatch (sbatch to batch script)", "batch"),
                 ("srun starts one task per node", "task"), ("torchrun imports", "agent_import")] + TAIL
        out.append({"run": os.path.basename(d), "stages": stages(order, b), "total_s": round(b["step1"] - sub, 3),
                    "nodes": nodes, "ranks": ranks, "t_submit": sub})
    return out


def k8s(root):
    out = []
    for d in sorted(glob.glob(os.path.join(root, "k8s", "la-t[0-9]*"))):
        name = os.path.basename(d)
        sub = float(open(os.path.join(d, "submit.txt")).read().split()[0])
        rd = os.path.join(root, "k8s_runs", name)
        b, nodes, ranks = torchrun_part(rd)
        b["submit"] = sub
        # 1-second resolution checkpoints from the API objects (for the sub-split shown beside the bar)
        wl = [w for w in jl(os.path.join(d, "workloads.json"))["items"]
              if w["metadata"]["name"].startswith("jobset-" + name + "-")]
        pods = jl(os.path.join(d, "pods.json"))["items"]
        sec = {}
        if wl:
            for c in wl[0]["status"].get("conditions", []):
                if c["type"] in ("QuotaReserved", "Admitted"):
                    sec[c["type"]] = iso(c["lastTransitionTime"])
        sec["PodScheduled"] = max(iso(c["lastTransitionTime"]) for p in pods for c in p["status"]["conditions"]
                                  if c["type"] == "PodScheduled")
        sec["ContainerStarted"] = max(iso(cs["state"].get("terminated", cs["state"].get("running", {}))["startedAt"])
                                      for p in pods for cs in p["status"]["containerStatuses"])
        order = [("submit", "submit"), ("admit, schedule, start containers", "task"),
                 ("torchrun imports", "agent_import")] + TAIL
        out.append({"run": name, "stages": stages(order, b), "total_s": round(b["step1"] - sub, 3),
                    "api_1s": {k: round(v - sub, 3) for k, v in sec.items()},
                    "nodes": nodes, "ranks": ranks, "t_submit": sub})
    return out


def ray(root):
    out = []
    for d in sorted(glob.glob(os.path.join(root, "ray", "la-t[0-9]*"))):
        drv = jl(os.path.join(d, "driver.json"))
        pgs = [jl(p) for p in glob.glob(os.path.join(d, "raypg_*.json"))]
        pgs = [p for p in pgs if "t_pg0" in p]
        loops = [jl(p) for p in glob.glob(os.path.join(d, "loop_rank*.json"))]
        b = {"submit": drv["t0"], "import": drv["t_import"], "init": drv["t_init"],
             "setup": max(p["t_setup"] for p in pgs), "pg0": max(p["t_pg0"] for p in pgs),
             "pg": max(p["t_pg1"] for p in pgs), "loop": max(l["t_loop"] for l in loops)}
        b["model"], b["step1"] = step1(d)
        order = [("submit", "submit"), ("driver imports ray", "import"), ("ray.init connects to the cluster", "init"),
                 ("controller, placement group, worker processes start and import torch", "setup"),
                 ("worker actors ready, address chosen", "pg0"), ("init_process_group", "pg"),
                 ("training function starts", "loop"), ("data, model, DDP wrapper", "model"), ("first step", "step1")]
        out.append({"run": os.path.basename(d), "stages": stages(order, b), "total_s": round(b["step1"] - b["submit"], 3),
                    "workers": [{"host": p["host"], "setup": p["t_setup"], "pg0": p["t_pg0"], "pg1": p["t_pg1"]} for p in pgs],
                    "t_submit": b["submit"]})
    return out


def summary(runs):
    names = [s["stage"] for s in runs[0]["stages"]]
    res = []
    for i, n in enumerate(names):
        v = sorted(r["stages"][i]["s"] for r in runs)
        res.append({"stage": n, "min": v[0], "median": v[len(v) // 2], "max": v[-1], "all": v})
    tot = sorted(r["total_s"] for r in runs)
    return {"stages": res, "total": {"min": tot[0], "median": tot[len(tot) // 2], "max": tot[-1], "all": tot}, "n": len(runs)}


if __name__ == "__main__":
    root, outp = sys.argv[1], sys.argv[2]
    res = {"note": "measured on Apple M1 Pro, Docker Desktop VM, shared machine; 2 nodes x 2 ranks, running example, image already on every node",
           "systems": {}}
    for name, f in (("slurm", slurm), ("k8s", k8s), ("ray", ray)):
        try:
            runs = f(root)
        except FileNotFoundError as e:
            print(name, "missing", e)
            runs = []
        if runs:
            res["systems"][name] = {"runs": runs, "summary": summary(runs)}
            print(name, len(runs), "runs; total median", res["systems"][name]["summary"]["total"]["median"])
            for s in res["systems"][name]["summary"]["stages"]:
                print("   %-48s %6.2f %6.2f %6.2f" % (s["stage"], s["min"], s["median"], s["max"]))
    json.dump(res, open(outp, "w"), indent=1)
