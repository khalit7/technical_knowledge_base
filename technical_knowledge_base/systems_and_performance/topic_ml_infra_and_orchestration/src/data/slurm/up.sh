#!/bin/sh
# Start the mi Slurm cluster: network mi-slurm-net, volume mi-slurm-shared (/shared on every node),
# ctl (512 MB, 1 CPU) and c1-c3 (800 MB, 2 CPUs each). Needs image mi-slurm:1 (docker build -t mi-slurm:1 .).
set -e
# Fixed addresses on a private Docker network, and every name in every /etc/hosts: slurmctld drops a node
# whose name does not resolve when it starts, so names must exist before the containers do.
docker network inspect mi-slurm-net >/dev/null 2>&1 || docker network create --subnet 172.30.77.0/24 mi-slurm-net >/dev/null
H="--add-host ctl:172.30.77.10 --add-host c1:172.30.77.11 --add-host c2:172.30.77.12 --add-host c3:172.30.77.13"
docker volume inspect mi-slurm-shared >/dev/null 2>&1 || docker volume create mi-slurm-shared >/dev/null
docker run -d --init --name mi-slurm-ctl --hostname ctl --network mi-slurm-net --ip 172.30.77.10 $H \
  --memory 512m --memory-swap 512m --cpus 1 -v mi-slurm-shared:/shared mi-slurm:1 ctl >/dev/null
for i in $(seq 90); do docker logs mi-slurm-ctl 2>&1 | grep -q "ctl ready" && break; sleep 1; done
for n in 1 2 3; do
  docker run -d --init --name mi-slurm-c$n --hostname c$n --network mi-slurm-net --ip 172.30.77.1$n $H \
    --memory 800m --memory-swap 800m --cpus 2 -v mi-slurm-shared:/shared mi-slurm:1 node >/dev/null
done
# Shared folders for job scripts, outputs, checkpoints and logs; the running example's batch script.
docker exec mi-slurm-ctl sh -c 'mkdir -p /shared/jobs /shared/out /shared/ckpt /shared/logs && chmod 1777 /shared/*'
docker cp "$(dirname "$0")/train.sbatch" mi-slurm-ctl:/shared/jobs/train.sbatch
docker exec mi-slurm-ctl chmod 644 /shared/jobs/train.sbatch
sleep 5; docker exec mi-slurm-ctl sinfo
