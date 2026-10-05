# kb-os-virt:1 : the CUDA topic's kb-gpu-lab:1 (CUDA 13.4.2 toolkit, Ubuntu 24.04 arm64/sbsa, CPU PyTorch)
# plus strace and file, to watch the CUDA runtime and user-mode driver look for a GPU that is not there.
FROM kb-gpu-lab:1
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends strace file binutils && rm -rf /var/lib/apt/lists/*
