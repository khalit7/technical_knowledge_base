#!/bin/sh
# Every measurement on the Memory allocators page, in containers named os-alloc-* (image kb-os-alloc:1,
# Dockerfile.alloc). Raw outputs go to raw/. Run from anywhere: sh src/run_all.sh
# Containers are capped (--cpus 1 or 2, --memory 1500m); the multi-threaded runs get 2 CPUs and say so.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
JOB=$(cd "$HERE/../../src/trace/job" && pwd)
R=$HERE/raw; mkdir -p "$R"
L=/usr/lib/aarch64-linux-gnu
ALLOCS="glibc: jemalloc:$L/libjemalloc.so.2 tcmalloc:$L/libtcmalloc_minimal.so.4 mimalloc:$L/libmimalloc.so.2"
run() { name=$1; cpus=$2; shift 2; docker run --rm --name "os-alloc-$name-$$" --cpus "$cpus" --memory 1500m \
  -v "$HERE/exp":/exp:ro -v "$JOB":/job:ro -e ALLOCS="$ALLOCS" kb-os-alloc:1 sh -c "$*"; }
BUILD='mkdir -p /b && cd /b && for f in sizes threshold frag arenas bench; do gcc -O2 -pthread -o $f /exp/$f.c || exit 1; done'

# 0. environment
run env 1 'cat /lab/alloc_versions.txt /lab/versions.txt; uname -r; getconf PAGESIZE; nproc; cat /sys/kernel/mm/transparent_hugepage/enabled; cat /proc/sys/vm/overcommit_memory' > "$R/env.txt"
# 0b. the kernel's own allocators: the buddy allocator's free lists and the slab caches
run kernel 1 "cat /proc/buddyinfo; echo; grep -E '^(Slab|SReclaimable|SUnreclaim)' /proc/meminfo; echo; head -2 /proc/slabinfo; grep -E '^(kmalloc-(64|256|1k|4k|8k) |task_struct |dentry |inode_cache |mm_struct |vm_area_struct )' /proc/slabinfo" > "$R/kernel.txt"
# 1. chunk sizes, and the dynamic mmap threshold under strace
run sizes 1 "$BUILD; ./sizes" > "$R/sizes.txt"
run thresh 1 "$BUILD; echo '## default'; strace -e trace=brk,mmap,munmap,write ./threshold 2>&1 | sed -n '/1st/,\$p'; echo '## MALLOC_MMAP_THRESHOLD_=131072'; MALLOC_MMAP_THRESHOLD_=131072 strace -e trace=brk,mmap,munmap,write ./threshold 2>&1 | sed -n '/1st/,\$p'" > "$R/threshold.txt"
# 2. fragmentation: 400,000 x 256 B, keep every 64th, under each allocator
run frag 1 "$BUILD; for c in \$ALLOCS; do LD_PRELOAD=\${c#*:} ./frag; echo; done" > "$R/frag.txt"
# 3. arenas: 8 producers, 1 consumer (2 CPUs), glibc default, MALLOC_ARENA_MAX=1 and 2, the others; 3 runs each
run arenas 2 "$BUILD; for rep in 1 2 3; do ./arenas 2>&1 | grep -E 'allocator=|^Arena' | sed 's/^Arena.*/arena/' | uniq -c | sed 's/^ *//'; MALLOC_ARENA_MAX=1 ./arenas | head -1; MALLOC_ARENA_MAX=2 ./arenas | head -1; for c in \$ALLOCS; do [ \${c%%:*} = glibc ] && continue; LD_PRELOAD=\${c#*:} ./arenas; done; done" > "$R/arenas.txt"
# 4. malloc+free cost, 1 and 2 threads
run bench 2 "$BUILD; for c in \$ALLOCS; do LD_PRELOAD=\${c#*:} ./bench 1; LD_PRELOAD=\${c#*:} ./bench 2; done" > "$R/bench.txt"
# 5. long-run growth in a data-loader-like process (4 threads on 2 CPUs), 3 runs per configuration
run loader 2 "for rep in 1 2 3; do for c in glibc:: fixed_threshold:MALLOC_MMAP_THRESHOLD_=131072: arena_max_2:MALLOC_ARENA_MAX=2: jemalloc::$L/libjemalloc.so.2 tcmalloc::$L/libtcmalloc_minimal.so.4 mimalloc::$L/libmimalloc.so.2; do t=\${c%%:*}; r=\${c#*:}; e=\${r%%:*}; p=\${r#*:}; echo \"## run \$rep \$t\"; env ALLOC_TAG=\$t \$e LD_PRELOAD=\$p python /exp/loader_growth.py 120000; done; done" > "$R/loader.txt"
# 6. CPython's pymalloc against PYTHONMALLOC=malloc
run pymalloc 1 "python /exp/pymalloc_demo.py; echo; PYTHONMALLOC=malloc python /exp/pymalloc_demo.py" > "$R/pymalloc.txt"
# 7. PyTorch CPU tensors (mimalloc in libc10.so on this wheel) against NumPy arrays (glibc), traced
run torch 1 "strace -s 200 -e trace=mmap,munmap,madvise,brk,write -o /tmp/s.txt python /exp/torch_cpu.py 2>/dev/null; sed -n '/--- start/,/--- end/p' /tmp/s.txt | grep -v 'MAP_STACK' " > "$R/torch_cpu.txt"
# 8. the running job under each allocator (2 CPUs, as the root ran it)
run job 2 "sh /exp/job_alloc.sh" > "$R/job.txt"
sh "$HERE/extra.sh"
echo "all done: $(date -u +%Y-%m-%dT%H:%MZ)" >> "$R/env.txt"
