#!/bin/sh
# Runs INSIDE kb-os-tr:1 (called by ../run_all.sh). /t is src/trace (read-only), /raw is the output folder.
# Each experiment is a function; run_all.sh passes the names to run.
set -u
ST="strace -f -tt -T -y -s 48"
mkdir -p /work/data /work/out
python /t/job/make_data.py /work/data/train.bin > /dev/null
cp /t/lang/hello.txt /work/hello.txt

env_info() {
  { echo "date_utc $(date -u +%FT%TZ)"; echo "kernel $(uname -r) $(uname -m)"; echo "nproc $(nproc)";
    cat /lab/versions.txt; strace -V | head -1; echo "rustc $(rustc --version)"; echo "node $(node --version)";
    g++ --version | head -1; gcc --version | head -1; gdb --version | head -1;
    python -c "import multiprocessing as m; print('python default start method', m.get_start_method())";
    grep -E 'MemTotal' /proc/meminfo; echo "cgroup cpu.max $(cat /sys/fs/cgroup/cpu.max 2>/dev/null)";
    echo "cgroup memory.max $(cat /sys/fs/cgroup/memory.max 2>/dev/null)"; df -hT /work /dev/shm | tail -2; } > /raw/env.txt 2>&1
}

startup() {
  $ST -o /raw/startup.strace.txt python -c pass
  python -X importtime -c "import torch" 2> /raw/importtime_torch.txt
  # import cost without tracing: wall time of an interpreter that only imports torch (7 runs)
  for i in 1 2 3 4 5 6 7; do
    python -c "import time;t=time.perf_counter();import torch;print(round((time.perf_counter()-t)*1000,1))"
  done > /raw/import_torch_ms.txt
  for i in 1 2 3 4 5 6 7; do
    python -c "import time,torch,torch.nn as nn;m=nn.Linear(4,4);t=time.perf_counter();torch.optim.SGD(m.parameters(),lr=0.1);print(round((time.perf_counter()-t)*1000,1))"
  done > /raw/first_optimizer_ms.txt
}

job() {  # $1 = start method; the same job each time: 6 steps, SIGTERM to itself after step 4
  $ST -o /raw/job_$1.strace.txt python /t/job/train.py --start-method $1 --steps 6 --sigterm-at-step 4 --out /work/out_$1 > /raw/job_$1.log 2>&1
}

timing() {  # untraced: time to first batch, 7 runs per start method, interleaved
  for i in 1 2 3 4 5 6 7; do for m in fork spawn forkserver; do
    python /t/job/train.py --start-method $m --steps 3 --no-ckpt --out /work/out_t 2>&1 | grep "time to first batch"
  done; done > /raw/timing_first_batch.txt
  for i in 1 2 3; do python /t/job/train.py --start-method fork --steps 6 --sigterm-at-step 4 --out /work/out_t | tail -1; done > /raw/timing_job_untraced.txt
}

epochs() {  # untraced: first batch of the first and of a second iterator, 5 runs per variant
  for i in 1 2 3 4 5; do
    for v in "fork" "spawn" "forkserver" "forkserver --preload torch,numpy"; do
      set -- $v
      echo "variant $*: $(python /t/job/train.py --start-method $@ --steps 2 --no-ckpt --second-iter --out /work/out_e 2>&1 | grep 'time to first batch' | tr '\n' ' ')"
    done
  done > /raw/timing_epochs.txt
}

writes() {
  for m in buffered unbuffered; do
    $ST -o /raw/writes_$m.strace.txt python /t/scripts/writes.py $m /work/out/w_$m.bin
    python /t/scripts/writes.py $m /work/out/w_$m.bin 21
  done > /raw/writes_timing.txt 2>&1
}

ckpt() {
  for m in naive fsync safe; do
    $ST -o /raw/ckpt_$m.strace.txt python /t/scripts/ckpt.py $m /work/out/ck_$m.pt
  done
  { echo "# on /work (the container's overlay file system, on the VM's ext4 disk)"
    for m in naive fsync safe; do python /t/scripts/ckpt.py $m /work/out/ck_$m.pt 21; done
    echo "# on /dev/shm (tmpfs: memory only, fsync has nothing to flush)"
    for m in naive fsync safe; do python /t/scripts/ckpt.py $m /dev/shm/ck_$m.pt 21; done; } > /raw/ckpt_timing.txt 2>&1
}

lang() {
  mkdir -p /work/bin
  gcc -O1 -g -o /work/bin/read_c /t/lang/read.c
  g++ -O1 -g -o /work/bin/read_cpp /t/lang/read.cpp
  rustc -g -O -o /work/bin/read_rs /t/lang/read.rs
  cd /work
  $ST -o /raw/lang_c.strace.txt /work/bin/read_c > /dev/null
  $ST -o /raw/lang_cpp.strace.txt /work/bin/read_cpp > /dev/null
  $ST -o /raw/lang_rust.strace.txt /work/bin/read_rs > /dev/null
  $ST -o /raw/lang_python.strace.txt /usr/bin/python3 /t/lang/read.py > /dev/null
  $ST -o /raw/lang_node.strace.txt node /t/lang/read.js > /dev/null
  G="gdb -q -batch -iex 'set debuginfod enabled on' -x /t/scripts/stacks.gdb.py --args"
  for p in "c /work/bin/read_c" "cpp /work/bin/read_cpp" "rust /work/bin/read_rs" "python /usr/bin/python3 /t/lang/read.py" "node /usr/bin/node /t/lang/read.js"; do
    set -- $p; n=$1; shift
    eval timeout 600 $G "$@" 2>&1 | grep -v -e '^Download' -e '^Catchpoint' -e '^\[Thread' -e '^Using host' -e '^$' > /raw/lang_$n.stacks.txt
  done
}

for f in "$@"; do echo "== $f $(date -u +%T)"; case $f in *:*) ${f%%:*} ${f#*:};; *) $f;; esac; done
echo "== done $(date -u +%T)"
