// The same block reduction and an inclusive block scan through CUB (part of CCCL, shipped with the toolkit):
// what production code calls instead of the ladder. 256 threads, 4 items per thread.
#include <cub/block/block_reduce.cuh>
#include <cub/block/block_scan.cuh>
#include <cub/block/block_load.cuh>
#include <cub/block/block_store.cuh>
extern "C" __global__ void cub_block_sum(const float* x, float* part) {
  using BR = cub::BlockReduce<float, 256>;
  __shared__ typename BR::TempStorage tmp;
  float v[4]; cub::LoadDirectStriped<256>(threadIdx.x, x + blockIdx.x * 1024, v);
  float s = BR(tmp).Sum(v);
  if (threadIdx.x == 0) part[blockIdx.x] = s;
}
extern "C" __global__ void cub_block_scan(const float* x, float* y) {
  using BS = cub::BlockScan<float, 256>;
  __shared__ typename BS::TempStorage tmp;
  float v[4]; cub::LoadDirectBlocked(threadIdx.x, x + blockIdx.x * 1024, v);
  BS(tmp).InclusiveSum(v, v);
  cub::StoreDirectBlocked(threadIdx.x, y + blockIdx.x * 1024, v);
}
