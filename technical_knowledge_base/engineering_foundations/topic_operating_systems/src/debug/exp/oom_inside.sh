# A process that outgrows the container's memory limit, seen from inside the container.
. /exp/lib.sh
sec "the limit this container runs under (cgroup v2 files)"
run "cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.swap.max"
sec "a job that keeps allocating"
run "python /exp/hog.py 128 2048 | tail -n 3; echo exit code \${PIPESTATUS[0]}"
sec "what the cgroup recorded"
run "cat /sys/fs/cgroup/memory.events"
sec "the kernel log"
run "dmesg | tail -n 2"
