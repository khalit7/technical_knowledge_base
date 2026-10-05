#!/bin/sh
# Re-run every measurement of the virtualization and GPU driver stack page (about 6 minutes).
# Linux runs: Docker Desktop's Linux VM (kernel 5.10, arm64) with the shared image kb-os-lab:1, and kb-os-virt:1
# (image/Dockerfile: the CUDA topic's kb-gpu-lab:1 plus strace). Containers os-virt-*, never privileged, --rm.
# macOS runs (labelled contrasts on the page): exp/host_qemu.sh and exp/hvf_exits.c, natively on the laptop.
set -e
cd "$(dirname "$0")"
B="${TMPDIR:-/tmp}/os-virt-build"; mkdir -p "$B"
docker build -q -t kb-os-virt:1 image >/dev/null
R="docker run --rm --memory 1g -v $PWD/exp:/exp:ro"
$R --name os-virt-id --cpus 1 kb-os-lab:1 bash /exp/vmid.sh > raw/vmid.txt 2>&1
$R --name os-virt-ipi --cpus 4 --cpuset-cpus 1,2,3,4 kb-os-lab:1 bash /exp/ipi.sh > raw/ipi.txt 2>&1
$R --name os-virt-virtio --cpus 2 -v /data kb-os-lab:1 bash /exp/virtio.sh > raw/virtio.txt 2>&1
BANNER='^(==|CUDA Version|Container image|This container|By pulling|https://developer.nvidia.com/ngc|A copy of|WARNING: The NVIDIA|   Use the NVIDIA|   https://docs.nvidia)'
$R --name os-virt-cuda --cpus 2 --memory 2g --cap-add SYS_PTRACE kb-os-virt:1 bash /exp/cuda/run.sh 2>&1 | grep -v -E "$BANNER" > raw/cuda.txt
$R --name os-virt-cudadev --cpus 1 --cap-add SYS_PTRACE --device-cgroup-rule 'c 195:* rwm' kb-os-virt:1 bash /exp/cuda/run_dev.sh 2>&1 | grep -v -E "$BANNER" > raw/cuda_dev.txt
sh exp/host_qemu.sh > raw/host_qemu.txt 2>&1
clang -O2 -o "$B/hvf_exits" exp/hvf_exits.c -framework Hypervisor && codesign -s - -f --entitlements exp/ent.plist "$B/hvf_exits"
{ echo "### macOS host (not the VM): $(sysctl -n machdep.cpu.brand_string), macOS $(sw_vers -productVersion), Hypervisor.framework; exp/hvf_exits.c built with clang -O2, ad-hoc signed with exp/ent.plist; timer resolution 0.042 us (24 MHz)"; "$B/hvf_exits"; } > raw/hvf_macos.txt 2>&1
python3 redact.py raw
python3 gen_data.py && python3 recompute.py
