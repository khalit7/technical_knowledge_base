# vLLM

⏱ 8 min read · +4h 25m resources

Last updated: 2026-08-24

## Best resources

- [vLLM docs](https://docs.vllm.ai) (docs, ~1h for the core pages), especially the
  [Architecture Overview](https://docs.vllm.ai/en/latest/design/arch_overview/) (30 min): entrypoints,
  engine core, scheduler, model runner. Read this before touching the code.
- [PagedAttention paper](https://arxiv.org/abs/2309.06180) (45 min, SOSP 2023); local copy and
  notes: [../../papers/2023-09_vllm-pagedattention/summary.md](../../papers/2023-09_vllm-pagedattention/summary.md).
- [vLLM V1 alpha announcement](https://blog.vllm.ai/2025/01/27/v1-alpha-release.html) (20 min):
  the clearest write-up of why the engine was re-architected.
- [vLLM blog](https://vllm.ai/blog) (blog index, ~30 min): release deep-dives; the 2026 posts on speculative
  decoding, decode context parallelism, and EAGLE 3.1 are current best practice.
- [Contributing guide](https://docs.vllm.ai/en/stable/contributing/) (25 min) plus the quarterly
  roadmap issues (e.g. [Q1 2026 #32455](https://github.com/vllm-project/vllm/issues/32455) (20 min),
  [Q2 2026 #39749](https://github.com/vllm-project/vllm/issues/39749) (20 min)).

## What it is

vLLM (UC Berkeley origin, now a huge community project under the PyTorch Foundation
umbrella) is the default open-source LLM serving engine: an OpenAI-compatible server and
a Python `LLM` class around a continuous-batching engine with PagedAttention KV
management. It has the broadest model coverage (text, multimodal, embedding, pooling,
Mamba/hybrid, MoE) and hardware coverage (NVIDIA, AMD, Intel, TPU, AWS Neuron, CPU) of
any engine, which is why it is also the standard rollout engine for RL post-training
stacks (verl, SkyRL, TRL).

## Architecture

Request path: **entrypoint** (OpenAI API server or `LLM` class) -> **EngineCore**
(busy loop in its own process, ZeroMQ to the frontend) -> **Scheduler** ->
**ModelRunner/Worker** per GPU -> sampled tokens stream back.

- **PagedAttention**: the KV cache is stored in fixed-size blocks (default 16 tokens)
  with a per-sequence block table, like virtual memory pages. Kills internal/external
  fragmentation (naive contiguous allocation wastes 60-80% of KV memory), enables
  copy-on-write sharing for beam search and parallel sampling, and makes preemption
  cheap (swap or recompute blocks). Details: [inference-techniques.md](inference-techniques.md).
- **Continuous batching**: scheduling is per-step, not per-request. Every engine step
  the scheduler builds a fresh batch mixing prefill and decode work; finished sequences
  leave immediately and waiting ones join. Chunked prefill (on by default in V1) splits
  long prompts so decode latency stays flat.
- **Scheduler**: V1 collapsed the old prefill/decode phase distinction. The scheduler
  just allocates a token budget per step ({request: num_tokens} to run), which is what
  makes chunked prefill, prefix caching, and speculative decoding compose cleanly.
  Priority and FCFS policies; preemption by recompute or KV swap when blocks run out.
- **V1 engine** (default since v0.8.x, only engine now): isolated EngineCore process,
  near-zero-overhead prefix caching (hash-per-block, on by default), persistent batch
  with numpy-based input prep, piecewise CUDA graphs, multiprocessing API server, and a
  unified path where torch.compile handles model-level optimisation.

## Feature set (Aug 2026 snapshot)

- **Quantised serving**: FP8 W8A8 (native on Hopper/Blackwell, and on the RTX 5090),
  NVFP4/MXFP4 on Blackwell, INT4/INT8 via AWQ, GPTQ, GGUF, bitsandbytes, compressed-tensors
  (llm-compressor); FP8 KV cache.
- **Speculative decoding**: EAGLE-3 / EAGLE 3.1 (co-developed with the EAGLE team and
  TorchSpec), MTP heads (DeepSeek-style), draft models, n-gram/prompt-lookup; adaptive
  verification (DSpark) landed 2026.
- **Parallelism**: TP, PP, EP (wide expert parallel for MoE), data parallel attention,
  and decode context parallelism (2026; about 3x throughput on long-context agentic
  workloads by sharding long KV across GPUs during decode).
- **Disaggregation and scale-out**: KV connector API (NIXL, LMCache, Mooncake) for
  prefill/decode disaggregation and KV offload; first-class integration with
  [llm-d](https://docs.vllm.ai/en/latest/deployment/integrations/llm-d/) (10 min), NVIDIA Dynamo,
  and vllm-project/production-stack for Kubernetes.
- **Structured output**: xgrammar (default) / guidance backends; tool calling; reasoning
  parsers for thinking models.
- **RL-first features**: weight sync in place, KV cache reset, sleep/wake mode for
  colocated training; a headline 2026 roadmap theme.
- **Long context and new architectures**: hybrid Mamba/attention models, MLA
  (DeepSeek), sliding window + full attention mixes, omni-modality via vLLM-Omni.

Rule of thumb versus rivals: vLLM wins on coverage, ecosystem, and batch throughput;
SGLang can win on prefix-heavy and structured workloads ([sglang.md](sglang.md));
TensorRT-LLM can win peak perf on NVIDIA silicon ([triton-and-tensorrt.md](triton-and-tensorrt.md)).

## Contributing (entry points)

Realistic ladder for getting PRs merged:

1. **Setup**: fork, `uv pip install -e .` from source, run `pre-commit`; read the
   [contributing guide](https://docs.vllm.ai/en/stable/contributing/) (25 min, counted once above). PRs need tests;
   changes over ~500 LOC need an RFC issue first. Reviewers aim for status updates every
   2-3 days; ping after 7.
2. **Where to look**: issues labelled `good first issue`; the quarterly roadmap issue
   lists workstreams with owners; CI failures and flaky tests are always welcome fixes.
3. **Low-barrier, high-value areas**: model support PRs (new architectures follow a
   well-trodden template under `vllm/model_executor/models/`), tokenizer/chat-template
   bugs, OpenAI API conformance, docs.
4. **Deeper**: scheduler and KV cache manager (V1 code is readable:
   `vllm/v1/core/sched/`, `vllm/v1/core/kv_cache_manager.py`), kernels (CUDA/Triton
   under `csrc/` and `vllm/attention/`), quantisation backends, spec-decode.
5. **Community**: developer Slack ([slack.vllm.ai](http://slack.vllm.ai), sign-up ~5 min), biweekly office hours, RFC
   discussions on GitHub. Small correct PRs land fast; kernel PRs need benchmarks
   (`benchmarks/` has harnesses).

## See also

- [inference-techniques.md](inference-techniques.md) for the technique details.
- [../../papers/2023-09_vllm-pagedattention/summary.md](../../papers/2023-09_vllm-pagedattention/summary.md)
