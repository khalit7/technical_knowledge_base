# Writing kernels: reductions, softmax, tiled matmul, fusion, FlashAttention

Notion: https://app.notion.com/p/3c65c17b0d0d81b9ab89c1bb7238cb6c (child of Topic: cuda-and-gpu-programming, https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1)
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/writing_kernels/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Rebuilt 2026-10-23 to the teaching contract: the core idea and a hero stepper over the matmul ladder (bytes per multiply-add at each rung) at the top, then the matmul ladder, reductions (with the reduce-and-scan widget), scan, softmax and norms (the softmax ladder, Welford, fused residual + RMSNorm), fusion (epilogue, prologue, when it loses), the 4-bit decode GEMV, FlashAttention 2, 3 and 4 (split-K/split-Q and FA-3 schedule widgets inline, causal skipping, split-KV decode) and testing kernels; depth in closed blocks. Reading: 31 min, plus 15 in closed details. Tabs: Reading, Kernel bench (M1), Compiled for NVIDIA, Further reading. No child pages, databases or video.

No NVIDIA GPU was available: every timing is measured on the Apple M1 Pro GPU (Metal kernels through MLX, three runs) and labelled; NVIDIA behaviour comes from CUDA 13.4.2 compiler output for sm_80, sm_90a and sm_120 and from cited papers. The old written page is saved in `src/live.md` and every claim is accounted for in `src/coverage.json` (the migration) and `src/ledger.json` (the 2026-10-23 rebuild). Sources, scripts and checks: `src/README.md`.
