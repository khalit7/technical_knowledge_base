# Phase lines of every step are filtered out of the log to keep the recording short.
# Usage: sig.sh noh|train|wrapper   (the host sends docker stop after 10 s)
. /exp/lib.sh; data
case $1 in
  noh) exec python /exp/noh.py ;;
  train) exec python /job/train.py --steps 100000 --workers 2 --start-method fork --out /work/out > >(grep --line-buffered -v 'phase step_') ;;
  wrapper) echo "launcher shell is pid $$"; python /job/train.py --steps 100000 --workers 2 --start-method fork --out /work/out | grep --line-buffered -v 'phase step_'; echo "python exited with $?" ;;
  pkill) echo "launcher shell is pid $$"; python /exp/accum.py; echo "python exited with $?" ;;
esac
