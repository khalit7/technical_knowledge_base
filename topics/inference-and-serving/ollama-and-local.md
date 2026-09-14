# Ollama, llama.cpp, and local serving

⏱ 7 min read · +2h 15m resources

Last updated: 2026-08-24

## Best resources

- [llama.cpp repo](https://github.com/ggml-org/llama.cpp) (repo, ~30 min for the entry path) and its
  [llama-server README](https://github.com/ggml-org/llama.cpp/tree/master/tools/server) (25 min):
  the authoritative feature list, moves weekly.
- [GGUF format spec](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md) (20 min).
- [Ollama blog](https://ollama.com/blog) (blog index, ~20 min), especially
  ["Ollama's new engine for multimodal models"](https://ollama.com/blog/multimodal-models) (10 min)
  (the split from vendored llama.cpp).
- [HF docs: GGUF quantisation types](https://huggingface.co/docs/hub/gguf) (15 min): decoder ring
  for Q4_K_M vs IQ4_XS vs Q8_0.
- Practical local-serving guide: [daily.dev: Running LLMs Locally in 2026](https://daily.dev/blog/running-llms-locally-ollama-llama-cpp-self-hosted-ai-developers/) (15 min).

## The layering

**ggml** (tensor library, C) -> **llama.cpp** (inference engine + CLI + server) ->
**Ollama** (Go wrapper with its own engine forked onto ggml: model registry, lifecycle,
API) -> GUIs (LM Studio, Open WebUI). Ollama historically shelled into llama.cpp; since
2025 it runs its own ggml-based engine for new (especially multimodal) models while
still using llama.cpp kernels underneath. LM Studio bundles llama.cpp and Apple MLX
backends behind a GUI.

## llama.cpp

C/C++, no Python runtime, single binary. Backends: CUDA, Metal, Vulkan, ROCm/HIP,
SYCL, CPU (AVX/NEON). Runs GGUF models anywhere from a Raspberry Pi to multi-GPU
workstations; supports CPU+GPU split (`--n-gpu-layers`) so models larger than VRAM
still run, just slower. A 2026 kernel overhaul substantially improved CUDA graph usage
and Blackwell (RTX 50-series) throughput.

**llama-server** (the OpenAI-compatible HTTP server) is now a serious single-box server:

- `/v1/chat/completions`, completions, embeddings, reranking endpoints; also an
  Anthropic-compatible route; built-in web UI.
- Parallel decoding (`-np N` slots) with continuous batching (`-cb`), per-slot KV;
  prompt/prefix caching per slot.
- Speculative decoding (draft model via `-md`), grammar/JSON-schema constrained output
  (GBNF), function calling, LoRA hot-swap, multimodal input.
- Router mode (2026): one server fronting multiple models with load/unload and LRU
  eviction, closing part of the gap with Ollama's UX.

What it lacks versus vLLM/SGLang: PagedAttention-grade KV management, radix prefix
sharing across many users, wide-EP MoE, and real high-concurrency throughput. It is a
low-latency small-batch engine, not a datacenter one.

## GGUF quantisation

GGUF is a single-file container (weights + tokenizer + metadata + chat template), the
de facto local distribution format on the HF Hub. Quant families:

- **Legacy Q4_0/Q5_0/Q8_0**: simple block quant (32-weight blocks, one scale).
- **K-quants (Q2_K...Q6_K)**: superblocks with per-subblock scales/mins; the workhorse.
  `Q4_K_M` is the classic quality/size sweet spot; `Q6_K` is near-lossless.
- **I-quants (IQ1_S...IQ4_XS)**: importance-matrix (imatrix) calibrated, lookup-based;
  best quality at <=4 bits, slightly slower decode. `IQ4_XS`/`IQ3_M` for squeezing big
  models in.
- Newer: `MXFP4` GGUFs (e.g. gpt-oss), ternary `TQ` types for BitNet-style models.
- Rule of thumb: 4-bit costs ~0.6 GB/B parameters (plus KV); quality cliff is below
  ~3 bits for dense models; MoE models tolerate quantising experts harder than
  attention. Prefer a bigger model at Q4 over a smaller one at Q8.

## Ollama

`ollama run qwen3` and you are done: pulls from its registry (Modelfile layers, like
docker), manages VRAM residency, keep-alive, and exposes an OpenAI-compatible API on
:11434. State in Aug 2026 (v0.3x line):

- Own engine for multimodal and new architectures; Vulkan on by default (AMD/Intel
  iGPU coverage); NVIDIA-tuned kernels upstreamed with llama.cpp; MLX backend on Macs.
- Tool calling, structured outputs, thinking-mode toggles, embeddings.
- **Ollama Cloud**: `:cloud` model tags transparently route oversized models (480B
  coders, etc.) to hosted GPUs via the same local API; local-first, escalate when VRAM
  runs out.
- Tradeoffs: convenience over control (its own quant defaults, context length defaults
  are conservative; check `num_ctx`), single-user orientation, and it hides llama.cpp
  flags you may want. Power users often outgrow it into llama-server or vLLM.

## On Khalid's dual RTX 5090s (2x32GB, GDDR7, ~1.79 TB/s each)

- **What fits**: 70B dense at Q4/AWQ across both GPUs (~40GB weights + KV); 32B class
  (Qwen3-32B) in FP8 on one card with room for long context; 100B+ MoE (gpt-oss-120B,
  GLM-4.x-Air class) at 4-bit across both; 8-14B models in BF16 comfortably.
- **Decode speed is bandwidth-bound**: expect very roughly 1.79 TB/s / bytes-per-token
  streamed; a 32B FP8 model (~32GB streamed per token, minus cache effects) lands in
  the 40-60 tok/s single-stream range, small models hit 150-200+ tok/s.
- **No NVLink on consumer Blackwell**: tensor parallel over PCIe 5.0 works (vLLM
  `-tp 2`) but all-reduce cost is noticeable; for throughput serving prefer one model
  per GPU with a router, or pipeline parallel for fit, TP only when a single model
  needs both cards' bandwidth.
- **Engine choice**: Ollama/llama.cpp for interactive single-user work and exotic
  quants; vLLM (FP8 + FP8 KV cache is native on Blackwell SM120) once you want
  concurrent requests, real batching, or to mirror production behaviour.

## See also

- [vllm.md](vllm.md), [inference-techniques.md](inference-techniques.md) (quantised serving, bandwidth math).
- GPU architecture details: [../hardware/](../hardware/summary.md).
