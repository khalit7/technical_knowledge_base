# The llama.cpp measurements (part key `cl`)

Copied with `cp -R` on 2026-10-26 from the C++ page's `src/cl/` (Part 3) into this child page; the C++ page keeps its own copy until its essentials rebuild.

Feeds `../parts/50_js_cl_0data.js` (`window.CL`), read by `50_js_cl_1core.js` to `55_js_rlc_hero.js`. Everything sits in the Reading tab (`t-read`): sections `#cl-s0` to `#cl-s13` and `#cl-notes`; element ids start with `cl-`, `tr-` (the code tour, section 13), `qb-` (the quant block, section 10), `rn-` (the raw outputs in How this was run).

## Reproduce
- `bash run_all.sh`: builds the pinned llama.cpp (8e1642198dcd4e408f8776222d6ae31b74d01187) in the session scratchpad, downloads the model if missing (sha256 checked), runs every program and writes `out/` (about 4 minutes after the download).
- `python3 gen_data.py`: turns `out/` and `code/` into `../parts/50_js_cl_0data.js` (`window.CL`), asserting the derived identities (KV size formula, 16 chunks per product, vec_dot count = 2 x 52,800 rows).
- `sh ../build.sh`, then `python3 check/check_embed.py` (page embeds exactly the recorded outputs and the clone's lines; every reference resolves) and `node check/check_ui.mjs <outdir>` (every control at 390 px dark and 920 px light; pass an output folder in your scratch space). `node check/shots.mjs <tab> <width> <scheme> <selector>` screenshots pieces.

## Code
- `code/gguf_read.py` (41 lines, standard library), `code/gguf_tensors.py`, `code/quant_demo.py` (real block bytes, Q8_0/Q4_0 reference algorithms in Python; requantised Q8_0 reproduces the stored bytes).
- `code/instrument.py`: adds call counters to a copy of the clone (never the clone itself). `code/threadpool_offsets.sh`: compiles ggml-cpu.c's threadpool struct (by line range) and prints field offsets. `code/features.cpp` (+ `features_bad.cpp`): four C++ features as llama.cpp uses them. `code/repo_map.py`, `code/excerpts.py` (every excerpt by file and line range).

## Findings worth passing on
- On this M1 with the default build, `ggml_vec_dot_q8_0_q8_0` and `ggml_vec_dot_q4_0_q8_0` run 0 times: weights are repacked at load and `ggml_gemv/gemm_*_4x4_q8_0` do all products (3,376 gemv calls per token = 211 x 16 chunks). With `--repack 0`, single-row products go through vec_dot and prompt products through llamafile's tinyBLAS (CPU) or Accelerate (BLAS backend, 302 splits for a 64-token prompt).
- `GGML_CACHE_LINE` is 64 but the M1 line is 128 bytes (Part 2): the threadpool's `n_graph`/`n_barrier` and `n_barrier_passed`/`current_chunk` share 128-byte lines. Cost not measured.
- `model type = 256M` for a 135M model: the label comes from the layer count (30 layers = SmolDocling).
- Benchmarks ran under load average 11 to 18; 8 threads collapse (barrier per op). Medians and all samples are shown with the load.

## Departures
The old Part 3 tabs (Code tour, Quant blocks, Run it) now live inside the Reading tab; see `../README.md`.
