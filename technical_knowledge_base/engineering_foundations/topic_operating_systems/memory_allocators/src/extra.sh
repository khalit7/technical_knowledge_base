#!/bin/sh
# Two follow-ups to run_all.sh (called from it): purging options of the other allocators on the
# fragmentation test, and glibc's trim threshold on the batch benchmark.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); R=$HERE/raw; L=/usr/lib/aarch64-linux-gnu
run() { name=$1; cpus=$2; shift 2; docker run --rm --name "os-alloc-$name-$$" --cpus "$cpus" --memory 1500m \
  -v "$HERE/exp":/exp:ro kb-os-alloc:1 sh -c "$*"; }
BUILD='mkdir -p /b && cd /b && for f in frag bench; do gcc -O2 -pthread -o $f /exp/$f.c || exit 1; done'
# jemalloc with a background purging thread and a 1 s decay; tcmalloc releasing aggressively; mimalloc resetting pages
run frag2 1 "$BUILD; MALLOC_CONF=background_thread:true,dirty_decay_ms:1000,muzzy_decay_ms:0 LD_PRELOAD=$L/libjemalloc.so.2 ./frag; echo; TCMALLOC_RELEASE_RATE=10 LD_PRELOAD=$L/libtcmalloc_minimal.so.4 ./frag; echo; MIMALLOC_PAGE_RESET=1 MIMALLOC_RESET_DELAY=0 LD_PRELOAD=$L/libmimalloc.so.2 ./frag" > "$R/frag_purge.txt"
# glibc batch pattern with the trim threshold raised (and the dynamic threshold therefore off): no brk churn
run benchtrim 1 "$BUILD; MALLOC_TRIM_THRESHOLD_=67108864 ./bench 1 | grep batch1000; MALLOC_TOP_PAD_=67108864 ./bench 1 | grep batch1000" > "$R/bench_trim.txt"
