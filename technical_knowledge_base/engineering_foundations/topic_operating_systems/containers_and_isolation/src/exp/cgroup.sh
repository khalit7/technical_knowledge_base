#!/bin/sh
# cgroup v2 by hand: delegation, memory.max against memory.high, memory.oom.group, io.max, cgroup.freeze.
# Inside: docker run --rm --cap-add SYS_ADMIN --cpus 2 --memory 1500m -v /data kb-os-cont:1 sh /exp/cgroup.sh
# CAP_SYS_ADMIN only to remount this container's own cgroup tree read-write (its cgroup namespace root).
C=/sys/fs/cgroup
st() { echo "\$ $*"; sh -c "$*" 2>&1; }
echo "### delegation: the container's cgroup namespace root"
mount -o remount,rw $C
st "cat $C/cgroup.controllers"; st "cat $C/cgroup.subtree_control"; st "cat $C/cgroup.procs | wc -l"
st "/bin/echo +memory > $C/cgroup.subtree_control"
echo "(the no-internal-processes rule: move every process into a leaf first)"
mkdir $C/init; for p in $(cat $C/cgroup.procs); do echo $p > $C/init/cgroup.procs 2>/dev/null; done
st "echo '+memory +pids +io +cpu' > $C/cgroup.subtree_control && cat $C/cgroup.subtree_control"
mk() { mkdir $C/$1; shift; while [ $# -gt 0 ]; do echo "$2" > $C/${CG}/$1; shift 2; done; }
run() { # run <cgroup> <timeout s> <cmd...>: start the command inside the cgroup, print its exit status
  cg=$1; to=$2; shift 2
  timeout -s KILL $to sh -c "echo \$\$ > $C/$cg/cgroup.procs; exec $*"; echo "exit status $?"
  echo "memory.events: $(tr '\n' ' ' < $C/$cg/memory.events)"
  grep -E '^(pgscan|pgsteal|pgmajfault|workingset_refault_anon|anon) ' $C/$cg/memory.stat | tr '\n' ' '; echo
}
for v in max high highswap; do
  mkdir $C/job-$v; echo 0 > $C/job-$v/memory.swap.max
  case $v in max) echo 200M > $C/job-$v/memory.max;; high) echo 200M > $C/job-$v/memory.high;;
    highswap) echo 200M > $C/job-$v/memory.high; echo max > $C/job-$v/memory.swap.max;; esac
  echo "### memory $v: memory.max=$(cat $C/job-$v/memory.max) memory.high=$(cat $C/job-$v/memory.high) memory.swap.max=$(cat $C/job-$v/memory.swap.max); allocate 300 MiB"
  run job-$v 60 python3 /exp/hog.py 300
done
for g in 0 1; do
  mkdir $C/oomg$g; echo 150M > $C/oomg$g/memory.max; echo 0 > $C/oomg$g/memory.swap.max; echo $g > $C/oomg$g/memory.oom.group
  echo "### memory.oom.group=$g: a 'main' process (sleep) and a 'worker' that grows past memory.max=150M"
  sh -c "echo \$\$ > $C/oomg$g/cgroup.procs; exec sleep 60" & main=$!
  sleep 0.3; sh -c "echo \$\$ > $C/oomg$g/cgroup.procs; exec python3 /exp/hog.py 300" > /tmp/w.txt 2>&1; echo "worker exit status $?"
  sleep 0.3; if kill -0 $main 2>/dev/null; then echo "main: still alive"; kill $main; else wait $main; echo "main: killed too (status $?)"; fi
  echo "memory.events: $(tr '\n' ' ' < $C/oomg$g/memory.events)"
done
echo "### io.max: read 64 MiB with O_DIRECT from /data, unlimited then rbps=20 MB/s"
dd if=/dev/urandom of=/data/f bs=1M count=64 status=none; sync
mm=$(awk '$5=="/data"{print $3}' /proc/self/mountinfo); disk=$(cat /sys/dev/block/$mm/../dev 2>/dev/null || echo $mm)
echo "/data is on $mm, disk $disk"
mkdir $C/io; echo "$disk rbps=20000000" > $C/io/io.max; echo "io.max: $(cat $C/io/io.max)"
st "dd if=/data/f of=/dev/null bs=1M iflag=direct 2>&1 | tail -1"
sh -c "echo \$\$ > $C/io/cgroup.procs; dd if=/data/f of=/dev/null bs=1M iflag=direct 2>&1 | tail -1"
echo "io.stat: $(cat $C/io/io.stat)"
echo "### cgroup.freeze: a counter loop, frozen for 2 s"
mkdir $C/fz
sh -c "echo \$\$ > $C/fz/cgroup.procs; exec python3 -c 'import time
n=0; t=time.time()
while True:
    n+=1
    if time.time()-t>=0.5: print(round(time.time()%1000,1), n, flush=True); n=0; t=time.time()'" > /tmp/fz.txt & cp=$!
sleep 1.6; echo 1 > $C/fz/cgroup.freeze; sleep 0.2; echo "after freeze: cgroup.events $(tr '\n' ' ' < $C/fz/cgroup.events); state $(awk '/State/{print $2,$3}' /proc/$cp/status)"
sleep 2; echo 0 > $C/fz/cgroup.freeze; sleep 1.6; kill $cp
echo "counter output (time mod 1000 s, loop iterations per 0.5 s):"; cat /tmp/fz.txt
