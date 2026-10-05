// Evaluate NVIDIA's own occupancy calculator (cuda_occupancy.h, host-only, no GPU needed)
// for every case in occ/cases.txt: "arch major minor maxWarps smemSM smemBlockOptin regs smemStatic block barriers".
// Prints one JSON object per line.
#include <cuda_occupancy.h>
#include <cstdio>
#include <cstring>
int main() {
  FILE* f = fopen("occ/cases.txt", "r");
  if (!f) { fprintf(stderr, "no occ/cases.txt\n"); return 1; }
  char arch[32]; int maj, mnr, maxW, regs, block, bars; long smemSM, smemOpt, smemStatic;
  while (fscanf(f, "%31s %d %d %d %ld %ld %d %ld %d %d", arch, &maj, &mnr, &maxW, &smemSM, &smemOpt,
                &regs, &smemStatic, &block, &bars) == 10) {
    cudaOccDeviceProp p;
    p.computeMajor = maj; p.computeMinor = mnr;
    p.maxThreadsPerBlock = 1024; p.maxThreadsPerMultiprocessor = maxW * 32;
    p.regsPerBlock = 65536; p.regsPerMultiprocessor = 65536; p.warpSize = 32;
    p.sharedMemPerBlock = 48 * 1024; p.sharedMemPerMultiprocessor = smemSM; p.numSms = 1;
    p.sharedMemPerBlockOptin = smemOpt; p.reservedSharedMemPerBlock = 1024;
    cudaOccFuncAttributes a;
    a.maxThreadsPerBlock = 1024; a.numRegs = regs; a.sharedSizeBytes = smemStatic;
    a.numBlockBarriers = bars;
    cudaOccDeviceState s;
    cudaOccResult r;
    cudaOccError e = cudaOccMaxActiveBlocksPerMultiprocessor(&r, &p, &a, &s, block, 0);
    printf("{\"arch\":\"%s\",\"regs\":%d,\"smem\":%ld,\"block\":%d,\"bars\":%d,\"err\":%d,\"blocks\":%d,"
           "\"limRegs\":%d,\"limSmem\":%d,\"limWarps\":%d,\"limBlocks\":%d,\"factors\":%u}\n",
           arch, regs, smemStatic, block, bars, (int)e, r.activeBlocksPerMultiprocessor,
           r.blockLimitRegs, r.blockLimitSharedMem, r.blockLimitWarps, r.blockLimitBlocks, r.limitingFactors);
  }
  return 0;
}
