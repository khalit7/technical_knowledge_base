# Usage: cpu.sh <threads...>   one run per thread count, same work each time
. /exp/lib.sh
for n in "$@"; do
  sec "torch threads: $n (0 means the default)"
  run "python /exp/cpu.py $n 20"
done
