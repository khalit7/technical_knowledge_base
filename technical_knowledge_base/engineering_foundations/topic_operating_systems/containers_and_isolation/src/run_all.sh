#!/bin/sh
# Re-run every measurement of the containers page (about 6 minutes) on Docker Desktop's Linux VM (kernel 5.10).
# Image kb-os-cont:1 (exp/Dockerfile: the shared kb-os-lab:1 plus busybox, tini, dumb-init). Containers os-cont-*,
# always --rm, never --privileged. Extra rights are per experiment and stated: CAP_SYS_ADMIN to create namespaces
# and remount the container's own cgroup tree read-write; seccomp=unconfined where Docker 20.10's default profile
# blocks the call being taught (pivot_root; unshare(CLONE_NEWUSER) for an unprivileged user).
set -e
cd "$(dirname "$0")"
docker image inspect kb-os-cont:1 > /dev/null 2>&1 || docker build -t kb-os-cont:1 exp
R="docker run --rm --cpus 1 --memory 1500m -v $PWD/exp:/exp:ro"
sh exp/env.sh > raw/env.txt 2>&1
$R --name os-cont-mini --cap-add SYS_ADMIN --security-opt seccomp=unconfined kb-os-cont:1 sh /exp/minictr.sh > raw/minictr.txt 2>&1
$R --name os-cont-cost --cap-add SYS_ADMIN --security-opt seccomp=unconfined kb-os-cont:1 sh /exp/cost.sh > raw/cost.txt 2>&1
docker run --rm --name os-cont-cg --cap-add SYS_ADMIN --cpus 2 --memory 1500m -v /data -v $PWD/exp:/exp:ro kb-os-cont:1 sh /exp/cgroup.sh > raw/cgroup.txt 2>&1
$R --name os-cont-userns --user 1000:1000 --security-opt seccomp=unconfined kb-os-cont:1 sh /exp/userns.sh > raw/userns.txt 2>&1
sh exp/caps.sh > raw/caps.txt 2>&1
sh exp/seccomp.sh > raw/seccomp.txt 2>&1
sh exp/uring.sh > raw/uring.txt 2>&1
sh exp/stop_matrix.sh > raw/stop_matrix.txt 2>&1
sh exp/image.sh > raw/image.txt 2>&1
sh exp/runtime.sh > raw/runtime.txt 2>&1
python3 redact.py raw
python3 gen_data.py && python3 recompute.py
