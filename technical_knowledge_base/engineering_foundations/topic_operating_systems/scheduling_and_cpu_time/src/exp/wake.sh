# Wake-up latency of a thread that sleeps 1 ms, 3000 times, on CPU 3, with and without busy loops on the same CPU.
# Container: --cpus 1 --cpuset-cpus 3 --cap-add SYS_NICE (needed for a negative nice value).
. /exp/lib.sh; build; S=/tmp/schedlab
hogs() { for i in $(seq 1 $1); do $2 $S hog & done; sleep 0.3; }
stop() { kill $(jobs -p) 2>/dev/null; wait 2>/dev/null; }
sec "alone"; load; $S wakelat 1000 3000
sec "1 busy loop (nice 0)"; load; hogs 1 ""; $S wakelat 1000 3000; stop
sec "4 busy loops (nice 0)"; load; hogs 4 ""; $S wakelat 1000 3000; stop
sec "4 busy loops (nice 0), the sleeper at nice -10"; load; hogs 4 ""; nice -n -10 $S wakelat 1000 3000; stop
sec "4 busy loops (nice 0), the sleeper as SCHED_BATCH"; load; hogs 4 ""; chrt -b 0 $S wakelat 1000 3000; stop
sec "4 busy loops as SCHED_IDLE, the sleeper normal"; load; hogs 4 "chrt -i 0"; $S wakelat 1000 3000; stop
sec "4 busy loops at nice 19, the sleeper normal"; load; hogs 4 "nice -n 19"; $S wakelat 1000 3000; stop
