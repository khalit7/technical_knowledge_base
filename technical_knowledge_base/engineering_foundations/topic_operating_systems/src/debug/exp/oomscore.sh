# Which process does the OOM killer choose? Three processes share a 1 GiB cgroup.
. /exp/lib.sh
sec "the limit"
run "cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.swap.max"
python /exp/hog.py 150 450 600 A > /tmp/A.log 2>&1 & A=$!
sh -c 'echo 500 > /proc/self/oom_score_adj; exec python /exp/hog.py 125 250 600 B' > /tmp/B.log 2>&1 & B=$!
sleep 3
sec "before: A holds 450 MiB, B holds 250 MiB and has raised its own oom_score_adj to 500"
run "for p in $A $B; do echo pid \$p: \$(tr '\0' ' ' < /proc/\$p/cmdline | cut -c1-40) oom_score_adj=\$(cat /proc/\$p/oom_score_adj) oom_score=\$(cat /proc/\$p/oom_score) rss_kib=\$(grep VmRSS /proc/\$p/status | tr -s ' ' | cut -d' ' -f2); done"
sec "now C grows to 400 MiB: 450 + 250 + 400 does not fit in 1 GiB"
run "python /exp/hog.py 50 400 2 C | tail -n 2"
sec "who is still alive"
run "for p in $A $B; do if kill -0 \$p 2>/dev/null; then echo pid \$p alive; else echo pid \$p gone; fi; done; tail -n 1 /tmp/A.log /tmp/B.log"
run "grep oom /sys/fs/cgroup/memory.events"
kill $A $B 2>/dev/null; wait 2>/dev/null
