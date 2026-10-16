# Verified facts (ry, Ray child page), 2026-10-16

Source: Ray at tag ray-2.59.0 (commit dd83c3a), lines located by `scripts/ry_quotes.py` (`inputs/source_quotes.json`). Measured: Ray 2.59.0 in containers (head 0 CPUs, 2 workers x 2 CPUs, 80 MB object store each), Apple M1 Pro, Docker Desktop VM, shared machine.

## Defaults in source
- max_direct_call_object_size 100 KB (ray_config_def.h 274); object_spilling_threshold 0.8 (827); min_spilling_size 100 MB (813); max_io_workers 4 (807); automatic_object_spilling_enabled true (804); object_manager_default_chunk_size 5 MB (432).
- memory_usage_threshold 0.95 (79), memory_monitor_refresh_ms 250 (83). The threshold in bytes is fixed at raylet start (threshold_memory_monitor.cc 33, compare at 126).
- GCS health checks: initial delay 5000 ms, period 3000 ms, timeout 10000 ms, failure threshold 5 (ray_config_def.h 1058-1064). gcs_rpc_server_reconnect_timeout_s 60 (549).
- scheduler_spread_threshold 0.5 (252); lineage_pinning_enabled true (208); max_lineage_bytes 1 GB (224).
- Tasks max_retries 3 (ray_constants.py 633); retry_exceptions False; actors max_restarts 0, max_task_retries 0 (ray_option_utils.py 182, 207, 254, 255).
- Object store default 30% of memory (ray_constants.py 110), max 200 GB (106).
- Ray Train v2 on by default (train/v2/_internal/constants.py 149); worker group start timeout 60 s (44); controller poll / health check interval 2.0 s (35; controller.py 436); FailureConfig max_failures 0 (air/config.py 368). Reports consolidated only when every worker's report is in (report_handler.py 40, 63).
- Ray Data target max block 128 MiB (data/context.py 76); fusion requires compatible remote args (operator_fusion.py 886-899).

## Measured
- Task round trip median 2.96 ms; 1,000 tasks 0.439 s; actor call median 0.95 ms; 1,000 actor calls 0.229 s, in order; actor creation 0.16 s.
- Eight 0.5 s tasks on 4 CPUs: 1.12 s submitted together, 4.03 s with ray.get in the loop.
- 1 KB result: no store location (inline); 1 MB: in the producing node's store, copied to the head on ray.get; numpy from ray.get is read-only. 16 MB cross-node read 0.42 s, then 5 ms locally.
- 14 x 8 MB into an 80 MB store: Spilled 64 MiB, 8 objects at 212 MiB/s; restored 64 MiB at 1591 MiB/s; spilled reads ~9 ms vs ~4 ms in memory. Spill/restore IO workers stayed resident (~400 MB RSS on a 1.1 GB node) and caused a later Ray Train OOM kill ("Memory usage 1104416768B exceeded threshold of 1095761920B (95.0% of 1153433600B limit)").
- Node kill: first failed health check 11.7 s, node dead 29.9 s; task output rebuilt from lineage on the other worker (31.4 s); max_retries=0 output -> ObjectReconstructionFailedError (OBJECT_UNRECONSTRUCTABLE_RETRIES_DISABLED); ray.put inside a task on the dead node -> OwnerDiedError; 1 KB inline output unaffected; actor max_restarts=1 restarted on w1 with state reset; max_restarts=0 -> ActorDiedError.
- docker update raising the head's cap to 2000m did not raise Ray's kill threshold (stayed 95% of 1500 MiB = 1494220800 B).
- Head idle: GCS 47 MB RSS, raylet 27 MB, dashboard + modules 1134 MB of 1654 MB summed RSS; docker stats 692 MB.
- Ray Data (24 blocks, 2 map stages, 0.1 s consumer): fused streaming first batch 2.38 s / total 6.77 s; unfused 3.13 / 8.82; staged 5.07 / 9.15 (materialize at 4.60 s). ds.stats shows MapBatches(encode)->MapBatches(window) fused into 24 tasks.
- Ray Train with its checkpoint API, crash rank 3 at step 120, max_failures 1, checkpoints every 50: restored from step 50 in 3 of 3 runs although step 100 was reported and uploaded; the step-100 directory remained as an orphan after num_to_keep=2; crash to new workers 6.3 to 6.9 s; final global loss 2.2638771533966064 (uninterrupted 2.2638769149780273; differences of 2.4e-7 at steps 70, 180, 200).
