// Thread block clusters (compute capability 9.0 and later): blocks of one cluster
// run at the same time on neighbouring SMs and can read each other's shared memory.
#include <cooperative_groups.h>
namespace cg = cooperative_groups;
extern "C" __global__ void __cluster_dims__(2, 1, 1) cluster_exchange(const float* x, float* y) {
  __shared__ float s[128];
  cg::cluster_group cluster = cg::this_cluster();
  unsigned me = cluster.block_rank(), other = me ^ 1u;
  s[threadIdx.x] = x[blockIdx.x * 128 + threadIdx.x];
  cluster.sync();                                   // both blocks have filled s
  float* peer = cluster.map_shared_rank(s, other);  // a pointer into the other block's shared memory
  y[blockIdx.x * 128 + threadIdx.x] = s[threadIdx.x] + peer[127 - threadIdx.x];
  cluster.sync();                                   // keep s alive until the peer has read it
}
