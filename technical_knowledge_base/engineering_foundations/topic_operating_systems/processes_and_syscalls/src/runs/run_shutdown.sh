#!/bin/sh
# Shutdown lab: what `docker stop` (SIGTERM to PID 1, then SIGKILL after 10 s; the same sequence as a
# Kubernetes pod deletion with a 10 s grace period) does to the running training job, by how the
# container starts it. The job is the root page's src/trace/job/train.py (SIGTERM handler sets a flag;
# the loop checkpoints and exits 0), run with 2 fork DataLoader workers.
# Output: out/shutdown/<variant>_<rep>.txt (process tree before the stop, seconds, exit code, log).
HERE=$(cd "$(dirname "$0")" && pwd)
JOB=$(cd "$HERE/../../../src/trace/job" && pwd)
DATA=${DATA:-${TMPDIR:-/tmp}/os-proc-data}
REPS=${REPS:-3}
mkdir -p "$HERE/out/shutdown" "$DATA"
[ -f "$DATA/train.bin" ] || docker run --rm --name os-proc-mkdata -v "$JOB":/job:ro -v "$DATA":/work/data kb-os-lab:1 python /job/make_data.py /work/data/train.bin
T="/job/train.py --steps 1000000 --workers 2 --data /work/data/train.bin --out /work/out"
run() { # name, extra docker flags, command...
  v=$1; flags=$2; shift 2
  for r in $(seq 1 $REPS); do
    n=os-proc-sd-$v-$r; f="$HERE/out/shutdown/${v}_$r.txt"
    docker rm -f $n >/dev/null 2>&1
    docker run -d --name $n $flags --cpus 2 --memory 2g --shm-size 256m -v "$JOB":/job:ro -v "$HERE/py":/fix:ro -v "$DATA":/work/data:ro kb-os-lab:1 "$@" >/dev/null
    i=0; until docker logs $n 2>&1 | grep -q "step 5 loss" || [ $i -ge 60 ]; do sleep 0.5; i=$((i+1)); done
    { echo "variant $v rep $r"; echo "command: $*"; echo "flags: $flags"; echo "--- process tree before stop (ps inside the container)";
      docker exec $n ps -eo pid,ppid,pgid,sid,stat,args --forest | cut -c1-150; } > "$f"
    t0=$(python3 -c 'import time;print(time.time())')
    docker stop -t 10 $n >/dev/null
    t1=$(python3 -c 'import time;print(time.time())')
    code=$(docker inspect -f '{{.State.ExitCode}}' $n)
    { echo "--- result"; python3 -c "print('stop_seconds %.2f' % ($t1-$t0))"; echo "exit_code $code";
      echo "--- container log (per-step lines dropped except the last 3)"; docker logs $n > "${TMPDIR:-/tmp}/os-proc-log.$$" 2>&1; grep -n "phase step_" "${TMPDIR:-/tmp}/os-proc-log.$$" | tail -3 | cut -d: -f2-; grep -v "phase step_" "${TMPDIR:-/tmp}/os-proc-log.$$" | grep -v "^step [0-9]* loss" ; rm -f "${TMPDIR:-/tmp}/os-proc-log.$$"; } >> "$f"
    docker rm $n >/dev/null
    echo "$v $r done"
  done
}
case "${1:-all}" in all|v1) run v1_exec "" python $T;; esac
case "${1:-all}" in all|v2) run v2_sh_c "" sh -c "python $T";; esac
case "${1:-all}" in all|v3) run v3_sh_c_two "" sh -c "python $T; echo shell: python exited with \$?";; esac
case "${1:-all}" in all|v4) run v4_bash_c "" bash -c "python $T";; esac
case "${1:-all}" in all|v5) run v5_sh_exec "" sh -c "exec python $T";; esac
case "${1:-all}" in all|v6) run v6_init_sh "--init" sh -c "python $T; echo shell: python exited with \$?";; esac
case "${1:-all}" in all|v7) run v7_init_group "--init -e TINI_KILL_PROCESS_GROUP=1" sh -c "python $T; echo shell: python exited with \$?";; esac
case "${1:-all}" in all|v8) run v8_torchrun "" torchrun --nproc-per-node 1 $T;; esac
case "${1:-all}" in all|v9) run v9_init_exec "--init" python $T;; esac
case "${1:-all}" in all|v10) run v10_torchrun_fixed "" torchrun --nproc-per-node 1 /fix/ignore_term_in_workers.py $T;; esac
