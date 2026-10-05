DeepEP README.md @ 93eb6eb2 (2026-09-30), https://github.com/deepseek-ai/DeepEP, fetched 2026-10-05
DeepEP (DeepEveryParallel) is a high-performance communication library for machine learning training and inference. It provides high-throughput and low-latency expert-parallel (EP) all-to-all GPU kernels for MoE dispatch and combine, including FP8 dispatch, and NVLink weight and gradient exchange for redundant experts. It also offers experimental primitives for pipeline parallelism (PP), context parallelism (CP), data parallelism (DP), and remote memory access (Engram). Communication kernels are compiled at runtime via [DeepJIT](https://github.com/deepseek-ai/DeepJIT), with the supporting extension built during installation.

- **V2.5 release**:
  - Split `ElasticBuffer` into `EPBuffer`, `EngramBuffer`, `PPBuffer`, and `BucketBuffer`, sharing the `BufferBase` lifecycle
  - Add `BufferAllocator` for planning symmetric tensor allocations before buffer construction
  - Add batched all-gather, reduce-scatter, and all-reduce through `BucketBuffer`, with sessions for ordinary PyTorch tensors
  - Add `EPBuffer.lb_prefetch_weights` and `EPBuffer.lb_reduce_grads` for dynamic redundant experts: prefetch expert weights and quantization scales over NVLink before expert computation, then accumulate redundant experts' FP32 gradients into the original experts during backward. These primitives support the expert-replication approach explored by [MoonEP](https://github.com/MoonshotAI/MoonEP) and [UltraEP](https://github.com/Dots-Infra/UltraEP); see [Expert load balancing](#expert-load-balancing) for the API and integration requirements
  - Support deferred EP epilogues, cached expanded layouts, and zero padding between experts
  - Support multi-layer Engram storage on GPU or CPU, with one wait hook per layer
  - Fully remove V1, including its APIs, NVSHMEM backend, and legacy documentation. NVSHMEM is no longer a dependency

- **V2 release**: A complete refactoring of expert parallelism, with support for larger scale-up and scale-out domains and the lightweight **NCCL Gin backend**.
- EP dispatch and combine require GPU SMs; zero-SM RDMA EP is not supported
