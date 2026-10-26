#!/bin/bash
# Reproduce every output shown in Part 2 ("The machine underneath"). Writes out/*.txt.
# Timings run 3 times (ladder: 3 random, 2 sequential) with the load average recorded before each run,
# because the laptop is in normal use. Takes about 15 minutes. Big files and binaries stay in $B (scratch).
set -e
cd "$(dirname "$0")/code"
. ./env.sh
mkdir -p "$B" ../out
O=../out
strip_asm() { grep -v '^\s*\.\|^;\|^\s*$\|^l_\|; -- End\|^Lloh\|^Lfunc\|^ltmp\|^Ltmp'; }
# ---- deterministic outputs (compiler output, sizes) ----
sysctl hw.cachelinesize hw.pagesize hw.perflevel0.l1dcachesize hw.perflevel0.l2cachesize hw.perflevel0.physicalcpu \
  hw.perflevel1.l1dcachesize hw.perflevel1.l2cachesize hw.perflevel1.physicalcpu hw.memsize hw.optional.neon \
  hw.optional.arm.FEAT_DotProd hw.optional.arm.FEAT_BF16 hw.optional.arm.FEAT_I8MM hw.optional.arm.FEAT_SME machdep.cpu.brand_string > $O/sysctl.txt
$CXX -O2 -Wpadded -o $B/layout layout.cpp 2> $O/layout_wpadded.txt; $B/layout > $O/layout.txt
$CXX -O2 -S -fno-asynchronous-unwind-tables -o - dot_kernels.cpp | strip_asm > $O/dot_kernels_O2.s
$CXX -O2 -ffast-math -S -fno-asynchronous-unwind-tables -o - dot_fm.cpp | strip_asm > $O/dot_fm.s
$CXX -O2 -c -o /dev/null -Rpass=loop-vectorize -Rpass-missed=loop-vectorize -Rpass-analysis=loop-vectorize dot_kernels.cpp 2> $O/vec_remarks.txt
$CXX -O2 -ffast-math -c -o /dev/null -Rpass=loop-vectorize dot_fm.cpp 2> $O/vec_remarks_fm.txt
$CXX -O0 -S -fno-asynchronous-unwind-tables -o - codegen.cpp | strip_asm > $O/codegen_O0.s
$CXX -O2 -S -fno-asynchronous-unwind-tables -o - codegen.cpp | strip_asm > $O/codegen_O2.s
$CXX -O2 -S -fno-asynchronous-unwind-tables -o - orders_asm.cpp | strip_asm > $O/orders.s
$CXX -O2 -S -fno-asynchronous-unwind-tables -o - branch.cpp | strip_asm > $O/branch_O2.s
$CXX -O2 -DKEEP_BRANCH -S -fno-asynchronous-unwind-tables -o - branch.cpp | strip_asm > $O/branch_keep.s
$CXX -O2 -S -fno-asynchronous-unwind-tables -o - race.cpp | strip_asm > $O/race_O2.s
$CXX -O2 -S -o - reassoc.cpp | grep -c "fmla.4s" | sed "s/^/fmla.4s instructions in dot_reassoc at -O2: /" > $O/reassoc.txt
bash abi.sh > $O/abi.txt
bash llama_excerpts.sh > $O/llama_excerpts.txt
bash tsan.sh > $O/tsan.txt 2>&1 || true
# ---- build the timed programs ----
$CXX -O2 -o $B/ladder ladder.cpp
$CXX -O2 -o $B/aos_soa aos_soa.cpp
$CXX -O2 -ffast-math -o $B/aos_soa_fm aos_soa.cpp
$CXX -O2 -o $B/rowcol rowcol.cpp
$CXX -O2 -o $B/branch_o2 branch.cpp
$CXX -O2 -DKEEP_BRANCH -o $B/branch_keep branch.cpp
$CXX -O2 -c dot_kernels.cpp -o $B/dot_kernels.o && $CXX -O2 -ffast-math -c dot_fm.cpp -o $B/dot_fm.o
$CXX -O2 dot.cpp $B/dot_kernels.o $B/dot_fm.o -o $B/dot
$CXX -O2 -o $B/false_sharing false_sharing.cpp
$CXX -O2 -o $B/litmus litmus.cpp
$CXX -O2 -o $B/mmap_demo mmap_demo.cpp
$CXX -O3 -ffast-math -o $B/roof roof.cpp
$CXX -O2 -o $B/alloc alloc.cpp
$CXX -O2 -o $B/race_o2 race.cpp; $CXX -O0 -o $B/race_o0 race.cpp
[ -f $B/model.bin ] || dd if=/dev/urandom of=$B/model.bin bs=1m count=512 2>/dev/null
# ---- timed runs ----
run() { name=$1; shift; for r in 1 2 3; do { echo "# load: $(uptime | sed 's/.*load averages*: //')"; "$@"; } > $O/${name}_$r.txt 2>&1; done; }
run aos_soa $B/aos_soa
run aos_soa_fm $B/aos_soa_fm
run rowcol $B/rowcol
run branch_o2 $B/branch_o2
run branch_keep $B/branch_keep
run dot $B/dot
run false_sharing $B/false_sharing
run litmus $B/litmus
run mmap $B/mmap_demo $B/model.bin
run roof $B/roof
run alloc $B/alloc
for r in 1 2 3; do bash profile.sh > $O/profile_$r.txt 2>&1; done
{ for i in $(seq 300); do $B/race_o2; done | sort | uniq -c; } > $O/race_O2_300.txt
{ for i in $(seq 300); do $B/race_o0; done | sort | uniq -c; } > $O/race_O0_300.txt
for r in 1 2 3; do { echo "# load: $(uptime | sed 's/.*load averages*: //')"; $B/ladder random; } > $O/ladder_random_$r.txt; done
for r in 1 2; do { echo "# load: $(uptime | sed 's/.*load averages*: //')"; $B/ladder sequential; } > $O/ladder_seq_$r.txt; done
echo done
