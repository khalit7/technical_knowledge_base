"""Locate PyTorch fault-detection defaults and messages in a source tree.

Usage: python3 ft_quotes.py <pytorch_clone_root> <out.json>
Each entry is found by a regex, so line numbers stay correct for the tag the
clone is at. Only paths relative to the clone root are written.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

C10D = "torch/csrc/distributed/c10d"
PATTERNS = [
    ("backend_default_timeout", f"{C10D}/Backend.hpp", r"constexpr auto kBackendDefaultTimeout", 1,
     "Default timeout of every other backend (gloo): next line, 30 minutes."),
    ("nccl_default_timeout", f"{C10D}/ProcessGroupNCCL.hpp", r"constexpr auto kProcessGroupNCCLDefaultTimeout", 1,
     "Default collective timeout for the NCCL process group (next line: 10 * 60 * 1000 ms = 10 minutes)."),
    ("error_handling_modes", f"{C10D}/ProcessGroupNCCL.hpp", r"^enum ErrorHandlingMode", 5,
     "Modes of TORCH_NCCL_ASYNC_ERROR_HANDLING: 0 NoHandling, 1 TearDown, 2 CleanUpOnly, 3 SkipCleanUp."),
    ("error_handling_modes_doc", f"{C10D}/ProcessGroupNCCL.hpp", r"^// NoHandling: do not handle", 6,
     "Comment describing each mode."),
    ("async_error_handling_default", f"{C10D}/ProcessGroupNCCL.cpp", r"getCvarInt\(TORCH_NCCL_ASYNC_ERROR_HANDLING", 0,
     "Default 3 = SkipCleanUp: tear the process down without ncclCommAbort."),
    ("blocking_wait_default", f"{C10D}/ProcessGroupNCCL.cpp", r"blockingWait_ = getCvarBool\(TORCH_NCCL_BLOCKING_WAIT", 0,
     "Default false: wait() is non-blocking and the watchdog thread handles timeouts."),
    ("blocking_wait_no_watchdog", f"{C10D}/ProcessGroupNCCL.cpp", r"TORCH_NCCL_BLOCKING_WAIT is enabled, NO watchdog", 0,
     "With blocking wait on, no watchdog thread is created."),
    ("trace_buffer_default_pg", f"{C10D}/ProcessGroupNCCL.cpp", r"traceBufferSize_ = getCvarInt\(TORCH_NCCL_TRACE_BUFFER_SIZE", 0,
     "Flight recorder ring buffer entries, default 2000."),
    ("fr_buffer_default", f"{C10D}/FlightRecorder.hpp", r'\{"TORCH_FR_BUFFER_SIZE", "TORCH_NCCL_TRACE_BUFFER_SIZE"\}', 0,
     "FlightRecorder reads TORCH_FR_BUFFER_SIZE first, then TORCH_NCCL_TRACE_BUFFER_SIZE; default 2000; enabled when > 0."),
    ("trace_buffer_doc", f"{C10D}/ProcessGroupNCCL.hpp", r"^// The maximum number of events we store in the flight", 1,
     "Meaning of the buffer size."),
    ("heartbeat_timeout_default", f"{C10D}/ProcessGroupNCCL.cpp", r"getCvarInt\(TORCH_NCCL_HEARTBEAT_TIMEOUT_SEC", 0,
     "Heartbeat monitor timeout, default 480 s (8 minutes)."),
    ("wait_timeout_dump_default", f"{C10D}/ProcessGroupNCCL.cpp", r"getCvarInt\(TORCH_NCCL_WAIT_TIMEOUT_DUMP_MILSEC", 0,
     "Extra time to wait for the debug dump before exiting, default 15 s."),
    ("coord_check_default", f"{C10D}/ProcessGroupNCCL.cpp", r"getCvarInt\(TORCH_NCCL_COORD_CHECK_MILSEC", 0,
     "Monitor thread polls for dump signals from other ranks every 1000 ms."),
    ("dump_on_timeout_default", f"{C10D}/ProcessGroupNCCL.cpp", r"dumpOnTimeoutOrEx_ = getCvarBool\(TORCH_NCCL_DUMP_ON_TIMEOUT", 0,
     "Default true: dump flight recorder on timeout or exception."),
    ("enable_monitoring_default", f"{C10D}/ProcessGroupNCCL.cpp", r"getCvarBool\(TORCH_NCCL_ENABLE_MONITORING", 0,
     "Default true: heartbeat monitor thread kills the process if the watchdog stops making progress."),
    ("enable_monitoring_doc", f"{C10D}/ProcessGroupNCCL.hpp", r"^// Enable monitoring thread which aborts the process", 4,
     "Meaning of TORCH_NCCL_ENABLE_MONITORING."),
    ("dump_on_timeout_doc", f"{C10D}/ProcessGroupNCCL.hpp", r"^// Control whether dumping debug info on watchdog", 2,
     "Meaning of TORCH_NCCL_DUMP_ON_TIMEOUT."),
    ("msg_watchdog_timeout", f"{C10D}/ProcessGroupNCCL.cpp", r'"Watchdog caught collective operation timeout: "', 4,
     "Message when a collective exceeds its timeout (watchdog thread)."),
    ("msg_heartbeat_stuck", f"{C10D}/ProcessGroupNCCL.cpp", r'"ProcessGroupNCCL\'s watchdog got stuck for "', 3,
     "Message when the heartbeat monitor sees no watchdog progress. There is no literal 'Heartbeat monitor timed out' string at this tag."),
    ("msg_heartbeat_exit_reason", f"{C10D}/ProcessGroupNCCL.cpp", r'exitReason = "ProcessGroupNCCL watchdog hang"', 0,
     "Exit reason recorded for the heartbeat abort."),
    ("msg_dump_signal", f"{C10D}/ProcessGroupNCCL.cpp", r'"Received a dump signal due to a collective timeout from "', 0,
     "Message on ranks told by another rank (via the store) to dump."),
    ("msg_terminating", f"{C10D}/ProcessGroupNCCL.cpp", r'"Terminating the process after attempting to dump debug info, due to "', 0,
     "Final exit message of the heartbeat monitor."),
    ("msg_blocking_wait_timeout", f"{C10D}/ProcessGroupNCCL.cpp", r'" timed out in blocking wait\."', 0,
     "Message with TORCH_NCCL_BLOCKING_WAIT=1."),
    ("msg_some_ops_failed", f"{C10D}/ProcessGroupNCCL.cpp", r'"Some NCCL operations have failed or timed out\. Due to the "', 0,
     "Start of the teardown message in WorkNCCL::handleException."),
    ("nccl2_async_default", f"{C10D}/nccl2/ProcessGroupNCCLBackend.cpp", r"::c10d::TORCH_NCCL_ASYNC_ERROR_HANDLING,", 1,
     "The new nccl2 backend uses the same default, SkipCleanUp."),
    ("elastic_monitor_interval_cli", "torch/distributed/run.py", r'"--monitor-interval",', 5,
     "torchrun --monitor-interval default 0.1 s."),
    ("elastic_monitor_interval_spec", "torch/distributed/elastic/agent/server/api.py", r"^    monitor_interval: float = 0\.1", 0,
     "WorkerSpec.monitor_interval default 0.1 s."),
    ("elastic_max_restarts_spec", "torch/distributed/elastic/agent/server/api.py", r"^    max_restarts: int = 3", 0,
     "WorkerSpec.max_restarts default 3 (torchrun CLI default is 0)."),
    ("elastic_max_restarts_cli", "torch/distributed/run.py", r'"--max-restarts",', 5,
     "torchrun --max-restarts default."),
    ("elastic_health_check_port", "torch/distributed/elastic/agent/server/local_elastic_agent.py", r'^TORCHELASTIC_HEALTH_CHECK_PORT = ', 0,
     "Env var: if set, the agent starts a health-check server on that port."),
    ("elastic_health_check_timeout", "torch/distributed/elastic/agent/server/local_elastic_agent.py", r"^\s+timeout=60,", 0,
     "Health-check server: agent considered dead if last progress older than 60 s."),
    ("elastic_dstate_timeout", "torch/distributed/elastic/agent/server/local_elastic_agent.py", r"^# Seconds a worker may spend in Linux uninterruptible", 3,
     "TORCHELASTIC_UNINTERRUPTIBLE_STATE_TIMEOUT: D-state check, off unless set."),
]


def main() -> None:
    root, out = Path(sys.argv[1]), Path(sys.argv[2])
    try:
        tag = subprocess.run(["git", "-C", str(root), "describe", "--tags"],
                             capture_output=True, text=True).stdout.strip()
    except OSError:
        tag = ""
    results = []
    for key, rel, pat, extra, note in PATTERNS:
        lines = (root / rel).read_text(encoding="utf-8", errors="replace").splitlines()
        rx = re.compile(pat)
        hit = next((i for i, l in enumerate(lines) if rx.search(l)), None)
        if hit is None:
            results.append({"key": key, "file": rel, "found": False, "note": note})
            print(f"MISSING {key}: {rel}")
            continue
        quote = "\n".join(lines[hit:hit + 1 + extra])
        results.append({"key": key, "file": rel, "line": hit + 1,
                        "quote": quote, "note": note, "found": True})
        print(f"{rel}:{hit + 1}  {key}")
    out.write_text(json.dumps({"pytorch_tag": tag, "quotes": results}, indent=1) + "\n")


if __name__ == "__main__":
    main()
