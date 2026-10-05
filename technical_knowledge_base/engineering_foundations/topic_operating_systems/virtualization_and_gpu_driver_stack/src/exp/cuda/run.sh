# One CUDA call down, in a container with no GPU (image kb-os-virt:1, needs --cap-add SYS_PTRACE for strace).
set -u
sec(){ echo; echo "### $*"; }
mkdir -p /tmp/b && cd /tmp/b
nvcc -O2 -cudart shared -gencode arch=compute_80,code=sm_80 -gencode arch=compute_90,code=sm_90 -gencode arch=compute_90,code=compute_90 -o rt_probe /exp/cuda/rt_probe.cu
gcc -O2 -o drv_probe /exp/cuda/drv_probe.c -ldl
ST="strace -f -qq -e trace=openat,access,stat,newfstatat,readlinkat,ioctl,execve,mknodat,unlinkat,fchmodat,fchownat -e signal=none"
sec "versions and where the libraries are"
nvcc --version | tail -2; ls -l /usr/local/cuda/lib64/libcudart.so* | awk '{print $9,$10,$11}'
ls /usr/local/cuda/compat/; ls -l /usr/local/cuda/lib64/stubs/libcuda.so | awk '{print $9}'
echo "ldconfig cache entries for libcuda:"; ldconfig -p | grep -c libcuda.so
echo "NVIDIA_DRIVER_CAPABILITIES=$NVIDIA_DRIVER_CAPABILITIES NVIDIA_VISIBLE_DEVICES=$NVIDIA_VISIBLE_DEVICES"; echo "NVIDIA_REQUIRE_CUDA=$NVIDIA_REQUIRE_CUDA" | tr " " "\n" | grep -E "cuda|brand=tesla"
sec "ldd rt_probe (the runtime is a shared library; libcuda is not linked, it is opened at run time)"
ldd ./rt_probe | sed 's/ (0x[0-9a-f]*)//'
sec "the fat binary inside rt_probe: cuobjdump -lelf -lptx"
cuobjdump -lelf -lptx ./rt_probe
sec "the object file alone (before linking): cuobjdump -lelf -lptx rt_probe.o"
nvcc -O2 -c -gencode arch=compute_80,code=sm_80 -gencode arch=compute_90,code=sm_90 -gencode arch=compute_90,code=compute_90 -o rt_probe.o /exp/cuda/rt_probe.cu
cuobjdump -lelf -lptx rt_probe.o
sec "each cubin in the executable: size and the kernels (functions) it holds"
mkdir -p x && cd x && cuobjdump -xelf all ../rt_probe >/dev/null && for f in *.cubin; do printf "%s %s bytes, functions: %s\n" "$f" "$(stat -c %s $f)" "$(cuobjdump -sass $f | grep -o 'Function : [A-Za-z0-9_]*' | sed 's/Function : //' | tr '\n' ' ')"; done; cd ..
sec "the first lines of the PTX (what the driver would JIT-compile for a GPU newer than sm_90)"
cuobjdump -ptx ./rt_probe | awk '/Fatbin ptx code/{p=1} p' | grep -v '^$' | sed -n '1,40p'
sec "fat binary section in the ELF file: readelf -S (nv sections)"
readelf -SW ./rt_probe | grep -i -E "nv_fatbin|nvFatBinSegment|__nv"
sec "case 1: no driver at all (any container started without the NVIDIA runtime); rt_probe"
./rt_probe
sec "case 1 under LD_DEBUG=libs: how the runtime looks for libcuda.so.1 (lines mentioning libcuda)"
LD_DEBUG=libs ./rt_probe 2>&1 | grep -i "libcuda" | sed 's/^ *[0-9]*://' | head -20
sec "case 1 under strace: every file the runtime touches looking for the driver (lines mentioning cuda or nvidia)"
$ST ./rt_probe 2>&1 | grep -i -E "cuda|nvidia" | grep -v -E "^(cuda|vadd)|-> " | head -40
sec "case 2: the toolkit's stub libcuda (for linking only) found as libcuda.so.1"
mkdir -p /tmp/stub && ln -sf /usr/local/cuda/lib64/stubs/libcuda.so /tmp/stub/libcuda.so.1
LD_LIBRARY_PATH=/tmp/stub ./rt_probe
LD_LIBRARY_PATH=/tmp/stub ./drv_probe
echo "device nodes before case 3:"; ls -l /dev | grep -i nvidia || echo "(none)"
sec "case 3: the real user-mode driver 615.71.09 (the forward-compatibility copy in /usr/local/cuda/compat), no kernel module, no /dev/nvidia*"
LD_LIBRARY_PATH=/usr/local/cuda/compat ./drv_probe
LD_LIBRARY_PATH=/usr/local/cuda/compat ./rt_probe
sec "case 3 under strace: what libcuda tries during cuInit (library search misses removed)"
LD_LIBRARY_PATH=/usr/local/cuda/compat $ST ./drv_probe 2>&1 | grep -v -E "ENOENT.*(/lib/|/usr/lib|/tls/|glibc-hwcaps|/aarch64)" | grep -v "/etc/ld.so" | head -60
echo "device nodes after case 3:"; ls -l /dev | grep -i nvidia | awk '{print $1,$5,$6,$10}'
sec "case 3, the runtime path under strace: rt_probe (lines mentioning nvidia, /dev, /proc or /sys)"
LD_LIBRARY_PATH=/usr/local/cuda/compat $ST ./rt_probe 2>&1 | grep -E "nvidia|/dev/|/proc/|/sys/" | grep -v -E "ENOENT.*/usr/local/nvidia/lib" | head -40
sec "case 4: as case 3, but /dev/nvidiactl, /dev/nvidia0 and /dev/nvidia-uvm are empty regular files: the ioctls libcuda sends (raw numbers)"
rm -f /dev/nvidia*; touch /dev/nvidiactl /dev/nvidia0 /dev/nvidia-uvm; ls -l /dev | grep -i nvidia | awk '{print $1,$5,$6,$10}'
LD_LIBRARY_PATH=/usr/local/cuda/compat strace -f -qq -X raw -e trace=openat,ioctl,mmap,mknodat,unlinkat -e signal=none ./drv_probe 2>&1 | grep -E "nvidia|ioctl\(|^cu|^lib|mknod|unlink" | grep -v "application-profile" | head -40
ls -l /dev | grep -i nvidia | awk '{print $1,$5,$6,$10}'
rm -f /dev/nvidia*
sec "case 4b: as case 3, but each node is a bind of /dev/null (a real character device the container may open)"
for n in nvidiactl nvidia0 nvidia-uvm; do ln -sf /dev/null /dev/$n; done; ls -l /dev | grep -i nvidia | awk '{print $1,$9,$10,$11}'
LD_LIBRARY_PATH=/usr/local/cuda/compat strace -f -qq -X raw -e trace=openat,ioctl,mmap,mknodat,unlinkat -e signal=none ./drv_probe 2>&1 | grep -E "nvidia|null|ioctl\(|^cu|^lib|mknod|unlink" | grep -v "application-profile" | head -40
rm -f /dev/nvidia*
sec "case 5: CPU-only PyTorch: torch.cuda.is_available()"
python3 -c "import torch;print('torch',torch.__version__,'version.cuda',torch.version.cuda,'is_available',torch.cuda.is_available(),'device_count',torch.cuda.device_count())"
$ST python3 -c "import torch;torch.cuda.is_available()" 2>&1 | grep -i -E "libcuda|nvidia|/dev/nv" | head -5; echo "(lines above: PyTorch's attempts to find a driver; none for the CPU wheel)"
