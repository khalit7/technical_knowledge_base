# Source of the scheduling page

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root page's build; Reading parts `20_read_a` .. `20_read_z` listed in order). After a build:
- `python3 check_embed.py`: the page embeds exactly what `gen_data.py` derives from `raw/`, every recorded output shown is a verbatim slice of `raw/`, the numbers written in the prose agree with `recompute.txt`, and no private pattern is present.
- `python3 simref.py simref_out.json && node check_sim.mjs`: the page's CFS 5.10 / EEVDF 6.12 simulator (`parts/30_js_fair_core.js`) gives identical schedules to the Python reference on every scenario (7/7).
- `node check_controls.mjs`: clicks every control at 390 px dark and 920 px light (no errors, NaN, undefined or sideways scroll).
- `node check_stages.mjs [shots dir]`: at 1400 light, 920 light and 390 dark, every 3D stage and the section 5 replay play by themselves once scrolled into view, stop off screen, step to their last step with one step-list item per step, and nothing moves under reduced motion; the numbers in the step lists equal the data's and the simulator's; the Fair-share stepper never plays by itself.
- `python3 recompute.py`: every derived number (tunables, shares, slices, conversions, throttling predictions, load-average formula, stride picks, grid summary) into `recompute.txt`.

## Measurements
`sh run_all.sh [step ...]` re-runs everything (about 20 minutes) on Docker Desktop's Linux VM (kernel 5.10.104-linuxkit, 5 CPUs), image `kb-os-lab:1` (the root's lab image), containers named `os-sched-*`, never privileged; `CAP_SYS_NICE` only for `wake` and `rt`. Other agents shared the VM: each script records the VM load average; timings were repeated and the page shows the spread.

| Step | Script (`exp/`) | Raw (`raw/`) | What |
|---|---|---|---|
| cpus | `cpus.sh` | `cpus.txt` | what os.cpu_count, affinity, nproc and torch see under --cpus and --cpuset-cpus |
| ctx | `schedlab.c`, `ctx.sh` | `ctx.txt` | process and thread switch, sched_yield, cross-CPU hand-offs, a first cache-pollution pass |
| cache | `cache.sh` | `cache.txt` | the cache-pollution measurement, three rounds |
| wake | `wake.sh` | `wake.txt` | wake-up delay by policy and neighbours |
| vrun | `vrun.py`, `vrun.sh` | `vrun.txt` | vruntime and CPU time from /proc/PID/sched; nice across sessions (autogroup) |
| rt | `rt.sh` | `rt.txt` | SCHED_FIFO refused in a cgroup; SCHED_DEADLINE rules and its 20% |
| acct | `acct.sh` | `acct.txt` | time, cpu.stat, /proc/stat, per-thread schedstat |
| job | `job.sh` | `job.txt` | the root's running job: every thread, its waits, worker churn per epoch |
| throttle | `throttle.sh` | `throttle.txt` | gaps of N spinning threads under cpu.max, with cpu.stat |
| weight | `weight.sh`, `step.py` | `weight.txt` | two containers on one CPU by --cpu-shares; noisy neighbour on a training step |
| loadavg | `loadavg.sh` | `loadavg.txt` | three D-state tasks and the load average |
| grid | `grid.py` | `grid.txt` | section 11 budget grid: threads x workers x quota, three repeats |

`inputs/kernel_extract.txt`: every Linux v5.10 and v6.12 source line the page cites, with line numbers; `inputs/other_sources_extract.txt`: runc, opencontainers/cgroups, Kubernetes and PyTorch lines cited.

## Parts (rebuilt 2026-10-24 to the teaching contract; split layout and 3D stages 2026-11-07)
`01_head.html` and `26_js_drill.js` come from the sibling Virtual memory page (root CSS; `01_head.html` also carries the eased-step CSS, `rd-ease`); `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` are the explainer-page skill templates, copied unchanged (storage key `os-sched-tab`). Reading: `20_read_a` (styles, nav), `20_read_b` (the idea in one screen, split with the hero stage: core sentence, step list, you need, new terms, closed reference table and provenance; section 1), `20_read_c` (2: switch stage, cost chart), `20_read_d` (3; 4: CFS stage, vruntime chart), `20_read_e` (5: EEVDF replay with three step lists), `20_read_f` (6: wake-up chart), `20_read_g` (7: affinity stage; 8), `20_read_h` (9: weight chart, throttle stage), `20_read_i` (10: load chart; profiling), `20_read_j` (11: budget grid), `20_read_k` (closed depth: mistakes, interview), `20_read_z`. JS: `22_js_data.js` (generated), `23_js_rd.js` (tables and charts), `30_js_fair_core.js` (simulator), `31_js_fair_view.js` (its drawing), `32_js_rd_ee.js` (section 5 replay, stretches), `33_js_rd_thr.js` (section 9 summary table), `34_js_tab_fair.js`, `35_js_rd_budget.js` (section 11 grid), the scenes `36a_js_sc_hero.js`, `36b_js_sc_sw.js`, `36c_js_sc_vr.js`, `36d_js_sc_aff.js`, `36e_js_sc_thr.js`, and `37_js_layout.js` (a right-column card taller than the window is not sticky; continuation sections mark their nav link). Tabs: `31_tab_fair.html` Fair-share stepper, `39_tab_more.html`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence and a static hero drawn from measured data: one CPU's run queue (classes in order, the fair class opened out with three threads placed by their real `se.vruntime`) above the first 300 ms of five threads stalled by a 1-CPU quota. "You need" and new terms follow; the old "In one screen" table and the measurement and OSTEP notes are closed reference blocks; "Five things to remember" was a recap of the sections and was cut.
- **Every core mechanism has its visual inline**: the context switch got a new six-frame stepper (`25_js_rd_sw.js`, from the v5.10 source); the CPU budget lab tab (one measured mechanism: threads and workers against a quota) moved into section 11 and the tab was removed; the Fair-share stepper stays a tab because sections 4 and 5 both use it as a workbench.
- **Concrete, then picture, then formula** in section 4 (the measured vruntime chart now comes before the update rule) and section 10 (the measured load before the fixed-point formula); prediction prompts before the vruntime chart, the EEVDF animation, the wake-up chart, the affinity table, the throttle replay and the load chart.
- **Depth into closed blocks**: kernel line-by-line walks (`cpu_switch_to` assembly, `wakeup_preempt_entity`, bandwidth-control functions, EEVDF delayed dequeue, load-average fixed point), autogroup, isolcpus, NUMA balancing, the inconclusive cache-pollution run, SCHED_DEADLINE's recorded runs, steal time and `/proc/stat`, the recorded RT refusal and schedstat output, the grid's per-quota findings, mistakes and interview answers.
- **Added**: "Where the CPU goes" in section 10 (which tool answers which CPU question: user against system time, py-spy top, record and dump, perf, schedstat for waiting), a page this one owns per its brief; reading flame graphs is linked to Capacity planning and performance, not repeated.
- **No autoplay**: the template controller replaces the old one (which played on first scroll), and mode toggles (sections 5 and 9, the stepper tab) now reset to step 0 instead of playing.
- **Bug fixed in `gen_data.py`**: the throttle parser rejected a gap list whose first gap started before the 1 s window (a negative time), so threads 1 and 5 of the 5-thread run, and thread 5 of the 10 ms run, were drawn as never stopped in the section 9 replay. Gaps are now parsed with signs and clipped to 0. `max_gap` values (and `recompute.txt`) were not affected.
- `check_embed.py` skips `__pycache__` (bytecode from `recompute.py`'s import carries absolute paths and made the privacy check fail); `check_controls.mjs` no longer visits the removed tab.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 46.7 min | 34.9 min |
| Reading, closed details | 3.0 min | 15.2 min |
| Other tabs, core | Fair-share stepper 2.5 + CPU budget lab 2.4 | Fair-share stepper 2.5 |
| Core total, excluding Further reading | 51.6 min | 37.4 min |
| Visuals drawn in Reading (svg, canvas, img) | 4 | 7 (plus HTML bar charts and the heat map, which the audit does not count) |

Why about 35 minutes is right: the page owns eleven mechanisms (threads and run queues, the switch, proportional share, CFS, EEVDF, the other classes, load balancing and affinity, NUMA, cgroup weight and quota, accounting and profiling, the thread budget of a training job), each with a measured result on a real kernel or a simulator checked against source, and the ledger's core units are all needed to understand one of them; about a fifth of the core words are captions, counters and tables of the visuals. What made the old page long (kernel line walks, recorded outputs, per-run provenance, mistakes and interview answers) is now closed and optional; nothing was deleted except the 16 fat units.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
377 units: core 282, depth 78, fat 16, owned 1. 361 were drafted from the old page by `ledger.py init` (keys are distinctive phrases of each sentence found on the rebuilt page, checked by hand where the overlap was short, and every number of every matched unit was confirmed still present); 16 were added by hand for script-rendered tables and charts and the three new visuals or sections. The one `owned` unit is OSTEP's FIFO/SJF/RR/MLFQ sequence, which the root's section 3 carries. Fat units carry a `note` (tab bar, wind-ups, OSTEP tags repeated by the chapter map, instructions replaced by prediction prompts, the removed tab's Further-reading card).

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, there was no old text. Measurements on a real kernel replace the "real data" of the training pages; things that need a 6.6+ kernel (EEVDF), privileges (perf, real-time in the root cgroup), real NUMA or a GPU are taught from sources and tagged "not run here"; EEVDF is shown through a simulator checked line by line against v6.12 source and labelled as a model.

## Topic close (2026-10-24)
Further reading times and titles were brought in line with each page's header and the rebuilt root (Reading: 24 min, plus 7 in closed details); references to the root's retired sections and simulators were reworded.

## 2026-11-07: split layout and 3D stages (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2), `99_js_tabs.js` (key `os-sched-tab`); `build.sh` cats `02_split.html` after `01_head.html`. Every animation and stage plays by itself once at least half in view, pauses off screen, stops for good on a reader control or at its last step, and never moves under reduced motion.
- **Five 3D stages**, one scene file each, each with an `ol.sx` step list on the left: Fig. 1 hero (`36a`: the VM's 5 CPUs with one CPU's class trays; the fair class opened out on a rail at the measured `se.vruntime` of the three tasks 1 s into section 4's run, height the CPU received; the first 300 ms of the 5-thread, 1-CPU quota run with refills drawn where every thread's stop ends); Fig. 2 the context switch (`36b`: thread A, CPU with registers and MMU plate, thread B; six steps from the v5.10 source, the old stepper's captions now the step list, cost from `SC_DATA.ctx.pipe`); Fig. 3 the CFS run queue (`36c`: the 41 `/proc/PID/sched` readings replayed, position vruntime on a rail that scrolls with the queue, height CPU received; the measured ratio and median lag); Fig. 4 affinity against a quota (`36d`: the four measured containers of `cpus.txt`); Fig. 5 cpu.max throttling (`36e`: the measured gaps of the 1-thread, 5-thread and 10 ms period runs, refills where the all-stopped stretches end, the quota streaming only into threads running at the cursor).
- **Removed 2D visuals** (replaced by stages): the hero's two SVGs (`24_js_rd_hero.js`), the context-switch stepper (`25_js_rd_sw.js`), the section 9 throttle replay and its run buttons (`33_js_rd_thr.js` keeps the summary table and the quoted stop lengths).
- **The section 5 replay** (41 to 72 simulator events) is now grouped into explained stretches: 4, 5 and 4 steps for CFS, EEVDF and EEVDF with a 0.1 ms slice, each with its own step list (`sx-ee-cfs`, `sx-ee-eevdf`, `sx-ee-short`; the mode buttons swap the list and replay), each stretch playing its events during its step; the per-event caption was removed (the lists explain it). Writing the lists showed the old summary paragraph's "total CPU per thread is the same in all three" was loose: the loader gets 3.2 ms under plain EEVDF against 4.0 ms, because its waits delay its next cycle (8 cycles in 40 ms instead of 10); the paragraph now says so.
- **Kept 2D, in splits** (right-column cards): the switch cost bars, the vruntime curves, the wake-up delay chart, the neighbour bars, the load-average curve and the budget heat map; they read best flat (bars, curves, a heat map with metric and quota switches and per-cell details). The job table, the slice table, the policy table, the affinity table and the throttle summary stay full width. Section 3 (stride) and 8 (NUMA, not run here) have no visual and stay full width; no licensed photograph would add anything a reader has not seen (the page is about software), so no images.
- **Fair-share stepper tab**: split (notes and the rules on the left, the editor and the schedule on the right); it is a widget the reader drives (`auto:false`, no step list) and opens on the whole run.
- **Checks**: `check_stages.mjs` (new, from Containers and isolation); `check_embed.py` adds a case-sensitive check for the login name, looked up at run time; `check_controls.mjs` unchanged (it had no never-autoplay assertion).
- **Ledger**: 377 units (core 282, depth 78, fat 16, owned 1), problems 0; 8 keys updated where sentences moved into step lists or headings.
- **Length**: Reading core 34.9 to 40.1 min (8,026 to 9,229 words), closed 15.2 min unchanged, Fair-share stepper 2.5 to 2.7, Further reading 3.6. The added words are the step lists that explain five stages and the replay (the switch's captions were script-drawn before and not counted; the two hidden EEVDF lists are counted although only one shows at a time); nothing knowledge-bearing was cut.
