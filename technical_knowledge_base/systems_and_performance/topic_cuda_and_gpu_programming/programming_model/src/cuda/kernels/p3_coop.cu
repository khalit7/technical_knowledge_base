// Cooperative groups: a tile of 32 threads as an object, and a grid-wide barrier.
#include <cooperative_groups.h>
#include <cooperative_groups/reduce.h>
namespace cg = cooperative_groups;
extern "C" __global__ void cg_tile_sum(const float* x, float* out) {
  cg::thread_block block = cg::this_thread_block();
  cg::thread_block_tile<32> tile = cg::tiled_partition<32>(block);
  float v = x[block.group_index().x * block.size() + block.thread_rank()];
  v = cg::reduce(tile, v, cg::plus<float>());        // the shuffle loop, written for you
  if (tile.thread_rank() == 0) atomicAdd(out, v);
}
// Two phases separated by a grid-wide barrier; needs cudaLaunchCooperativeKernel and
// a grid no larger than what fits on the GPU at once.
extern "C" __global__ void two_phase(float* x, float* partial, int n) {
  cg::grid_group grid = cg::this_grid();
  float v = 0.f;
  for (int i = grid.thread_rank(); i < n; i += grid.size()) v += x[i];
  v = cg::reduce(cg::tiled_partition<32>(cg::this_thread_block()), v, cg::plus<float>());
  if ((threadIdx.x & 31) == 0) atomicAdd(&partial[0], v);
  grid.sync();                                      // every block has added before anyone reads
  float total = partial[0];
  for (int i = grid.thread_rank(); i < n; i += grid.size()) x[i] /= total;
}
