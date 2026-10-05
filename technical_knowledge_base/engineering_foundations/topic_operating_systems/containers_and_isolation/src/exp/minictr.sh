#!/bin/sh
# Prepare and run minictr.c inside: docker run --rm --cap-add SYS_ADMIN --security-opt seccomp=unconfined kb-os-cont:1 sh /exp/minictr.sh
# (Docker 20.10's default seccomp profile does not list pivot_root, so the outer container runs without one, like a runtime.)
# 1. a busybox root file system as the overlay's lower layer; 2. the cgroup /ctr with limits (this container's
# cgroup namespace root is writable once /sys/fs/cgroup is remounted read-write, which CAP_SYS_ADMIN allows).
set -e
B=/ctr; mkdir -p $B; mount -t tmpfs -o size=64m tmpfs $B  # overlayfs cannot use another overlay as its upper layer
mkdir -p $B/lower/bin $B/lower/proc $B/lower/sys/fs/cgroup $B/lower/tmp $B/lower/dev $B/lower/etc $B/upper $B/work $B/merged
cp /bin/busybox $B/lower/bin/busybox; for a in $(/bin/busybox --list); do [ -e $B/lower/bin/$a ] || ln -s busybox $B/lower/bin/$a; done
echo "root:x:0:0:root:/root:/bin/sh" > $B/lower/etc/passwd; cp /exp/job.sh $B/lower/job.sh
mount -o remount,rw /sys/fs/cgroup
mkdir -p /sys/fs/cgroup/init; echo $$ > /sys/fs/cgroup/init/cgroup.procs
echo "+memory +pids +cpu" > /sys/fs/cgroup/cgroup.subtree_control
mkdir -p /sys/fs/cgroup/ctr; echo 64M > /sys/fs/cgroup/ctr/memory.max; echo 0 > /sys/fs/cgroup/ctr/memory.swap.max; echo 16 > /sys/fs/cgroup/ctr/pids.max
gcc -O2 -Wall -o /tmp/minictr /exp/minictr.c
/tmp/minictr $B
echo "### after: the upper layer, seen from outside (what the container changed)"; cd $B/upper && find . -mindepth 1 | sort | while read f; do ls -ld "$f" | awk '{print $1, $5, $6, $NF}'; done
