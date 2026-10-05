# A process-count limit (docker --pids-limit, Kubernetes podPidsLimit) against workers and threads.
# pids.max counts tasks: every process and every thread.
. /exp/lib.sh; data
sec "the limit"
run "cat /sys/fs/cgroup/pids.max"
sec "how many tasks the running job uses with 2 workers and 2 torch threads"
python /job/train.py --steps 100000 --workers 2 --threads 2 --start-method fork --no-ckpt > /dev/null 2>&1 & P=$!
sleep 8
run "cat /sys/fs/cgroup/pids.current; for p in \$(pgrep -f train.py); do echo pid \$p threads \$(ls /proc/\$p/task | wc -l); done"
kill $P; wait $P 2>/dev/null
sec "the running job with 16 DataLoader workers and 4 torch threads"
run "python /job/train.py --steps 5 --workers 16 --threads 4 --start-method fork --no-ckpt > /tmp/log 2>&1; echo exit code \$?; grep -E 'Error|error|done at|os.fork' /tmp/log | cut -c1-200 | tail -n 4"
run "cat /sys/fs/cgroup/pids.events"
