#!/bin/sh
# Storage and data movement: the toy parallel file system runs (tpfs.py), in capped containers.
# usage: OUT=<raw dir> sh run_tpfs.sh   (from anywhere; needs the python:3.12-slim image)
# 4 object servers (0.5 CPU, 256 MB, 25 MB/s token bucket each), 1 or 2 metadata servers (0.5 CPU, 256 MB),
# one client container (2 CPUs, 768 MB). Everything is named sd-*, removed at the end.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
IMG=python:3.12-slim
NET=sd-net
docker network create $NET >/dev/null
cleanup(){ docker rm -f sd-ost0 sd-ost1 sd-ost2 sd-ost3 sd-mds0 sd-mds1 sd-cli >/dev/null 2>&1 || true; docker network rm $NET >/dev/null 2>&1 || true; }
trap cleanup EXIT
RUN="docker run -d --rm --network $NET -v $HERE/tpfs.py:/tpfs.py:ro --memory 256m --cpus 0.5 $IMG"
for i in 0 1 2 3; do docker run -d --rm --name sd-ost$i --network $NET -v $HERE/tpfs.py:/tpfs.py:ro --memory 256m --cpus 0.5 $IMG python3 /tpfs.py ost --mbps 25 >/dev/null; done
OSTS=sd-ost0:9000,sd-ost1:9000,sd-ost2:9000,sd-ost3:9000
for m in 0 1; do docker run -d --rm --name sd-mds$m --network $NET -v $HERE/tpfs.py:/tpfs.py:ro --memory 256m --cpus 0.5 $IMG python3 /tpfs.py mds --osts $OSTS >/dev/null; done
docker run -d --rm --name sd-cli --network $NET -v $HERE/tpfs.py:/tpfs.py:ro --memory 768m --cpus 2 $IMG sleep 3600 >/dev/null
sleep 2
X="docker exec sd-cli nice -n 15 python3 /tpfs.py bench"
mkdir -p "$OUT"
if [ -z "$SKIP_STRIPE" ]; then
$X stripe --mds sd-mds0:8000 --mib 128 --counts 1,2,4 --reps 3 > "$OUT/tpfs_stripe.jsonl"
$X stripe --mds sd-mds0:8000 --mib 128 --counts 4 --stripe-kib 64 --reps 3 > "$OUT/tpfs_stripe64k.jsonl"
fi
$X nproc --mds sd-mds0:8000 --procs 4 --mib 64 --reps 3 > "$OUT/tpfs_nproc.jsonl"
$X meta --mds sd-mds0:8000 --procs-list 1,2,4,8,16 --files 300 --reps 3 > "$OUT/tpfs_meta1.jsonl"
$X meta --mds sd-mds0:8000,sd-mds1:8000 --procs-list 16 --files 300 --reps 3 > "$OUT/tpfs_meta2.jsonl"
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' sd-ost0 sd-mds0 sd-cli > "$OUT/tpfs_mem.txt"
echo done
