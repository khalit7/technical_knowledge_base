#!/bin/sh
# Namespace creation cost (ns_cost.c) and the cost of a whole namespace set from the command line, inside
# docker run --rm --cap-add SYS_ADMIN --security-opt seccomp=unconfined kb-os-cont:1 sh /exp/cost.sh
gcc -O2 -o /tmp/ns_cost /exp/ns_cost.c
echo "### unshare(2) per namespace kind, microseconds (200 fresh children each)"; /tmp/ns_cost
t() { python3 - "$@" <<'PY'
import subprocess, sys, time, statistics
cmd = sys.argv[1:]; ts = []
for _ in range(30):
    t0 = time.perf_counter(); subprocess.run(cmd, check=True); ts.append((time.perf_counter() - t0) * 1e3)
print(f"median_ms {statistics.median(ts):.2f} min_ms {min(ts):.2f}  {' '.join(cmd)}")
PY
}
echo "### whole commands, milliseconds (30 runs each)"
t /bin/true
t unshare --fork --pid --mount --uts --ipc --cgroup --mount-proc /bin/true
t unshare --fork --pid --mount --uts --ipc --cgroup --net --mount-proc /bin/true
