#!/bin/sh
# Hang on purpose, dump each rank's flight recorder, analyse with torchfrtrace -> ../inputs/fr_trace.json
cd "$(dirname "$0")"
D="$DPT_SCRATCH/frdump"; rm -rf "$D"; mkdir -p "$D"
PORT=29534 sh run.sh 2 fr_skip.py "$D" > "$DPT_SCRATCH/fr.log" 2>&1
"$(dirname "$PY")/torchfrtrace" "$D" -p rank_ > "$DPT_SCRATCH/frtrace.txt" 2>&1
"$(dirname "$PY")/torchfrtrace" "$D" -p rank_ -j > "$DPT_SCRATCH/frtrace_j.txt" 2>&1
# gloo leaves pg_config empty (the NCCL backend fills it when it creates a communicator), which the analyser needs:
# patch the default group in, as NCCL would have recorded it, and analyse again
P="$DPT_SCRATCH/frdump_patched"; rm -rf "$P"; mkdir -p "$P"
"$PY" - "$D" "$P" <<'PYEOF'
import os, pickle, sys
for f in os.listdir(sys.argv[1]):
    d = pickle.load(open(os.path.join(sys.argv[1], f), "rb"))
    d["pg_config"] = {"0": {"name": "0", "desc": "default_pg", "ranks": "[0, 1]"}}
    pickle.dump(d, open(os.path.join(sys.argv[2], f), "wb"))
PYEOF
"$(dirname "$PY")/torchfrtrace" "$P" -p rank_ > "$DPT_SCRATCH/frtrace_p.txt" 2>&1
python3 - "$DPT_SCRATCH/frtrace.txt" "$DPT_SCRATCH/frtrace_j.txt" "$DPT_SCRATCH/frtrace_p.txt" <<'PYEOF'
import json, re, sys, time
clean = lambda s: re.sub(r"/[^ ]*/site-packages/", "", re.sub(r"/(Users|private)/[^ :]*", "<path>", s))
a = [clean(l) for l in open(sys.argv[1]).read().splitlines() if l.strip()][:80]
b = [clean(l) for l in open(sys.argv[2]).read().splitlines() if l.strip()][:80]
c = [clean(l) for l in open(sys.argv[3]).read().splitlines() if l.strip()][:80]
json.dump({"name": "fr_trace", "recorded": time.strftime("%Y-%m-%d"), "torchfrtrace": a, "torchfrtrace_j": b, "torchfrtrace_patched_pg_config": c}, open("../inputs/fr_trace.json", "w"), indent=1)
print("wrote fr_trace", len(a), len(b))
PYEOF
