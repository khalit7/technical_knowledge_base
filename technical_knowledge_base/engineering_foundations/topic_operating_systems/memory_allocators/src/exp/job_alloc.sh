#!/bin/sh
# The root's running example (../../../src/trace/job/) under each allocator, 3 runs each: peak and final RSS
# of the main process and the wall time (job_wrap.py). Runs inside kb-os-alloc:1 with the job folder at /job.
# LD_PRELOAD is inherited by the DataLoader workers.
L=/usr/lib/aarch64-linux-gnu
mkdir -p /work/data /work/out && python /job/make_data.py /work/data/train.bin >/dev/null
for c in glibc: jemalloc:$L/libjemalloc.so.2 tcmalloc:$L/libtcmalloc_minimal.so.4 mimalloc:$L/libmimalloc.so.2; do
  t=${c%%:*}; p=${c#*:}
  for rep in 1 2 3; do
    ALLOC_TAG=$t LD_PRELOAD=$p python /exp/job_wrap.py 2>&1 | grep -E "RESULT|done at"
  done
done
