#!/bin/sh
# Stop only this lab's containers (each was started with --rm) and wait until Docker has removed them,
# so that up.sh can reuse the names at once.
for c in ${@:-bastion node1 node2}; do
  docker stop -t 1 proto-ssh-$c >/dev/null 2>&1
  docker rm -f proto-ssh-$c >/dev/null 2>&1
  n=0; while docker ps -a --format '{{.Names}}' | grep -qx "proto-ssh-$c" && [ $n -lt 50 ]; do sleep 0.2; n=$((n+1)); done
done
