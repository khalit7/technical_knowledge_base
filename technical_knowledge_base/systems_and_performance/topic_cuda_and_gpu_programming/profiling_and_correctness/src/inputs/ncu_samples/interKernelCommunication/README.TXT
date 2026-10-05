== Sample CUDA application for inter kernel communication ==
This sample implements the following producer-consumer algorithm :
Producer : Produces grayscale pixels from RGB pixels into the buffer
Consumer : Consumes grayscale pixels from the buffer and scales them up by 2
To simplify this illustration, it's assumed that the buffer can only have one pixel at a time.
Since the producer will not proceed further until the consumer has read the previously produced pixel
and the consumer will wait for the producer to produce at least one grayscale pixel,
both producer and consumer kernels will depend on each other and must be launched concurrently.
NOTE: This pattern is often encountered with NCCL and NVSHMEM kernels.
Understanding how to profile this sample can help resolve potential profiling issues with such kernels.
Compiling the code:
==================
nvcc -lineinfo -gencode arch=compute_75,code=sm_75 -gencode arch=compute_80,code=sm_80 -gencode arch=compute_86,code=sm_86 -gencode arch=compute_87,code=sm_87  -gencode arch=compute_89,code=sm_89 -gencode arch=compute_90,code=sm_90 -gencode arch=compute_90,code=sm_90 -gencode arch=compute_100,code=sm_100 interKernelCommunication.cu -o interKernelCommunication
Command line arguments (all are optional):
==========================================
1) <range option> Specify the API to define range around the concurrent kernel launches
                    1 : Run without range
                    2 : Run with CUDA Profiler range
                    3 : Run with NVTX range
                  Default value: 1
2) <pixels count> Specify the number of RGB pixels to convert. It should be greater than or equal to block size (BLOCK_SIZE - defined in source file "interKernelCommunication.cu")
                    and must be an integral multiple of block size.
                  Default value: 1024
3) <max buffer size> Specify the maximum size of buffer queues used to process the pixels. It should be greater than zero.
                  Default value: 4
Profiling the sample using Nsight Compute command line
======================================================
- Profile the concurrent kernel launches with no defined range
  > ncu ./interKernelCommunication 1
  Expected result: This will hang because the kernel launches are serialized and cannot run concurrently
- Profile the concurrent kernel launches with no defined range in range replay-mode
  > ncu --replay-mode range ./interKernelCommunication 1
  Expected result: This will not hang but profiling result will not be generated because no ranges are
  defined for range-profiling mode
- Profile the concurrent kernel launches with CUDA Profiler Start/Stop range in range replay-mode
  > ncu --replay-mode range ./interKernelCommunication 2
  Expected result: This will not hang and profiling result will be generated for the defined range
- Profile the concurrent kernel launches with NVTX range named "nvtx-range" in range replay-mode
  > ncu --replay-mode range --nvtx --nvtx-include "concurrent-kernel-range/" ./interKernelCommunication 3
  Expected result: This will not hang and profiling result will be generated for the defined nvtx-range
- Profile the concurrent kernel launches with NVTX range named "nvtx-range" in app-range replay-mode
  > ncu --replay-mode app-range --nvtx --nvtx-include "concurrent-kernel-range/" ./interKernelCommunication 3
  Expected result: This will not hang and profiling result will be generated for the defined nvtx-range
  This will profile the range without API capture by relaunching the entire application multiple times.
  In each application run, a subset of the metrics is collected per defined range and the profiling data
  is combined after all repetitions. Since the application handles all states implicitly in this mode,
  no memory must be saved or restored by the tool, and there are no restrictions on which APIs can be
  called within the range by the application. Note though that ranges must match between the runs so that
  the tool can combine the data from the respective passes correctly. The "--replay-mode app-range"
  must be used if there exists API calls in the range that aren't supported in normal range replay mode.
  It must also be used if there are CPU/GPU interactions that are not done via memcpy/memset APIs but
  which occur during a kernel's execution, and the execution relies on it.
See https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#application-range-replay for more details.
Note that the set of available metrics for the "range" workload type is a subset of those available
for the "kernel" workload type.
Refer to this section in the Nsight Compute Profiling Guide
https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html#metrics-compatibility