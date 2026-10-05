# Real-time and deadline classes inside an unprivileged container. Container: --cpus 1 --cap-add SYS_NICE (no cpuset).
. /exp/lib.sh; build; S=/tmp/schedlab
sec "the RT limits and what this container may do"
run "cat /proc/sys/kernel/sched_rt_period_us /proc/sys/kernel/sched_rt_runtime_us"
run "chrt -f 10 true; echo exit \$?"
run "chrt -r 10 true; echo exit \$?"
run "chrt -m | head -5"
sec "SCHED_DEADLINE: allowed here, but only when the task may run on every CPU"
run "chrt -d --sched-runtime 2000000 --sched-deadline 10000000 --sched-period 10000000 0 true; echo exit \$?"
run "taskset -c 3 chrt -d --sched-runtime 2000000 --sched-deadline 10000000 --sched-period 10000000 0 true; echo exit \$?"
run "chrt -d --sched-runtime 11000000 --sched-deadline 10000000 --sched-period 10000000 0 true; echo exit \$?"
sec "a SCHED_DEADLINE busy loop with runtime 2 ms every 10 ms gets 20% of a CPU, even with CPUs idle"
chrt -d --sched-runtime 2000000 --sched-deadline 10000000 --sched-period 10000000 0 $S hog & D=$!
sleep 0.2; t0=$(awk '{print $14+$15}' /proc/$D/stat); sleep 3; t1=$(awk '{print $14+$15}' /proc/$D/stat)
echo "policy $(chrt -p $D | head -1 | sed 's/.*: //'); CPU time in 3 s: $(( (t1 - t0) * 10 )) ms ($(( (t1 - t0) * 100 / 300 ))% of one CPU)"
grep -E "^(policy|dl\.runtime|dl\.deadline|dl\.period|nr_switches|nr_involuntary)" /proc/$D/sched
kill $D; wait 2>/dev/null
