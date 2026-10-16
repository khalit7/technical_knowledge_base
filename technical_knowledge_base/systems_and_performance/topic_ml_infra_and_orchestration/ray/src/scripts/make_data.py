#!/usr/bin/env python3
"""Build ../ry_data.json and ../parts/15_js_ry_data.js from the scrubbed runs in ../runs/.
usage: python3 make_data.py      (from anywhere)
Everything the page draws or quotes as measured comes from here; check_data.py verifies the page against it.
"""
import json, os, re, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
RUNS = os.path.join(SRC, "runs")
ROOT_DATA = os.path.join(os.path.dirname(os.path.dirname(SRC)), "src", "data")


def jl(path):
    out = []
    for line in open(path):
        line = line.strip()
        if line.startswith("{"):
            out.append(json.loads(line))
    return out


def by(recs, ev):
    return [r for r in recs if r.get("ev") == ev]


def utc_s(stamp):  # "[2026-10-16 06:24:15,479 ..." -> unix seconds (container clocks are UTC)
    m = re.search(r"\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d),(\d{3})", stamp)
    d = datetime.datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S").replace(tzinfo=datetime.timezone.utc)
    return d.timestamp() + int(m.group(2)) / 1000


C = os.path.join(RUNS, "core")
D = {"note": "measured on Apple M1 Pro, Docker Desktop VM, shared machine; Ray 2.59.0 in containers (head 0 CPUs, 2 workers x 2 CPUs, 80 MB object store each); 2026-10-16"}

# ---- cluster: processes and memory
def ps(name):
    rows = []
    for line in open(os.path.join(C, f"ps_mi-ray-{name}.txt")):
        pid, rss, cmd = line.rstrip("\n").split("\t", 2)
        if cmd.startswith("python /shared/ry") or int(rss) == 0:
            continue
        short = cmd
        for pat, lab in [(r"gcs_server", "gcs_server (the GCS)"), (r"/raylet/raylet", "raylet"),
                         (r"dashboard/dashboard\.py", "dashboard (main)"), (r"ray-dashboard-(\w+)-0", None),
                         (r"ray::DashboardAgent", "dashboard agent"), (r"ray::RuntimeEnvAgent", "runtime env agent"),
                         (r"ray start", "ray start (launcher, --block)"), (r"ray\.util\.client\.server", "Ray Client server"),
                         (r"autoscaler/_private/monitor\.py", "autoscaler monitor"), (r"log_monitor\.py", "log monitor"),
                         (r"multiprocessing\.forkserver", "dashboard forkserver")]:
            m = re.search(pat, cmd)
            if m:
                short = lab or ("dashboard module " + m.group(1))
                break
        rows.append({"rss": int(rss), "what": short[:60]})
    return rows

D["procs"] = {n: ps(n) for n in ("head", "w1", "w2")}
mem = {}
sec = None
for line in open(os.path.join(C, "mem.txt")):
    if line.startswith("=="):
        sec = line.split()[1]
        continue
    name, used, unit = line.split()[0], line.split()[1], None
    v = float(re.match(r"([\d.]+)", used).group(1)) * (1024 if "GiB" in used else 1)
    mem.setdefault(sec, {})[name.replace("mi-ray-", "")] = round(v)
D["mem_idle_mb"] = mem["procs"]
D["mem_after"] = {k: v for k, v in mem.items()}

# ---- tasks and actors
T = jl(os.path.join(C, "tasks.jsonl"))
D["tasks"] = {
    "rtt": by(T, "task_rtt")[0], "batch": by(T, "task_batch")[0], "actor_create": by(T, "actor_create")[0],
    "actor_rtt": by(T, "actor_rtt")[0], "actor_batch": by(T, "actor_batch")[0],
    "naps": {r["mode"]: {"secs": r["secs"], "tasks": r["tasks"]} for r in by(T, "naps")},
    "placement": {r["strategy"]: r["hosts"] for r in by(T, "placement")},
    "placement_first_pass": {r["strategy"]: r["hosts"] for r in by(jl(os.path.join(RUNS, "debug", "tasks_first_pass.jsonl")), "placement")},
}

# ---- objects
O = jl(os.path.join(C, "objects.jsonl"))
D["objects"] = {
    "before": by(O, "locations_before_get")[0], "get_big": by(O, "get_big")[0], "after": by(O, "locations_after_get")[0],
    "readonly": by(O, "write_readonly")[0], "put": by(O, "put_location")[0], "read16": by(O, "read16"),
}

# ---- spilling
S = jl(os.path.join(C, "spill.jsonl"))
st = open(os.path.join(C, "spill_memory.txt")).read()
m1 = re.search(r"Spilled (\d+) MiB, (\d+) objects, avg write throughput (\d+) MiB/s", st)
m2 = re.search(r"Restored (\d+) MiB, (\d+) objects, avg read throughput (\d+) MiB/s", st)
D["spill"] = {"made": [r["t"] for r in by(S, "made")], "reads": [{"i": r["i"], "secs": r["secs"]} for r in by(S, "read")],
              "spilled_mib": int(m1.group(1)), "spilled_n": int(m1.group(2)), "write_mibs": int(m1.group(3)),
              "restored_mib": int(m2.group(1)), "restored_n": int(m2.group(2)), "read_mibs": int(m2.group(3)),
              "store_mb": 80, "obj_mb": 8, "n": 14}

# ---- faults
F = jl(os.path.join(C, "fault.jsonl"))
D["fault"] = {"tasks": by(F, "task_fault"), "actors": by(F, "actor_fault")}

# ---- lineage: everything relative to the docker kill of ray-w2
L = jl(os.path.join(C, "lineage.jsonl"))
kill = float(open(os.path.join(C, "lineage_kill_time.txt")).read())
restart = float(open(os.path.join(C, "lineage_restart_time.txt")).read())
go = by(L, "go")[0]
t_go = go["ts"]  # driver clock (same host VM clock as docker kill)
ev = []
for line in open(os.path.join(C, "lineage_gcs.txt")):
    if "gcs_health_check_manager.cc:209" in line:
        m = re.search(r"remaining checks (\d+)", line)
        ev.append({"t": round(utc_s(line) - kill, 2), "who": "GCS", "what": f"health check failed, remaining checks {m.group(1)}"})
    elif "gcs_health_check_manager.cc:88" in line:
        ev.append({"t": round(utc_s(line) - kill, 2), "who": "GCS", "what": "node marked dead"})
    elif "reconstructing actors that were running on it" in line:
        ev.append({"t": round(utc_s(line) - kill, 2), "who": "GCS", "what": "actor manager reschedules the node's actors"})
    elif "rescheduling the placement groups" in line:
        ev.append({"t": round(utc_s(line) - kill, 2), "who": "GCS", "what": "placement groups on the node rescheduled"})
for r in [json.loads(x) for x in open(os.path.join(C, "lineage_runs.log"))]:
    if r["ts"] > kill:
        ev.append({"t": round(r["ts"] - kill, 2), "who": r["host"], "what": f"task for {r['tag']} runs again (lineage reconstruction)"})
gets = []
clock = t_go
for r in by(L, "get") + by(L, "actor_after"):
    clock += r["secs"]
    rec = {"obj": r.get("obj") or r.get("actor"), "ok": r["ok"], "secs": r["secs"], "done_t": round(clock - kill, 2),
           "type": r.get("type"), "msg": r.get("msg", "")[:420]}
    if "value" in r:
        rec["value"] = r["value"]
    if "host_pid" in r:
        rec["host_pid"] = r["host_pid"]
    gets.append(rec)
D["lineage"] = {"placed": by(L, "placed")[0], "events": sorted(ev, key=lambda e: e["t"]), "gets": gets,
                "go_t": round(t_go - kill, 2), "restart_t": round(restart - kill, 2)}

# ---- Ray Data: per-block timelines of the three modes
D["data"] = {}
for mode in ("streaming", "pipelined", "staged"):
    out = open(os.path.join(C, f"data_{mode}.out")).read()
    done = json.loads([l for l in out.splitlines() if '"ev": "done"' in l][0])
    t0 = done["t0"]
    blocks = [json.loads(l) for l in open(os.path.join(C, f"data_{mode}.log"))]
    ops = re.findall(r"Operator \d+ (.+?): (\d+) tasks executed, (\d+) blocks produced in ([\d.]+)s", out)
    mat = [json.loads(l) for l in out.splitlines() if '"materialized"' in l]
    D["data"][mode] = {"first": done["first_batch_s"], "total": done["total_s"], "rows": done["rows"], "batches": done["batches"],
                       "ops": [{"name": o[0], "tasks": int(o[1]), "blocks": int(o[2]), "secs": float(o[3])} for o in ops],
                       "materialized": mat[0]["t"] if mat else None,
                       "blocks": [{"st": b["stage"], "b": b["block"], "h": b["host"].replace(" (driver)", ""), "p": b["pid"],
                                   "s": round(b["s"] - t0, 3), "e": round(b["e"] - t0, 3)} for b in blocks]}

# ---- Ray Train: three repeats of the same crash, plus the OOM run
ref = {r["step"]: r["gloss"] for r in jl(os.path.join(ROOT_DATA, "runs", "ray", "rank0.jsonl")) if r["ev"] == "step"}
D["train"] = {"ref_gloss": ref, "runs": []}
for k in ("run1", "run2", "run3"):
    P = os.path.join(RUNS, "train", k)
    ctl = [json.loads(l) for l in open(os.path.join(P, "ry-t1_ctl.log"))]
    t0 = ctl[0]["ts"]
    res = json.loads(open(os.path.join(P, "train.out")).read().split("RY_RESULT ", 1)[1].splitlines()[0])
    ranks = []
    for r in range(4):
        recs = jl(os.path.join(P, "logs", f"rank{r}.jsonl"))
        ranks.append([{"ev": x["ev"], "t": round(x["ts"] - t0, 3), "step": x.get("step", x.get("start_step")),
                       "g": x.get("gloss"), "from": x.get("restored_from")} for x in recs])
    store = open(os.path.join(P, "train_storage.txt")).read()
    sizes = re.findall(r"^(\d+)\s+(checkpoint_\S+)", store, re.M)
    D["train"]["runs"].append({
        "name": k, "ctl": [{**{kk: vv for kk, vv in c.items() if kk != "ts"}, "t": round(c["ts"] - t0, 3)} for c in ctl],
        "ranks": ranks, "result": {kk: res[kk] for kk in ("ok", "metrics", "checkpoint", "secs", "storage_listing")},
        "ckpt_bytes": {n: int(b) for b, n in sizes}})
oom = open(os.path.join(C, "train_oom.out")).read()
m = re.search(r"OOM kill reason: (Memory usage \d+B exceeded threshold of \d+B \([\d.]+% of \d+B limit\))", oom)
D["train"]["oom"] = {"reason": m.group(1), "first_line": oom.split("RY_RESULT ", 1)[1][:240]}

json.dump(D, open(os.path.join(SRC, "ry_data.json"), "w"), indent=1)
with open(os.path.join(SRC, "parts", "15_js_ry_data.js"), "w") as f:
    f.write("// generated by src/scripts/make_data.py from src/runs/ (do not edit)\nwindow.RY=" + json.dumps(D, separators=(",", ":")) + ";\n")
print("ok", os.path.getsize(os.path.join(SRC, "ry_data.json")))
