/*
 * Copyright (c) 2022-2023, NVIDIA CORPORATION. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *  * Neither the name of NVIDIA CORPORATION nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 
/* Sample CUDA application to analyze instruction mix in a CUDA kernel.
 * Applies a Sobel filter to a image in global memory
 * and generates an output image in global memory.
 *
 */
#include <stdio.h>
#include <stdlib.h>
#include <cuda_runtime_api.h>

#define DEFAULT_IMAGE_SIZE 512
#define BLOCK_SIZE         16
enum {
        SOBEL_DOUBLE = 1,
        SOBEL_FLOAT  = 2
     };

#define RUNTIME_API_CALL(apiFuncCall)                                                          \
   do                                                                                          \
   {                                                                                           \
       cudaError_t _status = apiFuncCall;                                                      \
       if (_status != cudaSuccess)                                                             \
       {                                                                                       \
           fprintf(stderr, "%s:%d: error: function %s failed with error %s.\n", __FILE__,      \
                   __LINE__, #apiFuncCall, cudaGetErrorString(_status));                       \
           exit(EXIT_FAILURE);                                                                 \
       }                                                                                       \
   } while (0)

#define PRINT_PROGRAM_USAGE()                                                                          \
   fprintf(stderr, "Usage: %s [kernel option] [<image width>] [<image height>]\n"                      \
                   "    Default kernel option: 1\n"                                                    \
                   "      Use 1 for double version of Sobel kernel\n"                                  \
                   "      Use 2 for float version of Sobel kernel\n"                                   \
                   "    Default image width:  %d\n"                                                    \
                   "    Default image height: equal to image width\n"                                  \
                   "    Image width and height should be greater than or equal to block size: %d and"  \
                   " must be an integral multiple of block size.\n",                                   \
           argv[0], DEFAULT_IMAGE_SIZE, BLOCK_SIZE)


__device__ unsigned char GetPixel(
   uchar4* pImg,
   int x,
   int y,
   int imgWidth,
   int imgHeight)
{
   if (x >= 0 && y >= 0 && x < imgWidth && y < imgHeight)
   {
       return pImg[y * imgWidth + x].x;
   }

   return 0;
}

// sobel edge detection kernel
template<typename FLOAT_T>
__global__ void Sobel(
    uchar4* pOut,
    uchar4* pImg,
    const int imgWidth,
    const int imgHeight)
{
   const int tx = blockIdx.x * blockDim.x + threadIdx.x;
   const int ty = blockIdx.y * blockDim.y + threadIdx.y;
   const int outIdx = ty * imgWidth + tx;

   const int SX[] = {1, 2, 1, 0, 0, 0, -1, -2, -1};
   const int SY[] = {1, 0, -1, 2, 0, -2, 1, 0, -1};

   FLOAT_T sumX = 0.;
   FLOAT_T sumY = 0.;
   for (int j = -1; j <= 1; ++j)
   {
       for (int i = -1; i <= 1; ++i)
       {
           const auto idx = (j + 1) * 3 + (i + 1);
           const auto sx = SX[idx];
           const auto sy = SY[idx];

           const auto luminance = GetPixel(pImg, tx + i, ty + j, imgWidth, imgHeight);
           sumX += (FLOAT_T)luminance * (FLOAT_T)sx;
           sumY += (FLOAT_T)luminance * (FLOAT_T)sy;
       }
   }

   sumX /= (FLOAT_T)9.;
   sumY /= (FLOAT_T)9.;

   const FLOAT_T threshold = 24.;
   if (sumX > threshold || sumY > threshold)
   {
       pOut[outIdx] = make_uchar4(0, 255, 255, 0);
   }
}

void initImage(uchar4 *pImg, int imgWidth, int imgHeight)
{
   for(int i =0; i < imgWidth*imgHeight; i++)
   {
         *pImg++ = make_uchar4(i%256, i%256, i%256, 255);
   }
}

int main(int argc, char** argv)
{
   int imgWidth = DEFAULT_IMAGE_SIZE;
   int imgHeight;
   uchar4 *pInputImage, *pSrcImage, *pDstImage;
   int kernelOption = SOBEL_DOUBLE;

   if (argc > 1)
   {
       kernelOption = atoi(argv[1]);
       if ((kernelOption != SOBEL_DOUBLE) && (kernelOption != SOBEL_FLOAT))
       {
           fprintf(stderr, "** Invalid kernel option: %s\n", argv[1]);
           PRINT_PROGRAM_USAGE();
           exit(EXIT_FAILURE);
       }
   }

   if (argc > 2)
   {
       imgWidth = atoi(argv[2]);
       if ((imgWidth <= 0) || (imgWidth%BLOCK_SIZE != 0))
       {
           fprintf(stderr, "** Invalid image width: %s\n", argv[2]);
           PRINT_PROGRAM_USAGE();
           exit(EXIT_FAILURE);
       }
   }

   imgHeight = imgWidth;
   if (argc > 3)
   {
       imgHeight = atoi(argv[3]);
       if ((imgHeight <= 0) || (imgHeight%BLOCK_SIZE != 0))
       {
           fprintf(stderr, "** Invalid image height: %s\n", argv[3]);
           PRINT_PROGRAM_USAGE();
           exit(EXIT_FAILURE);
       }
   }

   unsigned imgSize = sizeof(uchar4) * imgWidth * imgHeight;

   printf("Image width: %d, height: %d\n", imgWidth, imgHeight);

   pInputImage = (uchar4 *)malloc(imgSize);
   RUNTIME_API_CALL(cudaMalloc((void**)&pSrcImage, imgSize));
   RUNTIME_API_CALL(cudaMalloc((void**)&pDstImage, imgSize));

   initImage(pInputImage, imgWidth, imgHeight);
   RUNTIME_API_CALL(cudaMemcpy(pSrcImage, pInputImage, imgSize, cudaMemcpyHostToDevice));

   dim3 block(BLOCK_SIZE, BLOCK_SIZE, 1);
   dim3 grid(imgWidth / block.x, imgHeight / block.y, 1);

   printf("Block size: %d x %d\n", block.x, block.y);
   printf("Grid size: %d x %d\n", grid.x, grid.y);

   if (kernelOption == SOBEL_DOUBLE)
   {
       printf("Use double version of Sobel kernel\n");
       Sobel<double><<<grid, block>>>( pDstImage, pSrcImage, imgWidth, imgHeight);
   }
   else if (kernelOption == SOBEL_FLOAT)
   {
       printf("Use float version of Sobel kernel\n");
       Sobel<float><<<grid, block>>>( pDstImage, pSrcImage, imgWidth, imgHeight);
   }

   RUNTIME_API_CALL(cudaMemcpy(pInputImage, pDstImage, imgSize, cudaMemcpyDeviceToHost));

   // Cleanup
   free(pInputImage);
   RUNTIME_API_CALL(cudaFree(pSrcImage));
   RUNTIME_API_CALL(cudaFree(pDstImage));

   printf("Done\n");
   return 0;
}
