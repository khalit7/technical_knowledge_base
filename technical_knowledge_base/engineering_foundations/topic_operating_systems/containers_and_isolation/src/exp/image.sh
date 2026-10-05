#!/bin/sh
# Run on the Docker host: the image as layers, the overlay mount, and the cost of the first write to a big file
# that lives in a lower (image) layer: overlayfs copies the whole file up before the write.
cd "$(dirname "$0")"
echo "### docker history kb-os-cont:1 (newest first)"; docker history --format '{{.Size}}\t{{.CreatedBy}}' kb-os-cont:1 | cut -c1-110
echo "### layers: $(docker image inspect -f '{{len .RootFS.Layers}}' kb-os-cont:1)"
docker run --rm --name os-cont-img --cpus 1 --memory 1500m kb-os-cont:1 sh -c '
  echo "### the root mount, lowerdir entries counted"; awk "\$2==\"/\"{print \$1, \$2, \$3}" /proc/self/mounts
  echo "lowerdirs: $(awk "\$2==\"/\"" /proc/self/mounts | grep -o "lowerdir=[^,]*" | tr ":" "\n" | wc -l)"
  f=$(python3 -c "import torch,os;print(os.path.join(os.path.dirname(torch.__file__),\"lib\",\"libtorch_cpu.so\"))")
  echo "### first and second 1-byte write to libtorch_cpu.so ($(stat -c %s $f) bytes, in an image layer)"
  python3 - "$f" <<PY
import os, sys, time
f = sys.argv[1]
for i in (1, 2):
    t = time.perf_counter(); fd = os.open(f, os.O_WRONLY); os.pwrite(fd, b"\x7f", 0); os.close(fd)
    print(f"write {i}: {1000 * (time.perf_counter() - t):.1f} ms")
t = time.perf_counter(); fd = os.open("/etc/hostname.copy", os.O_WRONLY | os.O_CREAT); os.close(fd)
print(f"create a new file: {1000 * (time.perf_counter() - t):.2f} ms")
PY
  echo "### df / after the copy-up"; df -h / | tail -1 | awk "{print \$1, \$3}"
'
echo "### docker diff of a container that wrote a file and deleted one"
docker run -d --name os-cont-diff kb-os-cont:1 sh -c 'echo x > /work/new.txt; rm /etc/motd; sleep 30' > /dev/null; sleep 2
docker diff os-cont-diff; docker rm -f os-cont-diff > /dev/null
