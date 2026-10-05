# What a container gets by default in this VM (no limits given): the baseline every case changes.
. /exp/lib.sh
run "uname -r"
run "nproc; python -c 'import os, torch; print(os.cpu_count(), torch.get_num_threads())'"
run "cat /sys/fs/cgroup/cpu.max /sys/fs/cgroup/memory.max /sys/fs/cgroup/pids.max"
run "df -h /dev/shm | tail -n 1"
run "ulimit -n"
run "grep -E 'MemTotal|SwapTotal' /proc/meminfo"
run "cat /proc/sys/vm/overcommit_memory"
run "cat /lab/versions.txt /lab/dbg_versions.txt"
