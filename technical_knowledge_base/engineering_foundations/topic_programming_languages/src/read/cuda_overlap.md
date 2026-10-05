# Overlap with Topic: cuda-and-gpu-programming

Compared on 2026-10-05 against the Notion page `3c65c17b0d0d81c39f34d5e070d783c1` (fetched read only, saved verbatim in `old/related_topic_cuda_and_gpu_programming.md`, last edited 2026-09-23) and against the old programming-languages pages in `old/`.

## What the CUDA topic owns (do not teach here; link)

- The CUDA platform: driver and runtime APIs, nvcc, PTX and SASS, NVRTC.
- The SIMT programming model: threads, warps, blocks, grids, occupancy, divergence, streams (child "The CUDA programming model").
- The GPU memory hierarchy: registers, shared memory, L2, HBM, coalescing, bank conflicts, tiling, roofline (child "GPU memory hierarchy").
- Writing kernels: matmul, reductions, softmax, fusion, FlashAttention, megakernels.
- CUDA C++ language extensions: `__global__`, `__shared__`, `<<<grid, block>>>`, intrinsics; CUTLASS/CuTe templates, cuBLAS, cuDNN, Thrust/CUB/CCCL, NCCL.
- Triton, Gluon, torch.compile's codegen, CuTe DSL; profiling (Nsight Systems/Compute, CUPTI).
- GPU kernels in Rust (`cutile-rs`, `cuda-oxide`, CubeCL): the CUDA topic already has a full section; this page only mentions in one sentence (section 1) that Rust can now write NVIDIA kernels and links there.
- ROCm and other accelerators.

## What this page owns (the language, the CPU, the build)

- C++ as a language: value semantics, copies against references, RAII, smart pointers, templates and concepts, exceptions and `std::expected`, undefined behaviour, the C++ memory model and data races on CPU threads (sections 4 to 10).
- The CPU machine model needed to read any C++: addresses, pointers, stack and heap, alignment and padding, cache lines, contiguous against pointer-based layouts, SIMD on the CPU (section 2's vectorised loop, section 14's NEON kernels in ggml-cpu).
- The build: compilers, flags (`-std=`, `-O2`), sanitizers, CMake as a concept (detail in the Toolchain atlas tab).
- Interop: calling C++ from Python (pybind11, nanobind), the C ABI (`extern "C"`).
- Reading llama.cpp's C and C++ (struct layout, mmap, pthreads, RAII, CMake backend options): the language side only.

## Boundary cases and how the page handles them

| Topic | Decision | Where it shows |
|---|---|---|
| Cache lines and memory layout | CPU caches here (section 5); GPU coalescing and shared memory there | Section 5 "Go deeper" links the CUDA topic for the GPU memory hierarchy |
| SIMD | CPU SIMD (NEON, AVX) here as "what compilers and ggml-cpu do"; GPU SIMT there | Sections 2 and 14 |
| Threads and races | CPU threads, data races, atomics here; thousands of GPU threads per kernel there | Section 9 "Go deeper" |
| llama.cpp | Its C/C++ (structs, mmap, threads, CMake options) here; its CUDA backend (`ggml/src/ggml-cuda`, 46,885 lines of .cu/.cuh at the pinned commit) and what the kernels compute belong to the CUDA topic and Topic: inference-and-serving | Sections 1, 5, 14 |
| Templates | Language feature here; CUTLASS/CuTe as a template workout there | Section 8; learning path step 3f says "read, rarely written" |
| Rust on GPUs | One sentence here, the content there | Section 1 |
| CUDA C++ | "C++ with extensions": the C++ path ends where CUDA starts | Section 14 choosing table and learning path step 3 |
| Quantised blocks (`block_q4_0`) | The struct layout here; the quantisation maths on the training topic's Quantization and Precision page | Section 5 llama.cpp box |
| `std::execution` (C++26) targeting GPUs (stdexec) | Not taught; a children topic at most | not on page |

## Material from the old pages that moves to the CUDA topic or to children

- Old "C++: modern practice": "Kernels: CUDA C++, CUTLASS 3.x/4.x (CuTe layouts...)", "Practical skill: write a custom op (C++/CUDA), bind with nanobind" -> the CUDA topic owns kernels; custom-op binding is a C++ child item.
- Old Rust page "GPU kernels in Rust" paragraph -> already duplicated on the CUDA topic; dropped here except one sentence.
- Old root's Rust bullet about cutile-rs/cuda-oxide and Hacker News points -> dropped (the CUDA topic carries it).
