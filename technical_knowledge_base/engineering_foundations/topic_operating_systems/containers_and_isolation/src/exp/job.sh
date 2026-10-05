# The workload minictr execs inside the hand-built container (busybox sh). Copied into the root file system as /job.sh.
echo '$ hostname'; hostname
echo '$ ps'; ps
echo '$ ls /'; ls /
echo '$ cat /proc/self/cgroup'; cat /proc/self/cgroup
echo '$ ip link'; ip link 2>&1 | grep -o '^[0-9]*: [a-z0-9]*'
echo '$ start 20 sleepers in a subshell (pids.max 16)'
( for i in $(seq 20); do sleep 30 & done ) 2>&1 | head -1
echo "pids.current $(cat /sys/fs/cgroup/pids.current); pids.events: $(cat /sys/fs/cgroup/pids.events)"
killall sleep; sleep 1; wait; echo "after killall and wait: pids.current $(cat /sys/fs/cgroup/pids.current)"
echo '$ allocate 100 MB in a subshell (memory.max 64 MiB)'
( x=$(head -c 100000000 /dev/zero | tr '\0' a); echo survived ); echo "subshell exit status $?"
echo '$ cat /sys/fs/cgroup/memory.events'; cat /sys/fs/cgroup/memory.events
echo '$ echo hi > /etc/motd; rm /etc/passwd   (both in the read-only lower layer)'; echo hi > /etc/motd; rm /etc/passwd; ls /etc
