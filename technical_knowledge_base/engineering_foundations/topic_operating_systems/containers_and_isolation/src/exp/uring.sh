#!/bin/sh
# Run on the Docker host. io_uring ring memory is charged to the UID (Linux 5.10, fs/io_uring.c __io_account_mem),
# so containers whose processes run as the same UID share one RLIMIT_MEMLOCK budget (64 KiB by default here),
# whatever their namespaces or cgroups. Tested with UIDs 2000 and 3000, which nothing else on the VM uses.
cd "$(dirname "$0")"
R="docker run --rm --cpus 1 --memory 512m -v $PWD:/exp:ro"
U='gcc -O2 -o /tmp/u /exp/uring_mem.c 2>/dev/null; /tmp/u'
echo "### 1. container A as UID 2000, alone"; $R --name os-cont-ur-a1 --user 2000 kb-os-cont:1 sh -c "$U"
echo "### 2. container A as UID 2000 creates rings and holds them for 30 s"
$R -d --name os-cont-ur-hold --user 2000 kb-os-cont:1 sh -c "$U 30" > /dev/null; sleep 8; docker logs os-cont-ur-hold
echo "### 3. meanwhile container B, also UID 2000 (its own namespaces and cgroup)"; $R --name os-cont-ur-b --user 2000 kb-os-cont:1 sh -c "$U"
echo "### 4. meanwhile container C as UID 3000"; $R --name os-cont-ur-c --user 3000 kb-os-cont:1 sh -c "$U"
echo "### 5. meanwhile container D, UID 2000 with --ulimit memlock=1048576 (1 MiB)"; $R --name os-cont-ur-d --user 2000 --ulimit memlock=1048576 kb-os-cont:1 sh -c "$U"
docker stop -t 1 os-cont-ur-hold > /dev/null 2>&1; sleep 2
echo "### 6. after A exits: container B again, UID 2000"; $R --name os-cont-ur-b2 --user 2000 kb-os-cont:1 sh -c "$U"
echo "### 7. root (UID 0), the default: shares its budget with everything else root on the VM (running containers: $(docker ps -q | wc -l | tr -d ' '))"
$R --name os-cont-ur-root kb-os-cont:1 sh -c "$U"
echo "### 8. root with --cap-add IPC_LOCK (the limit is skipped; stops at 64)"; $R --name os-cont-ur-ipc --cap-add IPC_LOCK kb-os-cont:1 sh -c "$U"
