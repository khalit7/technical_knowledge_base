#!/bin/sh
# Runs elastic.py under torchrun with 2 restarts allowed, keeps torchrun's own log lines (host names removed),
# then folds the per-attempt log into ../inputs/elastic.json.
cd "$(dirname "$0")"
L="$DPT_SCRATCH/elastic_torchrun.log"
NOCRASH=1 PORT=29532 sh run.sh 2 elastic.py > /dev/null 2>&1
LOGLEVEL=INFO PORT=29531 sh run.sh 2 --max-restarts 2 elastic.py > "$L" 2>&1
"$PY" - "$L" "$DPT_SCRATCH/elastic_log.jsonl" "$DPT_SCRATCH/elastic_log_ref.jsonl" <<'PYEOF'
import json, re, sys, time
lines = open(sys.argv[1]).read().splitlines()
keep = [re.sub(r"host\s*:.*", "host      : <hidden>", re.sub(r"pid: \d+|\(pid \d+\)|pid=\d+", "pid", l)) for l in lines
        if re.search(r"attempts left|Worker group|start_workers|restart|Restart|Stopping|Worker group|failed|FAILED|rendezvous|Rendezvous|simulated|exitcode|Closing|SIGTERM", l)]
keep = [re.sub(r"^[WIE]\d{4} [\d:.]+ \d+ ", "", l) for l in keep]
keep = [re.sub(r"/[^ ]*/site-packages/", "", l) for l in keep]
keep = [re.sub(r"process \d+", "process <pid>", re.sub(r"binary: \S+", "binary: <python>", l)) for l in keep]
ref = [json.loads(l) for l in open(sys.argv[3])]
ref = {(e["rank"], e["step"]): e["loss"] for e in ref if e["event"] == "step"}
ev = [json.loads(l) for l in open(sys.argv[2])]
t0 = min(e["wall"] for e in ev)
for e in ev:
    e["t_s"] = round(e.pop("wall") - t0, 2); e.pop("pid_hidden", None)
json.dump({"name": "elastic", "recorded": time.strftime("%Y-%m-%d"), "events": ev, "uninterrupted_losses": [[r, s, l] for (r, s), l in sorted(ref.items())], "torchrun_log": keep[:60]},
          open("../inputs/elastic.json", "w"), indent=1)
print("wrote elastic", len(ev), "events", len(keep), "log lines")
PYEOF
