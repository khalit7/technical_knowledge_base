# Inference techniques: what actually makes serving fast

⏱ 8 min read · +4h 5m resources

### Best resources

- [kipply: Transformer Inference Arithmetic](https://kipp.ly/transformer-inference-arithmetic/) (30 min):
  the canonical back-of-envelope math; read first.

- [Anyscale: How continuous batching enables 23x throughput](https://www.anyscale.com/blog/continuous-batching-llm-inference) (20 min):
  still the clearest continuous-batching explainer (based on the Orca idea, OSDI 2022).

- [PagedAttention paper](https://arxiv.org/abs/2309.06180) (45 min) and notes: [Efficient Memory Management for Large Language Model Serving with PagedAttention](../../papers/2023-09_vllm-pagedattention/summary.md).
- [DistServe](https://arxiv.org/abs/2401.09670) (45 min, P/D disaggregation) and
  [Sarathi-Serve](https://arxiv.org/abs/2403.02310) (45 min, chunked prefill): the two papers

  behind modern schedulers.

- [EAGLE-3](https://arxiv.org/abs/2503.01840) (45 min) for state-of-the-art speculative decoding;
  [vLLM blog on EAGLE 3.1](https://vllm.ai/blog/2026-05-26-eagle-3-1) (15 min) for current practice.

### The two regimes (know this cold)

Every forward pass either moves weights or does math; the ratio decides everything.

- **Prefill** (process the prompt): all prompt tokens in parallel, big matmuls,
  **compute-bound**. Measured by time-to-first-token (TTFT).

- **Decode** (generate): one token per step per sequence; every step streams the entire
  weight matrix set (plus KV cache) from HBM to do a tiny matmul. Memory-bandwidth

  bound. Measured by inter-token latency (ITL/TPOT).

Bandwidth math: single-stream decode speed is roughly `HBM bandwidth / bytes touched

per token` (weights + KV). H100 SXM (3.35 TB/s) over a 70B FP16 model (140 GB): ~24

tok/s ceiling, one stream, regardless of FLOPs. An RTX 5090 (1.79 TB/s) over a 8B FP8

model (~8 GB): ~200 tok/s class. Arithmetic intensity of batch-1 decode is ~1

FLOP/byte against hardware ratios of 300+; the machine idles. **Batching fixes this**:

B sequences share one weight stream, so throughput scales near-linearly with batch

until you hit the compute roof (roofline knee) or run out of KV memory. Hence the

fundamental tradeoff: bigger batches raise throughput and worsen per-token latency;

serving is the art of riding that curve.

At the bottom of that curve the bandwidth math stops being the whole story. At batch

size 1 the per-kernel launch and scheduling overhead of a decode step is no longer

negligible and becomes the limit, so the win is issuing fewer kernels rather than moving

fewer bytes: a single fused decode **megakernel** is the software answer and weights

resident in on-chip SRAM the hardware one, both covered on [Topic: inference-and-serving](summary.md).

### KV caching

Autoregressive decode at step t needs

attention over all previous tokens. Without caching you would recompute every past

token's K and V projections each step: O(n^2) redundant work. The KV cache stores each

layer's K,V for every generated/prompt token, so each new step computes Q,K,V for one

token and attends over cached K,V. It applies to decoders (decoder-only models, and

the decoder of encoder-decoder models); FlashAttention, by contrast, is an exact

attention kernel reorganisation (tiling + online softmax, no materialised n^2 matrix)

that trades extra FLOPs for far fewer HBM reads/writes and speeds up both training and

inference prefill; see [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](../../papers/2022-05_flashattention/summary.md).

- Benefit: decode step cost drops from O(n) matmuls over history to O(1) per token.
- Cost: VRAM. Per token: `2 (K and V) * n_layers * n_kv_heads * head_dim * bytes`.
  Llama-3-70B (80 layers, 8 KV heads GQA, d_head 128) at FP16: ~320 KB/token, so a

  128K-context request holds ~40 GB of KV. KV memory, not weights, is what limits

  batch size; that is why GQA, MLA, FP8 KV, and paging exist.

### Continuous (in-flight) batching

Static batching waits for a full batch and holds it until the slowest request

finishes; utilisation dies on length variance. Continuous batching (Orca's "iteration-

level scheduling") admits and evicts sequences at every decode step: finished

sequences leave immediately, new ones join mid-flight. All modern engines do this

(vLLM scheduler, TensorRT-LLM "in-flight batching", llama.cpp `-cb`). Order-of-

magnitude throughput win over static batching; the enabler for everything below.

### PagedAttention

KV cache as virtual memory: fixed-size blocks (16-64 tokens) allocated on demand, per-

sequence block tables, attention kernels that gather through the table. Eliminates

fragmentation (contiguous preallocation wasted 60-80% of KV memory), enables

copy-on-write sharing (parallel sampling, beam search) and cheap preemption/swap.

The reason vLLM could run 2-4x bigger effective batches than 2023-era baselines. The

cost is an indirection in the hottest kernel in the system.

### Prefix caching

Cross-request KV reuse: identical prompt prefixes (system prompt, few-shot block, RAG

document, chat history) are hashed per block (vLLM) or held in a radix tree (SGLang

RadixAttention) and matched on arrival; only the novel suffix is prefilled. Massive

TTFT and compute win on agentic workloads where 60-90% of tokens are shared. Scale-out

version: cache-aware routing (SGLang router, Dynamo KV-aware router, llm-d) sends

requests to the replica that already holds their prefix, and KV offload tiers

(LMCache, Mooncake, Dynamo KVBM) spill cold prefixes to CPU/SSD/object storage. That

hierarchy keeps deepening: vLLM's tiered KV cache offloading now reaches disk as well

as host memory, with custom tier managers, so KV placement is becoming a storage

problem with its own policy rather than a fixed GPU allocation.

### Context compression

Everything above makes a KV cache cheaper to hold. The remaining option is not putting

the tokens in the decoder at all, in two families. **KV cache compression** prefills

normally and evicts entries by an importance signal (SnapKV, KVzip, Expected Attention).

**Soft-token compression** runs a small encoder over the raw input, pools its hidden

states into a much shorter sequence of continuous latents, and hands the decoder those

instead of the tokens (LCLM, REFRAG). Distinguish **algorithmic from systems-realisable**

saving when reading either: eviction must materialise the full cache before it can evict,

and methods that evict non-uniformly across heads and layers mask positions rather than

shrink the sequence, so they forfeit exactly the memory and throughput a paged engine

would have given them. Before adopting any eviction policy, run the one-line control:

keeping a uniformly sampled subset of entries matches or beats learned-importance

eviction. The full treatment is on [Topic: inference-and-serving](summary.md).

### Speculative decoding

Decode is bandwidth-bound, so a step has idle FLOPs: use them to verify k guessed

tokens in one target-model forward pass (accept the longest agreeing run; rejection

sampling keeps the output distribution exactly the target's). Free lossless speedup

when acceptance is high; families:

- **Draft model**: a small model proposes k tokens (classic, needs a compatible tokenizer).
- **Medusa**: extra decoding heads on the target model propose tree branches; no draft
  model, lower acceptance on long-form output.

- **EAGLE / EAGLE-3**: a 1-layer draft head autoregresses on the target's hidden
  features (EAGLE-3 fuses low/mid/high layers), tree-drafts candidates; acceptance

  0.8+, 2.5-4x speedups at low batch; current default choice.

- **MTP (multi-token prediction)**: DeepSeek-V3-style heads pretrained with the model;
  effectively built-in EAGLE, standard on frontier MoE models.

- **n-gram / prompt-lookup**: copy matches from the prompt; free wins on editing/RAG.
- **DFlash2 (block-diffusion drafting)**: predicts an entire block of tokens in one
  forward pass, keeps the top candidates at every position, and runs a lightweight

  selector over that lattice to trace one coherent path to verify. Two-tap dynamic

  convolutions counter the usual block-method failure, where draft quality decays

  toward the end of the block because later positions are conditioned on less settled

  context. Verification is unchanged, so decoding stays mathematically lossless: greedy

  sampling reproduces the target's output exactly and the sampled distribution is

  preserved. Up to 3.43x output throughput on Qwen3.8-27B; plugs into vLLM or SGLang,

  with MLX support for Apple silicon. The first production-shaped use of text diffusion

  in the serving stack, and the reason to expect block-parallel decoding to arrive as a

  proposal mechanism behind an exact verifier rather than as a standalone diffusion LM.

Caveat: gains shrink as batch grows (the idle FLOPs get used by other sequences);

schedulers now vary draft length with load. vLLM v0.28.0 made that concrete with an

adaptive speculative token budget, worth roughly 60% better time-to-first-token for

DSpark, alongside DSpark confidence-scheduled verification, which decides how much to

verify from the proposer's confidence instead of a fixed k.

### Chunked prefill and P/D disaggregation

Two answers to "prefill stalls decode":

- **Chunked prefill** (Sarathi-Serve): split long prompts into chunks and co-schedule
  them with ongoing decodes inside one token budget per step. Keeps ITL smooth, on by

  default in vLLM V1.

- **Prefill/decode disaggregation** (DistServe, Mooncake, Dynamo, llm-d,
  TensorRT-LLM): run prefill and decode on *separate GPU pools* with different

  parallelism, shipping KV between them (NIXL/RDMA). Removes interference entirely,

  lets you scale the compute-bound and bandwidth-bound stages independently and hit

  TTFT and ITL SLOs at once; the 2025-2026 frontier for cluster-scale serving.

### Quantised serving

Fewer bytes per weight means faster bandwidth-bound decode and bigger KV budget;

quality is the price, and it is workload-dependent enough to measure rather than assume. Production menu: **FP8** (W8A8, near-lossless, native

Hopper/Ada/Blackwell, the default for frontier serving; also FP8 KV cache),

**INT4 weight-only** (AWQ activation-aware scaling, GPTQ second-order rounding;

W4A16 is a decode-speed and fit play, prefill still FP16 compute), **NVFP4/MXFP4**

(Blackwell-native 4-bit floats with per-block scales, ~3x decode vs FP16 with small

loss), GGUF K/I-quants for local ([Ollama, llama.cpp, and local serving](ollama-and-local.md)). Method details live in [Quantization and Precision](../llm-training-and-post-training/quantization-and-precision.md).

### Attention variants and serving (MQA/GQA/MLA)

KV size per token scales with n_kv_heads, so attention architecture is a serving

decision: MHA (n_kv = n_heads) is the baseline; **GQA** shares each KV head across a

query group (8x-16x KV shrink, universal since Llama-2/3); MQA is the extreme (1 KV

head). **MLA** (DeepSeek-V2/V3) low-rank-compresses KV into a ~576-dim latent per

token per layer: ~10-30x smaller cache than MHA, decompression fused into the kernel

(FlashMLA); it converts decode from bandwidth-starved to compute-rich, which is why

DeepSeek serves long context cheaply and why MLA-aware kernels became table stakes in

vLLM/SGLang/TensorRT-LLM. Sliding-window layers (Gemma/gpt-oss hybrids) cap KV for

local layers; engines exploit this with per-layer cache pools.

### Putting it together: the operator's dashboard

Metrics: TTFT (prefill + queueing), TPOT/ITL (decode), goodput = requests/s meeting

both SLOs. Levers, in the order to pull them: quantise (FP8), enable prefix caching,

raise max batch/KV budget until ITL SLO binds, add speculative decoding if batches are

small, chunk prefill, then disaggregate when one pool cannot satisfy both SLOs.

Throughput ceiling per GPU is min(bandwidth roof, compute roof, KV capacity); know

which one you are hitting before tuning anything.

### See also

- [vLLM](vllm.md), [SGLang](sglang.md), [NVIDIA Triton Inference Server, TensorRT-LLM, and Dynamo](triton-and-tensorrt.md)
- Bandwidth specs and roofline: [Topic: hardware](../hardware/summary.md); kernels: [Topic: cuda-and-gpu-programming](../cuda-and-gpu-programming/summary.md)
