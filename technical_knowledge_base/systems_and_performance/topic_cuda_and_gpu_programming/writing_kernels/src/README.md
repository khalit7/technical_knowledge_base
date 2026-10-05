# Writing kernels: sources, scripts, outputs

Page: `../index.html`, built by `sh build.sh` from `parts/`. Reading (`20_read*.html`, `23_js_rd.js`), Reduce and scan, animated (`31_*`), Attention schedules (`32_*`), Kernel bench (M1) (`33_*`), Compiled for NVIDIA (`34_*`), Further reading (`39_tab_more.html`). Scaffold copied from the topic root (`01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`).

## What is real
- `m1/`: Metal kernel bodies (`k_reduce.py`, `k_scan.py`, `k_norm.py`, `k_fuse.py`, `k_gemv.py`, `k_attn.py`; the attention kernel extends the root's Kernel lab kernel with causal and grid switches) and `measure.py`, which checks every kernel against float64 NumPy and times it on the Apple M1 Pro GPU through MLX 0.32.3 (`mx.fast.metal_kernel`). Three full runs `m1/out/run_{1,2,3}.json` (+ logs), the power-of-two experiment `m1/out/camp_{1,2,3}.json`, and `m1/out/side_experiments.txt` (debugging checks quoted on the page).
- `cuda/`: the same patterns in CUDA C++ (`kernels/`), compiled for sm_80, sm_90a and sm_120 in the topic root's `kb-gpu-lab:1` image (CUDA 13.4.2) by `compile_all.sh`; `sass_stats.py` reads `ptxas -v` and `cuobjdump -sass` into `cuda/out/stats.json`. Raw SASS dumps are git-ignored and regenerated.
- `inputs/`: verbatim extracts of sources read on 2026-10-05 (Harris's deck, PyTorch, vLLM, flash-attention, cublasLt.h and compute-sanitizer from the toolkit).
- `gen_data.py` merges everything into `out/data.json` and `parts/22_js_data.js` (median of the three run medians; min and max over all trials). `recompute.py --fill` derives every number the prose states (`out/expected.json`) and writes it into the `<span data-wk>` tags. `tree_model.py` and `fa_model.py` are independent Python versions of the two animated tabs' models.
- Checks: `node check/check_js.mjs` (page models against Python), `python3 check/check_embed.py` (page embeds exactly `out/data.json`, prose numbers equal `expected.json`, no private paths), `node <this folder>/check/check_page.mjs <page folder> <out dir>` from the repo root (every control at 390 px dark and 920 px light).
- Reproduce: `MLXPY=<python with mlx> sh run_all.sh` (see its header).

## Departures from the topic-page method
None of substance: Reading organised by pattern (reduce, scan, normalise, matmul, fuse, decode, attention, testing); one tab per standalone visual. The Kernel lab of the topic root owns the softmax, matmul and attention ladders on the M1; this page extends them rather than repeating them.

## Not run here
Nothing ran on an NVIDIA GPU. Decoupled look-back was not run (no forward-progress guarantee on Metal). The cause of the S = 8 split-KV slowdown is not established.
