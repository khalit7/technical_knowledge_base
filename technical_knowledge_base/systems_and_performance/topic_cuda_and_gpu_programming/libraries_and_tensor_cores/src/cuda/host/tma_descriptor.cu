// Building a TMA descriptor (CUtensorMap) on the host: a 64 x 64 BF16 box of a row-major
// 8192 x 4096 matrix, landing in shared memory with the 128-byte swizzle. The descriptor is a
// 128-byte opaque object passed to the kernel as a __grid_constant__ parameter.
// cuTensorMapEncodeTiled is a driver API call: compiled here, the run reports what happens without a driver.
#include <cstdio>
#include <cuda.h>
int main() {
  printf("sizeof(CUtensorMap) = %zu bytes, alignment %zu\n", sizeof(CUtensorMap), alignof(CUtensorMap));
  CUresult r = cuInit(0);
  const char* s = nullptr; cuGetErrorName(r, &s);
  printf("cuInit -> %d (%s)\n", (int)r, s ? s : "no name: driver library not loaded");
  CUtensorMap map;
  static char buf[16];                                  // stand-in address (16-byte aligned); no device memory here
  cuuint64_t dims[2] = {4096, 8192};                    // innermost first: columns, then rows
  cuuint64_t strides[1] = {4096 * 2};                   // bytes between rows (dimension 0 stride is implicit)
  cuuint32_t box[2] = {64, 64};                         // 64 BF16 = 128 bytes per row of the box
  cuuint32_t estr[2] = {1, 1};
  r = cuTensorMapEncodeTiled(&map, CU_TENSOR_MAP_DATA_TYPE_BFLOAT16, 2, buf, dims, strides, box, estr,
                             CU_TENSOR_MAP_INTERLEAVE_NONE, CU_TENSOR_MAP_SWIZZLE_128B,
                             CU_TENSOR_MAP_L2_PROMOTION_L2_128B, CU_TENSOR_MAP_FLOAT_OOB_FILL_NONE);
  s = nullptr; cuGetErrorName(r, &s);
  printf("cuTensorMapEncodeTiled -> %d (%s)\n", (int)r, s ? s : "?");
  return 0;
}
