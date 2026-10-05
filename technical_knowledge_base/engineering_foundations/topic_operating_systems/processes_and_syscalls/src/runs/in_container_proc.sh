#!/bin/sh
# P3. The running job seen through /proc: start train.py (2 fork workers, persistent iterator for a while),
# then read the main process's and one worker's /proc entries. Runs inside kb-os-lab:1.
mkdir -p /work/data /work/out && python /job/make_data.py /work/data/train.bin >/dev/null
python /job/train.py --steps 1000000 --workers 2 > /tmp/log.txt 2>&1 &
MAIN=$!
i=0; until grep -q "step 5 loss" /tmp/log.txt || [ $i -ge 60 ]; do sleep 0.5; i=$((i+1)); done
W=$(ps -o pid= --ppid $MAIN | head -1 | tr -d ' ')
echo "== ps (pid ppid pgid sid tty stat nlwp comm)"; ps -eo pid,ppid,pgid,sid,tty,stat,nlwp,comm
for p in $MAIN $W; do
  if [ $p = $MAIN ]; then echo "== MAIN /proc/<main>/status (selected)"; else echo "== WORKER /proc/<worker>/status (selected)"; fi
  grep -E '^(Name|State|Tgid|Pid|PPid|Uid|Threads|SigQ|SigPnd|ShdPnd|SigBlk|SigIgn|SigCgt|CapEff|NoNewPrivs|Seccomp|voluntary_ctxt_switches|nonvoluntary_ctxt_switches)' /proc/$p/status
  echo "-- threads (comm of each task in /proc/<pid>/task)"; for t in /proc/$p/task/*; do printf '%s ' "$(cat $t/comm)"; done; echo
  echo "-- fds (ls -l /proc/<pid>/fd, targets)"; ls -l /proc/$p/fd | awk 'NR>1{print $9, $10, $11}'
done
echo "== limits of MAIN (/proc/<main>/limits)"; cat /proc/$MAIN/limits
echo "== /dev/shm"; ls -la /dev/shm | head
kill -TERM $MAIN; wait $MAIN; echo "main exited $?"; tail -3 /tmp/log.txt
