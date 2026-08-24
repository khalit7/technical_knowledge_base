# NVIDIA Triton Inference Server, TensorRT-LLM, and Dynamo

Last updated: 2026-08-24

## Best resources

- [Triton Inference Server docs](https://docs.nvidia.com/deeplearning/triton-inference-server/)
  and [repo](https://github.com/triton-inference-server/server).
- [TensorRT-LLM repo](https://github.com/NVIDIA/TensorRT-LLM) and its tech blogs,
  especially [Disaggregated Serving in TensorRT-LLM](https://nvidia.github.io/TensorRT-LLM/blogs/tech_blog/blog5_Disaggregated_Serving_in_TensorRT-LLM.html).
- [Introducing NVIDIA Dynamo](https://developer.nvidia.com/blog/introducing-nvidia-dynamo-a-low-latency-distributed-inference-framework-for-scaling-reasoning-ai-models)
  (GTC 2025) plus [Dynamo docs on disaggregated serving](https://docs.dynamo.nvidia.com/dynamo/design-docs/disaggregated-serving).

## Naming disambiguation (important)

Three unrelated things called "Triton":

1. **NVIDIA Triton Inference Server**: a C++ HTTP/gRPC model-serving server. This file.
2. **OpenAI Triton**: a Python DSL for writing GPU kernels (what vLLM kernels are often
   written in). Covered in
   [../cuda-and-gpu-programming/triton-language.md](../cuda-and-gpu-programming/triton-language.md).
3. Triton (the malware, the mythology): irrelevant.

NVIDIA has leaned into "Dynamo-Triton" branding for the server to reduce confusion.

## Triton Inference Server

The veteran production server (2018-): serves **any model from any framework** behind
one endpoint. Still actively released (monthly NGC containers, r26.x in 2026).

- **Backends**: TensorRT, TensorRT-LLM, ONNX Runtime, PyTorch (libtorch), TensorFlow,
  OpenVINO, FIL (XGBoost/LightGBM), vLLM, and arbitrary Python. AMD maintains a ROCm port.
- **Dynamic batching**: server-side request coalescing for stateless models; queues
  individual requests and fires a batch when full or on timeout. Note this is *not*
  continuous batching; for LLMs the batching is delegated to the TensorRT-LLM or vLLM
  backend's in-flight batcher.
- **Ensembles / BLS**: DAGs of models (tokenize -> embed -> rerank -> classify) executed
  server-side; Business Logic Scripting for control flow in Python.
- **Ops features**: concurrent model execution on shared GPUs, model repository with
  versioning and hot reload, metrics for Prometheus, model analyzer for config search.
- **Use it when**: you run a heterogeneous zoo (recsys, CV, XGBoost, embedders, plus
  the odd LLM) and want one serving substrate. For pure LLM APIs it adds little over
  vLLM/SGLang's own servers and its centre-of-gravity role is being taken by Dynamo.

## TensorRT-LLM

NVIDIA's open-source LLM engine: the peak-performance path on NVIDIA GPUs.

- **Then**: ahead-of-time compiled "engines" per model/GPU/batch-shape via TensorRT,
  painful rebuilds, best-in-class kernels.
- **Now (1.x, 2025-2026)**: rearchitected around a **PyTorch runtime** as the default;
  models are Python-defined, no mandatory engine compile step, with `trtllm-serve`
  giving an OpenAI-compatible endpoint directly. The classic TRT-compile flow remains
  for maximum static optimisation.
- Features: in-flight (continuous) batching, paged KV, FP8 and **NVFP4** (Blackwell)
  quantisation via ModelOpt, speculative decoding (EAGLE-3, MTP, draft models), wide-EP
  MoE, chunked prefill, KV reuse, disaggregated serving with runtime-reconfigurable
  xPyD (x prefill workers, y decode workers).
- Costs: NVIDIA-only, smaller model coverage than vLLM, historically rougher DX (much
  improved in 1.x). MLPerf-winning numbers and GB200/NVL72 recipes come from this stack.

## NVIDIA Dynamo

Announced GTC March 2025 as "the operating system of the AI factory"; **Dynamo 1.0
shipped March 2026**. Successor to the "Triton as the front door" era for LLMs:
a Rust/Python distributed serving framework above the engines.

- **Engine-agnostic**: workers run vLLM, SGLang, or TensorRT-LLM; Dynamo owns routing,
  scheduling, and memory across the cluster.
- **Disaggregated serving**: separate prefill and decode GPU pools with independent
  parallelism, KV transfer over NIXL (NVLink/RDMA/IB abstraction); GPU planner
  rebalances prefill vs decode workers with load.
- **KV-aware smart router**: routes requests to workers already holding the matching
  prefix KV; KV Block Manager offloads cold cache to CPU RAM, SSD, and object storage.
- Claimed wins: up to 30x more requests/GPU for DeepSeek-R1 on GB200 NVL72, ~2x for
  Llama-70B on Hopper, via disaggregation plus routing.
- Positioning vs llm-d: same problem (Kubernetes-scale disaggregated LLM serving);
  Dynamo is NVIDIA-led and engine-agnostic, llm-d is CNCF/Red Hat/Google-led and
  vLLM-centred. Expect convergence pressure; both use the Gateway API Inference
  Extension patterns on K8s.

## Choosing within the NVIDIA stack

- One node, OSS-first: vLLM or SGLang directly; add TensorRT-LLM if benchmarks justify it.
- Peak perf per GPU, FP4 on Blackwell, enterprise support (NVIDIA AI Enterprise): TensorRT-LLM.
- Mixed-framework model zoo, ensembles: Triton Inference Server (Dynamo-Triton).
- Multi-node LLM fleet with P/D disaggregation: Dynamo (or llm-d if you are K8s/vLLM native).

## See also

- [inference-techniques.md](inference-techniques.md): disaggregation, in-flight batching, FP8/FP4.
- [vllm.md](vllm.md), [sglang.md](sglang.md).
