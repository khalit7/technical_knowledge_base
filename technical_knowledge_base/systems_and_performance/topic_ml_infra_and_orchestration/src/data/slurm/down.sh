#!/bin/sh
# Stop and remove the mi Slurm cluster. Add "all" to also delete the shared volume and the network.
docker rm -f mi-slurm-c1 mi-slurm-c2 mi-slurm-c3 mi-slurm-ctl 2>/dev/null
[ "$1" = all ] && { docker volume rm mi-slurm-shared; docker network rm mi-slurm-net; }
true
