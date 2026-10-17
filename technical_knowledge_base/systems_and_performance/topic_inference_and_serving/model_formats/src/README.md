# Model formats: source

Build: `sh build.sh` (writes `../index.html`). Data: `python3 gen_data.py` turns `results/` into `parts/20_js_mf_data.js` (window.MF, including `MF.facts`, the numbers quoted in the prose through `<span data-mf>`). Checks: `python3 check_data.py` (the page embeds exactly a fresh build from `results/`; every data-mf key exists; numbers typed into the prose match `results/`), `node check_ui.mjs <shot dir>` (every control at 390 dark and 920 light), `sh html_utils/checkpage.sh <this folder>` from the repo root.

## Shape
A child page of Topic: inference-and-serving (`.claude/skills/explainer-page/page-kinds/topic-child.md`). Reading is organised by format, after a "three layers" frame (container, number encoding, compiled artifact) and a from-zero section on what a file must hold. Two standalone tabs: a File explorer (three real files of the same model, field by field, and every tensor), and a Conversion map (routes between formats with the runs made here). Quant-type quality is owned by Local and on-device inference (its Quant ladder tab) and linked; this page keeps to file layout.

## Runs (all 2026-10-11, Apple M1 Pro, bench lock held for every timed or heavy run; Python 3.12 venv with torch 2.14.1, transformers 5.19.0, safetensors 0.8.0, onnx 1.23.2, onnxruntime 1.31.0, onnxscript, gguf-py 0.19.0 from llama.cpp b11146; llama.cpp Homebrew 0.5.0 build 11146; mlx 0.32.3 / mlx-lm 0.32.0)
Models from the shared store (repos and revisions in its MODELS.md): Qwen/Qwen3-0.6B @ c1899de2, Qwen/Qwen3-1.7B @ 70d244cc, the Unsloth Qwen3-0.6B BF16 GGUF @ 50968a44 and files made from it, Qwen3-4B Q4_K_M (Qwen), MLX folders made here, Local's scratch Qwen3-1.7B F16 GGUF.

| script | what | output |
|---|---|---|
| scripts/parse_st.py | safetensors headers parsed by hand (struct + json), layout rules checked, cross-checked with the safetensors library | results/st.json |
| scripts/parse_gguf.py | GGUF parsed by a from-scratch reader, cross-checked with gguf-py (names, absolute offsets) | results/gg.json |
| scripts/conv_gguf.sh | convert_hf_to_gguf.py bf16 twice, f16 once; time, size, sha256 | results/conv_gguf.txt |
| scripts/cmp_gguf_st.py | every tensor of four GGUFs against the safetensors original; F16 representability of every BF16 value | results/cmp.json |
| scripts/pickle_demo.py | torch.save a tiny checkpoint, pickletools disassembly, a print-payload pickle (weights_only refusal; pickle.loads in a child process) | results/pk.json |
| scripts/tiny_st.py | the same tiny tensors as safetensors, every byte | results/tiny_st.json |
| scripts/load_bench.py | torch.load (copy, mmap) vs safetensors (load_file, one tensor), with and without touching every page; 5 reps, fresh processes, warm cache | results/lb.json |
| scripts/onnx_demo.py | export a 2-layer toy and Qwen3-0.6B to ONNX (dynamo), inspect the graph, compare ONNX Runtime with PyTorch | results/onnx_tiny.json, onnx_06.json |
| scripts/decode_blocks.py | one GGUF Q4_K super-block and one MLX 4-bit group decoded by hand; mx.dequantize check run separately in the MLX env | results/blocks.json |
| scripts/extract_fields.py | three files walked field by field for the File explorer | results/fields.json |
| scripts/mmap_bench.sh | llama-server start to ready, --load-mode mmap vs none, Qwen3-4B Q4_K_M, 4 reps | results/mmap.txt |
| (commands in the file headers) | llama-quantize re-runs, mlx_lm convert twice, llama-gguf-split split/merge, metadata comparisons, repo listing | results/quant.txt, mlx_conv.txt, split.txt, conv_meta.txt, repo_files.txt |

Large intermediates (converted GGUFs, the ONNX export, the pickle .bin) were made in the scratchpad and deleted after recording size and SHA-256.

## Sources
Fact check of 19 items (GGUF spec, safetensors, CVEs, pickle docs, Hub incidents, ONNX, TensorRT, ExecuTorch, Core ML, OpenVINO, LiteRT, MLX, Hub limits, fastsafetensors, Keras, ternary types and BITCOS, GGUF parser CVEs, compressed-tensors, PT2, ggml.ai) with URLs, quotes and dates: `inputs/research_2026-10-11.md`. llama.cpp source quoted at tag b11146 (commit 7fe450e19).

## Departures from the method
No live.md: the old page is saved verbatim in the parent's `src/read/old/model_formats.md`; corrections are in `coverage.md`.
