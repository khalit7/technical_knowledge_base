#!/bin/bash
# strace the checkpoint writes; keep only the calls between the phase markers that touch the checkpoint
# directory, with runs of write() folded into one line (count and bytes).
mkdir -p /data/out
for m in naive safe dcp; do
  echo "### $m"
  strace -f -y -qq -e trace=openat,write,writev,pwrite64,pwritev,pwritev2,fsync,fdatasync,rename,renameat,renameat2,unlink,unlinkat,close,mkdirat,faccessat,faccessat2 \
    -o /tmp/$m.st python -W ignore /exp/ckpt_small.py $m /data/out
  python3 /exp/fold_strace.py /tmp/$m.st
  rm -rf /data/out/*
done
