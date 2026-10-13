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
cd .. && python3 build_data.py && sh build.sh && python3 check_data.py && node check_page.mjs ../index.html <shots dir>
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
| `build_data.py` | `inputs/` -> `parts/22_dpt_data.js` |
| `check_data.py` | embedded data = inputs; prose numbers = data; privacy and dash grep |
| `check_page.mjs` | puppeteer: every control at 390 dark and 920 light |
| `parts/` | `20_read*.html` + `23_dpt_util.js`, `24_dpt_rd.js`, `25_dpt_sp.js` (Reading); `31_*` hook lab; `32_*` mesh explorer; `33_*` pipeline schedules; `39_tab_more.html` |

## Sources read (pinned)

PyTorch v2.14.1 (wheel Python files, identical to the tag per the torch_compile child's comparison): `torch/distributed/distributed_c10d.py` (backend maps L506-511), `algorithms/ddp_comm_hooks/default_hooks.py` (L18-32, L57-71), `powerSGD_hook.py` (L18-26, L79-104, L180-190, L808), `fsdp/_fully_shard/` (class swap), `tensor/experimental/_context_parallel/_attention.py` (L317, L668-697, L907-955, L1525), `pipelining/schedules.py` (L1083-3894, schedule classes), `pipelining/stage.py` (L857-869 scale_grads, L949-1164), `checkpoint/state_dict_saver.py` (async_save L221-262), `flight_recorder/components/builder.py` (L116, L212), `csrc/distributed/c10d/ProcessGroupGloo.cpp` (L1557-1604, via the lab). torchtitan 0.3.0 (tag v0.3.0): `distributed/parallel_dims.py` (build_mesh), `distributed/pipeline_parallel.py` (L65-125, L550-570), `models/llama3/parallelize.py` (L25-94), `config/configs.py` (L85, L93, L136, L210, L226), `components/checkpointer/dcp.py` (L189, L294-305).

## Departures from the method

A child page (topic method, Part B), but its depth is in runs rather than published figures: the "reproduce a published number" rule is applied where a formula exists (PowerSGD bytes from shapes, the bubble formula on the ideal clock, the busbw convention) and otherwise every number is a recording. Failures are kept as findings (see `viz_ideas.md`).
