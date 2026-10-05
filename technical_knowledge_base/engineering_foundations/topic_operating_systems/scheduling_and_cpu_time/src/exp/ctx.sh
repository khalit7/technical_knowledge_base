# Context switches: process vs thread, the switch alone (sched_yield), cross-CPU hand-offs, indirect cost.
# Container: --cpus 2 --cpuset-cpus 1,2 (CPUs 1 and 2 of the VM).
. /exp/lib.sh; build; S=/tmp/schedlab
sec "process switch: pipe ping-pong, both on CPU 1 (5 runs)"; load
for i in 1 2 3 4 5; do $S ctx_pipe 200000 1; done
sec "thread switch: futex ping-pong, both threads on CPU 1 (5 runs)"; load
for i in 1 2 3 4 5; do $S ctx_futex 200000 1; done
sec "sched_yield between two processes on CPU 1 (3 runs)"; load
for i in 1 2 3; do $S ctx_yield 200000 1; done
sec "cross-CPU, no sleeping: a token in one cache line, CPUs 1 and 2 (3 runs)"; load
for i in 1 2 3; do $S xcpu_spin 1000000 1 2; done
sec "cross-CPU pipe ping-pong, CPUs 1 and 2 idle between hand-offs (3 runs)"; load
for i in 1 2 3; do $S xcpu_pipe 20000 1 2; done
sec "cross-CPU pipe ping-pong, a nice 19 busy loop keeps each CPU awake (3 runs)"; load
taskset -c 1 nice -n 19 $S hog & H1=$!; taskset -c 2 nice -n 19 $S hog & H2=$!; sleep 0.3
for i in 1 2 3; do $S xcpu_pipe 20000 1 2; done
kill $H1 $H2; wait 2>/dev/null
sec "indirect cost: work per CPU-second of a cache-sensitive walk, alone and sharing CPU 1"; load
for k in 256 4096 16384; do
  taskset -c 1 $S cachework $k 3
  taskset -c 1 $S hog & H=$!; sleep 0.1; taskset -c 1 $S cachework $k 6; kill $H; wait $H 2>/dev/null
  taskset -c 1 $S hog stream & H=$!; sleep 0.5; taskset -c 1 $S cachework $k 6; kill $H; wait $H 2>/dev/null
done
echo "(each block: alone, then sharing with an ALU busy loop, then sharing with a loop streaming through 64 MiB)"
