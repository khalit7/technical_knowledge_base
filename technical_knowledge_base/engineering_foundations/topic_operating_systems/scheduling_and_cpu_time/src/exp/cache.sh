# The indirect cost of sharing a CPU, repeated: work per CPU-second of a cache-sensitive walk (1 and 4 MiB working sets),
# alone, sharing CPU 1 with an ALU busy loop, and sharing it with a loop that streams through 64 MiB; 3 rounds.
. /exp/lib.sh; build; S=/tmp/schedlab
for r in 1 2 3; do sec "round $r"; load
for k in 1024 4096; do
  taskset -c 1 $S cachework $k 3
  taskset -c 1 $S hog & H=$!; sleep 0.1; taskset -c 1 $S cachework $k 6; kill $H; wait $H 2>/dev/null
  taskset -c 1 $S hog stream & H=$!; sleep 0.5; taskset -c 1 $S cachework $k 6; kill $H; wait $H 2>/dev/null
done; done
echo "(each block of three: alone, then with the ALU loop, then with the streaming loop)"
