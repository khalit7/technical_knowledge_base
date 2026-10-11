#!/bin/sh
# usage: INF_DIR=... DD_WORK=... sh run_route.sh   (takes the bench lock itself; CPU, 2 threads)
H=$(cd "$(dirname "$0")" && pwd); I=${INF_DIR:?}; W=${DD_WORK:?}
[ -n "$DD_HAVE_LOCK" ] || $I/lock.sh acquire bench dd 7200 || exit 1
cd $W && UV_CACHE_DIR=$I/uvcache uv run --no-project --with torch --with transformers --with safetensors \
  python -I $H/route.py $I/models/hf/granite-3.1-1b-a400m-base $I/data/wiki.test.raw $W/out/counts.json 64
[ -n "$DD_HAVE_LOCK" ] || $I/lock.sh release bench dd
