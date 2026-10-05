// NVIDIA's own occupancy calculator (cuda_occupancy.h, host-only header, no GPU needed).
// For each case in out/occ_cases.txt:
//   "name arch major minor maxWarps maxBlocks smemSM smemOptin numSms regs smemStatic maxThreads barriers"
// prints active blocks per SM for every block size 32..1024 (step 32) and the block size
// cudaOccMaxPotentialOccupancyBlockSize suggests, with its minimum grid. One JSON object per line.
#include <cuda_occupancy.h>
#include <cstdio>
int main() {
  FILE* f = fopen("out/occ_cases.txt", "r");
  if (!f) { fprintf(stderr, "no out/occ_cases.txt\n"); return 1; }
  char name[64], arch[16]; int maj, mnr, maxW, maxB, nsm, regs, maxT, bars; long smemSM, smemOpt, smemStatic;
  while (fscanf(f, "%63s %15s %d %d %d %d %ld %ld %d %d %ld %d %d", name, arch, &maj, &mnr, &maxW, &maxB,
                &smemSM, &smemOpt, &nsm, &regs, &smemStatic, &maxT, &bars) == 13) {
    cudaOccDeviceProp p;
    p.computeMajor = maj; p.computeMinor = mnr;
    p.maxThreadsPerBlock = 1024; p.maxThreadsPerMultiprocessor = maxW * 32;
    p.regsPerBlock = 65536; p.regsPerMultiprocessor = 65536; p.warpSize = 32;
    p.sharedMemPerBlock = 48 * 1024; p.sharedMemPerMultiprocessor = smemSM; p.numSms = nsm;
    p.sharedMemPerBlockOptin = smemOpt; p.reservedSharedMemPerBlock = 1024;
    cudaOccFuncAttributes a;
    a.maxThreadsPerBlock = maxT; a.numRegs = regs; a.sharedSizeBytes = smemStatic; a.numBlockBarriers = bars;
    cudaOccDeviceState s;
    printf("{\"name\":\"%s\",\"arch\":\"%s\",\"regs\":%d,\"smem\":%ld,\"maxT\":%d,\"bars\":%d,\"blocks\":[", name, arch, regs, smemStatic, maxT, bars);
    for (int b = 32; b <= 1024; b += 32) {
      cudaOccResult r;
      int act = 0;
      if (b <= maxT && cudaOccMaxActiveBlocksPerMultiprocessor(&r, &p, &a, &s, b, 0) == CUDA_OCC_SUCCESS)
        act = r.activeBlocksPerMultiprocessor;
      printf("%s%d", b == 32 ? "" : ",", act);
    }
    int minGrid = 0, bs = 0;
    cudaOccError e = cudaOccMaxPotentialOccupancyBlockSize(&minGrid, &bs, &p, &a, &s, 0);
    printf("],\"suggest\":{\"err\":%d,\"block\":%d,\"minGrid\":%d}}\n", (int)e, bs, minGrid);
  }
  return 0;
}
