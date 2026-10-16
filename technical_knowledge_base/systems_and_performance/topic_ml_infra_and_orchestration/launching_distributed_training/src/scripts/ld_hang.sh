#!/bin/sh
# Runs INSIDE a container of mi-train:1 started with --cap-add SYS_PTRACE (so py-spy can read other processes;
# not --privileged). For each case of ld_hang.py, with TORCH_DISTRIBUTED_DEBUG unset and =DETAIL:
# torchrun --standalone, 4 ranks; at +PYSPY_AT s, if still running, `py-spy dump` of every rank; hard cap CAP s.
# usage: ld_hang.sh OUTDIR CASE...
OUT=$1; shift
export OMP_NUM_THREADS=1 PYTHONUNBUFFERED=1 TORCH_FR_BUFFER_SIZE=2000
PYSPY_AT=${PYSPY_AT:-25}; CAP=${CAP:-150}
now(){ python3 -c 'import time;print(round(time.time(),3))'; }
kill_tree(){ for c in $(grep -l "^PPid:[[:space:]]*$1\$" /proc/[0-9]*/status 2>/dev/null | cut -d/ -f3); do kill_tree $c; done; kill -9 $1 2>/dev/null; }
workers(){ for p in /proc/[0-9]*; do grep -q "ld_hang.py" $p/cmdline 2>/dev/null && [ "$(awk '/^PPid/{print $2}' $p/status)" = "$1" ] && basename $p; done; }
for CASE in "$@"; do for DBG in OFF DETAIL; do
  L=$OUT/${CASE}_$DBG; rm -rf $L; mkdir -p $L
  if [ $DBG = DETAIL ]; then export TORCH_DISTRIBUTED_DEBUG=DETAIL; else unset TORCH_DISTRIBUTED_DEBUG; fi
  echo "start $(now)" > $L/events.txt
  torchrun --standalone --nnodes=1 --nproc-per-node=4 /w/ld_hang.py --case $CASE --dump-dir $L/dump > $L/out.txt 2>&1 &
  TR=$!; t=0; dumped=0
  while kill -0 $TR 2>/dev/null; do
    sleep 1; t=$((t+1))
    if [ $t -eq $PYSPY_AT ] && [ $dumped = 0 ]; then
      dumped=1; echo "pyspy $(now)" >> $L/events.txt
      for w in $(workers $TR); do /w/py-spy dump --pid $w > $L/pyspy_$w.txt 2>&1; tr '\0' '\n' < /proc/$w/environ | grep '^RANK=' >> $L/pyspy_$w.txt; done
    fi
    [ $t -ge $CAP ] && { echo "cap $(now)" >> $L/events.txt; kill_tree $TR; break; }
  done
  wait $TR; echo "exit $? $(now)" >> $L/events.txt
done; done
echo done > $OUT/done
