# Roofline lab (tab `t-roof`, part key `roof`)

Owner files: `../parts/33_tab_roof.html` (HTML and CSS scoped under `#t-roof`), `../parts/33_js_roof_0data.js` (generated), `../parts/33_js_roof_1core.js` (model and chart; `window.ROOFX`), `../parts/33_js_roof_2lab.js` (lab, tables, MFU, predict-then-check), `../parts/33_js_roof_3anim.js` (batch-sweep animation). Element ids start with `roof-`.

## Reproduce
- Build a Python with MLX outside the repo (`uv venv --python 3.12 <scratch>/mlxenv && uv pip install --python <scratch>/mlxenv/bin/python mlx numpy`), then `MLXPY=<scratch>/mlxenv/bin/python sh run_all.sh`: three full runs of `code/roof_gpu.py` (about 2 minutes each) into `out/run_*.json`, then `code/gen_data.py` (writes `../parts/33_js_roof_0data.js` and `out/data.json`) and `code/recompute.py` (Python reference; writes `out/expected.json`).
- `sh ../build.sh`, then `node check/check_page.mjs <shots dir>` (the page's JS reproduces all 261 test vectors from `recompute.py`, embeds exactly `out/data.json`, and every control works at 390 px dark and 920 px light) and `python3 check/check_prose.py` (hand-written numbers in the HTML against the data).

## Facts and choices
- Machine: Apple M1 Pro, 16-core GPU (applegpu_g13s), 16 GB, macOS 27.0.1; MLX 0.32.3, numpy 2.5.3, Python 3.12.11 (`out/versions.txt`). Laptop shared with other jobs: load average 3.5 to 4.8 during the runs; the GPU showed short bursts from other processes, visible as single slow trials (copy, vector add).
- Every custom kernel is checked against NumPy before timing (read sum, copy, naive and tiled matmul, attention decode against a float32 reference).
- Peak kernel: 16 independent scalar FMA chains per thread, body unrolled 8 times. The first version (loop not unrolled) reached 2.2 TFLOP/s; kept as a measured lesson case. A `simdgroup_matrix` peak kernel was tried and rejected: the compiler hoisted the loop-invariant product and reported an impossible 14 TFLOP/s.
- Bandwidth roof = the stream copy (165 GB/s). The batch-1 matrix-vector product reads at 168 GB/s, 2% above it: a measured roof is a lower bound on the true one, said on the page.
- bf16 peak on the M1 is taken equal to fp16 (same ALUs); MLX's bf16 matmul is slower and that is shown in the kernel table.
- MLX's kernel choice (batch 1 to gemv, batch 2+ to the tiled GEMM on GPU generation < 15) read from `mlx/backend/metal/matmul.cpp` at tag v0.32.3, `Matmul::eval_gpu` and `gemv_wide_config`.
- No GPU performance counters were read (no Instruments/Metal counters run), so "limited by" is a reading from the roofline, said on the page.
- M1 Pro CPU roof: medians of the three runs of `roof.cpp` on the C++ page (`engineering_foundations/topic_programming_languages/cpp/src/cb/out/roof_*.txt`), copied into `gen_data.py`.
- Vendor specs: all fetched 2026-10-05, URLs in `gen_data.py` and on the page; also in the shared FACTS file of this build. B200 per GPU = HGX B200 8-GPU totals divided by 8, BF16 36 PF read as sparse like the FP8 row.
