# Coverage of the old page (parent src/read/old/model_formats.md, saved 2026-10-08)

Every claim of the old page, with what this page does with it. R = Reading section.

| Old claim | Verdict | Where now / correction |
|---|---|---|
| Format = layout, metadata, whether loading runs code; container vs quantization scheme vs compiled artifact | kept | R s0 "three layers" |
| Comparison table (11 rows) | verified, corrected | R s0 table, rows revised: GGUF "can loading run code" now notes parser and template CVEs; ONNX row adds ONNX Runtime GenAI; Keras row adds CVE-2024-3660/CVE-2025-1550; LiteRT adds .litertlm; MLX modes added; HF repo row adds trust_remote_code |
| MLX "generally beats llama.cpp Metal on tokens per second" | moved | measured comparison is owned by Local and on-device inference; not restated here |
| Pickle REDUCE calls arbitrary callables | verified | R s2, with a real disassembly and a harmless demonstration |
| CVE-2025-32434 (CVSS 9.3, fixed in 2.6) | verified | R s2: CVSS v4 9.3, torch < 2.6.0, published 2025-04-17/18 |
| "for two years the recommended-safe path was not safe" | softened | "for years": the advisory does not date the bug's introduction |
| transformers refuses .bin on older torch | verified, dated | added in transformers 4.52.0 (2025-05-20), check_torch_load_is_safe |
| safetensors layout: 8-byte u64 LE length, JSON, buffer | verified | R s3, real bytes |
| BLOOM 10 min to 45 s on 8 GPUs | verified as vendor claim | R s3, labelled vendor (safetensors README) |
| Header capped at 100 MB | verified | tensor.rs L10 MAX_HEADER_SIZE = 100_000_000 |
| fastsafetensors reads into GPU memory with GDS | verified | R s3: 4.8x to 7.5x, 26.4 GB/s (authors) |
| safetensors carries no architecture/tokenizer/template | kept | R s1, s3, s8 |
| GGUF: one file, typed KV metadata, key examples | verified | R s4, real file |
| "llama.cpp starts a 40 GB model in under a second" | dropped (unconfirmed) | replaced with our measurement: Qwen3-4B Q4_K_M mmap 0.97 s vs 1.31 s read, warm cache (R s10) |
| Per-tensor types are the basis of K-quant S/M/L | verified | R s4: Q4_K_M file = 168 Q4_K + 29 Q6_K + 113 F32 |
| GGUF self-containment removes template drift | corrected | R s4: a third-party GGUF in our store carries a rewritten chat template and one stop id fewer than upstream; check templates |
| Ternary 1.585 bits; five-trit packing 1.625 | corrected wording | pure five-trit packing is 8/5 = 1.6; BITCOS says it "rounds up to 1.625" with power-of-two groups; TQ1_0 is 1.6875 with its scale |
| BITCOS 51.5%, 2 - z bits, 26 of 29, 1.485 bits, AVX-512/AVX2/Xe2 | verified | R s4 (authors' claims); speedups 1.18x CPU, 1.27x Xe2 GPU added |
| Hub caps at 50 GB | corrected | Hub: files under 200 GB recommended, 500 GB hard limit (storage-limits docs); 50 GB is transformers v5's default max_shard_size |
| gguf-split naming, first shard discovers the rest, no index file | verified by running | R s4 split run |
| GGUF replaced GGML (Aug 2023), KV block plus versioning | verified, dated | PR #2398 merged 2023-08-21; GGML/GGMF/GGJT lineage |
| New architectures need converter support; lag | kept | R s4 |
| Conversion one-way in practice | kept | R s9 |
| ONNX: opset pins semantics | verified | R s6, Versioning.md quote |
| ONNX fails for frontier decoders (dynamic shapes, stateful KV, custom kernels, scheduler) | kept, qualified | R s6: measured export has no KV cache; ONNX Runtime GenAI does run LLMs with a KV cache (Foundry Local, Windows ML) |
| TensorRT plan valid only for GPU arch, TensorRT version | verified, qualified | R s7: default behaviour; hardware and version compatibility modes since TensorRT 8.6 |
| "an SM90 plan will not load on SM120" | dropped | not in the docs as such; covered by the device rule |
| TensorRT-LLM PyTorch-first | verified, updated | default since v1.0.0 (2025-09-24); trtllm-build removed on main 2026-07-14, still in v1.2.1 |
| ExecuTorch 1.0, .pte flatbuffer, .ptd | verified | R s7 (announced 2025-10-22; latest 1.5.1) |
| Core ML .mlpackage, .mlmodelc, only way to the ANE | verified | R s7 ("only public route"); MLX does not use the ANE |
| OpenVINO IR .xml + .bin, NNCF | verified, corrected | reads ONNX/TF/TFLite/Paddle directly; PyTorch via convert_model |
| TF SavedModel, .keras zip | verified | R s7 |
| TFLite renamed LiteRT in 2024 | verified | 2024-09-04 |
| HF repo layout | verified | R s8, real listing |
| Mermaid conversion map | rebuilt | Conversion map tab with runs |
| "safetensors to GGUF at F16 or BF16 preserves the numbers exactly" | corrected (measured) | BF16: exact; F16: 120,378 of 751.6M values changed (R s1, s9) |
| Practical routes (convert then quantize; llm-compressor; TRT-LLM direct) | verified, run | R s9, Conversion map |
| Quick chooser | kept, updated | R s11 |
| Best resources list | kept, expanded | Further reading |
| "Interactive local chat on the 5090s" | moved | Local and on-device inference owns the dual 5090 setup |

New on this page (not on the old one): what a file must hold from zero; dtype bit layouts and BF16 to F16 measured; safetensors tied-weight duplication (311 MB, 20.7% of Qwen3-0.6B's file); load-time measurement pickle vs safetensors; GGUF header anatomy (tokenizer 99.6% of the header); Q4_K and MLX block layouts decoded by hand; MLX three-tensor layout; ONNX export of Qwen3-0.6B measured; compressed-tensors; PT2 archive; parser and template CVEs; determinism of conversions; Keras CVEs; safetensors joining the PyTorch Foundation (2026-04-08); ggml.ai joining Hugging Face (2026-02-20).
