# DataLoader workers hand batches to the main process through shared memory in /dev/shm.
# Docker gives a container a 64 MiB /dev/shm unless --shm-size says otherwise.
# Usage: shm.sh <batch size>
. /exp/lib.sh; data
sec "how big is /dev/shm"
run "df -h /dev/shm"
sec "the running job with batch $1 and 2 workers"
run "python /job/train.py --steps 6 --batch $1 --workers 2 --start-method fork --no-ckpt > /tmp/log 2>&1; echo exit code \$?; grep -E 'time to first|step 5|done at|Error|error' /tmp/log | cut -c1-400 | tail -n 6"
