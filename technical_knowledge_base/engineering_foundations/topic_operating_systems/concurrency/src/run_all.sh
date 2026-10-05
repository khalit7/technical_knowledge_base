#!/bin/sh
# Record every measurement this page shows. Needs Docker and the image kb-os-conc:1 (runs/Dockerfile: the shared
# kb-os-lab:1 plus liburing), built with: docker build -t kb-os-conc:1 runs/
# Each experiment runs in its own capped container named os-conc-*; raw outputs land in runs/out/ and are redacted
# by redact.py; make_data.py turns them into parts/22_js_data.js. Usage: sh run_all.sh [name ...]  (no name: all)
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
C="$HERE/runs/c"; PY="$HERE/runs/py"; OUT="$HERE/runs/out"; mkdir -p "$OUT"
JOB=$(cd "$HERE/../../src/trace/job" && pwd)
IMG=kb-os-conc:1
ALL="$*"
want() { [ -z "$ALL" ] && return 0; case " $ALL " in *" $1 "*) return 0;; esac; return 1; }
dr() { n=$1; shift; docker run --rm --name "os-conc-$n" --memory 1500m -v "$C":/c:ro -v "$PY":/py:ro "$@"; }
cc() { echo "mkdir -p /b && cd /b && for f in $*; do gcc -O2 -Wall -pthread -o \$f /c/\$f.c -luring || exit 1; done"; }

if want env; then dr env --cpus 1 $IMG sh -c 'uname -srm; nproc; python3 -V; gcc --version | head -1; dpkg -s liburing-dev | grep Version; ldd --version | head -1; ulimit -s; ulimit -l; python3 -c "import torch;print(\"torch\",torch.__version__)"; python3 -c "import torch;print(torch.__config__.parallel_info())" | grep -i "backend\|OpenMP 2"' > "$OUT/env.txt" 2>&1; fi

if want threads; then dr threads --cpuset-cpus 0-3 --cap-add SYS_PTRACE $IMG sh -c "$(cc threads) && ./threads && echo '## strace -f of creating one thread' && strace -f -e trace=clone,clone3,mmap,mprotect,munmap,exit ./threads one 2>&1 | grep -v -e 'PROT_READ|PROT_EXEC' -e '^mmap(NULL, [0-9]*, PROT_READ, MAP_PRIVATE, 3' " > "$OUT/threads.txt" 2>&1; fi
if want threads; then dr threads1 --cpuset-cpus 0 $IMG sh -c "$(cc threads) && echo '## the same, pinned to one CPU' && ./threads | grep create" >> "$OUT/threads.txt" 2>&1; fi

if want locks; then
  : > "$OUT/locks.txt"
  # S1 uncontended, S2 four threads short critical section, S3 four threads hammering, on 4 CPUs
  dr locks4 --cpuset-cpus 0-3 $IMG sh -c "$(cc locks) && for r in 1 2 3; do
      for i in spin yield sysc futex mutex adaptive atomic; do echo \"S1 \$(./locks \$i 1 10000000 0 0)\"; done
      for i in spin yield sysc futex mutex adaptive atomic; do echo \"S2 \$(./locks \$i 4 500000 50 200)\"; done
      for i in spin yield sysc futex mutex adaptive atomic; do echo \"S3 \$(./locks \$i 4 500000 0 0)\"; done; done" >> "$OUT/locks.txt" 2>&1
  # S4 four threads on ONE CPU, long critical section: the holder is often preempted while holding the lock
  dr locks1 --cpuset-cpus 0 $IMG sh -c "$(cc locks) && for r in 1 2 3; do
      for i in spin yield futex mutex adaptive; do echo \"S4 \$(./locks \$i 4 20000 2000 100)\"; done; echo \"S4 \$(./locks spin 1 80000 2000 100)\"; done" >> "$OUT/locks.txt" 2>&1
fi

if want pingpong; then
  : > "$OUT/pingpong.txt"
  dr pp2 --cpuset-cpus 0-1 $IMG sh -c "$(cc pingpong) && for r in 1 2 3 4 5; do for m in futex condvar spin; do echo \"2cpu \$(./pingpong \$m 200000)\"; done; done" >> "$OUT/pingpong.txt" 2>&1
  dr pp1 --cpuset-cpus 0 $IMG sh -c "$(cc pingpong) && for r in 1 2 3 4 5; do for m in futex condvar; do echo \"1cpu \$(./pingpong \$m 200000)\"; done; echo \"1cpu \$(./pingpong spin 200)\"; done" >> "$OUT/pingpong.txt" 2>&1
fi

if want peterson; then dr peterson --cpuset-cpus 0-1 $IMG sh -c "$(cc peterson) && for r in 1 2 3 4 5; do ./peterson plain 20000000; done; for r in 1 2 3 4 5; do ./peterson seqcst 20000000; done" > "$OUT/peterson.txt" 2>&1; fi

if want condvar; then dr condvar --cpuset-cpus 0-2 $IMG sh -c "$(cc condvar) && for m in if while onecond; do for r in 1 2 3; do timeout 30 ./condvar \$m 200000; done; done" > "$OUT/condvar.txt" 2>&1; fi

if want deadlock; then dr deadlock --cpus 1 --cap-add SYS_PTRACE $IMG sh /py/deadlock.sh > "$OUT/deadlock.txt" 2>&1; fi

if want mpfutex; then dr mpfutex --cpus 1 --cap-add SYS_PTRACE $IMG sh -c 'strace -f -e trace=futex python3 /py/mp_futex.py 2>&1 | grep -v -e "resumed>" -e "FUTEX_WAKE_PRIVATE, 2147483647" -e "^+++" -e "^---"' > "$OUT/mp_futex.txt" 2>&1; fi

if want gil; then
  : > "$OUT/gil.txt"
  dr gil --cpus 2 $IMG sh -c 'for r in 1 2 3; do for n in 0 1 2; do python3 /py/gil_latency.py $n 5; done; for n in 1 2; do python3 /py/gil_latency.py $n 0.5; done; done' >> "$OUT/gil.txt" 2>&1
fi

if want evloop; then dr evloop --cpus 1 $IMG sh -c "$(cc evloop) && ./evloop" > "$OUT/evloop.txt" 2>&1; fi
if want edge; then dr edge --cpus 1 $IMG sh -c "$(cc edge_level) && ./edge_level" > "$OUT/edge_level.txt" 2>&1; fi

if want uring; then
  # 5.10 charges the rings to the user's locked-memory limit (64 KiB by default in Docker): first show the failure, then lift it
  dr uring0 --cpus 1 $IMG sh -c "$(cc uring) && echo \"ulimit -l: \$(ulimit -l) KiB\" && ./uring x probe" > "$OUT/uring.txt" 2>&1
  dr uring --cpus 1 --ulimit memlock=-1:-1 --cap-add SYS_PTRACE $IMG sh -c "$(cc uring) && echo \"ulimit -l: \$(ulimit -l)\" && ./uring x probe && head -c 67108864 /dev/urandom > f.bin && cat f.bin > /dev/null &&
     for r in 1 2 3; do ./uring f.bin pread; for d in 1 8 32 128; do echo \"depth \$d \$(./uring f.bin uring \$d)\"; done; ./uring f.bin sqpoll 32; done &&
     echo '## strace -f -c, io_uring depth 32' && strace -f -c ./uring f.bin uring 32 2>&1 | grep -E 'io_uring|total' &&
     echo '## strace -f -c, pread' && strace -f -c ./uring f.bin pread 2>&1 | grep -E 'pread|total'" >> "$OUT/uring.txt" 2>&1
fi

if want conns; then dr conns --cpus 2 $IMG sh -c 'for r in 1 2 3; do python3 /py/conns.py threads; python3 /py/conns.py asyncio; done' > "$OUT/conns.txt" 2>&1; fi

if want job; then
  : > "$OUT/job_threads.txt"
  for t in 1 2 4; do docker run --rm --name os-conc-job --cpus 2 --memory 3g --shm-size 256m --cap-add SYS_PTRACE -v "$JOB":/job:ro -v "$PY":/py:ro $IMG sh /py/job_threads.sh $t >> "$OUT/job_threads.txt" 2>&1; done
fi

python3 "$HERE/redact.py" "$OUT"
