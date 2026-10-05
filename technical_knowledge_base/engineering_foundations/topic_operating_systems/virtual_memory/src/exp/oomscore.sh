# Reproduce /proc/<pid>/oom_score from the kernel's formula (Linux 5.10 fs/proc/base.c and mm/oom_kill.c).
# Prints, per process: rss and swap pages, page-table bytes, oom_score_adj, and the kernel's oom_score.
grep -E '^(MemTotal|SwapTotal):' /proc/meminfo | sed 's/^/meminfo /'
echo "cgroup memory.max $(cat /sys/fs/cgroup/memory.max) memory.swap.max $(cat /sys/fs/cgroup/memory.swap.max)"
python /exp/hold.py 100 20 > /dev/null & A=$!
python /exp/hold.py 300 20 > /dev/null & B=$!
sh -c 'echo 500 > /proc/self/oom_score_adj && exec python /exp/hold.py 200 20' > /dev/null & C=$!
sh -c 'echo -500 > /proc/self/oom_score_adj 2>&1 || echo "lowering oom_score_adj below 0: refused (no CAP_SYS_RESOURCE)"; exec python /exp/hold.py 100 20' & D=$!
sleep 4
for p in $A $B $C $D; do
  echo "proc pid $p rss_pages $(awk '{print $2}' /proc/$p/statm) vmswap_kb $(awk '/^VmSwap/{print $2}' /proc/$p/status) vmpte_kb $(awk '/^VmPTE/{print $2}' /proc/$p/status) oom_score_adj $(cat /proc/$p/oom_score_adj) oom_score $(cat /proc/$p/oom_score)"
done
kill $A $B $C $D 2>/dev/null; wait 2>/dev/null
