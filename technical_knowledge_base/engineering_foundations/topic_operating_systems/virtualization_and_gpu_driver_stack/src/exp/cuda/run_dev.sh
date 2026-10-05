# Case 6: the container's device cgroup allows character devices with major 195 (docker run --device-cgroup-rule 'c 195:* rwm').
# libcuda's open of /dev/nvidiactl now reaches the kernel, which has no driver for major 195.
mkdir -p /tmp/b && cd /tmp/b && gcc -O2 -o drv_probe /exp/cuda/drv_probe.c -ldl
echo "### case 6: device cgroup allows 195:*; real user-mode driver, no kernel module"
LD_LIBRARY_PATH=/usr/local/cuda/compat strace -f -qq -X raw -e trace=openat,ioctl,mknodat,unlinkat -e signal=none ./drv_probe 2>&1 | grep -E "dev/nvidia|ioctl\(|^cu|^lib|mknod" | head -14
echo "major 195 in /proc/devices (character devices with a registered driver):"; grep -E "^ *195 " /proc/devices || echo "(none)"
