# fork after threads have started
. /exp/lib.sh
sec "a lock held by another thread at the moment of fork"
run "python /exp/forklock.py fork"
sec "the same program with the spawn start method"
run "python /exp/forklock.py spawn"
