# The running job reading its memory-mapped dataset from a slow device (docker --device-read-bps
# sets the cgroup's io.max, a stand-in for a slow network file system), cold then warm.
. /exp/lib.sh; data
sec "the throttle this container runs under (major:minor of the disk, bytes per second)"
run "cat /sys/fs/cgroup/io.max"
python -c "import sys; sys.path.insert(0, '/exp'); import cg; cg.evict('/work/data/train.bin')"
sec "cold: the dataset is not in the page cache"
python /job/train.py --steps 30 --workers 2 --start-method fork --no-ckpt > /tmp/cold.log 2>&1 & P=$!
sleep 4
run "ps -eo pid,ppid,stat,wchan:30,cmd | grep -E 'STAT|train.py' | grep -v grep | cut -c1-100"
W=$(pgrep -f train.py | sort -n | tail -n 1)
run "py-spy dump --pid $W 2>&1 | grep -v '^Python v' | head -n 7"
wait $P
run "grep -E 'time to first|done at' /tmp/cold.log; grep rbytes /sys/fs/cgroup/io.stat | tr ' ' '\n' | grep -E 'rbytes|rios'"
sec "warm: the same run again, the dataset now in the page cache"
run "python /job/train.py --steps 30 --workers 2 --start-method fork --no-ckpt 2>&1 | grep -E 'time to first|done at'"
