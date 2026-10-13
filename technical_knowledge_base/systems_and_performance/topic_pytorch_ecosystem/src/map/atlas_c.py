"""Curated release history (PyTorch 2.0 to 2.14) and ecosystem events. Every headline is taken from the release notes'
Highlights section on GitHub (inputs/pytorch_release_notes_extract.json holds the extract); dates are the GitHub release dates."""
R = "https://github.com/pytorch/pytorch/releases/tag/v"
REL = [
dict(v="2.0", d="2023-03-15", c="4,541 commits, 428 contributors", h=["torch.compile, the main new API (Beta); TorchInductor generates Triton for NVIDIA and AMD GPUs", "F.scaled_dot_product_attention (SDPA)", "MPS backend (Apple GPUs) in Beta", "functorch upstreamed as torch.func"], dep=["functorch deprecated in favour of torch.func", "TypedStorage deprecated"]),
dict(v="2.1", d="2023-10-04", c="6,682 commits, 784 contributors", h=["Automatic dynamic shapes in torch.compile", "torch.distributed.checkpoint (DCP): save and load from many ranks, with resharding", "torch.compile of NumPy code", "torch.export prototype"], dep=["Not passing use_reentrant to torch.utils.checkpoint deprecated", "NVFuser for TorchScript deprecated"]),
dict(v="2.2", d="2024-01-30", c="3,628 commits, 521 contributors", h=["SDPA gains a FlashAttention-2 backend (about 2x)", "AOTInductor: ahead-of-time compiled models for non-Python deployment", "DeviceMesh (device_mesh) for describing process groups", "TORCH_LOGS logging"], dep=["Last release for macOS x86"]),
dict(v="2.3", d="2024-04-24", c="3,393 commits, 426 contributors", h=["User-defined Triton kernels inside torch.compile", "Tensor parallelism in PyTorch Distributed (validated on 100B-parameter runs)", "torch.export dynamic_shapes API", "Asynchronous checkpointing"], dep=["torch.distributed.pipeline deprecated in favour of PiPPy (later torch.distributed.pipelining)", "torch.backends.cuda.sdp_kernel replaced by torch.nn.attention.sdpa_kernel"]),
dict(v="2.4", d="2024-07-24", c="3,661 commits, 475 contributors", h=["FSDP2: DTensor-based per-parameter sharding (fully_shard)", "torch.distributed.pipelining", "Higher-level Python custom operator API (torch.library.custom_op)", "torch.compile on Python 3.12; libuv TCPStore by default"], dep=["FSDP.state_dict_type deprecated for distributed_state_dict"]),
dict(v="2.5", d="2024-10-17", c="4,095 commits, 504 contributors", h=["cuDNN backend for SDPA (up to 75% over FlashAttention-2 on H100, vendor figure)", "Regional compilation of repeated blocks without recompiles", "FlexAttention (prototype)", "Compiled Autograd and Flight Recorder (prototypes); Inductor CPU max-autotune"], dep=["Python 3.8 dropped from CI/CD; several torch.onnx.export options deprecated"]),
dict(v="2.6", d="2025-01-29", c="3,892 commits, 520 contributors", h=["torch.compile on Python 3.13", "torch.compiler.set_stance", "AOTInductor enhancements; FP16 on x86 CPUs", "torch.load defaults to weights_only=True (security)"], dep=["No more Conda packages (official Anaconda channel deprecated)"]),
dict(v="2.7", d="2025-04-23", c="", h=["NVIDIA Blackwell support", "PyTorch-native Context Parallel", "Mega Cache", "FlexAttention for inference and on x86 CPUs; prologue fusion in Inductor"], dep=["torch.onnx.dynamo_export deprecated", "XNNPACKQuantizer moved to ExecuTorch"]),
dict(v="2.8", d="2025-08-06", c="", h=["torch::stable::Tensor (a stable C++ ABI for extensions)", "Inductor CUTLASS backend; graph partition for CUDA graphs", "Safetensors support in Distributed Checkpointing", "Hierarchical compilation; control-flow operator library"], dep=["torch.ao.quantization deprecated (use torchao)", "torch.onnx.export dynamo=False deprecated"]),
dict(v="2.9", d="2025-10-15", c="", h=["Stable libtorch ABI updates for C++/CUDA extensions", "Symmetric memory for multi-GPU kernels", "Choose error or resume on graph breaks", "Wheel variants for ROCm, XPU and CUDA 13; torch.onnx.export uses dynamo=True by default"], dep=["torch.export.export_for_training deprecated and deleted", "torchaudio removes the features deprecated in 2.8 (its maintenance phase)"]),
dict(v="2.10", d="2026-01-21", c="", h=["torch.compile on Python 3.14 (3.14t experimental)", "Combo-kernels horizontal fusion in Inductor", "varlen_attn() for ragged and packed sequences", "DebugMode for tracking dispatched calls; compile respects deterministic mode"], dep=["torch.jit (TorchScript) gets deprecation warnings: use torch.compile or torch.export", "ONNX exporter: dynamo=True with no fallback"]),
dict(v="2.11", d="2026-03-23", c="", h=["Differentiable collectives", "FlexAttention with a FlashAttention-4 backend on Hopper and Blackwell", "Broad MPS (Apple Silicon) operator expansion", "RNN/LSTM GPU export; XPU graphs"], dep=["PT2E quantization removed from PyTorch, moved to torchao", "torch.onnx.export fallback parameter removed; MAGMA backend deprecated"]),
dict(v="2.12", d="2026-05-13", c="", h=["Batched linalg.eigh on CUDA up to 100x faster", "torch.accelerator.Graph: one graph-capture API across CUDA, XPU and out-of-tree backends", "torch.export.save supports MX quantization formats", "Fused Adagrad; torch.cond inside CUDA graphs"], dep=["CUDA 12.8 builds deprecated in favour of 13.0", "inline_inbuilt_nn_modules Dynamo config deprecated (inlining is the default)"]),
dict(v="2.13", d="2026-07-08", c="", h=["FlexAttention on Apple Silicon (MPS), up to about 12x over SDPA on sparse patterns (release-note figure; inference only, and not reproduced on an M1 Pro in float32 by the Making training fast child page)", "nn.LinearCrossEntropyLoss: fused output layer and loss, up to 4x lower peak memory (release-note figure; at 2.14.1 it chunks only with options=LinearCrossEntropyOptions())", "torchcomms, a new communications backend; FSDP2 can overlap reduce-scatter and all-gather (opt-in)", "CuTeDSL backend for Inductor (prototype); Python 3.15 wheels"], dep=["Creating quantized dtypes (quint8, qint8, qint32) deprecated", "Custom ops whose output aliases an input deprecated under compile"]),
dict(v="2.14", d="2026-09-02", c="", h=["NVGEMM: CuTeDSL-generated CUTLASS GEMMs in Inductor with epilogue fusion and NVFP4", "torch.switch; torch.while_loop capturable in CUDA graphs; @dynamic_spec for compile and export", "Preview of a rewritten NCCL backend (from torchcomms); fault tolerance in c10d with a Flight Recorder for any backend", "Native linear algebra on Apple Silicon (SVD, eigh, QR, Cholesky)"], dep=["TorchScript APIs now raise a visible FutureWarning", "Profiler with_modules deprecated"]),
]
for r in REL: r["url"] = R + r["v"] + ".0"

# Ecosystem events for the second lane: (date, label, kind, source). kind: born, release, status, foundation
EV = [
("2024-04-16", "torchtitan's first PyPI release (0.0.2)", "born", "https://pypi.org/project/torchtitan/#history"),
("2024-04-24", "torchtext: last release (0.18.0); repository later archived", "status", "https://github.com/pytorch/text"),
("2024-09-30", "TorchServe: last release (0.12.0); later limited maintenance and archived", "status", "https://github.com/pytorch/serve"),
("2024-10-07", "Accelerate 1.0.0", "release", "https://pypi.org/project/accelerate/#history"),
("2025-04-07", "torchtune: last release (0.6.1)", "status", "https://pypi.org/project/torchtune/#history"),
("2025-05-15", "PyTorch Foundation becomes an umbrella: vLLM and DeepSpeed join (the source gives the month, May 2025; drawn mid-month)", "foundation", "https://pytorch.org/blog/pytorch-foundation-in-2025-a-year-in-review/"),
("2025-07-15", "torchtune: active development stops (issue #2883)", "status", "https://github.com/meta-pytorch/torchtune/issues/2883"),
("2025-07-26", "Composer: last release so far (0.32.1)", "status", "https://pypi.org/project/mosaicml/#history"),
("2025-10-17", "ExecuTorch 1.0.0", "release", "https://pypi.org/project/executorch/#history"),
("2025-10-22", "Ray joins the PyTorch Foundation", "foundation", "https://www.linuxfoundation.org/press/pytorch-foundation-welcomes-ray-to-deliver-a-unified-open-source-ai-compute-stack"),
("2026-01-26", "Transformers 5.0.0", "release", "https://pypi.org/project/transformers/#history"),
("2026-03-23", "torchaudio 2.11.0, the release that works with every future torch", "status", "https://github.com/pytorch/audio"),
("2026-03-30", "TRL 1.0.0", "release", "https://pypi.org/project/trl/#history"),
("2026-04-03", "Helion 1.0.0", "release", "https://pypi.org/project/helion/#history"),
("2026-04-07", "Helion and Safetensors join the foundation; ExecuTorch becomes part of PyTorch Core", "foundation", "https://pytorch.org/blog/pytorch-conference-europe-2026-a-landmark-moment-for-open-source-ai-in-paris/"),
("2026-08-07", "NeMo 3.0.0: the NeMo repository is now speech only", "status", "https://github.com/NVIDIA-NeMo/Speech"),
("2026-09-03", "torchtitan 0.3.0 (TitanRL added in 2026/08)", "release", "https://github.com/pytorch/torchtitan"),
]

# Old API or library -> what replaced it (each with the version or date and the source)
REPL = [
("functorch", "torch.func", "2.0", "https://github.com/pytorch/pytorch/releases/tag/v2.0.0"),
("torch.distributed.pipeline", "torch.distributed.pipelining", "deprecated 2.3, new API 2.4", "https://github.com/pytorch/pytorch/releases/tag/v2.4.0"),
("FSDP1 FullyShardedDataParallel", "FSDP2 fully_shard (DTensor per parameter)", "2.4; FSDP1 still ships at 2.14 with no deprecation notice", "https://github.com/pytorch/pytorch/releases/tag/v2.4.0"),
("torch.backends.cuda.sdp_kernel", "torch.nn.attention.sdpa_kernel", "2.3", "https://github.com/pytorch/pytorch/releases/tag/v2.3.0"),
("torch.ao.quantization (eager, FX, PT2E)", "torchao (quantize_, PT2E in torchao)", "deprecated 2.8, PT2E removed 2.11", "https://github.com/pytorch/pytorch/releases/tag/v2.11.0"),
("TorchScript (torch.jit.script/trace)", "torch.compile (speed) and torch.export (deployment)", "warnings 2.10, FutureWarning 2.14", "https://github.com/pytorch/pytorch/releases/tag/v2.14.0"),
("TorchScript ONNX exporter", "torch.onnx.export(dynamo=True), built on torch.export", "default 2.9, fallback gone 2.11", "https://github.com/pytorch/pytorch/releases/tag/v2.9.0"),
("torch.load full pickle by default", "weights_only=True by default; safetensors for sharing", "2.6", "https://github.com/pytorch/pytorch/releases/tag/v2.6.0"),
("torchtune", "torchforge, now paused; LLM training consolidated in torchtitan", "2025-07-15; forge README 2026", "https://github.com/meta-pytorch/forge"),
("NeMo 2 (LLM side)", "Megatron Bridge, NeMo AutoModel, NeMo RL", "deprecated from 25.11", "https://docs.nvidia.com/nemo-framework/user-guide/25.09/changelog.html"),
("torchtext", "Hugging Face tokenizers and datasets (no successor named by PyTorch)", "archived", "https://github.com/pytorch/text"),
("TorchServe", "no successor named; for LLMs see vLLM or SGLang", "archived", "https://github.com/pytorch/serve"),
]
