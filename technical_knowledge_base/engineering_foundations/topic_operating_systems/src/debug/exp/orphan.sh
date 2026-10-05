# The main training process is killed with SIGKILL (as the OOM killer or a node agent would):
# what happens to its DataLoader workers?
. /exp/lib.sh; data
python /job/train.py --steps 100000 --workers 2 --start-method fork --no-ckpt > /tmp/log 2>&1 & M=$!
sleep 8
sec "while training: the main process and its two workers"
run "ps -o pid,ppid,stat,etime,cmd --ppid 1 --ppid $M | cut -c1-80 | grep -v ' ps '"
kill -KILL $M
sleep 1
sec "one second after SIGKILL to the main process"
run "ps -eo pid,ppid,stat,cmd | grep -E 'train.py|PID' | grep -v grep | cut -c1-80"
sleep 6
sec "seven seconds after"
run "ps -eo pid,ppid,stat,cmd | grep -E 'train.py|PID' | grep -v grep | cut -c1-80"
