#!/bin/sh
# Run on the Docker host: the environment every measurement on this page ran in.
echo "### docker"; docker version --format 'client {{.Client.Version}} server {{.Server.Version}}'
docker info 2>/dev/null | grep -E 'runc version|containerd version|init version|Cgroup Driver|Cgroup Version|Default Runtime|Kernel Version|Operating System|CPUs|Total Memory|seccomp|Security Options|Profile|cgroupns|rootless' | sed 's/^ *//'
docker run --rm --name os-cont-env kb-os-cont:1 sh -c '
echo "### kernel"; uname -srm
echo "### versions"; cat /lab/versions.txt /lab/cont_versions.txt; unshare --version
echo "### cgroup mount and controllers"; grep cgroup /proc/self/mounts; cat /sys/fs/cgroup/cgroup.controllers
echo "### PSI"; ls /proc/pressure 2>&1; ls /sys/fs/cgroup | grep -c pressure
echo "### kernel config (selected)"; zcat /proc/config.gz | grep -E "^(# )?CONFIG_(PSI|USER_NS|TIME_NS|SECCOMP_FILTER|IO_URING|OVERLAY_FS|SECURITY_APPARMOR|SECURITY_SELINUX|SECURITY_LANDLOCK|CGROUP_BPF|MEMCG|BLK_CGROUP|CGROUP_PIDS)[ =]"
echo "### LSMs"; cat /sys/kernel/security/lsm 2>&1
echo "### user namespaces allowed"; cat /proc/sys/user/max_user_namespaces
echo "### default limits inside a container"; echo "ulimit -l (KiB): $(ulimit -l)"; echo "ulimit -n: $(ulimit -n)"; df -h /dev/shm | tail -1 | awk "{print \"/dev/shm\", \$2}"
'
