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

/* Sample CUDA application to analyze profiling behavior of mandatory concurrent CUDA kernels.
 * This sample implements the following producer-consumer algorithm :
 *
 * Producer : Produces grayscale pixels from RGB pixels into the buffer
 * Consumer : Consumes grayscale pixels from the buffer and scales them up by 2
 *
 * To simplify this illustration, it's assumed that the buffer can only have one pixel at a time.
 * Since the producer will not proceed further until the consumer does not read the previously produced pixel
 * and the consumer will wait for the producer to produce at least one grayscale pixel,
 * both producer and consumer kernels will depend on each other and must be launched concurrently.
 *
 * NOTE: This pattern can be often encountered for NCCL and NVSHMEM kernels and
 * understanding how to profile this sample would make it easy for one to resolve potential profiling issues with such kernels.
 */

#include <cuda_profiler_api.h>
#include <cuda_runtime_api.h>
#include <nvtx3/nvToolsExt.h>

#include <algorithm>
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

#define DEFAULT_PIXELS_COUNT 1024
#define BLOCK_SIZE           64
#define MAX_BUFFER_SIZE      4
#define QUEUE_EMPTY         -1
#define NUM_RGB_CHANNELS     3
#define SCALE_FACTOR         2
#define MAX_PIXEL            255

enum {
        NO_RANGE             = 1,
        CUDA_PROFILER_RANGE  = 2,
        NVTX_RANGE           = 3
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

#define PRINT_PROGRAM_USAGE()                                                                  \
   fprintf(stderr, "Usage: %s [<range option>] [<pixels count>] [<max buffer size>]\n"         \
                   "    Default range option: 1\n"                                             \
                   "      Use 1 to run without range\n"                                        \
                   "      Use 2 to run with CUDA Profiler range\n"                             \
                   "      Use 3 to run with NVTX range\n"                                      \
                   "    Default pixels count:    %d\n"                                         \
                   "      Pixels count should be greater than or equal to block size: %d and"  \
                   " must be an integral multiple of block size.\n"                            \
                   "    Default max buffer size: %d\n"                                         \
                   "      Max buffer size should be greater than zero.\n",                     \
           argv[0], DEFAULT_PIXELS_COUNT, BLOCK_SIZE, MAX_BUFFER_SIZE)                         \


#define START_RANGE(X)                                                                         \
    printf("Range option: ");                                                                  \
    switch (X)                                                                                 \
    {                                                                                          \
        case NO_RANGE:                                                                         \
        {                                                                                      \
            printf("NO_RANGE\n");                                                              \
            break;                                                                             \
        }                                                                                      \
        case CUDA_PROFILER_RANGE:                                                              \
        {                                                                                      \
            printf("CUDA_PROFILER_RANGE\n");                                                   \
            cudaProfilerStart();                                                               \
            break;                                                                             \
        }                                                                                      \
        case NVTX_RANGE:                                                                       \
        {                                                                                      \
            printf("NVTX_RANGE\n");                                                            \
            nvtxRangePushA("concurrent-kernel-range");                                         \
            break;                                                                             \
        }                                                                                      \
    }                                                                                          \

#define END_RANGE(X)                                                                           \
    switch (X)                                                                                 \
    {                                                                                          \
        case NO_RANGE            : break;                                                      \
        case CUDA_PROFILER_RANGE : cudaProfilerStop(); break;                                  \
        case NVTX_RANGE          : nvtxRangePop(); break;                                      \
    }                                                                                          \

__global__ void
Producer(int* inputPixels, volatile int* pixelsQueue, int inputSize)
{
    if (!inputPixels || !pixelsQueue || !inputSize) return;

    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    int stride = gridDim.x * blockDim.x * NUM_RGB_CHANNELS;

    int i = idx * NUM_RGB_CHANNELS;
    while (inputSize)
    {
        while (pixelsQueue[idx] != QUEUE_EMPTY)
        {
            // wait if buffer queue is not empty
        }

        // produce one grayscale pixel
        pixelsQueue[idx] = (inputPixels[i] + inputPixels[i + 1] + inputPixels[i + 2]) / NUM_RGB_CHANNELS;
        __threadfence();

        i += stride;
        --inputSize;
    }
}

__global__ void
Consumer(int* outputPixels, volatile int* pixelsQueue, int outputSize)
{
    if (!outputPixels || !pixelsQueue || !outputSize) return;

    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    int stride = gridDim.x * blockDim.x;

    int i = idx;
    while (outputSize)
    {
        while (pixelsQueue[idx] == QUEUE_EMPTY)
        {
            // wait if buffer queue is empty
        }

        int scaledPixel = pixelsQueue[idx] * SCALE_FACTOR;
        pixelsQueue[idx] = QUEUE_EMPTY;
        __threadfence();

        scaledPixel = scaledPixel > MAX_PIXEL ? MAX_PIXEL : scaledPixel;
        outputPixels[i] = scaledPixel;

        i += stride;
        --outputSize;
    }
}

void ExecuteProgram(int rangeOption, int pixelsCount, int maxBufferSize)
{
    cudaStream_t streamA, streamB;
    RUNTIME_API_CALL(cudaStreamCreate(&streamA));
    RUNTIME_API_CALL(cudaStreamCreate(&streamB));

    int blockSize = BLOCK_SIZE;
    int numPixelsPerBlock = pixelsCount / blockSize;
    int bufferSize = std::min(numPixelsPerBlock, maxBufferSize);
    while (numPixelsPerBlock % bufferSize != 0)
    {
        // numPixelsPerBlock should be a multiple of bufferSize
        --bufferSize;
    }
    int gridSize = numPixelsPerBlock / bufferSize;
    printf("Grid size: %d, Block size: %d, Buffer size: %d\n", gridSize, blockSize, bufferSize);

    int numPixelsQueue = gridSize * blockSize;                                               // number of buffers needed
    int* hInputPixels = (int*)malloc(pixelsCount * NUM_RGB_CHANNELS * sizeof(int));          // RGB input
    int* hOutputPixels = (int*)malloc(pixelsCount * sizeof(int));                            // Grayscale output
    int* hPixelsQueue = (int*)malloc(numPixelsQueue * sizeof(int));                          // Buffers

    // Init an arbitrary RGB pixels array
    for (int i = 0, *p = hInputPixels; i < pixelsCount; ++i)
    {
        for (int j = 0; j < NUM_RGB_CHANNELS; ++j)
        {
            *p++ = (i * (j + 1)) % (MAX_PIXEL + 1);
        }
    }

    // Mark each pixel buffer as empty
    for (int i = 0; i < numPixelsQueue ; ++i)
    {
        hPixelsQueue[i] = QUEUE_EMPTY;
    }

    // warmup both kernels to ensure concurrency
    Producer<<<gridSize, blockSize, 0, streamA>>>(nullptr, nullptr, 0);
    Consumer<<<gridSize, blockSize, 0, streamB>>>(nullptr, nullptr, 0);

    RUNTIME_API_CALL(cudaStreamSynchronize(streamA));
    RUNTIME_API_CALL(cudaStreamSynchronize(streamB));

    // Init device memory
    int* dInputPixels = nullptr;
    int* dOutputPixels = nullptr;
    int* dPixelsQueue = nullptr;

    RUNTIME_API_CALL(cudaMalloc((void**)&dInputPixels, pixelsCount * NUM_RGB_CHANNELS * sizeof(int)));
    RUNTIME_API_CALL(cudaMalloc((void**)&dOutputPixels, pixelsCount * sizeof(int)));
    RUNTIME_API_CALL(cudaMalloc((void**)&dPixelsQueue, numPixelsQueue  * sizeof(int)));

    RUNTIME_API_CALL(cudaMemcpy(dInputPixels, hInputPixels, pixelsCount * NUM_RGB_CHANNELS * sizeof(int), cudaMemcpyHostToDevice));
    RUNTIME_API_CALL(cudaMemcpy(dPixelsQueue, hPixelsQueue, numPixelsQueue  * sizeof(int), cudaMemcpyHostToDevice));

    // Start a range based on the user-specified option
    START_RANGE(rangeOption);

    Producer<<<gridSize, blockSize, 0, streamA>>>(dInputPixels, dPixelsQueue, bufferSize);
    Consumer<<<gridSize, blockSize, 0, streamB>>>(dOutputPixels, dPixelsQueue, bufferSize);

    // End the range
    END_RANGE(rangeOption);

    RUNTIME_API_CALL(cudaStreamSynchronize(streamA));
    RUNTIME_API_CALL(cudaStreamSynchronize(streamB));
    RUNTIME_API_CALL(cudaMemcpy(hOutputPixels, dOutputPixels, pixelsCount * sizeof(int), cudaMemcpyDeviceToHost));

    // Test output correctness on host side
    for (int i = 0, *p = hInputPixels; i < pixelsCount; ++i)
    {
        int expectedPixel = 0;
        for (int j = 0; j < NUM_RGB_CHANNELS; ++j)
        {
            expectedPixel += *p++;
        }
        expectedPixel /= NUM_RGB_CHANNELS;
        expectedPixel *= SCALE_FACTOR;
        expectedPixel = std::min(expectedPixel, MAX_PIXEL);

        assert(expectedPixel == hOutputPixels[i]);
    }

    RUNTIME_API_CALL(cudaFree(dInputPixels));
    RUNTIME_API_CALL(cudaFree(dOutputPixels));
    RUNTIME_API_CALL(cudaFree(dPixelsQueue));
    free(hInputPixels);
    free(hOutputPixels);
    free(hPixelsQueue);
    RUNTIME_API_CALL(cudaStreamDestroy(streamA));
    RUNTIME_API_CALL(cudaStreamDestroy(streamB));
}

int main(int argc, char** argv)
{
    int rangeOption = NO_RANGE;
    int pixelsCount = DEFAULT_PIXELS_COUNT;
    int maxBufferSize = MAX_BUFFER_SIZE;

    if (argc > 1)
    {
        rangeOption = atoi(argv[1]);
        if ((rangeOption < NO_RANGE) || (rangeOption > NVTX_RANGE))
        {
            fprintf(stderr, "** Invalid range option: %s\n", argv[1]);
            PRINT_PROGRAM_USAGE();
            exit(EXIT_FAILURE);
        }
    }

    if (argc > 2)
    {
        pixelsCount = atoi(argv[2]);
        if ((pixelsCount <= 0) || (pixelsCount % BLOCK_SIZE != 0))
        {
            fprintf(stderr, "** Invalid pixels count: %s\n", argv[2]);
            PRINT_PROGRAM_USAGE();
            exit(EXIT_FAILURE);
        }
    }

    if (argc > 3)
    {
        maxBufferSize = atoi(argv[3]);
        if (maxBufferSize <= 0)
        {
            fprintf(stderr, "** Invalid max buffer size: %s\n", argv[3]);
            PRINT_PROGRAM_USAGE();
            exit(EXIT_FAILURE);
        }
    }

    printf("Pixels count: %d, Max buffer size: %d\n", pixelsCount, maxBufferSize);
    ExecuteProgram(rangeOption, pixelsCount, maxBufferSize);

    return 0;
}