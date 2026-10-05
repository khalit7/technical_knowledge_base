#!/bin/sh
# Re-run every measurement of the scheduling page (about 20 minutes) on Docker Desktop's Linux VM (kernel 5.10),
# image kb-os-lab:1, containers named os-sched-*, never privileged; CAP_SYS_NICE added where a run needs it (stated).
# Outputs land in raw/; then redact.py, gen_data.py and check_embed.py (after build.sh).
# Usage: sh run_all.sh [step ...]   (steps: cpus ctx wake vrun rt acct job throttle weight cache loadavg grid)
cd "$(dirname "$0")"
IMG=kb-os-lab:1; E="$PWD/exp"; JOB="$PWD/../../src/trace/job"
d() { name=$1; shift; docker run --rm --name "os-sched-$name" -v "$E":/exp:ro "$@"; }
hdr() { echo "### host: docker run $*"; }
STEPS=${*:-cpus ctx wake vrun rt acct job throttle weight cache loadavg grid}
for s in $STEPS; do echo "== $s $(date -u +%H:%M:%S)"; case $s in
cpus) { for f in "" "--cpus 2" "--cpuset-cpus 0,1" "--cpus 1 --cpuset-cpus 0-3"; do
          echo "### docker run $f"; d cpus $f --memory 1g $IMG bash /exp/cpus.sh; done; } > raw/cpus.txt 2>&1 ;;
ctx) { hdr "--cpus 2 --cpuset-cpus 1,2 --memory 512m"; d ctx --cpus 2 --cpuset-cpus 1,2 --memory 512m $IMG bash /exp/ctx.sh; } > raw/ctx.txt 2>&1 ;;
wake) { hdr "--cpus 1 --cpuset-cpus 3 --memory 256m --cap-add SYS_NICE"; d wake --cpus 1 --cpuset-cpus 3 --memory 256m --cap-add SYS_NICE $IMG bash /exp/wake.sh; } > raw/wake.txt 2>&1 ;;
vrun) { hdr "--cpus 1 --cpuset-cpus 3 --memory 256m"; d vrun --cpus 1 --cpuset-cpus 3 --memory 256m $IMG bash /exp/vrun.sh; } > raw/vrun.txt 2>&1 ;;
rt) { hdr "--cpus 1 --memory 256m --cap-add SYS_NICE"; d rt --cpus 1 --memory 256m --cap-add SYS_NICE $IMG bash /exp/rt.sh; } > raw/rt.txt 2>&1 ;;
acct) { hdr "--cpus 4 --memory 1g"; d acct --cpus 4 --memory 1g $IMG bash /exp/acct.sh; } > raw/acct.txt 2>&1 ;;
job) { hdr "--cpus 2 --memory 1500m --shm-size 256m"; d job --cpus 2 --memory 1500m --shm-size 256m -v "$JOB":/job:ro $IMG bash /exp/job.sh; } > raw/job.txt 2>&1 ;;
throttle) { for v in "1|--cpus 1" "2|--cpus 1" "5|--cpus 1" "5|--cpu-period 10000 --cpu-quota 10000" "2|--cpus 0.5"; do
          n=${v%%|*}; f=${v#*|}; echo; hdr "$f --memory 256m (threads $n)"; d thr $f --memory 256m $IMG bash /exp/throttle.sh $n; done; } > raw/throttle.txt 2>&1 ;;
weight) sh exp/weight.sh > raw/weight.txt 2>&1 ;;
loadavg) { hdr "--cpus 1 --memory 256m"; d load --cpus 1 --memory 256m $IMG bash /exp/loadavg.sh; } > raw/loadavg.txt 2>&1 ;;
cache) { hdr "--cpus 2 --cpuset-cpus 1,2 --memory 512m"; d cache --cpus 2 --cpuset-cpus 1,2 --memory 512m $IMG bash /exp/cache.sh; } > raw/cache.txt 2>&1 ;;
grid) { for r in 1 2 3; do for q in 1 2 4; do d grid --cpus $q --memory 1500m --shm-size 256m $IMG python /exp/grid.py $r; done; done; } > raw/grid.txt 2>&1 ;;
esac; done
echo "== done $(date -u +%H:%M:%S)"
python3 redact.py raw
python3 gen_data.py && python3 recompute.py > /dev/null
python3 simref.py simref_out.json > simref.txt && node check_sim.mjs
sh build.sh && python3 check_embed.py
