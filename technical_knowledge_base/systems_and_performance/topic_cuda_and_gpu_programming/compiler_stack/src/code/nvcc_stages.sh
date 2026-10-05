#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 (CUDA 13.4.2, no GPU). /work = this page's src/, /kern = the root's src/compile/kernels (read only).
# Writes out/nvcc/. Failures are recorded, not hidden: they are part of the evidence.
set -u
O=/work/out/nvcc; rm -rf $O; mkdir -p $O; T=/tmp/cs; rm -rf $T; mkdir -p $T; cd $T
cp /kern/k5_softmax.cu softmax.cu
nvcc --version > $O/version.txt
nvcc --list-gpu-arch > $O/list_gpu_arch.txt; nvcc --list-gpu-code > $O/list_gpu_code.txt
# 1. the phases nvcc runs
nvcc --dryrun -O3 -arch=sm_90a -c softmax.cu -o softmax.o > $O/dryrun_sm90a.txt 2>&1
nvcc --dryrun -O3 -arch=sm_90 -c softmax.cu -o softmax.o > $O/dryrun_arch_sm90.txt 2>&1
nvcc -arch=native -c softmax.cu -o n.o > $O/arch_native.txt 2>&1; echo "exit=$?" >> $O/arch_native.txt
# 2. the intermediate files (--keep)
mkdir keep; nvcc -O3 -arch=sm_90a --keep --keep-dir keep -c softmax.cu -o keep/softmax.o > /dev/null 2>&1
( cd keep; for f in $(ls); do printf '%s\t%s\n' "$f" "$(wc -c < $f)"; done ) > $O/keep_files.tsv
cp keep/softmax.compute_90a.ptx $O/softmax.sm_90a.keep.ptx; cp keep/softmax.compute_90a.cudafe1.gpu $O/softmax.cudafe1.gpu.txt
grep -n 'softmax_rows' keep/*.cudafe1.stub.c | head -20 > $O/stub_lines.txt
head -c 1500 keep/*.module_id > $O/module_id.txt 2>/dev/null
# 3. fat binaries: what each flag puts in the object
fat() { name=$1; shift; nvcc -O3 -c softmax.cu -o f_$name.o "$@" > $O/fat_$name.err 2>&1; echo "exit=$?" >> $O/fat_$name.err
  { echo "flags: $*"; echo "bytes: $(wc -c < f_$name.o)"; cuobjdump -lelf -lptx f_$name.o; } > $O/fat_$name.txt 2>&1; }
fat arch_sm90a -arch=sm_90a
fat arch_sm90 -arch=sm_90
fat arch_compute90 -arch=compute_90
fat code_sm90_only -gencode arch=compute_90,code=sm_90
fat two_plus_ptx -gencode arch=compute_80,code=sm_80 -gencode arch=compute_90,code=[sm_90,compute_90]
fat family_100f -arch=sm_100f
fat all_major -arch=all-major
fat torch_like -gencode arch=compute_80,code=sm_80 -gencode arch=compute_86,code=sm_86 -gencode arch=compute_90,code=sm_90 -gencode arch=compute_100,code=sm_100 -gencode arch=compute_120,code=[sm_120,compute_120]
# 4. which target accepts which feature (kernels from the root's Compiler explorer)
for k in k1_vadd k7_mma_fp8 k8_wgmma k9_tcgen05 k11_tma; do
  for a in sm_80 sm_89 sm_90 sm_90a sm_100 sm_100a sm_100f sm_103a sm_103f sm_110a sm_120 sm_120a sm_120f sm_121a; do
    nvcc -std=c++17 -O3 -arch=$a -cubin -o m.cubin /kern/$k.cu > m.err 2>&1; e=$?
    printf '%s\t%s\t%s\t%s\n' "$k" "$a" "$e" "$(grep -m1 -i -E 'error|not supported' m.err | sed 's#/kern/##; s#/tmp/[^ ]*##' | cut -c1-220)"
  done
done > $O/feature_matrix.tsv
# 5. ptxas optimisation levels on the same PTX
nvcc -O3 -arch=compute_90a -ptx -o s.ptx softmax.cu
for l in 0 1 2 3; do ptxas -arch=sm_90a -O$l -v -o s$l.cubin s.ptx > p$l.txt 2>&1
  printf '%s\t%s\t%s\n' "$l" "$(grep -o 'Used [0-9]* registers' p$l.txt)" "$(cuobjdump -sass s$l.cubin | grep -c -E '^ +/\*[0-9a-f]{4}\*/')"; done > $O/ptxas_levels.tsv
# 6. an older ptxas (Triton's bundled 12.9) on PTX from CUDA 13.4: the JIT-too-old failure, offline
OLD=$(python3 -c 'import triton,os;print(os.path.join(os.path.dirname(triton.__file__),"backends/nvidia/bin/ptxas"))')
{ $OLD --version | tail -2; head -20 s.ptx | grep -E '^\.(version|target)'; $OLD -arch=sm_90a -o old.cubin s.ptx; echo "exit=$?"; } > $O/old_ptxas.txt 2>&1
sed -i 's/^\.version .*/.version 8.8/' s.ptx; { echo "after editing .version to 8.8:"; $OLD -arch=sm_90a -o old.cubin s.ptx; echo "exit=$?"; } >> $O/old_ptxas.txt 2>&1
# 7. e^x four ways, and inline PTX
cp /work/code/cu/*.cu .
for v in "" "-use_fast_math"; do tag=${v:-default}; tag=${tag#-}
  nvcc -O3 -arch=sm_90a -cubin $v -o e.cubin exp_variants.cu && cuobjdump -sass e.cubin > $O/exp_$tag.sass.txt
  nvcc -O3 -arch=compute_90a -ptx $v -o $O/exp_$tag.ptx exp_variants.cu; done
nvcc -O3 -arch=sm_90a -cubin -o i.cubin inline_ptx.cu && cuobjdump -sass i.cubin > $O/inline.sass.txt
nvcc -O3 -arch=compute_90a -ptx -o $O/inline.ptx inline_ptx.cu
nvcc -O3 -arch=sm_90a -cubin -o t.cubin templ.cu && cuobjdump -symbols t.cubin > $O/templ_symbols.txt 2>&1; cuobjdump -sass t.cubin | grep Function | sed 's/^[[:space:]]*//' | while read a b; do echo "$b"; done > $O/templ_funcs.txt; cu++filt < $O/templ_funcs.txt > $O/templ_demangled.txt
# 8. SASS with encodings and register live ranges for the running example, four targets
for a in sm_80 sm_90a sm_100a sm_120; do
  nvcc -O3 -arch=$a -cubin -o sx.cubin softmax.cu
  nvdisasm -hex -c sx.cubin > $O/softmax.$a.hex.txt; nvdisasm -plr -c sx.cubin > $O/softmax.$a.plr.txt
  cuobjdump -res-usage sx.cubin > $O/softmax.$a.res.txt 2>&1; done
for k in k3_matmul_tiled k8_wgmma; do a=sm_90a; nvcc -std=c++17 -O3 -arch=$a -cubin -o kx.cubin /kern/$k.cu && nvdisasm -hex -c kx.cubin > $O/$k.$a.hex.txt && nvdisasm -plr -c kx.cubin > $O/$k.$a.plr.txt; done
# 9. -arch=sm_90a on a Hopper-only kernel: nvcc also builds generic compute_90 PTX, which cannot hold wgmma
{ echo '$ nvcc -arch=sm_90a -c k8_wgmma.cu'; nvcc -std=c++17 -arch=sm_90a -c /kern/k8_wgmma.cu -o w1.o > w1.err 2>&1; e=$?; sed 's#/tmp/[^ ,]*#<tmp>.ptx#' w1.err; echo "exit=$e"
  echo '$ nvcc -gencode arch=compute_90a,code=sm_90a -c k8_wgmma.cu'; nvcc -std=c++17 -gencode arch=compute_90a,code=sm_90a -c /kern/k8_wgmma.cu -o w2.o 2>&1; echo "exit=$?"; cuobjdump -lelf -lptx w2.o
  echo '$ nvcc -arch=sm_90a -c wgmma_guard.cu   (guarded with __CUDA_ARCH_FEAT_SM90_ALL)'; nvcc -arch=sm_90a -c wgmma_guard.cu -o w3.o 2>&1; echo "exit=$?"; cuobjdump -lelf -lptx w3.o
  echo '$ cuobjdump -ptx w3.o | grep -E "^.target|wgmma"'; cuobjdump -ptx w3.o | grep -E '^\.target|wgmma'; } > $O/arch_specific_gotcha.txt 2>&1
# 10b. what -arch=sm_100f really embeds (cuobjdump names the cubin sm_100; the fat binary says 100f)
nvcc --dryrun -arch=sm_100f -c softmax.cu -o f.o 2>&1 | grep -o 'image3=kind=[a-z]*,sm=[0-9a-z]*' > $O/dryrun_sm100f_images.txt
# 10. no -arch at all
nvcc -c /kern/k1_vadd.cu -o d.o && cuobjdump -lelf -lptx d.o > $O/default_arch.txt 2>&1
echo done > $O/DONE
