#!/bin/bash
# Compile and run the C experiments on /data (ext4 on the VM disk) and on /dev/shm (tmpfs) as a contrast.
set -e
gcc -O2 -o /tmp/synccost /exp/synccost.c; gcc -O2 -o /tmp/direct /exp/direct.c
echo "### durability calls, 4 KiB records, on ext4 (/data)"; /tmp/synccost /data 1000
echo; echo "### the same on tmpfs (/dev/shm): nothing to flush"; /tmp/synccost /dev/shm 1000
echo; echo "### O_DIRECT alignment on ext4 (/data)"; /tmp/direct /data/direct.bin; rm -f /data/direct.bin
echo; echo "### O_DIRECT on tmpfs"; /tmp/direct /dev/shm/direct.bin || true
