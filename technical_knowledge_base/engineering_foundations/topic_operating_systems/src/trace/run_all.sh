#!/bin/sh
# Record every trace and measurement the Syscall tracer tab shows, then rebuild its data.
# Needs Docker. Builds kb-os-lab:1 (lab/Dockerfile) and kb-os-tr:1 (Dockerfile.tr) if absent.
# Untraced timings run first and alone (2 CPUs), so the traced runs do not steal their CPU.
# Output: raw/ (redacted; big traces gzipped), then data/trace_data.json and ../parts/32_js_tr_0data.js.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
RAW="$HERE/raw"; mkdir -p "$RAW"
docker image inspect kb-os-lab:1 > /dev/null 2>&1 || docker build -t kb-os-lab:1 "$HERE/lab"
docker image inspect kb-os-tr:1 > /dev/null 2>&1 || docker build -t kb-os-tr:1 -f "$HERE/Dockerfile.tr" "$HERE"
run() {  # $1 = container suffix, rest = experiments
  n=$1; shift
  docker run --rm --name "os-tr-$n" --cpus 2 --memory 3g --shm-size 256m \
    --cap-add SYS_PTRACE --security-opt seccomp=unconfined \
    -e DEBUGINFOD_URLS=https://debuginfod.debian.net \
    -v "$HERE":/t:ro -v "$RAW":/raw kb-os-tr:1 sh /t/scripts/in_container.sh "$@"
}
run env env_info
run timing timing epochs writes ckpt
run startup startup &
run lang lang &
run fork job:fork &
wait
run spawn job:spawn &
run fsrv job:forkserver &
wait
python3 "$HERE/scripts/redact.py" "$RAW"
python3 "$HERE/scripts/parse.py"
