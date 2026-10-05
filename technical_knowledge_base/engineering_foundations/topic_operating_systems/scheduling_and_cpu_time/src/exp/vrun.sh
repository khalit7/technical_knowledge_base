# Container: --cpus 1 --cpuset-cpus 3
. /exp/lib.sh; build
sec "vruntime and CPU time of three tasks on CPU 3, from /proc/PID/sched"; load
python /exp/vrun.py /tmp/schedlab
sec "nice across sessions inside a container (setsid): autogroup does not apply in a non-root cgroup"
cat /proc/sys/kernel/sched_autogroup_enabled
taskset -c 3 setsid /tmp/schedlab hog & A=$!; taskset -c 3 setsid nice -n 5 /tmp/schedlab hog & B=$!
sleep 4; a=$(awk '{print $14+$15}' /proc/$A/stat); b=$(awk '{print $14+$15}' /proc/$B/stat)
echo "nice 0 in its own session: $a ticks; nice 5 in another session: $b ticks; share of nice 0: $(python3 -c "print(f'{$a/($a+$b):.4f}')")"
kill $A $B; wait 2>/dev/null
