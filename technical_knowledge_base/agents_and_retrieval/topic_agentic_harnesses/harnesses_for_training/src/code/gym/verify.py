"""Verifier: run the hidden tests against a workspace in a fresh container (no network,
workspace read-only) and turn them into rewards."""
import json, os, subprocess, sys, uuid
from tasks import TASKS

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGE = "python:3.13-slim"


def run_hidden(ws):
    r = _run_hidden(ws)
    if "error" in r:                      # one retry: container start can fail transiently
        r = _run_hidden(ws)
    return r


def _run_hidden(ws):
    name = "htrain-v-" + uuid.uuid4().hex[:8]
    cmd = ["docker", "run", "--rm", "--name", name, "--network", "none", "--memory", "256m",
           "-v", os.path.abspath(ws) + ":/work:ro", "-v", os.path.join(HERE, "hidden") + ":/hidden:ro",
           IMAGE, "python3", "-B", "/hidden/hidden_tests.py", "/work"]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception as e:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
        return {"error": repr(e)[:300]}


def tests_untouched(ws):
    return open(os.path.join(ws, "tests/test_core.py")).read() == open(os.path.join(HERE, "clean/tests/test_core.py")).read()


def reward(task_id, ws):
    r = run_hidden(ws)
    if "error" in r:
        return {"error": r["error"], "binary": 0, "partial": 0.0}
    res, areas = r["results"], r["areas"]
    meta = json.load(open(os.path.join(HERE, "meta.json")))[task_id]
    f2p = meta["f2p"]                                    # failed on the buggy repo: must flip to pass
    p2p = meta["p2p"]                                    # passed on the buggy repo: must stay green
    vis = [n for n in res if n.startswith("v_")]
    out = {
        "binary": int(all(res.values())),
        "partial": round(sum(res.values()) / len(res), 4),
        "f2p_pass": sum(res[n] for n in f2p), "f2p_total": len(f2p),
        "p2p_pass": sum(res[n] for n in p2p), "p2p_total": len(p2p),
        "visible_all_pass": int(all(res[n] for n in vis)),
        "heldout_fail": [n for n in res if n.startswith("h_") and not res[n]],
        "tests_untouched": int(tests_untouched(ws)),
        "results": res,
    }
    return out


if __name__ == "__main__":
    print(json.dumps(reward(sys.argv[1], sys.argv[2]), indent=1))
