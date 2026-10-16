#!/bin/sh
# Start the mi Ray cluster in containers: a head node with no CPUs for tasks (GCS, dashboard, the driver and
# Ray Train's controller live here; nothing trains on it) and two worker nodes, each 2 CPUs and 2 FAKE
# "fake_gpu" custom resources (Ray only counts them). Shared volume mi-ray-shared at /shared on all three.
# Needs image mi-ray:1. Caps: head 1500m and 1 CPU, workers 1100m and 2 CPUs each (3.7 GB in all).
# Ray fixes its memory-kill threshold (95% of the cap) when each raylet starts: docker update on a running
# container does not move it. To resize, change --memory below and restart Ray (down.sh, then up.sh).
# The head alone uses about 0.7 GB idle (GCS, dashboard, agents, client server, autoscaler monitor), plus about
# 0.23 GB for the driver and 0.21 GB for Ray Train's controller. Two smaller heads failed: Ray's memory monitor
# killed workers at 95% of the container limit (1.4 GB head with 2 ranks on it; 1.2 GB head with none). Both runs
# are kept as evidence for the Failure lab.
set -e
docker network inspect mi-ray-net >/dev/null 2>&1 || docker network create mi-ray-net >/dev/null
docker volume inspect mi-ray-shared >/dev/null 2>&1 || docker volume create mi-ray-shared >/dev/null
COMMON="--init --network mi-ray-net --shm-size 128m -v mi-ray-shared:/shared -e OMP_NUM_THREADS=1"
docker run -d $COMMON --name mi-ray-head --hostname ray-head --memory 1500m --memory-swap 1500m --cpus 1 \
  mi-ray:1 sh -c "ray start --head --port 6379 --num-cpus 0 --dashboard-host 0.0.0.0 --disable-usage-stats --object-store-memory 80000000 --block" >/dev/null
for i in $(seq 60); do docker exec mi-ray-head ray status >/dev/null 2>&1 && break; sleep 1; done
for n in 1 2; do
  docker run -d $COMMON --name mi-ray-w$n --hostname ray-w$n --memory 1100m --memory-swap 1100m --cpus 2 \
    mi-ray:1 sh -c "ray start --address ray-head:6379 --num-cpus 2 --resources '{\"fake_gpu\":2}' --object-store-memory 80000000 --block" >/dev/null
done
docker exec mi-ray-head sh -c 'mkdir -p /shared/ckpt /shared/logs /shared/results && chmod 1777 /shared/*'
for i in $(seq 60); do docker exec mi-ray-head ray status 2>/dev/null | grep -q "/4.0 CPU" && break; sleep 1; done
docker exec mi-ray-head ray status | sed -n '/Resources/,$p'
