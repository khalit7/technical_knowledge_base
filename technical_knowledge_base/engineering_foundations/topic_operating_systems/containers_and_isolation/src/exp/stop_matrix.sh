#!/bin/sh
# Run on the Docker host: seven ways to start the job, each stopped with `docker stop -t 10` 3 s after start.
# Prints, per variant: seconds from docker stop to exit, the exit code, and the job's own log.
cd "$(dirname "$0")"; OUT=${OUT:-$(mktemp -d)}
run() { name=$1; shift
  rm -rf $OUT/$name; mkdir -p $OUT/$name
  docker run -d --rm --name os-cont-stop-$name --cpus 1 --memory 512m -v $PWD:/exp:ro -v $OUT/$name:/out "$@" > /dev/null
  sleep 3; (docker wait os-cont-stop-$name > $OUT/$name.code) & w=$!
  t0=$(python3 -c 'import time;print(time.time())'); docker stop -t 10 os-cont-stop-$name > /dev/null; wait $w
  t1=$(python3 -c 'import time;print(time.time())')
  printf '### %s: docker run' "$name"; for a in "$@"; do case "$a" in *' '*) printf " '%s'" "$a";; *) printf ' %s' "$a";; esac; done; echo
  echo "stop_to_exit_s $(python3 -c "print(round($t1-$t0,2))") exit_code $(cat $OUT/$name.code)"
  echo "checkpoint file: $(cat $OUT/$name/ckpt 2>/dev/null || echo missing)$( [ -e $OUT/$name/ckpt.tmp ] && echo ', ckpt.tmp left: '$(cat $OUT/$name/ckpt.tmp))"
  awk -v t0=$t0 '{printf "  %+.2f s  %s\n", $1-t0, substr($0, index($0,$2))}' $OUT/$name/log
}
I=kb-os-cont:1
run A_init_shell --init $I sh -c 'python3 /exp/stopjob.py; echo after'
run B_init_group --init -e TINI_KILL_PROCESS_GROUP=1 $I sh -c 'python3 /exp/stopjob.py; echo after'
run C_shell_pid1 $I sh -c 'python3 /exp/stopjob.py; echo after'
run D_dumb_init $I dumb-init sh -c 'python3 /exp/stopjob.py; echo after'
run E_init_exec --init $I sh -c 'exec python3 /exp/stopjob.py'
run F_bash_trap $I bash /exp/fwd.sh
run G_python_pid1 $I python3 /exp/stopjob.py
echo "### shell form: does Debian's dash exec a single command? (Python's PID; 1 would mean exec)"
docker run --rm --name os-cont-stop-dash $I sh -c 'python3 -c "import os; print(os.getpid())"'
