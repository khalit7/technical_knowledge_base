# Helpers sourced by the km run scripts. Needs: S (scratchpad), H (this page's src/), OUT (raw output dir).
K="$S/mi/k.sh"
k() { sh "$K" "$@"; }
PY="$S/mi/venv/bin/python"
log() { echo "$(date -u +%H:%M:%S) $*" | tee -a "$OUT/driver.log"; }
# start the namespace watcher; its PID goes in $OUT/<name>.watch.pid
wstart() { KUBECONFIG="$S/mi/kubeconfig" nohup "$PY" "$H/scripts/km_watch.py" km "$OUT/$1.watch.jsonl" "${2:-900}" > "$OUT/$1.watch.err" 2>&1 & echo $! > "$OUT/$1.watch.pid"; sleep 2; }
wstop() { p=$(cat "$OUT/$1.watch.pid" 2>/dev/null); [ -n "$p" ] && kill "$p" 2>/dev/null; sleep 1; rm -f "$OUT/$1.watch.pid"; }
# wait until a Job has a terminal condition (Complete or Failed), up to $2 seconds
wjob() { i=0; while [ $i -lt "${2:-300}" ]; do
  c=$(k -n km get job "$1" -o jsonpath='{range .status.conditions[?(@.status=="True")]}{.type}{" "}{end}' 2>/dev/null)
  case "$c" in *Complete*|*Failed*) echo "$c"; return 0;; esac; sleep 2; i=$((i+2)); done; echo "TIMEOUT"; }
dump() { # dump <name> <kind/name...>: full YAML of objects plus pods and events of the namespace
  n=$1; shift
  for o in "$@"; do k -n km get "$o" -o yaml; echo "---"; done > "$OUT/$n.objects.yaml" 2>&1
  k -n km get pods -o yaml > "$OUT/$n.pods.yaml" 2>&1
  k -n km get events -o custom-columns='FIRST:.firstTimestamp,LAST:.lastTimestamp,EVENTTIME:.eventTime,COUNT:.count,KIND:.involvedObject.kind,OBJ:.involvedObject.name,REASON:.reason,FROM:.reportingComponent,MSG:.message' --sort-by=.metadata.creationTimestamp > "$OUT/$n.events.txt" 2>&1
}
podlogs() { for p in $(k -n km get pods -o name); do echo "## $p"; k -n km logs "$p" --tail=${2:-15} 2>&1; done > "$OUT/$1.logs.txt"; }
clean_ns() { k -n km delete jobs,services,pods --all --wait=true > /dev/null 2>&1; k -n km delete events --all > /dev/null 2>&1; }
