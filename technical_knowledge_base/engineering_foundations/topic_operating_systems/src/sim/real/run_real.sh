#!/bin/sh
# Real measurements behind the OS simulators tab. Runs in the shared lab image kb-os-lab:1
# (Debian 12 arm64, Linux 5.10.104-linuxkit in Docker Desktop's VM on an Apple M1 laptop).
# Usage: sh run_real.sh   (writes out/*.txt; each container is named os-sim-* and removed afterwards)
set -e
cd "$(dirname "$0")"
IMG=kb-os-lab:1
run(){ name=$1; shift; docker run --rm --name "os-sim-$name" "$@"; }
mkdir -p out
# 1. context switch: both processes on CPU 1, then on CPUs 1 and 2 (no switch needed, cross-CPU wake-up instead)
run ctx --cpuset-cpus 1,2 --memory 512m -v "$PWD":/src:ro $IMG sh -c \
 'gcc -O2 -o /tmp/ctxsw /src/ctxsw.c && for i in 1 2 3 4 5; do /tmp/ctxsw 200000 1 1; done && for i in 1 2 3; do /tmp/ctxsw 200000 1 2; done' > out/ctxsw.txt
# 2. CFS weights: nice 0 against nice 5 and nice 10, both pinned to CPU 3 for 10 s
run nice --cpuset-cpus 3 --memory 256m -v "$PWD":/src:ro $IMG sh -c \
 'gcc -O2 -o /tmp/ns /src/nice_share.c && /tmp/ns 0 10 3 && /tmp/ns 5 10 3 && /tmp/ns 10 10 3' > out/nice_share.txt
# 3. TLB and the 2-D walk
run tlb --cpuset-cpus 1 --memory 1g -v "$PWD":/src:ro $IMG sh -c \
 'gcc -O2 -o /tmp/tlb /src/tlb.c && /tmp/tlb 16384 4k && /tmp/tlb 16384 huge' > out/tlb.txt
# 4. copy-on-write after fork
run cow --cpus 2 --memory 2g -v "$PWD":/src:ro $IMG python /src/cow.py > out/cow.txt
# 5. the lost-update race on 2 CPUs and on 1 CPU
run race2 --cpuset-cpus 1,2 --memory 256m -v "$PWD":/src:ro $IMG sh -c \
 'gcc -O2 -pthread -o /tmp/race /src/race.c && for m in none none none mutex atomic; do /tmp/race $m 10000000; done' > out/race_2cpu.txt
run race1 --cpuset-cpus 1 --memory 256m -v "$PWD":/src:ro $IMG sh -c \
 'gcc -O2 -pthread -o /tmp/race /src/race.c && for m in none none none mutex atomic; do /tmp/race $m 10000000; done' > out/race_1cpu.txt
run asm --cpus 1 --memory 256m -v "$PWD":/src:ro $IMG sh -c \
 'gcc -O2 -S -o - /src/inc.c | grep -v "^\s*\.\(cfi\|file\|text\|align\|p2align\|type\|size\|ident\|section\|global\|bss\|zero\)"' > out/inc_asm.txt
# 6. deadlock, then the lock-ordering fix
run dead --cpus 1 --memory 256m -v "$PWD":/src:ro $IMG sh -c \
 'gcc -O2 -pthread -o /tmp/dl /src/deadlock.c && /tmp/dl opposite; /tmp/dl ordered' > out/deadlock.txt
# environment line for the page
run env --cpus 1 --memory 256m $IMG sh -c 'echo "kernel $(uname -r) arch $(uname -m) cpus $(nproc) page $(getconf PAGESIZE)"; gcc --version | head -1' > out/env.txt
docker image inspect $IMG --format '{{.Id}}' >> out/env.txt
date -u +"recorded %Y-%m-%dT%H:%MZ" >> out/env.txt
