# Kernel lab tab (t-lab): sources, scripts, outputs

Owner files: `../parts/33_tab_lab.html` (HTML, CSS scoped under `#t-lab`), `../parts/33_js_lab_0data.js` (generated, `window.LABD`), `33_js_lab_1core.js` (helpers, `LABX.calc`, animation controller), `33_js_lab_2soft.js` (setup, softmax ladder, passes animation), `33_js_lab_3mm.js` (matmul ladder), `33_js_lab_4fuse.js` (fused softmax + matmul), `33_js_lab_5attn.js` (online softmax animation, attention chart), `33_js_lab_6rest.js` (H100 table, Triton side, method, interview questions). Ids and classes start with `lab-`.

## What is real
- `code/k_softmax.py`, `code/k_matmul.py`, `code/k_fused.py`: the Metal kernel bodies, shown verbatim on the page and timed by `code/lab_m1.py` on the Apple M1 Pro GPU through `mx.fast.metal_kernel` (MLX 0.32.3). Every kernel is checked against a float64 NumPy reference at the measured size before timing. Three full runs: `out/run_{1,2,3}.json` and logs.
- `triton/lab_tl.py`: the same operations in Triton. `triton/interp_check.py` runs them with `TRITON_INTERPRET=1` on the CPU against PyTorch (`out/triton_interp.json`); `triton/compile_lab.py` compiles them for sm_80 and sm_90a without a GPU and counts PTX/SASS instructions (`out/triton_compile.json`; PTX, cubin and SASS text in `out/triton/`, not embedded). Both run in the `kb-gpu-lab:1` image of `../compile/image/`.
- `code/gen_data.py` merges the runs (median of the three run medians; min and max over all trials), the Triton results, the kernel sources and the Roofline lab ceilings (`../../../topic_hardware/src/roof/out/data.json`) into `out/data.json` and `../parts/33_js_lab_0data.js`.
- `code/recompute.py` is the Python reference for every derived number (`out/expected.json`); `check/check_js.mjs` checks the page's JavaScript against it, that the page embeds exactly `out/data.json`, and the hand-written numbers in the HTML; `check/check_page.mjs <dir>` clicks every control at 390 px dark and 920 px light.
- Reproduce: `MLXPY=<python with mlx> sh run_all.sh`, then `sh ../build.sh` and the two checks.

## Notes
- The pass counts of the eager-softmax and library cases (metadata, not measurements) were corrected in the three run files after the runs: eager is 5 reads and 3 writes; the library's are not known, so none is stated.
- Nothing here ran on an NVIDIA GPU. H100 figures on the tab are vendor specs (NVIDIA H100 page), independent measurements (SemiAnalysis) and paper abstracts (FlashAttention-2 and -3), each labelled, plus our arithmetic marked derived.
- Two bugs are kept as lessons on the page: the matrix-instruction matmul without loop unrolling (about 34 times slower), and a `simdgroup_barrier` that let 1 to 5 rows of 4,096 come out wrong at random (fixed with threadgroup barriers; cause not established).
