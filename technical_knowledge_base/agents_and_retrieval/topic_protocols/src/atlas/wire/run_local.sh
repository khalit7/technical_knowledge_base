#!/bin/sh
# Atlas recordings that need no public endpoint: local servers on 127.0.0.1 and pure local computations.
# Needs a Python with grpcio, grpcio-health-checking and botocore: PY=/path/to/python sh run_local.sh
# Recorded 2026-10-05 with CPython 3.13, grpcio 1.84.0, grpcio-health-checking, botocore 1.43.108, curl 8.7.1.
cd "$(dirname "$0")"
PY=${PY:-python3}; R=./rec.sh
$PY local_servers.py > /dev/null 2>&1 &
sleep 3
printf '\000\000\000\000\000' > req.bin   # one gRPC message: compressed flag 0, length 0 (an empty HealthCheckRequest)
$R grpc "curl -sv --http2-prior-knowledge -H 'content-type: application/grpc' -H 'te: trailers' --data-binary @req.bin http://127.0.0.1:19301/grpc.health.v1.Health/Check -o resp.bin 2>&1 | grep -E '^[<>] |\\[:method|\\[:path' | grep -v '^[<>] \$'; xxd resp.bin"
$R sse  'curl -sN http://127.0.0.1:19302/stream'
$R webhook "$PY webhook_sign.py"
$R jwt  "$PY jwt_demo.py"
$R sigv4 "$PY sigv4_demo.py"
rm -f req.bin resp.bin
for f in out/webhook.txt out/jwt.txt out/sigv4.txt; do PYP="$PY" python3 -c "import os,sys;f=sys.argv[1];s=open(f).read().replace('\$ '+os.environ['PYP']+' ','\$ python ',1);open(f,'w').write(s)" "$f"; done
