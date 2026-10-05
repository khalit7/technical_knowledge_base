# Sources, scripts and outputs: Profiling, benchmarking and correctness

Build: `sh build.sh` writes `../index.html` from `parts/` (same assembly as the siblings). Reproduce everything: `sh run_all.sh` (Docker image `kb-gpu-lab:1`, uv, an MLX Python as `MLXPY`, html_utils' node_modules).

- `code/ncu_extract.sh` (inside kb-gpu-lab:1, Nsight Compute 2026.3.1, compute-sanitizer 2026.3.0, no GPU): help text, `--list-sets/sections/rules`, and `ncu --import` (details, raw CSV, SASS source, session) of the six sample reports NVIDIA ships in `extras/samples` (profiled by NVIDIA on an RTX A4500, October 2023); a deliberately bad kernel run under ncu and compute-sanitizer without a GPU (both refuse). Outputs `out/ncu/`. Section files and sample sources copied to `inputs/ncu_sections/`, `inputs/ncu_samples/`.
- `code/check_metric_names.sh`: every metric name the page cites against `ncu --query-metrics --chip` for ga100, gh100, gb100, gb202 -> `out/ncu/metric_names_checked.txt` (the full lists, about 1 MB each, are not kept).
- `code/parse_ncu.py`: parses the details text into `out/ncu_reports.json` (values copied, nothing computed).
- `code/measure_timing.py`, `code/measure_warmup.py`, `code/run_timing.sh`: PyTorch 2.14.1 on the M1 Pro GPU (MPS): async timing four ways, launch-bound tiny op, hot/cold cache, 300-timing distributions, a line-by-line port of `triton.testing.do_bench`, warm-up in 9 fresh processes. Three runs: `out/timing_run_{1,2,3}.json`, `out/warmup_run_*.jsonl`; load averages recorded (4.3 to 4.7). MPS refuses event pairs that land in one command buffer; the port adds a synchronise before each start event (said on the page).
- `code/profile_torch.py`: torch.profiler on a small MLP training step, CPU and MPS (CPU activity only: 2.14.1 has no MPS activity) -> `out/torch_profiler.json`.
- `code/numerics.py`: finfo and assert_close defaults, accumulation error against K, summation orders and split-K, simulated atomic orders, fp16/bf16 MPS matmul against float64, FP8 scaling -> `out/numerics.json`. `code/atomics_mlx.py`: float atomics on the M1 GPU (MLX 0.32.3) -> `out/atomics.json`.
- `code/reference.py`: independent Python reference (PyTorch casts) for the page's float model -> `out/expected.json`; `check/check_js.mjs` compares `parts/24_js_fp.js` with it (2,099 values, 0 mismatches).
- `code/summarize.py`: everything the page shows -> `out/data.json` and `parts/22_js_data.js` (`window.PCD`).
- `check/check_embed.py`: the page embeds exactly `out/data.json`; 10 plain-text prose claims recomputed; privacy scan. `check/check_page.mjs` (from the repo root): every control at 390 px dark and 920 px light, errors, NaN, sideways scroll, and every `data-v` number in the prose equal to its data value.
- `inputs/doc_quotes.txt`: every documentation quote with URL and date; `inputs/triton_do_bench.txt`: the do_bench source read; `inputs/cited_metrics.txt`.
- `live.md`: the old Notion page verbatim (copy of the parent's `read/old/05_profiling.md`, fetched 2026-09-22; re-fetched 2026-10-05, unchanged); `coverage.json`: its 38 claims with verdicts (3 corrected, 2 dropped). `viz_ideas.md`.

Parts: `20_read.html` (wrapper, CSS, nav), `20_read_a` to `20_read_g` (one screen, sections 1 to 6), `21_js_rd_common.js` (RD helpers and animation controller, copied), `22_js_data.js` (generated), `23_js_charts.js` (MC charts, copied), `24_js_fp.js` (float model), `25` timing animation, `26` benchmark charts, `27` profiler trace, `28` report walk and metric anatomy, `29` numerics and summation animation, `30` fills prose numbers, `31_*` Report reader, `32_*` Numerics lab, `39_tab_more.html`.

Departures from the child-page method: none of substance. The page is about 301 KB because the Report reader embeds NVIDIA's six reports (about 105 KB of data).
