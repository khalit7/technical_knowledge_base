# Model formats: GGUF, safetensors, and the rest

*Added 2026-08-31, from Khalid's blog entry of 2026-08-28: "add the GGUF model format and other model formats and make a comparison between them."*

A model format answers three questions: how tensors are laid out on disk, what metadata travels with them, and whether loading the file can execute code. Most of the confusion in this area comes from conflating the **container** (how bytes are stored) with the **quantization scheme** (how numbers are compressed) with the **runtime artifact** (a compiled engine for one GPU). They are three different things, and GGUF is unusual precisely because it merges the first two.

## Best resources

- [GGUF specification](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md): the actual format, short and readable.
- [GGUF format and k-quants explained (ZeroEntropy)](https://zeroentropy.dev/concepts/gguf/): the clearest write-up of the super-block scheme.
- [safetensors repo](https://github.com/huggingface/safetensors): the format and, importantly, the threat model it was built for.
- [Which Quantization Should I Use? (arXiv 2601.14277)](https://arxiv.org/abs/2601.14277): unified evaluation of llama.cpp quantizations on Llama-3.1-8B-Instruct; the empirical answer to "which K-quant".

## The comparison

| Format | Owner / runtime | Quantization built in? | Safe to load? | Use it for |
|---|---|---|---|---|
| **GGUF** | ggml / llama.cpp, Ollama, LM Studio | Yes: the format *is* the quantization scheme (Q4_K_M and friends), per-tensor | Yes, data only | Local and edge inference, CPU or mixed CPU/GPU, aggressive low-bit |
| **safetensors** | Hugging Face; loaded by PyTorch, vLLM, SGLang, JAX | No: a container. Quantized weights live in it, but the scheme is described in `config.json` | Yes, by design: no code execution, zero-copy mmap | The default for distributing and serving weights anywhere in the HF/PyTorch world |
| **PyTorch `.bin` / `.pt`** | PyTorch (pickle) | No | **No**: pickle executes arbitrary code on load | Legacy only. Treat an untrusted `.bin` as an executable |
| **GGML** | llama.cpp, pre-2023 | Yes | Yes | Nothing. Superseded by GGUF, which added proper metadata and extensibility |
| **ONNX** | ONNX Runtime, cross-vendor | Via QDQ nodes | Yes (protobuf graph) | Portability across vendors and languages; strong for smaller models, awkward for frontier LLMs |
| **TensorRT engine (`.plan`)** | NVIDIA TensorRT-LLM | Baked in (FP8, FP4, INT4) | Yes | Peak NVIDIA throughput. Compiled per GPU architecture, batch shape, and TRT version, so it is a build artifact, not a distribution format |
| **MLX** | Apple MLX | Yes (its own 4/8-bit) | Yes | Apple silicon unified memory |
| **AWQ / GPTQ checkpoints** | vLLM, SGLang, AutoAWQ, AutoGPTQ | The scheme itself, shipped inside safetensors | Yes (safetensors container) | GPU serving at 4-bit with calibration-based quantization |

**The one-line rule**: safetensors for GPU serving in the PyTorch ecosystem, GGUF for local and CPU inference, TensorRT engines when you are squeezing an NVIDIA deployment and can afford to rebuild per environment, and never load a pickle you did not create.

## Why GGUF is the interesting one

GGUF is a single self-contained file holding the tensors, the tokenizer, the chat template, and the architecture hyperparameters as key-value metadata. That is why `ollama run` works with no Python environment, no `config.json`, and no tokenizer download: everything needed is in the file. Contrast with a Hugging Face repo, where the weights are one artifact and the tokenizer, config, and generation settings are several more that must stay in sync.

It is also **mmap-friendly and per-tensor typed**. The runtime maps the file and lets the OS page in what it needs, and a single file can hold some tensors at Q4_K, others at Q6_K, and others at F16. That per-tensor mixing is the whole basis of the K-quant scheme below.

The cost: GGUF is tied to the ggml ecosystem. Conversion is one-way in practice, new architectures need explicit support in `convert_hf_to_gguf.py`, and there is a lag between a model's release and a working GGUF.

## Reading a GGUF quantization name

The naming is the part people find opaque. `Q4_K_M` decomposes as:

- **`Q4`**: roughly 4 bits per weight.
- **`_K`**: a **K-quant**, meaning the two-level super-block scheme, as opposed to the legacy `Q4_0` / `Q4_1` / `Q5_0` / `Q5_1` / `Q8_0` formats which use a single flat scale per block.
- **`_M`**: the size variant, **S**mall, **M**edium, or **L**arge, which selects how much extra precision is spent on the sensitive tensors.

**The super-block scheme**: 256 weights form a super-block, subdivided into blocks of 16 or 32 depending on bit width. The super-block carries one FP16 scale; each inner block carries a small 4- or 6-bit sub-scale relative to it. Quantizing the scales themselves is what buys the quality over legacy quants at nearly the same bits per weight (Q4_K lands around 4.5 bits/weight once the scale overhead is counted).

**What the size variant actually changes**: llama.cpp hand-tuned a per-tensor precision allocation based on measured layer sensitivity. `Q4_K_M` stores half of the `attention.wv` and `feed_forward.w2` tensors at `Q6_K` and the rest at `Q4_K`; `Q4_K_S` uses `Q4_K` throughout. The down-projection and value tensors get the extra bits because they are empirically the most damaged by quantization.

**The IQ family** (`IQ2_XXS`, `IQ3_S`, `IQ4_NL`, ...) goes further, using an importance matrix computed from calibration data plus codebook-based quantization to stay usable at 2-3 bits. They are slower to decode than K-quants and need a calibration pass, but they are what makes very large models fit on consumer hardware at all.

**Practical guidance**: `Q4_K_M` is the standard recommendation and the right default, sitting near the knee of the quality-size curve. `Q5_K_M` if you have the memory and want to be careful; `Q6_K` is close enough to FP16 that the difference is rarely measurable; `Q8_0` is effectively lossless and mostly pointless versus just running FP16 unless you are bandwidth-bound. Below `Q4`, degradation becomes noticeable, and small models suffer disproportionately: a 70B at `Q3` usually beats an 8B at `Q8` for the same memory.

## Cross-links

- Quantization *methods* (GPTQ, AWQ, SmoothQuant, FP8, QLoRA/NF4) and the theory: [../llm-training-and-post-training/quantization-and-precision.md](../llm-training-and-post-training/quantization-and-precision.md).
- Running GGUF locally: [ollama-and-local.md](ollama-and-local.md).
- TensorRT engine building: [triton-and-tensorrt.md](triton-and-tensorrt.md).
