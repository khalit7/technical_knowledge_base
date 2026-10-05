# Inside a container with a CPU limit: N spinning threads for 1 s, every gap in each thread's progress recorded,
# and the cgroup's cpu.stat before and after. Usage: throttle.sh N
. /exp/lib.sh; build
echo "cpu.max $(cat /sys/fs/cgroup/cpu.max) threads $1"; load
s0=$(cat /sys/fs/cgroup/cpu.stat | tr '\n' ' ')
/tmp/schedlab throttle $1 1000
s1=$(cat /sys/fs/cgroup/cpu.stat | tr '\n' ' ')
echo "cpu.stat before: $s0"; echo "cpu.stat after:  $s1"
