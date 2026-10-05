# The training loop starved by its input pipeline, and what a profiler shows.
. /exp/lib.sh
sec "same loop, more DataLoader workers"
for w in 0 1 2 4; do run "python /exp/starve.py $w"; done
sec "what py-spy shows in the main process with num_workers=0"
python /exp/starve.py 0 400 > /dev/null & P=$!
sleep 6
run "py-spy dump --pid $P 2>&1 | head -n 12"
kill $P; wait $P 2>/dev/null; true
