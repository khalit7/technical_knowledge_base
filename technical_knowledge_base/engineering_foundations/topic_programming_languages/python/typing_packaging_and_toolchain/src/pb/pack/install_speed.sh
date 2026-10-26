#!/bin/bash
# Installing the same three packages (httpx, pydantic, rich) into a fresh Python 3.14 environment:
# pip without cache, uv with a cold cache, uv with a warm cache. Network involved: 3 runs each, medians.
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh
cd $WORK; PKGS="httpx==0.28.1 pydantic==2.13.2 rich==15.0.0"
export UV_LINK_MODE=copy
hyperfine -i --runs 3 --export-json $WORK/inst_hf.json \
  -n "pip (no cache)" --prepare "rm -rf venv_pip && $PY314 -m venv venv_pip" "venv_pip/bin/python -m pip install -q --no-cache-dir $PKGS" \
  -n "uv (cold cache)" --prepare "rm -rf venv_uv cold_cache && uv venv -q --python $PY314 venv_uv" "UV_CACHE_DIR=$WORK/cold_cache VIRTUAL_ENV=venv_uv uv pip install -q $PKGS" \
  -n "uv (warm cache)" --prepare "rm -rf venv_uv && uv venv -q --python $PY314 venv_uv" "VIRTUAL_ENV=venv_uv uv pip install -q $PKGS" > $WORK/inst_hf.txt 2>&1
venv_pip/bin/python -m pip --version | sed "s#$WORK#~/pl/pb/work#" > $WORK/pipver.txt
python3 - "$WORK" > $HERE/../out/install_speed.json <<'PY'
import json, sys, os
W = sys.argv[1]
r = json.load(open(f"{W}/inst_hf.json"))["results"]
print(json.dumps({"packages": "httpx==0.28.1 pydantic==2.13.2 rich==15.0.0", "python": "3.14.8", "pip": open(f"{W}/pipver.txt").read().split(" from")[0],
  "uv": "0.12.23", "loadavg": os.getloadavg(),
  "runs": [{"name": x["command"], "median_s": round(x["median"], 2), "all_s": [round(t, 2) for t in x["times"]]} for x in r]}, indent=1))
PY
cat $HERE/../out/install_speed.json
