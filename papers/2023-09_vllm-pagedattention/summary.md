# Efficient Memory Management for Large Language Model Serving with PagedAttention

⏱ 11 min read · +~2h 40m resources

- **Authors/lab**: Woosuk Kwon, Zhuohan Li, Siyuan Zhuang, Ying Sheng, Lianmin Zheng, Cody Hao Yu, Joseph E. Gonzalez, Hao Zhang, Ion Stoica (UC Berkeley, with Stanford and UCSD); published at SOSP 2023
- **Date**: September 2023 (arXiv 2023-09-12; SOSP '23, October 2023)
- **Links**: [arXiv 2309.06180](https://arxiv.org/abs/2309.06180) (~45 min) | [GitHub (vllm-project/vllm)](https://github.com/vllm-project/vllm) (repo, ~25 min for the README and entry path) | [Announcement blog](https://blog.vllm.ai/2023/06/20/vllm.html) (~10 min)
- Added to KB: 2026-08-24

## Best resources

- [vLLM announcement blog (June 2023)](https://blog.vllm.ai/2023/06/20/vllm.html) (~10 min, the same post as the Links line): the authors' own short version, with the clearest animations of block tables, copy-on-write sharing, and the 24x-over-HF headline.
- [Anyscale: How continuous batching enables 23x throughput](https://www.anyscale.com/blog/continuous-batching-llm-inference) (~20 min): the best explanation of iteration-level (continuous) batching, the Orca idea that PagedAttention composes with; benchmarks vLLM against static-batching baselines.
- [Aleksa Gordic: Inside vLLM, anatomy of a high-throughput inference system](https://www.aleksagordic.com/blog/vllm) (~45 min): code-level walkthrough of the modern vLLM engine (scheduler, KV cache manager, paged attention kernels), the bridge from this paper to today's codebase.
- [vLLM V1 alpha release blog (January 2025)](https://blog.vllm.ai/2025/01/27/v1-alpha-release.html) (~15 min): what the project learned in 1.5 years of production and how the re-architected V1 engine changes the scheduler and cache manager described here.

## Problem

LLM serving throughput is memory-bound: decode generates one token per step, underutilizes the GPU, and the fix is batching many requests, so the batch size is capped by how much KV cache fits in GPU memory. On an A100-40GB serving a 13B model, weights take ~65% of memory and the KV cache over 30%, and each OPT-13B token costs 800 KB of KV (2 vectors x 5120 hidden x 40 layers x 2 bytes FP16), so one 2048-token request can need 1.6 GB.

Pre-2023 systems (FasterTransformer, Orca) inherited the deep learning framework assumption that a tensor lives in contiguous memory, so they pre-allocated one contiguous chunk per request sized to the maximum possible sequence length (e.g. 2048 tokens). That wastes memory three ways: reserved slots for future tokens that sit idle for the request's whole lifetime, internal fragmentation because most requests finish far short of the maximum, and external fragmentation from the buddy allocator because chunk sizes differ per request. The authors' profiling shows only 20.4% to 38.2% of KV cache memory in these systems holds actual token states (Orca variants; Fig. 2). Contiguous layouts also make KV sharing across sequences (parallel sampling, beam search) impossible. Compaction is impractical at these sizes and would not enable sharing anyway.

## Method

The core move is to transplant OS virtual memory with paging onto the KV cache: blocks are pages, tokens are bytes, requests are processes.

**PagedAttention.** Partition each sequence's KV cache into fixed-size KV blocks of B tokens (default B=16). The attention computation is rewritten blockwise: for query q_i, the kernel fetches each key block K_j wherever it lives in physical memory, computes the score row A_ij, then accumulates o_i against the matching value blocks V_j. Because the kernel indexes blocks through a table, blocks need not be contiguous in physical GPU memory. Custom fused CUDA kernels make this cheap: fused reshape + block write for new KV, fused block read + attention (adapted from FasterTransformer, one warp per block, variable sequence lengths per batch), and fused batched block copy for copy-on-write. The paged kernel is 20-26% slower than FasterTransformer's contiguous attention kernel in isolation, but attention is a small share of total time and the memory win dominates end to end.

**KV cache manager and block tables.** Each request's cache is a list of logical KV blocks filled left to right; a per-sequence block table maps logical block to physical block plus a fill count, exactly like a page table. Physical blocks (on GPU, and on CPU RAM for swap space) are allocated on demand as tokens are generated, never reserved for the maximum length. Waste is bounded to at most one partially filled block per sequence, which is why vLLM measures 96.3% of KV memory holding real token states. The engine exposes three primitives, fork, append, free, from which all decoding algorithms are built.

**Sharing via reference counts and copy-on-write.** Parallel sampling (n samples from one prompt): all samples' logical prompt blocks map to the same physical blocks, each physical block carries a reference count, and a write to a shared block (only ever the last prompt block) triggers a block-granularity copy-on-write. Beam search shares far more, since beams share not just the prompt but diverging chains of generated blocks, like a process fork tree; blocks are freed when their refcount hits zero as beams die. Shared system prompts work like OS shared libraries: the provider pins the prefix's physical blocks once and every request maps them. Because sharing is hidden behind the logical-to-physical mapping, requests with different decoding modes batch together freely, which contiguous systems cannot do.

**Scheduling and preemption.** FCFS with iteration-level (continuous) batching in the Orca style: after every step, finished sequences leave and waiting ones join, and vLLM concatenates prompt-phase and decode-phase tokens into one model invocation. When free blocks run out, vLLM preempts the latest-arrived requests, evicting all blocks of a sequence together (all-or-nothing, since all of a sequence's blocks are accessed each step), and gang-schedules sequence groups (e.g. all beams of one request) because they share blocks. Two recovery paths: swapping the evicted blocks to CPU RAM, or recomputation, which replays prompt + already-generated tokens as one prefill pass, much cheaper than the original decode. Ablation: recomputation wins at small block sizes (swapping many tiny blocks throttles PCIe), swapping wins at large ones; at block sizes 16-64 they are comparable, and recompute overhead never exceeds 20% of swap latency.

**Distributed serving.** Megatron-style tensor parallelism with a single centralized KV cache manager in the scheduler; workers share the same logical-to-physical mapping and each stores only its attention heads' slice of every block, so memory management needs no inter-worker coordination.

The system is ~8.5K lines of Python plus ~2K lines of C++/CUDA, with a FastAPI frontend speaking the OpenAI API.

## Results

- **Throughput**: 2-4x over Orca (Oracle), the strongest possible contiguous baseline (it is given the true output lengths in advance), at the same normalized latency, on OPT-13B/66B/175B and LLaMA-13B with ShareGPT and Alpaca traces. 2.7-8x over Orca (Max), up to 22x over FasterTransformer. Gains grow with longer sequences, larger models, and more complex decoding.
- **Batch size is the mechanism**: on OPT-13B/ShareGPT, vLLM batches 30.4 requests on average vs 7.0 (Orca Max) to 13.6 (Orca Oracle).
- **Sharing**: beam search (width 6) saves up to 55.2% of KV memory on Alpaca and 66.3% on ShareGPT; parallel sampling saves 6.1-9.8% (Alpaca) and 16.2-30.5% (ShareGPT). Shared-prefix translation: 1.67x (1-shot prefix) to 3.58x (5-shot) over Orca Oracle.
- **Block size**: 16 balances GPU parallelism against internal fragmentation and became the default.

## Why it matters

This is the paper that made high-throughput LLM serving an open-source commodity, and it did it by importing 50-year-old OS ideas (paging, copy-on-write, swapping) rather than inventing new math. PagedAttention became the industry-standard KV layout almost immediately: TensorRT-LLM, Hugging Face TGI, SGLang (whose RadixAttention prefix cache is built on paged KV), and DeepSpeed all adopted paged KV caches, and continuous batching + paged KV is now the assumed baseline every serving paper compares against. Later work refined rather than replaced it: vAttention (2024) argued for using CUDA virtual memory APIs to keep kernels contiguous-view, Sarathi-style chunked prefill and disaggregated prefill/decode addressed the prefill-decode interference the paper's monolithic step scheduling left open, and MLA-style architectures (DeepSeek) attacked KV size from the model side.

The vLLM project itself became the reference open-source inference engine. By 2025 it had grown far beyond the paper: automatic prefix caching, chunked prefill, speculative decoding, FP8 and quantized KV cache, guided decoding, and multi-hardware backends (NVIDIA, AMD, TPU, AWS Neuron, Intel). The V1 engine (alpha January 2025, default during 2025, with the legacy V0 path subsequently removed) rebuilt the scheduler around a token-budget abstraction that treats prefill and decode uniformly, added a zero-overhead prefix cache and an isolated EngineCore process, and delivered ~1.7x speedups; vLLM joined the PyTorch Foundation ecosystem in May 2025, and the llm-d project (Red Hat, Google, IBM) built Kubernetes-native disaggregated serving on top of it. vLLM is also the de facto rollout engine inside RL post-training stacks (verl, TRL, OpenRLHF), which makes this paper's memory model load-bearing for training pipelines, not just serving. For contributing to vLLM today: the block manager, scheduler, and paged kernels in the codebase are direct descendants of Sections 4.2-4.5, so this paper is still the correct mental model of the core.

## Connections

- [papers/2017-06_attention-is-all-you-need](../2017-06_attention-is-all-you-need/summary.md): the KV cache being paged is the per-token key/value state of Transformer self-attention.
- [papers/2022-05_flashattention](../2022-05_flashattention/summary.md): the complementary attention-systems paper; FlashAttention optimizes the compute/IO of attention within a kernel, PagedAttention optimizes where the KV operands live across requests. Modern engines use both (vLLM V1 builds on FlashAttention kernels).
- [papers/2019-09_megatron-lm](../2019-09_megatron-lm/summary.md): vLLM's distributed execution uses Megatron-style tensor parallelism with the KV manager centralized above it.
- [papers/2024-12_deepseek-v3](../2024-12_deepseek-v3/summary.md): MLA shrinks the KV cache at the architecture level, the model-side attack on the same bottleneck; serving MLA efficiently required new paged-KV kernel work in vLLM.
- [papers/2025-01_deepseek-r1](../2025-01_deepseek-r1/summary.md): RLVR-era post-training depends on vLLM-class engines for fast rollout generation.
- Topics: `topics/inference-and-serving` (continuous batching, PagedAttention, KV caching are named scope items), `topics/cuda-and-gpu-programming` (fused paged-attention kernels), `topics/swe-and-system-design` (a model systems paper: OS abstractions applied to a new resource).
