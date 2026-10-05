#!/bin/sh
# Runs inside kb-gpu-lab:1 (CUDA 13.4.2, Nsight Compute 2026.3.1, compute-sanitizer; no GPU).
# Mount: -v <page src>:/work. Writes out/ncu/ and inputs/ncu_sections/.
set -u
O=/work/out/ncu; mkdir -p $O /work/inputs/ncu_sections /work/inputs/ncu_samples
D=$(ls -d /opt/nvidia/nsight-compute/*); S=$D/extras/samples
ncu --version > $O/ncu_version.txt 2>&1
ncu --help > $O/ncu_help.txt 2>&1
ncu --list-sets > $O/list_sets.txt 2>&1
ncu --list-sections > $O/list_sections.txt 2>&1
ncu --list-rules > $O/list_rules.txt 2>&1
# full metric lists are ~1 MB each: kept out of the repo; only the checked names are recorded (code/check_metric_names.sh)
ncu --query-metrics-mode suffix --metrics dram__throughput,sm__throughput --chip gh100 > $O/query_suffix_gh100.txt 2>&1
for f in $S/*/*.ncu-rep; do b=$(basename $f .ncu-rep)
  ncu --import $f --page session > $O/$b.session.txt 2>&1
  ncu --import $f --page details --print-details all > $O/$b.details.txt 2>&1
  ncu --import $f --page raw --csv > $O/$b.raw.csv 2>&1
  ncu --import $f --page source --csv --print-source sass > $O/$b.source_sass.csv 2>&1
done
for s in SpeedOfLight MemoryWorkloadAnalysis MemoryWorkloadAnalysis_Tables WarpStateStatistics Occupancy LaunchStatistics SourceCounters SchedulerStatistics ComputeWorkloadAnalysis InstructionStatistics; do cp $D/sections/$s.section /work/inputs/ncu_sections/; done
for d in $S/*; do n=$(basename $d); mkdir -p /work/inputs/ncu_samples/$n; cp $d/*.cu $d/README.TXT /work/inputs/ncu_samples/$n/; done
compute-sanitizer --version > $O/sanitizer_version.txt 2>&1
compute-sanitizer --help > $O/sanitizer_help.txt 2>&1
# Try to profile and sanitize a real program with no GPU: record what the tools say.
cat > /tmp/add.cu <<'CU'
#include <cstdio>
__global__ void add(float* x, int n){int i=blockIdx.x*blockDim.x+threadIdx.x; if(i<=n) x[i]+=1.f;}
int main(){float* x; cudaError_t e=cudaMalloc(&x,1024*sizeof(float)); printf("cudaMalloc: %s\n", cudaGetErrorString(e));
add<<<4,256>>>(x,1024); printf("sync: %s\n", cudaGetErrorString(cudaDeviceSynchronize())); return 0;}
CU
cd /tmp && nvcc -O2 -lineinfo -arch=sm_90a add.cu -o add > $O/nogpu_build.txt 2>&1
ncu ./add > $O/nogpu_ncu.txt 2>&1; echo "exit $?" >> $O/nogpu_ncu.txt
compute-sanitizer --tool memcheck ./add > $O/nogpu_sanitizer.txt 2>&1; echo "exit $?" >> $O/nogpu_sanitizer.txt
echo done > $O/DONE
