#!/usr/bin/env python3
"""Locate every Ray 2.59.0 source line the page quotes, by pattern, and print file:line and the text as JSON.
usage: python3 ry_quotes.py <ray-2.59.0 checkout> > ../inputs/source_quotes.json
The checkout is a sparse shallow clone of github.com/ray-project/ray at tag ray-2.59.0
(commit dd83c3a703a5422d0b47f142cb380c6330817608). Python files match the installed wheel in mi-ray:1.
"""
import json, sys, os

ROOT = sys.argv[1]
Q = [
    ("max_direct_call_object_size", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int64_t, max_direct_call_object_size"),
    ("object_spilling_threshold", "src/ray/common/ray_config_def.h", "RAY_CONFIG(float, object_spilling_threshold"),
    ("min_spilling_size", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int64_t, min_spilling_size"),
    ("memory_usage_threshold", "src/ray/common/ray_config_def.h", "RAY_CONFIG(float, memory_usage_threshold"),
    ("memory_monitor_refresh_ms", "src/ray/common/ray_config_def.h", "RAY_CONFIG(uint64_t, memory_monitor_refresh_ms"),
    ("health_check_initial_delay_ms", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int64_t, health_check_initial_delay_ms"),
    ("health_check_period_ms", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int64_t, health_check_period_ms"),
    ("health_check_timeout_ms", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int64_t, health_check_timeout_ms"),
    ("health_check_failure_threshold", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int64_t, health_check_failure_threshold"),
    ("scheduler_spread_threshold", "src/ray/common/ray_config_def.h", "RAY_CONFIG(float, scheduler_spread_threshold"),
    ("lineage_pinning_enabled", "src/ray/common/ray_config_def.h", "RAY_CONFIG(bool, lineage_pinning_enabled"),
    ("max_lineage_bytes", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int64_t, max_lineage_bytes"),
    ("object_manager_default_chunk_size", "src/ray/common/ray_config_def.h", "RAY_CONFIG(uint64_t, object_manager_default_chunk_size"),
    ("automatic_object_spilling_enabled", "src/ray/common/ray_config_def.h", "RAY_CONFIG(bool, automatic_object_spilling_enabled"),
    ("task_max_retries", "python/ray/_private/ray_constants.py", "DEFAULT_TASK_MAX_RETRIES = 3"),
    ("object_store_proportion", "python/ray/_private/ray_constants.py", "DEFAULT_OBJECT_STORE_MEMORY_PROPORTION = env_float("),
    ("object_store_max", "python/ray/_private/ray_constants.py", "DEFAULT_OBJECT_STORE_MAX_MEMORY_BYTES = env_integer("),
    ("opt_max_retries", "python/ray/_common/ray_option_utils.py", '"max_retries": _counting_option('),
    ("opt_retry_exceptions", "python/ray/_common/ray_option_utils.py", '"retry_exceptions": Option('),
    ("opt_max_restarts", "python/ray/_common/ray_option_utils.py", '"max_restarts": _counting_option('),
    ("opt_max_task_retries", "python/ray/_common/ray_option_utils.py", '"max_task_retries": _counting_option('),
    ("hybrid_policy_doc", "src/ray/raylet/scheduling/policy/hybrid_scheduling_policy.h", "/// This scheduling policy was designed with the following assumptions in mind:"),
    ("hybrid_truncate", "src/ray/raylet/scheduling/policy/hybrid_scheduling_policy.h", "///   * Critical resource utilization below a threshold should be truncated to 0."),
    ("pg_2pc_prepare", "src/ray/gcs/gcs_placement_group_scheduler.h", "/// The first phase of 2PC."),
    ("pg_2pc_commit", "src/ray/gcs/gcs_placement_group_scheduler.h", "/// The second phase of 2PC."),
    ("health_fail_log", "src/ray/gcs/gcs_health_check_manager.cc", "Health check failed for node"),
    ("health_dead_log", "src/ray/gcs/gcs_health_check_manager.cc", "Node is dead because the health check failed"),
    ("oom_threshold_ctor", "src/ray/common/monitors/threshold_memory_monitor.cc", "memory_usage_threshold_bytes_(memory_usage_threshold_bytes)"),
    ("oom_compare", "src/ray/common/monitors/threshold_memory_monitor.cc", "bool is_usage_above_threshold = used_memory_bytes > memory_usage_threshold_bytes_"),
    ("oom_msg", "src/ray/common/monitors/threshold_memory_monitor.cc", "Memory usage %dB exceeded threshold of %dB"),
    ("train_v2_default", "python/ray/train/v2/_internal/constants.py", "return env_bool(V2_ENABLED_ENV_VAR, True)"),
    ("train_wg_timeout", "python/ray/train/v2/_internal/constants.py", "DEFAULT_WORKER_GROUP_START_TIMEOUT_S: float = 60.0"),
    ("train_health_interval", "python/ray/train/v2/_internal/constants.py", "DEFAULT_HEALTH_CHECK_INTERVAL_S: float = 2.0"),
    ("train_state_restarting", "python/ray/train/v2/_internal/execution/controller/state.py", "class RestartingState(TrainControllerState):"),
    ("train_state_scheduling", "python/ray/train/v2/_internal/execution/controller/state.py", "class SchedulingState(TrainControllerState):"),
    ("owner_died_doc", "python/ray/exceptions.py", "class OwnerDiedError(ObjectLostError):"),
    ("reconstruction_failed", "python/ray/exceptions.py", "class ObjectReconstructionFailedError(ObjectLostError):"),
    ("gcs_reconnect", "src/ray/common/ray_config_def.h", "RAY_CONFIG(uint32_t, gcs_rpc_server_reconnect_timeout_s"),
    ("max_io_workers", "src/ray/common/ray_config_def.h", "RAY_CONFIG(int, max_io_workers"),
    ("report_poll", "python/ray/train/v2/_internal/execution/checkpoint/report_handler.py", "def after_worker_group_poll_status("),
    ("report_wait_all", "python/ray/train/v2/_internal/execution/checkpoint/report_handler.py", "if not all(self._training_report_queues):"),
    ("controller_poll", "python/ray/train/v2/_internal/execution/controller/controller.py", "status = self._worker_group.poll_status(timeout=self._health_check_interval_s)"),
    ("failure_config_default", "python/ray/air/config.py", "max_failures: int = 0"),
    ("fusion_compat", "python/ray/data/_internal/logical/rules/operator_fusion.py", "def are_remote_args_compatible("),
    ("fusion_compare", "python/ray/data/_internal/logical/rules/operator_fusion.py", "if prev_args != remote_args:"),
    ("block_size", "python/ray/data/context.py", "DEFAULT_TARGET_MAX_BLOCK_SIZE = 128 * 1024 * 1024"),
]
out = []
for key, rel, pat in Q:
    path = os.path.join(ROOT, rel)
    hit = None
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        if pat in line:
            hit = (n, line.strip())
            break
    out.append({"key": key, "file": rel, "line": hit[0] if hit else None, "text": hit[1] if hit else None})
    if not hit:
        print("NOT FOUND", key, file=sys.stderr)
print(json.dumps({"tag": "ray-2.59.0", "commit": "dd83c3a703a5422d0b47f142cb380c6330817608", "quotes": out}, indent=1))
