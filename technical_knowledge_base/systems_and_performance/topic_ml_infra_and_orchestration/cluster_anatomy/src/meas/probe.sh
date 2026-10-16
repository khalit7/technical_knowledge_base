#!/bin/sh
# What the toy cluster's "nodes" report about themselves, against what Slurm was told.
# Read-only: no jobs, no config changes. Run under the shared slurm lock.
# Output goes to out/probe_raw.txt (unscrubbed, kept in scratch) ; scrub.py writes out/probe.txt.
# usage: sh probe.sh <raw output file>
OUT=${1:-probe_raw.txt}
{
echo "### host (macOS) sysctl"
sysctl -n hw.model hw.ncpu hw.physicalcpu hw.perflevel0.physicalcpu hw.perflevel1.physicalcpu hw.memsize 2>&1
echo "### docker info (VM)"
docker info --format 'cpus={{.NCPU}} mem={{.MemTotal}} kernel={{.KernelVersion}} cgroup={{.CgroupVersion}} arch={{.Architecture}}'
echo "### docker inspect caps"
for c in mi-slurm-ctl mi-slurm-c1 mi-slurm-c2 mi-slurm-c3; do
  docker inspect -f '{{.Name}} NanoCpus={{.HostConfig.NanoCpus}} Memory={{.HostConfig.Memory}} Privileged={{.HostConfig.Privileged}}' $c
done
echo "### docker network inspect mi-slurm-net"
docker network inspect -f 'driver={{.Driver}} subnet={{range .IPAM.Config}}{{.Subnet}}{{end}} containers={{len .Containers}}' mi-slurm-net
echo "### c1: nproc, lscpu"
docker exec mi-slurm-c1 sh -c 'nproc; lscpu 2>&1 | head -30'
echo "### c1: NUMA nodes in sysfs"
docker exec mi-slurm-c1 sh -c 'ls /sys/devices/system/node 2>&1 | tr "\n" " "; echo; cat /sys/devices/system/node/node0/cpulist 2>&1'
echo "### c1: cgroup limits (the real fence)"
docker exec mi-slurm-c1 sh -c 'echo memory.max=$(cat /sys/fs/cgroup/memory.max); echo cpu.max=$(cat /sys/fs/cgroup/cpu.max); echo memory.current=$(cat /sys/fs/cgroup/memory.current)'
echo "### c1: /proc/meminfo MemTotal"
docker exec mi-slurm-c1 sh -c 'grep MemTotal /proc/meminfo'
echo "### c1: PCI devices and GPUs"
docker exec mi-slurm-c1 sh -c 'ls /sys/bus/pci/devices 2>&1 | wc -l; ls -l /dev/mi_gpu* 2>&1; ls /dev/nvidia* 2>&1 | head -2; ls /sys/class/infiniband 2>&1'
echo "### c1: network interfaces and routes"
docker exec mi-slurm-c1 sh -c 'for i in /sys/class/net/*; do n=$(basename $i); echo "$n mtu=$(cat $i/mtu) speed=$(cat $i/speed 2>/dev/null || echo n/a)"; done; cat /proc/net/route | head -4'
echo "### c1: block devices"
docker exec mi-slurm-c1 sh -c 'cat /proc/partitions | head -8; df -h / /shared 2>&1 | tail -2'
echo "### slurm: what the controller was told"
docker exec mi-slurm-ctl scontrol show node c1
docker exec mi-slurm-ctl sinfo -N -o '%N %c %m %G %T'
docker exec mi-slurm-ctl scontrol show topology 2>&1
docker exec mi-slurm-ctl sh -c 'grep -E "^(NodeName|PartitionName|TopologyPlugin|SelectType)" /etc/slurm/slurm.conf'
} > "$OUT" 2>&1
echo wrote "$OUT"
