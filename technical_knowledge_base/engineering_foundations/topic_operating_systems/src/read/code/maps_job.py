"""(b) The running job's address space, before and after the DataLoader forks its workers.

Imports the running example (src/trace/job/train.py) unchanged and wraps its phase() marker so that
at chosen phases it saves /proc/<pid>/maps and /proc/<pid>/smaps_rollup of the main process and of
every child (the DataLoader workers). Run inside kb-os-lab:1 with the job folder mounted at /job.
"""
import os, sys, json
sys.path.insert(0, "/job")
OUT = os.environ.get("MAPS_OUT", "/out/maps")
os.makedirs(OUT, exist_ok=True)
import psutil  # noqa: E402

snap = {}


def dump(tag):
    me = os.getpid()
    procs = [("main", me)] + [(f"worker{i}", c.pid) for i, c in enumerate(psutil.Process(me).children())]
    snap[tag] = []
    for role, pid in procs:
        maps = open(f"/proc/{pid}/maps").read()
        roll = open(f"/proc/{pid}/smaps_rollup").read()
        status = {l.split(":")[0]: l.split(":", 1)[1].strip() for l in open(f"/proc/{pid}/status")
                  if l.split(":")[0] in ("Threads", "VmRSS", "VmSize", "PPid", "Pid")}
        open(f"{OUT}/{tag}_{role}.maps", "w").write(maps)
        open(f"{OUT}/{tag}_{role}.smaps_rollup", "w").write(roll)
        snap[tag].append({"role": role, "pid": pid, "status": status})


sys.argv = ["train.py", "--steps", "6", "--workers", "2", "--start-method", "fork",
            "--data", "/work/data/train.bin", "--out", "/work/out"]
import train  # noqa: E402  (runs phase("start") .. phase("import_done") at import)

orig = train.phase


def phase(name):
    orig(name)
    if name in ("loader_start", "step_3"):
        dump({"loader_start": "before_fork", "step_3": "after_fork"}[name])


train.phase = phase
train.main()
json.dump(snap, open(f"{OUT}/procs.json", "w"), indent=1)
