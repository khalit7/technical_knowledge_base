# Container: --cpus 4 --cpuset-cpus 1,2,3,4. CPU 1 sends; 2, 3, 4 receive.
gcc -O2 -pthread -o /tmp/ipi /exp/ipi.c || exit 1
I=/tmp/ipi
sec(){ echo; echo "### $*"; echo "vm_load $(cat /proc/loadavg)"; }
sec "same CPU: pipe ping-pong, both processes on CPU 1 (3 runs)"; for i in 1 2 3; do $I pipe 100000 1 1; done
sec "cross-CPU: pipe ping-pong, CPUs 1 and 2 idle between hand-offs (3 runs)"; for i in 1 2 3; do $I pipe 20000 1 2; done
sec "cross-CPU: pipe ping-pong, a nice 19 busy loop keeps CPUs 1 and 2 awake (3 runs)"
taskset -c 1 nice -n 19 $I hog & H1=$!; taskset -c 2 nice -n 19 $I hog & H2=$!; sleep 0.3
for i in 1 2 3; do $I pipe 20000 1 2; done; kill $H1 $H2; wait 2>/dev/null
sec "cross-CPU: no sleeping, a token in one cache line, CPUs 1 and 2 (3 runs)"; for i in 1 2 3; do $I spin 1000000 1 2; done
sec "membarrier from CPU 1, no other thread running: no IPI needed (3 runs)"; for i in 1 2 3; do $I membar 20000 1; done
sec "membarrier from CPU 1, one thread spinning on CPU 2: one IPI round trip per call (3 runs)"; for i in 1 2 3; do $I membar 20000 1 2; done
sec "membarrier from CPU 1, threads spinning on CPUs 2, 3, 4: three IPIs per call (3 runs)"; for i in 1 2 3; do $I membar 20000 1 2 3 4; done
