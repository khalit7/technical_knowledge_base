#!/bin/sh
# Run on the Docker host: who runs a container. A sleeping container, then the Linux VM's process tree seen from a
# second container that shares the VM's PID namespace (--pid host; read-only listing, nothing else shared).
docker run -d --rm --name os-cont-rt kb-os-cont:1 sleep 60 > /dev/null; sleep 1
echo "### docker run --pid host ... ps: the chain from containerd to the container's process"
docker run --rm --name os-cont-ps --pid host kb-os-cont:1 ps -eo pid,ppid,comm,args --forest | awk 'NR==1 || /containerd|dockerd|shim|sleep 60/' | grep -v 'awk\|ps -eo' | cut -c1-150
echo "### docker inspect: the container's PID on the VM and its cgroup"
docker inspect -f 'Pid {{.State.Pid}}  CgroupnsMode {{.HostConfig.CgroupnsMode}}  Runtime {{.HostConfig.Runtime}}' os-cont-rt
docker stop -t 1 os-cont-rt > /dev/null
echo "### time to start and remove a container: docker run --rm kb-os-cont:1 true (5 runs, seconds)"
for i in 1 2 3 4 5; do python3 -c 'import subprocess,time;t=time.time();subprocess.run(["docker","run","--rm","--name","os-cont-start","kb-os-cont:1","true"]);print(round(time.time()-t,3))'; done
