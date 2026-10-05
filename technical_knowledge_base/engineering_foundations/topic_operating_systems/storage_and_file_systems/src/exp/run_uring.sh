#!/bin/sh
cd "$(dirname "$0")/.."
{ echo "### memlock default"; docker run --rm --name os-stor-uring --cpus 2 --memory 1500m -v /data -v "$PWD/exp":/exp:ro kb-os-lab:1 bash /exp/uring.sh 2>&1
  echo "### memlock unlimited (docker run --ulimit memlock=-1:-1)"; docker run --rm --name os-stor-uring --cpus 2 --memory 1500m --ulimit memlock=-1:-1 -v /data -v "$PWD/exp":/exp:ro kb-os-lab:1 bash /exp/uring.sh 2>&1; } > raw/uring.txt
