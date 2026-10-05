#!/bin/sh
# Two containers pinned to the same VM CPU (4): cpu.weight decides the split. Run from the host (src/).
# 1) two busy loops, --cpu-shares 1024 against 512; 2) a training step alone, with a default-weight neighbour,
# and with a neighbour at --cpu-shares 128.
IMG=kb-os-lab:1; E="$PWD/exp"
hogc() { docker run --rm -d --name "os-sched-$1" --cpuset-cpus 4 --cpu-shares $2 --memory 256m -v "$E":/exp:ro $IMG \
  sh -c 'gcc -O2 -pthread -o /tmp/s /exp/schedlab.c && exec /tmp/s hog' > /dev/null; }
usage() { docker exec "os-sched-$1" awk '/usage_usec/{print $2}' /sys/fs/cgroup/cpu.stat; }
echo "### two busy loops on one CPU: --cpu-shares 1024 against 512"
hogc wa 1024; hogc wb 512; sleep 2
echo "cpu.weight A $(docker exec os-sched-wa cat /sys/fs/cgroup/cpu.weight) B $(docker exec os-sched-wb cat /sys/fs/cgroup/cpu.weight)"
a0=$(usage wa); b0=$(usage wb); sleep 6; a1=$(usage wa); b1=$(usage wb)
echo "in 6 s: A used $(( (a1-a0)/1000 )) ms, B used $(( (b1-b0)/1000 )) ms"
docker kill os-sched-wa os-sched-wb > /dev/null
echo "### a training step (one thread) on CPU 4: alone, with a busy neighbour at the default weight, with a neighbour at --cpu-shares 128"
st() { docker run --rm --name os-sched-step --cpuset-cpus 4 --memory 1g -v "$E":/exp:ro $IMG python /exp/step.py 5; }
echo "alone: $(st)"
hogc nb 1024; sleep 1; echo "neighbour weight $(docker exec os-sched-nb cat /sys/fs/cgroup/cpu.weight): $(st)"; docker kill os-sched-nb > /dev/null
hogc nc 128; sleep 1; echo "neighbour weight $(docker exec os-sched-nc cat /sys/fs/cgroup/cpu.weight): $(st)"; docker kill os-sched-nc > /dev/null
