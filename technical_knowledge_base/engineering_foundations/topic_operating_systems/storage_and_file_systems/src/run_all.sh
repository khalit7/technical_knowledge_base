#!/bin/sh
# Re-run every measurement of the storage page (about 12 minutes) on Docker Desktop's Linux VM (kernel 5.10).
# Image: the shared kb-os-lab:1 (fio, strace, gcc, e2fsprogs, torch). Containers os-stor-*, never privileged,
# one at a time. /data is an anonymous volume (ext4 on the VM disk, no overlayfs), removed with the container.
set -e
cd "$(dirname "$0")"
R="docker run --rm --cpus 1 --memory 1500m -v /data -v $PWD/exp:/exp:ro"
$R --name os-stor-env kb-os-lab:1 bash /exp/env.sh > raw/env.txt 2>&1
$R --name os-stor-c kb-os-lab:1 bash /exp/c_all.sh > raw/synccost.txt 2>&1
$R --name os-stor-ra kb-os-lab:1 python /exp/readahead.py /data > raw/readahead.txt 2>&1
$R --name os-stor-meta kb-os-lab:1 python /exp/meta.py /data > raw/meta.txt 2>&1
$R --name os-stor-img --memory 512m kb-os-lab:1 bash /exp/fsimage.sh > raw/fsimage.txt 2>&1
$R --name os-stor-fio --cpus 2 kb-os-lab:1 bash /exp/fio.sh > raw/fio.txt 2>&1
sh exp/run_uring.sh
sh exp/run_wb.sh small mid fsync big primed
for i in 2 3 4; do
  echo "### host: docker run --cpus 1 --memory 1500m -v /data kb-os-lab:1 python /exp/writeback.py primed /data (repeat $i)" > raw/wb_primed$i.txt
  $R --name os-stor-wb-primed$i kb-os-lab:1 python /exp/writeback.py primed /data >> raw/wb_primed$i.txt 2>&1
done
$R --name os-stor-ckpt --cpus 2 --memory 2500m kb-os-lab:1 python /exp/ckpt_time.py /data > raw/ckpt_time.txt 2>&1
$R --name os-stor-trace --cpus 2 --cap-add SYS_PTRACE kb-os-lab:1 bash /exp/ckpt_trace.sh > raw/ckpt_trace.txt 2>&1
python3 redact.py raw
python3 gen_data.py && python3 recompute.py
