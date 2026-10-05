#!/bin/sh
# Re-run every measurement of the virtual memory page (about 3 minutes). Docker Desktop's Linux VM, kernel 5.10.
# Memory-pressure runs go one at a time. Outputs land in raw/; then gen_data.py rebuilds parts/22_js_data.js.
set -e
cd "$(dirname "$0")"
docker build -q -t kb-os-vm:1 -f Dockerfile.vm . > /dev/null
JOB="$PWD/../../src/trace/job"
docker run --rm --name os-vm-env --cpus 1 --memory 512m -v "$PWD/exp":/exp:ro kb-os-vm:1 bash /exp/env.sh > raw/env.txt 2>&1
docker run --rm --name os-vm-c --cpus 4 --cpuset-cpus 1-4 --memory 1500m -v "$PWD/exp":/exp:ro kb-os-vm:1 bash /exp/c_all.sh > raw/vmlab.txt 2>&1
docker run --rm --name os-vm-cow --cpus 1 --memory 1500m -v "$PWD/exp":/exp:ro kb-os-vm:1 python /exp/cow_gc.py > raw/cow_gc.txt 2>&1
docker run --rm --name os-vm-mmap --cpus 1 --memory 1500m -v "$PWD/exp":/exp:ro kb-os-vm:1 sh -c 'mkdir -p /work && python /exp/mmapread.py /work' > raw/mmapread.txt 2>&1
docker run --rm --name os-vm-job --cpus 2 --memory 1500m --shm-size 256m -v "$PWD/exp":/exp:ro -v "$JOB":/job:ro kb-os-vm:1 bash /exp/job_mem.sh > raw/job_mem.txt 2>&1
sh exp/run_cg.sh
(echo "### host: docker run --cpus 1 --memory 1g --memory-swap 1g kb-os-vm:1 bash /exp/oomscore.sh"; docker run --rm --name os-vm-oom --cpus 1 --memory 1g --memory-swap 1g -v "$PWD/exp":/exp:ro kb-os-vm:1 bash /exp/oomscore.sh 2>&1) > raw/oomscore.txt
getconf PAGESIZE > raw/macos_pagesize.txt   # the macOS host, as a labelled contrast (Apple M1: 16 KiB pages)
python3 redact.py raw
python3 gen_data.py && python3 recompute.py
