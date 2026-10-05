#!/bin/bash
# fio on the VM's ext4 disk (/data, an anonymous volume, no overlayfs). Every job runs 5 s on a 1 GiB file.
# One summary line per job: name, IOPS, MiB/s, mean and p99 completion latency in microseconds.
# Caveat: the VM's disk is a file on the laptop's SSD, cached by macOS, so "device" numbers are a virtual
# disk's, not an NVMe drive's.
cd /data
fio --name=prep --filename=f.bin --size=1g --rw=write --bs=1m --direct=1 --ioengine=libaio --iodepth=8 --output=/dev/null
run(){ name=$1; shift
  fio --name="$name" --filename=f.bin --size=1g --runtime=5 --time_based --group_reporting --output-format=json "$@" > /tmp/o.json 2>/tmp/e.txt || { echo "$name failed: $(grep -m1 -iE "error|fail|denied|not" /tmp/o.json /tmp/e.txt | head -1)"; return; }
  python3 - "$name" <<'PY'
import json, sys
j = json.load(open("/tmp/o.json"))["jobs"][0]
for k in ("read", "write"):
    x = j[k]
    if x["io_bytes"] > 0:
        cl = x["clat_ns"]; p = cl.get("percentile", {})
        print(f"{sys.argv[1]:<34} {k:<5} iops {x['iops']:10.0f}  MiB/s {x['bw']/1024:8.1f}  clat_mean_us {cl['mean']/1e3:9.1f}  clat_p99_us {p.get('99.000000', 0)/1e3:9.1f}")
PY
}
echo "### 4 KiB random reads, O_DIRECT, libaio, by queue depth"
for qd in 1 4 16 64; do run "randread_4k_qd$qd" --rw=randread --bs=4k --direct=1 --ioengine=libaio --iodepth=$qd; done
echo; echo "### 4 KiB random reads, O_DIRECT, io_uring, queue depth 16"
run randread_4k_qd16_iouring --rw=randread --bs=4k --direct=1 --ioengine=io_uring --iodepth=16
echo; echo "### sequential 1 MiB, O_DIRECT, queue depth 8"
run seqread_1m_direct --rw=read --bs=1m --direct=1 --ioengine=libaio --iodepth=8
run seqwrite_1m_direct --rw=write --bs=1m --direct=1 --ioengine=libaio --iodepth=8
echo; echo "### 4 KiB random writes, O_DIRECT, queue depth 1, without and with fdatasync after each"
run randwrite_4k_qd1 --rw=randwrite --bs=4k --direct=1 --ioengine=psync
run randwrite_4k_qd1_fdatasync --rw=randwrite --bs=4k --direct=1 --ioengine=psync --fdatasync=1
echo; echo "### buffered (through the page cache), psync"
run randread_4k_buffered_cold_start --rw=randread --bs=4k --direct=0 --ioengine=psync
run seqwrite_1m_buffered --rw=write --bs=1m --direct=0 --ioengine=psync --end_fsync=1
rm -f f.bin
