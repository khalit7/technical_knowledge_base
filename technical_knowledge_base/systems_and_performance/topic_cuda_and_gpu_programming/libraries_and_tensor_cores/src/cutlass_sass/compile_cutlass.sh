#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 with CUTLASS v4.8.0 mounted read-only at /cutlass and this folder at /work.
# Compiles CUTLASS's own examples and CuTe tutorials to SASS for their target (no GPU: not run).
# Keeps the ptxas -v report and the SASS; the opcode histograms are made by summarise.py.
set -u
cd /work
mkdir -p out
E=/cutlass/examples
FLAGS="-std=c++17 -O3 -DNDEBUG --expt-relaxed-constexpr -I/cutlass/include -I/cutlass/tools/util/include -I/cutlass/examples/common -cubin -Xptxas -v"
build() { # name file arch
  o=out/$1
  start=$(date +%s)
  nvcc $FLAGS -gencode arch=compute_${3#sm_},code=$3 -I$(dirname $2) -o $o.cubin $2 > $o.ptxas.txt 2>&1
  echo "exit=$? seconds=$(( $(date +%s) - start ))" >> $o.ptxas.txt
  if [ -s $o.cubin ]; then cuobjdump -sass $o.cubin > $o.sass.txt 2>&1; rm -f $o.cubin; fi
  echo "$1 $(tail -1 $o.ptxas.txt)"
}
build tut_sgemm_sm80   $E/cute/tutorial/sgemm_sm80.cu sm_80
build tut_wgmma_sm90   $E/cute/tutorial/hopper/wgmma_sm90.cu sm_90a
build tut_wgmma_tma_sm90 $E/cute/tutorial/hopper/wgmma_tma_sm90.cu sm_90a
build tut_bw01_mma     $E/cute/tutorial/blackwell/01_mma_sm100.cu sm_100a
build tut_bw02_mma_tma $E/cute/tutorial/blackwell/02_mma_tma_sm100.cu sm_100a
build tut_bw04_2sm     $E/cute/tutorial/blackwell/04_mma_tma_2sm_sm100.cu sm_100a
build tut_bw05_epi     $E/cute/tutorial/blackwell/05_mma_tma_epi_sm100.cu sm_100a
build ex48_hopper_ws   $E/48_hopper_warp_specialized_gemm/48_hopper_warp_specialized_gemm.cu sm_90a
build ex70_bw_fp16     $E/70_blackwell_gemm/70_blackwell_fp16_gemm.cu sm_100a
build ex79a_geforce_nvfp4 $E/79_blackwell_geforce_gemm/79a_blackwell_geforce_nvfp4_bf16_gemm.cu sm_120a
echo alldone
