#!/bin/bash
# Startup of the same CLI with eager and lazy imports on Python 3.15.0rc3 (venv with httpx, pydantic, rich).
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh; cd $HERE
V=$WORK/lazyvenv; [ -x $V/bin/python ] || { uv venv -q --python $PY315 $V && VIRTUAL_ENV=$V uv pip install -q httpx==0.28.1 pydantic==2.13.2 rich==15.0.0; }
PY=$V/bin/python
$PY -c "import httpx, pydantic, rich, sys; print(sys.version.split()[0], httpx.__version__, pydantic.VERSION)" > $WORK/lazy_versions.txt
for f in cli_eager cli_lazy; do $PY -X importtime $f.py count "hello world" 2> $WORK/$f.imp > $WORK/$f.out; done
$PY -X importtime -X lazy_imports=all cli_eager.py count "hello world" 2> $WORK/cli_all.imp > /dev/null
{ echo '$ python3.15 -X lazy_imports=none cli_lazy.py count "hello world"'; $PY -X lazy_imports=none cli_lazy.py count "hello world" 2>&1 | head -1; echo "[exit ${PIPESTATUS[0]}]"; echo
  echo "\$ python3.15 -c \"import sys; sys.set_lazy_imports('none')\""; $PY -c "import sys; sys.set_lazy_imports('none')" 2>&1 | tail -1; echo "[exit ${PIPESTATUS[0]}]"; } > $WORK/lazy_none.txt
hyperfine -N --warmup 3 --runs 30 --export-json $WORK/lazy_hf.json \
  "$PY cli_eager.py count 'hello world'" "$PY cli_lazy.py count 'hello world'" "$PY -X lazy_imports=all cli_eager.py count 'hello world'" "$PY -c pass" > $WORK/lazy_hf.txt 2>&1
python3 - "$WORK" <<'PY'
import json, sys, re, os
W = sys.argv[1]
def parse(path):
    rows = []
    for line in open(path):
        m = re.match(r"import time:\s+(\d+) \|\s+(\d+) \|( *)(\S+)", line)
        if m:
            rows.append({"self_us": int(m[1]), "cum_us": int(m[2]), "depth": len(m[3]) // 2, "name": m[4]})
    return rows
out = {"versions": open(f"{W}/lazy_versions.txt").read().strip(), "loadavg": os.getloadavg(), "importtime": {}, "hyperfine": []}
for k in ("cli_eager", "cli_lazy", "cli_all"):
    rows = parse(f"{W}/{k}.imp")
    top, since = [], 0
    for r in rows:  # -X importtime prints a module after its own imports, so a top-level row closes its group
        since += 1
        if r["depth"] == 0:
            top.append(dict(r, n_mods=since)); since = 0
    out["importtime"][k] = {"modules": len(rows), "top": top, "total_us": sum(r["self_us"] for r in rows)}
for r in json.load(open(f"{W}/lazy_hf.json"))["results"]:
    out["hyperfine"].append({"command": r["command"].replace(W, "~/pl/pb/work"), "median_ms": round(r["median"] * 1000, 1),
                             "mean_ms": round(r["mean"] * 1000, 1), "stddev_ms": round(r["stddev"] * 1000, 1)})
out["none_mode"] = open(f"{W}/lazy_none.txt").read()
out["outputs"] = {k: open(f"{W}/{k}.out").read().strip() for k in ("cli_eager", "cli_lazy")}
json.dump(out, open("../out/lazy.json", "w"), indent=1)
print(out["versions"], {k: (v["modules"], v["total_us"]) for k, v in out["importtime"].items()})
for h in out["hyperfine"]: print(h)
PY
