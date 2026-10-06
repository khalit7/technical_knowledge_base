import os, json, shutil
from tasks import TASKS, make_workspace
from verify import reward, run_hidden
meta = {}
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_selftest")
for t in TASKS:
    ws = os.path.join(base, t); make_workspace(t, ws)
    h = run_hidden(ws)["results"]
    meta[t] = {"bugs": TASKS[t][0], "prompt": TASKS[t][1], "f2p": [n for n in h if not h[n]], "p2p": [n for n in h if h[n]]}
    json.dump(meta, open(os.path.join(os.path.dirname(base), "meta.json"), "w"), indent=1)
    r = reward(t, ws)
    print(t, "buggy:", r["binary"], r["partial"], "f2p", r["f2p_pass"], "/", r["f2p_total"], "p2p", r["p2p_pass"], "/", r["p2p_total"])
ws = os.path.join(base, "clean"); shutil.rmtree(ws, ignore_errors=True); shutil.copytree(os.path.join(os.path.dirname(base), "clean"), ws)
r = reward("T03", ws); print("clean:", r["binary"], r["partial"])
shutil.rmtree(base)
