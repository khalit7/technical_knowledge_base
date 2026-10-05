# Memory allocators: sources, runs and checks

Build: `python3 gen_data.py` (raw outputs and checks into `parts/22_js_data.js`), then `sh build.sh` (writes `../index.html`).
Check: `python3 check_embed.py` (embedded data equals raw/, every quoted number equals its measurement, no private
pattern); `node sim/check_freelist.mjs`; `node sim/check_js.mjs`; from `html_utils/`, `node <this folder>/check_ui.mjs <shots dir>`
(clicks every control at 390 px dark and 920 px light).

## Real runs (`run_all.sh`, containers `os-alloc-*`, image `kb-os-alloc:1` from `Dockerfile.alloc`)
| Script (`exp/`) | Raw output (`raw/`) | Page |
|---|---|---|
| `/proc/slabinfo`, `/proc/buddyinfo` | `kernel.txt` | section 1 |
| `sizes.c` | `sizes.txt` | section 2 |
| `threshold.c` under strace, default and `MALLOC_MMAP_THRESHOLD_` | `threshold.txt` | section 3 stepper |
| `bench.c`, 4 allocators, 1 and 2 threads; with `MALLOC_TRIM_THRESHOLD_` and `MALLOC_TOP_PAD_` (`extra.sh`) | `bench.txt`, `bench_trim.txt` | sections 3, 6 |
| `arenas.c` (8 producers, 1 consumer), 3 runs | `arenas.txt` | section 4 |
| `frag.c`, 4 allocators; purging options (`extra.sh`) | `frag.txt`, `frag_purge.txt` | section 5 |
| `loader_growth.py`, 6 settings, 3 runs | `loader.txt` | section 5 |
| `pymalloc_demo.py`, pymalloc and `PYTHONMALLOC=malloc` | `pymalloc.txt` | section 7 |
| `torch_cpu.py` under strace | `torch_cpu.txt` | section 8 |
| `job_alloc.sh` + `job_wrap.py`: the root's job (`../../src/trace/job/`) under 4 allocators, 3 runs | `job.txt` | section 6 |
Versions: glibc 2.36-9+deb12u14, jemalloc 5.3.0, gperftools tcmalloc 2.10 (`libtcmalloc_minimal`), mimalloc 2.0.9 (Debian packages), Python 3.11.2, torch 2.14.1+cpu, NumPy 2.4.6 (`raw/env.txt`). The VM was shared with other agents' runs: times carry noise, so the multi-run figures report medians and every run.

## Simulators (`sim/`)
- `cache_ref.py`: PyTorch's CUDA caching allocator modelled from `c10/cuda/CUDACachingAllocator.cpp` and `c10/core/AllocatorConfig.h` at v2.14.1, every rule with its line numbers and the simplifications listed. `scenarios.py` writes the three illustrative request streams (`scenarios.json`). `make_cases.py` writes 85 cases (scenarios under 5 configurations and 3 capacities, plus 40 random streams); `check_js.mjs` runs the page's `parts/32_js_cache_core.js` on all of them and compares every step with the Python model: 5,903 steps, 0 mismatches (`check_results.txt`).
- `check_freelist.mjs`: runs OSTEP's real `malloc.py` (`inputs/ostep_malloc.py`, ostep-homework vm-freespace) and the page's port (`parts/31_js_fl_core.js`, including Python's Mersenne Twister seeding) on 178 option sets; the printed output is identical in all.

## Sources read (pinned)
glibc 2.36 `malloc/malloc.c`, `malloc/arena.c`; PyTorch v2.14.1 `c10/cuda/CUDACachingAllocator.cpp`, `c10/core/AllocatorConfig.{h,cpp}`, `c10/core/impl/alloc_cpu.cpp`, `c10/core/alignment.h`, `CMakeLists.txt`, `aten/src/ATen/cuda/CachingHostAllocator.cpp`, `aten/src/ATen/core/CachingHostAllocator.h`; mimalloc at the commit vendored by v2.14.1 (30ac9d5, version 2.4.1) `src/options.c`, `src/prim/unix/prim.c`; CPython v3.11.2 `Objects/obmalloc.c`; NumPy v2.4.6 `numpy/_core/src/multiarray/alloc.c`. Line numbers on the page refer to these.

## Departures from the method
Child-page shape (Part B of `html_utils/methods/topic_pages.md`), with the topic's own additions: OSTEP chapter map, measured runs beside every mechanism, predict-then-reveal drills and interview questions. The two standalone tabs are simulators checked against the code they port (OSTEP's homework; PyTorch's allocator source), not data tabs. No `live.md` or `coverage.json`: the page is new, there was no old Notion text.
