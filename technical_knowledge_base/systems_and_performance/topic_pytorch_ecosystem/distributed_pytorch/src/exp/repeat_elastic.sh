#!/bin/sh
# Repeats run_elastic.sh N times and keeps how many restarts each run needed -> ../inputs/elastic_repeats.json
cd "$(dirname "$0")"
N=${1:-4}; R="$DPT_SCRATCH/elastic_repeats"; mkdir -p "$R"; rm -f "$R"/*.json
i=1; while [ $i -le $N ]; do sh run_elastic.sh >/dev/null 2>&1; cp ../inputs/elastic.json "$R/run$(printf %02d $i).json"; i=$((i+1)); done
"$PY" - "$R" <<'PYEOF'
import json, os, sys, time
runs = []
for f in sorted(os.listdir(sys.argv[1])):
    d = json.load(open(os.path.join(sys.argv[1], f)))
    att = sorted({e["attempt"] for e in d["events"] if e["event"] == "start"})
    done = [e for e in d["events"] if e["event"] == "done"]
    crash = [e for e in d["events"] if e["event"] == "crash"]
    runs.append({"attempts_that_started_training": att, "finished_attempt": done[0]["attempt"] if done else None,
                 "seconds_crash_to_resume": round(min(e["t_s"] for e in d["events"] if e["event"] == "start" and e["attempt"] > 0) - crash[0]["t_s"], 2) if len(att) > 1 else None,
                 "losses_match_uninterrupted": all(abs(e["loss"] - dict(((r, s), l) for r, s, l in d["uninterrupted_losses"])[(e["rank"], e["step"])]) < 1e-9 for e in d["events"] if e["event"] == "step")})
ok = [f for f, r in zip(sorted(os.listdir(sys.argv[1])), runs) if r["finished_attempt"] == 1]
if ok:
    import shutil; shutil.copy(os.path.join(sys.argv[1], ok[0]), "../inputs/elastic.json")   # the page shows a run that restarted once
json.dump({"name": "elastic_repeats", "recorded": time.strftime("%Y-%m-%d"), "runs": runs}, open("../inputs/elastic_repeats.json", "w"), indent=1)
print(runs)
PYEOF
