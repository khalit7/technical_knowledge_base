== Sample CUDA application for instruction mix ==
Applies a Sobel filter to a image in global memory
and generates an output image in global memory.

Compiling the code:
==================
nvcc -lineinfo -gencode arch=compute_75,code=sm_75 -gencode arch=compute_80,code=sm_80 -gencode arch=compute_86,code=sm_86 -gencode arch=compute_87,code=sm_87  -gencode arch=compute_89,code=sm_89 -gencode arch=compute_90,code=sm_90 -gencode arch=compute_100,code=sm_100 instructionMix.cu -o instructionMix

Command line arguments (all are optional):
==========================================
1) <kernel option> Version of Sobel filter kernel to use
                     1 : double version of kernel
                     2 : float version of kernel
                   Default value: 1
2) <Image width> Image width should be greater than or equal to block size (BLOCK_SIZE - defined in source file "instructionMix.cu")
                         and must be an integral multiple of block size. 
                     Default value: DEFAULT_IMAGE_SIZE (defined in source file "instructionMix.cu")

3) <Image height> Image height should be greater than or equal to block size (BLOCK_SIZE - defined in source file "instructionMix.cu")
                         and must be an integral multiple of block size. 
                     Default value: Equal to image width

Sample usage:
============
- Use double precision floating point version of Sobel filter kernel with default image size
  > ./instructionMix

- Use single precision floating point version of Sobel filter kernel with default image size
  > ./instructionMix 2

- Use double precision floating point version of Sobel filter kernel with image size 1024 x 1024
  > ./instructionMix 1 1024

- Use double precision floating point version of Sobel filter kernel with image size 1024 x 256
  > ./instructionMix 1 1024 256


Profiling the sample using Nsight Compute command line
======================================================
- Profile the double precision floating point version of Sobel filter kernel
  > ncu --set full --import-source on  -o sobelDouble.ncu-rep ./instructionMix 1

- Profile the single precision floating point version of Sobel filter kernel
  > ncu --set full --import-source on  -o sobelFloat.ncu-rep ./instructionMix 2

The profiler report files for the sample are also provided and they can be opened in the 
Nsight Compute UI using the "File->Open" menu option.
