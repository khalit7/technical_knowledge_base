#!/bin/sh
# Section 10: the root page's training job, seen as threads. Runs inside the container (CAP_SYS_PTRACE for strace).
# Usage: sh job_threads.sh <torch threads>
# 1. start the job (2 DataLoader workers, fork) for many steps; 2. once it is stepping, list every thread of the
# main process and of each worker with its state and kernel wait channel; 3. attach strace for 3 s and count the
# synchronisation system calls per training step.
TH=$1
mkdir -p /work/data /work/out && python3 /job/make_data.py /work/data/train.bin > /dev/null
python3 /job/train.py --steps 100000 --no-ckpt --threads $TH > /tmp/log.txt 2>&1 & PID=$!
until grep -q "phase step_30$" /tmp/log.txt; do sleep 0.2; done
W=$(cat /proc/$PID/task/*/children 2>/dev/null)
echo "## torch threads $TH; main pid <main>, worker pids <w0> <w1>"
for p in $PID $W; do
  role=main; [ $p != $PID ] && role=worker
  n=$(ls /proc/$p/task | wc -l)
  echo "## $role process: $n threads (name state wchan)"
  for t in /proc/$p/task/*; do c=$(cat $t/comm 2>/dev/null) || continue; printf "%s %s %s\n" "$c" "$(awk "{print \$3}" $t/stat 2>/dev/null)" "$(cat $t/wchan 2>/dev/null)"; done | sort | uniq -c | sort -rn
done
echo "## Python-level threads of each process (py-spy dump: thread names only)"
for p in $PID $W; do py-spy dump --pid $p 2>/dev/null | grep -E '^Thread' | sed -E 's/Thread [0-9]+/Thread/'; done
echo "## where each thread was started (gdb backtraces, classified by classify_threads.py)"
for p in $PID $(echo $W | cut -d' ' -f1); do [ $p = $PID ] && echo "# main" || echo "# worker 0"; gdb -p $p -batch -ex "thread apply all bt 6" 2>/dev/null | python3 /py/classify_threads.py; done
A=$(grep -c "phase step_" /tmp/log.txt)
timeout -s INT 3 strace -f -c -e trace=futex,epoll_pwait,ppoll,pselect6,read,recvmsg,sched_yield,nanosleep,clock_nanosleep $(for p in $PID $W; do printf -- '-p %s ' $p; done) 2> /tmp/strace.txt
B=$(grep -c "phase step_" /tmp/log.txt)
echo "## strace -f -c for 3 s: steps during the window $((B-A))"
grep -E "^ *[0-9.]+ +[0-9.]+ +[0-9]+ +[0-9]+" /tmp/strace.txt | awk '{print $NF, $4, ($5 ~ /^[0-9]+$/ ? $5 : 0)}' | sed 's/^/calls: /'
kill $PID; wait $PID 2>/dev/null
