#!/bin/sh
# Reproduce every failure the Debug lab tab shows, for real, in containers of kb-os-dbg:1
# (kb-os-lab:1 plus tokenizers and pyarrow; see Dockerfile.dbg).
# Each case runs in its own container named os-dbg-<case>, removed on exit (--rm), capped at
# 2 CPUs and 3 GiB unless the case is about a limit. No container is privileged; a few add
# CAP_SYS_PTRACE (for strace and py-spy) and say so in their flags.
# Output: raw/<case>.txt, each starting with the docker flags and ending with the exit code.
# Then: python3 redact.py raw && python3 build_data.py (writes ../parts/33_js_dbg_0data.js).
# Usage: sh run_all.sh            every case, one at a time (memory cases must not overlap)
#        sh run_all.sh shm_small  only the named cases
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
JOB=$(cd "$HERE/../trace/job" && pwd)
RAW="$HERE/raw"; mkdir -p "$RAW"
IMG=kb-os-dbg:1
docker image inspect kb-os-lab:1 > /dev/null 2>&1 || docker build -t kb-os-lab:1 "$HERE/../trace/lab"
docker image inspect $IMG > /dev/null 2>&1 || docker build -t $IMG -f "$HERE/Dockerfile.dbg" "$HERE"
CAP="--cpus 2 --memory 3g"
PT="--cap-add SYS_PTRACE"

# c <case> "<docker flags>" <script and args...>
c() {
  name=$1; flags=$2; shift 2
  out="$RAW/$name.txt"
  echo "### host: docker run $flags kb-os-dbg:1 bash /exp/$*" > "$out"
  # shellcheck disable=SC2086
  docker run --rm --name "os-dbg-$name" $flags -v "$HERE/exp":/exp:ro -v "$JOB":/job:ro $IMG bash /exp/"$@" >> "$out" 2>&1
  echo "
### host: container exit code $?" >> "$out"
  echo "done $name"
}

ALL="$*"
sel() { [ -z "$ALL" ] && return 0; for w in $ALL; do [ "$w" = "$1" ] && return 0; done; return 1; }

sel env && c env "" env.sh
sel shm_small && c shm_small "$CAP --shm-size 8m" shm.sh 4096
sel shm_fixed && c shm_fixed "$CAP --shm-size 256m" shm.sh 4096
sel cow_list && c cow_list "$CAP --shm-size 256m" cow.sh list
sel cow_numpy && c cow_numpy "$CAP --shm-size 256m" cow.sh numpy
sel cow_arrow && c cow_arrow "$CAP --shm-size 256m" cow.sh arrow
sel oom_inside && c oom_inside "--cpus 2 --memory 512m --memory-swap 512m" oom_inside.sh
sel oom_pid1 && c oom_pid1 "--cpus 2 --memory 512m --memory-swap 512m" oom_pid1.sh
sel memerr && c memerr "$CAP" memerr.sh
sel oomscore && c oomscore "--cpus 2 --memory 1g --memory-swap 1g" oomscore.sh
sel cpu_2 && c cpu_2 "--cpus 2 --memory 3g" cpu.sh 2
sel cpu_half && c cpu_half "--cpus 0.5 --memory 3g" cpu.sh 2
sel cpu_one && c cpu_one "--cpus 1 --memory 3g" cpu.sh 0 1
sel starve && c starve "--cpus 2 --memory 3g $PT" starve.sh
sel zombie && c zombie "--cpus 1 --memory 1g" zombie.sh
sel zombie_init && c zombie_init "--cpus 1 --memory 1g --init" zombie.sh
sel orphan && c orphan "$CAP --shm-size 256m" orphan.sh

# s <case> "<docker flags>" <args>: start sig.sh, send docker stop (SIGTERM, then SIGKILL after 10 s)
# 10 s later, and record how long the stop took and the exit code.
now() { python3 -c 'import time; print(f"{time.time():.2f}")'; }
s() {
  name=$1; flags=$2; shift 2
  out="$RAW/$name.txt"
  echo "### host: docker run $flags kb-os-dbg:1 bash /exp/sig.sh $*" > "$out"
  # shellcheck disable=SC2086
  docker run --rm --name "os-dbg-$name" $flags -v "$HERE/exp":/exp:ro -v "$JOB":/job:ro $IMG bash /exp/sig.sh "$@" >> "$out" 2>&1 &
  bg=$!
  sleep 10
  t0=$(now); docker stop -t 10 "os-dbg-$name" > /dev/null; t1=$(now)
  wait $bg; code=$?
  echo "
### host: docker stop (SIGTERM, then SIGKILL after 10 s) took $(python3 -c "print(f'{$t1 - $t0:.1f}')") s; container exit code $code" >> "$out"
  echo "done $name"
}
sel sig_noh && s sig_noh "$CAP" noh
sel sig_noh_init && s sig_noh_init "$CAP --init" noh
sel sig_train && s sig_train "$CAP --shm-size 256m" train
sel sig_wrapper && s sig_wrapper "$CAP --shm-size 256m" wrapper
sel fork && c fork "$CAP $PT" fork.sh
sel nofile && c nofile "$CAP --ulimit nofile=128:128 --shm-size 256m" nofile.sh
sel ckpt_full && c ckpt_full "$CAP --tmpfs /ckpt:size=10m $PT" ckpt_full.sh
sel nofsync && c nofsync "$CAP" nofsync.sh
sel pagecache && c pagecache "$CAP" pagecache.sh
sel systime && c systime "$CAP $PT" systime.sh
sel slowio && c slowio "$CAP $PT --shm-size 256m --device-read-bps /dev/vda:1mb" slowio.sh
sel swap && c swap "--cpus 2 --memory 512m --memory-swap 1g" swap.sh
sel pids && c pids "$CAP --shm-size 256m --pids-limit 48" pids.sh
sel wkleak && c wkleak "--cpus 2 --memory 1g --memory-swap 1g --shm-size 256m" wkleak.sh

# pkill -TERM -f from outside: the signal reaches the main process and every DataLoader worker.
sel sig_pkill && {
  name=sig_pkill; out="$RAW/$name.txt"
  echo "### host: docker run $CAP --shm-size 256m kb-os-dbg:1 bash /exp/sig.sh pkill" > "$out"
  docker run --rm --name "os-dbg-$name" $CAP --shm-size 256m -v "$HERE/exp":/exp:ro -v "$JOB":/job:ro $IMG bash /exp/sig.sh pkill >> "$out" 2>&1 &
  bg=$!
  sleep 10
  echo "
### host: docker exec os-dbg-$name pkill -TERM -f accum.py" >> "$out"
  docker exec "os-dbg-$name" pkill -TERM -f accum.py
  wait $bg
  echo "
### host: container exit code $?" >> "$out"
  echo "done $name"
}

# redact the recordings, then rebuild the tab data from them
python3 "$HERE/redact.py" "$RAW"
python3 "$HERE/build_data.py"
