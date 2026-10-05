# The running job's memory, three ways (RSS, PSS, USS) per process, sampled while it trains.
# Inside kb-os-vm:1 with the root's job folder mounted at /job. Prints "snap <t_s> <role> <pid> ..." lines.
mkdir -p /work/data /work/out && python /job/make_data.py /work/data/train.bin > /dev/null
python /job/train.py --steps 300 --no-ckpt > /tmp/job.log 2>&1 & J=$!
T0=$(date +%s%3N)
snap() { # one line per python process of the job
  for p in $(pgrep -f train.py); do
    [ -r /proc/$p/smaps_rollup ] || continue
    role=main; [ "$p" != "$J" ] && role=worker
    awk -v t="$1" -v role=$role -v pid=$p '
      /^Rss:/{r=$2} /^Pss:/{ps=$2} /^Shared_Clean:/{sc=$2} /^Shared_Dirty:/{sd=$2} /^Private_Clean:/{pc=$2} /^Private_Dirty:/{pd=$2}
      END{printf "snap %s %s %s rss_kb %d pss_kb %d uss_kb %d shared_clean_kb %d shared_dirty_kb %d private_clean_kb %d private_dirty_kb %d", t, role, pid, r, ps, pc+pd, sc, sd, pc, pd}' /proc/$p/smaps_rollup
    echo " vmas $(wc -l < /proc/$p/maps) vmpte_kb $(awk '/^VmPTE/{print $2}' /proc/$p/status) vmsize_kb $(awk '/^VmSize/{print $2}' /proc/$p/status)"
  done; }
while kill -0 $J 2>/dev/null; do
  t=$(( $(date +%s%3N) - T0 )); n=$(pgrep -f train.py | wc -l)
  if [ "$n" -ge 3 ]; then snap "$t"; fi
  sleep 0.3
done
grep -E "first batch|done at" /tmp/job.log | sed 's/^/log /'
