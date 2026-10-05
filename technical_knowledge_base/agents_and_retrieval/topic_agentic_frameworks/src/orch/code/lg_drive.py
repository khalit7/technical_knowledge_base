"""Drive the LangGraph durability demo for real: start, SIGKILL mid-node, resume, approve, time-travel fork."""
import subprocess, os, signal, time, json, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib
PY = os.path.join(HERE, "venv", "bin", "python")
EV = os.path.join(lib.REC, "langgraph", "events.jsonl")
T = "fix-1"


def log(**kw):
    kw["t"] = round(time.time(), 3)
    with open(EV, "a") as f:
        f.write(json.dumps(kw) + "\n")


def run(*a):
    p = subprocess.run([PY, "lg_durable.py", *a], cwd=HERE, capture_output=True, text=True)
    print(a, p.stdout[-800:], p.stderr[-800:])
    return p.stdout


for f in (EV, os.path.join(HERE, "lg_ckpt.db")):
    if os.path.exists(f):
        os.remove(f)
# 1. start, and kill the process while propose_fix's model call is in flight
p = subprocess.Popen([PY, "lg_durable.py", "start", T], cwd=HERE, start_new_session=True,
                     stdout=open(os.path.join(HERE, "lg_start.out"), "w"), stderr=subprocess.STDOUT)
while True:
    time.sleep(0.2)
    if os.path.exists(EV) and '"node": "propose_fix", "what": "start"' in open(EV).read():
        break
    if p.poll() is not None:
        raise SystemExit("start exited early")
time.sleep(3)
os.killpg(p.pid, signal.SIGKILL)  # the whole process group we started: python and its claude child
p.wait()
log(node="-", what="SIGKILL", pid=p.pid)
run("dump", T)
os.rename(os.path.join(lib.REC, "langgraph", f"checkpoints_{T}.json"), os.path.join(lib.REC, "langgraph", "checkpoints_after_kill.json"))
# 2. resume from the last checkpoint: diagnose must not run again
run("resume", T)
# 3. the human approves
run("approve", T)
run("dump", T)
# 4. time travel: back to the checkpoint after diagnose, add a requirement, run again, approve
rows = json.load(open(os.path.join(lib.REC, "langgraph", f"checkpoints_{T}.json")))
ck = [r for r in rows if r["next"] == ["propose_fix"]][0]["checkpoint_id"]
run("fork", T, ck)
run("approve", T)
run("dump", T)
print("done")
