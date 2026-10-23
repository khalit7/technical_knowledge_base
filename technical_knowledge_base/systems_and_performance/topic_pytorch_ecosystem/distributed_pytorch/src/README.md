# Source of "Distributed PyTorch: c10d, DDP, FSDP2, DTensor, TP, PP, DCP"

Child 3 of Topic: pytorch-ecosystem. Goes one level below the parent's Reading section 7 and its Distributed lab tab, on the same running example, which every script imports unchanged from `../../src/model/`; the lab's helpers (flight-recorder reader, memory profiler timeline) are imported by path from `../../src/dist/common.py`. The old page's text is `../../src/read/old/distributed_pytorch.md`; every claim is accounted for in `coverage.md`.

## Rebuild

Shared venv (torch 2.14.1) as `PY`, its `torchrun` as `TORCHRUN`, a scratch folder outside the repo as `DPT_SCRATCH` and `DST_SCRATCH`. All launches go through `exp/run.sh` (loopback only, `MASTER_ADDR=127.0.0.1`; ports 29530-29539 belong to this page; one thread per process; `TORCH_FR_BUFFER_SIZE` on).

```sh
cd exp
# deterministic recordings (no lock): collectives, sizes, placements, losses, memory
sh run.sh 4 c10d.py                                   # -> c10d.json
sh repeat_elastic.sh 10                               # torchrun --max-restarts 2, 10 runs -> elastic.json, elastic_repeats.json
PORT=29533 sh run.sh 2 ddp_more.py hooks --tag hooks_w2   # all hooks in one launch
sh run_hooks.sh 4                                     # one launch per hook on 4 ranks (two PowerSGD runs abort) -> hooks_w4.json
PORT=29533 sh run.sh 2 ddp_more.py batched --steps 4; python3 merge_ranks.py batched 2
sh run_psgd_race.sh                                   # PowerSGD issue order per rank -> psgd_race.json
PORT=29533 sh run.sh 2 ddp_more.py nosync ; PORT=29533 sh run.sh 2 ddp_more.py unused
PORT=29533 DPT_TIMEOUT=10 sh run.sh 2 ddp_more.py join; python3 merge_ranks.py join 2
sh run_fsdp.sh                                        # fsdpm_*.json (FSDP2 4, DDP 4, HSDP, reshard 2, prefetch, mp, offload, accum, statedict, fsdp1)
PORT=29535 sh run.sh 4 fsdp_tp.py                     # -> fsdpm_fsdp_tp.json
PORT=29536 sh run.sh 2 dtensor_prop.py
for m in tp tp1 tpsp; do PORT=29537 sh run.sh 2 tp_sp.py $m; done
PORT=29536 sh run.sh 4 cp.py; mv ../inputs/cp.json ../inputs/cp_w4.json; PORT=29536 sh run.sh 2 cp.py
PORT=29537 sh run.sh 8 compose3d.py
sh run_fr.sh                                          # flight recorder dump + torchfrtrace -> fr_trace.json
# timed, under the shared bench lock (lock.sh acquire bench dpt ... release)
sh run_timed.sh                                       # coll_time_w2/w4.json, pps_*.json (pipeline schedules, 5 repeats)
PORT=29536 sh run.sh 4 dcp_more.py                    # -> dcp_more.json (async save times are the only timing in it)
cd .. && python3 ddp_timeline.py && python3 build_data.py && sh build.sh && python3 check_data.py && node check_page.mjs ../index.html <shots dir>
```

`inputs/dcp_async_samepg.json` was written from the log of the run where `async_save` used the default group: gloo aborted two processes before Python could record anything. `coll_time_w4.json` stops at 16 MiB because a 64 MiB `all_gather_into_tensor` on 4 gloo processes aborted every process.

## Files

| File | What it is |
|---|---|
| `exp/dptc.py` | helpers: the lab's recorder imported by path, per-rank dump and merge into `inputs/`, explicit CPU meshes |
| `exp/dpt_parts.py` | run-time adapters around the unchanged model: attention with separate q, k, v (so a column split keeps whole heads) and pipeline pieces |
| `exp/c10d.py`, `elastic.py`, `run_elastic.sh`, `repeat_elastic.sh` | torchrun environment, backend choice, store, subgroups, every collective's payload, MPS; elastic restart |
| `exp/coll_time.py` | collective time against size (timed) |
| `exp/ddp_more.py`, `run_hooks.sh`, `psgd_race.py`, `run_psgd_race.sh`, `merge_ranks.py` | DDP hooks, batched PowerSGD, PowerSGD order race, no_sync, unused parameters, Join |
| `exp/fsdp_more.py`, `run_fsdp.sh`, `fsdp_tp.py` | FSDP2 policies and layouts, FSDP1 |
| `exp/dtensor_prop.py` | sharding propagation, from_local, a custom op with and without a strategy |
| `exp/tp_sp.py` | TP (two plans) and TP + SP on 2 ranks |
| `exp/cp.py` | context parallel: public API and ring template |
| `exp/pp_sched.py` | every pipeline schedule (timed) |
| `exp/dcp_more.py` | async save, resharding to HSDP, single file, HF safetensors |
| `exp/compose3d.py` | PP x FSDP x TP on 8 ranks |
| `exp/fr_skip.py`, `run_fr.sh` | flight-recorder dump and torchfrtrace |
| `ddp_timeline.py` | reshapes the parent lab's recorded DDP run (`../../src/dist/inputs/ddp_w2.json`) into `inputs/ddp_buckets.json` for the bucket stepper; no new run |
| `ledger.json` | knowledge ledger (`html_utils/ledger.py check`) |
| `build_data.py` | `inputs/` -> `parts/22_dpt_data.js` |
| `check_data.py` | embedded data = inputs; prose numbers = data; privacy and dash grep |
| `check_page.mjs` | puppeteer: every control at 390 dark and 920 light (tabs t-read, t-dpt-mesh, t-more) |
| `parts/` | `20_read*.html` + `21_js_rd_common.js` (skill template, never autoplays), `23_dpt_util.js`, `24_dpt_rd.js`, `25_dpt_sp.js`, `26_dpt_hook.js` (hook lab, closed block in section 3), `27_dpt_pipe.js` (schedule explorer, section 8), `28_dpt_fig.js` (hero and the new static figures and DDP stepper) (Reading); `32_*` mesh explorer; `39_tab_more.html`; `99_js_tabs.js` (skill template, key `dpt-tab`) |

## Sources read (pinned)

PyTorch v2.14.1 (wheel Python files, identical to the tag per the torch_compile child's comparison): `torch/distributed/distributed_c10d.py` (backend maps L506-511), `algorithms/ddp_comm_hooks/default_hooks.py` (L18-32, L57-71), `powerSGD_hook.py` (L18-26, L79-104, L180-190, L808), `fsdp/_fully_shard/` (class swap), `tensor/experimental/_context_parallel/_attention.py` (L317, L668-697, L907-955, L1525), `pipelining/schedules.py` (L1083-3894, schedule classes), `pipelining/stage.py` (L857-869 scale_grads, L949-1164), `checkpoint/state_dict_saver.py` (async_save L221-262), `flight_recorder/components/builder.py` (L116, L212), `csrc/distributed/c10d/ProcessGroupGloo.cpp` (L1557-1604, via the lab). torchtitan 0.3.0 (tag v0.3.0): `distributed/parallel_dims.py` (build_mesh), `distributed/pipeline_parallel.py` (L65-125, L550-570), `models/llama3/parallelize.py` (L25-94), `config/configs.py` (L85, L93, L136, L210, L226), `components/checkpointer/dcp.py` (L189, L294-305).

## Departures from the method

A child page (topic method, Part B), but its depth is in runs rather than published figures: the "reproduce a published number" rule is applied where a formula exists (PowerSGD bytes from shapes, the bubble formula on the ideal clock, the busbw convention) and otherwise every number is a recording. Failures are kept as findings (see `viz_ideas.md`).

## The 2026-10-23 rebuild to the teaching contract
Editing and new figures only; no new runs (the DDP stepper reshapes the parent lab's existing recording).
- **Top**: the core idea in one sentence, a static hero (what each rank holds under DDP, FSDP2, TP and PP, with the recorded collectives per step beside it), "You need" (the forms are owned by Distributed Training), new terms. The old "In one screen" table is a closed block.
- **A figure beside every core idea**, chosen by kind: c10d (static: torchrun, store, mesh groups); collectives (the timing chart and predict block kept); DDP (new before/after stepper over the recorded backward: one bucket in step 0 against the rebuilt buckets, ticks at recorded ready times); FSDP2 (new static: the 14 collectives of one step per unit, plus the prefetch timeline); DTensor (new static: three placements and the S(1) x S(0) -> P -> relu -> all-reduce rule); TP and SP (the existing before/after animation; it no longer starts playing on a mode switch); pipelining (the schedule explorer moved inline from its tab); DCP (new static: shard files, the map, two read-backs); composing (new to-scale figure of one weight cut by TP then FSDP); debugging (new static: the first disagreeing sequence number).
- **Tabs**: the Comm-hook bytes lab explained one mechanism, so it is a closed block in section 3 (hooks are a DDP option, not needed on first read); the Pipeline schedules tab is inline in section 8; the Mesh explorer stays a tab because sections 1, 3, 4 and 10 all use it.
- **Ownership**: the forms (ZeRO, SP maths, the bubble, ring attention and its load balancing) are linked to Distributed Training sections 4, 5, 6 and 8; the ring-attention explanation was cut to the API (ledger: one unit `owned:`). Model formats now point to Local and on-device inference, section 3.
- **Depth into closed blocks**: torchrun's variables, the store chain, the Mac backend trap, flaky restarts; the GPU caveat for timings; unused-parameter and Join measurements, gradient views, DDPOptimizer; the hook lab; reshard_after_forward as an integer, accumulation numbers, offload, state dicts, the unsharded root, FSDP1 against FSDP2; all 28 DTensor cases, from_local traps, a custom op's strategy; DCP's failure log, files and safetensors; the 8-process table; the analyser on gloo; what carries over to GPUs; the mistakes, condensed to one line each.
- **Deleted as fat**: the interview block (each answer restated a section; its unique points, HSDP's when-to-pick and the 512-GPU hang, moved into sections 4 and 11), wind-ups, pointers to removed tabs.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 39.6 min (9,117 words) | 29.9 min (6,867) |
| Reading, closed details | 3.6 min | 19.3 min |
| Other tabs, core | hook lab 3.0 + mesh 1.4 + pipeline 4.4 = 8.8 min (plus Further reading 2.4) | mesh 1.4 (plus Further reading 2.5) |
| Visuals drawn in Reading | 3 | 14 |

Why 30 minutes is right: the page owns ten APIs (launch and groups, collectives, DDP, FSDP2, DTensor, TP and SP, CP, pipelining, DCP, composition) plus debugging, and the core now carries, for each, what it makes a rank hold, what it sends (recorded counts and bytes), one figure, and the one finding that changes how you use it. What made it long before (option-by-option measurements, failure logs, per-rank tables, interview answers) is closed and optional; closed time grew because the hook lab and the pipeline tables moved in from tabs.

## Knowledge ledger (`src/ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
345 units: core 228, depth 78, fat 38, owned 1 (ring attention's merge by log-sum-exp, on Distributed Training section 8). 334 drafted by `ledger.py init` from the page before the rebuild; 11 added by hand for the script-drawn figures (section "added 2026-10-23"). Fat units carry a `note`.
