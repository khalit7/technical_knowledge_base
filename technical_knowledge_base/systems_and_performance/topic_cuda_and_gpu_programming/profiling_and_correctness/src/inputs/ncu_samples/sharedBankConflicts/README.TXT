== Sample CUDA application for shared memory bank conflicts ==
Transposes a N x N square matrix of float elements in
global memory and generates an output matrix in global memory.

Defines two versions of CUDA kernel:
transposeCoalesced       : Coalesced global memory transpose with shared memory bank conflicts
transposeNoBankConflicts : Coalesced global memory transpose with reduced shared memory bank conflicts

Compiling the code:
==================
  > nvcc -lineinfo -gencode arch=compute_75,code=sm_75 -gencode arch=compute_80,code=sm_80 -gencode arch=compute_86,code=sm_86 -gencode arch=compute_87,code=sm_87  -gencode arch=compute_89,code=sm_89 -gencode arch=compute_90,code=sm_90 -gencode arch=compute_100,code=sm_100 sharedBankConflicts.cu -o sharedBankConflicts

Command line arguments (all are optional):
==========================================
1) <version of kernel to use> Integer value, If not specified uses 1.
          1: Use transposeCoalesced() kernel
          2: Use transposeNoBankConflicts() kernel

2) <N - Matrix size> Matrix size should be greater than or equal to tile size (TILE_DIM - defined in source file "sharedBankConflicts.cu")
                         and must be an integral multiple of tile size. 
                     Default value: DEFAULT_MATRIX_SIZE (defined in source file "sharedBankConflicts.cu")

3) <cache config option> String value can be one of "none", "shared", "l1", "equal"
                         Default value: "none"
                         Refer the CUDA Runtime API cudaFuncSetCacheConfig() documentation for details of cache configuration.

Sample usage:
============
- Run with default arguments - transposeCoalesced() kernel and default value of N
  > ./sharedBankConflicts

- Run with the transposeNoBankConflicts() kernel and default value of N
  > ./sharedBankConflicts 2

 - Run with the transposeCoalesced() kernel and N=1024
  > ./sharedBankConflicts 1 1024

 - Run with the transposeNoBankConflicts() kernel with  N=1024 and cache config option "l1" (to prefer larger L1 cache and smaller shared memory)
  > ./sharedBankConflicts 2 1024 l1


Profiling the sample using Nsight Compute command line
======================================================
- Profile transposeCoalesced() - the  initial version of kernel
  > ncu --set full --import-source on  -o transposeCoalesced.ncu-rep ./sharedBankConflicts 1

- Profile transposeNoBankConflicts() - the  updated version of the kernel
  > ncu --set full --import-source on  -o transposeNoBankConflicts.ncu-rep ./sharedBankConflicts 2

The profiler report files for the sample are also provided and they can be opened in the 
Nsight Compute UI using the "File->Open" menu option.
