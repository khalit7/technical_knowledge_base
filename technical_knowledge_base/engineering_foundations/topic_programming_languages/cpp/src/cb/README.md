# Part 2 of the C++ page: "The machine underneath" (part key `cb`)

Owner files: `../parts/12_tabs_cb.html`, `../parts/40_*` to `../parts/44_*`. Tabs: `t-cb-read` (Reading), `t-cb-ladder` (Latency ladder), `t-cb-cache` (Cache simulator), `t-cb-simd` (SIMD lanes), `t-cb-roof` (Roofline). CSS is scoped with `[id^="t-cb-"]`; element ids start with `cb-`.

## Reproduce
- `bash run_all.sh` rebuilds every program into the session scratchpad (`$B` in `code/env.sh`; nothing big in the repo) and writes `out/` (about 15 minutes; timings 3 runs each with the load average).
- `python3 gen_data.py` turns `out/` and `code/` into `../parts/40_js_cb_0data.js` (`window.CB`). The page shows nothing that is not in it.
- `sh ../build.sh`, then `python3 check/check_embed.py` (the page embeds exactly the recorded outputs and sources) and `node check/check_ui.mjs` (every control at 390 px dark and 920 px light; errors, NaN, unfilled values, sideways scroll).

## Facts and choices
- Machine: Apple M1 Pro, macOS 27.0.1, in normal use (load average 5 to 12 during runs). Versions in `versions.txt`.
- Exact dot-product sum 402,653,161.75: computed in Python by periodicity (period 221 = 17 x 13) on the same inputs as `dot.cpp`.
- Latencies (fmadd/fmla/fmul 4, fadd/faddp 3, 4 FP units) from Dougall Johnson's Firestorm tables (fetched 2026-10-05). Clock 3.2 GHz is inferred from the measured fadd chain (3.18 GHz).
- Not run: Instruments/xctrace (hung even for `xctrace version`), `sample` (could not attach), Linux perf (not Linux). The page says so and shows `/usr/bin/time -l` counters instead.
- `mmap` run 1 found the 512 MB test file evicted from the page cache (major faults, 0.9 s); runs 2 and 3 were warm. Kept and shown as a lesson.
- llama.cpp excerpts from the pinned commit 8e1642198dcd4e408f8776222d6ae31b74d01187 (`code/llama_excerpts.sh`).
- Departure from the child-page method: this is one part of a page with a part bar, so there is no separate Further reading tab; the Reading tab ends with "Further reading for Part 2".
