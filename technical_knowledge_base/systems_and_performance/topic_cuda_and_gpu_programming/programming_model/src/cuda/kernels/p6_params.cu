// Kernel arguments travel with the launch. How big may they be?
// CUDA 12.1 raised the limit from 4,096 bytes to 32,764 bytes (Volta and later). The pointer
// argument comes first and takes 8 bytes, so ARGBYTES = 32756 fills the space exactly and 32760 overflows it.
template <int N> struct Blob { char b[N]; };
#ifndef ARGBYTES
#define ARGBYTES 32764
#endif
extern "C" __global__ void take_blob(char* out, Blob<ARGBYTES> blob) {
  out[threadIdx.x] = blob.b[threadIdx.x];
}
