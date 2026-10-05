#!/bin/sh
# Re-record every measurement on this page, then rebuild the data and the page and check them.
# Needs Docker and the shared image kb-os-lab:1 (Dockerfile in ../../src/trace/lab/). Takes about 15 minutes.
# Containers are named os-proc-*, capped (--cpus, --memory) and removed after each run.
# DATA (default $TMPDIR/os-proc-data) holds the job's 8 MiB dataset outside the repository.
set -e
cd "$(dirname "$0")"
sh runs/run_c.sh            # E1 spawn cost, E2 signal queueing, E3 pipes, E4 fd sharing, E5 cloexec, E6 lifecycle, E9 syscall cost
sh runs/run_exec.sh         # E14b what survives execve
sh runs/run_reparent.sh     # E6b who adopts orphans
sh runs/run_clones.sh       # clone flags of subprocess, fork, thread
sh runs/run_meta.sh         # E9b strace's own calls
sh runs/run_py.sh           # P1 handler latency, P2 starting children from Python
sh runs/run_proc.sh         # P3 /proc snapshot of the running job
sh runs/run_shutdown.sh all # Shutdown lab, 10 variants x 3 runs
python3 build_data.py
node check_sim.mjs
python3 check_embed.py
sh build.sh
