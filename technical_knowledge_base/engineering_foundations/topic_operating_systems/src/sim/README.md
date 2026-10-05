# OS simulators tab (`t-sim`): sources, checks and real runs

Five OSTEP-style simulators run in the page (`../parts/31_tab_sim.html`, `../parts/31_js_sim_*.js`), each next to a real
measurement from the shared lab image `kb-os-lab:1` where one exists.

| Simulator | OSTEP chapters | Checked against | Real run beside it |
|---|---|---|---|
| CPU scheduling: FIFO, SJF, STCF, RR, MLFQ, simplified CFS | 7, 8, 9 | `scheduler.py` (FIFO, SJF, RR), `mlfq.py`; CFS against Linux v5.10 `kernel/sched/fair.c` and `core.c` (`inputs/kernel_v5.10_sched_extract.txt`) | `real/nice_share.c` (CFS weights), `real/ctxsw.c` (context-switch cost) |
| Address translation (linear, two-level), TLB on an array walk, page replacement (OPT, FIFO, LRU, CLOCK) | 18 to 22 | `paging-linear-translate.py`, `paging-multilevel-translate.py` (its `-s 1` memory is embedded: `inputs/ostep_multilevel_s1.txt`), `paging-policy.py` (not CLOCK: OSTEP's picks random pages) | `real/tlb.c` (4 KiB against 2 MiB pages, and the 2-D walk) |
| Copy-on-write after fork | 5, 23 | a real fork | `real/cow.py` (`/proc/<pid>/smaps_rollup`) |
| Races, locks, deadlock | 26, 28, 32 | `x86.py` on `looping-race-nolock.s` and `test-and-set.s` | `real/inc.c` (asm), `real/race.c`, `real/deadlock.c` |
| Crash consistency (fsck, data, ordered and two unsafe journaling protocols) | 42 | the six cases listed in OSTEP 42.1 | none (explained on the page) |

## Files
- `ref_common.py`, `ref_sched.py`, `ref_vm.py`, `ref_cow.py`, `ref_conc.py`, `ref_crash.py`: the Python references.
- `make_ref.py` writes `ref_out.json`; `check_js.mjs` runs the page's `31_js_sim_b_core.js` on every case (result: `check_js.txt`).
- `check_ostep.py <ostep-homework clone>` compares the references with OSTEP's simulators (result: `check_ostep.txt`; homework commit afb36ca8, 2026-01-13).
- `real/run_real.sh`: every measurement, in containers named `os-sim-*`, outputs in `real/out/` (2026-10-05).
- `gen_data.py` embeds the outputs and check results as `../parts/31_js_sim_c_data.js`; `check_embed.py` confirms the built page carries exactly those lines and no private pattern.
- `run_all.sh` runs the chain.

## Environment of the real runs
Docker Desktop's Linux VM on an Apple M1 laptop: Linux 5.10.104-linuxkit, arm64, 5 vCPUs, 4 KiB pages; image `kb-os-lab:1`
(sha256:af5ef863...; Debian 12, gcc 12.2, Python 3.11.2, numpy 2.4.6). The VM was shared with other agents' experiments;
the CPU-sensitive runs were pinned with `--cpuset-cpus`. `perf` hardware counters are not supported inside this VM.

## Departures from the method
The root-page method suggests comparison tabs; this is a data tab of interactive simulators, as the topic's spine asks
("OS simulators"), with every simulator verified twice (Python against OSTEP, page against Python).
