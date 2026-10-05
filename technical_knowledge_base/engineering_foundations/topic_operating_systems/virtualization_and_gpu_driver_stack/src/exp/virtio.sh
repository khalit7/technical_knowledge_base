# virtio-blk: interrupts and completions per request, at queue depth 1 and 32 (O_DIRECT reads, 4 KiB, from a file on /data).
# The VM disk is virtio-blk (PCI, one request queue per vCPU, MSI interrupts named virtio1-req.N in /proc/interrupts).
sec(){ echo; echo "### $*"; }
irqs(){ awk '/virtio1-req/{s=0;for(i=2;i<=6;i++)s+=$i;t+=s}END{print t}' /proc/interrupts; }
reqs(){ awk '{print $1}' /sys/block/vda/stat; }   # reads completed on the whole disk
cd /data && fio --name=mk --filename=f --size=256M --rw=write --bs=1M --direct=1 --output=/dev/null
for qd in 1 32; do
  sec "4 KiB random O_DIRECT reads, queue depth $qd, 20000 requests (libaio)"
  i0=$(irqs); r0=$(reqs)
  fio --name=r --filename=f --size=256M --rw=randread --bs=4k --direct=1 --ioengine=libaio --iodepth=$qd --number_ios=20000 --randrepeat=1 --output-format=terse --terse-version=3 > /tmp/t
  i1=$(irqs); r1=$(reqs)
  awk -F';' '{printf "fio: iops %s, mean completion latency %.1f us\n", $8, $16}' /tmp/t
  echo "disk reads completed $((r1-r0)), virtio-blk interrupts $((i1-i0))"
  awk -v r=$((r1-r0)) -v i=$((i1-i0)) 'BEGIN{printf "interrupts per request %.3f\n", i/r}'
done
