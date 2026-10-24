# Source of the scheduling page

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root page's build; Reading parts `20_read_a` .. `20_read_z` listed in order). After a build:
- `python3 check_embed.py`: the page embeds exactly what `gen_data.py` derives from `raw/`, every recorded output shown is a verbatim slice of `raw/`, the numbers written in the prose agree with `recompute.txt`, and no private pattern is present.
- `python3 simref.py simref_out.json && node check_sim.mjs`: the page's CFS 5.10 / EEVDF 6.12 simulator (`parts/30_js_fair_core.js`) gives identical schedules to the Python reference on every scenario (7/7).
- `node check_controls.mjs`: clicks every control at 390 px dark and 920 px light (no errors, NaN, undefined or sideways scroll).
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

## Parts (rebuilt 2026-10-24 to the teaching contract)
`01_head.html` and `26_js_drill.js` come from the sibling Virtual memory page (root CSS); `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (never autoplay; storage key `os-sched-tab`). Reading: `20_read_a` (styles, nav), `20_read_b` (the idea in one screen: core sentence, hero, you need, new terms, closed reference table and provenance; section 1), `20_read_c` (2), `20_read_d` (3, 4), `20_read_e` (5), `20_read_f` (6), `20_read_g` (7, 8), `20_read_h` (9), `20_read_i` (10, with profiling), `20_read_j` (11, with the budget grid), `20_read_k` (closed depth: mistakes, interview), `20_read_z`. JS: `22_js_data.js` (generated), `23_js_rd.js` (tables and charts), `24_js_rd_hero.js` (hero), `25_js_rd_sw.js` (context-switch stepper), `30_js_fair_core.js` (simulator), `31_js_fair_view.js` (its drawing), `32_js_rd_ee.js` (section 5 animation), `33_js_rd_thr.js` (section 9 throttle replay), `34_js_tab_fair.js`, `35_js_rd_budget.js` (section 11 grid). Tabs: `31_tab_fair.html` Fair-share stepper, `39_tab_more.html`.

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
