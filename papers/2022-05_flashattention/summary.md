# FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness

⏱ 12 min read · +~4h resources

- **Authors/lab**: Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Re (Stanford Hazy Research / U. Buffalo)
- **Date**: May 2022 (NeurIPS 2022)
- **Links**: [arXiv:2205.14135](https://arxiv.org/abs/2205.14135) (~1h) | [code (Dao-AILab/flash-attention)](https://github.com/Dao-AILab/flash-attention) (repo, ~25 min for the README and entry path) | [Tri Dao's site](https://tridao.me/) (~5 min)

### Best resources

- [ELI5: FlashAttention](https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad) (Aleksa Gordic) (~25 min): the best gentle walkthrough of the tiling and rescaling math, with diagrams of the block loops.
- [From Online Softmax to FlashAttention](https://courses.cs.washington.edu/courses/cse599m/23sp/notes/flashattn.pdf) (Zihao Ye, UW CSE 599M note) (~40 min): derives the algorithm the right way round, starting from 3-pass safe softmax, then online softmax, then the fused one-pass attention; the cleanest path to reconstructing the kernel yourself.
- [FlashAttention talk, Stanford MLSys #67](https://www.youtube.com/watch?v=gMOAud7hZg4) (Tri Dao) (~1h): the author's own explanation of the memory hierarchy argument and the algorithm.
- [Making Deep Learning Go Brrrr From First Principles](https://horace.io/brrr_intro.html) (Horace He) (25 min): not about FlashAttention specifically, but the compute-bound vs memory-bound framing that makes the whole paper obvious in retrospect.

### Problem

Self-attention is quadratic in sequence length in both time and memory, which is the binding constraint on Transformer context length. A wave of approximate attention methods (Linformer, Performer, Reformer, sparse attention) cut FLOPs to linear or near-linear, yet mostly failed to deliver wall-clock speedup and never displaced exact attention. The paper's diagnosis: FLOP count is the wrong cost model. Attention on GPUs is memory-bound, and the real cost is traffic between HBM (A100: 40-80 GB at 1.5-2.0 TB/s) and on-chip SRAM (192 KB per SM at roughly 19 TB/s). The standard implementation computes S = QK^T, writes the N x N matrix S to HBM, reads it back for the softmax, writes P, reads P again for PV, and repeats the round trips for masking and dropout. Nobody had made attention IO-aware, i.e. designed to minimise reads/writes across the memory hierarchy, because frameworks like PyTorch do not expose that level of memory control; it takes a hand-written CUDA kernel.

### Method

FlashAttention computes exact (not approximate) attention in a single fused CUDA kernel that never materialises the N x N attention matrix in HBM. Two techniques carry everything: tiling with online softmax in the forward pass, and recomputation in the backward pass.

**Tiling + online softmax (forward).** The obstacle to blocking attention like a tiled matmul is that softmax couples an entire row of S: softmax(x)_i = e^(x_i - m(x)) / sum_j e^(x_j - m(x)) needs the row max m and the row sum l before any output can be finalised. The fix is the online softmax decomposition: for a row split into blocks x^(1), x^(2), the statistics combine as

```javascript
m = max(m(x^(1)), m(x^(2)))
l = e^(m(x^(1)) - m) l(x^(1)) + e^(m(x^(2)) - m) l(x^(2))
```

so a running (m, l) pair per row lets you process one block of columns at a time, rescaling everything accumulated so far by e^(m_old - m_new) whenever a new block raises the max. FlashAttention applies this to whole tiles: split K, V into blocks of B_c rows and Q into blocks of B_r rows, with block sizes chosen so one K/V block, one Q block, and the running output block fit in SRAM (B_c = ceil(M / 4d) for SRAM size M). The outer loop streams K_j, V_j blocks from HBM into SRAM; the inner loop streams Q_i blocks; on chip it computes S_ij = Q_i K_j^T, the block-local max and exponentials, then updates the running statistics (m_i, l_i) and rescales the output accumulator O_i before adding P_ij V_j. Only Q, K, V, O, and the O(N) statistics ever touch HBM. (FlashAttention-2 later swapped the loop order so Q is outer, which is what you should picture today.) Because everything happens inside one kernel, masking and dropout fuse in for free instead of costing extra N x N round trips.

**Recomputation (backward).** Training normally needs S and P stored for the backward pass, which is where the O(N^2) memory goes. FlashAttention stores only O and the softmax statistics (m, l) (later versions store the single logsumexp L per row). In the backward pass it recomputes S_ij and P_ij block by block in SRAM from Q, K, V and the saved statistics. This is selective gradient checkpointing, but unlike generic checkpointing it is not a speed-for-memory trade: the backward pass gets faster despite the extra FLOPs, because it stops reading a 40 GB attention matrix out of HBM.

**The IO-complexity argument (the paper's real thesis).** FlashAttention does strictly more arithmetic than standard attention and wins anyway. Concrete numbers for GPT-2 medium (N=1024, d=64, 16 heads, batch 64, A100, fwd+bwd): 75.2 GFLOPs vs 66.6 for standard, but 4.4 GB of HBM traffic vs 40.3 GB, giving 7.3 ms vs 41.7 ms. Theorem 2 formalises it: standard attention needs Theta(Nd + N^2) HBM accesses; FlashAttention needs Theta(N^2 d^2 / M). Since d^2 (d = 64-128, so 4K-16K) is far smaller than usable SRAM M (order 100 KB), that is up to about 9x fewer accesses, and it explains the block-size sweep: bigger blocks mean fewer passes over the inputs and lower runtime until arithmetic, not IO, becomes the bottleneck around block size 256. Proposition 3 adds a lower bound: no exact attention algorithm can beat o(N^2 d^2 / M) HBM accesses across all SRAM sizes M in [d, Nd], so within this cost model FlashAttention is asymptotically optimal.

**Block-sparse extension.** Given a block-form sparsity mask, skip zero blocks entirely; IO complexity drops by the sparsity fraction s to Theta(Nd + N^2 d^2 s / M). This gave the fastest approximate attention the authors knew of, and is the trick that reached 64K sequence length.

### Results

- **Training speed**: BERT-large 15% faster than the NVIDIA MLPerf 1.1 record (17.4 vs 20.0 min on 8xA100); GPT-2 up to 3x faster than HuggingFace and 1.7-1.8x faster than Megatron-LM at identical perplexity; long-range arena 2.4x faster.
- **Attention op itself**: up to 3x faster than PyTorch standard attention across N = 128-2K (7.6x on the GPT-2 attention module), memory linear in N and up to 20x smaller than exact baselines. Approximate methods only start winning past N of roughly 512-1024; block-sparse FlashAttention beats them at all lengths tested.
- **Longer context as a quality lever**: GPT-2 small with 4K context trains faster than Megatron with 1K context and gains 0.7 perplexity; +6.4 points on long-document classification (MIMIC-III, ECtHR).
- **Path-X / Path-256**: first Transformer to beat chance on Path-X (N=16K, 61.4%) and, with block-sparse, on Path-256 (N=64K, 63.1%). Long-context capability that simply did not exist before.

### Why it matters

This is the canonical fused kernel and the paper that made IO-awareness the default lens for GPU kernel work. It ended the approximate-attention research wave almost single-handedly: exact attention became fast enough that FlashAttention (or a descendant) now sits inside essentially every serious training and inference stack (PyTorch SDPA, vLLM, TensorRT-LLM, cuDNN, every frontier lab's internal stack), and long context went from research problem to product knob. For a CUDA learner it is the ideal case study: memory hierarchy, tiling, kernel fusion, occupancy, and a cost model (count HBM bytes, not FLOPs) all in one algorithm.

The lineage since, all led by Tri Dao:

- **FlashAttention-2 (July 2023, arXiv:2307.08691)**: same math, better mapping onto the GPU. Cuts non-matmul FLOPs (rescale the output once per row block at the end instead of at every step), swaps the loops so Q is the outer loop, parallelises across the sequence-length dimension in addition to batch and heads (crucial at long context where batch x heads alone underfills the GPU), and partitions work across warps within a threadblock to eliminate shared-memory round trips ("split-K" removed). Roughly 2x over FA-1, reaching 50-73% of A100 peak FLOPs.
- **FlashAttention-3 (July 2024, arXiv:2407.08608)**: rebuilt for Hopper. Exploits TMA and WGMMA asynchrony via warp specialisation (producer warps move data while consumer warps compute), pingpong scheduling to hide softmax latency under GEMMs, and FP8 support with incoherent processing (Hadamard-transform preconditioning) to tame quantisation error. About 1.5-2x over FA-2 on H100, up to ~740 TFLOPs BF16 (75% utilisation) and ~1.2 PFLOPs FP8.
- **FlashAttention-4 (previewed at Hot Chips, Aug 2025; released and pip-installable as ****`flash-attn-4`**** as of Aug 2026)**: a ground-up rewrite in NVIDIA's CuTe DSL (Python-level kernel authoring over CUTLASS abstractions) rather than C++/CUDA, optimised for Blackwell (B200) as well as Hopper, reported ~20% faster than cuDNN's attention on Blackwell at launch via tricks like a software-pipelined exponential and more selective output rescaling. The move from hand-written CUDA (FA-1/2) to template metaprogramming (FA-3) to a Python DSL (FA-4) is itself a snapshot of where GPU kernel engineering is heading.
The paper's stated limitation, that every variant needs a hand-written kernel, seeded a research direction of its own: Triton and torch.compile attention templates, FlexAttention, and the CuTe DSL are all answers to "compile IO-aware attention from a high-level description".

### Connections

- Attention Is All You Need (2017): the O(N^2) attention this paper makes fast without changing its output.
- vLLM / PagedAttention (2023): the complementary inference-side memory result; FlashAttention optimises HBM-SRAM traffic inside the kernel, PagedAttention optimises KV-cache allocation across requests. Serving stacks use both.
- Megatron-LM (2019): the training-systems baseline FlashAttention beats and was merged into.
- Mamba (2023): Tri Dao's other line of attack on sequence length; its selective-scan kernel reuses the same IO-aware recipe (fuse, keep state in SRAM, recompute in backward).
- DeepSeek-V3 (2024) and every modern LLM report: FlashAttention-class kernels are assumed infrastructure for the published long-context and MFU numbers.
- Topics: `topics/cuda-and-gpu-programming` (primary: the canonical fused kernel and IO-aware cost model), `topics/inference-and-serving` (attention kernels in serving stacks), `topics/hardware` (memory hierarchy and bandwidth math), `topics/llm-training-and-post-training` (training speed and long-context training).
