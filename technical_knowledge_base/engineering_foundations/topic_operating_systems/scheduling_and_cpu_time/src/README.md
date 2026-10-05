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
| grid | `grid.py` | `grid.txt` | CPU budget lab: threads x workers x quota, three repeats |

`inputs/kernel_extract.txt`: every Linux v5.10 and v6.12 source line the page cites, with line numbers; `inputs/other_sources_extract.txt`: runc, opencontainers/cgroups, Kubernetes and PyTorch lines cited.

## Parts
`01_head.html`, `21_js_rd_common.js` (step-animation controller), `26_js_drill.js` and `99_js_tabs.js` are copied from the sibling Virtual memory page (root CSS). Reading: `20_read_a` (styles, nav) to `20_read_m`, `20_read_z`. JS: `22_js_data.js` (generated), `23_js_rd.js` (tables and charts), `30_js_fair_core.js` (simulator), `31_js_fair_view.js` (its drawing), `32_js_rd_ee.js` (section 5 animation), `33_js_rd_thr.js` (section 9 throttle replay), `34_js_tab_fair.js`, `35_js_tab_budget.js`. Tabs: `31_tab_fair.html` Fair-share stepper, `32_tab_budget.html` CPU budget lab, `39_tab_more.html`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, there was no old text. Measurements on a real kernel replace the "real data" of the training pages; things that need a 6.6+ kernel (EEVDF), privileges (perf, real-time in the root cgroup), real NUMA or a GPU are taught from sources and tagged "not run here"; EEVDF is shown through a simulator checked line by line against v6.12 source and labelled as a model.
