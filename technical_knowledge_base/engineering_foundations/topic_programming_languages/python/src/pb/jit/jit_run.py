"""Drive jit_cases.py: each case on 3.13, 3.14 and 3.15 with PYTHON_JIT=0 and 1, 3 processes each (median)."""
import json, os, statistics, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
data = sys.argv[1]
CASES = ["char_loop", "float_loop", "objects", "gen_pipeline", "json_count"]
res = {"loadavg_start": os.getloadavg(), "runs": {}}
for v, k in [("3.13", "PY313"), ("3.14", "PY314"), ("3.15", "PY315")]:
    for c in CASES:
        for jit in ("0", "1"):
            xs, on = [], None
            for _ in range(3):
                p = subprocess.run([os.environ[k], os.path.join(HERE, "jit_cases.py"), c, data], capture_output=True,
                                   text=True, env=dict(os.environ, PYTHON_JIT=jit))
                r = json.loads(p.stdout); xs.append(r["median_s"]); on = r["jit_enabled"]; py = r["python"]
            res["runs"][f"{v}|{c}|{jit}"] = {"python": py, "median_s": round(statistics.median(xs), 4),
                                            "all_s": [round(x, 4) for x in xs], "jit_enabled_reported": on}
            print(v, c, jit, res["runs"][f"{v}|{c}|{jit}"]["median_s"], on, flush=True)
res["loadavg_end"] = os.getloadavg()
json.dump(res, open(os.path.join(HERE, "..", "out", "jit.json"), "w"), indent=1)
