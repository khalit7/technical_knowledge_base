# The compiler stack: sources, scripts, outputs

`sh build.sh` writes `../index.html` from `parts/`. `sh run_all.sh` reproduces every output and runs the checks. No NVIDIA GPU was used anywhere: everything was compiled, or run on the CPU, inside Docker on an Apple M1 Pro laptop.

Images: `kb-gpu-lab:1` (the parent's, `../../src/compile/image/Dockerfile`: CUDA 13.4.2 toolkit for Linux arm64, nvcc V13.4.92, Triton 3.8.0, torch 2.14.1+cpu; image id `sha256:072ecc4d24a3...`) and `kb-gpu-lab-cs7:1` (`code/image/Dockerfile`: the same plus `python3-dev`, because Inductor's CPU back end compiles C++ that includes `Python.h`). cuTile Python 1.6.0 is pip-installed into a throw-away container by `code/run_tile.sh`.

## Code (`code/`)
- `nvcc_stages.sh`: the row softmax (the root's `k5_softmax.cu`, mounted read-only) through `nvcc --dryrun` (sm_90a, sm_90, sm_100f) and `--keep`; fat binaries for eight flag sets (`cuobjdump -lelf -lptx`); the root's kernels (vector add, FP8 mma.sync, wgmma, tcgen05, TMA plus cluster) for fourteen targets including `a` and `f` variants; ptxas -O0 to -O3; Triton's bundled ptxas 12.9 on CUDA 13.4 PTX; e^x four ways and inline PTX (`cu/`); template symbols; SASS with encodings (`nvdisasm -hex`) and live ranges (`-plr`) for six kernels; the `-arch=sm_90a` wgmma trap and its two fixes -> `out/nvcc/`.
- `nvrtc_demo.cpp`, `run_nvrtc.sh`: NVRTC from a C++ program: cubin and PTX, timings (7 runs), a specialised kernel, lowered template names, the missing-include error; the runtime error enum from `driver_types.h` -> `out/nvrtc/`.
- `tile_export.py`, `run_tile.sh`: cuTile Python -> Tile IR bytecode -> `tileiras` -> cubins for sm_80, sm_90, sm_100, sm_120 -> `out/tile/`.
- `tc_programs.py`, `run_tc.sh`, `run_tc2.sh`: torch.compile on the CPU with `TORCH_LOGS` (graph_code, guards, graph_breaks, bytecode, recompiles, dynamic, aot_graphs, fusion, output_code), `torch._dynamo.explain`, `fullgraph=True`, recompilation timings, compile latency cold and warm (3 runs each), mode options; Inductor's GPU code via the Triton page's stand-in driver (`inductor_tg.py` method) -> `out/tc/`.
- `sass_decode.py`: decodes the 21 control bits of every instruction (Jia et al. 2018 layout) and checks them against the code: every register written under a write scoreboard must be waited for before use; plus a negative control with the field shifted -> `out/sass.json`.
- `compat.py`: the documented driver rules (which image loads on which GPU) as code; 660 cases -> `out/compat_expected.json`.
- `build_data.py`: `out/` -> `parts/22_js_data.js` (`window.CSD`, `window.CSC`), paths cleaned; also reads the root's opcode table (`../../src/compile/inputs/sass_opcodes.json`) and `inputs/`.

## Inputs (`inputs/`)
- `pytorch_v2.14.0_build_env_setup.py`: PyTorch's wheel architecture table, fetched from GitHub (tag v2.14.0) on 2026-10-05.
- `triton_attn_sm_90a_ptx_head.txt`: the first lines of the Triton page's compiled PTX (its `run_all.sh` makes the file).

## Checks (`check/`)
- `check_embed.py`: the page embeds exactly the data rebuilt from `out/`; 27 prose numbers agree with it; privacy patterns absent.
- `check_js.mjs`: the Will it run? logic against `compat.py`: 660/660.
- `check_ui.mjs`: every control in every tab at 390 px dark and 920 px light (no errors, NaN, undefined, sideways scroll), screenshots in `../.shots/`. `shots.mjs`, `smoke.mjs`, `wide.mjs`: helpers used while building.

## Departures from the child-page method
- A new page: no old Notion text, so no `live.md`; `coverage.json` instead records how this page reconciles with the root's section 8 and Compiler explorer.
- No timings of GPU code at all (no NVIDIA GPU, and Metal has nothing to say about ptxas). The only timings are CPU-side: NVRTC compiles and torch.compile's compile latency, labelled with load.
- The scoreboard decoding is independent reverse engineering (Jia et al.), shown as such, and validated here rather than trusted.

## Not committed (`.gitignore`)
cubins and `out/sass.json` (regenerated in seconds by `run_all.sh`).
