# Distributed lab (tab `t-dist`): sources and how to rebuild

Owns `../parts/33_tab_dist_a..d.html`, `../parts/33_dst_1core.js`, `33_dst_2anim.js`, `33_dst_3more.js` and `../parts/33_dst_0data.js` (generated). Imports the running example from `../model/` (never copies it).

## Rebuild

All runs are CPU processes on the gloo backend, one thread each, launched by `run.sh` (loopback only: without `MASTER_ADDR=127.0.0.1`, `torchrun` on macOS waited forever at the rendezvous). With the shared venv:

```sh
export TORCHRUN=<venv>/bin/torchrun PYTHON=<venv>/bin/python DST_SCRATCH=<a folder outside the repo>
sh runall.sh                       # every deterministic recording (a few minutes; no lock needed)
# step times, under the shared bench lock:
sh run.sh 1 time_dist.py --mode plain --tag t_plain_w1_r1   # and ddp/fsdp on 2 and 4 ranks, two repeats
python3 build_data.py              # inputs/ -> ../parts/33_dst_0data.js
sh ../build.sh && node check_page.mjs <shots dir> && python3 check_data.py
```

## Scripts

| Script | What it records |
|---|---|
| `common.py` | init (gloo), the flight-recorder reader (`_dump_fr_trace_json`, fields kept: name, sizes, dtypes, seq id, time), memory via `torch.profiler._memory_profiler` timelines, per-rank dump and merge |
| `ddp.py` | 3 DDP steps: bucket layout before and after each step, every collective, the moment each gradient became final, construction collectives, the averaged-gradient check against one process, per-rank memory |
| `fsdp.py` | `fully_shard` on each block then the root (explicit CPU mesh; the default mesh picks MPS on a Mac and fails): local shard shapes per rank, the 14 collectives of a step, per-block forward times, memory; `--no-reshard` |
| `dtensor.py` | every (source, target) placement pair on 1-D meshes of 2 and 4 and a 2 x 2 mesh: `CommDebugMode` counts, flight-recorder ops, every rank's local values, `full_tensor()` check, errors |
| `tp.py` | ColwiseParallel/RowwiseParallel on the MLPs (2 ranks) with loss and gradient checks; the fused-qkv failure; `--2d`: FSDP2 x TP on 2 x 2 |
| `pp.py` | 2-stage pipeline, 4 micro-batches, GPipe and 1F1B: action order (module hooks), send/recv (wrapping `schedules._batch_p2p`), memory, tied-weight gradient before and after the extra all-reduce |
| `dcp.py` | DCP save from 4 FSDP2 ranks, load into 2 ranks and into one process (`no_dist=True`): files, metadata chunks, exact equality with the saved weights |
| `hang.py` | a skipped collective, a size mismatch (with and without `TORCH_DISTRIBUTED_DEBUG=DETAIL`), `monitored_barrier`; 10 s timeout; error text (paths removed) and flight-recorder entries |
| `time_dist.py` | step time, plain / DDP / FSDP2 on 1, 2, 4 ranks (bench lock) |
| `build_data.py`, `check_page.mjs`, `check_data.py` | compact data for the page; browser checks (every control at 390 dark and 920 light, DTensor values derived in the page = recorded values for all 990 rank-pairs); embedded data = inputs and prose numbers = data |

`inputs/hang_shape_off.json` was written from the run's log: the size mismatch without debug aborted rank 1 inside gloo (SIGABRT) before Python could record anything.

## Sources read (pinned)

PyTorch v2.14.1: `torch/nn/parallel/distributed.py` (bucket caps L31-33, L86-110; first-iteration single bucket L151-154), `torch/csrc/distributed/c10d/reducer.cpp` (`verify_params_across_processes` L2422), `ProcessGroupGloo.cpp` (reduce-scatter as all-reduce L1557-1604), `ProcessGroupNCCL.hpp` L159 and `Backend.hpp` L37 (default timeouts), `FlightRecorder.hpp` (`TORCH_FR_BUFFER_SIZE`), `torch/distributed/fsdp/_fully_shard/_fully_shard.py` L180-190, `_fsdp_init.py` L198-208, `device_mesh.py` L496. torchtitan 0.3.0 (wheel): `distributed/fsdp.py` L180-207, `models/common/attention.py` L785-797.

## Departures from the method

This is a data tab of a root page (topic method, Part A), built as a lab because the topic's spine is one training step: the same step under each strategy, recorded. The theory of ZeRO and the parallelism maths stays on Distributed Training; this tab links it and checks its 1.5x communication ratio against recorded payloads.
