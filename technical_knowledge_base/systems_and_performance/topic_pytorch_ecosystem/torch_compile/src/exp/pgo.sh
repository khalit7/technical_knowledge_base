#!/bin/sh
# Profile-guided dynamic shapes across processes: two runs without a job id, two with TORCH_COMPILE_JOB_ID, each pair
# sharing one fresh cache directory. Writes ../inputs/pgo.jsonl. usage: sh pgo.sh <python> <scratch dir>
PY=$1; SCR=$2; cd "$(dirname "$0")"; OUT=../inputs/pgo.jsonl; : > $OUT
rm -rf $SCR/pgo_a $SCR/pgo_b
for r in no_job_id_1 no_job_id_2; do TORCHINDUCTOR_CACHE_DIR=$SCR/pgo_a $PY pgo.py $r 2>/dev/null | grep '^RESULT ' | sed 's/^RESULT //' >> $OUT; done
for r in job_id_1 job_id_2; do TORCH_COMPILE_JOB_ID=tcp-demo TORCHINDUCTOR_CACHE_DIR=$SCR/pgo_b $PY pgo.py $r 2>/dev/null | grep '^RESULT ' | sed 's/^RESULT //' >> $OUT; done
cat $OUT
