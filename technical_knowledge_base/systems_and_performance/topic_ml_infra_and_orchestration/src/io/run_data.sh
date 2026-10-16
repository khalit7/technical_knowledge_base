#!/bin/sh
# Storage lab: data reading from a Docker volume and from the S3-compatible store (one container on io-net).
# usage: OUT=<raw dir> PYLIB=<dir with boto3> sh run_data.sh
HERE=$(cd "$(dirname "$0")" && pwd)
docker run --rm --name io-data --memory 1g --cpus 2 -e PYTHONPATH=/pylib -v "$PYLIB":/pylib:ro -v "$HERE":/io:ro -v io-vol:/vol --network io-net mi-train:1 \
  sh -c "rm -rf /vol/io_data; python /io/data_read.py --text /opt/mi/input.txt --dir /vol/io_data --endpoint http://io-s3:8333; rm -rf /vol/io_data" > "$OUT/data_read.jsonl"
echo done
