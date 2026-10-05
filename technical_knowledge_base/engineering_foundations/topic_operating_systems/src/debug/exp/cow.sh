# Usage: cow.sh list|numpy|arrow
. /exp/lib.sh
sec "copy-on-write in DataLoader workers: dataset as $1"
run "python /exp/cow.py $1"
