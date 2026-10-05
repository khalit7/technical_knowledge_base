# Host side: the four cgroup memory scenarios, one at a time (memory-pressure runs never overlap).
cd "$(dirname "$0")/.."
for s in pagecache anon_oom swap shm; do
  case $s in swap) SW=1g; SHM=64m;; shm) SW=512m; SHM=1g;; *) SW=512m; SHM=64m;; esac
  echo "### host: docker run --cpus 1 --memory 512m --memory-swap $SW --shm-size $SHM kb-os-vm:1 bash /exp/cg_replay.sh $s" > raw/cg_$s.txt
  docker run --rm --name os-vm-cg-$s --cpus 1 --memory 512m --memory-swap $SW --shm-size $SHM \
    -v "$PWD/exp":/exp:ro kb-os-vm:1 bash /exp/cg_replay.sh $s >> raw/cg_$s.txt 2>&1
  echo "### host: container exit code $?" >> raw/cg_$s.txt
done
