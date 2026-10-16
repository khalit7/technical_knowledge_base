#!/bin/sh
# Storage lab: the same checkpoint (three sizes) written and read on six local stand-ins for storage tiers.
# usage: OUT=<dir> SCR=<scratch dir> PY=<host python with torch and boto3> PYLIB=<dir with boto3 for the container> sh run_tiers.sh
# Needs: image mi-train:1 (the running example's image), network io-net, volume io-vol, container io-s3 (SeaweedFS S3 on io-net).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
TRAIN=$HERE/../data/train/train.py
REPS=${REPS:-5}; SIZES=${SIZES:-ex,m,l}
mkdir -p "$OUT" "$SCR/bind"
# 1. the Mac's own SSD, native process, F_FULLFSYNC
nice -n 15 "$PY" "$HERE/ckpt_io.py" --train-py "$TRAIN" --target "$SCR/host_ck" --label host_ssd --sizes $SIZES --reps $REPS --fsync 2 > "$OUT/host_ssd.jsonl"
# 2-4. inside a container: its own writable layer, a Docker volume, a host folder shared into the VM
C="docker run --rm --memory 1500m --cpus 2 -e OMP_NUM_THREADS=2 -v $HERE:/io:ro -v io-vol:/vol -v $SCR/bind:/bind mi-train:1 python /io/ckpt_io.py --train-py /opt/mi/train.py --sizes $SIZES --reps $REPS --fsync 1"
$C --target /tmp/ck --label ctr_layer > "$OUT/ctr_layer.jsonl"
$C --target /vol/ck --label ctr_volume > "$OUT/ctr_volume.jsonl"
$C --target /bind/ck --label ctr_hostdir > "$OUT/ctr_hostdir.jsonl"
# 5. S3 from a container on the store's network
docker run --rm --memory 1800m --cpus 2 -e OMP_NUM_THREADS=2 -e PYTHONPATH=/pylib -v "$PYLIB":/pylib:ro -v $HERE:/io:ro --network io-net mi-train:1 \
  python /io/s3_io.py --train-py /opt/mi/train.py --endpoint http://io-s3:8333 --label ctr_s3 --sizes $SIZES --reps $REPS > "$OUT/ctr_s3.jsonl"
# 6. S3 from the Mac through Docker Desktop's port forwarding
nice -n 15 "$PY" "$HERE/s3_io.py" --train-py "$TRAIN" --endpoint http://127.0.0.1:18333 --label host_s3 --sizes $SIZES --reps $REPS > "$OUT/host_s3.jsonl"
echo done
