#!/bin/sh
# Run on the Docker host: caps_ops.py as root with Docker's defaults, with every capability dropped, as UID 1000,
# and with three capabilities added. ulimit -l (memlock) is Docker's default 64 KiB in every case.
cd "$(dirname "$0")"
R="docker run --rm --cpus 1 --memory 512m -v $PWD:/exp:ro"
echo "### root, Docker defaults"; $R --name os-cont-cap-def kb-os-cont:1 python3 /exp/caps_ops.py
echo "### root, --cap-drop ALL"; $R --name os-cont-cap-none --cap-drop ALL kb-os-cont:1 python3 /exp/caps_ops.py
echo "### --user 1000"; $R --name os-cont-cap-user --user 1000 kb-os-cont:1 python3 /exp/caps_ops.py
echo "### root, --cap-add SYS_NICE --cap-add IPC_LOCK --cap-add SYS_RESOURCE"; $R --name os-cont-cap-add --cap-add SYS_NICE --cap-add IPC_LOCK --cap-add SYS_RESOURCE kb-os-cont:1 python3 /exp/caps_ops.py
echo "### why port 80 worked: Docker sets this sysctl in each container's network namespace"; $R --name os-cont-cap-sysctl kb-os-cont:1 cat /proc/sys/net/ipv4/ip_unprivileged_port_start
