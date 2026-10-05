. /exp/lib.sh
sec "the kernel's writeback settings (centiseconds; percent of memory)"
run "cd /proc/sys/vm; for f in dirty_expire_centisecs dirty_writeback_centisecs dirty_background_ratio dirty_ratio; do echo \$f \$(cat \$f); done"
sec "write without fsync, then watch the dirty pages"
run "python /exp/nofsync.py"
