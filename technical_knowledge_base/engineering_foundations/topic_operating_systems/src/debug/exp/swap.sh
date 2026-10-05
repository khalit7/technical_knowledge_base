. /exp/lib.sh
sec "memory limit and swap limit"
run "cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.swap.max"
sec "a working set that fits, then one that does not"
run "python /exp/swap.py 300"
run "python /exp/swap.py 700"
run "grep -E '^(max|oom_kill)' /sys/fs/cgroup/memory.events"
