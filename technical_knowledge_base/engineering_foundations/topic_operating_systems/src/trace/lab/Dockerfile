# kb-os-lab:1, the shared Linux lab image for Topic: operating-systems.
# Built once by the Syscall tracer agent; other agents build FROM kb-os-lab:1.
# Base: Debian 12 (bookworm), arm64 here (Docker Desktop linuxkit VM, kernel 5.10).
FROM debian:bookworm

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv python3-dev python3-pip \
      gcc g++ make libc6-dev \
      strace gdb \
      procps sysstat util-linux iproute2 psmisc lsof file less \
      numactl fio time ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Optional tracing tools: install each separately so one failure does not stop the build;
# what actually installed is recorded in /lab/tools.txt.
RUN apt-get update; \
    for p in ltrace linux-perf bpftrace bpfcc-tools; do \
      if apt-get install -y --no-install-recommends $p; then echo "$p installed" >> /lab-tools.txt; \
      else echo "$p FAILED to install" >> /lab-tools.txt; fi; \
    done; rm -rf /var/lib/apt/lists/*; mkdir -p /lab; mv /lab-tools.txt /lab/tools.txt

# CPU-only PyTorch in a venv (no GPU in this VM).
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && /opt/venv/bin/pip install --no-cache-dir numpy py-spy psutil \
    && /opt/venv/bin/python -c "import torch, numpy, sys; open('/lab/versions.txt','w').write(f'python {sys.version.split()[0]}\ntorch {torch.__version__}\nnumpy {numpy.__version__}\n')"
ENV PATH=/opt/venv/bin:$PATH
WORKDIR /work
