. /exp/lib.sh
sec "a 1 GiB container; each worker caches 1 MiB per sample it decodes"
run "python /exp/wkleak.py 2>&1 | tail -n 3"
run "grep oom /sys/fs/cgroup/memory.events"
