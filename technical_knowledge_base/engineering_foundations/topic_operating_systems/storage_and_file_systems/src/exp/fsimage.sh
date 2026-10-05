#!/bin/bash
# An ext4 file system built inside a plain file (no mount, no privileges): mke2fs writes it, debugfs reads it.
# Shows the superblock, a real inode with its extent tree, a directory's entries and the journal's superblock.
set -e
cd /tmp
s(){ echo; echo "### $1"; }
s "make a 64 MiB ext4 file system in a file"
echo '$ truncate -s 64M fs.img; mke2fs -q -t ext4 -b 4096 -E root_owner=0:0 fs.img'
truncate -s 64M fs.img; mke2fs -q -t ext4 -b 4096 -E root_owner=0:0 fs.img
head -c 3000000 /dev/urandom > ckpt.pt
echo hello > hello.txt
s "copy two files in with debugfs (writes the image directly)"
echo '$ debugfs -w fs.img -R "mkdir out"; write ckpt.pt out/ckpt.pt; write hello.txt out/hello.txt; ln out/hello.txt out/hardlink.txt; sif out/hello.txt links_count 2'
debugfs -w fs.img -R "mkdir out" 2>/dev/null
debugfs -w fs.img -R "write ckpt.pt out/ckpt.pt" 2>/dev/null >/dev/null
debugfs -w fs.img -R "write hello.txt out/hello.txt" 2>/dev/null >/dev/null
debugfs -w fs.img -R "ln out/hello.txt out/hardlink.txt" 2>/dev/null
debugfs -w fs.img -R "sif out/hello.txt links_count 2" 2>/dev/null
s "superblock summary (dumpe2fs -h, selected lines)"
dumpe2fs -h fs.img 2>/dev/null | grep -E '^(Filesystem features|Inode count|Block count|Block size|Inode size|Inodes per group|Blocks per group|Journal features|Total journal size|Total journal blocks|Default mount options|Filesystem created)' | sed 's/Filesystem created:.*/Filesystem created:       <date>/'
s "the directory out: names to inode numbers (debugfs ls -l out)"
debugfs fs.img -R "ls -l out" 2>/dev/null | sed -E 's/[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4} [0-9:]{5}/<date>/'
s "inode of out/ckpt.pt (debugfs stat)"
debugfs fs.img -R "stat out/ckpt.pt" 2>/dev/null | grep -vE 'time:|crtime|Inode checksum|Generation' 
s "its extent tree (debugfs ex)"
debugfs fs.img -R "ex out/ckpt.pt" 2>/dev/null
s "inode of out/hello.txt: two names, one inode"
debugfs fs.img -R "stat out/hello.txt" 2>/dev/null | grep -E '^Inode:|Links:|Size:|EXTENTS' -A1 | grep -v '^--' | grep -vE 'time|Fragment'
s "the journal's own superblock (debugfs logdump)"
debugfs fs.img -R "logdump" 2>/dev/null | head -8
