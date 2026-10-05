. /exp/lib.sh
sec "readahead window of the disk"
run "cat /sys/block/vda/queue/read_ahead_kb"
sec "a 512 MiB data shard: page cache cold and warm"
run "python /exp/pagecache.py"
