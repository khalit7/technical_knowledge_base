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

## Parts (after the 2026-10-24 rebuild)
`01_head.html` is copied from the root page (CSS). `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (storage key `os-vm-tab`; nothing animates before the reader presses play or steps). Reading: `20_read.html` (CSS, nav), `20_read_a` (the idea, hero, you need, new terms, closed "In one screen" and method blocks, sections 1 and 2), `20_read_b` (3, 4), `20_read_c` (5, 6), `20_read_d` (7, 8), `20_read_e` (9, 10, 11), `20_read_f` (12, 13), `20_read_g` (14 In ML, NUMA closed), `20_read_h` (closed mistakes and interview rehearsal), `20_read_z`. JS: `225_js_addr_core.js` (address decoding, shared with the Address translator tab), `22_js_data.js` (generated), `23_js_rd_charts.js`, `24_js_rd_fault.js` (fault-path stepper), `25_js_rd_huge.js` (4 KiB vs THP), `26_js_drill.js`, `27_js_rd_cg.js` (the four cgroup replays and the oom_badness calculator, moved from the old Memory replay tab), `28_js_rd_hero.js`, `28_js_rd_walk.js`, `28_js_rd_cow.js`, `28_js_rd_misc.js` (watermarks, pageable against pinned, commit bars). Tabs: `31_*` Address translator, `39_tab_more.html`.

Checks: `python3 check_embed.py` (from `src/`, after the build; also a privacy scan, login name looked up with `getpass`, case-sensitive), `node src/check_controls.mjs <page>/index.html` (from the repository root: every control in both themes and widths) and `node src/check_stages.mjs` (the 2026-11-07 rollout checks below).

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.
- **Top**: the core idea in one sentence, a static hero (one process: virtual ranges through the TLB and tables onto page cache, anonymous frames and the zero page, swap and files below, the cgroup charge), "You need", and the new terms (the old glossary, moved up). The "In one screen" table, the measurement setup and the OSTEP chapter map are closed blocks.
- **Visuals inline beside the claim**, chosen by kind: the four-level walk became a stepper (section 2, new; the page owns the walk); copy-on-write got a stepper (section 7, new; reverses the 2026-10-05 rejection now that this page owns it); watermarks a static diagram (section 6, new); pageable against pinned a before/after diagram (section 9, new); commit accounting bars (section 10, new). The Memory replay tab explained one mechanism, so its four replays moved into section 12 and its oom_badness calculator into a closed block there; the tab is gone.
- **Ownership**: VSZ added to section 13 (VSZ, RSS, PSS, USS) and named in section 1; unified (managed) memory added to section 9 at the OS level, linking the virtualization sibling (section 11) for the driver and the GPU memory hierarchy page (section 8) for the programmer's view.
- **Depth closed**: kernel provenance paragraphs (mm_struct, copy_present_pte), x86 against arm64 table, ASIDs, the mmap flags, MGLRU, THP knobs, hugetlbfs, two pinned-memory traps, the other memory.* files, oom_score reproduced with the calculator, zswap/zram/PSI detail, NUMA, common mistakes and interview rehearsal.
- **Deleted as fat** (7 ledger units): the recap heading "Five things to remember" and its restatements were folded into their sections; the old Memory replay further-reading entry; the "pin once" recipe that restated section 9; the reader instructions the steppers now carry.
- **No autoplay**: the fault stepper and the replay no longer start on a mode switch.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 41.1 min | 35.0 min |
| Reading, closed details | 2.8 min | 11.6 min |
| Other tabs, core | Address translator 2.2 + Memory replay 1.8 + Further reading 3.6 | Address translator 2.2 + Further reading 3.7 |
| Visuals drawn as SVG, canvas or image in Reading (audit count) | 1 | 7 (plus 7 HTML bar charts and the fault stepper, which the audit does not count) |

Why 35 minutes is right: the page owns fourteen mechanisms (address spaces, the walk, the TLB and shootdowns, faults, mmap, the page cache and reclaim, copy-on-write, huge pages, pinned and unified memory, overcommit, swap, cgroups and the OOM killer, the four memory measures, the ML recipes), each with a measurement made on a real kernel; about a quarter of the core words are captions, tables and counters of the measured visuals. What made the old page long without teaching more (kernel line-by-line provenance, per-architecture tables, flags, knobs, NUMA that could not be run, mistakes and interview answers that restate sections) is now closed. The core could go lower only by dropping measured results, which the ledger marks as core.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
397 units: core 256, depth 134, fat 7. 385 were drafted from the old page by `ledger.py init` (one per sentence; keys were matched to a five-word or longer phrase of the rebuilt page, then 60 were keyed by hand); 12 were added by hand for script-rendered tables and the new visuals (section "added 2026-10-24"). Fat units carry a `note`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, there was no old text. Measurements replace the "real data" of the training pages (real runs of the mechanisms on a real kernel). Things that need privileges, a GPU, a newer kernel or NUMA (memory.high throttling, hugetlbfs pools, PSI, zswap, MGLRU, cudaHostAlloc, x86 IPIs) are taught from sources and tagged "not run here".

## Topic close (2026-10-24)
Further reading times and titles were brought in line with each page's header and the rebuilt root (Reading: 24 min, plus 7 in closed details); references to the root's retired sections and simulators were reworded.
Section 7 gained a closed block with the root's list-of-ints fork run (31,520 kB, 7,880 pages against 7,814 modelled; NumPy 38 to 67 pages), its model and the PyTorch quote with issue 13246, which the root's OS simulators used to carry; closed details are now 12.7 min (header: plus 13).

## 2026-11-07: split layout and six 3D stages (the 2026-11-06 rollout)
- **Templates** copied unchanged: `build.sh`, `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2), `99_js_tabs.js` (key `os-vm-tab`); the eased-step CSS (`rd-fwd`) added to `01_head.html`. The parts list above is superseded: the old steppers `24_js_rd_fault.js`, `25_js_rd_huge.js`, `28_js_rd_hero.js`, `28_js_rd_walk.js`, `28_js_rd_cow.js` were removed and replaced by the scenes `32a` to `32f`.
- **Six 3D stages**, one scene file each, each with an `ol.sx` step list on the left. Colours: page tables gold glass (`c5`), translation orange (`c2`), anonymous frames green (`c3`), page cache blue (`c1`), shmem purple (`c4`).
  Fig. 1 hero (`32a_js_sc_hero.js`): the job's address space by kind (`root_maps.totals`, square-root widths), the TLB and tables, frames from three places, files and swap, the `memory.max` box. Replaces the static SVG hero.
  Fig. 2 walk (`32b_js_sc_walk.js`): `0xffff81fd2000` split by `VMADDR.decode` into 511, 510, 15, 466 and 0x0, four glass tables in a staircase (each entry placed where its index puts it in a 16 x 32 lattice), the camera moving to each level, then the TLB short-circuit. Replaces the bit-split card and the 2D walk stepper; table and frame numbers stay illustrative.
  Fig. 4 fault path (`32c_js_sc_flt.js`): the old seven-case stepper as a stage; the step list's `data-f` spans are filled per case; SIGSEGV has its own four-step list; per-case measured cost under the list.
  Fig. 5 mmap (`32d_js_sc_mmap.js`, new): read() copy against mapping the page cache, a second process sharing it, a MAP_PRIVATE copy, read-around on a cold fault with the measured amplification (`rows`).
  Fig. 6 copy-on-write (`32e_js_sc_cow.js`): the old six-step stepper as two glass page tables over a panel of frames; the processes page links here for copy-on-write.
  Fig. 7 huge pages (`32f_js_sc_huge.js`): 4 KiB and THP side by side on one 2 MiB stretch (faults, TLB entries, bloat, fork, the deposited table), measured numbers from `first_write`, `bloat`, `fork`, `pte`. Replaces the canvas toggle.
- **The cgroup replay** (section 12) stays 2D (memory over time) and follows the long-replay rule: one step per stretch between the run's own marks (4, 3, 2 and 3 steps), each stretch playing its samples during its step, with four static step lists whose numbers `check_stages.mjs` checks against `VM_DATA.cg`. The caption and the marks list were removed (the step lists carry them).
- **Kept 2D, moved into splits** (figure right): the address-space bars, the shootdown bars, the random-row bars, the watermarks, the fork-cost and gc bars, the pageable/pinned diagram, the commit bars, the PSS bars: numbers on an axis or flat structures. Address translator tab: section 1 split (notes left, tool right); section 2 has no prose and stays full width.
- **Full width**: sections 11 and 14, the closed blocks after each split, Mistakes and rehearsal, Further reading.
- **Cut as restatement**: the hero and walk captions (now step lists), the "costs" box of section 8 (bloat and page tables moved into the steps; latency kept), one fork sentence of section 8, the stepper reader instructions (one ledger unit made fat).
- **Ledger**: 404 units (core 262, depth 134, fat 8), problems 0; 12 keys changed, 7 units added for the step lists.
- **Length**: Reading core 35.2 to 40.8 min (8,087 to 9,375 words), closed 12.7 unchanged, Address translator 2.2, Further reading 3.8. The rise is the step lists: most of their text was script-written captions before (uncounted by the audit), and the audit also counts the hidden lists (three cgroup runs and the SIGSEGV case, about 330 words). Nothing knowledge-bearing was cut.
