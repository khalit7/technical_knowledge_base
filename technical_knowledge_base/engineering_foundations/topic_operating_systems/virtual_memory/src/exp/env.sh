# Inside kb-os-vm:1: the VM settings this page quotes.
for f in /proc/sys/vm/min_free_kbytes /proc/sys/vm/watermark_scale_factor /proc/sys/vm/swappiness /proc/sys/vm/overcommit_memory /proc/sys/vm/overcommit_ratio /proc/sys/vm/max_map_count /proc/sys/vm/page-cluster /sys/kernel/mm/transparent_hugepage/enabled /sys/kernel/mm/transparent_hugepage/defrag /sys/kernel/mm/transparent_hugepage/khugepaged/pages_to_scan /sys/kernel/mm/transparent_hugepage/khugepaged/max_ptes_none; do echo "$f: $(cat $f)"; done
for d in /sys/block/vda/queue/read_ahead_kb; do echo "$d: $(cat $d)"; done
ls /sys/fs/cgroup | grep -E '^hugetlb\.[0-9A-Z]+\.max$' | tr '\n' ' '; echo
echo "memory.pressure: $(cat /sys/fs/cgroup/memory.pressure 2>&1 | head -1)"
echo "/proc/pressure/memory: $(cat /proc/pressure/memory 2>&1 | head -1)"
echo "zswap: $(cat /sys/module/zswap/parameters/enabled 2>&1)"
echo "ulimit -l: $(ulimit -l)"
grep -E '^(MemTotal|SwapTotal|AnonHugePages|HugePages_Total|Hugepagesize):' /proc/meminfo
