# Memory allocators: sources, runs and checks

Build: `python3 gen_data.py` (raw outputs and checks into `parts/22_js_data.js`), then `sh build.sh` (the skill's template build; writes `../index.html`).
Check: `python3 check_embed.py` (embedded data equals raw/, every quoted number equals its measurement, no private
pattern); from `sim/`, `node check_freelist.mjs` and `node check_js.mjs`; from `html_utils/`, `node <this folder>/check_ui.mjs <shots dir>`
(clicks every control at 390 px dark and 920 px light; the two labs never play by themselves); `node src/check_stages.mjs [shots dir]`
(the six 3D stages and the threshold traces play once in view, stop off screen, step to their last step with one list item per step,
nothing moves under reduced motion; the step lists' numbers equal the page's malloc.py port and caching-allocator model).

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
| `gc_cycles.py` (not in the container: Apple M1 Pro, macOS, Homebrew Python 3.11.9 and 3.14.8, seconds, 2026-10-24) | `gc_cycles.json`, `gc_cycles_py314.json` | section 7 |
Versions: glibc 2.36-9+deb12u14, jemalloc 5.3.0, gperftools tcmalloc 2.10 (`libtcmalloc_minimal`), mimalloc 2.0.9 (Debian packages), Python 3.11.2, torch 2.14.1+cpu, NumPy 2.4.6 (`raw/env.txt`). The VM was shared with other agents' runs: times carry noise, so the multi-run figures report medians and every run.

## Simulators (`sim/`)
- `cache_ref.py`: PyTorch's CUDA caching allocator modelled from `c10/cuda/CUDACachingAllocator.cpp` and `c10/core/AllocatorConfig.h` at v2.14.1, every rule with its line numbers and the simplifications listed. `scenarios.py` writes the three illustrative request streams (`scenarios.json`). `make_cases.py` writes 85 cases (scenarios under 5 configurations and 3 capacities, plus 40 random streams); `check_js.mjs` runs the page's `parts/32_js_cache_core.js` on all of them and compares every step with the Python model: 5,903 steps, 0 mismatches (`check_results.txt`).
- `check_freelist.mjs`: runs OSTEP's real `malloc.py` (`inputs/ostep_malloc.py`, ostep-homework vm-freespace) and the page's port (`parts/31_js_fl_core.js`, including Python's Mersenne Twister seeding) on 178 option sets; the printed output is identical in all.

## Sources read (pinned)
glibc 2.36 `malloc/malloc.c`, `malloc/arena.c`; PyTorch v2.14.1 `c10/cuda/CUDACachingAllocator.cpp`, `c10/core/AllocatorConfig.{h,cpp}`, `c10/core/impl/alloc_cpu.cpp`, `c10/core/alignment.h`, `CMakeLists.txt`, `aten/src/ATen/cuda/CachingHostAllocator.cpp`, `aten/src/ATen/core/CachingHostAllocator.h`; mimalloc at the commit vendored by v2.14.1 (30ac9d5, version 2.4.1) `src/options.c`, `src/prim/unix/prim.c`; CPython v3.11.2 `Objects/obmalloc.c`; NumPy v2.4.6 `numpy/_core/src/multiarray/alloc.c`. Line numbers on the page refer to these.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing plus one cheap run, no new container runs.
- **Top**: the core idea in one sentence, a new static hero (`parts/24_js_rd_figs.js`: the four allocators of the running job, what each returns and when, and the measured 1,562 / 110,524 / 29,404 KiB to scale), "You need" (virtual memory; GPU memory budgets on Making training fast; the GPU memory hierarchy), new terms. The five takeaway cards were fat (each restated a section); the layer table stays.
- **Both lab tabs moved inline**, each beside the claim it proves: the Free-list lab into section 1 (presets and the coalescing before/after visible, the other malloc.py options and the printed output in closed blocks), the Caching allocator's full controls into section 9 (it replaced the compact copy). Tabs are now Reading and Further reading. `31_tab_fl.html` and `32_tab_cache.html` were deleted; their text is in `20_read_b.html` and `20_read_h.html`.
- **New visuals**: glibc's malloc lookup order as a static ladder (section 3; the bins table with line numbers is now a closed block), pymalloc's arena, pools and blocks (section 7), the reference-count against cycle-collector bars (section 7), and two real images from the PyTorch docs (Allocator State History in section 9, Active Memory Timeline in section 10; `img/CREDITS.md`).
- **New content this page owns** (OWNERS brief): reference counting and the cycle collector at the level of memory behaviour (measured with `exp/gc_cycles.py`; thresholds, what waits for the collector, the gc.freeze recipe for forking), heaptrack for native growth (section 10, from its README, not run here), the memory snapshot moved into the diagnosis section.
- **Into closed blocks**: provenance of the runs, the C API table and bug list, the bins table, glibc's knobs and introspection calls, the slab and buddy recorded outputs, the CUDA allocator's rules with line numbers (a compact core paragraph stays), the torch strace, mimalloc's source lines, interview rehearsal, the OSTEP chapter map.
- **Deleted as fat**: the five cards, wind-ups and headings that restated, the "Common mistakes" (each restated a section; the one new fact, nvidia-smi includes the CUDA context, moved into section 9), pointers to the removed tabs. Each has a `note` in `ledger.json`.
- **No autoplay** (superseded on 2026-11-07, below): `21_js_rd_common.js` was the skill template plus `onRenderTab`; `check_ui.mjs` confirmed every animation stayed on step 0.
- **One highlight colour**: orange (`--c2`) means free but held by the allocator, in the hero, the free-list lab's free chunks, the caching allocator's hatched cached blocks, the pymalloc figure and the prose; tcmalloc's series moved to grey and the simulator's temporaries to gold to keep orange for that.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 38 min | 34 min |
| Reading, closed details | 3 min | 10 min |
| Other tabs, core | Free-list lab 1.7 + Caching allocator 1.8 + Further reading 3.0 = 7 min | Further reading 3.1 min |
| Visuals drawn in Reading (svg, canvas, img counted by the audit) | 1 | 6 (plus 2 photos-of-UI images lazily loaded, the HTML bar charts and the strace stepper) |

Why 34 minutes is right: the page teaches ten mechanisms across five allocators (free lists and coalescing, size classes, glibc's chunks, bins and two thresholds, arenas, fragmentation measured twice, three replacement allocators, pymalloc and the cycle collector, NumPy and torch CPU, the CUDA caching allocator and expandable segments) plus a diagnosis table, each with its measurement or source and a visual; about a fifth of the core words are the two interactive labs' labels, counters and captions, which moved in from tabs. What made the old page long (restating cards, mistakes, reference tables, source line numbers, recorded outputs, interview answers) is now fat or closed; the closed time grew because reference material moved there rather than being cut. The new owned material (cycle collector, heaptrack, snapshot images) adds about 2 minutes.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
335 units: core 249, depth 53, fat 33. 324 were drafted from the old page by `ledger.py init`; 11 were added by hand for the new figures and content (`note`: "added in the 2026-10-24 rebuild"). Script-drawn text (hero, ladder, pymalloc figure) has its key in a static caption. No unit is labelled `owned:` (nothing moved to another page) or `volatile`.

## Departures from the method
Child-page shape (`.claude/skills/explainer-page/page-kinds/topic-child.md`), with the topic's own additions: OSTEP chapter map (closed), measured runs beside every mechanism, predict-then-reveal drills and interview rehearsal (closed). The two simulators are checked against the code they port (OSTEP's homework; PyTorch's allocator source) and sit inline. The cycle-collector run is on the Mac, not in the Linux VM, and says so beside it. No `live.md` or `coverage.json`: the page is new, there was no old Notion text.

## Topic close (2026-10-24)
Further reading times and titles were brought in line with each page's header and the rebuilt root (Reading: 24 min, plus 7 in closed details); references to the root's retired sections and simulators were reworded.
The provenance block gained the dead-code trap of the root's first malloc strace; the arena pairs and the 7,880-page figure now point to the root's recording and to Virtual memory section 7.

## 2026-11-07: split layout and 3D stages (the 2026-11-06 rollout)
- **Templates**: `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` (key `os-alloc-tab`) copied unchanged from the skill; `build.sh` cats `02_split.html` after `01_head.html`; the eased-step CSS (`rd-fwd`) added to `01_head.html`. The template has no `onRenderTab`, so the two labs register with `RD.onRender` (all their controls are in `t-read`).
- **Six 3D stages**, one scene file each (`34a` to `34f`), each with an `ol.sx` step list on the left, all driven by the page's own data or engines:
  Fig. 1 hero (`34a_js_sc_hero.js`): four allocators on a user-space plate over the kernel and the CUDA driver; steps 4 and 5 move the camera onto glibc's heap to scale from `AD.frag.glibc` (1,562 live, 110,524 and 29,404 KiB). Replaces the static hero SVG.
  Fig. 2 (`34b`): the section-1 drill (preset Q7 plus `-1, +15`) run by the page's malloc.py port `FREELIST` with coalescing on; the step list's numbers are checked against it, coalescing off included.
  Fig. 3 (`34c`): glibc's lookup order as a staircase of glass plates from tcache down to the kernel; replaces the 2D ladder. Chunk counts illustrative, limits the source's.
  Fig. 4 (`34d`): `arenas.c`'s eight producers and one consumer, one arena against ten; counts and numbers measured (`AK`), arena fill illustrative.
  Fig. 5 (`34e`): 17 pages (four gaps) of `frag.c`'s glibc heap to scale, 272-byte chunks, survivors every 17,408 bytes; `malloc_trim` drops the pages wholly inside free chunks (4 of 17 stay, from the chunk arithmetic); RSS labels measured.
  Fig. 6 (`34f`): the caching-allocator model `CACHESIM` on the batch scenario, default (front, stops at its OOM at request 104) against expandable segments (back), six stretches of the 201 requests; numbers in the steps checked against the model.
- **Kept 2D, moved into splits** (figure or chart in the right column, text left): chunk sizes (s2), the threshold traces (s3; now plays once in view, its caption carousel moved into the step list `sx-thr`), arena bars and table (s4), fragmentation table and the data-loader chart (s5), the allocator cliffs table and the running job (s6), pymalloc's arena figure and the cycle-collector bars (s7), the two PyTorch docs images (s9, s10). They stay 2D because their message is numbers on an axis or a table.
- **Widgets** (the long-replay rule, case b): the free-list lab (up to 1,000 operations) and the caching-allocator lab (201 requests, five configurations) are `RD.anim({auto:false})`: they open on step 0 and never play by themselves; Figs. 2 and 6 are their explained replays.
- **Full width**: the layer table, provenance, section 8, the jemalloc/tcmalloc/mimalloc comparison table, the diagnosis table, "In ML work", choosing an allocator, Depth.
- **Checks**: `check_stages.mjs` (new, from the Concurrency sibling): problems 0 at 1400 light, 920 light, 390 dark and under reduced motion. `check_ui.mjs`: the never-autoplay block now covers only the two labs. `check_embed.py`, `sim/check_freelist.mjs` (178 cases, 0 mismatches) and `sim/check_js.mjs` (85 cases, 0 mismatches) unchanged and passing. `checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0.
- **Ledger**: 338 units (core 252, depth 53, fat 33), problems 0. Two keys changed (unit 94, "Step through both traces beside"; unit 331, "looks, cheapest first", the ladder's caption became Fig. 3's step-list heading); three units added for facts the new step lists state (coalescing off in Fig. 2, the 17,136-byte gaps, the model's OOM numbers).
- **Length**: Reading core 34.0 to 41.1 min (7,829 to 9,455 words), closed 10.1 min unchanged, Further reading 3.2. The added words are the seven step lists, which explain the six stages and the traces and replace a script-written caption carousel (uncounted before) and two static captions; the arena prose that the step list now carries was cut to one sentence. Nothing knowledge-bearing was cut. 41 minutes is right for ten mechanisms each with a measured or source-checked visual.
