#!/bin/sh
# (section 8) What a process sees from inside a container: its namespaces, its cgroup and the limits on it,
# and its capabilities. Run inside kb-os-lab:1 started with --cpus 2 --memory 3g --pids-limit 256.
echo "## ls -l /proc/self/ns"; ls -l /proc/self/ns | awk 'NR>1{print $9, $10, $11}'
echo "## cat /proc/self/cgroup"; cat /proc/self/cgroup
echo "## cgroup limit files"; for f in cpu.max memory.max memory.high pids.max cpuset.cpus.effective; do printf '%s: ' $f; cat /sys/fs/cgroup/$f; done
echo "## memory.events"; cat /sys/fs/cgroup/memory.events
echo "## cpu.stat"; cat /sys/fs/cgroup/cpu.stat
echo "## grep -E 'Cap|Seccomp|NoNewPrivs' /proc/self/status"; grep -E 'Cap|Seccomp|NoNewPrivs' /proc/self/status
echo "## capsh --decode of CapEff"; capsh --decode=$(awk '/CapEff/{print $2}' /proc/self/status) 2>/dev/null || echo "(capsh not installed)"
echo "## ps -o pid,ppid,comm (PID namespace: we are pid 1's descendants)"; ps -eo pid,ppid,comm
echo "## os.cpu_count() vs os.sched_getaffinity vs cgroup quota"; python3 -c 'import os;print("cpu_count",os.cpu_count(),"affinity",len(os.sched_getaffinity(0)))'
python3 -c 'import torch;print("torch.get_num_threads()",torch.get_num_threads())'
echo "## df -h / (the image filesystem)"; df -h / | tail -1
