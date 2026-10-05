# Source of the virtual memory page

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root page's build). `python3 check_embed.py` (after the build) confirms the page embeds exactly what `gen_data.py` derives from `raw/` and that the numbers written in the prose agree with that data; `python3 recompute.py` recomputes every derived number (oom_score, CommitLimit, page-table size, per-fault costs, sums) into `recompute.txt`.

## Measurements
`sh run_all.sh` re-runs everything (about 3 minutes) on Docker Desktop's Linux VM: image `kb-os-vm:1` (`Dockerfile.vm`: the root's `kb-os-lab:1` plus safetensors and packaging), containers named `os-vm-*`, never privileged, memory-pressure runs one at a time.

| Script (`exp/`) | Raw (`raw/`) | What |
|---|---|---|
| `env.sh` | `env.txt` | VM settings quoted (watermarks, swappiness, THP, read_ahead_kb, ulimit -l, absent PSI and zswap) |
| `vmlab.c` via `c_all.sh` | `vmlab.txt` | first-touch faults 4 KiB vs THP, zero page, MAP_POPULATE, THP bloat, VmPTE, fork cost and copy-on-write, TLB shootdown (mprotect with 0 to 3 spinning threads), mlock under RLIMIT_MEMLOCK, overcommit |
| `cow_gc.py` | `cow_gc.txt` | pages a forked child copies: reading lists, gc.collect, gc.freeze, NumPy |
| `mmapread.py` | `mmapread.txt` | 20,000 random rows: pread vs mmap vs mmap+MADV_RANDOM, cold (posix_fadvise DONTNEED) and warm; loading 256 MiB of weights four ways |
| `job_mem.sh` | `job_mem.txt` | the root's running job: RSS, PSS, USS per process |
| `cg_replay.sh`, `sampler.py`, `grow.py` via `run_cg.sh` | `cg_*.txt` | four 512 MiB containers sampled every 25 ms: page cache, OOM kill, swap, /dev/shm |
| `oomscore.sh`, `hold.py` | `oomscore.txt` | oom_score of four processes, reproduced by the 5.10 formula |

Also read from the root page's recordings: the job's `/proc/PID/maps` totals, TLB and fault measurements (`../../src/parts/22_js_rd_data.js`) and the Debug lab's swap case (`../../src/debug/raw/swap.txt`).

`inputs/kernel_v5.10_extract.txt`: every Linux v5.10 source line the page cites, with file and line number.

## Parts
`01_head.html` and `21_js_rd_common.js` are copied from the root page (CSS and the step-animation controller). Reading: `20_read.html` (CSS, nav), `20_read_a` to `20_read_h`. JS: `225_js_addr_core.js` (address decoding, shared by section 2 and the Address translator tab), `22_js_data.js` (generated), `23_js_rd_charts.js`, `24_js_rd_fault.js` (fault-path stepper), `25_js_rd_huge.js` (4 KiB vs THP animation), `26_js_drill.js`. Tabs: `31_*` Address translator, `32_*` Memory replay, `39_tab_more.html`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, there was no old text. Measurements replace the "real data" of the training pages (real runs of the mechanisms on a real kernel). Things that need privileges, a GPU, a newer kernel or NUMA (memory.high throttling, hugetlbfs pools, PSI, zswap, MGLRU, cudaHostAlloc, x86 IPIs) are taught from sources and tagged "not run here".
