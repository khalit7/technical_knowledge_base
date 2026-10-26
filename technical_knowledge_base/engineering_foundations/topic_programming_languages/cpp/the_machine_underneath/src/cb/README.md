# Measurements for "C++: the machine underneath" (part key `cb`)

Copied unchanged from the C++ page's `src/cb/` (Part 2 of the old combined page) on 2026-10-26; only `check/check_ui.mjs` was adapted (repo found with `git rev-parse`, tabs `t-read` and `t-more`, tab opened by clicking its button). Element ids on the page start with `cb-`.

## Reproduce
- `bash run_all.sh` rebuilds every program into the scratchpad (`$B` in `code/env.sh`; nothing big in the repo) and writes `out/` (about 15 minutes; timings 3 runs each with the load average).
- `python3 gen_data.py` turns `out/` and `code/` into `../parts/40_js_cb_0data.js` (`window.CB`). The page shows no measured number that is not in it.
- `sh ../build.sh`, then `python3 check/check_embed.py` (the page embeds exactly the recorded outputs and sources) and `node check/check_ui.mjs <shots dir>` (every control at 390 px dark and 920 px light; errors, NaN, unfilled values, sideways scroll).

## Facts and choices
- Machine: Apple M1 Pro, macOS 27.0.1, in normal use (load average 5 to 12 during runs). Versions in `versions.txt`.
- Exact dot-product sum 402,653,161.75: computed in Python by periodicity (period 221 = 17 x 13) on the same inputs as `dot.cpp`.
- Latencies (fmadd/fmla/fmul 4, fadd/faddp 3, 4 FP units) from Dougall Johnson's Firestorm tables (fetched 2026-10-05). Clock 3.2 GHz inferred from the measured fadd chain (3.18 GHz).
- Not run: Instruments/xctrace (hung even for `xctrace version`), `sample` (could not attach), Linux perf (not Linux). The page says so and shows `/usr/bin/time -l` counters instead.
- `mmap` run 1 found the 512 MB test file evicted from the page cache (major faults, 0.9 s); runs 2 and 3 were warm. Kept and shown.
- llama.cpp excerpts from the pinned commit 8e1642198dcd4e408f8776222d6ae31b74d01187 (`code/llama_excerpts.sh`).
- `coverage.json` is the 2026-10-05 migration record of the old Notion page "C++: zero to expert"; its "Reading N" refers to the old Part 2 numbering (old 4 pages, 10 allocation, 11 profiling, 12 ABI, 13 GPU are now 4, 3, 10, 11, 12; old 14 "Common mistakes" was folded into the core and the In one screen table).
- The hardware root's Roofline lab copies the medians of `out/roof_*.txt` into its own `src/roof/code/gen_data.py`; if these runs are redone, update it.
