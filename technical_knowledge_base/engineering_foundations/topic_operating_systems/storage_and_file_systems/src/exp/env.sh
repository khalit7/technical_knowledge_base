#!/bin/bash
# The storage settings of Docker Desktop's Linux VM, read from inside an unprivileged container.
# /data is an anonymous volume: a directory on the VM's ext4 disk, without overlayfs in between.
s(){ echo; echo "### $1"; }
s "kernel"; uname -r
s "file systems of / and /data"; awk '$2=="/"||$2=="/data"{print $1, $2, $3}' /proc/mounts
s "ext4 mount options of the VM disk (/proc/fs/ext4/vda1/options)"; tr '\n' ' ' < /proc/fs/ext4/vda1/options; echo
s "jbd2 journal statistics since boot (/proc/fs/jbd2/vda1-8/info)"; cat /proc/fs/jbd2/vda1-8/info
s "block device queue (/sys/block/vda/queue)"
for f in scheduler nr_requests read_ahead_kb max_sectors_kb max_hw_sectors_kb logical_block_size physical_block_size rotational write_cache fua; do echo "$f: $(cat /sys/block/vda/queue/$f)"; done
echo "hardware queues: $(ls /sys/block/vda/mq | wc -l)"
echo "size (512-byte sectors): $(cat /sys/block/vda/size)"
s "writeback sysctls (/proc/sys/vm)"
for f in dirty_background_ratio dirty_ratio dirty_background_bytes dirty_bytes dirty_expire_centisecs dirty_writeback_centisecs; do echo "$f: $(cat /proc/sys/vm/$f)"; done
s "file system types this kernel knows (/proc/filesystems, nodev ones omitted)"; grep -v nodev /proc/filesystems | tr -s '\t ' ' ' | tr '\n' ' '; echo
s "tools"; fio --version; mke2fs -V 2>&1 | head -1
s "dirty thresholds the kernel computed, VM-wide, in MiB (/proc/vmstat, pages of 4 KiB)"
awk '$1=="nr_dirty_background_threshold"||$1=="nr_dirty_threshold"||$1=="nr_dirty"{printf "%s: %d\n", $1, $2*4/1024}' /proc/vmstat
s "this container's memory limit"; cat /sys/fs/cgroup/memory.max
