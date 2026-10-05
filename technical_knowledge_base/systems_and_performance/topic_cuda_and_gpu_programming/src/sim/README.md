# GPU simulator tab (t-sim): sources, scripts, outputs

Six in-page simulators (divergence, coalescing, shared-memory banks, occupancy, latency hiding, tiling), each with a
before/after animation on one input, and the same effects measured for real on the Apple M1 Pro GPU.
No NVIDIA GPU was used: the NVIDIA side is simulated from NVIDIA's documented rules and checked against NVIDIA's own
occupancy calculator and real `ptxas -v` output (from the Compiler explorer tab, `../compile/out/`).

- `code/measure_m1.py`: the M1 measurements (custom Metal kernels through MLX `mx.fast.metal_kernel`, each checked
  against NumPy before timing). `out/run_{1,2,3}.json` and `.log`: three full runs, 7 trials each, with load averages.
- `code/reference.py`: Python reference for every simulator; checks occupancy against `occ/occ_nvidia.csv` and writes `out/expected.json`.
- `occ/occ_check.cpp` + `code/occ_cases.py`: NVIDIA's `cuda_occupancy.h` (CUDA 13.4.2, host-only) run on 5,292 cases in the
  `kb-gpu-lab:1` container; result `occ/occ_nvidia.csv`. 0 mismatches with the reference.
- `code/gen_data.py`: `out/run_*.json` + ptxas counts + published figures -> `../parts/31_js_sim_0data.js` (the only data the tab embeds) and `out/data.json`.
- `code/check_js.mjs`: the page's simulator code (`../parts/31_js_sim_1core.js`) against `out/expected.json` (11,240 values, 0 mismatches).
- `code/check_embed.py`: the built page embeds exactly `out/data.json`, and the numbers in the prose agree with the data.
- `code/check_ui.mjs`: clicks every control at 390 px (dark) and 920 px (light); no errors, NaN, undefined or sideways scroll.
- `run_all.sh`: reproduces everything (`MLXPY=<python with mlx> sh run_all.sh`; needs Docker for the occupancy check).
- `viz_ideas.md`: ideas built and rejected.

Page parts: `../parts/31_tab_sim_{1,2,3,9}.html` (HTML and scoped CSS), `../parts/31_js_sim_0data.js` (generated),
`31_js_sim_1core.js` (simulators), `31_js_sim_2ui.js` (animation controller and helpers), `31_js_sim_3div.js` to `31_js_sim_8tile.js` (one per section).
