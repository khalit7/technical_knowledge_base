#!/bin/sh
# Storage and data movement: object storage and metadata runs on SeaweedFS 4.48 (the root Storage lab's S3 stand-in),
# laid out as a real distributed store: one master, three volume servers, one filer with the S3 gateway.
# Also the metadata storm on a Docker volume and on a host folder shared into the VM (meta_real.py).
# usage: OUT=<raw dir> PYLIB=<dir with boto3> SCR=<scratch dir> sh run_seaweed.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SW=chrislusf/seaweedfs@sha256:4e61d15fd35994cb1e43e1e553dff106794841fd9a99ade2fc8c8bfce4d7872d
NET=sd-net
cleanup(){ docker rm -f sd-sw-m sd-sw-v1 sd-sw-v2 sd-sw-v3 sd-sw-f sd-cli2 >/dev/null 2>&1 || true; docker network rm $NET >/dev/null 2>&1 || true; docker volume rm sd-vol >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker network create $NET >/dev/null; docker volume create sd-vol >/dev/null
docker run -d --name sd-sw-m --network $NET --memory 256m --cpus 0.5 --entrypoint /usr/bin/weed $SW master -ip=sd-sw-m -port=9333 -volumeSizeLimitMB=64 -defaultReplication=000 >/dev/null
sleep 3
for v in 1 2 3; do docker run -d --name sd-sw-v$v --network $NET --memory 384m --cpus 0.5 --entrypoint /usr/bin/weed $SW volume -ip=sd-sw-v$v -port=8080 -master=sd-sw-m:9333 -dir=/data -max=24 >/dev/null; done
sleep 3
docker run -d --name sd-sw-f --network $NET --memory 512m --cpus 1 --entrypoint /usr/bin/weed $SW filer -ip=sd-sw-f -port=8888 -master=sd-sw-m:9333 -maxMB=4 -s3 -s3.port=8333 >/dev/null
sleep 6
mkdir -p "$OUT" "$SCR/bind_meta"
C="docker run --rm --name sd-cli2 --network $NET --memory 1g --cpus 2 -e PYTHONPATH=/pylib -v $PYLIB:/pylib:ro -v $HERE:/r:ro -v sd-vol:/vol -v $SCR/bind_meta:/bind -v $SCR/fmt:/fmt:ro python:3.12-slim nice -n 15 python3"
if [ -z "$SKIP_DONE" ]; then
$C /r/s3_lab.py chunkmap > "$OUT/sw_chunkmap.jsonl"
$C /r/s3_lab.py semantics > "$OUT/sw_semantics.jsonl"
fi
$C /r/s3_lab.py multipart --reps 3 > "$OUT/sw_multipart.jsonl"
$C /r/s3_lab.py list --reps 3 > "$OUT/sw_list.jsonl"
$C /r/s3_lab.py strange > "$OUT/sw_range.jsonl"
$C /r/meta_real.py --dir /vol/meta --label docker_volume --procs 1,4,16 --files 500 --reps 3 > "$OUT/meta_volume.jsonl"
$C /r/meta_real.py --dir /bind/meta --label host_folder --procs 1,4,16 --files 200 --reps 3 > "$OUT/meta_hostdir.jsonl"
$C /r/meta_real.py --s3 http://sd-sw-f:8333 --label s3_seaweedfs --procs 1,4,16 --files 200 --reps 3 > "$OUT/meta_s3.jsonl"
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' sd-sw-m sd-sw-v1 sd-sw-v2 sd-sw-v3 sd-sw-f > "$OUT/sw_mem.txt"
rm -rf "$SCR/bind_meta"
echo done
