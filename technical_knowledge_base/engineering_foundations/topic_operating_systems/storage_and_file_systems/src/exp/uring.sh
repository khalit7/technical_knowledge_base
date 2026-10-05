#!/bin/bash
# io_uring on kernel 5.10 charges its rings to RLIMIT_MEMLOCK. Same fio job as in fio.sh, run with the
# container's default limit and (in a second container) with --ulimit memlock=-1:-1.
echo "\$ ulimit -l"; ulimit -l
cd /data; fio --name=prep --filename=f.bin --size=1g --rw=write --bs=1m --direct=1 --ioengine=libaio --iodepth=8 --output=/dev/null
fio --name=randread_4k_qd16_iouring --filename=f.bin --size=1g --runtime=5 --time_based --rw=randread --bs=4k --direct=1 --ioengine=io_uring --iodepth=16 --output-format=json > /tmp/o.json 2>/tmp/e.txt || { echo "io_uring failed: $(grep -m1 -o 'error=.*' /tmp/o.json /tmp/e.txt | head -1 | cut -d: -f2-)"; exit 0; }
python3 -c "
import json; j=json.load(open('/tmp/o.json'))['jobs'][0]['read']; cl=j['clat_ns']
print(f\"randread_4k_qd16_iouring           read  iops {j['iops']:10.0f}  MiB/s {j['bw']/1024:8.1f}  clat_mean_us {cl['mean']/1e3:9.1f}  clat_p99_us {cl['percentile']['99.000000']/1e3:9.1f}\")"
