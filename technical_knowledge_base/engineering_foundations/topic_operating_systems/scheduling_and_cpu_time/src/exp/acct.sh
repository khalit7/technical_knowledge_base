# CPU accounting: real against user and sys for 1 and 4 threads; where the VM's CPU time went; steal.
. /exp/lib.sh
sec "time: 4 threads of matrix multiply for a fixed amount of work"
cat > /tmp/mm.py <<'PY'
import sys, time, torch
torch.set_num_threads(int(sys.argv[1])); a = torch.randn(1024, 1024); b = torch.randn(1024, 1024)
for _ in range(int(sys.argv[2]) if len(sys.argv) > 2 else 40): a @ b
PY
run "/usr/bin/time -f 'real %e s, user %U s, sys %S s, CPU %P, voluntary switches %w, involuntary %c' python /tmp/mm.py 1"
run "/usr/bin/time -f 'real %e s, user %U s, sys %S s, CPU %P, voluntary switches %w, involuntary %c' python /tmp/mm.py 4"
sec "the cgroup's own accounting (cpu.stat) for this container so far"
run "cat /sys/fs/cgroup/cpu.stat"
sec "the VM's CPU time by kind since boot (/proc/stat, in 10 ms ticks): user nice system idle iowait irq softirq steal guest guest_nice"
run "head -1 /proc/stat"
sec "per-task scheduler statistics: /proc/PID/schedstat = time on CPU (ns), time waiting on a run queue (ns), timeslices"
python /tmp/mm.py 4 400 & P=$!; sleep 4
for t in /proc/$P/task/*; do echo "tid ${t##*/} $(cat $t/comm) $(cat $t/schedstat)"; done; kill $P; wait $P 2>/dev/null; true
