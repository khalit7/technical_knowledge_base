#!/bin/sh
# Storage and data movement: which side saturates in the toy metadata storm? The same meta benchmark with 1 metadata server,
# 4, 16 and 32 clients, while `docker stats` samples the CPU of the metadata server and of the client container.
# usage: OUT=<raw dir> sh run_tpfs_cpu.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
IMG=python:3.12-slim; NET=sd-net
docker network create $NET >/dev/null
cleanup(){ docker rm -f sd-ost0 sd-mds0 sd-cli >/dev/null 2>&1 || true; docker network rm $NET >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --rm --name sd-ost0 --network $NET -v $HERE/tpfs.py:/tpfs.py:ro --memory 256m --cpus 0.5 $IMG python3 /tpfs.py ost --mbps 25 >/dev/null
docker run -d --rm --name sd-mds0 --network $NET -v $HERE/tpfs.py:/tpfs.py:ro --memory 256m --cpus 0.5 $IMG python3 /tpfs.py mds --osts sd-ost0:9000 >/dev/null
docker run -d --rm --name sd-cli --network $NET -v $HERE/tpfs.py:/tpfs.py:ro --memory 768m --cpus 2 $IMG sleep 3600 >/dev/null
sleep 2
for P in 4 16 32; do
  ( for i in 1 2 3 4 5 6; do docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' sd-mds0 sd-cli | sed "s/^/P=$P /"; done ) > "$OUT/tpfs_cpu_P$P.txt" &
  SP=$!
  docker exec sd-cli nice -n 15 python3 /tpfs.py bench meta --mds sd-mds0:8000 --procs-list $P --files 300 --reps 2 >> "$OUT/tpfs_meta_cpu.jsonl"
  wait $SP
done
echo done
