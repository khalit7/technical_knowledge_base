#!/bin/sh
# Start the lab cluster: bastion on an edge network (published on 127.0.0.1:30922),
# two compute nodes on an internal network the laptop cannot reach. NETEM adds delay on the bastion.
S=$(cd "$(dirname "$0")/.." && pwd)
docker network inspect proto-ssh-edge >/dev/null 2>&1 || docker network create proto-ssh-edge >/dev/null
docker network inspect proto-ssh-cluster >/dev/null 2>&1 || docker network create --internal proto-ssh-cluster >/dev/null
L="--rm -d --cpus 1 --memory 1g"
start_bastion(){ docker run $L --name proto-ssh-bastion --hostname bastion --cap-add NET_ADMIN -e NETEM="${NETEM:-}" \
  --network proto-ssh-edge -p 127.0.0.1:30922:22 -v $S/cfg_bastion:/cfg:ro proto-ssh-edge:1 >/dev/null
  docker network connect --alias bastion proto-ssh-cluster proto-ssh-bastion; }
start_node1(){ docker run $L --name proto-ssh-node1 --hostname gpu-node-01 -e NOTEBOOK=1 --network proto-ssh-cluster --network-alias gpu-node-01 \
  -v $S/cfg_node1:/cfg:ro proto-ssh-edge:1 >/dev/null; }
start_node2(){ docker run $L --name proto-ssh-node2 --hostname gpu-node-02 --network proto-ssh-cluster --network-alias gpu-node-02 \
  -v $S/cfg_node2:/cfg:ro proto-ssh-legacy:1 >/dev/null; }
for w in ${@:-bastion node1 node2}; do start_$w; done
sleep 2
