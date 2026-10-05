# Too many open files.
. /exp/lib.sh
sec "the limit: ulimit -n and /proc/self/limits"
run "ulimit -n; grep 'open files' /proc/self/limits"
sec "a Dataset that leaks one descriptor per sample"
run "python /exp/fdleak.py 2>&1 | tail -n 1"
sec "keeping received batches alive, default sharing strategy"
run "python /exp/fdshare.py file_descriptor 2>&1 | tail -n 2"
sec "the same with the file_system strategy"
run "python /exp/fdshare.py file_system 2>&1 | tail -n 2"
