# Load average counts tasks waiting uninterruptibly (D state), not only tasks using CPU.
# Three processes sit in D state for 60 s using no CPU at all (vfork: the parent waits uninterruptibly for the child),
# sampled every 5 s with 10 s before and 30 s after. /proc/loadavg is the whole VM's (other agents' work included),
# so the baseline is recorded and the container's own CPU use is printed beside it.
. /exp/lib.sh
cat > /tmp/vf.c <<'C'
#include <stdlib.h>
#include <unistd.h>
int main(int c, char **v){ if (vfork() == 0) { sleep(atoi(v[1])); _exit(0); } return 0; }
C
gcc -o /tmp/vf /tmp/vf.c
sec "one D-state task: what ps shows"
/tmp/vf 3 & P=$!; sleep 0.5
run "ps -o pid,stat,wchan:22,pcpu,comm -p $P"; grep -E "^State" /proc/$P/status; wait $P
sec "loadavg every 5 s: 10 s baseline, 3 tasks in D state for 60 s, 30 s after"
u() { awk '/usage_usec/{print $2}' /sys/fs/cgroup/cpu.stat; }
t=0; echo "t_s 0 $(cut -d' ' -f1-4 /proc/loadavg) container_cpu_us $(u)"
for i in 1 2; do sleep 5; t=$((t+5)); echo "t_s $t $(cut -d' ' -f1-4 /proc/loadavg) container_cpu_us $(u)"; done
for c in 1 2 3; do /tmp/vf 60 & done
for i in $(seq 1 12); do sleep 5; t=$((t+5)); echo "t_s $t $(cut -d' ' -f1-4 /proc/loadavg) container_cpu_us $(u) d_state $(ps -eo stat | grep -c '^D')"; done
wait
for i in $(seq 1 6); do sleep 5; t=$((t+5)); echo "t_s $t $(cut -d' ' -f1-4 /proc/loadavg) container_cpu_us $(u)"; done
