"""Run each ladder step 5 times with --phases; write the median of each phase (ms). usage: phases.py python_exe input out.json"""
import json
import statistics
import subprocess
import sys

exe, path, out = sys.argv[1:4]
res = {}
for step in ["python", "percall", "owned", "borrowed", "bytes", "parallel"]:
    runs = []
    for _ in range(5):
        p = subprocess.run([exe, "ladder.py", step, path, "--phases"], capture_output=True, text=True, check=True)
        runs.append(json.loads(p.stderr.strip().splitlines()[-1]))
    res[step] = {k: round(statistics.median(r[k] for r in runs), 1) for k in runs[0]}
json.dump(res, open(out, "w"), indent=1)
for s, ph in res.items():
    print(f"{s:<9}" + "  ".join(f"{k} {v}" for k, v in ph.items()))
