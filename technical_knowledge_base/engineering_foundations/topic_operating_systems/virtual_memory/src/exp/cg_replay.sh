# One memory scenario inside a container with a memory limit; the sampler records the cgroup meanwhile.
# Usage: cg_replay.sh pagecache|anon_oom|swap|shm     Marks ("m <t_ms> <text>") are printed as the scenario goes.
S=$1; T0=$(date +%s%3N); mark() { echo "m $(( $(date +%s%3N) - T0 )) $*"; }
python /exp/sampler.py & SP=$!
sleep 0.5
echo "limit memory.max=$(cat /sys/fs/cgroup/memory.max) memory.swap.max=$(cat /sys/fs/cgroup/memory.swap.max)"
case $S in
pagecache)
  mark "write a 768 MiB file (dirty page cache)"; dd if=/dev/zero of=/work/big.bin bs=1M count=768 status=none
  mark "read it back once"; cat /work/big.bin > /dev/null
  mark "read it again"; cat /work/big.bin > /dev/null
  mark "done: no OOM, the limit capped the cache";;
anon_oom)
  mark "write and read a 256 MiB file (page cache)"; dd if=/dev/zero of=/work/f.bin bs=1M count=256 status=none; cat /work/f.bin > /dev/null
  mark "a process grows by 32 MiB every 0.15 s, no swap allowed"; python /exp/grow.py 32 800 0 > /tmp/g.log 2>&1; echo "grow exit code $?"
  mark "the process is gone: killed by the cgroup OOM killer"; tail -n 1 /tmp/g.log;;
swap)
  mark "a process grows to 640 MiB against a 512 MiB limit, swap allowed"; python /exp/grow.py 64 640 3 > /tmp/g.log 2>&1; echo "grow exit code $?"
  mark "done: alive, but every pass ran at disk speed"; cat /tmp/g.log | tail -n 3;;
shm)
  mark "write 320 MiB into /dev/shm (shared memory, as DataLoader workers do)"; dd if=/dev/zero of=/dev/shm/batch bs=1M count=320 status=none
  mark "a process grows to 320 MiB of its own"; python /exp/grow.py 32 320 0 > /tmp/g.log 2>&1; echo "grow exit code $?"
  mark "killed although no process ever held more than 320 MiB"; tail -n 1 /tmp/g.log;;
esac
sleep 0.5; touch /tmp/stop; wait $SP; cat /tmp/samples.txt
grep -E '^(high|max|oom|oom_kill) ' /sys/fs/cgroup/memory.events | sed 's/^/events /'
